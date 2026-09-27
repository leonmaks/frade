import { type CoordinateSpace, type Point, type Rect } from '../model'
import {
  EPSILON,
  assertFiniteResult,
  assertValidPoint,
  assertValidRect,
  rectEdges,
  type RectEdges,
} from '../geometry'

export interface ValidatedPerimeterInput {
  readonly edges: RectEdges
  readonly centerX: number
  readonly centerY: number
  readonly halfWidth: number
  readonly halfHeight: number
}

function unrepresentable(operation: string, field: string, detail: string): RangeError {
  return new RangeError(`${operation}: ${field} is not a representable perimeter ${detail}`)
}

function validateBounds<Space extends CoordinateSpace>(
  operation: string,
  bounds: Rect<Space>,
): ValidatedPerimeterInput {
  assertValidRect(operation, 'bounds', bounds)
  if (bounds.width === 0) {
    throw new RangeError(`${operation}: bounds.width must be greater than zero for a perimeter`)
  }
  if (bounds.height === 0) {
    throw new RangeError(`${operation}: bounds.height must be greater than zero for a perimeter`)
  }
  const edges = rectEdges(bounds)
  const halfWidth = assertFiniteResult(operation, 'halfWidth', bounds.width / 2)
  const halfHeight = assertFiniteResult(operation, 'halfHeight', bounds.height / 2)
  if (halfWidth <= 0) throw unrepresentable(operation, 'halfWidth', 'radius')
  if (halfHeight <= 0) throw unrepresentable(operation, 'halfHeight', 'radius')
  const centerX = assertFiniteResult(operation, 'centerX', edges.left + halfWidth)
  const centerY = assertFiniteResult(operation, 'centerY', edges.top + halfHeight)
  if (!(centerX > edges.left && centerX < edges.right)) {
    throw unrepresentable(operation, 'centerX', 'center')
  }
  if (!(centerY > edges.top && centerY < edges.bottom)) {
    throw unrepresentable(operation, 'centerY', 'center')
  }
  return { edges, centerX, centerY, halfWidth, halfHeight }
}

export function validatePerimeterInput<Space extends CoordinateSpace>(
  operation: string,
  bounds: Rect<Space>,
  toward: Point<NoInfer<Space>>,
  orthogonal: boolean,
): ValidatedPerimeterInput {
  const validated = validateBounds(operation, bounds)
  assertValidPoint(operation, 'toward', toward)
  if (typeof orthogonal !== 'boolean') {
    throw new TypeError(`${operation}: orthogonal must be boolean`)
  }
  return validated
}

function finiteDifference(operation: string, field: string, left: number, right: number): number {
  return assertFiniteResult(operation, field, left - right)
}

export function isRectanglePerimeterPoint<Space extends CoordinateSpace>(
  bounds: Rect<Space>,
  value: Point<NoInfer<Space>>,
): boolean {
  const operation = 'isRectanglePerimeterPoint'
  const { edges } = validateBounds(operation, bounds)
  assertValidPoint(operation, 'point', value)
  const withinX = value.x >= edges.left - EPSILON && value.x <= edges.right + EPSILON
  const withinY = value.y >= edges.top - EPSILON && value.y <= edges.bottom + EPSILON
  if (!withinX || !withinY) return false
  const edgeDistance = Math.min(
    Math.abs(finiteDifference(operation, 'point-left', value.x, edges.left)),
    Math.abs(finiteDifference(operation, 'point-right', value.x, edges.right)),
    Math.abs(finiteDifference(operation, 'point-top', value.y, edges.top)),
    Math.abs(finiteDifference(operation, 'point-bottom', value.y, edges.bottom)),
  )
  return edgeDistance <= EPSILON
}

export function ellipseResidual<Space extends CoordinateSpace>(
  bounds: Rect<Space>,
  value: Point<NoInfer<Space>>,
): number {
  const operation = 'ellipseResidual'
  const { centerX, centerY, halfWidth, halfHeight } = validateBounds(operation, bounds)
  assertValidPoint(operation, 'point', value)
  const normalizedX = assertFiniteResult(
    operation,
    'normalizedX',
    finiteDifference(operation, 'point-centerX', value.x, centerX) / halfWidth,
  )
  const normalizedY = assertFiniteResult(
    operation,
    'normalizedY',
    finiteDifference(operation, 'point-centerY', value.y, centerY) / halfHeight,
  )
  const squaredX = assertFiniteResult(operation, 'normalizedX squared', normalizedX * normalizedX)
  const squaredY = assertFiniteResult(operation, 'normalizedY squared', normalizedY * normalizedY)
  const equation = assertFiniteResult(operation, 'equation', squaredX + squaredY)
  return assertFiniteResult(operation, 'residual', Math.abs(equation - 1))
}

export function isEllipsePerimeterPoint<Space extends CoordinateSpace>(
  bounds: Rect<Space>,
  value: Point<NoInfer<Space>>,
): boolean {
  return isEllipseResidualWithinTolerance(ellipseResidual(bounds, value))
}

export function isEllipseResidualWithinTolerance(residual: number): boolean {
  assertFiniteResult('isEllipseResidualWithinTolerance', 'residual', residual)
  return Math.abs(residual) <= EPSILON
}
