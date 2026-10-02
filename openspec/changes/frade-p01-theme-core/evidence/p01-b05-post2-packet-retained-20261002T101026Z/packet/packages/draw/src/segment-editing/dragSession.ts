import type { Point } from '../routing/floatingAttachment'
import type { RoutedSegment } from './segments'
export type DragSession = {
  edgeId: string
  segmentIndex: number
  orientation: RoutedSegment['orientation']
  originalRoute: Point[]
  startPointer: Point
  requestedCoordinate: number
  lastValidRoute: Point[]
}
export function beginDrag(
  edgeId: string,
  segment: RoutedSegment,
  route: Point[],
  pointer: Point,
): DragSession {
  return {
    edgeId,
    segmentIndex: segment.index,
    orientation: segment.orientation,
    originalRoute: route.map((point) => ({ ...point })),
    startPointer: { ...pointer },
    requestedCoordinate: segment.orientation === 'horizontal' ? segment.start.y : segment.start.x,
    lastValidRoute: route.map((point) => ({ ...point })),
  }
}
export function requestCoordinate(session: DragSession, pointer: Point, scale = 1, snap = 0) {
  const delta =
    session.orientation === 'horizontal'
      ? (pointer.y - session.startPointer.y) / scale
      : (pointer.x - session.startPointer.x) / scale
  const raw =
    (session.orientation === 'horizontal' ? session.startPointer.y : session.startPointer.x) + delta
  return snap > 0 ? Math.round(raw / snap) * snap : raw
}
export function translateSegment(session: DragSession, coordinate: number): Point[] {
  const route = session.originalRoute.map((point) => ({ ...point }))
  const start = route[session.segmentIndex],
    end = route[session.segmentIndex + 1]
  if (session.orientation === 'horizontal') {
    start.y = coordinate
    end.y = coordinate
  } else {
    start.x = coordinate
    end.x = coordinate
  }
  return route
}
