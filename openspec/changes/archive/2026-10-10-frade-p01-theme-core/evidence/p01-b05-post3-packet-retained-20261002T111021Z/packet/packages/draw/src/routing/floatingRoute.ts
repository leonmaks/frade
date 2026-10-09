import { normalizeRoute } from '../geometry/normalizeRoute'
import { validateManhattanRoute } from '../geometry/validateManhattanRoute'
import {
  resolveFixedAttachment,
  resolveFloatingAttachment,
  type Point,
  type Rect,
  type ResolvedAttachment,
  type Side,
} from './floatingAttachment'
import { routeManhattan } from './manhattanRoute'
import { hasValidTerminalDirections } from './terminalPolicy'

export type TerminalSpec =
  { mode: 'floating'; previousSide?: Side } | { mode: 'fixed'; side: Side; offset: number }

export type FloatingRouteRequest = {
  sourceRect: Rect
  targetRect: Rect
  source?: TerminalSpec
  target?: TerminalSpec
  corridorCoordinate?: number
  /** @deprecated Unrelated figures never constrain diagram routing. Kept for API compatibility. */
  obstacles?: Rect[]
  clearance?: number
}

export type FloatingRoute = {
  points: Point[]
  source: ResolvedAttachment
  target: ResolvedAttachment
  usedDetour: boolean
  valid: boolean
  diagnostics: string[]
}

const center = (rect: Rect): Point => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 })
const resolve = (rect: Rect, toward: Point, terminal: TerminalSpec | undefined) =>
  terminal?.mode === 'fixed'
    ? resolveFixedAttachment(rect, terminal.side, terminal.offset)
    : resolveFloatingAttachment(rect, toward, terminal?.previousSide)

/**
 * Resolves rectangle-bound floating terminals and a deterministic Manhattan route.
 * A requested corridor first slides compatible opposite-side terminals; otherwise
 * it uses terminal escape stubs and an orthogonal detour.
 */
export function routeFloatingConnection(request: FloatingRouteRequest): FloatingRoute {
  const sourceTerminal = request.source ?? { mode: 'floating' as const }
  const targetTerminal = request.target ?? { mode: 'floating' as const }
  const clearance = request.clearance ?? 16
  const sourceCenter = center(request.sourceRect)
  const targetCenter = center(request.targetRect)
  let source = resolve(request.sourceRect, targetCenter, sourceTerminal)
  let target = resolve(request.targetRect, sourceCenter, targetTerminal)
  const corridor = request.corridorCoordinate

  if (
    corridor !== undefined &&
    sourceTerminal.mode === 'floating' &&
    targetTerminal.mode === 'floating'
  ) {
    if (
      source.side === 'right' &&
      target.side === 'left' &&
      inRange(corridor, request.sourceRect.y, request.sourceRect.y + request.sourceRect.height) &&
      inRange(corridor, request.targetRect.y, request.targetRect.y + request.targetRect.height)
    ) {
      source = resolveFixedAttachment(request.sourceRect, 'right', corridor)
      target = resolveFixedAttachment(request.targetRect, 'left', corridor)
      return complete([source.point, target.point], source, target, false, [])
    }
    if (
      source.side === 'left' &&
      target.side === 'right' &&
      inRange(corridor, request.sourceRect.y, request.sourceRect.y + request.sourceRect.height) &&
      inRange(corridor, request.targetRect.y, request.targetRect.y + request.targetRect.height)
    ) {
      source = resolveFixedAttachment(request.sourceRect, 'left', corridor)
      target = resolveFixedAttachment(request.targetRect, 'right', corridor)
      return complete([source.point, target.point], source, target, false, [])
    }
    if (
      source.side === 'bottom' &&
      target.side === 'top' &&
      inRange(corridor, request.sourceRect.x, request.sourceRect.x + request.sourceRect.width) &&
      inRange(corridor, request.targetRect.x, request.targetRect.x + request.targetRect.width)
    ) {
      source = resolveFixedAttachment(request.sourceRect, 'bottom', corridor)
      target = resolveFixedAttachment(request.targetRect, 'top', corridor)
      return complete([source.point, target.point], source, target, false, [])
    }
    if (
      source.side === 'top' &&
      target.side === 'bottom' &&
      inRange(corridor, request.sourceRect.x, request.sourceRect.x + request.sourceRect.width) &&
      inRange(corridor, request.targetRect.x, request.targetRect.x + request.targetRect.width)
    ) {
      source = resolveFixedAttachment(request.sourceRect, 'top', corridor)
      target = resolveFixedAttachment(request.targetRect, 'bottom', corridor)
      return complete([source.point, target.point], source, target, false, [])
    }
  }

  const sourceEscape = offset(source.point, source.outwardNormal, clearance)
  const targetEscape = offset(target.point, target.outwardNormal, clearance)
  const middle =
    corridor !== undefined && source.outwardNormal.y === 0 && target.outwardNormal.y === 0
      ? normalizeRoute([
          sourceEscape,
          { x: sourceEscape.x, y: corridor },
          { x: targetEscape.x, y: corridor },
          targetEscape,
        ])
      : corridor !== undefined && source.outwardNormal.x === 0 && target.outwardNormal.x === 0
        ? normalizeRoute([
            sourceEscape,
            { x: corridor, y: sourceEscape.y },
            { x: corridor, y: targetEscape.y },
            targetEscape,
          ])
        : routeManhattan(sourceEscape, targetEscape, [])
  return complete([source.point, ...middle, target.point], source, target, true, [])
}

function complete(
  points: Point[],
  source: ResolvedAttachment,
  target: ResolvedAttachment,
  usedDetour: boolean,
  obstacles: Rect[],
): FloatingRoute {
  const normalized = normalizeRoute(points)
  const validation = validateManhattanRoute(normalized, 1e-6, obstacles, {
    sourceDirection: source.outwardNormal,
    targetDirection: target.outwardNormal,
  })
  const terminalValid = hasValidTerminalDirections(normalized, source, target)
  return {
    points: normalized,
    source,
    target,
    usedDetour,
    valid: validation.valid && terminalValid,
    diagnostics: [...validation.issues, ...(terminalValid ? [] : ['TERMINAL_DIRECTION'])],
  }
}
const offset = (point: Point, normal: Point, distance: number): Point => ({
  x: point.x + normal.x * distance,
  y: point.y + normal.y * distance,
})
const inRange = (value: number, min: number, max: number) => value >= min && value <= max
