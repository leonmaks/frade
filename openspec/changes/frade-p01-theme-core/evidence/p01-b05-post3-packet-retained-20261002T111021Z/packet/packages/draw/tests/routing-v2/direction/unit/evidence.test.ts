import { describe, expect, it } from 'vitest'
import { Direction, point, rect, type ModelSpace } from '../../../../src/routing/model'
import { resolveDirections } from '../../../../src/routing/orthogonal/direction'

const mask = Object.freeze({ west: true, north: true, east: false, south: false })
const source = Object.freeze(rect<ModelSpace>(0, 0, 10, 10))
const target = Object.freeze(rect<ModelSpace>(30, 30, 10, 10))
const fixedSource = Object.freeze(point<ModelSpace>(0, 5))

describe('direction evidence ownership and determinism', () => {
  it('accepts deeply frozen inputs without mutating or aliasing them', () => {
    const inputBefore = JSON.stringify({ source, target, mask, fixedSource })
    const result = resolveDirections(source, target, { sourceMask: mask, fixedSource })
    expect(JSON.stringify({ source, target, mask, fixedSource })).toBe(inputBefore)
    expect(result.preferenceEvidence.source).not.toBe(mask)
    expect(result.preferenceEvidence.source.fixedCandidate).toBe(Direction.WEST)
    expect(Object.isFrozen(result.preferenceEvidence)).toBe(true)
    expect(Object.isFrozen(result.preferenceEvidence.source)).toBe(true)
    expect(Object.isFrozen(result.preferenceEvidence.source.orderedAllowedDirections)).toBe(true)
    expect(() =>
      Reflect.apply(
        Array.prototype.push,
        result.preferenceEvidence.source.orderedAllowedDirections,
        [Direction.NORTH],
      ),
    ).toThrow()
  })

  it('does not expose mutable aliases to masks, bounds or fixed points', () => {
    const result = resolveDirections(source, target, { sourceMask: mask, fixedSource })
    expect(result.preferenceEvidence.source.mask).not.toBe(mask)
    expect(result.preferenceEvidence.source.fixedPoint).not.toBe(fixedSource)
    expect(result.preferenceEvidence.source.bounds).not.toBe(source)
  })

  it('owns result graphs independently across identical calls', () => {
    const first = resolveDirections(source, target, { sourceMask: mask, fixedSource })
    const second = resolveDirections(source, target, { sourceMask: mask, fixedSource })
    expect(first.preferenceEvidence).not.toBe(second.preferenceEvidence)
    expect(first.preferenceEvidence.source).not.toBe(second.preferenceEvidence.source)
    expect(first.preferenceEvidence.source.mask).not.toBe(second.preferenceEvidence.source.mask)
    expect(first.preferenceEvidence.source.orderedAllowedDirections).not.toBe(
      second.preferenceEvidence.source.orderedAllowedDirections,
    )
  })

  it('is history independent across unrelated calls and shared constants', () => {
    const first = resolveDirections(source, target, { sourceMask: mask, fixedSource })
    resolveDirections(rect<ModelSpace>(-10, 4, 25, 3), rect<ModelSpace>(90, -8, 10, 21))
    resolveDirections(rect<ModelSpace>(1, 1, 0, 0), rect<ModelSpace>(1, 1, 0, 0))
    const second = resolveDirections(source, target, { sourceMask: mask, fixedSource })
    expect(second).toEqual(first)
  })
})
