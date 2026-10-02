import {
  SegmentClassification,
  point,
  segment,
  type CoordinateSpace,
  type Point,
  type Segment,
  type Vector,
} from '../model'
import { approximatelyEqual, pointsApproximatelyEqual } from './numbers'
import { assertFiniteResult, assertValidPoint, assertValidSegment, assertValidVector } from './validation'

export function classifySegment<Space extends CoordinateSpace>(
  value: Segment<Space>,
): SegmentClassification {
  assertValidSegment('classifySegment', 'segment', value)
  if (pointsApproximatelyEqual(value.start, value.end)) return SegmentClassification.ZERO_LENGTH
  if (approximatelyEqual(value.start.y, value.end.y)) return SegmentClassification.HORIZONTAL
  if (approximatelyEqual(value.start.x, value.end.x)) return SegmentClassification.VERTICAL
  return SegmentClassification.DIAGONAL
}

export function isOrthogonalSegment<Space extends CoordinateSpace>(value: Segment<Space>): boolean {
  const classification = classifySegment(value)
  return (
    classification === SegmentClassification.HORIZONTAL ||
    classification === SegmentClassification.VERTICAL
  )
}

export function manhattanDistance<Space extends CoordinateSpace>(
  left: Point<Space>,
  right: Point<Space>,
): number {
  assertValidPoint('manhattanDistance', 'left', left)
  assertValidPoint('manhattanDistance', 'right', right)
  const result = Math.abs(left.x - right.x) + Math.abs(left.y - right.y)
  return assertFiniteResult('manhattanDistance', 'result', result)
}

export function translatePoint<Space extends CoordinateSpace>(
  value: Point<Space>,
  delta: Vector<NoInfer<Space>>,
): Point<Space> {
  assertValidPoint('translatePoint', 'point', value)
  assertValidVector('translatePoint', 'delta', delta)
  const x = assertFiniteResult('translatePoint', 'result.x', value.x + delta.x)
  const y = assertFiniteResult('translatePoint', 'result.y', value.y + delta.y)
  return point<Space>(x, y)
}

export function translateSegment<Space extends CoordinateSpace>(
  value: Segment<Space>,
  delta: Vector<NoInfer<Space>>,
): Segment<Space> {
  assertValidSegment('translateSegment', 'segment', value)
  assertValidVector('translateSegment', 'delta', delta)
  return segment(translatePoint(value.start, delta), translatePoint(value.end, delta))
}
