import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import { cases, runSteps } from './runner'
import { steps } from './steps'
const dir = resolve('tests/features')
for (const file of readdirSync(dir).filter((f) => f.endsWith('.feature')))
  for (const c of cases(readFileSync(resolve(dir, file), 'utf8')))
    it(c.name, () => runSteps(c, steps), 30000)
it('runner rejects missing ambiguous async and malformed bindings', async () => {
  const c = { name: 'negative', tags: ['@MC-1'], steps: ['execute'] }
  await expect(runSteps(c, [])).rejects.toThrow('exactly one')
  const step = { pattern: /^execute$/, run: () => {} }
  await expect(runSteps(c, [step, step])).rejects.toThrow('exactly one')
  await expect(
    runSteps(c, [
      {
        ...step,
        run: async () => {
          throw Error('async failure')
        },
      },
    ]),
  ).rejects.toThrow('async failure')
  expect(() => cases('Feature: F\n @MC-1\n Scenario: S\n  Given <missing>')).toThrow('Unexpanded')
  expect(() => cases('Feature: F\n @MC-1\n Scenario: S\n  Given input\n   | a |')).toThrow(
    'Unsupported',
  )
})
