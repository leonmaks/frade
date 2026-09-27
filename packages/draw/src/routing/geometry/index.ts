export {
  assertFiniteResult,
  assertValidPoint,
  assertValidRect,
  assertValidSegment,
  assertValidVector,
} from './validation'
export {
  EPSILON,
  ROUTE_PRECISION,
  approximatelyEqual,
  pointsApproximatelyEqual,
  quantizeCoordinate,
} from './numbers'
export {
  classifySegment,
  isOrthogonalSegment,
  manhattanDistance,
  translatePoint,
  translateSegment,
} from './segments'
export {
  RelativePlacement,
  horizontalOverlap,
  horizontalSeparation,
  rectEdges,
  relativeHorizontalPlacement,
  relativeVerticalPlacement,
  translateRect,
  verticalOverlap,
  verticalSeparation,
} from './rectangles'
export type { RectEdges } from './rectangles'
export {
  createViewTransform,
  evaluatePointTransformConditioning,
  evaluateVectorTransformConditioning,
  isPointTransformConditioned,
  isVectorTransformConditioned,
  modelPointToView,
  modelVectorToView,
  screenPointToView,
  viewPointToModel,
  viewPointToScreen,
  viewVectorToModel,
} from './transforms'
export type { TransformConditioning, ViewTransform } from './transforms'
export {
  normalizePointSequence,
  removeAdjacentDuplicatePoints,
  removeCollinearPoints,
} from './normalization'
