import { expect } from 'vitest'

export const GEOMETRY_PROPERTY_SEED = 0xfad001
export const MIN_PROPERTY_CASES = 5_000
export const SAFE_TRANSLATION_COORD_LIMIT = 1_000_000

export class DeterministicGenerator {
  private state: number

  constructor(readonly seed = GEOMETRY_PROPERTY_SEED) {
    this.state = seed >>> 0
  }

  next(): number {
    let value = this.state
    value ^= value << 13
    value ^= value >>> 17
    value ^= value << 5
    this.state = value >>> 0
    return this.state / 0x1_0000_0000
  }

  integer(minimum: number, maximum: number): number {
    return minimum + Math.floor(this.next() * (maximum - minimum + 1))
  }

  pick<T>(values: readonly T[]): T {
    return values[this.integer(0, values.length - 1)]
  }
}

export interface PropertyReport {
  readonly name: string
  readonly seed: number
  readonly executed: number
  readonly accepted: number
  readonly rejected: number
}

export function runGeneratedProperty<T>(options: {
  readonly name: string
  readonly cases?: number
  readonly generate: (generator: DeterministicGenerator, index: number) => T
  readonly verify: (value: T, index: number) => void
}): PropertyReport {
  const cases = options.cases ?? MIN_PROPERTY_CASES
  const generator = new DeterministicGenerator()
  for (let index = 0; index < cases; index += 1) {
    const counterexample = options.generate(generator, index)
    try {
      options.verify(counterexample, index)
    } catch (error) {
      throw new Error(
        `Generated property failed: ${options.name}; seed=0x${GEOMETRY_PROPERTY_SEED.toString(16).toUpperCase()}; path=${options.name}/${index}; counterexample=${JSON.stringify(counterexample)}; cause=${String(error)}`,
        { cause: error },
      )
    }
  }
  const report = {
    name: options.name,
    seed: GEOMETRY_PROPERTY_SEED,
    executed: cases,
    accepted: cases,
    rejected: 0,
  }
  expect(report.executed).toBeGreaterThanOrEqual(MIN_PROPERTY_CASES)
  return report
}

export function reportProperty(report: PropertyReport): void {
  console.info(
    `PROPERTY ${report.name}: seed=0x${report.seed.toString(16).toUpperCase()} executed=${report.executed} accepted=${report.accepted} rejected=${report.rejected}`,
  )
}
