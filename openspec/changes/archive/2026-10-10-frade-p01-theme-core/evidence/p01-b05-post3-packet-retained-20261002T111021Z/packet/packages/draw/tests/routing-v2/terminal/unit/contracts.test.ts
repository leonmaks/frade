import { describe, expect, it } from 'vitest'

import { Direction, point, rect, type ModelSpace } from '../../../../src/routing/model'
import {
  ALL_PORT_CONSTRAINT,
  anchorBinding,
  assertValidTerminalGeometry,
  connectionConstraint,
  effectivePortConstraint,
  fixedBinding,
  floatingBinding,
  portConstraint,
  routingBoundsCenter,
  terminalGeometry,
  type PortConstraint,
  type TerminalGeometry,
} from '../../../../src/routing/terminal'

const directions = [Direction.WEST, Direction.NORTH, Direction.EAST, Direction.SOUTH] as const

function mask(bits: number): PortConstraint {
  return {
    [Direction.WEST]: Boolean(bits & 1),
    [Direction.NORTH]: Boolean(bits & 2),
    [Direction.EAST]: Boolean(bits & 4),
    [Direction.SOUTH]: Boolean(bits & 8),
  }
}

describe('terminal semantic contracts', () => {
  it('constructs the default attached-cell binding as floating semantic data', () => {
    expect(floatingBinding<ModelSpace>('cell-a')).toEqual({ mode: 'floating', cellId: 'cell-a' })
  })

  it('keeps fixed constraints and detached anchors authoritative', () => {
    const constraint = connectionConstraint({ x: 0.25, y: 1, perimeter: true })
    const fixed = fixedBinding<ModelSpace>('cell-a', constraint)
    const anchorPoint = point<ModelSpace>(3, 4)
    const anchor = anchorBinding(anchorPoint)

    expect(fixed).toEqual({ mode: 'fixed', cellId: 'cell-a', constraint })
    expect(anchor).toEqual({ mode: 'anchor', point: { x: 3, y: 4 } })
    expect(anchor.point).not.toBe(anchorPoint)
  })

  it('accepts normalized affine endpoints including both boundaries', () => {
    expect(connectionConstraint({ x: 0, y: 1, perimeter: false })).toEqual({
      x: 0,
      y: 1,
      perimeter: false,
    })
  })

  it('owns one shared axis-aligned bounds value for routing and actual perimeter', () => {
    const bounds = rect<ModelSpace>(0, 0, 10, 20)
    const geometry = terminalGeometry(bounds, 'ellipse')

    expect(geometry).toEqual({
      routingBounds: bounds,
      actualPerimeter: { kind: 'ellipse', bounds },
    })
    expect(geometry.routingBounds).not.toBe(bounds)
    expect(geometry.actualPerimeter.bounds).not.toBe(bounds)
    expect(routingBoundsCenter(geometry)).toEqual({ x: 5, y: 10 })
  })

  it.each(['', '   '])('rejects an empty cell identity %#', (cellId) => {
    expect(() => floatingBinding<ModelSpace>(cellId)).toThrow(/cellId/)
  })

  it.each([
    [{ x: -Number.EPSILON, y: 0.5, perimeter: true }, 'x'],
    [{ x: 0.5, y: 1 + Number.EPSILON, perimeter: true }, 'y'],
    [{ x: Number.NaN, y: 0.5, perimeter: true }, 'x'],
    [{ x: 0.5, y: 0.5, perimeter: 'yes' }, 'perimeter'],
  ])('rejects malformed connection constraint %o', (value, field) => {
    expect(() => connectionConstraint(value as never)).toThrow(new RegExp(field))
  })

  it('rejects malformed perimeter kinds and mismatched geometry bounds', () => {
    expect(() => terminalGeometry(rect<ModelSpace>(0, 0, 10, 20), 'diamond' as never)).toThrow(
      /kind/,
    )

    const invalid = {
      routingBounds: rect<ModelSpace>(0, 0, 10, 20),
      actualPerimeter: {
        kind: 'rectangle',
        bounds: rect<ModelSpace>(0, 0, 11, 20),
      },
    } satisfies TerminalGeometry<ModelSpace>
    expect(() => assertValidTerminalGeometry('testGeometry', invalid)).toThrow(/bounds/)
  })

  it('does not mutate frozen semantic inputs', () => {
    const allowed = Object.freeze(mask(5))
    const rawConstraint = Object.freeze({ x: 0.25, y: 0.75, perimeter: true, allowedDirections: allowed })
    const bounds = Object.freeze(rect<ModelSpace>(1, 2, 3, 4))

    expect(fixedBinding<ModelSpace>('cell-a', connectionConstraint(rawConstraint), allowed)).toEqual({
      mode: 'fixed',
      cellId: 'cell-a',
      constraint: rawConstraint,
      portConstraint: allowed,
    })
    expect(terminalGeometry(bounds, 'rectangle').routingBounds).toEqual(bounds)
  })
})

describe('cardinal port-constraint data', () => {
  it('preserves every one of the 15 non-empty masks without choosing a direction', () => {
    for (let bits = 1; bits < 16; bits += 1) {
      const expected = mask(bits)
      const actual = portConstraint(expected)
      expect(actual).toEqual(expected)
      for (const direction of directions) expect(actual[direction]).toBe(expected[direction])
    }
  })

  it('defaults to ALL and applies connection > binding > ALL precedence', () => {
    const west = portConstraint(mask(1))
    const north = portConstraint(mask(2))
    const floating = floatingBinding<ModelSpace>('cell-a')
    const bindingMask = floatingBinding<ModelSpace>('cell-a', west)
    const constraintMask = fixedBinding<ModelSpace>(
      'cell-a',
      connectionConstraint({ x: 0.5, y: 0.5, perimeter: false, allowedDirections: north }),
      west,
    )

    expect(effectivePortConstraint(floating)).toEqual(ALL_PORT_CONSTRAINT)
    expect(effectivePortConstraint(bindingMask)).toEqual(west)
    expect(effectivePortConstraint(constraintMask)).toEqual(north)
  })

  it('rejects empty and malformed masks with the offending field', () => {
    expect(() => portConstraint(mask(0))).toThrow(/allowed direction/)
    expect(() => portConstraint({ ...mask(1), east: 1 } as never)).toThrow(/east/)
  })
})
