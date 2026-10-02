import { describe, expect, it } from 'vitest'
import { SegmentClassification, point, segment } from '../../../../src/routing/model'
import {
  classifySegment,
  normalizePointSequence,
  quantizeCoordinate,
  removeAdjacentDuplicatePoints,
  removeCollinearPoints,
} from '../../../../src/routing/geometry'
import { CUMULATIVE_EPSILON_DRIFT_COUNTEREXAMPLE } from '../support/regressions'

describe('R01 structural normalization', () => {
  const a = point(0, 0)
  const b = point(10, 0)
  const c = point(20, 0)

  it('removes adjacent duplicate runs but preserves non-adjacent repeats and order', () => {
    expect(removeAdjacentDuplicatePoints([a, b, b, b, c])).toEqual([a, b, c])
    expect(removeAdjacentDuplicatePoints([a, b, a])).toEqual([a, b, a])
    expect(removeAdjacentDuplicatePoints([a, b, b, c])).toEqual([a, b, c])
  })

  it('removes duplicate runs correctly and is directly idempotent', () => {
    const input = [a, a, b, b, b, c]
    const once = removeAdjacentDuplicatePoints(input)
    expect(once).toEqual([a, b, c])

    const twice = removeAdjacentDuplicatePoints(once)
    expect(twice).toEqual(once)
  })

  it('removes only between-aware horizontal and vertical collinear intermediates', () => {
    expect(removeCollinearPoints([a, b, c])).toEqual([a, c])
    expect(removeCollinearPoints([point(1, 0), point(1, 10), point(1, 20)])).toEqual([
      point(1, 0),
      point(1, 20),
    ])
    expect(removeCollinearPoints([a, c, b])).toEqual([a, c, b])
    expect(removeCollinearPoints([a, b, point(10, 10)])).toEqual([a, b, point(10, 10)])
    expect(removeCollinearPoints([a, point(10, 1), c])).toEqual([a, point(10, 1), c])
  })

  it('preserves endpoints, bends, diagonal evidence, and surviving exact coordinates', () => {
    const diagonal = [point(0, 0), point(1, 0.04)]
    expect(normalizePointSequence(diagonal)).toEqual(diagonal)
    expect(classifySegment(segment(diagonal[0], diagonal[1]))).toBe(
      SegmentClassification.DIAGONAL,
    )
    expect(quantizeCoordinate(0.04)).toBe(0)

    const exact = [point(0.02, -0.03), point(1.07, 0.04), point(1.07, 3.14159)]
    expect(normalizePointSequence(exact)).toEqual(exact)
    const withRedundancy = [exact[0], exact[0], exact[1], point(1.07, 2), exact[2]]
    expect(normalizePointSequence(withRedundancy)).toEqual(exact)
  })

  it('is idempotent without inventing or moving geometry', () => {
    const input = [a, a, point(5, 0), b, point(10, 5), point(10, 10)]
    const once = normalizePointSequence(input)
    expect(once).toEqual([a, b, point(10, 10)])
    expect(normalizePointSequence(once)).toEqual(once)
    for (const survivor of once) expect(input).toContain(survivor)
  })

  it('does not collapse locally EPSILON-horizontal legs into a diagonal survivor', () => {
    const cumulativeDrift = CUMULATIVE_EPSILON_DRIFT_COUNTEREXAMPLE.map((value) =>
      point(value.x, value.y),
    )
    expect(normalizePointSequence(cumulativeDrift)).toEqual(cumulativeDrift)
    expect(classifySegment(segment(cumulativeDrift[0], cumulativeDrift[2]))).toBe(
      SegmentClassification.DIAGONAL,
    )
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects invalid input coordinate %s actionably',
    (invalid) =>
      expect(() => normalizePointSequence([point(0, 0), { x: invalid, y: 0 }])).toThrow(
        /normalizePointSequence.*\[1\]\.x/i,
      ),
  )
})
