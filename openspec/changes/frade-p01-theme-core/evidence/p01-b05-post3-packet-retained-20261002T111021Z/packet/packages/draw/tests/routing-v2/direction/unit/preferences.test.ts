import { describe, expect, it } from 'vitest'
import { Direction, rect, type ModelSpace } from '../../../../src/routing/model'
import { resolveDirections } from '../../../../src/routing/orthogonal/direction'

const box = (x: number, y: number) => rect<ModelSpace>(x, y, 10, 10)
type DirectionMask = ReturnType<typeof maskFor>
const maskFor = (directions: readonly Direction[]) => ({
  west: directions.includes(Direction.WEST),
  north: directions.includes(Direction.NORTH),
  east: directions.includes(Direction.EAST),
  south: directions.includes(Direction.SOUTH),
})

describe('constrained direction preference policy', () => {
  it('selects EAST/WEST for horizontal separation and SOUTH/NORTH below', () => {
    expect(resolveDirections(box(0, 0), box(30, 0))).toMatchObject({
      sourceDirection: Direction.EAST,
      targetDirection: Direction.WEST,
    })
    expect(resolveDirections(box(0, 0), box(0, 30))).toMatchObject({
      sourceDirection: Direction.SOUTH,
      targetDirection: Direction.NORTH,
    })
  })

  it('honors pinned source-horizontal/target-vertical priority when both axes separate', () => {
    expect(resolveDirections(box(0, 0), box(30, 30))).toMatchObject({
      sourceDirection: Direction.EAST,
      targetDirection: Direction.NORTH,
    })
  })

  it('returns NORTH/SOUTH and quadrant 2 for identical bounds', () => {
    expect(resolveDirections(box(0, 0), box(0, 0))).toMatchObject({
      sourceDirection: Direction.NORTH,
      targetDirection: Direction.SOUTH,
      quadrant: 2,
    })
  })

  it('keeps the NORTH/SOUTH tie policy for identical bounds after reflection', () => {
    const original = rect<ModelSpace>(13, 17, 10, 10)
    const horizontalReflection = rect<ModelSpace>(-23, 17, 10, 10)
    const verticalReflection = rect<ModelSpace>(13, -27, 10, 10)

    for (const bounds of [original, horizontalReflection, verticalReflection]) {
      expect(resolveDirections(bounds, bounds)).toMatchObject({
        sourceDirection: Direction.NORTH,
        targetDirection: Direction.SOUTH,
        quadrant: 2,
      })
    }
  })

  it.each([
    [-30, -30],
    [30, -30],
    [30, 30],
    [-30, 30],
  ])('produces an allowed pair for every non-axis quadrant (%s,%s)', (x, y) => {
    const target = box(x, y)
    for (let sourceBits = 1; sourceBits < 16; sourceBits += 1) {
      for (let targetBits = 1; targetBits < 16; targetBits += 1) {
        const toMask = (bits: number) =>
          maskFor(
            [Direction.WEST, Direction.NORTH, Direction.EAST, Direction.SOUTH].filter(
              (_, index) => bits & (1 << index),
            ),
          )
        const result = resolveDirections(box(0, 0), target, {
          sourceMask: toMask(sourceBits),
          targetMask: toMask(targetBits),
        })
        expect(
          toMask(sourceBits)[result.sourceDirection.toLowerCase() as keyof DirectionMask],
        ).toBe(true)
        expect(
          toMask(targetBits)[result.targetDirection.toLowerCase() as keyof DirectionMask],
        ).toBe(true)
      }
    }
  })

  it('selects the first allowed direction from the reported preference order', () => {
    const sourceMask = maskFor([Direction.WEST, Direction.NORTH])
    const result = resolveDirections(box(0, 0), box(30, 30), {
      sourceMask,
      targetMask: maskFor([Direction.WEST, Direction.SOUTH]),
    })
    const evidence = result.preferenceEvidence.source
    expect(evidence.selectedReason).toBe('preference')
    expect(result.sourceDirection).toBe(Direction.WEST)
    expect(evidence.orderedAllowedDirections).toEqual([Direction.WEST, Direction.NORTH])
    expect(new Set(evidence.orderedAllowedDirections).size).toBe(
      evidence.orderedAllowedDirections.length,
    )
    expect(
      evidence.orderedAllowedDirections.every(
        (item) => sourceMask[item.toLowerCase() as keyof DirectionMask],
      ),
    ).toBe(true)
    expect(result.preferenceEvidence.orderingBranch).toBe('source-horizontal-target-vertical')
  })

  it('keeps horizontal touch in the vertical-only preference branch', () => {
    const result = resolveDirections(box(0, 0), box(10, 30))
    expect(result.preferenceEvidence.signedGaps.east).toBe(0)
    expect(result.preferenceEvidence.signedGaps.south).toBe(20)
    expect(result.preferenceEvidence.orderingBranch).toBe('vertical')
    expect([result.sourceDirection, result.targetDirection]).toEqual([
      Direction.SOUTH,
      Direction.NORTH,
    ])
  })

  it('does not enter paired vertical-horizontal ordering when horizontal gap is zero', () => {
    const result = resolveDirections(box(0, 0), box(10, 30), {
      sourceMask: maskFor([Direction.SOUTH, Direction.WEST]),
      targetMask: maskFor([Direction.WEST, Direction.EAST]),
    })
    expect(result.preferenceEvidence.orderingBranch).toBe('vertical')
    expect([result.sourceDirection, result.targetDirection]).toEqual([
      Direction.SOUTH,
      Direction.WEST,
    ])
  })

  it('reports WEST on an equal horizontal-gap tie even when vertical preference wins', () => {
    const result = resolveDirections(box(0, 0), rect<ModelSpace>(-10, 30, 30, 10))
    expect(result.preferenceEvidence.signedGaps.west).toBe(-20)
    expect(result.preferenceEvidence.signedGaps.east).toBe(-20)
    expect(result.sourceDirection).toBe(Direction.SOUTH)
    expect(result.preferenceEvidence.source.rawHorizontal).toBe(Direction.WEST)
    expect(result.preferenceEvidence.target.rawHorizontal).toBe(Direction.EAST)
  })

  it('keeps source-role priority explicit when endpoints are exchanged', () => {
    const forward = resolveDirections(box(0, 0), box(30, 30))
    const reverse = resolveDirections(box(30, 30), box(0, 0))
    expect([forward.sourceDirection, forward.targetDirection]).toEqual([
      Direction.EAST,
      Direction.NORTH,
    ])
    expect([reverse.sourceDirection, reverse.targetDirection]).toEqual([
      Direction.WEST,
      Direction.SOUTH,
    ])
  })
})
