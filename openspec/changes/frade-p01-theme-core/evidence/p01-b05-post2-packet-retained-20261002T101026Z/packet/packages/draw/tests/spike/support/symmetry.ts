import type { Point, Rect } from '../../../src/routing/floatingAttachment'

// The same interaction is reflected, transposed and edge-reversed. Node IDs
// retain their meaning: swapping edge direction must not swap user intent.
export const symmetries = [false, true].flatMap((swap) =>
  [false, true].flatMap((mx) =>
    [false, true].map((my) => ({
      id: `${swap ? 'transpose' : 'horizontal'}-x${Number(mx)}-y${Number(my)}`,
      point: (p: Point): Point => {
        const q = { x: mx ? 800 - p.x : p.x, y: my ? 800 - p.y : p.y }
        return swap ? { x: q.y, y: q.x } : q
      },
      inverse: (p: Point): Point => {
        const q = swap ? { x: p.y, y: p.x } : p
        return { x: mx ? 800 - q.x : q.x, y: my ? 800 - q.y : q.y }
      },
    })),
  ),
)
export type Symmetry = (typeof symmetries)[number]
export function transformRect(rect: Rect, transform: (p: Point) => Point): Rect {
  const a = transform(rect),
    b = transform({ x: rect.x + rect.width, y: rect.y + rect.height })
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  }
}
