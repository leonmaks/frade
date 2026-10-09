import {
  assertFiniteNumber,
  rect,
  type CoordinateSpace,
  type Rect,
  type Vector,
} from '../model'
import { EPSILON } from './numbers'
import { assertFiniteResult, assertValidRect, assertValidVector } from './validation'

export interface RectEdges {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

export enum RelativePlacement {
  BEFORE = 'before',
  OVERLAPPING = 'overlapping',
  AFTER = 'after',
}

export function rectEdges<Space extends CoordinateSpace>(value: Rect<Space>): RectEdges {
  assertValidRect('rectEdges', 'rect', value)
  return {
    left: value.x,
    top: value.y,
    right: assertFiniteResult('rectEdges', 'right', value.x + value.width),
    bottom: assertFiniteResult('rectEdges', 'bottom', value.y + value.height),
  }
}

function axisGap(firstStart: number, firstEnd: number, secondStart: number, secondEnd: number): number {
  for (const [field, value] of [
    ['firstStart', firstStart],
    ['firstEnd', firstEnd],
    ['secondStart', secondStart],
    ['secondEnd', secondEnd],
  ] as const) {
    assertFiniteNumber('axisGap', field, value)
  }
  const mathematicalGap =
    firstEnd < secondStart
      ? secondStart - firstEnd
      : secondEnd < firstStart
        ? firstStart - secondEnd
        : 0
  assertFiniteNumber('axisGap', 'result', mathematicalGap)
  return mathematicalGap <= EPSILON ? 0 : mathematicalGap
}

function axisPlacement(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
): RelativePlacement {
  if (axisGap(firstStart, firstEnd, secondStart, secondEnd) === 0) {
    return RelativePlacement.OVERLAPPING
  }
  return firstEnd < secondStart ? RelativePlacement.BEFORE : RelativePlacement.AFTER
}

export function horizontalSeparation<Space extends CoordinateSpace>(
  first: Rect<Space>,
  second: Rect<Space>,
): number {
  const a = rectEdges(first)
  const b = rectEdges(second)
  return axisGap(a.left, a.right, b.left, b.right)
}

export function verticalSeparation<Space extends CoordinateSpace>(
  first: Rect<Space>,
  second: Rect<Space>,
): number {
  const a = rectEdges(first)
  const b = rectEdges(second)
  return axisGap(a.top, a.bottom, b.top, b.bottom)
}

export function horizontalOverlap<Space extends CoordinateSpace>(
  first: Rect<Space>,
  second: Rect<Space>,
): boolean {
  return horizontalSeparation(first, second) === 0
}

export function verticalOverlap<Space extends CoordinateSpace>(
  first: Rect<Space>,
  second: Rect<Space>,
): boolean {
  return verticalSeparation(first, second) === 0
}

export function relativeHorizontalPlacement<Space extends CoordinateSpace>(
  first: Rect<Space>,
  second: Rect<Space>,
): RelativePlacement {
  const a = rectEdges(first)
  const b = rectEdges(second)
  return axisPlacement(a.left, a.right, b.left, b.right)
}

export function relativeVerticalPlacement<Space extends CoordinateSpace>(
  first: Rect<Space>,
  second: Rect<Space>,
): RelativePlacement {
  const a = rectEdges(first)
  const b = rectEdges(second)
  return axisPlacement(a.top, a.bottom, b.top, b.bottom)
}

export function translateRect<Space extends CoordinateSpace>(
  value: Rect<Space>,
  delta: Vector<NoInfer<Space>>,
): Rect<Space> {
  assertValidRect('translateRect', 'rect', value)
  assertValidVector('translateRect', 'delta', delta)
  const x = assertFiniteResult('translateRect', 'result.x', value.x + delta.x)
  const y = assertFiniteResult('translateRect', 'result.y', value.y + delta.y)
  return rect<Space>(x, y, value.width, value.height)
}
