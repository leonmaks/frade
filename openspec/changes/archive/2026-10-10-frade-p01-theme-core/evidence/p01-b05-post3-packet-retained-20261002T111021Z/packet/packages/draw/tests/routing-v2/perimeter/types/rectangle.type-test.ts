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
import { rectanglePerimeter } from '../../../../src/routing/perimeter'

const modelBounds = rect<ModelSpace>(0, 0, 10, 20)
const viewBounds = rect<ViewSpace>(0, 0, 10, 20)
const screenBounds = rect<ScreenSpace>(0, 0, 10, 20)
const modelPoint = point<ModelSpace>(20, 10)
const viewPoint = point<ViewSpace>(20, 10)
const screenPoint = point<ScreenSpace>(20, 10)
const widenedPoint = point<ModelSpace | ViewSpace>(20, 10)

const modelResult: Point<ModelSpace> = rectanglePerimeter(modelBounds, modelPoint, false)
const viewResult: Point<ViewSpace> = rectanglePerimeter(viewBounds, viewPoint, true)
const screenResult: Point<ScreenSpace> = rectanglePerimeter(screenBounds, screenPoint, false)

// @ts-expect-error model bounds reject a view toward point
rectanglePerimeter(modelBounds, viewPoint, false)
// @ts-expect-error model bounds reject a screen toward point
rectanglePerimeter(modelBounds, screenPoint, false)
// @ts-expect-error view bounds reject a model toward point
rectanglePerimeter(viewBounds, modelPoint, false)
// @ts-expect-error view bounds reject a screen toward point
rectanglePerimeter(viewBounds, screenPoint, false)
// @ts-expect-error screen bounds reject a model toward point
rectanglePerimeter(screenBounds, modelPoint, false)
// @ts-expect-error screen bounds reject a view toward point
rectanglePerimeter(screenBounds, viewPoint, false)
// @ts-expect-error a widened toward point cannot erase the bounds space
rectanglePerimeter(modelBounds, widenedPoint, false)
// @ts-expect-error view-space result cannot be assigned to a model point
const invalidResult: Point<ModelSpace> = rectanglePerimeter(viewBounds, viewPoint, false)

export function genericRectanglePerimeter<Space extends CoordinateSpace>(
  bounds: Rect<Space>,
  toward: Point<Space>,
): Point<Space> {
  return rectanglePerimeter(bounds, toward, false)
}

void [modelResult, viewResult, screenResult, invalidResult]
