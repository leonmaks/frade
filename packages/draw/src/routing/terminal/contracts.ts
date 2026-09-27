import {
  Direction,
  point,
  rect,
  type CoordinateSpace,
  type Point,
  type Rect,
} from '../model'
import { assertFiniteResult, assertValidPoint, assertValidRect } from '../geometry'
import {
  assertValidPerimeterGeometry,
  perimeterGeometry,
  type PerimeterGeometry,
  type PerimeterKind,
} from '../perimeter'

export type PortConstraint = Readonly<Record<Direction, boolean>>
export type DirectionMask = PortConstraint

export const ALL_PORT_CONSTRAINT: PortConstraint = Object.freeze({
  [Direction.WEST]: true,
  [Direction.NORTH]: true,
  [Direction.EAST]: true,
  [Direction.SOUTH]: true,
})

export interface ConnectionConstraint {
  readonly x: number
  readonly y: number
  readonly perimeter: boolean
  readonly allowedDirections?: PortConstraint
}

export interface TerminalGeometry<Space extends CoordinateSpace> {
  readonly routingBounds: Rect<Space>
  readonly actualPerimeter: PerimeterGeometry<Space>
}

declare const terminalSpace: unique symbol

type SpaceOwned<Space extends CoordinateSpace> = {
  readonly [terminalSpace]?: (space: Space) => Space
}

export type FloatingBinding<Space extends CoordinateSpace> = SpaceOwned<Space> & {
  readonly mode: 'floating'
  readonly cellId: string
  readonly portConstraint?: PortConstraint
}

export type FixedBinding<Space extends CoordinateSpace> = SpaceOwned<Space> & {
  readonly mode: 'fixed'
  readonly cellId: string
  readonly constraint: ConnectionConstraint
  readonly portConstraint?: PortConstraint
}

export type AnchorBinding<Space extends CoordinateSpace> = SpaceOwned<Space> & {
  readonly mode: 'anchor'
  readonly point: Point<Space>
}

export type TerminalBinding<Space extends CoordinateSpace> =
  | FloatingBinding<Space>
  | FixedBinding<Space>
  | AnchorBinding<Space>

function assertRecord(operation: string, field: string, value: object): void {
  if (value === null || typeof value !== 'object') {
    throw new TypeError(`${operation}: ${field} must be an object`)
  }
}

