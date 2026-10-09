import { EPSILON } from '../../../../src/routing/geometry'

export const R02_PROPERTY_SEED = 0xfad002
export const SAFE_TRANSLATION_COORD_LIMIT = 1_000_000

export interface PropertyReport {
  readonly name: string
  readonly seed: number
  readonly raw: number
  readonly accepted: number
  readonly rejected: number
}

export interface PropertyContext {
  readonly seed: number
  readonly path: string
  readonly raw: number
  readonly accepted: number
  readonly rejected: number
}

export interface ConditionedPropertyOptions<Value> {
  readonly name: string
  readonly sample: (random: () => number, rawIndex: number) => Value
  readonly accept: (value: Value) => boolean
  readonly property: (value: Value, context: PropertyContext) => void
  readonly requiredAccepted?: number
  readonly maxRaw?: number
  readonly seed?: number
}

export interface SafeTranslationCase {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly towardX: number
  readonly towardY: number
  readonly deltaX: number
  readonly deltaY: number
}

export function seededRandom(seed = R02_PROPERTY_SEED): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000
  }
}

export function integer(random: () => number, minimum: number, maximum: number): number {
  return Math.floor(random() * (maximum - minimum + 1)) + minimum
}

function integerInRange(value: number, minimum: number, maximum: number): boolean {
  return Number.isInteger(value) && value >= minimum && value <= maximum
}

export function isSafeTranslationCase(value: SafeTranslationCase): boolean {
  if (
    !integerInRange(value.x, -100_000, 100_000) ||
    !integerInRange(value.y, -100_000, 100_000) ||
    !integerInRange(value.towardX, -100_000, 100_000) ||
    !integerInRange(value.towardY, -100_000, 100_000) ||
    !integerInRange(value.deltaX, -100_000, 100_000) ||
    !integerInRange(value.deltaY, -100_000, 100_000) ||
    !integerInRange(value.width, 2, 2_000) ||
    !integerInRange(value.height, 2, 2_000) ||
    value.width % 2 !== 0 ||
    value.height % 2 !== 0
  ) {
    return false
  }
  const centerX = value.x + value.width / 2
  const centerY = value.y + value.height / 2
  if (
    Math.abs(value.towardX - centerX) <= 4 * EPSILON &&
    Math.abs(value.towardY - centerY) <= 4 * EPSILON
  ) {
    return false
  }
  return [
    value.x + value.deltaX,
    value.y + value.deltaY,
    value.x + value.width + value.deltaX,
    value.y + value.height + value.deltaY,
    value.towardX + value.deltaX,
    value.towardY + value.deltaY,
  ].every(
    (coordinate) =>
      Number.isFinite(coordinate) && Math.abs(coordinate) <= SAFE_TRANSLATION_COORD_LIMIT,
  )
}

export function runConditionedProperty<Value>(
  options: ConditionedPropertyOptions<Value>,
): PropertyReport {
  const requiredAccepted = options.requiredAccepted ?? 5_000
  const maxRaw = options.maxRaw ?? requiredAccepted * 20
  const seed = options.seed ?? R02_PROPERTY_SEED
  const random = seededRandom(seed)
  let raw = 0
  let accepted = 0
  let rejected = 0
  while (accepted < requiredAccepted && raw < maxRaw) {
    const value = options.sample(random, raw)
    const path = `${raw}`
    raw += 1
    if (!options.accept(value)) {
      rejected += 1
      continue
    }
    const context = { seed, path, raw, accepted: accepted + 1, rejected }
    try {
      options.property(value, context)
    } catch (error) {
      throw new Error(
        `${options.name} failed; seed=0x${seed.toString(16).toUpperCase()}; path=${path}; ` +
          `raw=${raw}; accepted=${accepted + 1}; rejected=${rejected}; ` +
          `counterexample=${JSON.stringify(value)}`,
        { cause: error },
      )
    }
    accepted += 1
  }
  if (accepted < requiredAccepted) {
    throw new Error(
      `${options.name} exhausted; seed=0x${seed.toString(16).toUpperCase()}; ` +
        `raw=${raw}; accepted=${accepted}; rejected=${rejected}`,
    )
  }
  const report = { name: options.name, seed, raw, accepted, rejected }
  console.info(`[R02_PROPERTY] ${JSON.stringify(report)}`)
  return report
}
