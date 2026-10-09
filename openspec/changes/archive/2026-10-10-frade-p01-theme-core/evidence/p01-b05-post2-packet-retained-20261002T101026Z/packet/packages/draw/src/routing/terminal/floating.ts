import { type CoordinateSpace, type Point } from '../model'
import { assertValidPoint } from '../geometry'
import { perimeterIntersection } from '../perimeter'
import { assertValidTerminalGeometry, type TerminalGeometry } from './contracts'

export type TerminalSide = 'source' | 'target'

export function resolveFloatingTerminal<Space extends CoordinateSpace>(
  geometry: TerminalGeometry<Space>,
  side: TerminalSide,
  intermediatePoints: readonly Point<NoInfer<Space>>[],
  oppositeReference: Point<NoInfer<Space>>,
  orthogonal = false,
): Point<Space> {
  assertValidTerminalGeometry('resolveFloatingTerminal', geometry)
  if (side !== 'source' && side !== 'target') {
    throw new TypeError(`resolveFloatingTerminal: side must be source or target; received ${String(side)}`)
  }
  if (!Array.isArray(intermediatePoints)) {
    throw new TypeError('resolveFloatingTerminal: intermediatePoints must be a readonly point array')
  }
  intermediatePoints.forEach((value, index) =>
    assertValidPoint('resolveFloatingTerminal', `intermediatePoints[${index}]`, value),
  )
  if (oppositeReference === null || typeof oppositeReference !== 'object') {
    throw new TypeError('resolveFloatingTerminal: oppositeReference must be a point')
  }
  assertValidPoint('resolveFloatingTerminal', 'oppositeReference', oppositeReference)
  if (typeof orthogonal !== 'boolean') {
    throw new TypeError('resolveFloatingTerminal: orthogonal must be boolean')
  }
  const adjacent =
    intermediatePoints.length === 0
      ? oppositeReference
      : side === 'source'
        ? intermediatePoints[0]
        : intermediatePoints[intermediatePoints.length - 1]
  return perimeterIntersection(geometry.actualPerimeter, adjacent, orthogonal)
}
