import { describe, expect, it } from 'vitest'
import {
  resolveSegmentDrag,
  type SegmentRouteRequest,
} from '../../src/segment-editing/resolveSegmentDrag'
import { validateManhattanRoute } from '../../src/geometry/validateManhattanRoute'
import { symmetries, transformRect } from '../spike/support/symmetry'

const source = { x: 80, y: 80, width: 120, height: 80 }
const target = { x: 500, y: 280, width: 120, height: 80 }
const z = [
  { x: 200, y: 120 },
  { x: 300, y: 120 },
  { x: 300, y: 320 },
  { x: 500, y: 320 },
]
const cases: Array<{
  name: string
  request: Omit<SegmentRouteRequest, 'coordinate'>
  coordinates: number[]
}> = [
  {
    name: 'central and exact corners',
    request: { source, target, points: z, index: 1 },
    coordinates: [40, 80, 80.01, 140, 199.99, 200, 300, 500, 500.01, 560, 620, 680],
  },
  {
    name: 'source terminal',
    request: { source, target, points: z, index: 0 },
    coordinates: [40, 80, 100, 160, 200, 280, 320, 360, 400],
  },
  {
    name: 'target terminal',
    request: { source, target, points: z, index: 2 },
    coordinates: [40, 80, 120, 160, 200, 280, 320, 360, 400],
  },
  {
    name: 'far side swept by corridor',
    request: {
      source,
      target,
      points: [z[0], { x: 680, y: 120 }, { x: 680, y: 320 }, { x: 620, y: 320 }],
      index: 0,
    },
    coordinates: [200, 270, 280, 280.01, 320, 359.99, 360, 370, 400],
  },
  {
    name: 'straight floating slide',
    request: { source, target: { ...target, y: 80 }, points: [z[0], { x: 500, y: 120 }], index: 0 },
    coordinates: [40, 80, 100, 120, 140, 160, 200],
  },
]

describe('floating segment symmetry contracts', () => {
  for (const fixture of cases)
    for (const symmetry of symmetries)
      for (const reverse of [false, true]) {
        it(`${fixture.name}: ${symmetry.id} reverse=${reverse}`, () => {
          const base = fixture.request
          const before = structuredClone(base)
          for (const coordinate of fixture.coordinates) {
            const expected = resolveSegmentDrag({ ...base, coordinate })
            expect(expected, `base candidate at ${coordinate}`).toBeDefined()
            const vertical = base.points[base.index].x === base.points[base.index + 1].x
            const moved = symmetry.point(
              vertical ? { x: coordinate, y: 0 } : { x: 0, y: coordinate },
            )
            let points = base.points.map(symmetry.point)
            let s = transformRect(base.source, symmetry.point),
              t = transformRect(base.target, symmetry.point)
            let index = base.index
            if (reverse) {
              points = points.reverse()
              ;[s, t] = [t, s]
              index = points.length - 2 - index
            }
            const actual = resolveSegmentDrag({
              source: s,
              target: t,
              points,
              index,
              coordinate: points[index].x === points[index + 1].x ? moved.x : moved.y,
            })
            const transformed = expected!.map(symmetry.point)
            expect(actual).toEqual(reverse ? transformed.reverse() : transformed)
            expect(validateManhattanRoute(actual!).valid).toBe(true)
            expect(base).toEqual(before)
          }
        })
      }
  for (const scale of [0.5, 2])
    it(`supports translated, resized rectangles at scale ${scale}`, () => {
      const transform = (p: { x: number; y: number }) => ({
        x: p.x * scale - 350,
        y: p.y * scale + 125,
      })
      for (const fixture of cases)
        for (const coordinate of fixture.coordinates.filter(Number.isInteger)) {
          const request = fixture.request
          const vertical = request.points[request.index].x === request.points[request.index + 1].x
          const expected = resolveSegmentDrag({ ...request, coordinate })!
          const actual = resolveSegmentDrag({
            ...request,
            points: request.points.map(transform),
            source: transformRect(request.source, transform),
            target: transformRect(request.target, transform),
            coordinate: coordinate * scale + (vertical ? -350 : 125),
          })
          expect(actual).toEqual(expected.map(transform))
        }
    })
  it('crosses a third node without mutating the input', () => {
    const request = {
      source,
      target,
      points: z,
      index: 1,
      coordinate: 300,
      obstacles: [{ x: 290, y: 180, width: 20, height: 40 }],
    }
    const before = structuredClone(request)
    expect(resolveSegmentDrag(request)).toEqual(resolveSegmentDrag({ ...request, obstacles: [] }))
    expect(request).toEqual(before)
  })
  it('does not conceal 180-degree returns in the geometry validator', () => {
    expect(
      validateManhattanRoute([
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 20, y: 0 },
      ]).issues,
    ).toContain('IMMEDIATE_REVERSAL')
  })
})
