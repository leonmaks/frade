import { describe, expect, it } from 'vitest'
import { SegmentClassification, point, segment, vector, type ModelPoint } from '../../../../src/routing/model'
import {
  EPSILON,
  classifySegment,
  isOrthogonalSegment,
  manhattanDistance,
  translatePoint,
  translateSegment,
} from '../../../../src/routing/geometry'

describe('R01 segment and translation primitives', () => {
  it.each([
    [segment(point(0, 0), point(0, 0)), SegmentClassification.ZERO_LENGTH, false],
    [segment(point(0, 0), point(10, EPSILON)), SegmentClassification.HORIZONTAL, true],
    [segment(point(0, 0), point(EPSILON, 10)), SegmentClassification.VERTICAL, true],
    [segment(point(0, 0), point(10, 10)), SegmentClassification.DIAGONAL, false],
  ])('classifies without repairing %o', (value, classification, orthogonal) => {
    expect(classifySegment(value)).toBe(classification)
    expect(isOrthogonalSegment(value)).toBe(orthogonal)
  })

  it('computes exact Manhattan distance, including approximately equal points', () => {
    expect(manhattanDistance(point(-2, 3), point(5, -7))).toBe(17)
    expect(manhattanDistance(point(5, -7), point(-2, 3))).toBe(17)
    expect(manhattanDistance(point(4, 4), point(4, 4))).toBe(0)
    expect(manhattanDistance(point(0, 0), point(EPSILON, -EPSILON))).toBe(2 * EPSILON)
  })

  it('translates points and segments immutably using the stated formula', () => {
    const originalPoint = point(1.25, -2.5)
    const delta = vector(-3.5, 4.25)
    const originalSegment = segment(originalPoint, point(10, 20))
    expect(translatePoint(originalPoint, delta)).toEqual({ x: -2.25, y: 1.75 })
    expect(translateSegment(originalSegment, delta)).toEqual({
      start: { x: -2.25, y: 1.75 },
      end: { x: 6.5, y: 24.25 },
    })
    expect(originalPoint).toEqual({ x: 1.25, y: -2.5 })
    expect(originalSegment).toEqual({ start: { x: 1.25, y: -2.5 }, end: { x: 10, y: 20 } })
  })

  it('rejects non-finite inputs and non-finite translation results actionably', () => {
    const invalidModelPoint: ModelPoint = { x: Number.NaN, y: 0 }
    expect(() => translatePoint(invalidModelPoint, vector(0, 0))).toThrow(
      /translatePoint.*point\.x/i,
    )
    expect(() => translatePoint(point(0, 0), { x: Number.POSITIVE_INFINITY, y: 0 })).toThrow(
      /translatePoint.*delta\.x/i,
    )
    expect(() => translatePoint(point(Number.MAX_VALUE, 0), vector(Number.MAX_VALUE, 0))).toThrow(
      /translatePoint.*result\.x/i,
    )
    expect(() => manhattanDistance(point(Number.MAX_VALUE, 0), point(-Number.MAX_VALUE, 0))).toThrow(
      /manhattanDistance.*result/i,
    )
  })

  it('documents cancellation outside the translation-stable domain without artificial recovery', () => {
    const delta = vector(1e9, 0)
    const translatedA = translatePoint(point(0, 0), delta)
    const translatedB = translatePoint(point(1e-8, 0), delta)
    expect(translatedA.x).toBe(0 + 1e9)
    expect(translatedB.x).toBe(1e-8 + 1e9)
    expect(Number.isFinite(translatedA.x)).toBe(true)
    expect(Number.isFinite(translatedB.x)).toBe(true)
    expect(translatedA.x).toBe(translatedB.x)
  })

  it('is history-independent across unrelated geometry operations', () => {
    const value = segment(point(0, 0), point(10, 0))
    const before = classifySegment(value)
    manhattanDistance(point(-5, 4), point(6, -7))
    translatePoint(point(1, 2), vector(3, 4))
    expect(classifySegment(value)).toBe(before)
  })
})
