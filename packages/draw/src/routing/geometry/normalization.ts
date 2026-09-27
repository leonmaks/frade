import { SegmentClassification, segment, type CoordinateSpace, type Point } from '../model'
import { EPSILON, pointsApproximatelyEqual } from './numbers'
import { classifySegment } from './segments'
import { assertValidPoint } from './validation'

function validateSequence<Space extends CoordinateSpace>(
  points: readonly Point<Space>[],
  operation: string,
): void {
  points.forEach((value, index) => assertValidPoint(operation, `[${index}]`, value))
}

export function removeAdjacentDuplicatePoints<Space extends CoordinateSpace>(
  points: readonly Point<Space>[],
): Point<Space>[] {
  validateSequence(points, 'removeAdjacentDuplicatePoints')
  const result: Point<Space>[] = []
  for (const value of points) {
    const previous = result.at(-1)
    if (!previous || !pointsApproximatelyEqual(previous, value)) result.push(value)
  }
  return result
}

function between(value: number, first: number, second: number): boolean {
  return value >= Math.min(first, second) - EPSILON && value <= Math.max(first, second) + EPSILON
}

function redundantBetween<Space extends CoordinateSpace>(
  first: Point<Space>,
  middle: Point<Space>,
  last: Point<Space>,
): boolean {
  const firstLeg = classifySegment(segment(first, middle))
  const secondLeg = classifySegment(segment(middle, last))
  const survivor = classifySegment(segment(first, last))
  if (
    firstLeg === SegmentClassification.HORIZONTAL &&
    secondLeg === SegmentClassification.HORIZONTAL &&
    survivor === SegmentClassification.HORIZONTAL
  ) {
    return between(middle.x, first.x, last.x)
  }
  if (
    firstLeg === SegmentClassification.VERTICAL &&
    secondLeg === SegmentClassification.VERTICAL &&
    survivor === SegmentClassification.VERTICAL
  ) {
    return between(middle.y, first.y, last.y)
  }
  return false
}

export function removeCollinearPoints<Space extends CoordinateSpace>(
  points: readonly Point<Space>[],
): Point<Space>[] {
  validateSequence(points, 'removeCollinearPoints')
  const result: Point<Space>[] = []
  for (const value of points) {
    result.push(value)
    while (result.length >= 3) {
      const last = result[result.length - 1]
      const middle = result[result.length - 2]
      const first = result[result.length - 3]
      if (!redundantBetween(first, middle, last)) break
      result.splice(result.length - 2, 1)
    }
  }
  return result
}

export function normalizePointSequence<Space extends CoordinateSpace>(
  points: readonly Point<Space>[],
): Point<Space>[] {
  validateSequence(points, 'normalizePointSequence')
  let current = [...points]
  while (true) {
    const reduced = removeAdjacentDuplicatePoints(removeCollinearPoints(removeAdjacentDuplicatePoints(current)))
    if (reduced.length === current.length) return reduced
    current = reduced
  }
}
