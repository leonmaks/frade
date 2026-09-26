import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import { cases, runSteps } from './runner'
import { steps, disposeWorld } from './steps'
const dir = resolve('tests/bdd/features')
for (const file of readdirSync(dir).filter((f) => f.endsWith('.feature'))) {
  expect(readFileSync(resolve(dir, file), 'utf8').replace(/\r/g, '')).toBe(
    readFileSync(resolve('../../openspec/changes/frade-repo-core/features', file), 'utf8').replace(
      /\r/g,
      '',
    ),
  )
  for (const scenario of cases(readFileSync(resolve(dir, file), 'utf8')))
    it(
      scenario.name,
      async () => {
        const world = {}
        try {
          await runSteps(scenario, steps, world)
        } finally {
          await disposeWorld(world)
        }
      },
      30000,
    )
}
it('runner fails on unknown/ambiguous/async/unexpanded/unsupported inputs', async () => {
  const c = { name: 'negative', tags: ['@RC-5'], steps: ['execute'] },
    step = { pattern: /^execute$/, run: () => {} }
  await expect(runSteps(c, [])).rejects.toThrow('exactly one')
  await expect(runSteps(c, [step, step])).rejects.toThrow('exactly one')
  await expect(
    runSteps(c, [
      {
        ...step,
        run: async () => {
          await Promise.resolve()
          throw Error('async failure')
        },
      },
    ]),
  ).rejects.toThrow('async failure')
  expect(() => cases('Feature: F\n @RC-5\n Scenario: S\n  Given <missing>')).toThrow('Unexpanded')
  expect(() => cases('Feature: F\n @RC-5\n Scenario Outline: S\n  Given something')).toThrow(
    'Empty outline',
  )
  expect(() => cases('Feature: F\n @RC-5\n Scenario: S\n  Given input\n   | a |')).toThrow(
    'Unsupported',
  )
})
