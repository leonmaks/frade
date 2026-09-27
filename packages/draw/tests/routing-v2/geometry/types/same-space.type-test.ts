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
  type Rect,
  type Segment,
} from '../../../../src/routing/model'
import {
  pointsApproximatelyEqual,
  manhattanDistance,
  horizontalOverlap,
  verticalOverlap,
  horizontalSeparation,
  verticalSeparation,
  relativeHorizontalPlacement,
  relativeVerticalPlacement,
  removeAdjacentDuplicatePoints,
  removeCollinearPoints,
  normalizePointSequence,
} from '../../../../src/routing/geometry'

// Real tsc regression for same-space comparisons, relations, and sequences.
export function sameSpaceApiContract() {
  const modelPoint = point<ModelSpace>(1, 2)
  const viewPoint = point<ViewSpace>(3, 4)
  const screenPoint = point<ScreenSpace>(5, 6)
  const modelRect = rect<ModelSpace>(1, 2, 3, 4)
  const viewRect = rect<ViewSpace>(3, 4, 5, 6)
  const screenRect = rect<ScreenSpace>(5, 6, 7, 8)
  const widenedPoint = point<ModelSpace | ViewSpace>(1, 2)
  const widenedRect = rect<ModelSpace | ViewSpace>(1, 2, 3, 4)
  // @ts-expect-error same-space API rejects mixed operands
  pointsApproximatelyEqual(modelPoint, viewPoint)
  // @ts-expect-error same-space API rejects mixed operands
  pointsApproximatelyEqual(viewPoint, modelPoint)
  // @ts-expect-error a widened second operand cannot erase first-operand space
  pointsApproximatelyEqual(modelPoint, widenedPoint)
  // @ts-expect-error same-space API rejects mixed operands
  manhattanDistance(modelPoint, viewPoint)
  // @ts-expect-error same-space API rejects mixed operands
  manhattanDistance(viewPoint, modelPoint)
  // @ts-expect-error a widened second operand cannot erase first-operand space
  manhattanDistance(modelPoint, widenedPoint)
  // @ts-expect-error same-space API rejects mixed operands
  segment(modelPoint, viewPoint)
  // @ts-expect-error same-space API rejects mixed operands
  segment(viewPoint, modelPoint)
  // @ts-expect-error a widened second operand cannot erase first-operand space
  segment(modelPoint, widenedPoint)
  // @ts-expect-error same-space API rejects mixed operands
  horizontalOverlap(modelRect, viewRect)
  // @ts-expect-error same-space API rejects mixed operands
  horizontalOverlap(viewRect, modelRect)
  // @ts-expect-error a widened second operand cannot erase first-operand space
  horizontalOverlap(modelRect, widenedRect)
  // @ts-expect-error same-space API rejects mixed operands
  verticalOverlap(modelRect, viewRect)
  // @ts-expect-error same-space API rejects mixed operands
  verticalOverlap(viewRect, modelRect)
  // @ts-expect-error a widened second operand cannot erase first-operand space
  verticalOverlap(modelRect, widenedRect)
  // @ts-expect-error same-space API rejects mixed operands
  horizontalSeparation(modelRect, viewRect)
  // @ts-expect-error same-space API rejects mixed operands
  horizontalSeparation(viewRect, modelRect)
  // @ts-expect-error a widened second operand cannot erase first-operand space
  horizontalSeparation(modelRect, widenedRect)
  // @ts-expect-error same-space API rejects mixed operands
  verticalSeparation(modelRect, viewRect)
  // @ts-expect-error same-space API rejects mixed operands
  verticalSeparation(viewRect, modelRect)
  // @ts-expect-error a widened second operand cannot erase first-operand space
  verticalSeparation(modelRect, widenedRect)
  // @ts-expect-error same-space API rejects mixed operands
  relativeHorizontalPlacement(modelRect, viewRect)
  // @ts-expect-error same-space API rejects mixed operands
  relativeHorizontalPlacement(viewRect, modelRect)
  // @ts-expect-error a widened second operand cannot erase first-operand space
  relativeHorizontalPlacement(modelRect, widenedRect)
  // @ts-expect-error same-space API rejects mixed operands
  relativeVerticalPlacement(modelRect, viewRect)
  // @ts-expect-error same-space API rejects mixed operands
  relativeVerticalPlacement(viewRect, modelRect)
  // @ts-expect-error a widened second operand cannot erase first-operand space
  relativeVerticalPlacement(modelRect, widenedRect)
  // @ts-expect-error a point sequence cannot mix coordinate spaces
  removeAdjacentDuplicatePoints([modelPoint, viewPoint])
  // @ts-expect-error a point sequence cannot mix coordinate spaces
  removeCollinearPoints([modelPoint, viewPoint])
  // @ts-expect-error a point sequence cannot mix coordinate spaces
  normalizePointSequence([modelPoint, viewPoint])

  // Aliasing into a wider space must not hide mixed geometry from array APIs.
  // @ts-expect-error spatial brands must not permit implicit space widening
  const widenedPointAlias: Point<ModelSpace | ViewSpace> = modelPoint
  // @ts-expect-error spatial brands must not permit implicit space widening
  const widenedVectorAlias: Vector<ModelSpace | ViewSpace> = vector<ModelSpace>(1, 2)
  // @ts-expect-error spatial brands must not permit implicit space widening
  const widenedRectAlias: Rect<ModelSpace | ViewSpace> = modelRect
  // @ts-expect-error spatial brands must not permit implicit space widening
  const widenedSegmentAlias: Segment<ModelSpace | ViewSpace> = segment(modelPoint, modelPoint)

  return {
    model: genericSameSpaceApiContract(modelPoint, modelRect),
    view: genericSameSpaceApiContract(viewPoint, viewRect),
    screen: genericSameSpaceApiContract(screenPoint, screenRect),
    widenedPointAlias,
    widenedVectorAlias,
    widenedRectAlias,
    widenedSegmentAlias,
  }
}

export function genericSameSpaceApiContract<Space extends CoordinateSpace>(
  value: Point<Space>,
  rectangle: Rect<Space>,
): { segment: Segment<Space>; normalized: Point<Space>[] } {
  pointsApproximatelyEqual(value, value)
  manhattanDistance(value, value)
  horizontalOverlap(rectangle, rectangle)
  verticalOverlap(rectangle, rectangle)
  horizontalSeparation(rectangle, rectangle)
  verticalSeparation(rectangle, rectangle)
  relativeHorizontalPlacement(rectangle, rectangle)
  relativeVerticalPlacement(rectangle, rectangle)
  removeAdjacentDuplicatePoints([value, value])
  removeCollinearPoints([value, value])
  return { segment: segment(value, value), normalized: normalizePointSequence([value, value]) }
}
