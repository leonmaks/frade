import { describe, expect, it } from 'vitest'
import { EPSILON } from '../../../../src/routing/geometry'
import { point, rect, type ModelSpace } from '../../../../src/routing/model'
import {
  classifyRelativeGeometry,
  resolveDirections,
} from '../../../../src/routing/orthogonal/direction'

const source = rect<ModelSpace>(0, 0, 10, 10)
const targetAtCenterDelta = (dx: number, dy: number) => rect<ModelSpace>(-dx, -dy, 10, 10)
const pointBounds = rect<ModelSpace>(0, 0, 0, 0)
const pointTargetAtCenterDelta = (dx: number, dy: number) => rect<ModelSpace>(-dx, -dy, 0, 0)

describe('relative direction geometry', () => {
  it.each([
    [5, 5, 0],
    [-5, 5, 1],
    [-5, -5, 2],
    [5, -5, 3],
  ])('uses pinned quadrant numbering for center delta (%s,%s)', (dx, dy, quadrant) => {
    expect(classifyRelativeGeometry(source, targetAtCenterDelta(dx, dy)).quadrant).toBe(quadrant)
  })

  it.each([
    [0, 1, 0],
    [1, 0, 3],
    [-1, 0, 1],
    [0, -1, 2],
    [0, 0, 2],
  ])('uses pinned axis and center ties for (%s,%s)', (dx, dy, quadrant) => {
    expect(classifyRelativeGeometry(source, targetAtCenterDelta(dx, dy)).quadrant).toBe(quadrant)
  })

  it.each([
    [EPSILON - EPSILON / 1024, 2],
    [EPSILON, 2],
    [EPSILON + EPSILON / 1024, 1],
  ])('snaps only center differences with magnitude <= EPSILON: %s', (delta, quadrant) => {
    expect(
      classifyRelativeGeometry(pointBounds, pointTargetAtCenterDelta(-delta, 0)).quadrant,
    ).toBe(quadrant)
  })

  it.each([
    [EPSILON - EPSILON / 1024, 2],
    [EPSILON, 2],
    [EPSILON + EPSILON / 1024, 0],
  ])(
    'snaps vertical center difference only inside the inclusive EPSILON band: %s',
    (delta, quadrant) => {
      expect(
        classifyRelativeGeometry(pointBounds, pointTargetAtCenterDelta(0, delta)).quadrant,
      ).toBe(quadrant)
    },
  )

  it.each([
    [-EPSILON - EPSILON / 1024, false],
    [-EPSILON, true],
    [0, true],
    [EPSILON, true],
    [EPSILON + EPSILON / 1024, false],
  ])('applies the inclusive zero band to signed axis gaps %s', (gap, overlaps) => {
    const flatSource = rect<ModelSpace>(0, 0, 0, 0)
    const target = rect<ModelSpace>(gap, gap, 0, 0)
    const result = classifyRelativeGeometry(flatSource, target)
    expect(result.signedGaps.east).toBe(gap)
    expect(result.signedGaps.west).toBe(gap === 0 ? 0 : -gap)
    expect(result.signedGaps.south).toBe(gap)
    expect(result.signedGaps.north).toBe(gap === 0 ? 0 : -gap)
    expect(result.separation.horizontal).toBe(overlaps ? 0 : Math.abs(gap))
    expect(result.separation.vertical).toBe(overlaps ? 0 : Math.abs(gap))
    expect(result.overlaps.horizontal).toBe(overlaps)
    expect(result.overlaps.vertical).toBe(overlaps)
  })

  it.each([
    [rect<ModelSpace>(0, 0, 10, 10), rect<ModelSpace>(10, 2, 15, 4), 0, true],
    [rect<ModelSpace>(0, 0, 10, 10), rect<ModelSpace>(2, 2, 3, 4), -8, true],
    [rect<ModelSpace>(0, 0, 10, 10), rect<ModelSpace>(10, 10, 4, 5), 0, true],
  ])(
    'retains signed axis gap and overlap relation for unequal bounds',
    (a, b, eastGap, overlaps) => {
      const result = classifyRelativeGeometry(a, b)
      expect(result.signedGaps.east).toBe(eastGap)
      expect(result.overlaps.horizontal).toBe(overlaps)
      expect(result.separation.horizontal).toBe(Math.max(eastGap, 0))
    },
  )

  it.each([
    ['source', null],
    ['target', null],
  ] as const)('rejects null %s bounds with operation and field context', (field, value) => {
    const call = () =>
      field === 'source'
        ? classifyRelativeGeometry(value as unknown as typeof source, source)
        : classifyRelativeGeometry(source, value as unknown as typeof source)
    expect(call).toThrow(new RegExp('classifyRelativeGeometry: ' + field + ' must be a rectangle'))
  })

  it('retains negative overlap evidence while exposing zero-banded policy gaps', () => {
    const result = classifyRelativeGeometry(source, rect<ModelSpace>(8, 1, 10, 8))
    expect(result.signedGaps.east).toBe(-2)
    expect(result.policyGaps.east).toBe(-2)
    expect(result.overlaps.horizontal).toBe(true)
    expect(result.separation.horizontal).toBe(0)
  })

  it('does not quantize sub-grid values and reports positive zero inside the zero band', () => {
    const geometry = classifyRelativeGeometry(
      rect<ModelSpace>(0, 0, 10, 10),
      rect<ModelSpace>(10.04, 10 - EPSILON / 2, 10, 10),
    )
    expect(geometry.signedGaps.east).toBe(10.04 - 10)
    expect(Object.is(geometry.policyGaps.south, -0)).toBe(false)
    expect(resolveDirections(source, rect<ModelSpace>(30, 0.04, 10, 10))).toMatchObject({
      quadrant: 2,
    })
  })

  it('documents finite IEEE-754 cancellation without imposing a false invariant', () => {
    const before = [rect<ModelSpace>(0, 0, 0, 0), rect<ModelSpace>(1e-8, 0, 0, 0)]
    const translated = before.map((rectValue) =>
      rect<ModelSpace>(rectValue.x + 1e9, rectValue.y, rectValue.width, rectValue.height),
    )
    expect(before[0].x).not.toBe(before[1].x)
    expect(translated[0].x).toBe(translated[1].x)
    expect(point<ModelSpace>(0, 0).x).toBe(0)
  })
})
