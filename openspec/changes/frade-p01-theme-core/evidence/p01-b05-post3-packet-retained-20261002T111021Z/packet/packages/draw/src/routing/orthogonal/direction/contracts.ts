import type { CoordinateSpace, Direction, Point, Rect } from '../../model'
import type { DirectionMask } from '../../terminal'

export interface DirectionOptions<S extends CoordinateSpace> {
  readonly sourceMask?: DirectionMask
  readonly targetMask?: DirectionMask
  readonly fixedSource?: Point<S>
  readonly fixedTarget?: Point<S>
}
export type Quadrant = 0 | 1 | 2 | 3
export interface Separation {
  readonly horizontal: number
  readonly vertical: number
}
export interface RelativeGeometry {
  readonly quadrant: Quadrant
  readonly signedGaps: Readonly<Record<Direction, number>>
  readonly policyGaps: Readonly<Record<Direction, number>>
  readonly separation: Separation
  readonly overlaps: Readonly<{ horizontal: boolean; vertical: boolean }>
}
export type OrderingBranch =
  | 'source-horizontal-target-vertical'
  | 'source-vertical-target-horizontal'
  | 'vertical'
  | 'horizontal'
  | 'overlap'
export type SelectedReason = 'singleton' | 'fixed' | 'preference' | 'fallback'
export type FixedDisposition = 'absent' | 'not-on-side' | 'allowed' | 'filtered'
export interface EndpointEvidence {
  readonly bounds: Pick<Rect<CoordinateSpace>, 'x' | 'y' | 'width' | 'height'>
  readonly fixedPoint?: Pick<Point<CoordinateSpace>, 'x' | 'y'>
  readonly mask: DirectionMask
  readonly fixedCandidate?: Direction
  readonly fixedDisposition: FixedDisposition
  readonly rawHorizontal: Direction
  readonly rawVertical: Direction
  readonly adjustedHorizontal: Direction
  readonly adjustedVertical: Direction
  readonly orderedAllowedDirections: readonly Direction[]
  readonly selectedReason: SelectedReason
}
declare const resolutionSpace: unique symbol
export interface DirectionResolution<S extends CoordinateSpace = CoordinateSpace> {
  // Scalar evidence belongs to the input space without creating geometry primitives.
  readonly [resolutionSpace]?: S
  readonly sourceDirection: Direction
  readonly targetDirection: Direction
  readonly quadrant: Quadrant
  readonly separation: Separation
  readonly preferenceEvidence: RelativeGeometry & {
    readonly source: EndpointEvidence
    readonly target: EndpointEvidence
    readonly orderingBranch: OrderingBranch
  }
}
