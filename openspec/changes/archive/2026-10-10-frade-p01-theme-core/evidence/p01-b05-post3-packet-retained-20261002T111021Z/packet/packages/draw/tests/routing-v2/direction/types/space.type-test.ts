import {
  point,
  rect,
  type CoordinateSpace,
  type ModelSpace,
  type Point,
  type Rect,
  type ScreenSpace,
  type ViewSpace,
} from '../../../../src/routing/model'
import {
  resolveDirections,
  type DirectionResolution,
} from '../../../../src/routing/orthogonal/direction'

function sameSpace<Space extends CoordinateSpace>(
  source: Rect<Space>,
  target: Rect<Space>,
  fixedSource: Point<Space>,
): DirectionResolution {
  return resolveDirections(source, target, { fixedSource })
}

export function directionSpaceTypes() {
  const modelSource = rect<ModelSpace>(0, 0, 10, 10)
  const modelTarget = rect<ModelSpace>(30, 0, 10, 10)
  const modelFixed = point<ModelSpace>(10, 5)
  const viewRect = rect<ViewSpace>(0, 0, 10, 10)
  const viewPoint = point<ViewSpace>(10, 5)
  const screenRect = rect<ScreenSpace>(0, 0, 10, 10)
  const screenPoint = point<ScreenSpace>(10, 5)

  const model = resolveDirections(modelSource, modelTarget, { fixedSource: modelFixed })
  const view = resolveDirections(viewRect, viewRect, { fixedTarget: viewPoint })
  const screen = resolveDirections(screenRect, screenRect, { fixedSource: screenPoint })
  const generic = sameSpace(modelSource, modelTarget, modelFixed)

  // @ts-expect-error resolution direction fields are readonly evidence
  model.sourceDirection = model.targetDirection
  // @ts-expect-error ordered allowed-direction evidence is readonly
  model.preferenceEvidence.source.orderedAllowedDirections.push(model.sourceDirection)

  // @ts-expect-error model and view spaces cannot be mixed
  resolveDirections(modelSource, viewRect)
  // @ts-expect-error model bounds cannot contain a view fixed point
  resolveDirections(modelSource, modelTarget, { fixedSource: viewPoint })
  // @ts-expect-error screen point cannot be fixed in model space
  resolveDirections(modelSource, modelTarget, { fixedTarget: screenPoint })

  const widenedRect = rect<ModelSpace | ViewSpace>(0, 0, 10, 10)
  const widenedPoint = point<ModelSpace | ViewSpace>(10, 5)
  // @ts-expect-error inferred space cannot be widened by an alias
  resolveDirections(modelSource, widenedRect)
  // @ts-expect-error coordinate-bearing options cannot widen the inferred space
  resolveDirections(modelSource, modelTarget, { fixedSource: widenedPoint })

  // @ts-expect-error output preserves its input space
  const wrongSpace: DirectionResolution<ViewSpace> = model
  return { model, view, screen, generic, wrongSpace }
}
