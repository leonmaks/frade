import { describe, expect, it } from 'vitest'
import { previewFloatingRoute } from '../../src/connections/previewRoute'

describe('floating connection preview', () => {
  it('keeps a valid source exit when the pointer moves behind the source', () => {
    const sourceRect = { x: 100, y: 100, width: 80, height: 60 }
    const result = previewFloatingRoute(
      sourceRect,
      { point: { x: 180, y: 130 }, side: 'right', outwardNormal: { x: 1, y: 0 } },
      { x: 20, y: 130 },
    )
    expect(result.valid).toBe(true)
    expect(result.escapedSource.x).toBe(192)
    expect(result.points[1]).toEqual({ x: 192, y: 130 })
    expect(
      result.points.some(
        (point) => point.x > 100 && point.x < 180 && point.y > 100 && point.y < 160,
      ),
    ).toBe(false)
  })
})
