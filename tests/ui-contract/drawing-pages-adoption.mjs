import { inspectColors } from '../../scripts/ui/colors.mjs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
const root = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(resolve(root, 'apps/desktop/package.json'))
const ts = require('typescript')
const postcss = require(
  require.resolve('postcss', { paths: [dirname(require.resolve('vite/package.json'))] }),
)
const demand = (value, error) => {
  if (!value) throw Error(error)
}
const stable = (value) =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item,
  )
export function canonicalPublicationBytes(bytes) {
  const canonical = Buffer.from(bytes.toString('latin1').replaceAll('\r\n', '\n'), 'latin1')
  demand(!canonical.includes(13), 'UNSUPPORTED_LINE_ENDINGS')
  return canonical
}
export function publicationByteForms(bytes) {
  const canonical = canonicalPublicationBytes(bytes),
    checkout = Buffer.from(canonical.toString('latin1').replaceAll('\n', '\r\n'), 'latin1'),
    sha = (value) => createHash('sha256').update(value).digest('hex')
  return { sha256: sha(bytes), canonicalSha256: sha(canonical), checkoutSha256: sha(checkout) }
}
function annotated(file, raw) {
  const source = raw.replaceAll('\r\n', '\n'),
    hits = inspectColors(file, source)
  if (file.endsWith('.css')) {
    const declarations = []
    postcss.parse(source).walkDecls((decl) => declarations.push(decl))
    return hits.map((hit) => {
      const decl = declarations.find(
        (d) => d.source.start.offset <= hit.start && d.source.end.offset >= hit.end - 1,
      )
      demand(decl, 'CSS_COLOR_OWNER')
      const owners = []
      for (let node = decl.parent; node; node = node.parent)
        if (node.type === 'rule') owners.unshift(node.selector)
        else if (node.type === 'atrule') owners.unshift('@' + node.name + ' ' + node.params)
      return { ...hit, owner: owners.join(' / ') + ' :: ' + decl.prop }
    })
  }
  const ast = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
    literals = []
  const visit = (node) => {
    if (
      ts.isStringLiteralLike(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    )
      literals.push(node)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return hits.map((hit) => {
    const literal = literals.find(
      (node) => node.getStart(ast) <= hit.start && node.getEnd() >= hit.end,
    )
    demand(literal, 'TS_COLOR_OWNER')
    const owners = []
    for (let node = literal.parent; node; node = node.parent) {
      if (ts.isPropertyAssignment(node)) owners.unshift(node.name.getText(ast))
      if (ts.isFunctionDeclaration(node) && node.name) owners.unshift(node.name.text)
    }
    return { ...hit, owner: owners.join(' / ') }
  })
}
/** No new exceptions: preserve exact declaration/selector ownership and all metadata. */
export function rebaseLegacyColors(original, sources) {
  demand(
    original.version === 1 &&
      original.normalization === 'LF UTF16 logical spans' &&
      Array.isArray(original.occurrences),
    'LEGACY_SCHEMA',
  )
  const inventory = structuredClone(original),
    mappings = []
  for (const [file, source] of Object.entries(sources)) {
    const before = annotated(file, source.before),
      after = annotated(file, source.after)
    demand(before.length === after.length, 'COLOR_SEQUENCE_CHANGED')
    const positions = original.occurrences.flatMap((entry, index) =>
      entry.file === file ? [index] : [],
    )
    demand(positions.length === before.length, 'ORIGINAL_LEGACY_INVENTORY')
    for (let i = 0; i < before.length; i++) {
      const old = before[i],
        next = after[i],
        index = positions[i],
        entry = original.occurrences[index]
      for (const key of ['start', 'end', 'line', 'value', 'context', 'occurrenceHash'])
        demand(entry[key] === old[key], 'ORIGINAL_LEGACY_INVENTORY')
      for (const key of ['value', 'context', 'occurrenceHash'])
        demand(old[key] === next[key], 'COLOR_SEQUENCE_CHANGED')
      demand(old.owner === next.owner, 'COLOR_OWNER_CHANGED')
      inventory.occurrences[index] = { ...entry, start: next.start, end: next.end, line: next.line }
      if (old.start !== next.start || old.end !== next.end || old.line !== next.line)
        mappings.push({
          file,
          owner: old.owner,
          original: entry,
          adopted: inventory.occurrences[index],
        })
    }
  }
  return {
    inventory,
    proof: {
      normalization: original.normalization,
      count: original.occurrences.length,
      changed: mappings.length,
      mappings,
    },
  }
}
export function verifyLegacyColorRebase(original, adopted, sources) {
  const expected = rebaseLegacyColors(original, sources)
  demand(stable(adopted) === stable(expected.inventory), 'LEGACY_REBASE_MISMATCH')
  return expected.proof
}
