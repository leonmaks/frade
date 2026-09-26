import type { Point, Rect } from '../routing/floatingAttachment'
import { normalizeRoute } from '../geometry/normalizeRoute'
import { validateManhattanRoute } from '../geometry/validateManhattanRoute'

export interface SegmentRouteRequest {
  points: Point[]
  index: number
  coordinate: number
  source: Rect
  target: Rect
  /** @deprecated Unrelated figures never constrain diagram routing. Kept for API compatibility. */
  obstacles?: Rect[]
}

/** Local X runs along the segment; local Y follows pointer motion.
 * Node IDs, edge direction and screen quadrants do not affect this policy. */
export function resolveSegmentDrag(request: SegmentRouteRequest): Point[] | undefined {
  const { points, index, coordinate } = request
  const a = points[index],
    b = points[index + 1]
  if (!a || !b) return undefined
  const vertical = Math.abs(a.x - b.x) < 1e-6
  const convert = (p: Point): Point => (vertical ? { x: p.y, y: p.x } : { ...p })
  const rect = (r: Rect): Rect =>
    vertical ? { x: r.y, y: r.x, width: r.height, height: r.width } : r
  const route = points.map(convert),
    source = rect(request.source),
    target = rect(request.target)
  // An internal corridor constrains the whole floating route, not the old
  // router-generated bends between that corridor and the terminal figures.
  const internal = index > 0 && index < points.length - 2
  const sourceEditable = index <= 1 || internal
  const targetEditable = index >= points.length - 3 || internal
  const attach = (r: Rect, toward: number): Point =>
    coordinate < r.y
      ? { x: r.x + r.width / 2, y: r.y }
      : coordinate > r.y + r.height
        ? { x: r.x + r.width / 2, y: r.y + r.height }
        : { x: toward < r.x + r.width / 2 ? r.x : r.x + r.width, y: coordinate }
  const sourcePoint = attach(
    source,
    targetEditable ? target.x + target.width / 2 : route[index + 1].x,
  )
  const targetPoint = attach(target, sourceEditable ? source.x + source.width / 2 : route[index].x)
  const prefix = sourceEditable
    ? [sourcePoint, { x: sourcePoint.x, y: coordinate }]
    : [...route.slice(0, index), { x: route[index].x, y: coordinate }]
  const suffix = targetEditable
    ? [{ x: targetPoint.x, y: coordinate }, targetPoint]
    : [{ x: route[index + 1].x, y: coordinate }, ...route.slice(index + 2)]
  const obstacles = [request.source, request.target].map((r) => ({
    x: r.x + 1e-5,
    y: r.y + 1e-5,
    width: r.width - 2e-5,
    height: r.height - 2e-5,
  }))
  const validate = (candidate: Point[]) => {
    const world = candidate
      .map(convert)
      .filter((p, i, all) => !i || Math.hypot(p.x - all[i - 1].x, p.y - all[i - 1].y) > 1e-6)
    // Validate before normalization: never hide 180-degree reversals by
    // deleting collinear points. Only valid geometry can be simplified.
    if (!validateManhattanRoute(world, 1e-6, obstacles).valid) return undefined
    return normalizeRoute(world)
  }
  const sweeps = (r: Rect, from: number, to: number, initial: number) => {
    const spans = Math.min(from, to) <= r.x && Math.max(from, to) >= r.x + r.width
    const reached =
      initial < r.y
        ? coordinate >= r.y
        : initial > r.y + r.height
          ? coordinate <= r.y + r.height
          : coordinate >= r.y && coordinate <= r.y + r.height
    return spans && reached
  }
  const releaseOther =
    (sourceEditable &&
      !targetEditable &&
      sweeps(target, sourcePoint.x, route[index + 1].x, route[index].y)) ||
    (targetEditable &&
      !sourceEditable &&
      sweeps(source, targetPoint.x, route[index].x, route[index + 1].y))
  const local = releaseOther ? undefined : validate([...prefix, ...suffix])
  if (local) return local
  // A corridor crossing the other figure must release its old floating end.
  const start = attach(source, target.x + target.width / 2)
  const end = attach(target, source.x + source.width / 2)
  return validate([start, { x: start.x, y: coordinate }, { x: end.x, y: coordinate }, end])
}
