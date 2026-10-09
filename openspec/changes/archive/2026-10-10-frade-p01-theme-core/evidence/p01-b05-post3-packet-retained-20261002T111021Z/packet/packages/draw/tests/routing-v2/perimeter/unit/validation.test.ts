import { describe, expect, it } from 'vitest'

import { EPSILON } from '../../../../src/routing/geometry'
import { type ModelSpace, type Point, type Rect, point, rect } from '../../../../src/routing/model'
import {
  ellipseResidual,
  isEllipsePerimeterPoint,
  isEllipseResidualWithinTolerance,
  isRectanglePerimeterPoint,
  validatePerimeterInput,
} from '../../../../src/routing/perimeter'

function invalidRect(value: { x: number; y: number; width: number; height: number }): Rect<ModelSpace> {
  return value
}

function invalidPoint(value: { x: number; y: number }): Point<ModelSpace> {
  return value
}

describe('perimeter validation and numerical membership', () => {
  const validBounds = rect<ModelSpace>(0, 0, 10, 20)
  const validToward = point<ModelSpace>(20, 10)

  it.each(['x', 'y', 'width', 'height'] as const)(
    'rejects every non-finite bounds.%s partition',
    (field) => {
      for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
        const bounds = invalidRect({ ...validBounds, [field]: invalid })
        expect(() => validatePerimeterInput('testPerimeter', bounds, validToward, false)).toThrow(
          new RegExp(`bounds\\.${field}`),
        )
      }
    },
  )

  it.each(['x', 'y'] as const)('rejects every non-finite toward.%s partition', (field) => {
    for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const toward = invalidPoint({ ...validToward, [field]: invalid })
      expect(() => validatePerimeterInput('testPerimeter', validBounds, toward, false)).toThrow(
        new RegExp(`toward\\.${field}`),
      )
    }
  })

  it('rejects negative and independently collapsed extents', () => {
    for (const [width, height, field] of [
      [-1, 10, 'width'],
      [10, -1, 'height'],
      [0, 10, 'width'],
      [10, 0, 'height'],
      [0, 0, 'width'],
    ] as const) {
      expect(() =>
        validatePerimeterInput(
          'testPerimeter',
          invalidRect({ x: 0, y: 0, width, height }),
          validToward,
          false,
        ),
      ).toThrow(new RegExp(field))
    }
  })

  it('rejects overflow, collapsed centers, and zero half-radii', () => {
    expect(() =>
      validatePerimeterInput(
        'testPerimeter',
        invalidRect({ x: Number.MAX_VALUE, y: 0, width: Number.MAX_VALUE, height: 10 }),
        validToward,
        false,
      ),
    ).toThrow(/right/)
    expect(() =>
      validatePerimeterInput(
        'testPerimeter',
        invalidRect({ x: Number.MAX_VALUE, y: 0, width: 1, height: 10 }),
        validToward,
        false,
      ),
    ).toThrow(/centerX/)
    expect(() =>
      validatePerimeterInput(
        'testPerimeter',
        invalidRect({ x: 0, y: 0, width: Number.MIN_VALUE, height: 10 }),
        validToward,
        false,
      ),
    ).toThrow(/halfWidth/)
  })

  it('does not reject a representable positive extent merely for being below EPSILON', () => {
    expect(
      validatePerimeterInput(
        'testPerimeter',
        rect<ModelSpace>(0, 0, EPSILON / 2, EPSILON / 4),
        point<ModelSpace>(1, 1),
        false,
      ),
    ).toMatchObject({ halfWidth: EPSILON / 4, halfHeight: EPSILON / 8 })
  })

  it('rejects malformed orthogonal hints with the semantic field name', () => {
    expect(() =>
      validatePerimeterInput('testPerimeter', validBounds, validToward, 'yes' as never),
    ).toThrow(/orthogonal/)
  })

  it('uses exact inclusive EPSILON rectangle membership', () => {
    expect(isRectanglePerimeterPoint(validBounds, point<ModelSpace>(-EPSILON, 10))).toBe(true)
    expect(isRectanglePerimeterPoint(validBounds, point<ModelSpace>(0, 20 + EPSILON))).toBe(true)
    expect(
      isRectanglePerimeterPoint(validBounds, point<ModelSpace>(-(EPSILON + Number.EPSILON), 10)),
    ).toBe(false)
    expect(isRectanglePerimeterPoint(validBounds, point<ModelSpace>(5, 10))).toBe(false)
  })

  it('uses the analytical ellipse residual with inclusive EPSILON', () => {
    expect(ellipseResidual(validBounds, point<ModelSpace>(10, 10))).toBe(0)
    expect(isEllipseResidualWithinTolerance(EPSILON)).toBe(true)
    expect(isEllipseResidualWithinTolerance(EPSILON + Number.EPSILON)).toBe(false)
    expect(
      isEllipsePerimeterPoint(
        validBounds,
        point<ModelSpace>(5 + 5 * Math.sqrt(1 + EPSILON * 0.999), 10),
      ),
    ).toBe(true)
    expect(
      isEllipsePerimeterPoint(
        validBounds,
        point<ModelSpace>(5 + 5 * Math.sqrt(1 + EPSILON * 1.01), 10),
      ),
    ).toBe(false)
  })
})
