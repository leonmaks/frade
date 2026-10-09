import { Direction, type CoordinateSpace, type Point, type Rect } from '../../model'
import { EPSILON, assertFiniteResult, rectEdges } from '../../geometry'
import type { DirectionMask } from '../../terminal'
import type {
  FixedDisposition,
  OrderingBranch,
  RelativeGeometry,
  SelectedReason,
} from './contracts'

export const CARDINAL_ORDER = Object.freeze([
  Direction.WEST,
  Direction.NORTH,
  Direction.EAST,
  Direction.SOUTH,
])
export function opposite(direction: Direction): Direction {
  switch (direction) {
    case Direction.WEST:
      return Direction.EAST
    case Direction.NORTH:
      return Direction.SOUTH
    case Direction.EAST:
      return Direction.WEST
    case Direction.SOUTH:
      return Direction.NORTH
  }
}
export function fixedCandidate<S extends CoordinateSpace>(
  bounds: Rect<S>,
  fixed?: Point<S>,
): Direction | undefined {
  if (fixed === undefined) return undefined
  const edges = rectEdges(bounds)
  const difference = (name: string, value: number) =>
    assertFiniteResult('fixedCandidate', name, value)
  const west = difference('west', fixed.x - edges.left)
  const east = difference('east', fixed.x - edges.right)
  const north = difference('north', fixed.y - edges.top)
  const south = difference('south', fixed.y - edges.bottom)
  if (west < -EPSILON || east > EPSILON || north < -EPSILON || south > EPSILON) return undefined
  let candidate: Direction | undefined
  if (Math.abs(west) <= EPSILON) candidate = Direction.WEST
  else if (Math.abs(east) <= EPSILON) candidate = Direction.EAST
  if (Math.abs(north) <= EPSILON) candidate = Direction.NORTH
  else if (Math.abs(south) <= EPSILON) candidate = Direction.SOUTH
  return candidate
}
export function selectPreferences(
  geometry: RelativeGeometry,
  masks: readonly [DirectionMask, DirectionMask],
  candidates: readonly [Direction | undefined, Direction | undefined],
  fixedPresent: readonly [boolean, boolean],
) {
  const gaps = geometry.policyGaps
  const horizontal = gaps.west >= gaps.east ? Direction.WEST : Direction.EAST
  const vertical = gaps.north >= gaps.south ? Direction.NORTH : Direction.SOUTH
  const rawH = [horizontal, opposite(horizontal)] as const
  const rawV = [vertical, opposite(vertical)] as const
  const allowed = masks.map((mask) => CARDINAL_ORDER.filter((direction) => mask[direction]))
  const locked = candidates.map(
    (candidate, i) => allowed[i].length !== 1 && candidate !== undefined && masks[i][candidate],
  )
  const h = rawH.map((direction, i) =>
    locked[i] || masks[i][direction] ? direction : opposite(direction),
  )
  const v = rawV.map((direction, i) =>
    locked[i] || masks[i][direction] ? direction : opposite(direction),
  )
  const rows: Direction[][] = locked.map((lock, i) => (lock ? [] : [v[i], h[i]]))
  const hGap = gaps[horizontal]
  const vGap = gaps[vertical]
  let orderingBranch: OrderingBranch = 'overlap'
  if (hGap > 0 && vGap > 0 && masks[0][h[0]] && masks[1][v[1]]) {
    rows[0] = [h[0], v[0]]
    rows[1] = [v[1], h[1]]
    orderingBranch = 'source-horizontal-target-vertical'
  } else if (hGap > 0 && vGap > 0 && masks[0][v[0]] && masks[1][h[1]]) {
    rows[0] = [v[0], h[0]]
    rows[1] = [h[1], v[1]]
    orderingBranch = 'source-vertical-target-horizontal'
  } else if (vGap > 0) {
    rows[0] = [v[0], h[0]]
    rows[1] = [v[1], h[1]]
    orderingBranch = 'vertical'
  } else if (hGap > 0) {
    rows[0] = [h[0], v[0]]
    rows[1] = [h[1], v[1]]
    orderingBranch = 'horizontal'
  }
  const endpoints = masks.map((mask, i) => {
    const candidate = candidates[i]
    const fixedDisposition: FixedDisposition = !fixedPresent[i]
      ? 'absent'
      : candidate === undefined
        ? 'not-on-side'
        : mask[candidate]
          ? 'allowed'
          : 'filtered'
    const entries = [rows[i][0], rows[i][1], rows[1 - i][i], rows[1 - i][1 - i]]
    let list = [...new Set(entries)].filter(
      (direction): direction is Direction => direction !== undefined && mask[direction],
    )
    let selectedReason: SelectedReason = 'preference'
    if (list.length === 0) {
      list = [...allowed[i]]
      selectedReason = 'fallback'
    }
    if (allowed[i].length === 1) {
      list = [...allowed[i]]
      selectedReason = 'singleton'
    } else if (locked[i] && candidate !== undefined) {
      list = [candidate, ...list.filter((direction) => direction !== candidate)]
      selectedReason = 'fixed'
    }
    return Object.freeze({
      selected: list[0],
      fixedCandidate: candidate,
      fixedDisposition,
      rawHorizontal: rawH[i],
      rawVertical: rawV[i],
      adjustedHorizontal: h[i],
      adjustedVertical: v[i],
      orderedAllowedDirections: Object.freeze(list),
      selectedReason,
    })
  })
  return { endpoints, orderingBranch }
}
