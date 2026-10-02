import { rect, type CoordinateSpace, type Point, type Rect } from '../model'
import { assertValidRect } from '../geometry'

export type PerimeterKind = 'rectangle' | 'ellipse'

export interface PerimeterGeometry<Space extends CoordinateSpace> {
  readonly kind: PerimeterKind
  readonly bounds: Rect<Space>
}

export interface Perimeter {
  intersection<Space extends CoordinateSpace>(
    bounds: Rect<Space>,
    toward: Point<NoInfer<Space>>,
    orthogonal: boolean,
  ): Point<Space>
}

export function assertPerimeterKind(
  operation: string,
  field: string,
  value: PerimeterKind,
): void {
  if (value !== 'rectangle' && value !== 'ellipse') {
    throw new TypeError(`${operation}: ${field} must be rectangle or ellipse; received ${String(value)}`)
  }
}

export function assertValidPerimeterGeometry<Space extends CoordinateSpace>(
  operation: string,
  field: string,
  value: PerimeterGeometry<Space>,
): void {
  if (value === null || typeof value !== 'object') {
    throw new TypeError(`${operation}: ${field} must be perimeter geometry`)
  }
  assertPerimeterKind(operation, `${field}.kind`, value.kind)
  assertValidRect(operation, `${field}.bounds`, value.bounds)
}

export function perimeterGeometry<Space extends CoordinateSpace>(
  bounds: Rect<Space>,
  kind: PerimeterKind,
): PerimeterGeometry<Space> {
  assertPerimeterKind('perimeterGeometry', 'kind', kind)
  assertValidRect('perimeterGeometry', 'bounds', bounds)
  return {
    kind,
    bounds: rect<Space>(bounds.x, bounds.y, bounds.width, bounds.height),
  }
}
