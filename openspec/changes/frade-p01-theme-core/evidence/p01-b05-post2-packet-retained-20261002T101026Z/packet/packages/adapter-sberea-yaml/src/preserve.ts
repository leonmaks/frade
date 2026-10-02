import { CST, Parser } from 'yaml'
import { canonicalJson, record, type JsonValue } from '@frade/repository-domain'
import { fail, parseFile, type SourceFile } from './files'

type Token = CST.Token
type Item = CST.CollectionItem

const trivia = (type: CST.SourceToken['type'], source: string): CST.SourceToken => ({
  type,
  source,
  offset: 0,
  indent: 0,
})
function jsonToken(value: JsonValue): Token {
  const doc = [...new Parser().parse(JSON.stringify(value))].find((t) => t.type === 'document')
  if (!doc || doc.type !== 'document' || !doc.value) fail('WRITE_FAILED', 'Cannot encode value')
  const token = doc.value
  if ('end' in token) token.end = token.end?.filter((t) => t.type !== 'newline')
  return token
}
function comments(token: Token | undefined): CST.SourceToken[] {
  if (!token) return []
  const out: CST.SourceToken[] = []
  const walk = (value: unknown): void => {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    const object = value as Record<string, unknown>
    if (object.type === 'comment') {
      out.push(object as unknown as CST.SourceToken)
      return
    }
    Object.values(object).forEach(walk)
  }
  walk(token)
  return out
}
function suffix(old: Token, newline: string): CST.SourceToken[] {
  if (old.type === 'flow-collection')
    return old.end.filter((t) => t.type !== 'flow-map-end' && t.type !== 'flow-seq-end')
  if ('end' in old && Array.isArray(old.end)) return old.end
  const notes = comments(old)
  return [
    ...notes.flatMap((note) => [trivia('space', ' '), note, trivia('newline', newline)]),
    ...(CST.stringify(old).endsWith('\n') && !notes.length ? [trivia('newline', newline)] : []),
  ]
}
function replace(old: Token | undefined, value: JsonValue, newline: string): Token {
  const next = jsonToken(value)
  if (old)
    Object.assign(next, {
      end: [...('end' in next ? (next.end ?? []) : []), ...suffix(old, newline)],
    })
  return next
}
function keyOf(item: Item): string | undefined {
  return item.key ? CST.resolveAsScalar(item.key)?.value : undefined
}
function patch(
  old: Token | undefined,
  before: JsonValue | undefined,
  after: JsonValue,
  newline: string,
): Token {
  if (old && before !== undefined && canonicalJson(before) === canonicalJson(after)) return old
  const map =
    old &&
    (old.type === 'block-map' ||
      (old.type === 'flow-collection' && old.start.type === 'flow-map-start'))
  const seq =
    old &&
    (old.type === 'block-seq' ||
      (old.type === 'flow-collection' && old.start.type === 'flow-seq-start'))
  if (
    (map && record(before) && record(after)) ||
    (seq && Array.isArray(before) && Array.isArray(after))
  ) {
    const collection = old as CST.BlockMap | CST.BlockSequence | CST.FlowCollection
    const flow = collection.type === 'flow-collection'
    const original = collection.items as Item[]
    const retained: Item[] = []
    const removedComments: CST.SourceToken[] = []
    const keys = new Set<string>()
    let index = 0
    for (const item of original) {
      const key = map ? keyOf(item) : String(index++)
      if (key === undefined) {
        // Empty flow entries carry a trailing comma; the closing delimiter is retained separately.
        removedComments.push(...item.start.filter((t) => t.type === 'comment'))
        continue
      }
      const present = map ? Object.hasOwn(after, key) : Number(key) < (after as JsonValue[]).length
      if (!present) {
        removedComments.push(
          ...item.start.filter((t) => t.type === 'comment'),
          ...comments(item.key ?? undefined),
          ...(item.sep ?? []).filter((t) => t.type === 'comment'),
          ...comments(item.value),
        )
        continue
      }
      const previous = map
        ? (before as Record<string, JsonValue>)[key]
        : (before as JsonValue[])[Number(key)]
      const value = map
        ? (after as Record<string, JsonValue>)[key]
        : (after as JsonValue[])[Number(key)]
      if (canonicalJson(previous) === canonicalJson(value)) {
        retained.push(item)
        keys.add(key)
        continue
      }
      const missingValue = !item.value
      item.value = patch(item.value, previous, value, newline)
      if (missingValue) {
        // Implicit null puts its comment/newline in the separator. Move that
        // suffix after the new value while retaining the original trivia.
        const separator = map ? (item.sep ?? []) : item.start
        const indicator = separator.findIndex(
          (t) => t.type === (map ? 'map-value-ind' : 'seq-item-ind'),
        )
        const suffixAt = separator.findIndex(
          (t, i) => i > indicator && (t.type === 'comment' || t.type === 'newline'),
        )
        if (suffixAt >= 0) {
          const tail = separator.splice(suffixAt)
          if (tail[0]?.type === 'comment') tail.unshift(trivia('space', ' '))
          Object.assign(item.value, {
            end: [...('end' in item.value ? (item.value.end ?? []) : []), ...tail],
          })
        }
        if (indicator >= 0 && separator[indicator + 1]?.type !== 'space')
          separator.splice(indicator + 1, 0, trivia('space', ' '))
      }
      retained.push(item)
      keys.add(key)
    }
    const additions = map
      ? Object.entries(after as Record<string, JsonValue>).filter(([key]) => !keys.has(key))
      : (after as JsonValue[])
          .map((value, i) => [String(i), value] as const)
          .filter(([key]) => !keys.has(key))
    for (const [key, value] of additions) {
      const start: CST.SourceToken[] = flow
        ? retained.length
          ? [trivia('comma', ','), trivia('space', ' ')]
          : []
        : retained.length
          ? [
              ...(CST.stringify(retained.at(-1)!).endsWith('\n')
                ? []
                : [trivia('newline', newline)]),
              trivia('space', ' '.repeat(collection.indent)),
            ]
          : []
      const item: Item = { start, value: jsonToken(value) }
      if (map) {
        item.key = jsonToken(key)
        item.sep = [trivia('map-value-ind', ':'), trivia('space', ' ')]
      } else if (!flow) item.start.push(trivia('seq-item-ind', '-'), trivia('space', ' '))
      if (!flow && item.value)
        Object.assign(item.value, {
          end: [...('end' in item.value ? (item.value.end ?? []) : []), trivia('newline', newline)],
        })
      retained.push(item)
    }
    if (!retained.length) {
      const next = replace(old, after, newline)
      return next
    }
    if (flow) {
      // Every remaining item except the first owns its preceding comma.
      retained.forEach((item, i) => {
        if (!i) item.start = item.start.filter((t) => t.type !== 'comma')
        else if (!item.start.some((t) => t.type === 'comma'))
          item.start.unshift(trivia('comma', ','))
      })
    } else if (retained[0] !== original[0]) {
      // The parent already owns indentation before the first block item.
      if (retained[0].start[0]?.type === 'space') retained[0].start.shift()
    }
    if (removedComments.length) {
      const tail = retained.at(-1)!
      const notes = removedComments.flatMap((note) => [
        trivia('newline', newline),
        trivia('space', ' '.repeat(collection.indent)),
        note,
      ])
      notes.push(trivia('newline', newline), trivia('space', ' '.repeat(collection.indent)))
      if (flow) collection.end.unshift(...notes)
      else if (tail.value && 'end' in tail.value)
        tail.value.end = [...(tail.value.end ?? []), ...notes]
      else retained.push({ start: notes })
    }
    // CST's block-map type has a stricter item union; mutations preserve the parser's shape.
    Object.assign(collection, { items: retained })
    return collection
  }
  return replace(old, after, newline)
}

/** Mutate concrete tokens, retaining bytes belonging to every unchanged node. */
export function patchSource(file: SourceFile, after: Record<string, JsonValue>): string {
  const tokens = [...new Parser().parse(file.text)]
  const doc = tokens.find((t) => t.type === 'document')
  if (!doc || doc.type !== 'document') fail('WRITE_FAILED', 'Missing source document')
  doc.value = patch(doc.value, file.value, after, file.text.includes('\r\n') ? '\r\n' : '\n')
  const text = tokens.map((token) => CST.stringify(token)).join('')
  if (canonicalJson(parseFile(file.entry, text).value) !== canonicalJson(after))
    fail('WRITE_FAILED', 'Concrete YAML round-trip mismatch')
  return text
}
