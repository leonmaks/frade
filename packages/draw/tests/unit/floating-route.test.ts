import { describe, expect, it } from 'vitest'
import { routeFloatingConnection } from '../../src/routing/floatingRoute'

const left = { x: 0, y: 100, width: 100, height: 100 }
const right = { x: 400, y: 100, width: 100, height: 100 }

describe('floating route resolver', () => {
  it('slides a straight right-to-left floating edge along both contours', () => {
    const route = routeFloatingConnection({
      sourceRect: left,
      targetRect: right,
      corridorCoordinate: 150,
    })
    expect(route.valid).toBe(true)
    expect(route.usedDetour).toBe(false)
    expect(route.points).toEqual([
      { x: 100, y: 150 },
      { x: 400, y: 150 },
    ])
  })
  it('uses a detour when a requested corridor is outside attachment intervals', () => {
    const route = routeFloatingConnection({
      sourceRect: left,
      targetRect: right,
      corridorCoordinate: 40,
    })
    expect(route.usedDetour).toBe(true)
    expect(route.valid).toBe(true)
    expect(route.points.length).toBeGreaterThan(2)
  })
  it.each([
    [
      { x: 0, y: 0, width: 80, height: 60 },
      { x: 400, y: 0, width: 80, height: 60 },
      'right',
      'left',
    ],
    [
      { x: 400, y: 0, width: 80, height: 60 },
      { x: 0, y: 0, width: 80, height: 60 },
      'left',
      'right',
    ],
    [
      { x: 0, y: 200, width: 80, height: 60 },
      { x: 0, y: 0, width: 80, height: 60 },
      'top',
      'bottom',
    ],
    [
      { x: 0, y: 0, width: 80, height: 60 },
      { x: 0, y: 200, width: 80, height: 60 },
      'bottom',
      'top',
    ],
  ] as const)(
    'resolves terminal sides %s -> %s',
    (sourceRect, targetRect, sourceSide, targetSide) => {
      const route = routeFloatingConnection({ sourceRect, targetRect })
      expect(route.source.side).toBe(sourceSide)
      expect(route.target.side).toBe(targetSide)
      expect(route.valid).toBe(true)
    },
  )
  it('preserves explicit fixed terminals', () => {
    const route = routeFloatingConnection({
      sourceRect: left,
      targetRect: right,
      source: { mode: 'fixed', side: 'top', offset: 50 },
      target: { mode: 'fixed', side: 'top', offset: 450 },
    })
    expect(route.source).toMatchObject({ side: 'top', point: { x: 50, y: 100 } })
    expect(route.target).toMatchObject({ side: 'top', point: { x: 450, y: 100 } })
  })
})
