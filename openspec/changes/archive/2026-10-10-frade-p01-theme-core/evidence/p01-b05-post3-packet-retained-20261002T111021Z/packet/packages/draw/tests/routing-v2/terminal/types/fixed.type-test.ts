import {
  point,
  rect,
  type CoordinateSpace,
  type ModelSpace,
  type Point,
  type ScreenSpace,
  type ViewSpace,
} from '../../../../src/routing/model'
import {
  anchorBinding,
  connectionConstraint,
  fixedBinding,
  resolveFixedTerminal,
  terminalGeometry,
  type TerminalBinding,
  type TerminalGeometry,
} from '../../../../src/routing/terminal'

const constraint = connectionConstraint({ x: 0.25, y: 0.75, perimeter: true })
const modelBinding = fixedBinding<ModelSpace>('model', constraint)
const viewBinding = fixedBinding<ViewSpace>('view', constraint)
const screenBinding = fixedBinding<ScreenSpace>('screen', constraint)
const modelGeometry = terminalGeometry(rect<ModelSpace>(0, 0, 10, 20), 'rectangle')
const viewGeometry = terminalGeometry(rect<ViewSpace>(0, 0, 10, 20), 'rectangle')
const screenGeometry = terminalGeometry(rect<ScreenSpace>(0, 0, 10, 20), 'rectangle')

const modelResult: Point<ModelSpace> | null = resolveFixedTerminal(modelBinding, modelGeometry)
const viewResult: Point<ViewSpace> | null = resolveFixedTerminal(viewBinding, viewGeometry)
const screenResult: Point<ScreenSpace> | null = resolveFixedTerminal(screenBinding, screenGeometry)
const anchorResult: Point<ModelSpace> | null = resolveFixedTerminal(
  anchorBinding(point<ModelSpace>(1, 2)),
)

// @ts-expect-error model binding rejects view geometry
resolveFixedTerminal(modelBinding, viewGeometry)
// @ts-expect-error model binding rejects screen geometry
resolveFixedTerminal(modelBinding, screenGeometry)
// @ts-expect-error view binding rejects model geometry
resolveFixedTerminal(viewBinding, modelGeometry)
// @ts-expect-error view binding rejects screen geometry
resolveFixedTerminal(viewBinding, screenGeometry)
// @ts-expect-error screen binding rejects model geometry
resolveFixedTerminal(screenBinding, modelGeometry)
// @ts-expect-error screen binding rejects view geometry
resolveFixedTerminal(screenBinding, viewGeometry)
// @ts-expect-error view result cannot be assigned to a model point
const invalidResult: Point<ModelSpace> | null = resolveFixedTerminal(viewBinding, viewGeometry)

export function genericFixedResolution<Space extends CoordinateSpace>(
  binding: TerminalBinding<Space>,
  geometry: TerminalGeometry<Space>,
): Point<Space> | null {
  return resolveFixedTerminal(binding, geometry)
}

void [modelResult, viewResult, screenResult, anchorResult, invalidResult]
