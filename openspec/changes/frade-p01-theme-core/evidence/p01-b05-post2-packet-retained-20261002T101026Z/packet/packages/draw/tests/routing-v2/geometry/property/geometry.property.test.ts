import { describe, expect, it } from 'vitest'
import {
  SegmentClassification,
  point,
  rect,
  segment,
  vector,
  type ModelPoint,
} from '../../../../src/routing/model'
import {
  EPSILON,
  classifySegment,
  createViewTransform,
  evaluatePointTransformConditioning,
  horizontalOverlap,
  horizontalSeparation,
  manhattanDistance,
  modelPointToView,
  normalizePointSequence,
  quantizeCoordinate,
  translatePoint,
  translateRect,
  verticalOverlap,
  verticalSeparation,
  viewPointToModel,
} from '../../../../src/routing/geometry'
import {
  DeterministicGenerator,
  GEOMETRY_PROPERTY_SEED,
  MIN_PROPERTY_CASES,
  SAFE_TRANSLATION_COORD_LIMIT,
  reportProperty,
  runGeneratedProperty,
  type PropertyReport,
} from '../support/generated'
import { SAFE_DOMAIN_GENERATOR_COUNTEREXAMPLE } from '../support/regressions'

const safeInteger = (generator: DeterministicGenerator) =>
  generator.integer(-SAFE_TRANSLATION_COORD_LIMIT, SAFE_TRANSLATION_COORD_LIMIT)

const expectInsideTranslationDomain = (value: { readonly x: number; readonly y: number }) => {
  expect(Math.abs(value.x)).toBeLessThanOrEqual(SAFE_TRANSLATION_COORD_LIMIT)
  expect(Math.abs(value.y)).toBeLessThanOrEqual(SAFE_TRANSLATION_COORD_LIMIT)
}

const generatedSequence = (generator: DeterministicGenerator) => {
  const margin = 200
  const values = [
    point(
      generator.integer(-SAFE_TRANSLATION_COORD_LIMIT + margin, SAFE_TRANSLATION_COORD_LIMIT - margin),
      generator.integer(-SAFE_TRANSLATION_COORD_LIMIT + margin, SAFE_TRANSLATION_COORD_LIMIT - margin),
    ),
  ]
  const count = generator.integer(2, 10)
  for (let index = 1; index < count; index += 1) {
    const previous = values[index - 1]
    const mode = generator.integer(0, 3)
    values.push(
      mode === 0
        ? previous
        : mode === 1
          ? point(previous.x + generator.integer(-20, 20), previous.y)
          : mode === 2
            ? point(previous.x, previous.y + generator.integer(-20, 20))
            : point(
                previous.x + generator.integer(-20, 20),
                previous.y + generator.integer(-20, 20),
              ),
    )
  }
  return values
}

