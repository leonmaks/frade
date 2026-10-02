import type { Point, Rect } from '../routing/floatingAttachment'
export type RouteIssue =
  | 'TOO_SHORT'
  | 'NON_MANHATTAN_SEGMENT'
  | 'IMMEDIATE_REVERSAL'
  | 'SELF_INTERSECTION'
  | 'SEGMENT_OVERLAP'
  | 'OBSTACLE_INTERSECTION'
  | 'SOURCE_REVERSE_EXIT'
  | 'TARGET_REVERSE_ENTRY'
export type RouteValidationContext = { sourceDirection?: Point; targetDirection?: Point }
export function validateManhattanRoute(
  points: Point[],
  epsilon = 1e-6,
  obstacles: Rect[] = [],
  context: RouteValidationContext = {},
): { valid: boolean; issues: RouteIssue[] } {
  const issues: RouteIssue[] = []
  if (points.length < 2) issues.push('TOO_SHORT')
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i]
    if (Math.abs(a.x - b.x) > epsilon && Math.abs(a.y - b.y) > epsilon)
      issues.push('NON_MANHATTAN_SEGMENT')
  }
  for (let i = 2; i < points.length; i++) {
    const a = points[i - 2],
      b = points[i - 1],
      c = points[i]
    if (
      (a.x === b.x && b.x === c.x && (b.y - a.y) * (c.y - b.y) < 0) ||
      (a.y === b.y && b.y === c.y && (b.x - a.x) * (c.x - b.x) < 0)
    )
      issues.push('IMMEDIATE_REVERSAL')
  }
  const segments = points.slice(1).map((end, i) => ({ start: points[i], end }))
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 2; j < segments.length; j++) {
      const kind = intersectionKind(segments[i], segments[j], epsilon)
      if (kind === 'overlap') issues.push('SEGMENT_OVERLAP')
      else if (kind === 'cross') issues.push('SELF_INTERSECTION')
    }
  }
  for (const segment of segments)
    for (const obstacle of obstacles)
      if (segmentHitsRect(segment.start, segment.end, obstacle, epsilon))
        issues.push('OBSTACLE_INTERSECTION')
  if (
    context.sourceDirection &&
    segments[0] &&
    !sameDirection(direction(segments[0].start, segments[0].end), context.sourceDirection)
  )
    issues.push('SOURCE_REVERSE_EXIT')
  if (
    context.targetDirection &&
    segments.at(-1) &&
    !sameDirection(direction(segments.at(-1)!.start, segments.at(-1)!.end), {
      x: -context.targetDirection.x,
      y: -context.targetDirection.y,
    })
  )
    issues.push('TARGET_REVERSE_ENTRY')
  return { valid: issues.length === 0, issues }
}
function intersectionKind(
  a: { start: Point; end: Point },
  b: { start: Point; end: Point },
  e: number,
): 'none' | 'cross' | 'overlap' {
  const ah = Math.abs(a.start.y - a.end.y) <= e,
    bh = Math.abs(b.start.y - b.end.y) <= e
  if (ah && bh)
    return Math.abs(a.start.y - b.start.y) <= e &&
      overlapLength(a.start.x, a.end.x, b.start.x, b.end.x, e) > e
      ? 'overlap'
      : 'none'
  if (!ah && !bh)
    return Math.abs(a.start.x - b.start.x) <= e &&
      overlapLength(a.start.y, a.end.y, b.start.y, b.end.y, e) > e
      ? 'overlap'
      : 'none'
  return ah
    ? between(b.start.x, a.start.x, a.end.x, e) && between(a.start.y, b.start.y, b.end.y, e)
      ? 'cross'
      : 'none'
    : between(a.start.x, b.start.x, b.end.x, e) && between(b.start.y, a.start.y, a.end.y, e)
      ? 'cross'
      : 'none'
}
const between = (v: number, a: number, b: number, e: number) =>
  v >= Math.min(a, b) - e && v <= Math.max(a, b) + e
const overlap = (a: number, b: number, c: number, d: number, e: number) =>
  Math.max(Math.min(a, b), Math.min(c, d)) <= Math.min(Math.max(a, b), Math.max(c, d)) + e
const overlapLength = (a: number, b: number, c: number, d: number, _e: number) =>
  Math.min(Math.max(a, b), Math.max(c, d)) - Math.max(Math.min(a, b), Math.min(c, d))
const direction = (a: Point, b: Point) => ({ x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) })
const sameDirection = (a: Point, b: Point) => a.x === b.x && a.y === b.y
function segmentHitsRect(a: Point, b: Point, rect: Rect, e: number) {
  const horizontal = Math.abs(a.y - b.y) <= e
  if (horizontal) {
    if (!(
      a.y > rect.y + e &&
      a.y < rect.y + rect.height - e &&
      overlap(a.x, b.x, rect.x, rect.x + rect.width, e)
    ))
      return false
    const startsAtBoundary =
      Math.abs(a.x - rect.x) <= e || Math.abs(a.x - (rect.x + rect.width)) <= e
    const exitsOutward =
      (Math.abs(a.x - rect.x) <= e && b.x < a.x - e) ||
      (Math.abs(a.x - (rect.x + rect.width)) <= e && b.x > a.x + e)
    return !(startsAtBoundary && exitsOutward)
  }
  if (!(
    a.x > rect.x + e &&
    a.x < rect.x + rect.width - e &&
    overlap(a.y, b.y, rect.y, rect.y + rect.height, e)
  ))
    return false
  const startsAtBoundary =
    Math.abs(a.y - rect.y) <= e || Math.abs(a.y - (rect.y + rect.height)) <= e
  const exitsOutward =
    (Math.abs(a.y - rect.y) <= e && b.y < a.y - e) ||
    (Math.abs(a.y - (rect.y + rect.height)) <= e && b.y > a.y + e)
  return !(startsAtBoundary && exitsOutward)
}
