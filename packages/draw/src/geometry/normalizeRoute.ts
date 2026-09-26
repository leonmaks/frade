import type { Point } from '../routing/floatingAttachment'
export function normalizeRoute(points: Point[], epsilon = 1e-6): Point[] {
  const finite = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
  const unique = finite.filter(
    (point, index) => index === 0 || !same(point, finite[index - 1], epsilon),
  )
  const result: Point[] = []
  for (const point of unique) {
    while (
      result.length > 1 &&
      collinear(result[result.length - 2], result[result.length - 1], point, epsilon)
    )
      result.pop()
    result.push({ ...point })
  }
  return result
}
const same = (a: Point, b: Point, epsilon: number) =>
  Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon
const collinear = (a: Point, b: Point, c: Point, epsilon: number) =>
  (Math.abs(a.x - b.x) <= epsilon && Math.abs(b.x - c.x) <= epsilon) ||
  (Math.abs(a.y - b.y) <= epsilon && Math.abs(b.y - c.y) <= epsilon)