function assertCellId(operation: string, value: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${operation}: cellId must be a non-empty string`)
  }
}

export function portConstraint(value: PortConstraint): PortConstraint {
  assertRecord('portConstraint', 'value', value)
  const result = {
    [Direction.WEST]: value[Direction.WEST],
    [Direction.NORTH]: value[Direction.NORTH],
    [Direction.EAST]: value[Direction.EAST],
    [Direction.SOUTH]: value[Direction.SOUTH],
  }
  for (const direction of Object.values(Direction)) {
    if (typeof result[direction] !== 'boolean') {
      throw new TypeError(`portConstraint: ${direction} must be boolean`)
    }
  }
  if (!Object.values(result).some(Boolean)) {
    throw new TypeError('portConstraint: at least one allowed direction is required')
  }
  return result
}

export function connectionConstraint(value: ConnectionConstraint): ConnectionConstraint {
  assertRecord('connectionConstraint', 'value', value)
  for (const field of ['x', 'y'] as const) {
    const coordinate = value[field]
    if (!Number.isFinite(coordinate) || coordinate < 0 || coordinate > 1) {
      throw new RangeError(
        `connectionConstraint: ${field} must be finite and within [0, 1]; received ${String(coordinate)}`,
      )
    }
  }
  if (typeof value.perimeter !== 'boolean') {
    throw new TypeError('connectionConstraint: perimeter must be boolean')
  }
  const allowedDirections =
    value.allowedDirections === undefined ? undefined : portConstraint(value.allowedDirections)
  return allowedDirections === undefined
    ? { x: value.x, y: value.y, perimeter: value.perimeter }
    : { x: value.x, y: value.y, perimeter: value.perimeter, allowedDirections }
}

export function floatingBinding<Space extends CoordinateSpace>(
  cellId: string,
  mask?: PortConstraint,
): FloatingBinding<Space> {
  assertCellId('floatingBinding', cellId)
  return mask === undefined
    ? { mode: 'floating', cellId }
    : { mode: 'floating', cellId, portConstraint: portConstraint(mask) }
}

export function fixedBinding<Space extends CoordinateSpace>(
  cellId: string,
  constraint: ConnectionConstraint,
  mask?: PortConstraint,
): FixedBinding<Space> {
  assertCellId('fixedBinding', cellId)
  const validatedConstraint = connectionConstraint(constraint)
  return mask === undefined
    ? { mode: 'fixed', cellId, constraint: validatedConstraint }
    : {
        mode: 'fixed',
        cellId,
        constraint: validatedConstraint,
        portConstraint: portConstraint(mask),
      }
}

export function anchorBinding<Space extends CoordinateSpace>(
  value: Point<Space>,
): AnchorBinding<Space> {
  assertValidPoint('anchorBinding', 'point', value)
  return { mode: 'anchor', point: point<Space>(value.x, value.y) }
}

export function assertValidTerminalBinding<Space extends CoordinateSpace>(
  operation: string,
  binding: TerminalBinding<Space>,
): void {
  if (binding === null || typeof binding !== 'object') {
    throw new TypeError(`${operation}: binding must be a terminal binding`)
  }
  switch (binding.mode) {
    case 'floating':
      assertCellId(operation, binding.cellId)
      if (binding.portConstraint !== undefined) portConstraint(binding.portConstraint)
      return
    case 'fixed':
      assertCellId(operation, binding.cellId)
      connectionConstraint(binding.constraint)
      if (binding.portConstraint !== undefined) portConstraint(binding.portConstraint)
      return
    case 'anchor':
      assertValidPoint(operation, 'binding.point', binding.point)
      return
    default:
      throw new TypeError(`${operation}: binding.mode is invalid`)
  }
}

function equalBounds<Space extends CoordinateSpace>(left: Rect<Space>, right: Rect<Space>): boolean {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  )
}

export function assertValidTerminalGeometry<Space extends CoordinateSpace>(
  operation: string,
  geometry: TerminalGeometry<Space>,
): void {
  if (geometry === null || typeof geometry !== 'object') {
    throw new TypeError(`${operation}: geometry must be terminal geometry`)
  }
  assertValidRect(operation, 'geometry.routingBounds', geometry.routingBounds)
  assertValidPerimeterGeometry(operation, 'geometry.actualPerimeter', geometry.actualPerimeter)
  if (!equalBounds(geometry.routingBounds, geometry.actualPerimeter.bounds)) {
    throw new TypeError(`${operation}: routing and actual perimeter bounds must match`)
  }
}

export function terminalGeometry<Space extends CoordinateSpace>(
  bounds: Rect<Space>,
  kind: PerimeterKind,
): TerminalGeometry<Space> {
  assertValidRect('terminalGeometry', 'bounds', bounds)
  const routingBounds = rect<Space>(bounds.x, bounds.y, bounds.width, bounds.height)
  const actualPerimeter = perimeterGeometry(bounds, kind)
  return { routingBounds, actualPerimeter }
}

export function routingBoundsCenter<Space extends CoordinateSpace>(
  geometry: TerminalGeometry<Space>,
): Point<Space> {
  assertValidTerminalGeometry('routingBoundsCenter', geometry)
  const x = assertFiniteResult(
    'routingBoundsCenter',
    'result.x',
    geometry.routingBounds.x + geometry.routingBounds.width / 2,
  )
  const y = assertFiniteResult(
    'routingBoundsCenter',
    'result.y',
    geometry.routingBounds.y + geometry.routingBounds.height / 2,
  )
  return point<Space>(x, y)
}

export function effectivePortConstraint<Space extends CoordinateSpace>(
  binding: TerminalBinding<Space>,
): PortConstraint {
  assertValidTerminalBinding('effectivePortConstraint', binding)
  if (binding.mode === 'fixed' && binding.constraint.allowedDirections !== undefined) {
    return portConstraint(binding.constraint.allowedDirections)
  }
  if (binding.mode !== 'anchor' && binding.portConstraint !== undefined) {
    return portConstraint(binding.portConstraint)
  }
  return ALL_PORT_CONSTRAINT
}
