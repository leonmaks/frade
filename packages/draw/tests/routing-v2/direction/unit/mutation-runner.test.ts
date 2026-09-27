import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'

describe('isolated DirectionResolver mutation harness', () => {
  it('checks its operator inventory, source redirection, score, survival, timeout and failure controls', () => {
    const output = execFileSync(
      process.execPath,
      [resolve('tests/routing-v2/direction/mutation/run.mjs'), '--self-test'],
      { cwd: process.cwd(), encoding: 'utf8' },
    )
    expect(output).toContain('R03_MUTATION_HARNESS_SELF_TEST: PASS')
  }, 30_000)
})
