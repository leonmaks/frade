import { describe, expect, it } from 'vitest'
import { routeManhattan } from '../../src/routing/manhattanRoute'
import { validateManhattanRoute } from '../../src/geometry/validateManhattanRoute'
describe('constrained Manhattan route', () => {
  it('keeps a same-level connection straight', () =>
    expect(routeManhattan({ x: 0, y: 10 }, { x: 100, y: 10 })).toEqual([
      { x: 0, y: 10 },
      { x: 100, y: 10 },
    ]))
  it('chooses an orthogonal L route', () =>
    expect(routeManhattan({ x: 0, y: 0 }, { x: 100, y: 100 })).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]))
  it('chooses the alternate corridor when a bend is blocked', () =>
    expect(
      routeManhattan({ x: 0, y: 0 }, { x: 100, y: 100 }, [
        { x: 90, y: -10, width: 30, height: 30 },
      ]),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ]))
  it('routes around an obstacle body', () => {
    const obstacle = { x: 40, y: -20, width: 20, height: 40 }
    const route = routeManhattan({ x: 0, y: 0 }, { x: 100, y: 0 }, [obstacle])
    expect(validateManhattanRoute(route, 1e-6, [obstacle]).valid).toBe(true)
  })
})
