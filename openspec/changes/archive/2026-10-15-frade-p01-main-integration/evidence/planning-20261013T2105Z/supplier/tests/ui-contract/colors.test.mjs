import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectColors, applyExceptions, classifyColorData } from '../../scripts/ui/colors.mjs'

test('UI-LITERAL-SYNTAX: HEX rgb hsl named and inline values fail; comments and identifiers do not', () => {
  const css =
    '/* color: red */ .x { background: #123456; border: 1px solid rgb(1,2,3); color: hsl(0 0% 0%); box-shadow: 0 0 white; white-space: nowrap }'
  const hits = inspectColors('feature.css', css)
  assert.deepEqual(
    hits.map((h) => h.value),
    ['#123456', 'rgb(1,2,3)', 'hsl(0 0% 0%)', 'white'],
  )
  assert.equal(
    inspectColors('feature.tsx', 'const el=<div style={{color: "red", background:"#abcdef"}} />')
      .length,
    2,
  )
  assert.equal(
    inspectColors('feature.css', '.x {color: var(--frade-text-primary); background: Canvas}')
      .length,
    0,
  )
  assert.equal(
    inspectColors('feature.ts', '// "#abcdef"\nconst red = "redemption"; const x = /#[a-f]{6}/')
      .length,
    0,
  )
})
test('UI-LITERAL-LEGACY: adding new color beside an exact legacy occurrence fails', () => {
  const file = 'feature.css',
    old = '.x { color: #123456; }'
  const legacy = inspectColors(file, old).map((h) => ({
    ...h,
    reason: 'preexisting baseline',
    stage: 'shell',
    classification: 'LEGACY',
  }))
  assert.deepEqual(applyExceptions(inspectColors(file, old), legacy), [])
  const added = old + '\n.y { color: #abcdef }'
  const errors = applyExceptions(inspectColors(file, added), legacy)
  assert.equal(errors.length, 1)
  assert.match(errors[0], /abcdef/)
  assert.notEqual(
    applyExceptions(inspectColors(file, old.replace('123456', '654321')), legacy).length,
    0,
  )
})
test('UI-LITERAL-EXCEPTIONS: moved/context-changed/duplicate or blanket exceptions fail', () => {
  const hits = inspectColors('feature.css', '.x { color:#123456 }')
  assert.notEqual(applyExceptions(hits, [{ file: 'feature.css', reason: 'entire file' }]).length, 0)
  const entry = { ...hits[0], reason: 'baseline', stage: 'shell', classification: 'LEGACY' }
  assert.notEqual(applyExceptions(hits, [entry, entry]).length, 0)
  assert.notEqual(
    applyExceptions(inspectColors('feature.css', '\n.x { color:#123456 }'), [entry]).length,
    0,
  )
})
test('UI-LITERAL-DATA: validated theme/domain/generated boundaries are distinct', () => {
  assert.equal(
    classifyColorData('theme', { kind: 'dark', colors: { 'focus.ring': '#123456' } }).length,
    0,
  )
  assert.notEqual(
    classifyColorData('theme', { kind: 'dark', colors: { invented: '#123456' } }).length,
    0,
  )
  assert.equal(
    classifyColorData('domain-paint', { fill: '#abcdef', stroke: '#123456', width: 1 }).length,
    0,
  )
  assert.notEqual(
    classifyColorData('domain-paint', { fill: 'url(javascript:evil)', width: 1 }).length,
    0,
  )
  assert.notEqual(classifyColorData('unknown', {}).length, 0)
})
