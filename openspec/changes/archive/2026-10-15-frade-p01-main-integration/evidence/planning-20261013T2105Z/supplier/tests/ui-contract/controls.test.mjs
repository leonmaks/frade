import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { runControls } from '../../scripts/ui/controls.mjs'
test('UI-CONTROLS: real CLI positives pass, negatives fail, and isolated root is removed', async () => {
  const result = await runControls()
  assert.equal(result.status, 'PASS')
  assert.equal(result.controls.length, 7)
  for (const control of result.controls)
    assert.equal(control.actualExit, control.expectedExit, control.name)
  assert.equal(result.removed, true)
  assert.equal(existsSync(result.temporaryRoot), false)
  assert(result.controls.every((c) => /^[a-f0-9]{64}$/.test(c.fixtureHash)))
})
