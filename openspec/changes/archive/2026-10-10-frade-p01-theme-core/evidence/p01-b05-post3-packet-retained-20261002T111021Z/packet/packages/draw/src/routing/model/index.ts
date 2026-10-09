export { assertFiniteNumber, assertNonNegativeNumber } from './validation'
export { point, rect, segment, vector } from './primitives'
export { Direction, Orientation, SegmentClassification } from './vocabulary'
export type { CoordinateSpace, ModelSpace, ScreenSpace, ViewSpace } from './spaces'
export type { Point, Rect, Segment, Vector } from './primitives'

import type { Point, Vector } from './primitives'
import type { ModelSpace, ScreenSpace, ViewSpace } from './spaces'

export type ModelPoint = Point<ModelSpace>
export type ViewPoint = Point<ViewSpace>
export type ScreenPoint = Point<ScreenSpace>
export type ModelVector = Vector<ModelSpace>
export type ViewVector = Vector<ViewSpace>
export type ScreenVector = Vector<ScreenSpace>
