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
import { createViewTransform, modelPointToView } from '../../../../src/routing/geometry'
import {
  ellipsePerimeter,
  perimeterGeometry,
  perimeterIntersection,
} from '../../../../src/routing/perimeter'

const modelBounds = rect<ModelSpace>(0, 0, 10, 20)
const viewBounds = rect<ViewSpace>(0, 0, 10, 20)
const screenBounds = rect<ScreenSpace>(0, 0, 10, 20)
const modelPoint = point<ModelSpace>(20, 10)
const viewPoint = point<ViewSpace>(20, 10)
const screenPoint = point<ScreenSpace>(20, 10)
const widenedPoint = point<ModelSpace | ViewSpace>(20, 10)

const modelResult: Point<ModelSpace> = ellipsePerimeter(modelBounds, modelPoint, false)
const viewResult: Point<ViewSpace> = ellipsePerimeter(viewBounds, viewPoint, true)
const screenResult: Point<ScreenSpace> = ellipsePerimeter(screenBounds, screenPoint, false)
const dispatchedModel: Point<ModelSpace> = perimeterIntersection(
  perimeterGeometry(modelBounds, 'ellipse'),
  modelPoint,
  false,
)
const convertedViewPoint = modelPointToView(
  modelPoint,
  createViewTransform(2, { x: 10, y: -5 }),
)
const explicitlyConvertedResult: Point<ViewSpace> = ellipsePerimeter(
  viewBounds,
  convertedViewPoint,
  false,
)

// @ts-expect-error model bounds reject a view toward point
ellipsePerimeter(modelBounds, viewPoint, false)
// @ts-expect-error model bounds reject a screen toward point
ellipsePerimeter(modelBounds, screenPoint, false)
// @ts-expect-error view bounds reject a model toward point
ellipsePerimeter(viewBounds, modelPoint, false)
// @ts-expect-error view bounds reject a screen toward point
ellipsePerimeter(viewBounds, screenPoint, false)
// @ts-expect-error screen bounds reject a model toward point
ellipsePerimeter(screenBounds, modelPoint, false)
// @ts-expect-error screen bounds reject a view toward point
ellipsePerimeter(screenBounds, viewPoint, false)
// @ts-expect-error widened points cannot erase the bounds space
ellipsePerimeter(modelBounds, widenedPoint, false)
// @ts-expect-error dispatched perimeter preserves and requires its geometry space
perimeterIntersection(perimeterGeometry(modelBounds, 'ellipse'), viewPoint, false)
// @ts-expect-error view result is not a model point
const invalidResult: Point<ModelSpace> = ellipsePerimeter(viewBounds, viewPoint, false)

export function genericEllipsePerimeter<Space extends CoordinateSpace>(
  bounds: Rect<Space>,
  toward: Point<Space>,
): Point<Space> {
  return ellipsePerimeter(bounds, toward, false)
}

void [
  modelResult,
  viewResult,
  screenResult,
  dispatchedModel,
  explicitlyConvertedResult,
  invalidResult,
]
