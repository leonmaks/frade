import { describe, expect, it } from 'vitest'
import { rect, vector } from '../../../../src/routing/model'
import {
  EPSILON,
  RelativePlacement,
  horizontalOverlap,
  horizontalSeparation,
  rectEdges,
  relativeHorizontalPlacement,
  relativeVerticalPlacement,
  translateRect,
  verticalOverlap,
  verticalSeparation,
} from '../../../../src/routing/geometry'

describe('R01 rectangle relations', () => {
  it('provides finite rectangle edges', () => {
    expect(rectEdges(rect(-2, 3, 5, 7))).toEqual({ left: -2, top: 3, right: 3, bottom: 10 })
    expect(() => rectEdges(rect(Number.MAX_VALUE, 0, Number.MAX_VALUE, 1))).toThrow(
      /rectEdges.*right/i,
    )
  })

  it.each([
    [0, true, 0],
    [EPSILON, true, 0],
    [EPSILON * 1.0001, false, EPSILON * 1.0001],
    [10, false, 10],
  ])('treats horizontal gap %s according to EPSILON', (gap, overlaps, separation) => {
    const first = rect(0, 0, 10, 10)
    const second = rect(10 + gap, 2, 5, 4)
    const expectedSeparation = separation === 0 ? 0 : second.x - (first.x + first.width)
    expect(horizontalOverlap(first, second)).toBe(overlaps)
    expect(horizontalSeparation(first, second)).toBe(expectedSeparation)
    expect(horizontalSeparation(second, first)).toBe(expectedSeparation)
    expect(horizontalSeparation(first, second)).toBeGreaterThanOrEqual(0)
  })

  it.each([
    [0, true, 0],
    [EPSILON, true, 0],
    [EPSILON * 1.0001, false, EPSILON * 1.0001],
    [10, false, 10],
  ])('treats vertical gap %s according to EPSILON', (gap, overlaps, separation) => {
    const first = rect(0, 0, 10, 10)
    const second = rect(2, 10 + gap, 4, 5)
    const expectedSeparation = separation === 0 ? 0 : second.y - (first.y + first.height)
    expect(verticalOverlap(first, second)).toBe(overlaps)
    expect(verticalSeparation(first, second)).toBe(expectedSeparation)
    expect(verticalSeparation(second, first)).toBe(expectedSeparation)
    expect(verticalSeparation(first, second)).toBeGreaterThanOrEqual(0)
  })

  it('reports basic relative placement without quadrant or direction policy', () => {
    const center = rect(10, 10, 5, 5)
    expect(relativeHorizontalPlacement(rect(0, 10, 5, 5), center)).toBe(
      RelativePlacement.BEFORE,
    )
    expect(relativeHorizontalPlacement(rect(20, 10, 5, 5), center)).toBe(
      RelativePlacement.AFTER,
    )
    expect(relativeHorizontalPlacement(rect(12, 10, 5, 5), center)).toBe(
      RelativePlacement.OVERLAPPING,
    )
    expect(relativeVerticalPlacement(rect(10, 0, 5, 5), center)).toBe(RelativePlacement.BEFORE)
    expect(relativeVerticalPlacement(rect(10, 20, 5, 5), center)).toBe(RelativePlacement.AFTER)
  })

  it('preserves safe integer-lattice relations under common translation', () => {
    const first = rect(-100, 50, 20, 30)
    const second = rect(45, 60, 10, 10)
    const delta = vector(1_000_000, -1_000_000)
    const translatedFirst = translateRect(first, delta)
    const translatedSecond = translateRect(second, delta)
    expect(horizontalOverlap(translatedFirst, translatedSecond)).toBe(
      horizontalOverlap(first, second),
    )
    expect(horizontalSeparation(translatedFirst, translatedSecond)).toBe(
      horizontalSeparation(first, second),
    )
    expect(verticalOverlap(translatedFirst, translatedSecond)).toBe(verticalOverlap(first, second))
    expect(verticalSeparation(translatedFirst, translatedSecond)).toBe(
      verticalSeparation(first, second),
    )
  })
})
