import { assertFiniteNumber, type CoordinateSpace, type Point } from '../model'
import { assertValidPoint } from './validation'

export const EPSILON = 1e-6
export const ROUTE_PRECISION = 0.1

export function approximatelyEqual(left: number, right: number): boolean {
  assertFiniteNumber('approximatelyEqual', 'left', left)
  assertFiniteNumber('approximatelyEqual', 'right', right)
  return left === right || Math.abs(left - right) <= EPSILON
}

export function pointsApproximatelyEqual<Space extends CoordinateSpace>(
  left: Point<Space>,
  right: Point<Space>,
): boolean {
  assertValidPoint('pointsApproximatelyEqual', 'left', left)
  assertValidPoint('pointsApproximatelyEqual', 'right', right)
  return approximatelyEqual(left.x, right.x) && approximatelyEqual(left.y, right.y)
}

export function quantizeCoordinate(value: number): number {
  assertFiniteNumber('quantizeCoordinate', 'value', value)
  const magnitude = Math.abs(value) * (1 / ROUTE_PRECISION)
  assertFiniteNumber('quantizeCoordinate', 'scaled value', magnitude)
  const lower = Math.floor(magnitude)
  const fraction = magnitude - lower
  const roundedMagnitude = fraction >= 0.5 ? lower + 1 : lower
  const result = (Math.sign(value) * roundedMagnitude) / (1 / ROUTE_PRECISION)
  assertFiniteNumber('quantizeCoordinate', 'result', result)
  return result === 0 ? 0 : result
}
