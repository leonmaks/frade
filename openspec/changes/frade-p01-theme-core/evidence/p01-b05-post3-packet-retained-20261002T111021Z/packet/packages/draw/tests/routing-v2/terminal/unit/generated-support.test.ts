import { describe, expect, it, vi } from 'vitest'

import {
  R02_PROPERTY_SEED,
  isSafeTranslationCase,
  runConditionedProperty,
  seededRandom,
} from '../../perimeter/support/generated'

describe('R02 generated evidence support', () => {
  it('uses the fixed seed deterministically', () => {
    const first = seededRandom()
    const second = seededRandom(R02_PROPERTY_SEED)
    expect(Array.from({ length: 10 }, () => first())).toEqual(
      Array.from({ length: 10 }, () => second()),
    )
  })

  it('counts raw, accepted, and rejected cases separately', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const report = runConditionedProperty({
      name: 'accounting-smoke',
      requiredAccepted: 3,
      sample: (_random, raw) => raw,
      accept: (value) => value % 2 === 0,
      property: () => undefined,
    })
    expect(report).toEqual({
      name: 'accounting-smoke',
      seed: R02_PROPERTY_SEED,
      raw: 5,
      accepted: 3,
      rejected: 2,
    })
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"rejected":2'))
    log.mockRestore()
  })

  it('reports seed, replay path, counts, and a concrete counterexample', () => {
    expect(() =>
      runConditionedProperty({
        name: 'replay-smoke',
        requiredAccepted: 2,
        sample: (_random, raw) => ({ raw }),
        accept: () => true,
        property: ({ raw }) => expect(raw).toBeLessThan(1),
      }),
    ).toThrow(/seed=0xFAD002; path=1; raw=2; accepted=2; rejected=0; counterexample=\{"raw":1\}/)
  })

  it('enforces the declared safe integer translation domain', () => {
    const valid = {
      x: -100_000,
      y: 100_000,
      width: 2_000,
      height: 2,
      towardX: 100_000,
      towardY: -100_000,
      deltaX: 100_000,
      deltaY: -100_000,
    }
    expect(isSafeTranslationCase(valid)).toBe(true)
    expect(isSafeTranslationCase({ ...valid, width: 3 })).toBe(false)
    expect(isSafeTranslationCase({ ...valid, deltaX: 100_001 })).toBe(false)
    expect(
      isSafeTranslationCase({
        ...valid,
        x: 0,
        y: 0,
        width: 10,
        height: 20,
        towardX: 5,
        towardY: 10,
      }),
    ).toBe(false)
  })

  it('records the unsafe large-translation cancellation limitation without claiming invariance', () => {
    const first = 0
    const second = 1e-8
    const delta = 1e9
    expect(first).not.toBe(second)
    expect(first + delta).toBe(second + delta)
  })
})
