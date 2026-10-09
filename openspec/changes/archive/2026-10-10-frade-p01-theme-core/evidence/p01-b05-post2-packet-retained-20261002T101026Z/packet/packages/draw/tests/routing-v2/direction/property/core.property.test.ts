import { describe, expect, it } from 'vitest'
import {
  integer,
  runConditionedProperty,
  type PropertyReport,
} from '../../../../tests/routing-v2/perimeter/support/generated'
import { Direction, rect, type ModelSpace, type Rect } from '../../../../src/routing/model'
import { resolveDirections } from '../../../../src/routing/orthogonal/direction'

const SEED = 0xfad003
type Cardinal = Direction
type Input = {
  source: Rect<ModelSpace>
  target: Rect<ModelSpace>
  sourceMask: Mask
  targetMask: Mask
  fixedSource?: { x: number; y: number }
  fixedTarget?: { x: number; y: number }
  delta: { x: number; y: number }
}
type Mask = { west: boolean; north: boolean; east: boolean; south: boolean }

function randomMask(random: () => number): Mask {
  const bits = integer(random, 1, 15)
  return { west: !!(bits & 1), north: !!(bits & 2), east: !!(bits & 4), south: !!(bits & 8) }
}

function sample(random: () => number): Input {
  const coordinate = () => integer(random, -100_000, 100_000)
  const extent = () => 2 * integer(random, 0, 1_000)
  const source = rect<ModelSpace>(coordinate(), coordinate(), extent(), extent())
  const target = rect<ModelSpace>(coordinate(), coordinate(), extent(), extent())
  const fixed = (bounds: Rect<ModelSpace>) =>
    bounds.width > 0 && bounds.height > 0 && random() < 0.5
      ? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
      : undefined
  return {
    source,
    target,
    sourceMask: randomMask(random),
    targetMask: randomMask(random),
    fixedSource: fixed(source),
    fixedTarget: fixed(target),
    delta: { x: coordinate(), y: coordinate() },
  }
}

function gapEvidence(input: Input) {
  const { source: a, target: b } = input
  const sourceCenterX = a.x + a.width / 2
  const sourceCenterY = a.y + a.height / 2
  const targetCenterX = b.x + b.width / 2
  const targetCenterY = b.y + b.height / 2
  return {
    dx: sourceCenterX - targetCenterX,
    dy: sourceCenterY - targetCenterY,
    west: a.x - (b.x + b.width),
    east: b.x - (a.x + a.width),
    north: a.y - (b.y + b.height),
    south: b.y - (a.y + a.height),
  }
}

function safe(input: Input): boolean {
  const values = [
    input.source.x,
    input.source.y,
    input.source.width,
    input.source.height,
    input.target.x,
    input.target.y,
    input.target.width,
    input.target.height,
    input.delta.x,
    input.delta.y,
  ]
  if (values.some((n) => !Number.isInteger(n))) return false
  if (
    input.fixedSource &&
    (!Number.isInteger(input.fixedSource.x) || !Number.isInteger(input.fixedSource.y))
  )
    return false
  if (
    input.fixedTarget &&
    (!Number.isInteger(input.fixedTarget.x) || !Number.isInteger(input.fixedTarget.y))
  )
    return false
  const edges = (b: Rect<ModelSpace>) => [b.x, b.y, b.x + b.width, b.y + b.height]
  const translatedEdges = [...edges(input.source), ...edges(input.target)].map(
    (n, i) => n + (i % 2 === 0 ? input.delta.x : input.delta.y),
  )
  const fixed = [input.fixedSource, input.fixedTarget].flatMap((p) => (p ? [p.x, p.y] : []))
  const boundedCoordinates = [
    input.source.x,
    input.source.y,
    input.target.x,
    input.target.y,
    input.delta.x,
    input.delta.y,
    ...fixed,
  ]
  if (boundedCoordinates.some((n) => Math.abs(n) > 100_000)) return false
  const reflectedOrigins = [
    -input.source.x - input.source.width,
    -input.source.y - input.source.height,
    -input.target.x - input.target.width,
    -input.target.y - input.target.height,
  ]
  if (reflectedOrigins.some((n) => Math.abs(n) > 100_000)) return false
  const valuesAndEdges = [
    ...values,
    ...edges(input.source),
    ...edges(input.target),
    ...translatedEdges,
    ...fixed,
    ...fixed.map((n, i) => n + (i % 2 ? input.delta.y : input.delta.x)),
  ]
  if (valuesAndEdges.some((n) => !Number.isFinite(n) || Math.abs(n) > 1_000_000)) return false
  const g = gapEvidence(input)
  return [g.dx, g.dy, g.west, g.east, g.north, g.south].every((n) => Math.abs(n) > 4 * 1e-6)
}

