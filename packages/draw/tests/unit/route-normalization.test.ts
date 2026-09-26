import { describe, expect, it } from 'vitest'
import { normalizeRoute } from '../../src/geometry/normalizeRoute'
describe('route normalization', () => {
  it('removes duplicate and collinear points', () =>
    expect(
      normalizeRoute([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 10 },
      ]),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
    ]))
  it('is idempotent', () => {
    const route = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]
    expect(normalizeRoute(normalizeRoute(route))).toEqual(normalizeRoute(route))
  })
  it('drops non-finite points', () =>
    expect(
      normalizeRoute([
        { x: 0, y: 0 },
        { x: NaN, y: 2 },
        { x: 4, y: 0 },
      ]),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
    ]))
})
