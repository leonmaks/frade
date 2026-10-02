import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { cases, runSteps } from './runner'
import { steps } from './steps'
const root = resolve('tests/features/metamodel')
const all = readdirSync(root)
  .filter((n) => n.endsWith('.feature'))
  .sort()
  .flatMap((n) => cases(readFileSync(resolve(root, n), 'utf8')))
describe('executable metamodel Gherkin', () => {
  for (const testCase of all) it(testCase.name, () => runSteps(testCase, steps))
  it('executes every concrete scenario and fails closed on missing/ambiguous bindings', () => {
    expect(all).toHaveLength(54)
    const probe = { name: 'probe', tags: [], steps: ['probe'] }
    expect(() => runSteps(probe, [])).toThrow('found 0')
    expect(() =>
      runSteps(probe, [
        { pattern: /^probe$/, run() {} },
        { pattern: /^probe$/, run() {} },
      ]),
    ).toThrow('found 2')
    expect(() =>
      cases(
        'Feature: Test\n @MD-001\n Scenario Outline: Missing\n  Given <missing>\n  Examples:\n   | other |\n   | value |',
      ),
    ).toThrow('Unexpanded outline')
  })
})
