import type { Point } from '../routing/floatingAttachment'
import { normalizeRoute } from '../geometry/normalizeRoute'
export type RoutedSegment = {
  index: number
  start: Point
  end: Point
  orientation: 'horizontal' | 'vertical'
  length: number
}
export type SegmentHandle = {
  id: string
  segmentIndex: number
  position: Point
  cursor: 'ns-resize' | 'ew-resize'
}
export function extractSegments(points: Point[], epsilon = 1e-6): RoutedSegment[] {
  const route = normalizeRoute(points, epsilon)
  return route.slice(1).flatMap((end, index) => {
    const start = route[index],
      horizontal = Math.abs(start.y - end.y) <= epsilon,
      vertical = Math.abs(start.x - end.x) <= epsilon
    if (!horizontal && !vertical) return []
    return [
      {
        index,
        start,
        end,
        orientation: horizontal ? 'horizontal' : 'vertical',
        length: horizontal ? Math.abs(end.x - start.x) : Math.abs(end.y - start.y),
      },
    ]
  })
}
export function deriveHandles(
  edgeId: string,
  points: Point[],
  minimumLength = 40,
): SegmentHandle[] {
  return extractSegments(points)
    .filter((segment) => segment.length >= minimumLength)
    .map((segment) => ({
      id: `${edgeId}:${segment.index}`,
      segmentIndex: segment.index,
      position: {
        x: (segment.start.x + segment.end.x) / 2,
        y: (segment.start.y + segment.end.y) / 2,
      },
      cursor: segment.orientation === 'horizontal' ? 'ns-resize' : 'ew-resize',
    }))
}