function reflectedMask(mask: Mask, axis: 'horizontal' | 'vertical'): Mask {
  return axis === 'horizontal'
    ? { ...mask, west: mask.east, east: mask.west }
    : { ...mask, north: mask.south, south: mask.north }
}
function reflect(input: Input, axis: 'horizontal' | 'vertical'): Input {
  const horizontal = axis === 'horizontal'
  const reflectRect = (b: Rect<ModelSpace>) =>
    rect<ModelSpace>(
      horizontal ? -b.x - b.width : b.x,
      horizontal ? b.y : -b.y - b.height,
      b.width,
      b.height,
    )
  const reflectPoint = (p?: { x: number; y: number }) =>
    p && {
      x: horizontal ? -p.x : p.x,
      y: horizontal ? p.y : -p.y,
    }
  return {
    ...input,
    source: reflectRect(input.source),
    target: reflectRect(input.target),
    sourceMask: reflectedMask(input.sourceMask, axis),
    targetMask: reflectedMask(input.targetMask, axis),
    fixedSource: reflectPoint(input.fixedSource),
    fixedTarget: reflectPoint(input.fixedTarget),
    delta: { ...input.delta },
  }
}
function allowed(mask: Mask, direction: Cardinal): boolean {
  return mask[direction.toLowerCase() as keyof Mask]
}
function result(input: Input) {
  return resolveDirections(input.source, input.target, {
    sourceMask: input.sourceMask,
    targetMask: input.targetMask,
    ...(input.fixedSource ? { fixedSource: input.fixedSource } : {}),
    ...(input.fixedTarget ? { fixedTarget: input.fixedTarget } : {}),
  })
}
function semantic(resultValue: ReturnType<typeof result>) {
  const { source, target, orderingBranch } = resultValue.preferenceEvidence
  const endpoint = (value: typeof source) => ({
    rawHorizontal: value.rawHorizontal,
    rawVertical: value.rawVertical,
    adjustedHorizontal: value.adjustedHorizontal,
    adjustedVertical: value.adjustedVertical,
    orderedAllowedDirections: value.orderedAllowedDirections,
    selectedReason: value.selectedReason,
  })
  return { source: endpoint(source), target: endpoint(target), orderingBranch }
}
function run(
  name: string,
  property: (value: Input) => void,
  acceptExtra: (value: Input) => boolean = () => true,
): PropertyReport {
  return runConditionedProperty<Input>({
    name: 'R03/' + name,
    seed: SEED,
    requiredAccepted: 5_000,
    maxRaw: 500_000,
    sample,
    accept: (value) => safe(value) && acceptExtra(value),
    property: (value) => property(value),
  })
}

