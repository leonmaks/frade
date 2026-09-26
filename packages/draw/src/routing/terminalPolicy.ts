import type { Point, ResolvedAttachment } from './floatingAttachment'
export function direction(from: Point, to: Point): Point | null {
  const dx = to.x - from.x,
    dy = to.y - from.y
  if (dx !== 0 && dy !== 0) return null
  if (dx > 0) return { x: 1, y: 0 }
  if (dx < 0) return { x: -1, y: 0 }
  if (dy > 0) return { x: 0, y: 1 }
  if (dy < 0) return { x: 0, y: -1 }
  return null
}
export function hasValidTerminalDirections(
  points: Point[],
  source: ResolvedAttachment,
  target: ResolvedAttachment,
) {
  if (points.length < 2) return false
  const first = direction(points[0], points[1])
  const last = direction(points[points.length - 2], points[points.length - 1])
  return (
    equal(first, source.outwardNormal) &&
    equal(last, { x: -target.outwardNormal.x, y: -target.outwardNormal.y })
  )
}
const equal = (a: Point | null, b: Point) => !!a && a.x === b.x && a.y === b.y
