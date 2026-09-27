import { type CoordinateSpace, type Rect } from '../../model'
import {
  EPSILON,
  assertFiniteResult,
  assertValidRect,
  rectEdges,
  horizontalSeparation,
  verticalSeparation,
} from '../../geometry'
import type { Quadrant, RelativeGeometry } from './contracts'

export function zeroBand(value: number): number {
  return Math.abs(value) <= EPSILON ? 0 : value
}
export function copyBounds<S extends CoordinateSpace>(
  operation: string,
  field: string,
  value: Rect<S>,
): Rect<S> {
  if (value === null || typeof value !== 'object')
    throw new TypeError(operation + ': ' + field + ' must be a rectangle')
  assertValidRect(operation, field, value)
  return Object.freeze({ x: value.x, y: value.y, width: value.width, height: value.height })
}
export function classifyRelativeGeometry<S extends CoordinateSpace>(
  source: Rect<S>,
  target: Rect<NoInfer<S>>,
): RelativeGeometry {
  const operation = 'classifyRelativeGeometry'
  const a = copyBounds(operation, 'source', source)
  const b = copyBounds(operation, 'target', target)
  const ae = rectEdges(a)
  const be = rectEdges(b)
  const finite = (field: string, value: number) => assertFiniteResult(operation, field, value)
  const ax = finite('source.center.x', a.x + a.width / 2)
  const ay = finite('source.center.y', a.y + a.height / 2)
  const bx = finite('target.center.x', b.x + b.width / 2)
  const by = finite('target.center.y', b.y + b.height / 2)
  const dx = zeroBand(finite('result.centerDifference.x', ax - bx))
  const dy = zeroBand(finite('result.centerDifference.y', ay - by))
  const quadrant: Quadrant = dx < 0 ? (dy < 0 ? 2 : 1) : dy <= 0 ? (dx !== 0 ? 3 : 2) : 0
  const positiveZero = (value: number) => (value === 0 ? 0 : value)
  const signedGaps = Object.freeze({
    west: positiveZero(finite('result.gap.west', ae.left - be.right)),
    north: positiveZero(finite('result.gap.north', ae.top - be.bottom)),
    east: positiveZero(finite('result.gap.east', be.left - ae.right)),
    south: positiveZero(finite('result.gap.south', be.top - ae.bottom)),
  })
  const policyGaps = Object.freeze({
    west: zeroBand(signedGaps.west),
    north: zeroBand(signedGaps.north),
    east: zeroBand(signedGaps.east),
    south: zeroBand(signedGaps.south),
  })
  const separation = Object.freeze({
    horizontal: horizontalSeparation(a, b),
    vertical: verticalSeparation(a, b),
  })
  const overlaps = Object.freeze({
    horizontal: separation.horizontal === 0,
    vertical: separation.vertical === 0,
  })
  return Object.freeze({ quadrant, signedGaps, policyGaps, separation, overlaps })
}
