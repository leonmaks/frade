import { describe, expect, it } from 'vitest'
import { point } from '../../../../src/routing/model'
import {
  EPSILON,
  ROUTE_PRECISION,
  approximatelyEqual,
  pointsApproximatelyEqual,
  quantizeCoordinate,
} from '../../../../src/routing/geometry'
import {
  LARGE_EXACT_GRID_COUNTEREXAMPLE,
  LARGE_FINITE_QUANTIZATION_COUNTEREXAMPLE,
} from '../support/regressions'

describe('R01 numerical policy', () => {
  it('publishes the approved constants', () => {
    expect(EPSILON).toBe(1e-6)
    expect(ROUTE_PRECISION).toBe(0.1)
  })

  it('uses a symmetric inclusive epsilon boundary for scalars and points', () => {
    expect(approximatelyEqual(0, EPSILON)).toBe(true)
    expect(approximatelyEqual(EPSILON, 0)).toBe(true)
    expect(approximatelyEqual(0, EPSILON * 1.0001)).toBe(false)
    expect(pointsApproximatelyEqual(point(0, 0), point(EPSILON, -EPSILON))).toBe(true)
    expect(pointsApproximatelyEqual(point(EPSILON, -EPSILON), point(0, 0))).toBe(true)
    expect(pointsApproximatelyEqual(point(0, 0), point(EPSILON * 1.0001, 0))).toBe(false)
  })

  it.each([
    [0.01, 0],
    [0.04, 0],
    [0.06, 0.1],
    [0.05, 0.1],
    [0.14, 0.1],
    [0.15, 0.2],
    [-0.04, 0],
    [-0.05, -0.1],
    [-0.14, -0.1],
    [-0.15, -0.2],
    [-12.36, -12.4],
    [1_000_000_000.04, 1_000_000_000],
    [LARGE_FINITE_QUANTIZATION_COUNTEREXAMPLE, 100_000_000_000_000],
    [LARGE_EXACT_GRID_COUNTEREXAMPLE, LARGE_EXACT_GRID_COUNTEREXAMPLE],
  ])('quantizes %s to %s with half ties away from zero', (input, expected) => {
    expect(quantizeCoordinate(input)).toBe(expected)
  })

  it('normalizes negative zero to positive zero', () => {
    const result = quantizeCoordinate(-0.04)
    expect(result).toBe(0)
    expect(Object.is(result, -0)).toBe(false)
  })

  it('is scalar-idempotent and independent of display zoom', () => {
    for (const value of [
      -10_000.15,
      -0.05,
      0.04,
      0.15,
      10_000.16,
      LARGE_EXACT_GRID_COUNTEREXAMPLE,
    ]) {
      const once = quantizeCoordinate(value)
      expect(quantizeCoordinate(once)).toBe(once)
      expect([0.5, 1, 2].map(() => quantizeCoordinate(value))).toEqual([once, once, once])
    }
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite quantization input %s with operation and field evidence',
    (invalid) => expect(() => quantizeCoordinate(invalid)).toThrow(/quantizeCoordinate.*value/i),
  )
})
