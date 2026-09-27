import { point, type CoordinateSpace, type Point } from '../model'
import { assertFiniteResult } from '../geometry'
import { perimeterIntersection } from '../perimeter'
import {
  assertValidTerminalBinding,
  assertValidTerminalGeometry,
  type TerminalBinding,
  type TerminalGeometry,
} from './contracts'

export function resolveFixedTerminal<Space extends CoordinateSpace>(
  binding: TerminalBinding<Space>,
  geometry?: TerminalGeometry<NoInfer<Space>>,
): Point<Space> | null {
  assertValidTerminalBinding('resolveFixedTerminal', binding)
  if (binding.mode === 'anchor') {
    return point<Space>(binding.point.x, binding.point.y)
  }
  if (binding.mode === 'floating') return null
  if (geometry === undefined) {
    throw new TypeError('resolveFixedTerminal: geometry is required for a fixed constraint')
  }
  assertValidTerminalGeometry('resolveFixedTerminal', geometry)
  const offsetX = assertFiniteResult(
    'resolveFixedTerminal',
    'constraint offsetX',
    binding.constraint.x * geometry.routingBounds.width,
  )
  const offsetY = assertFiniteResult(
    'resolveFixedTerminal',
    'constraint offsetY',
    binding.constraint.y * geometry.routingBounds.height,
  )
  const affine = point<Space>(
    assertFiniteResult(
      'resolveFixedTerminal',
      'affine.x',
      geometry.routingBounds.x + offsetX,
    ),
    assertFiniteResult(
      'resolveFixedTerminal',
      'affine.y',
      geometry.routingBounds.y + offsetY,
    ),
  )
  return binding.constraint.perimeter
    ? perimeterIntersection(geometry.actualPerimeter, affine, false)
    : affine
}
