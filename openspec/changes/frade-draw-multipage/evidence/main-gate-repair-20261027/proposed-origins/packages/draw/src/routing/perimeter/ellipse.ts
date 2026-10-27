import { point, type CoordinateSpace, type Point, type Rect } from '../model'
import { EPSILON, assertFiniteResult, type RectEdges } from '../geometry'
import { isEllipsePerimeterPoint, validatePerimeterInput } from './validation'

interface EllipseCalculation {
  readonly edges: RectEdges
  readonly centerX: number
  readonly centerY: number
  readonly halfWidth: number
  readonly halfHeight: number
  readonly differenceX: number
  readonly differenceY: number
}

function resultPoint<Space extends CoordinateSpace>(
  bounds: Rect<Space>,
  x: number,
  y: number,
): Point<Space> {
  const result = point<Space>(
    assertFiniteResult('ellipsePerimeter', 'result.x', x),
    assertFiniteResult('ellipsePerimeter', 'result.y', y),
  )
  if (!isEllipsePerimeterPoint(bounds, result)) {
    throw new RangeError('ellipsePerimeter: result failed ellipse perimeter membership')
  }
  return result
}

function radialProjection<Space extends CoordinateSpace>(
  bounds: Rect<Space>,
  calculation: EllipseCalculation,
): Point<Space> {
  const { edges, centerX, centerY, halfWidth, halfHeight, differenceX, differenceY } = calculation
  if (differenceY === 0) {
    return resultPoint(bounds, differenceX < 0 ? edges.left : edges.right, centerY)
  }
  if (differenceX === 0) {
    return resultPoint(bounds, centerX, differenceY < 0 ? edges.top : edges.bottom)
  }
  const normalizedX = assertFiniteResult(
    'ellipsePerimeter',
    'normalizedX',
    differenceX / halfWidth,
  )
  const normalizedY = assertFiniteResult(
    'ellipsePerimeter',
    'normalizedY',
    differenceY / halfHeight,
  )
  const magnitude = assertFiniteResult(
    'ellipsePerimeter',
    'normalizedMagnitude',
    Math.hypot(normalizedX, normalizedY),
  )
  if (magnitude <= 0) {
    throw new RangeError('ellipsePerimeter: normalizedMagnitude must be positive')
  }
  const unitX = assertFiniteResult('ellipsePerimeter', 'unitX', normalizedX / magnitude)
  const unitY = assertFiniteResult('ellipsePerimeter', 'unitY', normalizedY / magnitude)
  return resultPoint(
    bounds,
    assertFiniteResult('ellipsePerimeter', 'projectedX', centerX + halfWidth * unitX),
    assertFiniteResult('ellipsePerimeter', 'projectedY', centerY + halfHeight * unitY),
  )
}

export function ellipsePerimeter<Space extends CoordinateSpace>(
  bounds: Rect<Space>,
  toward: Point<NoInfer<Space>>,
  orthogonal: boolean,
): Point<Space> {
  const { edges, centerX, centerY, halfWidth, halfHeight } = validatePerimeterInput(
    'ellipsePerimeter',
    bounds,
    toward,
    orthogonal,
  )
  const differenceX = assertFiniteResult(
    'ellipsePerimeter',
    'differenceX',
    toward.x - centerX,
  )
  const differenceY = assertFiniteResult(
    'ellipsePerimeter',
    'differenceY',
    toward.y - centerY,
  )
  const calculation = { edges, centerX, centerY, halfWidth, halfHeight, differenceX, differenceY }
  if (Math.abs(differenceX) <= EPSILON && Math.abs(differenceY) <= EPSILON) {
    return resultPoint(bounds, edges.right, centerY)
  }

  if (orthogonal && toward.y >= edges.top && toward.y <= edges.bottom) {
    const normalizedY = assertFiniteResult(
      'ellipsePerimeter',
      'orthogonal.normalizedY',
      differenceY / halfHeight,
    )
    const radicand = assertFiniteResult(
      'ellipsePerimeter',
      'orthogonal.horizontalRadicand',
      1 - normalizedY * normalizedY,
    )
    const offset = assertFiniteResult(
      'ellipsePerimeter',
      'orthogonal.horizontalOffset',
      halfWidth * Math.sqrt(Math.max(0, radicand)),
    )
    return resultPoint(bounds, centerX + (toward.x < centerX ? -offset : offset), toward.y)
  }

  if (orthogonal && toward.x >= edges.left && toward.x <= edges.right) {
    const normalizedX = assertFiniteResult(
      'ellipsePerimeter',
      'orthogonal.normalizedX',
      differenceX / halfWidth,
    )
    const radicand = assertFiniteResult(
      'ellipsePerimeter',
      'orthogonal.verticalRadicand',
      1 - normalizedX * normalizedX,
    )
    const offset = assertFiniteResult(
      'ellipsePerimeter',
      'orthogonal.verticalOffset',
      halfHeight * Math.sqrt(Math.max(0, radicand)),
    )
    return resultPoint(bounds, toward.x, centerY + (toward.y < centerY ? -offset : offset))
  }

  return radialProjection(bounds, calculation)
}
