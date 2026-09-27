import { type CoordinateSpace, type Point, type Rect } from '../../model'
import { assertValidPoint } from '../../geometry'
import { ALL_PORT_CONSTRAINT, portConstraint, type DirectionMask } from '../../terminal'
import type { DirectionOptions, DirectionResolution, EndpointEvidence } from './contracts'
import { classifyRelativeGeometry, copyBounds } from './relative'
import { fixedCandidate, selectPreferences } from './preferences'

function copyFixed<S extends CoordinateSpace>(
  field: string,
  value?: Point<S>,
): Point<S> | undefined {
  if (value === undefined) return undefined
  if (value === null || typeof value !== 'object')
    throw new TypeError('resolveDirections: ' + field + ' must be a point')
  assertValidPoint('resolveDirections', field, value)
  return Object.freeze({ x: value.x, y: value.y })
}
function copyMask(field: string, value?: DirectionMask): DirectionMask {
  try {
    return Object.freeze(portConstraint(value === undefined ? ALL_PORT_CONSTRAINT : value))
  } catch (error) {
    if (error instanceof TypeError)
      throw new TypeError('resolveDirections: ' + field + ': ' + error.message, { cause: error })
    throw error
  }
}
export function resolveDirections<S extends CoordinateSpace>(
  sourceBounds: Rect<S>,
  targetBounds: Rect<NoInfer<S>>,
  options: DirectionOptions<NoInfer<S>> = {},
): DirectionResolution<S> {
  if (options === null || typeof options !== 'object' || Array.isArray(options))
    throw new TypeError('resolveDirections: options must be an object')
  const source = copyBounds('resolveDirections', 'source', sourceBounds)
  const target = copyBounds('resolveDirections', 'target', targetBounds)
  const sourceMask = copyMask('sourceMask', options.sourceMask)
  const targetMask = copyMask('targetMask', options.targetMask)
  const fixedSource = copyFixed('fixedSource', options.fixedSource)
  const fixedTarget = copyFixed('fixedTarget', options.fixedTarget)
  const geometry = classifyRelativeGeometry(source, target)
  const { endpoints, orderingBranch } = selectPreferences(
    geometry,
    [sourceMask, targetMask],
    [fixedCandidate(source, fixedSource), fixedCandidate(target, fixedTarget)],
    [fixedSource !== undefined, fixedTarget !== undefined],
  )
  const evidence = (
    i: number,
    bounds: Rect<S>,
    mask: DirectionMask,
    fixedPoint?: Point<S>,
  ): EndpointEvidence => {
    const { selected, ...details } = endpoints[i]
    if (!mask[selected])
      throw new Error('resolveDirections: selected direction must belong to its mask')
    return Object.freeze({
      bounds,
      mask,
      ...(fixedPoint === undefined ? {} : { fixedPoint }),
      ...details,
    })
  }
  return Object.freeze({
    sourceDirection: endpoints[0].selected,
    targetDirection: endpoints[1].selected,
    quadrant: geometry.quadrant,
    separation: geometry.separation,
    preferenceEvidence: Object.freeze({
      ...geometry,
      source: evidence(0, source, sourceMask, fixedSource),
      target: evidence(1, target, targetMask, fixedTarget),
      orderingBranch,
    }),
  })
}
