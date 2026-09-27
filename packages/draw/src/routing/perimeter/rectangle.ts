import { point, type CoordinateSpace, type Point, type Rect } from '../model'
import { EPSILON, assertFiniteResult } from '../geometry'
import { isRectanglePerimeterPoint, validatePerimeterInput } from './validation'

function checkedDifference(operation: string, field: string, left: number, right: number): number {
  return assertFiniteResult(operation, field, left - right)
}

function resultPoint<Space extends CoordinateSpace>(
  bounds: Rect<Space>,
  x: number,
  y: number,
): Point<Space> {
  const result = point<Space>(
    assertFiniteResult('rectanglePerimeter', 'result.x', x),
    assertFiniteResult('rectanglePerimeter', 'result.y', y),
  )
  if (!isRectanglePerimeterPoint(bounds, result)) {
    throw new RangeError('rectanglePerimeter: result failed rectangle perimeter membership')
  }
  return result
}

export function rectanglePerimeter<Space extends CoordinateSpace>(
  bounds: Rect<Space>,
  toward: Point<NoInfer<Space>>,
  orthogonal: boolean,
): Point<Space> {
  const { edges, centerX, centerY, halfWidth, halfHeight } = validatePerimeterInput(
    'rectanglePerimeter',
    bounds,
    toward,
    orthogonal,
  )
  const differenceX = checkedDifference(
    'rectanglePerimeter',
    'differenceX',
    toward.x,
    centerX,
  )
  const differenceY = checkedDifference(
    'rectanglePerimeter',
    'differenceY',
    toward.y,
    centerY,
  )
  if (Math.abs(differenceX) <= EPSILON && Math.abs(differenceY) <= EPSILON) {
    return resultPoint(bounds, edges.right, centerY)
  }

  if (orthogonal) {
    if (toward.y >= edges.top && toward.y <= edges.bottom) {
      return resultPoint(bounds, toward.x < centerX ? edges.left : edges.right, toward.y)
    }
    if (toward.x >= edges.left && toward.x <= edges.right) {
      return resultPoint(bounds, toward.x, toward.y < centerY ? edges.top : edges.bottom)
    }
    return resultPoint(
      bounds,
      toward.x < centerX ? edges.left : edges.right,
      toward.y < centerY ? edges.top : edges.bottom,
    )
  }

  const normalizedX = assertFiniteResult(
    'rectanglePerimeter',
    'normalizedX',
    Math.abs(differenceX) / halfWidth,
  )
  const normalizedY = assertFiniteResult(
    'rectanglePerimeter',
    'normalizedY',
    Math.abs(differenceY) / halfHeight,
  )
  const divisor = Math.max(normalizedX, normalizedY)
  if (!Number.isFinite(divisor) || divisor <= 0) {
    throw new RangeError('rectanglePerimeter: normalization divisor must be finite and positive')
  }
  const projectedX = assertFiniteResult(
    'rectanglePerimeter',
    'projectedX',
    centerX + differenceX / divisor,
  )
  const projectedY = assertFiniteResult(
    'rectanglePerimeter',
    'projectedY',
    centerY + differenceY / divisor,
  )
  if (normalizedX >= normalizedY) {
    return resultPoint(bounds, differenceX < 0 ? edges.left : edges.right, projectedY)
  }
  return resultPoint(bounds, projectedX, differenceY < 0 ? edges.top : edges.bottom)
}
