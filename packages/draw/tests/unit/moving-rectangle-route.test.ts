import { expect, it } from 'vitest'
import { movingRectangleRoute } from '../../src/routing/movingRectangleRoute'
import { validateManhattanRoute } from '../../src/geometry/validateManhattanRoute'

for (const radius of [180, 260])
  for (const reverse of [false, true])
    it(`reroutes every orbital angle radius=${radius} reversed=${reverse}`, () => {
      const a = { x: 380, y: 380, width: 150, height: 72 }
      for (let degrees = 0; degrees < 360; degrees += 5) {
        const angle = (degrees * Math.PI) / 180
        const b = {
          ...a,
          x: Math.round(a.x + radius * Math.cos(angle)),
          y: Math.round(a.y + radius * Math.sin(angle)),
        }
        const route = reverse ? movingRectangleRoute(b, a) : movingRectangleRoute(a, b)
        expect(route, `angle ${degrees}`).toBeDefined()
        const obstacles = [a, b].map((r) => ({
          ...r,
          x: r.x + 0.00001,
          y: r.y + 0.00001,
          width: r.width - 0.00002,
          height: r.height - 0.00002,
        }))
        expect(
          validateManhattanRoute(route!.points, 1e-6, obstacles, {
            sourceDirection: route!.source.outwardNormal,
            targetDirection: route!.target.outwardNormal,
          }).valid,
        ).toBe(true)
        if (degrees % 90 === 0) expect(route!.points).toHaveLength(2)
        const opposite = reverse ? movingRectangleRoute(a, b) : movingRectangleRoute(b, a)
        expect(route!.points).toEqual(opposite!.points.slice().reverse())
      }
    })
