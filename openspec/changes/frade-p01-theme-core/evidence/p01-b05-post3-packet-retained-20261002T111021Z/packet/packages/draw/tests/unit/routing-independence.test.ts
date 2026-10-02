import { expect, it, vi } from 'vitest'
import type { Graph, Edge } from '@antv/x6'
import { rerouteFloatingEdge } from '../../src/routing/x6RoutingAdapter'
import { routeFloatingConnection } from '../../src/routing/floatingRoute'
import { movingRectangleRoute } from '../../src/routing/movingRectangleRoute'
import { resolveSegmentDrag } from '../../src/segment-editing/resolveSegmentDrag'
import { previewFloatingRoute } from '../../src/connections/previewRoute'
const source = { x: 80, y: 100, width: 120, height: 80 },
  target = { x: 500, y: 100, width: 120, height: 80 }
const obstacles = [{ x: 250, y: 0, width: 200, height: 600 }]
it('ignores unrelated shapes in initial routing, endpoint movement and free preview', () => {
  const request = { sourceRect: source, targetRect: target }
  expect(routeFloatingConnection({ ...request, obstacles })).toEqual(
    routeFloatingConnection(request),
  )
  expect(movingRectangleRoute(source, target, obstacles)).toEqual(
    movingRectangleRoute(source, target),
  )
  const attachment = {
    point: { x: 200, y: 140 },
    side: 'right' as const,
    outwardNormal: { x: 1, y: 0 },
  }
  expect(previewFloatingRoute(source, attachment, { x: 500, y: 140 }, 12, obstacles)).toEqual(
    previewFloatingRoute(source, attachment, { x: 500, y: 140 }),
  )
})
it('follows every requested coordinate through unrelated shapes in either edge direction', () => {
  for (const reverse of [false, true])
    for (let coordinate = 40; coordinate <= 300; coordinate += 2) {
      const points = [
        { x: 200, y: 140 },
        { x: 500, y: 140 },
      ]
      const request = {
        source: reverse ? target : source,
        target: reverse ? source : target,
        points: reverse ? points.reverse() : points,
        index: 0,
        coordinate,
      }
      const expected = resolveSegmentDrag(request)
      expect(expected).toBeDefined()
      expect(resolveSegmentDrag({ ...request, obstacles })).toEqual(expected)
    }
})

it('X6 integration never reads unrelated node bounds, including legacy router and fixed-port entry', () => {
  const nodes = {
    a: { shape: 'rect', isNode: () => true, getBBox: () => source },
    b: { shape: 'rect', isNode: () => true, getBBox: () => target },
  }
  const graph = {
    getCellById: (id: string) => nodes[id as keyof typeof nodes],
    getNodes: () => {
      throw Error('Must not scan unrelated figures')
    },
  }
  const edge = {
    getSource: () => ({ cell: 'a' }),
    getTarget: () => ({ cell: 'b' }),
    getRouter: () => ({ name: 'manhattan' }),
    getTerminal: (name: string) => ({ cell: name === 'source' ? 'a' : 'b' }),
    setTerminal: vi.fn(),
    setRouter: vi.fn(),
    setVertices: vi.fn(),
    setProp: vi.fn(),
  }
  expect(rerouteFloatingEdge(graph as unknown as Graph, edge as unknown as Edge)?.valid).toBe(true)
  expect(edge.setRouter).toHaveBeenLastCalledWith('normal', undefined, { routing: true })
  edge.getSource = () => ({ cell: 'a', port: 'fixed' }) as { cell: string }
  edge.setRouter.mockClear()
  expect(rerouteFloatingEdge(graph as unknown as Graph, edge as unknown as Edge)).toBeUndefined()
  expect(edge.setRouter).toHaveBeenCalledWith('orth', undefined, { routing: true })
})
