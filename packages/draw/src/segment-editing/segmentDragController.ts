import { normalizeRoute } from '../geometry/normalizeRoute'
import {
  validateManhattanRoute,
  type RouteValidationContext,
} from '../geometry/validateManhattanRoute'
import type { Point, Rect } from '../routing/floatingAttachment'
import { beginDrag, requestCoordinate, translateSegment, type DragSession } from './dragSession'
import type { RoutedSegment } from './segments'

export type DragState = 'idle' | 'dragging' | 'committed' | 'cancelled'
export type HistoryAdapter = { begin(): void; commit(): void; rollback(): void }
export type AnimationFrameApi = {
  request(callback: FrameRequestCallback): number
  cancel(handle: number): void
}
export type SegmentDragOptions = {
  scale?: number
  snap?: number
  /** @deprecated Unrelated figures never constrain diagram routing. Kept for API compatibility. */
  obstacles?: Rect[]
  terminalContext?: RouteValidationContext
}

export class SegmentDragController {
  private session?: DragSession
  private state: DragState = 'idle'
  private pending?: number
  private requested?: number
  private current: Point[] = []

  constructor(
    private readonly history: HistoryAdapter,
    private readonly raf: AnimationFrameApi,
    private readonly options: SegmentDragOptions = {},
  ) {}

  begin(edgeId: string, segment: RoutedSegment, route: Point[], pointer: Point) {
    this.session = beginDrag(edgeId, segment, route, pointer)
    this.current = route.map((point) => ({ ...point }))
    this.state = 'dragging'
    this.history.begin()
    return this.session
  }

  move(pointer: Point, onUpdate: (route: Point[]) => void) {
    if (!this.session || this.state !== 'dragging') return
    this.requested = requestCoordinate(
      this.session,
      pointer,
      this.options.scale ?? 1,
      this.options.snap ?? 0,
    )
    if (this.pending !== undefined) return
    this.pending = this.raf.request(() => {
      this.pending = undefined
      this.apply(onUpdate)
    })
  }

  commit(onUpdate: (route: Point[]) => void) {
    if (!this.session || this.state !== 'dragging') return this.current
    if (this.pending !== undefined) {
      this.raf.cancel(this.pending)
      this.pending = undefined
      this.apply(onUpdate)
    }
    this.current = normalizeRoute(this.current)
    this.history.commit()
    this.state = 'committed'
    return this.current
  }

  cancel(onUpdate: (route: Point[]) => void) {
    if (!this.session || this.state !== 'dragging') return this.current
    if (this.pending !== undefined) this.raf.cancel(this.pending)
    this.pending = undefined
    this.current = this.session.originalRoute.map((point) => ({ ...point }))
    onUpdate(this.current)
    this.history.rollback()
    this.state = 'cancelled'
    return this.current
  }

  dispose(onUpdate: (route: Point[]) => void) {
    if (this.state === 'dragging') this.cancel(onUpdate)
    this.session = undefined
  }
  getState() {
    return this.state
  }
  getRoute() {
    return this.current.map((point) => ({ ...point }))
  }

  private apply(onUpdate: (route: Point[]) => void) {
    if (!this.session || this.requested === undefined) return
    const candidate = normalizeRoute(translateSegment(this.session, this.requested))
    const validation = validateManhattanRoute(candidate, 1e-6, [], this.options.terminalContext)
    if (!validation.valid) return
    this.current = candidate
    this.session.lastValidRoute = candidate.map((point) => ({ ...point }))
    onUpdate(this.current)
  }
}
