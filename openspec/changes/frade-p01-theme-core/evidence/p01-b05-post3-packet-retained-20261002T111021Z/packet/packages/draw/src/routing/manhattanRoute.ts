import type { Point, Rect } from './floatingAttachment'
import { normalizeRoute } from '../geometry/normalizeRoute'
export function routeManhattan(source: Point, target: Point, obstacles: Rect[] = []): Point[] {
  const candidates: Point[][] = [
    [source, target],
    [source, { x: target.x, y: source.y }, target],
    [source, { x: source.x, y: target.y }, target],
  ]
  for (const obstacle of obstacles) {
    const padding = 8
    const top = obstacle.y - padding
    const bottom = obstacle.y + obstacle.height + padding
    candidates.push(
      [source, { x: source.x, y: top }, { x: target.x, y: top }, target],
      [source, { x: source.x, y: bottom }, { x: target.x, y: bottom }, target],
      [
        source,
        { x: obstacle.x - padding, y: source.y },
        { x: obstacle.x - padding, y: target.y },
        target,
      ],
      [
        source,
        { x: obstacle.x + obstacle.width + padding, y: source.y },
        { x: obstacle.x + obstacle.width + padding, y: target.y },
        target,
      ],
    )
  }
  const valid = candidates
    .map(normalizeRoute)
    .filter(
      (route) =>
        route.every(
          (point, index) =>
            index === 0 || point.x === route[index - 1].x || point.y === route[index - 1].y,
        ) &&
        route.every(
          (point, index) =>
            index === 0 ||
            index === route.length - 1 ||
            !obstacles.some((obstacle) => pointInside(point, obstacle)),
        ) &&
        route.every(
          (point, index) => index === 0 || !segmentHitsObstacle(route[index - 1], point, obstacles),
        ),
    )
  return (
    valid.sort((a, b) => routeLength(a) - routeLength(b))[0] ?? normalizeRoute([source, target])
  )
}
const pointInside = (point: Point, obstacle: Rect) =>
  point.x > obstacle.x &&
  point.x < obstacle.x + obstacle.width &&
  point.y > obstacle.y &&
  point.y < obstacle.y + obstacle.height
const segmentHitsObstacle = (a: Point, b: Point, obstacles: Rect[]) =>
  obstacles.some((obstacle) => {
    const horizontal = Math.abs(a.y - b.y) < 1e-6
    return horizontal
      ? a.y > obstacle.y &&
          a.y < obstacle.y + obstacle.height &&
          Math.max(Math.min(a.x, b.x), obstacle.x) <
            Math.min(Math.max(a.x, b.x), obstacle.x + obstacle.width)
      : a.x > obstacle.x &&
          a.x < obstacle.x + obstacle.width &&
          Math.max(Math.min(a.y, b.y), obstacle.y) <
            Math.min(Math.max(a.y, b.y), obstacle.y + obstacle.height)
  })
const routeLength = (route: Point[]) =>
  route
    .slice(1)
    .reduce(
      (sum, point, index) =>
        sum + Math.abs(point.x - route[index].x) + Math.abs(point.y - route[index].y),
      0,
    )
