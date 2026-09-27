import { describe, expect, it } from 'vitest'

import { EPSILON } from '../../../../src/routing/geometry'
import { point, rect, type ModelSpace } from '../../../../src/routing/model'
import { ellipsePerimeter, ellipseResidual } from '../../../../src/routing/perimeter'
import {
  integer,
  isSafeTranslationCase,
  runConditionedProperty,
  type SafeTranslationCase,
} from '../support/generated'

function evenDimension(random: () => number): number {
  return integer(random, 1, 1_000) * 2
}

function sampleCase(random: () => number) {
  return {
    x: integer(random, -100_000, 100_000),
    y: integer(random, -100_000, 100_000),
    width: evenDimension(random),
    height: evenDimension(random),
    towardX: integer(random, -100_000, 100_000),
    towardY: integer(random, -100_000, 100_000),
    orthogonal: random() < 0.5,
  }
}

function sampleTranslationCase(random: () => number): SafeTranslationCase {
  return {
    x: integer(random, -100_000, 100_000),
    y: integer(random, -100_000, 100_000),
    width: evenDimension(random),
    height: evenDimension(random),
    towardX: integer(random, -100_000, 100_000),
    towardY: integer(random, -100_000, 100_000),
    deltaX: integer(random, -100_000, 100_000),
    deltaY: integer(random, -100_000, 100_000),
  }
}

describe('ellipse generated evidence', () => {
  it('returns an analytical ellipse member for both hint modes', () => {
    const report = runConditionedProperty({
      name: 'ellipse-equation',
      sample: sampleCase,
      accept: () => true,
      property: (value) => {
        const bounds = rect<ModelSpace>(value.x, value.y, value.width, value.height)
        const result = ellipsePerimeter(
          bounds,
          point<ModelSpace>(value.towardX, value.towardY),
          value.orthogonal,
        )
        expect(ellipseResidual(bounds, result)).toBeLessThanOrEqual(EPSILON)
      },
    })
    expect(report.accepted).toBe(5_000)
  })

  it('preserves safe common translation within EPSILON', () => {
    const report = runConditionedProperty({
      name: 'ellipse-safe-translation',
      sample: sampleTranslationCase,
      accept: isSafeTranslationCase,
      property: (value, context) => {
        const bounds = rect<ModelSpace>(value.x, value.y, value.width, value.height)
        const toward = point<ModelSpace>(value.towardX, value.towardY)
        const orthogonal = context.accepted % 2 === 0
        const original = ellipsePerimeter(bounds, toward, orthogonal)
        const translated = ellipsePerimeter(
          rect<ModelSpace>(
            value.x + value.deltaX,
            value.y + value.deltaY,
            value.width,
            value.height,
          ),
          point<ModelSpace>(value.towardX + value.deltaX, value.towardY + value.deltaY),
          orthogonal,
        )
        expect(Math.abs(translated.x - (original.x + value.deltaX))).toBeLessThanOrEqual(EPSILON)
        expect(Math.abs(translated.y - (original.y + value.deltaY))).toBeLessThanOrEqual(EPSILON)
      },
    })
    expect(report.accepted).toBe(5_000)
  })

  it('is deterministic across unrelated calls', () => {
    const report = runConditionedProperty({
      name: 'ellipse-determinism',
      sample: sampleCase,
      accept: () => true,
      property: (value) => {
        const bounds = rect<ModelSpace>(value.x, value.y, value.width, value.height)
        const toward = point<ModelSpace>(value.towardX, value.towardY)
        const first = ellipsePerimeter(bounds, toward, value.orthogonal)
        ellipsePerimeter(rect<ModelSpace>(0, 0, 2, 2), point<ModelSpace>(9, 9), false)
        expect(ellipsePerimeter(bounds, toward, value.orthogonal)).toEqual(first)
      },
    })
    expect(report.accepted).toBe(5_000)
  })

  it('does not mutate frozen inputs', () => {
    const report = runConditionedProperty({
      name: 'ellipse-non-mutation',
      sample: sampleCase,
      accept: () => true,
      property: (value) => {
        const bounds = Object.freeze(rect<ModelSpace>(value.x, value.y, value.width, value.height))
        const toward = Object.freeze(point<ModelSpace>(value.towardX, value.towardY))
        const beforeBounds = { ...bounds }
        const beforeToward = { ...toward }
        ellipsePerimeter(bounds, toward, value.orthogonal)
        expect(bounds).toEqual(beforeBounds)
        expect(toward).toEqual(beforeToward)
      },
    })
    expect(report.accepted).toBe(5_000)
  })
})
