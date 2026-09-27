import {
  point,
  rect,
  segment,
  vector,
  type CoordinateSpace,
  type ModelSpace,
  type ViewSpace,
  type ScreenSpace,
  type Point,
  type Vector,
  type Segment,
  type Rect,
} from '../../../../src/routing/model'
import {
  translatePoint,
  translateSegment,
  translateRect,
  createViewTransform,
  modelPointToView,
  viewPointToModel,
  modelVectorToView,
  viewVectorToModel,
} from '../../../../src/routing/geometry'

// Compiled by tsc; intentionally not a Vitest suite.
export function coordinateSpaceTranslationContract() {
  const modelPoint = point<ModelSpace>(1, 2)
  const modelDelta = vector<ModelSpace>(3, 4)
  const modelSegment = segment(modelPoint, point<ModelSpace>(5, 6))
  const modelRect = rect<ModelSpace>(1, 2, 5, 6)
  const viewPoint = point<ViewSpace>(1, 2)
  const viewDelta = vector<ViewSpace>(3, 4)
  const viewSegment = segment(viewPoint, point<ViewSpace>(5, 6))
  const viewRect = rect<ViewSpace>(1, 2, 5, 6)
  const screenPoint = point<ScreenSpace>(1, 2)
  const screenDelta = vector<ScreenSpace>(3, 4)
  const screenSegment = segment(screenPoint, point<ScreenSpace>(5, 6))
  const screenRect = rect<ScreenSpace>(1, 2, 5, 6)

  // Valid translations retain their input space without annotations at the call site.
  const translatedModelPoint: Point<ModelSpace> = translatePoint(modelPoint, modelDelta)
  const translatedModelSegment: Segment<ModelSpace> = translateSegment(modelSegment, modelDelta)
  const translatedModelRect: Rect<ModelSpace> = translateRect(modelRect, modelDelta)
  const translatedViewPoint: Point<ViewSpace> = translatePoint(viewPoint, viewDelta)
  const translatedViewSegment: Segment<ViewSpace> = translateSegment(viewSegment, viewDelta)
  const translatedViewRect: Rect<ViewSpace> = translateRect(viewRect, viewDelta)
  const translatedScreenPoint: Point<ScreenSpace> = translatePoint(screenPoint, screenDelta)
  const translatedScreenSegment: Segment<ScreenSpace> = translateSegment(screenSegment, screenDelta)
  const translatedScreenRect: Rect<ScreenSpace> = translateRect(screenRect, screenDelta)

  // Every mixed pair must fail even without explicit generic arguments.
  // @ts-expect-error mixed coordinate spaces are forbidden (Model + View)
  translatePoint(modelPoint, viewDelta)
  // @ts-expect-error mixed coordinate spaces are forbidden (Model + View)
  translateSegment(modelSegment, viewDelta)
  // @ts-expect-error mixed coordinate spaces are forbidden (Model + View)
  translateRect(modelRect, viewDelta)
  // @ts-expect-error mixed coordinate spaces are forbidden (Model + Screen)
  translatePoint(modelPoint, screenDelta)
  // @ts-expect-error mixed coordinate spaces are forbidden (Model + Screen)
  translateSegment(modelSegment, screenDelta)
  // @ts-expect-error mixed coordinate spaces are forbidden (Model + Screen)
  translateRect(modelRect, screenDelta)
  // @ts-expect-error mixed coordinate spaces are forbidden (View + Model)
  translatePoint(viewPoint, modelDelta)
  // @ts-expect-error mixed coordinate spaces are forbidden (View + Model)
  translateSegment(viewSegment, modelDelta)
  // @ts-expect-error mixed coordinate spaces are forbidden (View + Model)
  translateRect(viewRect, modelDelta)
  // @ts-expect-error mixed coordinate spaces are forbidden (View + Screen)
  translatePoint(viewPoint, screenDelta)
  // @ts-expect-error mixed coordinate spaces are forbidden (View + Screen)
  translateSegment(viewSegment, screenDelta)
  // @ts-expect-error mixed coordinate spaces are forbidden (View + Screen)
  translateRect(viewRect, screenDelta)
  // @ts-expect-error mixed coordinate spaces are forbidden (Screen + Model)
  translatePoint(screenPoint, modelDelta)
  // @ts-expect-error mixed coordinate spaces are forbidden (Screen + Model)
  translateSegment(screenSegment, modelDelta)
  // @ts-expect-error mixed coordinate spaces are forbidden (Screen + Model)
  translateRect(screenRect, modelDelta)
  // @ts-expect-error mixed coordinate spaces are forbidden (Screen + View)
  translatePoint(screenPoint, viewDelta)
  // @ts-expect-error mixed coordinate spaces are forbidden (Screen + View)
  translateSegment(screenSegment, viewDelta)
  // @ts-expect-error mixed coordinate spaces are forbidden (Screen + View)
  translateRect(screenRect, viewDelta)

  const widenedDelta = vector<ModelSpace | ViewSpace>(3, 4)
  // @ts-expect-error delta must not widen the space inferred from the point
  translatePoint(modelPoint, widenedDelta)
  // @ts-expect-error delta must not widen the space inferred from the segment
  translateSegment(modelSegment, widenedDelta)
  // @ts-expect-error delta must not widen the space inferred from the rectangle
  translateRect(modelRect, widenedDelta)

  const transform = createViewTransform(2, { x: 10, y: 20 })
  const transformedViewPoint: Point<ViewSpace> = modelPointToView(modelPoint, transform)
  const recoveredModelPoint: Point<ModelSpace> = viewPointToModel(viewPoint, transform)
  const transformedViewVector: Vector<ViewSpace> = modelVectorToView(modelDelta, transform)
  const recoveredModelVector: Vector<ModelSpace> = viewVectorToModel(viewDelta, transform)
  // @ts-expect-error explicit transforms require their declared source space
  modelPointToView(viewPoint, transform)
  // @ts-expect-error explicit transforms require their declared source space
  viewPointToModel(modelPoint, transform)
  // @ts-expect-error explicit transforms require their declared source space
  modelVectorToView(viewDelta, transform)
  // @ts-expect-error explicit transforms require their declared source space
  viewVectorToModel(modelDelta, transform)
  // @ts-expect-error translation cannot produce another coordinate space
  const modelResult: Point<ModelSpace> = translatePoint(viewPoint, viewDelta)
  // @ts-expect-error segment translation cannot produce another coordinate space
  const modelSegmentResult: Segment<ModelSpace> = translateSegment(viewSegment, viewDelta)
  // @ts-expect-error rectangle translation cannot produce another coordinate space
  const modelRectResult: Rect<ModelSpace> = translateRect(viewRect, viewDelta)

  return {
    translatedModelPoint,
    translatedModelSegment,
    translatedModelRect,
    translatedViewPoint,
    translatedViewSegment,
    translatedViewRect,
    translatedScreenPoint,
    translatedScreenSegment,
    translatedScreenRect,
    transformedViewPoint,
    recoveredModelPoint,
    transformedViewVector,
    recoveredModelVector,
    modelResult,
    modelSegmentResult,
    modelRectResult,
  }
}

// Preserve the same guarantee for callers that themselves use a generic space.
export function genericTranslationContract<Space extends CoordinateSpace>(
  pointValue: Point<Space>,
  segmentValue: Segment<Space>,
  rectValue: Rect<Space>,
  delta: Vector<Space>,
): { point: Point<Space>; segment: Segment<Space>; rect: Rect<Space> } {
  return {
    point: translatePoint(pointValue, delta),
    segment: translateSegment(segmentValue, delta),
    rect: translateRect(rectValue, delta),
  }
}
