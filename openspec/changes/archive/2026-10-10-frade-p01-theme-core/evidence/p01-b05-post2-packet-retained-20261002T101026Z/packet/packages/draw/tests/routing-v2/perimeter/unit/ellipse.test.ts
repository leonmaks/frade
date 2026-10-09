import { describe, expect, it } from 'vitest'

import { EPSILON, rectEdges } from '../../../../src/routing/geometry'
import { point, rect, type ModelSpace, type Point, type Rect } from '../../../../src/routing/model'
import {
  ellipsePerimeter,
  ellipseResidual,
  perimeterGeometry,
  perimeterIntersection,
} from '../../../../src/routing/perimeter'

const bounds = rect<ModelSpace>(0, 0, 10, 20)

function invalidRect(width: number, height: number): Rect<ModelSpace> {
  return { x: 0, y: 0, width, height }
}

function expectPoint(actual: Point<ModelSpace>, x: number, y: number): void {
  expect(Math.abs(actual.x - x)).toBeLessThanOrEqual(EPSILON)
  expect(Math.abs(actual.y - y)).toBeLessThanOrEqual(EPSILON)
}

describe('ellipse radial perimeter', () => {
  it.each([
    [-5, 10, 0, 10],
    [15, 10, 10, 10],
    [5, -10, 5, 0],
    [5, 30, 5, 20],
  ])('projects cardinal toward (%s,%s) to (%s,%s)', (tx, ty, x, y) => {
    expect(ellipsePerimeter(bounds, point<ModelSpace>(tx, ty), false)).toEqual({ x, y })
  })

  it.each([
    ['east', 0.2, 0, 0.1, 2, 1, 1],
    ['west', 0.3, 0, 0.7, 2, -1, 1],
    ['south', 0, 0.3, 2, 0.1, 1, 1],
    ['north', 0, 0.3, 2, 0.7, 1, -1],
  ] as const)('uses the exact represented %s edge for a fractional radial axis',
    (side, x, y, width, height, towardX, towardY) => {
      const fractionalBounds = rect<ModelSpace>(x, y, width, height)
      const edges = rectEdges(fractionalBounds)
      const centerX = x + width / 2
      const centerY = y + height / 2
      const expected = side === 'east' || side === 'west'
        ? { x: side === 'east' ? edges.right : edges.left, y: centerY }
        : { x: centerX, y: side === 'south' ? edges.bottom : edges.top }

      expect(
        ellipsePerimeter(fractionalBounds, point<ModelSpace>(towardX, towardY), false),
      ).toEqual(expected)
    },
  )
  it('projects a diagonal analytically', () => {
    const result = ellipsePerimeter(bounds, point<ModelSpace>(10, 20), false)
    expectPoint(result, 5 + 5 / Math.sqrt(2), 10 + 10 / Math.sqrt(2))
    expect(ellipseResidual(bounds, result)).toBeLessThanOrEqual(EPSILON)
  })

  it('extends an inside point to the ellipse and preserves a boundary point', () => {
    expectPoint(
      ellipsePerimeter(bounds, point<ModelSpace>(6, 12), false),
      5 + 5 / Math.sqrt(2),
      10 + 10 / Math.sqrt(2),
    )
    expect(ellipsePerimeter(bounds, point<ModelSpace>(10, 10), false)).toEqual({ x: 10, y: 10 })
  })

  it('uses EAST midpoint for center and retains sub-unit ray direction', () => {
    expect(ellipsePerimeter(bounds, point<ModelSpace>(5, 10), false)).toEqual({ x: 10, y: 10 })
    expectPoint(
      ellipsePerimeter(bounds, point<ModelSpace>(5.2, 10.2), false),
      5 + 10 / Math.sqrt(5),
      10 + 10 / Math.sqrt(5),
    )
  })
})

describe('ellipse orthogonal hint', () => {
  it.each([
    [20, 16, 9, 16],
    [-10, 16, 1, 16],
  ])('uses horizontal-band intersection for (%s,%s)', (tx, ty, x, y) => {
    expectPoint(ellipsePerimeter(bounds, point<ModelSpace>(tx, ty), true), x, y)
  })

  it.each([
    [8, 30, 8, 18],
    [8, -10, 8, 2],
  ])('uses vertical-band intersection for (%s,%s)', (tx, ty, x, y) => {
    expectPoint(ellipsePerimeter(bounds, point<ModelSpace>(tx, ty), true), x, y)
  })

  it('uses radial projection outside both exact bands', () => {
    const result = ellipsePerimeter(bounds, point<ModelSpace>(20, 30), true)
    expect(ellipseResidual(bounds, result)).toBeLessThanOrEqual(EPSILON)
  })

  it('uses west horizontal intersection inside and exact band endpoints', () => {
    expectPoint(ellipsePerimeter(bounds, point<ModelSpace>(4, 8), true), 5 - Math.sqrt(24), 8)
    expect(ellipsePerimeter(bounds, point<ModelSpace>(20, 0), true)).toEqual({ x: 5, y: 0 })
    expect(ellipsePerimeter(bounds, point<ModelSpace>(20, 20), true)).toEqual({ x: 5, y: 20 })
  })

  it('applies center precedence under the orthogonal hint', () => {
    expect(ellipsePerimeter(bounds, point<ModelSpace>(5, 10), true)).toEqual({ x: 10, y: 10 })
  })
})

describe('ellipse rejection and dispatch', () => {
  it.each([false, true])('rejects each collapsed extent with orthogonal=%s', (orthogonal) => {
    for (const [width, height] of [
      [0, 10],
      [10, 0],
      [0, 0],
    ]) {
      expect(() =>
        ellipsePerimeter(
          invalidRect(width, height),
          point<ModelSpace>(20, 20),
          orthogonal,
        ),
      ).toThrow(RangeError)
    }
  })

  it('rejects unrepresentable subtraction and normalization', () => {
    expect(() =>
      ellipsePerimeter(
        rect<ModelSpace>(-Number.MAX_VALUE, 0, Number.MAX_VALUE, 10),
        point<ModelSpace>(Number.MAX_VALUE, 5),
        false,
      ),
    ).toThrow(/differenceX/)
  })

  it('dispatches by actual shape and rejects malformed kinds', () => {
    expect(
      perimeterIntersection(
        perimeterGeometry(bounds, 'rectangle'),
        point<ModelSpace>(15, 15),
        false,
      ),
    ).toEqual({ x: 10, y: 12.5 })
    expectPoint(
      perimeterIntersection(perimeterGeometry(bounds, 'ellipse'), point<ModelSpace>(10, 20), false),
      5 + 5 / Math.sqrt(2),
      10 + 10 / Math.sqrt(2),
    )
    expect(() =>
      perimeterIntersection(
        { kind: 'diamond' as never, bounds },
        point<ModelSpace>(20, 20),
        false,
      ),
    ).toThrow(/kind/)
  })
})
