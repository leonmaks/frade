import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  validateBuiltin,
  contrastRatio,
  generateCss,
  generateTs,
  checkGenerated,
  exactSourceOracle,
} from '../../scripts/ui/tokens.mjs'
const input = JSON.parse(
  readFileSync(new URL('../../packages/ui-workspace/tokens/tokens.json', import.meta.url), 'utf8'),
)
const upstream = readFileSync(new URL('./fixtures/upstream.tokens.css', import.meta.url), 'utf8')

test('UI-TOKEN-CLOSURE: complete palettes validate without mutation', () => {
  const before = JSON.stringify(input)
  assert.deepEqual(validateBuiltin(input), [])
  assert.equal(JSON.stringify(input), before)
})
test('UI-TOKEN-CLOSURE: missing and extra roles cannot be hidden by equal sets', () => {
  for (const theme of Object.keys(input.themes)) {
    const missing = structuredClone(input)
    delete missing.themes[theme]['focus.ring']
    assert.match(validateBuiltin(missing).join('\n'), /focus.ring/)
    const extra = structuredClone(input)
    extra.themes[theme]['invented.role'] = '#123456'
    assert.match(validateBuiltin(extra).join('\n'), /invented.role/)
  }
})
test('UI-TOKEN-MALFORMED: invalid HEX/nonfinite/shape/version are rejected', () => {
  for (const value of ['red', '#abc', '#FFFFFF;', NaN, Infinity, null]) {
    const data = structuredClone(input)
    data.themes.light['focus.ring'] = value
    assert.notEqual(validateBuiltin(data).length, 0)
  }
  for (const value of [null, [], {}, { ...input, version: '2.0.0' }])
    assert.notEqual(validateBuiltin(value).length, 0)
})
test('UI-CONTRAST: independent luminance boundaries and 102 named pairs', () => {
  assert.equal(contrastRatio('#000000', '#FFFFFF'), 21)
  assert.equal(contrastRatio('#FFFFFF', '#FFFFFF'), 1)
  assert(contrastRatio('#767676', '#FFFFFF') >= 4.5)
  assert(contrastRatio('#777777', '#FFFFFF') < 4.5)
  const low = structuredClone(input)
  low.themes.light['text.primary'] = '#FFFFFF'
  assert.match(validateBuiltin(low).join('\n'), /contrast/)
})
test('UI-TOKEN-EQUIVALENCE: only accepted selector changes; values/order stable', () => {
  const expected = upstream.replace(
    ':root:not([data-frade-theme])',
    ':root:where(:not([data-frade-theme]))',
  )
  assert.equal(exactSourceOracle(upstream), expected)
  assert.equal(generateCss(input), expected)
  assert.equal(generateCss(input), generateCss(structuredClone(input)))
  assert.throws(
    () => exactSourceOracle(upstream + '\n:root:not([data-frade-theme]) {}'),
    /occurrence|count/,
  )
})
test('UI-TOKEN-DRIFT: CSS and typed registry mutation both fail without rewriting', () => {
  const css = generateCss(input),
    ts = generateTs(input)
  assert.deepEqual(checkGenerated(input, css, ts), [])
  assert.match(checkGenerated(input, css + '\n/* drift */', ts).join('\n'), /CSS drift/)
  assert.match(checkGenerated(input, css, ts + '\n/* drift */').join('\n'), /TS drift/)
  assert.match(
    checkGenerated(input, css.replace('CanvasText', '#112233'), ts).join('\n'),
    /CSS drift/,
  )
  assert.equal(css, generateCss(input))
})
