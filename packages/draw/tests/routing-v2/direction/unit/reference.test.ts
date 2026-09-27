import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { rect, Direction, type ModelSpace } from '../../../../src/routing/model'
import { resolveDirections } from '../../../../src/routing/orthogonal/direction'

interface DirectionPairCase {
  readonly name: string
  readonly source: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  readonly target: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  readonly sourceMask: number
  readonly targetMask: number
  readonly quadrant: number
  readonly expected: readonly [
    'WEST' | 'NORTH' | 'EAST' | 'SOUTH',
    'WEST' | 'NORTH' | 'EAST' | 'SOUTH',
  ]
}
interface ReferenceCase {
  readonly quadrant: number
  readonly sourceMask: number
  readonly targetMask: number
  readonly expected: readonly [
    'WEST' | 'NORTH' | 'EAST' | 'SOUTH',
    'WEST' | 'NORTH' | 'EAST' | 'SOUTH',
  ]
}
const fixture = JSON.parse(
  readFileSync(
    resolve(process.cwd(), 'tests/routing-v2/direction/fixtures/reference-cases.json'),
    'utf8',
  ),
) as {
  source: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  targetOffsets: readonly { readonly x: number; readonly y: number; readonly quadrant: number }[]
  cases: ReferenceCase[]
  directCases: DirectionPairCase[]
}
function mask(bits: number) {
  return {
    west: Boolean(bits & 1),
    north: Boolean(bits & 2),
    east: Boolean(bits & 4),
    south: Boolean(bits & 8),
  }
}
function named(direction: Direction): string {
  return (
    {
      [Direction.WEST]: 'WEST',
      [Direction.NORTH]: 'NORTH',
      [Direction.EAST]: 'EAST',
      [Direction.SOUTH]: 'SOUTH',
    } as const
  )[direction]
}

describe('pinned OrthConnector preference reference', () => {
  it.each(fixture.directCases)('matches independent direct reference case $name', (testCase) => {
    const source = rect<ModelSpace>(
      testCase.source.x,
      testCase.source.y,
      testCase.source.width,
      testCase.source.height,
    )
    const target = rect<ModelSpace>(
      testCase.target.x,
      testCase.target.y,
      testCase.target.width,
      testCase.target.height,
    )
    const result = resolveDirections(source, target, {
      sourceMask: mask(testCase.sourceMask),
      targetMask: mask(testCase.targetMask),
    })
    expect([named(result.sourceDirection), named(result.targetDirection)]).toEqual(
      testCase.expected,
    )
    expect(
      mask(testCase.sourceMask)[
        named(result.sourceDirection).toLowerCase() as keyof ReturnType<typeof mask>
      ],
    ).toBe(true)
    expect(
      mask(testCase.targetMask)[
        named(result.targetDirection).toLowerCase() as keyof ReturnType<typeof mask>
      ],
    ).toBe(true)
    expect(result.quadrant).toBe(testCase.quadrant)
  })

  it('compares each expected pair and endpoint membership in all 900 cases', () => {
    expect(fixture.cases).toHaveLength(900)
    const source = rect<ModelSpace>(
      fixture.source.x,
      fixture.source.y,
      fixture.source.width,
      fixture.source.height,
    )
    for (const testCase of fixture.cases) {
      const offset = fixture.targetOffsets[testCase.quadrant]
      const target = rect<ModelSpace>(
        fixture.source.x + offset.x,
        fixture.source.y + offset.y,
        fixture.source.width,
        fixture.source.height,
      )
      const result = resolveDirections(source, target, {
        sourceMask: mask(testCase.sourceMask),
        targetMask: mask(testCase.targetMask),
      })
      expect([named(result.sourceDirection), named(result.targetDirection)]).toEqual(
        testCase.expected,
      )
      expect(
        mask(testCase.sourceMask)[
          named(result.sourceDirection).toLowerCase() as keyof ReturnType<typeof mask>
        ],
      ).toBe(true)
      expect(
        mask(testCase.targetMask)[
          named(result.targetDirection).toLowerCase() as keyof ReturnType<typeof mask>
        ],
      ).toBe(true)
      expect(result.quadrant).toBe(testCase.quadrant)
    }
  })
})