describe('conditioned reproducible direction properties', () => {
  it('rejects fixed-point coordinates outside the declared coordinate domain', () => {
    const input: Input = {
      source: rect<ModelSpace>(-64_315, 99_906, 1_994, 1_324),
      target: rect<ModelSpace>(-13_556, -10_032, 880, 322),
      sourceMask: { west: true, north: true, east: true, south: true },
      targetMask: { west: true, north: true, east: true, south: true },
      fixedSource: { x: -63_318, y: 100_568 },
      delta: { x: 0, y: 0 },
    }

    expect(safe(input)).toBe(false)
    const boundaryInput: Input = {
      ...input,
      source: rect<ModelSpace>(-5, 10, 1, 1),
      target: rect<ModelSpace>(20, 30, 2, 2),
      fixedSource: { x: 0, y: 100_000 },
    }
    expect(safe(boundaryInput)).toBe(true)
  })

  it('executes six properties with explicit seed and accepted/rejected evidence', () => {
    const reports = [
      run('mask-membership', (input) => {
        const output = result(input)
        expect(allowed(input.sourceMask, output.sourceDirection)).toBe(true)
        expect(allowed(input.targetMask, output.targetDirection)).toBe(true)
      }),
      run('determinism', (input) => expect(result(input)).toEqual(result(input))),
      run('non-mutation', (input) => {
        const before = JSON.stringify(input)
        result(input)
        expect(JSON.stringify(input)).toBe(before)
      }),
      run('safe-common-translation', (input) => {
        const original = result(input)
        const shifted = {
          ...input,
          source: rect<ModelSpace>(
            input.source.x + input.delta.x,
            input.source.y + input.delta.y,
            input.source.width,
            input.source.height,
          ),
          target: rect<ModelSpace>(
            input.target.x + input.delta.x,
            input.target.y + input.delta.y,
            input.target.width,
            input.target.height,
          ),
          fixedSource: input.fixedSource && {
            x: input.fixedSource.x + input.delta.x,
            y: input.fixedSource.y + input.delta.y,
          },
          fixedTarget: input.fixedTarget && {
            x: input.fixedTarget.x + input.delta.x,
            y: input.fixedTarget.y + input.delta.y,
          },
        }
        const translated = result(shifted)
        expect(translated.sourceDirection).toBe(original.sourceDirection)
        expect(translated.targetDirection).toBe(original.targetDirection)
        expect(translated.quadrant).toBe(original.quadrant)
        expect(translated.separation).toEqual(original.separation)
        expect(semantic(translated)).toEqual(semantic(original))
      }),
      run(
        'horizontal-reflection',
        (input) => {
          const original = result(input)
          const mirrored = result(reflect(input, 'horizontal'))
          const flip = (d: Cardinal) =>
            d === Direction.WEST ? Direction.EAST : d === Direction.EAST ? Direction.WEST : d
          expect(mirrored.sourceDirection).toBe(flip(original.sourceDirection))
          expect(mirrored.targetDirection).toBe(flip(original.targetDirection))
          expect(mirrored.separation).toEqual(original.separation)
          expect(mirrored.quadrant).toBe(([1, 0, 3, 2] as const)[original.quadrant])
        },
        (input) => {
          const g = gapEvidence(input)
          return Math.abs(g.west - g.east) > 4e-6 && Math.abs(g.dx) > 4e-6
        },
      ),
      run(
        'vertical-reflection',
        (input) => {
          const original = result(input)
          const mirrored = result(reflect(input, 'vertical'))
          const flip = (d: Cardinal) =>
            d === Direction.NORTH ? Direction.SOUTH : d === Direction.SOUTH ? Direction.NORTH : d
          expect(mirrored.sourceDirection).toBe(flip(original.sourceDirection))
          expect(mirrored.targetDirection).toBe(flip(original.targetDirection))
          expect(mirrored.separation).toEqual(original.separation)
          expect(mirrored.quadrant).toBe(([3, 2, 1, 0] as const)[original.quadrant])
        },
        (input) => {
          const g = gapEvidence(input)
          return Math.abs(g.north - g.south) > 4e-6 && Math.abs(g.dy) > 4e-6
        },
      ),
    ]
    for (const report of reports) {
      expect(report.seed).toBe(SEED)
      expect(report.accepted).toBe(5_000)
      expect(report.raw).toBe(report.accepted + report.rejected)
    }
  })
})
