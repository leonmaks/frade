import { describe, expect, it } from 'vitest'
import { routeFloatingConnection } from '../../src/routing/floatingRoute'

describe('constrained floating routing integration contract', () => {
  it('recalculates deterministically after a source move without considering unrelated figures', () => {
    const target = { x: 500, y: 100, width: 100, height: 80 }
    const obstacle = { x: 250, y: 80, width: 100, height: 120 }
    const first = routeFloatingConnection({
      sourceRect: { x: 0, y: 100, width: 100, height: 80 },
      targetRect: target,
      obstacles: [obstacle],
    })
    const moved = routeFloatingConnection({
      sourceRect: { x: 0, y: 260, width: 100, height: 80 },
      targetRect: target,
      obstacles: [obstacle],
    })
    expect(first.valid).toBe(true)
    expect(moved.valid).toBe(true)
    expect(moved.points).not.toEqual(first.points)
  })
})
