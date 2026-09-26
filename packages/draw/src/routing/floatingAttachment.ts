export type Point = { x: number; y: number }
export type Rect = { x: number; y: number; width: number; height: number }
export type Side = 'left' | 'right' | 'top' | 'bottom'
export type ResolvedAttachment = { point: Point; side: Side; outwardNormal: Point }
const normals: Record<Side, Point> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
}
export function resolveFloatingAttachment(
  rect: Rect,
  toward: Point,
  previous?: Side,
  hysteresis = 8,
): ResolvedAttachment {
  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
  const dx = toward.x - center.x,
    dy = toward.y - center.y
  const horizontal = Math.abs(dx / rect.width) >= Math.abs(dy / rect.height)
  const candidate: Side = horizontal ? (dx >= 0 ? 'right' : 'left') : dy >= 0 ? 'bottom' : 'top'
  const side =
    previous &&
    previous !== candidate &&
    Math.abs(Math.abs(dx / rect.width) - Math.abs(dy / rect.height)) *
      Math.max(rect.width, rect.height) <
      hysteresis
      ? previous
      : candidate
  const point =
    side === 'left'
      ? { x: rect.x, y: clamp(toward.y, rect.y, rect.y + rect.height) }
      : side === 'right'
        ? { x: rect.x + rect.width, y: clamp(toward.y, rect.y, rect.y + rect.height) }
        : side === 'top'
          ? { x: clamp(toward.x, rect.x, rect.x + rect.width), y: rect.y }
          : { x: clamp(toward.x, rect.x, rect.x + rect.width), y: rect.y + rect.height }
  return { point, side, outwardNormal: normals[side] }
}
export function resolveTargetAttachment(
  rect: Rect,
  from: Point,
  previous?: Side,
  hysteresis = 8,
): ResolvedAttachment {
  return resolveFloatingAttachment(rect, from, previous, hysteresis)
}
export function resolveFixedAttachment(rect: Rect, side: Side, offset: number): ResolvedAttachment {
  const point =
    side === 'left'
      ? { x: rect.x, y: clamp(offset, rect.y, rect.y + rect.height) }
      : side === 'right'
        ? { x: rect.x + rect.width, y: clamp(offset, rect.y, rect.y + rect.height) }
        : side === 'top'
          ? { x: clamp(offset, rect.x, rect.x + rect.width), y: rect.y }
          : { x: clamp(offset, rect.x, rect.x + rect.width), y: rect.y + rect.height }
  return { point, side, outwardNormal: normals[side] }
}
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
