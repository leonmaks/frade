import type { Point } from '../routing/floatingAttachment'
import { normalizeRoute } from './normalizeRoute'
export type RouteSnapshot = {
  edgeId: string
  source: Point
  target: Point
  points: Point[]
  segments: Array<{ x1: number; y1: number; x2: number; y2: number }>
}
export function createRouteSnapshot(
  edgeId: string,
  source: Point,
  target: Point,
  routePoints: Point[],
): RouteSnapshot {
  const points = normalizeRoute([source, ...routePoints, target])
  return {
    edgeId,
    source: points[0],
    target: points[points.length - 1],
    points,
    segments: points.slice(1).map((point, index) => ({
      x1: points[index].x,
      y1: points[index].y,
      x2: point.x,
      y2: point.y,
    })),
  }
}
