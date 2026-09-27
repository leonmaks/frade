import { describe, expect, it } from 'vitest'

import { EPSILON } from '../../../../src/routing/geometry'
import { point, rect, type ModelSpace } from '../../../../src/routing/model'
import {
  anchorBinding,
  connectionConstraint,
  fixedBinding,
  floatingBinding,
  resolveFixedTerminal,
  terminalGeometry,
} from '../../../../src/routing/terminal'

describe('fixed terminal resolution', () => {
  it('returns a new authoritative explicit-anchor point', () => {
    const anchor = anchorBinding(point<ModelSpace>(3, 4))
    const first = resolveFixedTerminal(anchor)
    const second = resolveFixedTerminal(anchor)
    expect(first).toEqual({ x: 3, y: 4 })
    expect(second).toEqual(first)
    expect(first).not.toBe(anchor.point)
    expect(second).not.toBe(first)
  })

  it('resolves a non-perimeter affine constraint without projection', () => {
    const geometry = terminalGeometry(rect<ModelSpace>(10, 20, 100, 80), 'rectangle')
    const binding = fixedBinding<ModelSpace>(
      'cell-a',
      connectionConstraint({ x: 0.25, y: 0.75, perimeter: false }),
    )
    expect(resolveFixedTerminal(binding, geometry)).toEqual({ x: 35, y: 80 })
  })

  it('radially projects rectangle and ellipse constraints before routing', () => {
    const constraint = connectionConstraint({ x: 0.75, y: 0.75, perimeter: true })
    const binding = fixedBinding<ModelSpace>('cell-a', constraint)
    expect(
      resolveFixedTerminal(binding, terminalGeometry(rect<ModelSpace>(0, 0, 10, 20), 'rectangle')),
    ).toEqual({ x: 10, y: 20 })
    const ellipse = resolveFixedTerminal(
      binding,
      terminalGeometry(rect<ModelSpace>(0, 0, 10, 20), 'ellipse'),
    )
    expect(Math.abs(ellipse!.x - (5 + 5 / Math.sqrt(2)))).toBeLessThanOrEqual(EPSILON)
    expect(Math.abs(ellipse!.y - (10 + 10 / Math.sqrt(2)))).toBeLessThanOrEqual(EPSILON)
  })

  it('returns null for floating bindings rather than a center', () => {
    expect(
      resolveFixedTerminal(
        floatingBinding<ModelSpace>('cell-a'),
        terminalGeometry(rect<ModelSpace>(0, 0, 10, 20), 'rectangle'),
      ),
    ).toBeNull()
  })

  it('identifies missing fixed geometry', () => {
    expect(() =>
      resolveFixedTerminal(
        fixedBinding<ModelSpace>(
          'cell-a',
          connectionConstraint({ x: 0.25, y: 0.75, perimeter: false }),
        ),
      ),
    ).toThrow(/geometry/)
  })

  it('allows zero-size affine and anchor results but rejects projected zero-size geometry', () => {
    const zero = terminalGeometry(rect<ModelSpace>(3, 4, 0, 0), 'rectangle')
    expect(
      resolveFixedTerminal(
        fixedBinding<ModelSpace>(
          'cell-a',
          connectionConstraint({ x: 0.25, y: 0.75, perimeter: false }),
        ),
        zero,
      ),
    ).toEqual({ x: 3, y: 4 })
    expect(resolveFixedTerminal(anchorBinding(point<ModelSpace>(7, 8)), zero)).toEqual({ x: 7, y: 8 })
    expect(() =>
      resolveFixedTerminal(
        fixedBinding<ModelSpace>(
          'cell-a',
          connectionConstraint({ x: 0.25, y: 0.75, perimeter: true }),
        ),
        zero,
      ),
    ).toThrow(RangeError)
  })

  it('validates malformed bindings and geometry at the public boundary', () => {
    expect(() => resolveFixedTerminal({ mode: 'invalid' } as never)).toThrow(/mode/)
    expect(() =>
      resolveFixedTerminal<ModelSpace>(
        {
          mode: 'fixed',
          cellId: 'cell-a',
          constraint: { x: 2, y: 0.5, perimeter: false },
        },
        terminalGeometry(rect<ModelSpace>(0, 0, 10, 20), 'rectangle'),
      ),
    ).toThrow(/x/)
  })

  it('does not mutate deep-frozen binding or geometry', () => {
    const binding = Object.freeze({
      ...fixedBinding<ModelSpace>(
        'cell-a',
        connectionConstraint({ x: 0.25, y: 0.75, perimeter: true }),
      ),
      constraint: Object.freeze(
        connectionConstraint({ x: 0.25, y: 0.75, perimeter: true }),
      ),
    })
    const geometry = Object.freeze({
      ...terminalGeometry(rect<ModelSpace>(0, 0, 10, 20), 'rectangle'),
      routingBounds: Object.freeze(rect<ModelSpace>(0, 0, 10, 20)),
      actualPerimeter: Object.freeze({
        kind: 'rectangle' as const,
        bounds: Object.freeze(rect<ModelSpace>(0, 0, 10, 20)),
      }),
    })
    const beforeBinding = JSON.stringify(binding)
    const beforeGeometry = JSON.stringify(geometry)
    resolveFixedTerminal(binding, geometry)
    expect(JSON.stringify(binding)).toBe(beforeBinding)
    expect(JSON.stringify(geometry)).toBe(beforeGeometry)
  })
})
