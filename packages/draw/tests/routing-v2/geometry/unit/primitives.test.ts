import { describe, expect, it } from 'vitest'
import {
  Direction,
  Orientation,
  SegmentClassification,
  point,
  rect,
  segment,
  vector,
  type Point,
} from '../../../../src/routing/model'

describe('R01 model primitives', () => {
  it('constructs the complete dependency-free vocabulary', () => {
    expect(point(1, 2)).toEqual({ x: 1, y: 2 })
    expect(vector(-3, 4)).toEqual({ x: -3, y: 4 })
    expect(rect(1, 2, 3, 4)).toEqual({ x: 1, y: 2, width: 3, height: 4 })
    expect(segment(point(0, 0), point(1, 0))).toEqual({
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
    })
    expect(Object.values(Direction)).toEqual(['west', 'north', 'east', 'south'])
    expect(Object.values(Orientation)).toEqual(['horizontal', 'vertical'])
    expect(Object.values(SegmentClassification)).toEqual([
      'zero-length',
      'horizontal',
      'vertical',
      'diagonal',
    ])
  })

  it('exposes readonly fields in TypeScript', () => {
    const value: Point = point(1, 2)
    const mutateReadonlyPoint = (input: Point) => {
      // @ts-expect-error R01 model values are readonly.
      input.x = 3
    }
    expect(mutateReadonlyPoint).toBeTypeOf('function')
    expect(value).toEqual({ x: 1, y: 2 })
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite scalar %s from every primitive factory',
    (invalid) => {
      expect(() => point(invalid, 0)).toThrow(/point.*x/i)
      expect(() => vector(0, invalid)).toThrow(/vector.*y/i)
      expect(() => rect(0, 0, invalid, 1)).toThrow(/rect.*width/i)
      expect(() => segment(point(0, 0), { x: 1, y: invalid })).toThrow(/segment.*end\.y/i)
    },
  )

  it('rejects negative rectangle dimensions and accepts zero dimensions', () => {
    expect(() => rect(0, 0, -1, 1)).toThrow(/rect.*width/i)
    expect(() => rect(0, 0, 1, -1)).toThrow(/rect.*height/i)
    expect(rect(0, 0, 0, 1)).toEqual({ x: 0, y: 0, width: 0, height: 1 })
    expect(rect(0, 0, 1, 0)).toEqual({ x: 0, y: 0, width: 1, height: 0 })
  })
})
