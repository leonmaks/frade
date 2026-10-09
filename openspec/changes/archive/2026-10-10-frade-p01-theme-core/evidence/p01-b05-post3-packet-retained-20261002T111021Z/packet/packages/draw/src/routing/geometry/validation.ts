import {
  assertFiniteNumber,
  assertNonNegativeNumber,
  type CoordinateSpace,
  type Point,
  type Rect,
  type Segment,
  type Vector,
} from '../model'

export function assertValidPoint<Space extends CoordinateSpace>(
  operation: string,
  field: string,
  value: Point<Space>,
): void {
  assertFiniteNumber(operation, `${field}.x`, value.x)
  assertFiniteNumber(operation, `${field}.y`, value.y)
}

export function assertValidVector<Space extends CoordinateSpace>(
  operation: string,
  field: string,
  value: Vector<Space>,
): void {
  assertFiniteNumber(operation, `${field}.x`, value.x)
  assertFiniteNumber(operation, `${field}.y`, value.y)
}

export function assertValidRect<Space extends CoordinateSpace>(
  operation: string,
  field: string,
  value: Rect<Space>,
): void {
  assertFiniteNumber(operation, `${field}.x`, value.x)
  assertFiniteNumber(operation, `${field}.y`, value.y)
  assertNonNegativeNumber(operation, `${field}.width`, value.width)
  assertNonNegativeNumber(operation, `${field}.height`, value.height)
}

export function assertValidSegment<Space extends CoordinateSpace>(
  operation: string,
  field: string,
  value: Segment<Space>,
): void {
  assertValidPoint(operation, `${field}.start`, value.start)
  assertValidPoint(operation, `${field}.end`, value.end)
}

export function assertFiniteResult(operation: string, field: string, value: number): number {
  assertFiniteNumber(operation, field, value)
  return value
}
