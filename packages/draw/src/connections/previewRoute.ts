import { normalizeRoute } from '../geometry/normalizeRoute'
import { validateManhattanRoute } from '../geometry/validateManhattanRoute'
import { routeManhattan } from '../routing/manhattanRoute'
import type { Point, Rect, ResolvedAttachment } from '../routing/floatingAttachment'

export type PreviewRouteResult = {
  points: Point[]
  valid: boolean
  escapedSource: Point
}

/** Builds a free-target preview without allowing the route to re-enter its source body. */
export function previewFloatingRoute(
  sourceRect: Rect,
  source: ResolvedAttachment,
  pointer: Point,
  clearance = 12,
  _obstacles: Rect[] = [],
): PreviewRouteResult {
  const escapedSource = {
    x: source.point.x + source.outwardNormal.x * clearance,
    y: source.point.y + source.outwardNormal.y * clearance,
  }
  const extraObstacles: Rect[] = [] // Unrelated objects never constrain the preview.
  const directTail = routeManhattan(escapedSource, pointer, extraObstacles)
  const candidates = [
    directTail,
    routeManhattan(escapedSource, pointer, [...extraObstacles, sourceRect]),
    normalizeRoute([
      escapedSource,
      { x: escapedSource.x, y: sourceRect.y - clearance },
      { x: pointer.x, y: sourceRect.y - clearance },
      pointer,
    ]),
    normalizeRoute([
      escapedSource,
      { x: escapedSource.x, y: sourceRect.y + sourceRect.height + clearance },
      { x: pointer.x, y: sourceRect.y + sourceRect.height + clearance },
      pointer,
    ]),
  ]
  const candidate =
    candidates.find(
      (tail) =>
        validateManhattanRoute(
          normalizeRoute([source.point, escapedSource, ...tail.slice(1)]),
          1e-6,
          [sourceRect],
          { sourceDirection: source.outwardNormal },
        ).valid,
    ) ?? candidates[0]
  const points = normalizeRoute([source.point, escapedSource, ...candidate.slice(1)])
  const result = validateManhattanRoute(points, 1e-6, [sourceRect], {
    sourceDirection: source.outwardNormal,
  })
  return { points, valid: result.valid, escapedSource }
}
