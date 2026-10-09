import { describe, expect, it } from 'vitest'
import { validateManhattanRoute } from '../../src/geometry/validateManhattanRoute'
describe('Manhattan validation', () => {
  it('accepts an L route', () =>
    expect(
      validateManhattanRoute([
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 10 },
      ]).valid,
    ).toBe(true))
  it('rejects diagonal segments', () =>
    expect(
      validateManhattanRoute([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]).issues,
    ).toContain('NON_MANHATTAN_SEGMENT'))
  it('rejects immediate reversal', () =>
    expect(
      validateManhattanRoute([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 0 },
      ]).issues,
    ).toContain('IMMEDIATE_REVERSAL'))
  it('rejects a crossing route', () =>
    expect(
      validateManhattanRoute([
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 30 },
        { x: 10, y: 30 },
        { x: 10, y: -10 },
      ]).issues,
    ).toContain('SELF_INTERSECTION'))
  it('rejects an overlap', () =>
    expect(
      validateManhattanRoute([
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
      ]).issues,
    ).toContain('SEGMENT_OVERLAP'))
  it('rejects an obstacle crossing', () =>
    expect(
      validateManhattanRoute(
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        1e-6,
        [{ x: 40, y: -20, width: 20, height: 40 }],
      ).issues,
    ).toContain('OBSTACLE_INTERSECTION'))
  it('rejects a reversed terminal exit', () =>
    expect(
      validateManhattanRoute(
        [
          { x: 10, y: 0 },
          { x: 0, y: 0 },
        ],
        1e-6,
        [],
        { sourceDirection: { x: 1, y: 0 } },
      ).issues,
    ).toContain('SOURCE_REVERSE_EXIT'))
  it('honors epsilon for near-orthogonal points', () =>
    expect(
      validateManhattanRoute(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0.000001 },
        ],
        0.001,
      ).valid,
    ).toBe(true))
})
