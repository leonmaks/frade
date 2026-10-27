import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inspectColors } from '../../scripts/ui/colors.mjs'
import { rebaseLegacyColors, verifyLegacyColorRebase } from './drawing-pages-adoption.mjs'
const file = 'packages/draw/src/style.css'
const before = '.one {\n  color: #123456;\n}\n.two {\n  border: 1px solid #abcdef;\n}\n'
function inventory(source = before) {
  return {
    version: 1,
    guideVersion: '1.0',
    baseline: 'accepted-original',
    normalization: 'LF UTF16 logical spans',
    occurrences: inspectColors(file, source).map((hit) => ({
      ...hit,
      classification: 'LEGACY',
      reason: 'Unchanged accepted occurrence',
      stage: 'fixture',
    })),
  }
}
test('drawing pages coordinate adoption moves only exact UTF16 spans, retaining metadata and contexts', () => {
  const original = inventory(),
    prefix = '/* 🧭 */\r\n',
    sources = { [file]: { before, after: prefix + before } },
    result = rebaseLegacyColors(original, sources)
  assert.equal(result.inventory.baseline, original.baseline)
  assert.equal(result.inventory.occurrences.length, 2)
  for (let i = 0; i < 2; i++) {
    const a = original.occurrences[i],
      b = result.inventory.occurrences[i]
    assert.equal(b.start, a.start + prefix.replaceAll('\r\n', '\n').length)
    assert.equal(b.end, a.end + prefix.replaceAll('\r\n', '\n').length)
    assert.equal(b.line, a.line + 1)
    for (const key of [
      'file',
      'value',
      'occurrenceHash',
      'context',
      'classification',
      'reason',
      'stage',
    ])
      assert.equal(b[key], a[key])
  }
  assert.equal(result.proof.changed, 2)
  assert.deepEqual(verifyLegacyColorRebase(original, result.inventory, sources), result.proof)
})
test('drawing pages rebase rejects added literals and changed literal/declaration context', () => {
  for (const after of [
    before + '.new { color: red; }\n',
    before.replace('#123456', '#654321'),
    before.replace('color: #123456', 'background: #123456'),
  ])
    assert.throws(() => rebaseLegacyColors(inventory(), { [file]: { before, after } }))
})
test('drawing pages rebase rejects moving an old color into a different selector owner', () => {
  assert.throws(
    () =>
      rebaseLegacyColors(inventory(), {
        [file]: { before, after: before.replace('.one', '.newOwner') },
      }),
    /COLOR_OWNER_CHANGED/,
  )
})
test('drawing pages rebase rejects classifying a new exception, deleting an entry or changing baseline', () => {
  const original = inventory(),
    sources = { [file]: { before, after: '\n' + before } },
    valid = rebaseLegacyColors(original, sources).inventory
  for (const mutate of [
    (d) => d.occurrences.push({ ...d.occurrences[0], start: 999 }),
    (d) => d.occurrences.pop(),
    (d) => {
      d.baseline = 'moved'
    },
    (d) => {
      d.occurrences[0].classification = 'GENERATED'
    },
    (d) => {
      d.occurrences[0].reason = 'allow new color'
    },
  ]) {
    const bad = structuredClone(valid)
    mutate(bad)
    assert.throws(() => verifyLegacyColorRebase(original, bad, sources), /LEGACY_REBASE_MISMATCH/)
  }
})
test('drawing pages rebase refuses an already stale original inventory', () => {
  const original = inventory()
  original.occurrences[0].start++
  assert.throws(
    () => rebaseLegacyColors(original, { [file]: { before, after: '\n' + before } }),
    /ORIGINAL_LEGACY_INVENTORY/,
  )
})
