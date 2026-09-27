import { describe, expect, it } from 'vitest'

import { EPSILON } from '../../../../src/routing/geometry'
import { point, rect, type ModelSpace } from '../../../../src/routing/model'
import { resolveFloatingTerminal, terminalGeometry } from '../../../../src/routing/terminal'
import { integer, runConditionedProperty } from '../../perimeter/support/generated'

function sampleFloating(random: () => number) {
  const ax = integer(random, -50_000, 50_000)
  const ay = integer(random, -50_000, 50_000)
  const bx = integer(random, -50_000, 50_000)
  const by = integer(random, -50_000, 50_000)
  return {
    ax,
    ay,
    bx,
    by,
    aw: integer(random, 1, 500) * 2,
    ah: integer(random, 1, 500) * 2,
    bw: integer(random, 1, 500) * 2,
    bh: integer(random, 1, 500) * 2,
    p1x: integer(random, -100_000, 100_000),
    p1y: integer(random, -100_000, 100_000),
    p2x: integer(random, -100_000, 100_000),
    p2y: integer(random, -100_000, 100_000),
    dx: integer(random, -100_000, 100_000),
    dy: integer(random, -100_000, 100_000),
    ellipseA: random() < 0.5,
    ellipseB: random() < 0.5,
    orthogonal: random() < 0.5,
  }
}

describe('floating terminal generated evidence', () => {
  it('exchanges source/target endpoints under role and list reversal', () => {
    const report = runConditionedProperty({
      name: 'floating-source-target-reversal',
      sample: sampleFloating,
      accept: () => true,
      property: (value) => {
        const a = terminalGeometry(
          rect<ModelSpace>(value.ax, value.ay, value.aw, value.ah),
          value.ellipseA ? 'ellipse' : 'rectangle',
        )
        const b = terminalGeometry(
          rect<ModelSpace>(value.bx, value.by, value.bw, value.bh),
          value.ellipseB ? 'ellipse' : 'rectangle',
        )
        const points = [
          point<ModelSpace>(value.p1x, value.p1y),
          point<ModelSpace>(value.p2x, value.p2y),
        ]
        const forwardA = resolveFloatingTerminal(a, 'source', points, point<ModelSpace>(value.bx, value.by), value.orthogonal)
        const forwardB = resolveFloatingTerminal(b, 'target', points, point<ModelSpace>(value.ax, value.ay), value.orthogonal)
        const reversed = [...points].reverse()
        expect(resolveFloatingTerminal(b, 'source', reversed, point<ModelSpace>(value.ax, value.ay), value.orthogonal)).toEqual(forwardB)
        expect(resolveFloatingTerminal(a, 'target', reversed, point<ModelSpace>(value.bx, value.by), value.orthogonal)).toEqual(forwardA)
      },
    })
    expect(report.accepted).toBe(5_000)
  })

  it('preserves bounded common translation within EPSILON', () => {
    const report = runConditionedProperty({
      name: 'floating-safe-translation',
      sample: sampleFloating,
      accept: () => true,
      property: (value) => {
        const geometry = terminalGeometry(
          rect<ModelSpace>(value.ax, value.ay, value.aw, value.ah),
          value.ellipseA ? 'ellipse' : 'rectangle',
        )
        const points = [point<ModelSpace>(value.p1x, value.p1y)]
        const reference = point<ModelSpace>(value.bx, value.by)
        const original = resolveFloatingTerminal(geometry, 'source', points, reference, value.orthogonal)
        const translated = resolveFloatingTerminal(
          terminalGeometry(
            rect<ModelSpace>(value.ax + value.dx, value.ay + value.dy, value.aw, value.ah),
            value.ellipseA ? 'ellipse' : 'rectangle',
          ),
          'source',
          [point<ModelSpace>(value.p1x + value.dx, value.p1y + value.dy)],
          point<ModelSpace>(value.bx + value.dx, value.by + value.dy),
          value.orthogonal,
        )
        expect(Math.abs(translated.x - (original.x + value.dx))).toBeLessThanOrEqual(EPSILON)
        expect(Math.abs(translated.y - (original.y + value.dy))).toBeLessThanOrEqual(EPSILON)
      },
    })
    expect(report.accepted).toBe(5_000)
  })

  it('is deterministic and does not mutate frozen inputs', () => {
    const report = runConditionedProperty({
      name: 'floating-determinism-non-mutation',
      sample: sampleFloating,
      accept: () => true,
      property: (value) => {
        const geometry = Object.freeze(
          terminalGeometry(
            rect<ModelSpace>(value.ax, value.ay, value.aw, value.ah),
            value.ellipseA ? 'ellipse' : 'rectangle',
          ),
        )
        const points = Object.freeze([
          Object.freeze(point<ModelSpace>(value.p1x, value.p1y)),
          Object.freeze(point<ModelSpace>(value.p2x, value.p2y)),
        ])
        const reference = Object.freeze(point<ModelSpace>(value.bx, value.by))
        const before = JSON.stringify({ geometry, points, reference })
        const first = resolveFloatingTerminal(geometry, 'source', points, reference, value.orthogonal)
        const second = resolveFloatingTerminal(geometry, 'source', points, reference, value.orthogonal)
        expect(second).toEqual(first)
        expect(JSON.stringify({ geometry, points, reference })).toBe(before)
      },
    })
    expect(report.accepted).toBe(5_000)
  })
})
