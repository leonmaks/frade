import { describe, expect, it } from 'vitest'

import { EPSILON } from '../../../../src/routing/geometry'
import { point, rect, type ModelSpace, type Rect } from '../../../../src/routing/model'
import { rectanglePerimeter } from '../../../../src/routing/perimeter'

const bounds = rect<ModelSpace>(0, 0, 10, 20)

function invalidRect(width: number, height: number): Rect<ModelSpace> {
  return { x: 0, y: 0, width, height }
}

describe('rectangle radial perimeter', () => {
  it.each([
    [-5, 10, 0, 10],
    [15, 10, 10, 10],
    [5, -10, 5, 0],
    [5, 30, 5, 20],
  ])('projects cardinal toward (%s,%s) to (%s,%s)', (tx, ty, x, y) => {
    expect(rectanglePerimeter(bounds, point<ModelSpace>(tx, ty), false)).toEqual({ x, y })
  })

  it.each([
    [-5, -10, 0, 0],
    [15, -10, 10, 0],
    [15, 30, 10, 20],
    [-5, 30, 0, 20],
  ])('uses horizontal precedence for exact corner tie (%s,%s)', (tx, ty, x, y) => {
    expect(rectanglePerimeter(bounds, point<ModelSpace>(tx, ty), false)).toEqual({ x, y })
  })

  it('projects an arbitrary diagonal ray at full precision', () => {
    expect(rectanglePerimeter(bounds, point<ModelSpace>(15, 15), false)).toEqual({ x: 10, y: 12.5 })
  })

  it('extends inside points and preserves boundary coincidence', () => {
    expect(rectanglePerimeter(bounds, point<ModelSpace>(6, 12), false)).toEqual({ x: 10, y: 20 })
    expect(rectanglePerimeter(bounds, point<ModelSpace>(10, 20), false)).toEqual({ x: 10, y: 20 })
  })

  it('uses EAST midpoint only when both differences are independently within EPSILON', () => {
    expect(rectanglePerimeter(bounds, point<ModelSpace>(5, 10), false)).toEqual({ x: 10, y: 10 })
    expect(
      rectanglePerimeter(
        rect<ModelSpace>(-5, -10, 10, 20),
        point<ModelSpace>(EPSILON, -EPSILON),
        false,
      ),
    ).toEqual({ x: 5, y: 0 })
    const beyondThreshold = point<ModelSpace>(5 + 2 * EPSILON, 10 + EPSILON)
    const expectedY = 10 + (beyondThreshold.y - 10) / (Math.abs(beyondThreshold.x - 5) / 5)
    expect(rectanglePerimeter(bounds, beyondThreshold, false)).toEqual({ x: 10, y: expectedY })
  })
})

describe('rectangle orthogonal hint', () => {
  it.each([
    [-5, 7, 0, 7],
    [15, 7, 10, 7],
    [3, -5, 3, 0],
    [3, 25, 3, 20],
  ])('projects an exterior aligned approach (%s,%s)', (tx, ty, x, y) => {
    expect(rectanglePerimeter(bounds, point<ModelSpace>(tx, ty), true)).toEqual({ x, y })
  })

  it('uses the nearest corner outside both exact bands', () => {
    expect(rectanglePerimeter(bounds, point<ModelSpace>(20, 30), true)).toEqual({ x: 10, y: 20 })
  })

  it('gives the horizontal band priority for an inside point', () => {
    expect(rectanglePerimeter(bounds, point<ModelSpace>(4, 8), true)).toEqual({ x: 0, y: 8 })
  })

  it('uses exact inclusive bands without EPSILON expansion', () => {
    expect(rectanglePerimeter(bounds, point<ModelSpace>(20, 20), true)).toEqual({ x: 10, y: 20 })
    expect(rectanglePerimeter(bounds, point<ModelSpace>(20, -EPSILON), true)).toEqual({ x: 10, y: 0 })
    expect(rectanglePerimeter(bounds, point<ModelSpace>(20, -(EPSILON + Number.EPSILON)), true)).toEqual({
      x: 10,
      y: 0,
    })
  })

  it('preserves sub-grid precision and does not quantize', () => {
    expect(rectanglePerimeter(rect<ModelSpace>(0, 0, 10, 10), point<ModelSpace>(20, 5.04), true)).toEqual({
      x: 10,
      y: 5.04,
    })
  })

  it('applies center precedence under either hint', () => {
    expect(rectanglePerimeter(bounds, point<ModelSpace>(5, 10), true)).toEqual({ x: 10, y: 10 })
  })
})

describe('rectangle rejection partitions', () => {
  it.each([false, true])('rejects each collapsed extent with orthogonal=%s', (orthogonal) => {
    for (const [width, height] of [
      [0, 10],
      [10, 0],
      [0, 0],
    ]) {
      expect(() =>
        rectanglePerimeter(
          invalidRect(width, height),
          point<ModelSpace>(20, 20),
          orthogonal,
        ),
      ).toThrow(RangeError)
    }
  })

  it('rejects unrepresentable toward subtraction instead of returning a fallback', () => {
    expect(() =>
      rectanglePerimeter(
        rect<ModelSpace>(-Number.MAX_VALUE, 0, Number.MAX_VALUE, 10),
        point<ModelSpace>(Number.MAX_VALUE, 5),
        false,
      ),
    ).toThrow(/differenceX/)
  })
})
