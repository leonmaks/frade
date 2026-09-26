import { describe, expect, it } from 'vitest'
import { createRouteSnapshot } from '../../src/geometry/routeSnapshot'
describe('route snapshot', () =>
  it('normalizes X6 points and derives logical segments', () => {
    const snapshot = createRouteSnapshot('e', { x: 0, y: 0 }, { x: 20, y: 20 }, [
      { x: 10, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ])
    expect(snapshot.points).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
    ])
    expect(snapshot.segments).toHaveLength(2)
  }))
