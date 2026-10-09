import { expect, it } from 'vitest'
import { patchSource } from '../src/preserve'
import { parseFile } from '../src/files'
import type { JsonValue } from '@frade/repository-domain'

const edit = (text: string, after: Record<string, JsonValue>) =>
  patchSource(parseFile('source.yaml', text), after)

it('keeps every unchanged byte, BOM, CRLF, quoting, flow spacing, comments and neighbour records', () => {
  const source =
    "\uFEFF# heading\r\nrecords:\r\n  a:\r\n    title:   'old' # title\r\n    nested: {x: 0,  y: 'keep'} # nested\r\n    mystery: [ a,  b ] # extras\r\n  b: {title: \"neighbour\"}\r\n"
  const before = parseFile('source.yaml', source).value
  const after = structuredClone(before)
  const a = (after.records as Record<string, Record<string, JsonValue>>).a
  a.title = 'new'
  ;(a.nested as Record<string, JsonValue>).x = 5
  const changed = edit(source, after)
  expect(changed).toBe(source.replace("'old'", '"new"').replace('x: 0', 'x: 5'))
  expect(edit(source, before)).toBe(source)
})

it.each([
  ['block', 'a:\n  x: 1 # x\n  y: 2 # y\n', { a: { y: 2, z: false } }],
  ['flow', 'a: {x: 1, y: 2} # tail\n', { a: { y: 2, z: null } }],
  ['empty', 'a: {} # tail\n', { a: { x: '' } }],
  ['remove all', 'a:\n  x: 1 # note\n', { a: {} }],
  ['block list', 'a:\n  - 1 # one\n  - 2 # two\n', { a: [5, 2, false] }],
  ['flow list', 'a: [ 1,  2, 3 ] # tail\n', { a: [1, null] }],
  ['empty list', 'a: [] # tail\n', { a: [false, 0, '', null] }],
  ['delete list', 'a: [1, 2] # tail\n', { a: [] }],
  ['nested list', 'a:\n  - x: 1\n    y: 2\n', { a: [{ x: 4, y: 2 }, { x: 5 }] }],
  ['type change', 'a:\n  x: 1 # inside\n', { a: false }],
  ['multiline', 'a: | # text\n  line one\n  line two\nb: ok\n', { a: 'new\nvalue\n', b: 'ok' }],
  ['absent value', 'a: # empty\nb: keep\n', { a: 0, b: 'keep' }],
  ['absent without space', 'a:\nb: keep\n', { a: false, b: 'keep' }],
  ['absent at end', 'a:', { a: '' }],
  ['absent list item', 'a:\n  - # empty\n  - keep\n', { a: [0, 'keep'] }],
  ['absent flow value', 'a: { x: , y: keep }\n', { a: { x: 0, y: 'keep' } }],
  ['no final newline', 'a: 1', { a: 1, b: 2 }],
] as const)('%s supports typed additions, removals and list changes', (_name, source, value) => {
  const after = JSON.parse(JSON.stringify(value))
  const result = edit(source, after)
  expect(parseFile('result.yaml', result).value).toEqual(after)
  for (const comment of source.match(/#[^\r\n]*/g) ?? []) expect(result).toContain(comment)
})

it('does not materialize untouched implicit null values or move their comments', () => {
  const source = 'a: # absent\nb: old\nlist:\n  - # absent item\n  - keep\n'
  expect(edit(source, { a: null, b: 'new', list: [null, 'keep'] })).toBe(
    source.replace('b: old', 'b: "new"'),
  )
  expect(edit(source, parseFile('source.yaml', source).value)).toBe(source)
})
