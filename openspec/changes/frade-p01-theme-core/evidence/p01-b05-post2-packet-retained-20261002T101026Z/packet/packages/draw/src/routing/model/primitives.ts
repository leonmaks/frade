import { assertFiniteNumber, assertNonNegativeNumber } from './validation'
import type { CoordinateSpace, ModelSpace } from './spaces'

declare const pointSpace: unique symbol
declare const vectorSpace: unique symbol
declare const rectSpace: unique symbol

// Invariant phantom brands prevent aliases/arrays from silently widening coordinate spaces.
// They have no runtime field; factories still return readonly structural coordinate values.
export interface Point<Space extends CoordinateSpace = ModelSpace> {
  readonly x: number
  readonly y: number
  readonly [pointSpace]?: (space: Space) => Space
}

export interface Vector<Space extends CoordinateSpace = ModelSpace> {
  readonly x: number
  readonly y: number
  readonly [vectorSpace]?: (space: Space) => Space
}

export interface Rect<Space extends CoordinateSpace = ModelSpace> {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly [rectSpace]?: (space: Space) => Space
}

export interface Segment<Space extends CoordinateSpace = ModelSpace> {
  readonly start: Point<Space>
  readonly end: Point<Space>
}

export function point<Space extends CoordinateSpace = ModelSpace>(
  x: number,
  y: number,
): Point<Space> {
  assertFiniteNumber('point', 'x', x)
  assertFiniteNumber('point', 'y', y)
  return { x, y }
}

export function vector<Space extends CoordinateSpace = ModelSpace>(
  x: number,
  y: number,
): Vector<Space> {
  assertFiniteNumber('vector', 'x', x)
  assertFiniteNumber('vector', 'y', y)
  return { x, y }
}

export function rect<Space extends CoordinateSpace = ModelSpace>(
  x: number,
  y: number,
  width: number,
  height: number,
): Rect<Space> {
  assertFiniteNumber('rect', 'x', x)
  assertFiniteNumber('rect', 'y', y)
  assertNonNegativeNumber('rect', 'width', width)
  assertNonNegativeNumber('rect', 'height', height)
  return { x, y, width, height }
}

export function segment<Space extends CoordinateSpace = ModelSpace>(
  start: Point<Space>,
  end: Point<Space>,
): Segment<Space> {
  assertFiniteNumber('segment', 'start.x', start.x)
  assertFiniteNumber('segment', 'start.y', start.y)
  assertFiniteNumber('segment', 'end.x', end.x)
  assertFiniteNumber('segment', 'end.y', end.y)
  return { start: point<Space>(start.x, start.y), end: point<Space>(end.x, end.y) }
}
