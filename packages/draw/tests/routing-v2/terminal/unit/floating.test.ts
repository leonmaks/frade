import { describe, expect, it } from 'vitest'

import { point, rect, type ModelSpace } from '../../../../src/routing/model'
import {
  resolveFloatingTerminal,
  routingBoundsCenter,
  terminalGeometry,
} from '../../../../src/routing/terminal'

const geometry = terminalGeometry(rect<ModelSpace>(0, 0, 10, 20), 'rectangle')

describe('floating terminal resolution', () => {
  it('uses only the first intermediate for source and last for target', () => {
    const intermediates = [point<ModelSpace>(20, 10), point<ModelSpace>(5, -20)]
    const oppositeReference = point<ModelSpace>(-100, 10)
    expect(
      resolveFloatingTerminal(geometry, 'source', intermediates, oppositeReference),
    ).toEqual({ x: 10, y: 10 })
    expect(
      resolveFloatingTerminal(geometry, 'target', intermediates, oppositeReference),
    ).toEqual({ x: 5, y: 0 })
  })

  it('uses an explicit opposite fixed reference when intermediates are empty', () => {
    expect(
      resolveFloatingTerminal(geometry, 'source', [], point<ModelSpace>(20, 10)),
    ).toEqual({ x: 10, y: 10 })
  })

  it('lets both floating terminals use a pre-floating opposite-center snapshot in either call order', () => {
    const a = terminalGeometry(rect<ModelSpace>(0, 0, 10, 20), 'rectangle')
    const b = terminalGeometry(rect<ModelSpace>(30, 0, 10, 20), 'rectangle')
    const centerA = routingBoundsCenter(a)
    const centerB = routingBoundsCenter(b)
    const firstOrder = [
      resolveFloatingTerminal(a, 'source', [], centerB),
      resolveFloatingTerminal(b, 'target', [], centerA),
    ]
    const secondOrder = [
      resolveFloatingTerminal(b, 'target', [], centerA),
      resolveFloatingTerminal(a, 'source', [], centerB),
    ]
    expect(firstOrder).toEqual([
      { x: 10, y: 10 },
      { x: 30, y: 10 },
    ])
    expect(secondOrder.reverse()).toEqual(firstOrder)
  })

  it('exchanges endpoints when roles and intermediate order are reversed', () => {
    const a = terminalGeometry(rect<ModelSpace>(0, 0, 10, 20), 'rectangle')
    const b = terminalGeometry(rect<ModelSpace>(30, 0, 10, 20), 'ellipse')
    const intermediates = [point<ModelSpace>(15, 6), point<ModelSpace>(24, 14)]
    const forward = [
      resolveFloatingTerminal(a, 'source', intermediates, routingBoundsCenter(b)),
      resolveFloatingTerminal(b, 'target', intermediates, routingBoundsCenter(a)),
    ]
    const reversed = [...intermediates].reverse()
    const reverse = [
      resolveFloatingTerminal(b, 'source', reversed, routingBoundsCenter(a)),
      resolveFloatingTerminal(a, 'target', reversed, routingBoundsCenter(b)),
    ]
    expect(reverse).toEqual([forward[1], forward[0]])
  })

  it('does not skip a center-coincident adjacent point', () => {
    expect(
      resolveFloatingTerminal(
        geometry,
        'source',
        [point<ModelSpace>(5, 10), point<ModelSpace>(0, -100)],
        point<ModelSpace>(-100, 10),
      ),
    ).toEqual({ x: 10, y: 10 })
  })

  it('defaults the geometric hint to false and accepts an explicit hint', () => {
    const adjacent = [point<ModelSpace>(4, 8)]
    const reference = point<ModelSpace>(100, 100)
    expect(resolveFloatingTerminal(geometry, 'source', adjacent, reference)).toEqual({ x: 0, y: 0 })
    expect(resolveFloatingTerminal(geometry, 'source', adjacent, reference, true)).toEqual({ x: 0, y: 8 })
  })

  it('does not mutate a frozen intermediate list or its points', () => {
    const first = Object.freeze(point<ModelSpace>(20, 10))
    const second = Object.freeze(point<ModelSpace>(5, -20))
    const intermediates = Object.freeze([first, second])
    const before = JSON.stringify(intermediates)
    resolveFloatingTerminal(geometry, 'source', intermediates, point<ModelSpace>(-100, 10))
    expect(JSON.stringify(intermediates)).toBe(before)
  })

  it('rejects malformed side/reference/hint and invalid geometry with actionable fields', () => {
    expect(() =>
      resolveFloatingTerminal(geometry, 'middle' as never, [], point<ModelSpace>(20, 10)),
    ).toThrow(/side/)
    expect(() =>
      resolveFloatingTerminal(geometry, 'source', [], undefined as never),
    ).toThrow(/oppositeReference/)
    expect(() =>
      resolveFloatingTerminal(geometry, 'source', [], point<ModelSpace>(20, 10), 'yes' as never),
    ).toThrow(/orthogonal/)
    expect(() =>
      resolveFloatingTerminal(
        {
          routingBounds: { x: Number.NaN, y: 0, width: 10, height: 20 },
          actualPerimeter: { kind: 'rectangle', bounds: rect<ModelSpace>(0, 0, 10, 20) },
        },
        'source',
        [],
        point<ModelSpace>(20, 10),
      ),
    ).toThrow(/routingBounds\.x/)
  })
})
