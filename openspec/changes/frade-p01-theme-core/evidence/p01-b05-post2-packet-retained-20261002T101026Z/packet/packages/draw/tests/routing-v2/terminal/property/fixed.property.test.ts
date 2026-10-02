import { describe, expect, it } from 'vitest'

import { point, rect, type ModelSpace } from '../../../../src/routing/model'
import {
  connectionConstraint,
  fixedBinding,
  resolveFixedTerminal,
  terminalGeometry,
} from '../../../../src/routing/terminal'
import { integer, runConditionedProperty } from '../../perimeter/support/generated'

function sampleFixed(random: () => number) {
  return {
    x: integer(random, -100_000, 100_000),
    y: integer(random, -100_000, 100_000),
    width: integer(random, 1, 1_000) * 2,
    height: integer(random, 1, 1_000) * 2,
    fractionX: integer(random, 0, 100) / 100,
    fractionY: integer(random, 0, 100) / 100,
    perimeter: random() < 0.5,
    ellipse: random() < 0.5,
    unrelatedTargetX: integer(random, -100_000, 100_000),
    unrelatedTargetY: integer(random, -100_000, 100_000),
  }
}

describe('fixed terminal generated evidence', () => {
  it('is deterministic, immutable, and independent of unrelated target movement', () => {
    const report = runConditionedProperty({
      name: 'fixed-target-independence',
      sample: sampleFixed,
      accept: () => true,
      property: (value) => {
        const binding = Object.freeze(
          fixedBinding<ModelSpace>(
            'cell-a',
            connectionConstraint({
              x: value.fractionX,
              y: value.fractionY,
              perimeter: value.perimeter,
            }),
          ),
        )
        const geometry = Object.freeze(
          terminalGeometry(
            rect<ModelSpace>(value.x, value.y, value.width, value.height),
            value.ellipse ? 'ellipse' : 'rectangle',
          ),
        )
        const beforeBinding = JSON.stringify(binding)
        const beforeGeometry = JSON.stringify(geometry)
        const first = resolveFixedTerminal(binding, geometry)
        point<ModelSpace>(value.unrelatedTargetX, value.unrelatedTargetY)
        const second = resolveFixedTerminal(binding, geometry)
        expect(second).toEqual(first)
        expect(JSON.stringify(binding)).toBe(beforeBinding)
        expect(JSON.stringify(geometry)).toBe(beforeGeometry)
      },
    })
    expect(report.accepted).toBe(5_000)
  })
})
