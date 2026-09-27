import { describe, expect, it } from 'vitest'
import { Direction, point, rect, type ModelSpace } from '../../../../src/routing/model'
import { resolveDirections } from '../../../../src/routing/orthogonal/direction'

const bounds = rect<ModelSpace>(0, 0, 10, 10)
const all = { west: true, north: true, east: true, south: true }

describe('DirectionResolver boundary contract', () => {
  it('returns outward directions at both endpoints and no route geometry', () => {
    const result = resolveDirections(bounds, rect<ModelSpace>(30, 0, 10, 10))
    expect(result.sourceDirection).toBe(Direction.EAST)
    expect(result.targetDirection).toBe(Direction.WEST)
    expect(result).not.toHaveProperty('route')
    expect(result).not.toHaveProperty('points')
    expect(result).not.toHaveProperty('waypoints')
  })

  it('defaults omitted masks to ALL while rejecting malformed options with context', () => {
    expect(resolveDirections(bounds, rect<ModelSpace>(30, 0, 10, 10))).toMatchObject({
      sourceDirection: Direction.EAST,
      targetDirection: Direction.WEST,
    })
    for (const invalid of [null, 1, 'options', []]) {
      expect(() => resolveDirections(bounds, bounds, invalid as never)).toThrow(
        /resolveDirections: options must be an object/,
      )
    }
  })

  it('rejects explicit null fixed points instead of treating them as omitted', () => {
    expect(() => resolveDirections(bounds, bounds, { fixedSource: null } as never)).toThrow(
      TypeError,
    )
    expect(() => resolveDirections(bounds, bounds, { fixedTarget: null } as never)).toThrow(
      TypeError,
    )
  })

  it.each(['fixedSource', 'fixedTarget'] as const)(
    'rejects null %s with operation and field context',
    (field) => {
      expect(() => resolveDirections(bounds, bounds, { [field]: null } as never)).toThrow(
        new RegExp('resolveDirections: ' + field + ' must be a point'),
      )
    },
  )

  it.each(['west', 'north', 'east', 'south'] as const)(
    'rejects non-boolean %s mask fields with field context',
    (field) => {
      const invalid = { ...all, [field]: 1 }
      expect(() => resolveDirections(bounds, bounds, { sourceMask: invalid as never })).toThrow(
        new RegExp(field, 'i'),
      )
    },
  )

  it.each(['sourceMask', 'targetMask'] as const)(
    'rejects explicit null %s rather than treating it as omitted',
    (field) => {
      expect(() => resolveDirections(bounds, bounds, { [field]: null } as never)).toThrow(TypeError)
    },
  )

  it.each(['west', 'north', 'east', 'south'] as const)(
    'rejects non-boolean target mask field %s with field context',
    (field) => {
      const invalid = { ...all, [field]: 1 }
      expect(() => resolveDirections(bounds, bounds, { targetMask: invalid as never })).toThrow(
        new RegExp(field, 'i'),
      )
    },
  )

  it('rejects an empty direction mask', () => {
    expect(() =>
      resolveDirections(bounds, bounds, {
        sourceMask: { west: false, north: false, east: false, south: false },
      }),
    ).toThrow(/at least one|allowed direction|empty/i)
  })

  it('rejects an empty target direction mask', () => {
    expect(() =>
      resolveDirections(bounds, bounds, {
        targetMask: { west: false, north: false, east: false, south: false },
      }),
    ).toThrow(/at least one|allowed direction|empty/i)
  })

  it('accepts zero extents and rejects negative extents', () => {
    const degenerate = rect<ModelSpace>(1, 2, 0, 0)
    expect(() => resolveDirections(degenerate, bounds)).not.toThrow()
    for (const field of ['width', 'height'] as const) {
      expect(() => resolveDirections({ ...bounds, [field]: -1 }, bounds)).toThrow(
        new RegExp('source.*' + field, 'i'),
      )
      expect(() => resolveDirections(bounds, { ...bounds, [field]: -1 })).toThrow(
        new RegExp('target.*' + field, 'i'),
      )
    }
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects every non-finite consumed rectangle and fixed-point field: %s',
    (value) => {
      for (const field of ['x', 'y', 'width', 'height'] as const) {
        expect(() => resolveDirections({ ...bounds, [field]: value }, bounds)).toThrow(
          new RegExp('source.*' + field, 'i'),
        )
        expect(() => resolveDirections(bounds, { ...bounds, [field]: value })).toThrow(
          new RegExp('target.*' + field, 'i'),
        )
      }
      expect(() =>
        resolveDirections(bounds, bounds, {
          fixedSource: { ...point<ModelSpace>(1, 1), x: value },
        }),
      ).toThrow(/fixedSource.*x/i)
      expect(() =>
        resolveDirections(bounds, bounds, {
          fixedSource: { ...point<ModelSpace>(1, 1), y: value },
        }),
      ).toThrow(/fixedSource.*y/i)
      expect(() =>
        resolveDirections(bounds, bounds, {
          fixedTarget: { ...point<ModelSpace>(1, 1), x: value },
        }),
      ).toThrow(/fixedTarget.*x/i)
      expect(() =>
        resolveDirections(bounds, bounds, {
          fixedTarget: { ...point<ModelSpace>(1, 1), y: value },
        }),
      ).toThrow(/fixedTarget.*y/i)
    },
  )

  it('rejects non-finite derived edges, centers and signed gaps', () => {
    expect(() =>
      resolveDirections(rect<ModelSpace>(Number.MAX_VALUE, 0, Number.MAX_VALUE, 1), bounds),
    ).toThrow(/right|edge/i)
    expect(() =>
      resolveDirections(
        rect<ModelSpace>(Number.MAX_VALUE, 0, 0, 1),
        rect<ModelSpace>(-Number.MAX_VALUE, 0, 0, 1),
      ),
    ).toThrow(/center|difference/i)
    expect(() =>
      resolveDirections(
        rect<ModelSpace>(-Number.MAX_VALUE, 0, Number.MAX_VALUE, 1),
        rect<ModelSpace>(Number.MAX_VALUE * 0.49, 0, 0, 1),
      ),
    ).toThrow(/gap|result/i)
  })

  it('does not invoke perimeter projection for point bounds', () => {
    const points = rect<ModelSpace>(0, 0, 0, 0)
    const result = resolveDirections(points, rect<ModelSpace>(30, 0, 0, 0))
    expect([result.sourceDirection, result.targetDirection]).toEqual([
      Direction.EAST,
      Direction.WEST,
    ])
  })
})
