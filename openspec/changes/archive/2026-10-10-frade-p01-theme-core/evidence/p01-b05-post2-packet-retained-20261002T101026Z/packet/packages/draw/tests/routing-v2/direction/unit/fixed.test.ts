import { describe, expect, it } from 'vitest'
import { EPSILON } from '../../../../src/routing/geometry'
import { Direction, point, rect, type ModelSpace } from '../../../../src/routing/model'
import { resolveDirections } from '../../../../src/routing/orthogonal/direction'

const box = rect<ModelSpace>(0, 0, 10, 10)
const mask = (directions: readonly Direction[]) => ({
  west: directions.includes(Direction.WEST),
  north: directions.includes(Direction.NORTH),
  east: directions.includes(Direction.EAST),
  south: directions.includes(Direction.SOUTH),
})

describe('fixed-side direction evidence', () => {
  it.each([
    [point<ModelSpace>(0, 5), Direction.WEST],
    [point<ModelSpace>(5, 0), Direction.NORTH],
    [point<ModelSpace>(10, 5), Direction.EAST],
    [point<ModelSpace>(5, 10), Direction.SOUTH],
    [point<ModelSpace>(0, 0), Direction.NORTH],
    [point<ModelSpace>(10, 0), Direction.NORTH],
    [point<ModelSpace>(0, 10), Direction.SOUTH],
    [point<ModelSpace>(10, 10), Direction.SOUTH],
  ])('detects edge/corner side without moving the fixed point %#', (fixedSource, candidate) => {
    const frozen = Object.freeze({ ...fixedSource })
    const result = resolveDirections(box, rect<ModelSpace>(30, 30, 10, 10), {
      fixedSource: frozen,
    })
    expect(result.preferenceEvidence.source.fixedCandidate).toBe(candidate)
    expect(frozen).toEqual(fixedSource)
  })

  it.each([
    [point<ModelSpace>(5, 5), 'interior'],
    [point<ModelSpace>(0, -1 - 1e-6), 'outside span'],
    [point<ModelSpace>(20, 0), 'outside span'],
  ])('does not infer a candidate for %s', (fixedSource) => {
    const result = resolveDirections(box, rect<ModelSpace>(30, 30, 10, 10), { fixedSource })
    expect(result.preferenceEvidence.source.fixedCandidate).toBeUndefined()
    expect(result.preferenceEvidence.source.fixedDisposition).toMatch(/absent|not-on-side/i)
  })

  it.each([
    [rect<ModelSpace>(0, 0, 10, 10), point<ModelSpace>(-EPSILON, 5), Direction.WEST],
    [rect<ModelSpace>(0, 0, 10, 10), point<ModelSpace>(10 + EPSILON, 5), Direction.EAST],
    [rect<ModelSpace>(0, 0, 10, 10), point<ModelSpace>(5, -EPSILON), Direction.NORTH],
    [rect<ModelSpace>(0, 0, 10, 10), point<ModelSpace>(5, 10 + EPSILON), Direction.SOUTH],
    [rect<ModelSpace>(-10, 0, 10, 10), point<ModelSpace>(EPSILON, 5), Direction.EAST],
    [rect<ModelSpace>(0, 0, 10, 10), point<ModelSpace>(EPSILON, 5), Direction.WEST],
    [rect<ModelSpace>(-10, 0, 10, 10), point<ModelSpace>(-EPSILON, 5), Direction.EAST],
    [rect<ModelSpace>(0, -10, 10, 10), point<ModelSpace>(5, EPSILON), Direction.SOUTH],
    [rect<ModelSpace>(0, 0, 10, 10), point<ModelSpace>(5, EPSILON), Direction.NORTH],
    [rect<ModelSpace>(0, -10, 10, 10), point<ModelSpace>(5, -EPSILON), Direction.SOUTH],
  ])(
    'includes the exact inclusive side/span EPSILON boundary %#',
    (bounds, fixedSource, expected) => {
      const result = resolveDirections(bounds, rect<ModelSpace>(30, 30, 10, 10), { fixedSource })
      expect(result.preferenceEvidence.source.fixedCandidate).toBe(expected)
      expect(result.preferenceEvidence.source.fixedDisposition).toBe('allowed')
      expect(result.preferenceEvidence.source.fixedPoint).toEqual(fixedSource)
    },
  )

  it('applies EPSILON edge and expanded-span boundaries without moving anchors', () => {
    const nearWest = point<ModelSpace>(EPSILON / 2, 5)
    const nearOutsideWest = point<ModelSpace>(EPSILON * 2, 5)
    const referenceDelta = point<ModelSpace>(0.5, 5)
    const nearSpan = point<ModelSpace>(0, -EPSILON / 2)
    const outsideSpan = point<ModelSpace>(0, -EPSILON * 2)
    expect(
      resolveDirections(box, rect<ModelSpace>(30, 30, 10, 10), { fixedSource: nearWest })
        .preferenceEvidence.source.fixedCandidate,
    ).toBe(Direction.WEST)
    expect(
      resolveDirections(box, rect<ModelSpace>(30, 30, 10, 10), { fixedSource: nearOutsideWest })
        .preferenceEvidence.source.fixedCandidate,
    ).toBeUndefined()
    expect(
      resolveDirections(box, rect<ModelSpace>(30, 30, 10, 10), { fixedSource: referenceDelta })
        .preferenceEvidence.source.fixedCandidate,
    ).toBeUndefined()
    expect(
      resolveDirections(box, rect<ModelSpace>(30, 30, 10, 10), { fixedSource: nearSpan })
        .preferenceEvidence.source.fixedCandidate,
    ).toBe(Direction.NORTH)
    expect(
      resolveDirections(box, rect<ModelSpace>(30, 30, 10, 10), { fixedSource: outsideSpan })
        .preferenceEvidence.source.fixedCandidate,
    ).toBeUndefined()
    expect([nearWest, nearOutsideWest, referenceDelta, nearSpan, outsideSpan]).toEqual([
      { x: EPSILON / 2, y: 5 },
      { x: EPSILON * 2, y: 5 },
      { x: 0.5, y: 5 },
      { x: 0, y: -EPSILON / 2 },
      { x: 0, y: -EPSILON * 2 },
    ])
  })

  it('treats an ellipse-like diagonal anchor as geometric evidence only', () => {
    const fixedSource = point<ModelSpace>(2, 2)
    const result = resolveDirections(box, rect<ModelSpace>(30, 30, 10, 10), { fixedSource })
    expect(result.preferenceEvidence.source.fixedCandidate).toBeUndefined()
    expect(result.preferenceEvidence.source.selectedReason).toBe('preference')
    expect(fixedSource).toEqual({ x: 2, y: 2 })
  })

  it('keeps an allowed multi-mask fixed side first and deduplicates its evidence order', () => {
    const fixedSource = point<ModelSpace>(0, 5)
    const sourceMask = mask([Direction.WEST, Direction.NORTH])
    const result = resolveDirections(box, rect<ModelSpace>(30, 30, 10, 10), {
      fixedSource,
      sourceMask,
      targetMask: mask([Direction.WEST, Direction.SOUTH]),
    })
    expect(result.sourceDirection).toBe(Direction.WEST)
    expect(result.preferenceEvidence.source.fixedDisposition).toBe('allowed')
    expect(result.preferenceEvidence.source.selectedReason).toBe('fixed')
    expect(result.preferenceEvidence.source.orderedAllowedDirections).toEqual([Direction.WEST])
    expect(new Set(result.preferenceEvidence.source.orderedAllowedDirections).size).toBe(1)
  })

  it('applies fixed target evidence and preserves both supplied endpoint points', () => {
    const fixedSource = point<ModelSpace>(10, 5)
    const fixedTarget = point<ModelSpace>(35, 40)
    const result = resolveDirections(box, rect<ModelSpace>(30, 30, 10, 10), {
      fixedSource,
      fixedTarget,
    })
    expect(result.preferenceEvidence.source.fixedCandidate).toBe(Direction.EAST)
    expect(result.preferenceEvidence.source.fixedDisposition).toBe('allowed')
    expect(result.preferenceEvidence.target.fixedCandidate).toBe(Direction.SOUTH)
    expect(result.preferenceEvidence.target.fixedDisposition).toBe('allowed')
    expect(result.preferenceEvidence.source.fixedPoint).toEqual(fixedSource)
    expect(result.preferenceEvidence.target.fixedPoint).toEqual(fixedTarget)
    expect(result.preferenceEvidence.source.fixedPoint).not.toBe(fixedSource)
    expect(result.preferenceEvidence.target.fixedPoint).not.toBe(fixedTarget)
  })

  it.each([
    [point<ModelSpace>(30, 35), Direction.WEST],
    [point<ModelSpace>(30, 30), Direction.NORTH],
    [point<ModelSpace>(40, 35), Direction.EAST],
    [point<ModelSpace>(35, 40), Direction.SOUTH],
  ])(
    'detects a target fixed-side candidate without moving the point %#',
    (fixedTarget, candidate) => {
      const frozen = Object.freeze({ ...fixedTarget })
      const result = resolveDirections(box, rect<ModelSpace>(30, 30, 10, 10), {
        fixedTarget: frozen,
      })
      expect(result.preferenceEvidence.target.fixedCandidate).toBe(candidate)
      expect(frozen).toEqual(fixedTarget)
    },
  )

  it('filters a disallowed fixed candidate without moving it or escaping its mask', () => {
    const fixedSource = point<ModelSpace>(0, 5)
    const original = { ...fixedSource }
    const result = resolveDirections(box, rect<ModelSpace>(30, 30, 10, 10), {
      fixedSource,
      sourceMask: mask([Direction.NORTH, Direction.EAST]),
    })
    expect(result.preferenceEvidence.source.fixedCandidate).toBe(Direction.WEST)
    expect(result.preferenceEvidence.source.fixedDisposition).toBe('filtered')
    expect(result.sourceDirection).not.toBe(Direction.WEST)
    expect(
      mask([Direction.NORTH, Direction.EAST])[
        result.sourceDirection.toLowerCase() as keyof ReturnType<typeof mask>
      ],
    ).toBe(true)
    expect(fixedSource).toEqual(original)
  })

  it('singleton is the final override even when fixed-side evidence conflicts', () => {
    const fixedSource = point<ModelSpace>(0, 5)
    const result = resolveDirections(box, rect<ModelSpace>(30, 0, 10, 10), {
      fixedSource,
      sourceMask: mask([Direction.SOUTH]),
    })
    expect(result.sourceDirection).toBe(Direction.SOUTH)
    expect(result.preferenceEvidence.source.selectedReason).toBe('singleton')
    expect(fixedSource).toEqual({ x: 0, y: 5 })
  })

  it('applies final singleton override at both endpoints despite fixed-side evidence', () => {
    const fixedSource = point<ModelSpace>(0, 5)
    const fixedTarget = point<ModelSpace>(40, 35)
    const result = resolveDirections(box, rect<ModelSpace>(30, 30, 10, 10), {
      fixedSource,
      fixedTarget,
      sourceMask: mask([Direction.SOUTH]),
      targetMask: mask([Direction.NORTH]),
    })
    expect(result.sourceDirection).toBe(Direction.SOUTH)
    expect(result.targetDirection).toBe(Direction.NORTH)
    expect(result.preferenceEvidence.source.fixedCandidate).toBe(Direction.WEST)
    expect(result.preferenceEvidence.target.fixedCandidate).toBe(Direction.EAST)
    expect(result.preferenceEvidence.source.selectedReason).toBe('singleton')
    expect(result.preferenceEvidence.target.selectedReason).toBe('singleton')
    expect([fixedSource, fixedTarget]).toEqual([
      { x: 0, y: 5 },
      { x: 40, y: 35 },
    ])
  })

  it('regresses the independently reviewed 72/900 early-singleton-lock counterexample', () => {
    const result = resolveDirections(box, rect<ModelSpace>(-30, -30, 10, 10), {
      sourceMask: mask([Direction.WEST, Direction.NORTH]),
      targetMask: mask([Direction.NORTH]),
    })
    expect([result.sourceDirection, result.targetDirection]).toEqual([
      Direction.WEST,
      Direction.NORTH,
    ])
  })

  it('uses vertical priority for degenerate coincident edges', () => {
    const pointBounds = rect<ModelSpace>(0, 0, 0, 0)
    const result = resolveDirections(pointBounds, rect<ModelSpace>(30, 30, 0, 0), {
      fixedSource: point<ModelSpace>(0, 0),
    })
    expect(result.preferenceEvidence.source.fixedCandidate).toBe(Direction.NORTH)
  })
})
