import { expect } from 'vitest'
import { resolve } from 'node:path'
import { inspectRepositorySource } from '../../../../scripts/check-repository-boundaries.mjs'
import { cases, runSteps, type Step } from './runner'
export const infrastructure: Step[] = [
  {
    pattern: /^the acceptance infrastructure fault "([^"]+)"$/,
    run: (w, fault) => {
      w.fault = fault
    },
  },
  {
    pattern: /^the relevant verification gate runs$/,
    run: async (w) => {
      if (w.fault.includes('import')) {
        const scope = resolve('src')
        w.failures = inspectRepositorySource(
          resolve(scope, 'bad.ts'),
          w.fault.startsWith('private')
            ? "import '@frade/repository-domain/src/types'"
            : "import 'node:fs'",
          scope,
          ['@frade/repository-domain'],
        )
        return
      }
      if (w.fault === 'unexpanded outline parameter') {
        try {
          cases('Feature: F\n @RC-5\n Scenario: S\n Given <unexpanded>')
        } catch (error) {
          w.failed = error
        }
        return
      }
      const c = { name: 'fault', tags: ['@RC-5'], steps: ['run'] },
        step = {
          pattern: /^run$/,
          run: async () => {
            if (w.fault === 'rejected asynchronous step') {
              await Promise.resolve()
              throw Error('rejected assertion')
            }
          },
        }
      try {
        await runSteps(
          c,
          w.fault === 'unmapped Gherkin step'
            ? []
            : w.fault === 'ambiguous Gherkin step'
              ? [step, step]
              : [step],
        )
      } catch (error) {
        w.failed = error
      }
    },
  },
  {
    pattern: /^the gate fails instead of reporting successful acceptance$/,
    run: (w) => {
      if (w.failures) expect(w.failures.length).toBeGreaterThan(0)
      else expect(w.failed).toBeInstanceOf(Error)
    },
  },
]
