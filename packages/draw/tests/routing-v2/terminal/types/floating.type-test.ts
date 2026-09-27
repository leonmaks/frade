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
  resolveFloatingTerminal,
  terminalGeometry,
  type TerminalGeometry,
} from '../../../../src/routing/terminal'

const modelGeometry = terminalGeometry(rect<ModelSpace>(0, 0, 10, 20), 'rectangle')
const viewGeometry = terminalGeometry(rect<ViewSpace>(0, 0, 10, 20), 'rectangle')
const screenGeometry = terminalGeometry(rect<ScreenSpace>(0, 0, 10, 20), 'rectangle')
const modelPoint = point<ModelSpace>(20, 10)
const viewPoint = point<ViewSpace>(20, 10)
const screenPoint = point<ScreenSpace>(20, 10)
const widenedPoint = point<ModelSpace | ViewSpace>(20, 10)

const modelResult: Point<ModelSpace> = resolveFloatingTerminal(modelGeometry, 'source', [modelPoint], modelPoint)
const viewResult: Point<ViewSpace> = resolveFloatingTerminal(viewGeometry, 'target', [viewPoint], viewPoint, true)
const screenResult: Point<ScreenSpace> = resolveFloatingTerminal(screenGeometry, 'source', [], screenPoint)

// @ts-expect-error model geometry rejects a view intermediate
resolveFloatingTerminal(modelGeometry, 'source', [viewPoint], modelPoint)
// @ts-expect-error model geometry rejects a screen intermediate
resolveFloatingTerminal(modelGeometry, 'source', [screenPoint], modelPoint)
// @ts-expect-error view geometry rejects a model intermediate
resolveFloatingTerminal(viewGeometry, 'source', [modelPoint], viewPoint)
// @ts-expect-error screen geometry rejects a view intermediate
resolveFloatingTerminal(screenGeometry, 'source', [viewPoint], screenPoint)
// @ts-expect-error model geometry rejects a view opposite reference
resolveFloatingTerminal(modelGeometry, 'source', [modelPoint], viewPoint)
// @ts-expect-error view geometry rejects a screen opposite reference
resolveFloatingTerminal(viewGeometry, 'source', [viewPoint], screenPoint)
// @ts-expect-error view geometry rejects a screen intermediate
resolveFloatingTerminal(viewGeometry, 'source', [screenPoint], viewPoint)
// @ts-expect-error screen geometry rejects a model intermediate
resolveFloatingTerminal(screenGeometry, 'source', [modelPoint], screenPoint)
// @ts-expect-error model geometry rejects a screen opposite reference
resolveFloatingTerminal(modelGeometry, 'source', [modelPoint], screenPoint)
// @ts-expect-error view geometry rejects a model opposite reference
resolveFloatingTerminal(viewGeometry, 'source', [viewPoint], modelPoint)
// @ts-expect-error screen geometry rejects a model opposite reference
resolveFloatingTerminal(screenGeometry, 'source', [screenPoint], modelPoint)
// @ts-expect-error screen geometry rejects a view opposite reference
resolveFloatingTerminal(screenGeometry, 'source', [screenPoint], viewPoint)
// @ts-expect-error widened intermediate cannot erase geometry space
resolveFloatingTerminal(modelGeometry, 'source', [widenedPoint], modelPoint)
// @ts-expect-error widened reference cannot erase geometry space
resolveFloatingTerminal(modelGeometry, 'source', [modelPoint], widenedPoint)
// @ts-expect-error result preserves view space
const invalidResult: Point<ModelSpace> = resolveFloatingTerminal(viewGeometry, 'source', [], viewPoint)

export function genericFloatingResolution<Space extends CoordinateSpace>(
  geometry: TerminalGeometry<Space>,
  points: readonly Point<Space>[],
  reference: Point<Space>,
): Point<Space> {
  return resolveFloatingTerminal(geometry, 'source', points, reference)
}

void [modelResult, viewResult, screenResult, invalidResult]
