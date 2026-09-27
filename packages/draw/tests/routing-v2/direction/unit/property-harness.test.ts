import { describe, expect, it } from 'vitest'
import { integer, runConditionedProperty, seededRandom } from '../../perimeter/support/generated'

const SEED = 0xfad003

describe('R03 conditioned property evidence controls', () => {
  it('counts accepted and rejected candidates independently', () => {
    const visited: number[] = []
    const report = runConditionedProperty({
      name: 'R03/harness-accounting-control',
      seed: SEED,
      requiredAccepted: 3,
      maxRaw: 6,
      sample: (_random, index) => index,
      accept: (value) => value % 2 === 1,
      property: (value, context) => {
        visited.push(value)
        expect(context.path).toBe(String(value))
        expect(context.raw).toBe(value + 1)
        expect(context.accepted + context.rejected).toBe(context.raw)
      },
    })
    expect(visited).toEqual([1, 3, 5])
    expect(report).toEqual({
      name: 'R03/harness-accounting-control',
      seed: SEED,
      raw: 6,
      accepted: 3,
      rejected: 3,
    })
  })

  it('reports and exactly replays a seeded concrete failure', () => {
    const sample = (random: () => number, index: number) => ({
      index,
      coordinate: integer(random, -100_000, 100_000),
    })
    const failure = new Error('deliberate property control failure')
    let caught: unknown
    try {
      runConditionedProperty({
        name: 'R03/harness-replay-control',
        seed: SEED,
        requiredAccepted: 3,
        maxRaw: 6,
        sample,
        accept: (value) => value.index % 2 === 1,
        property: () => {
          throw failure
        },
      })
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(Error)
    const error = caught as Error
    expect(error.cause).toBe(failure)
    const random = seededRandom(SEED)
    sample(random, 0)
    const replayed = sample(random, 1)
    expect(error.message).toBe(
      'R03/harness-replay-control failed; seed=0xFAD003; path=1; ' +
        'raw=2; accepted=1; rejected=1; counterexample=' +
        JSON.stringify(replayed),
    )
  })

  it('fails rather than accepting insufficient generated cases', () => {
    expect(() =>
      runConditionedProperty({
        name: 'R03/harness-exhaustion-control',
        seed: SEED,
        requiredAccepted: 3,
        maxRaw: 2,
        sample: (_random, index) => index,
        accept: () => false,
        property: () => {
          throw new Error('rejected candidates must never execute')
        },
      }),
    ).toThrow(
      'R03/harness-exhaustion-control exhausted; seed=0xFAD003; raw=2; accepted=0; rejected=2',
    )
  })
})