describe('R01 reproducible generated geometry verification', () => {
  it('normalization is idempotent for at least 5000 generated sequences', () => {
    reportProperty(
      runGeneratedProperty({
        name: 'normalization-idempotence',
        generate: (generator) => generatedSequence(generator),
        verify: (sequence) => {
          const once = normalizePointSequence(sequence)
          expect(normalizePointSequence(once)).toEqual(once)
        },
      }),
    )
  })

  it('executes at least 5000 accepted EPSILON-conditioned point round trips', () => {
    const generator = new DeterministicGenerator()
    let accepted = 0
    let rejected = 0
    let executed = 0
    while (accepted < MIN_PROPERTY_CASES) {
      const forceIllConditioned = executed % 17 === 0
      const model = point(
        forceIllConditioned ? 1 : generator.integer(-1_000_000, 1_000_000),
        generator.integer(-1_000_000, 1_000_000),
      ) as ModelPoint
      const transform = createViewTransform(
        forceIllConditioned ? 1e-6 : generator.pick([0.25, 0.5, 1, 2, 4, 10]),
        vector(
          forceIllConditioned ? 1e9 : generator.integer(-1_000_000, 1_000_000),
          generator.integer(-1_000_000, 1_000_000),
        ),
      )
      const counterexample = { model, transform }
      const path = `conditioned-round-trip/${executed}`
      try {
        const conditioning = evaluatePointTransformConditioning(model, transform)
        if (!conditioning.conditioned) {
          rejected += 1
          expect(modelPointToView(model, transform)).toEqual({
            x: model.x * transform.scale + transform.translation.x,
            y: model.y * transform.scale + transform.translation.y,
          })
        } else {
          const recovered = viewPointToModel(modelPointToView(model, transform), transform)
          expect(Math.abs(recovered.x - model.x)).toBeLessThanOrEqual(EPSILON)
          expect(Math.abs(recovered.y - model.y)).toBeLessThanOrEqual(EPSILON)
          accepted += 1
        }
      } catch (error) {
        throw new Error(
          `Generated property failed: conditioned-round-trip; seed=0x${GEOMETRY_PROPERTY_SEED.toString(16).toUpperCase()}; path=${path}; counterexample=${JSON.stringify(counterexample)}; cause=${String(error)}`,
          { cause: error },
        )
      }
      executed += 1
    }
    const report: PropertyReport = {
      name: 'conditioned-round-trip',
      seed: GEOMETRY_PROPERTY_SEED,
      executed,
      accepted,
      rejected,
    }
    reportProperty(report)
    expect(accepted).toBeGreaterThanOrEqual(MIN_PROPERTY_CASES)
    expect(rejected).toBeGreaterThan(0)
  })

  it('safe translation preserves orientation, exact distance, and normalization modulo translation', () => {
    reportProperty(
      runGeneratedProperty({
        name: 'translation-orientation-distance-normalization',
        generate: (generator) => {
          const margin = 1_000
          const start = point(
            generator.integer(
              -SAFE_TRANSLATION_COORD_LIMIT + margin,
              SAFE_TRANSLATION_COORD_LIMIT - margin,
            ),
            generator.integer(
              -SAFE_TRANSLATION_COORD_LIMIT + margin,
              SAFE_TRANSLATION_COORD_LIMIT - margin,
            ),
          )
          let dx = generator.integer(-1000, 1000)
          let dy = generator.integer(-1000, 1000)
          if (dx === 0 && dy === 0) dx = 1
          if (generator.integer(0, 2) === 0) dx = 0
          if (generator.integer(0, 2) === 0) dy = 0
          if (dx === 0 && dy === 0) dy = 1
          const end = point(start.x + dx, start.y + dy)
          return {
            start,
            end,
            delta: vector(safeInteger(generator), safeInteger(generator)),
            sequence: generatedSequence(generator),
          }
        },
        verify: ({ start, end, delta, sequence }) => {
          expectInsideTranslationDomain(start)
          expectInsideTranslationDomain(end)
          expectInsideTranslationDomain(delta)
          sequence.forEach(expectInsideTranslationDomain)
          const translatedStart = translatePoint(start, delta)
          const translatedEnd = translatePoint(end, delta)
          expect(classifySegment(segment(translatedStart, translatedEnd))).toBe(
            classifySegment(segment(start, end)),
          )
          expect(manhattanDistance(translatedStart, translatedEnd)).toBe(
            manhattanDistance(start, end),
          )
          expect(normalizePointSequence(sequence.map((value) => translatePoint(value, delta)))).toEqual(
            normalizePointSequence(sequence).map((value) => translatePoint(value, delta)),
          )
        },
      }),
    )
  })

  it('identical inputs produce identical semantic results repeatedly', () => {
    reportProperty(
      runGeneratedProperty({
        name: 'repeated-input-determinism',
        generate: (generator) => ({
          value: generator.integer(-1_000_000_000, 1_000_000_000) / 100,
          sequence: generatedSequence(generator),
        }),
        verify: ({ value, sequence }) => {
          expect(quantizeCoordinate(value)).toBe(quantizeCoordinate(value))
          expect(normalizePointSequence(sequence)).toEqual(normalizePointSequence(sequence))
        },
      }),
    )
  })

  it('Manhattan distance is symmetric across a broad finite domain', () => {
    reportProperty(
      runGeneratedProperty({
        name: 'manhattan-symmetry',
        generate: (generator) => ({
          first: point(
            generator.integer(-1_000_000_000, 1_000_000_000),
            generator.integer(-1_000_000_000, 1_000_000_000),
          ),
          second: point(
            generator.integer(-1_000_000_000, 1_000_000_000),
            generator.integer(-1_000_000_000, 1_000_000_000),
          ),
        }),
        verify: ({ first, second }) =>
          expect(manhattanDistance(first, second)).toBe(manhattanDistance(second, first)),
      }),
    )
  })

  it('safe common translation preserves rectangle overlap and separation relations', () => {
    reportProperty(
      runGeneratedProperty({
        name: 'rectangle-relation-translation',
        generate: (generator) => {
          const first = rect(
            generator.integer(-500_000, 500_000),
            generator.integer(-500_000, 500_000),
            generator.integer(0, 1000),
            generator.integer(0, 1000),
          )
          const gapX = generator.pick([0, generator.integer(1, 1000)])
          const gapY = generator.pick([0, generator.integer(1, 1000)])
          const second = rect(
            first.x + first.width + gapX,
            first.y + first.height + gapY,
            generator.integer(0, 1000),
            generator.integer(0, 1000),
          )
          return { first, second, delta: vector(safeInteger(generator), safeInteger(generator)) }
        },
        verify: ({ first, second, delta }) => {
          const movedFirst = translateRect(first, delta)
          const movedSecond = translateRect(second, delta)
          expect(horizontalOverlap(movedFirst, movedSecond)).toBe(horizontalOverlap(first, second))
          expect(verticalOverlap(movedFirst, movedSecond)).toBe(verticalOverlap(first, second))
          expect(horizontalSeparation(movedFirst, movedSecond)).toBe(
            horizontalSeparation(first, second),
          )
          expect(verticalSeparation(movedFirst, movedSecond)).toBe(
            verticalSeparation(first, second),
          )
        },
      }),
    )
  })

  it('keeps deterministic boundary fixtures outside metamorphic generators', () => {
    expect(classifySegment(segment(point(0, 0), point(EPSILON, EPSILON)))).toBe(
      SegmentClassification.ZERO_LENGTH,
    )
    const delta = vector(1e9, 0)
    expect(translatePoint(point(0, 0), delta).x).toBe(translatePoint(point(1e-8, 0), delta).x)
    expect(SAFE_DOMAIN_GENERATOR_COUNTEREXAMPLE.seed).toBe(GEOMETRY_PROPERTY_SEED)
    expect(Math.abs(SAFE_DOMAIN_GENERATOR_COUNTEREXAMPLE.end.y)).toBeGreaterThan(
      SAFE_TRANSLATION_COORD_LIMIT,
    )
  })
})
