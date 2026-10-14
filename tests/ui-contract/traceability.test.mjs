import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { validateTraceability } from '../../scripts/ui/traceability.mjs'
const feature =
  'Feature: Test\n  @foundation @FUI-001\n  Scenario: One\n    Given a contract\n    Then the result is checked\n'
const source =
  'import test from "node:test"; import assert from "node:assert/strict"; test("T: assertion",()=>{assert.equal(1,1)})'
const entry = {
  id: 'FUI-001',
  phase: 'foundation',
  file: 'test.mjs',
  testName: 'T',
  sourceSha256: createHash('sha256').update(source).digest('hex'),
}
test('UI-TRACE-CLOSURE: valid foundation binding; missing/unknown/duplicate fail', () => {
  assert.deepEqual(validateTraceability(feature, [entry], { 'test.mjs': source }), [])
  for (const rows of [[], [entry, entry], [{ ...entry, id: 'FUI-999' }]])
    assert.notEqual(validateTraceability(feature, rows, { 'test.mjs': source }).length, 0)
})
test('UI-TRACE-ASSERTIONS: removed/mutated assertions and skipped tests cannot count', () => {
  for (const altered of [
    source.replace('assert.equal(1,1)', ''),
    source.replace('1,1', '1,2'),
    source.replace('test("', 'test.skip("'),
  ])
    assert.notEqual(validateTraceability(feature, [entry], { 'test.mjs': altered }).length, 0)
  const empty = source.replace('assert.equal(1,1)', '')
  const rebased = { ...entry, sourceSha256: createHash('sha256').update(empty).digest('hex') }
  assert.notEqual(validateTraceability(feature, [rebased], { 'test.mjs': empty }).length, 0)
})
test('UI-TRACE-EXAMPLES: every outline row maps; repeated example is invalid', () => {
  const outline =
    feature
      .replace('Scenario: One', 'Scenario Outline: One')
      .replace('Given a contract', 'Given "<x>"') +
    '    Examples:\n      | x |\n      | a |\n      | b |\n'
  const rows = ['a', 'b'].map((x) => ({ ...entry, id: 'FUI-001/' + x }))
  assert.deepEqual(validateTraceability(outline, rows, { 'test.mjs': source }), [])
  assert.notEqual(validateTraceability(outline, [rows[0]], { 'test.mjs': source }).length, 0)
  assert.notEqual(
    validateTraceability(outline.replace('| b |', '| a |'), rows, { 'test.mjs': source }).length,
    0,
  )
})
test('UI-TRACE-FUTURE: future phase is explicit and cannot disguise foundation', () => {
  assert.notEqual(
    validateTraceability(feature, [{ id: 'FUI-001', phase: 'future', owner: 'P01' }], {}).length,
    0,
  )
  const future = feature.replace('@foundation', '@p01')
  assert.deepEqual(
    validateTraceability(
      future,
      [
        {
          id: 'FUI-001',
          phase: 'future',
          owner: 'P01',
          reason: 'Approved roadmap; no coverage claimed',
        },
      ],
      {},
    ),
    [],
  )
})
