import type { Point, Rect, ResolvedAttachment } from './floatingAttachment'
import type { FloatingRoute } from './floatingRoute'
import { resolveSegmentDrag } from '../segment-editing/resolveSegmentDrag'

/** Re-resolve both floating terminals when node geometry changes. A node move
 * releases obsolete side choices; an old absolute anchor is never reused. */
export function movingRectangleRoute(
  source: Rect,
  target: Rect,
  obstacles: Rect[] = [],
): FloatingRoute | undefined {
  const s = { x: source.x + source.width / 2, y: source.y + source.height / 2 }
  const t = { x: target.x + target.width / 2, y: target.y + target.height / 2 }
  const horizontal = Math.abs(t.x - s.x) >= Math.abs(t.y - s.y)
  const coordinate = horizontal ? (s.x + t.x) / 2 : (s.y + t.y) / 2
  const seed = horizontal
    ? [s, { x: coordinate, y: s.y }, { x: coordinate, y: t.y }, t]
    : [s, { x: s.x, y: coordinate }, { x: t.x, y: coordinate }, t]
  const aligned = s.x === t.x || s.y === t.y
  const points = resolveSegmentDrag({
    source,
    target,
    points: aligned ? [s, t] : seed,
    index: aligned ? 0 : 1,
    coordinate: aligned ? (s.x === t.x ? s.x : s.y) : coordinate,
    obstacles,
  })
  if (!points) return undefined
  const attachment = (point: Point, outside: Point): ResolvedAttachment => {
    const outwardNormal = { x: Math.sign(outside.x - point.x), y: Math.sign(outside.y - point.y) }
    const side =
      outwardNormal.x < 0
        ? 'left'
        : outwardNormal.x > 0
          ? 'right'
          : outwardNormal.y < 0
            ? 'top'
            : 'bottom'
    return { point, outwardNormal, side }
  }
  return {
    points,
    source: attachment(points[0], points[1]),
    target: attachment(points.at(-1)!, points.at(-2)!),
    usedDetour: points.length > 2,
    valid: true,
    diagnostics: [],
  }
}
