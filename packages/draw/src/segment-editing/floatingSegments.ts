import { Graph, edgeToolPresets } from '@antv/x6'
import { drawioEditingTokens } from './x6Adapter'
import { normalizeRoute } from '../geometry/normalizeRoute'
import { resolveSegmentDrag, type SegmentRouteRequest } from './resolveSegmentDrag'

class FloatingSegments extends edgeToolPresets.segments {
  private session?: Omit<SegmentRouteRequest, 'coordinate'> & {
    vertical: boolean
    pointerOffset: number
  }
  private selectionPath?: SVGPathElement
  update() {
    if (this.selectionPath)
      this.selectionPath.setAttribute('d', this.cellView.getConnectionPathData())
    return this.session ? this : super.update()
  }

  protected onRender() {
    const result = super.onRender()
    if (!this.selectionPath) {
      this.selectionPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      for (const [key, value] of Object.entries({
        class: 'frade-edge-selection',
        fill: 'none',
        stroke: drawioEditingTokens.selection,
        'stroke-width': '1',
        'stroke-dasharray': '3 3',
        'pointer-events': 'none',
      }))
        this.selectionPath.setAttribute(key, value)
    }
    this.selectionPath.setAttribute('d', this.cellView.getConnectionPathData())
    this.container.prepend(this.selectionPath)
    return result
  }

  protected renderHandle(
    ...args: Parameters<(typeof edgeToolPresets.segments.prototype)['renderHandle']>
  ) {
    const handle = super.renderHandle(...args)
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    group.classList.add('x6-edge-tool-segment')
    for (const [radius, fill, stroke] of [
      [9, 'transparent', 'none'],
      [5, drawioEditingTokens.fill, drawioEditingTokens.stroke],
    ] as const) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('r', String(radius))
      circle.setAttribute('fill', fill)
      circle.setAttribute('stroke', stroke)
      group.appendChild(circle)
    }
    handle.undelegateEvents()
    handle.container.replaceWith(group)
    handle.container = group as unknown as SVGRectElement
    handle.delegateEvents({ mousedown: 'onMouseDown', touchstart: 'onMouseDown' })
    this.updateHandle(handle, args[0], args[1])
    return handle
  }

  protected updateHandle(
    ...args: Parameters<(typeof edgeToolPresets.segments.prototype)['updateHandle']>
  ) {
    super.updateHandle(...args)
    const [handle, a, b] = args
    const vertical = Math.abs(a.x - b.x) < 1e-6
    if (vertical || Math.abs(a.y - b.y) < 1e-6) {
      // Native getClosestPoint can introduce subpixel drift and rotate a
      // horizontal pill by 90 degrees on a reversed rounded path.
      handle.container.setAttribute('transform', `translate(${(a.x + b.x) / 2},${(a.y + b.y) / 2})`)
      handle.container.setAttribute('cursor', vertical ? 'col-resize' : 'row-resize')
    }
  }

  protected onHandleChanged(
    args: Parameters<(typeof edgeToolPresets.segments.prototype)['onHandleChanged']>[0],
  ) {
    this.cellView.cell.setProp('constraints', this.cellView.cell.getVertices(), { ui: true })
    this.session = undefined
    super.onHandleChanged(args)
    this.graph.container.focus({ preventScroll: true })
  }

  protected onHandleChange(
    args: Parameters<(typeof edgeToolPresets.segments.prototype)['onHandleChange']>[0],
  ) {
    this.session = undefined
    const view = this.cellView,
      edge = view.cell
    const source = edge.getSourceNode(),
      target = edge.getTargetNode()
    const raw = [view.sourcePoint, ...this.getPoints(), view.targetPoint]
    const handleIndex = args.handle.options.index!
    const a = raw[handleIndex],
      b = raw[handleIndex + 1]
    if (
      a &&
      b &&
      source?.shape === 'rect' &&
      target?.shape === 'rect' &&
      !(edge.getSource() as { port?: string }).port &&
      !(edge.getTarget() as { port?: string }).port
    ) {
      const vertical = Math.abs(a.x - b.x) < 1e-6
      const points = normalizeRoute(raw)
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const index = points.findIndex((p, i) => {
        const q = points[i + 1]
        return (
          q &&
          (vertical
            ? Math.abs(p.x - q.x) < 1e-6 && Math.abs(mid.x - p.x) < 1e-6
            : Math.abs(p.y - q.y) < 1e-6 && Math.abs(mid.y - p.y) < 1e-6) &&
          mid.x >= Math.min(p.x, q.x) - 1e-6 &&
          mid.x <= Math.max(p.x, q.x) + 1e-6 &&
          mid.y >= Math.min(p.y, q.y) - 1e-6 &&
          mid.y <= Math.max(p.y, q.y) + 1e-6
        )
      })
      if (index >= 0)
        this.session = {
          points,
          index,
          vertical,
          source: source.getBBox().toJSON(),
          target: target.getBBox().toJSON(),
          pointerOffset: (() => {
            const event = this.normalizeEvent(args.e)
            const pointer = this.graph.clientToLocal(event.clientX, event.clientY)
            return vertical ? pointer.x - mid.x : pointer.y - mid.y
          })(),
        }
    }
    super.onHandleChange(args)
  }

  protected onHandleChanging(
    args: Parameters<(typeof edgeToolPresets.segments.prototype)['onHandleChanging']>[0],
  ) {
    if (!this.session) return super.onHandleChanging(args)
    const event = this.normalizeEvent(args.e)
    const pointer = this.graph.clientToLocal(event.clientX, event.clientY)
    const axis = this.session.vertical ? 'x' : 'y'
    const coordinate = pointer[axis] - this.session.pointerOffset
    const points = resolveSegmentDrag({ ...this.session, coordinate })
    if (!points) return
    const options = { ui: true, toolId: this.cid },
      edge = this.cellView.cell
    for (const terminal of ['source', 'target'] as const) {
      const r = this.session[terminal],
        p = terminal === 'source' ? points[0] : points.at(-1)!
      edge.setTerminal(
        terminal,
        {
          ...edge.getTerminal(terminal),
          anchor: {
            name: 'nodeCenter',
            args: { dx: p.x - r.x - r.width / 2, dy: p.y - r.y - r.height / 2 },
          },
          connectionPoint: { name: 'anchor' },
        },
        options,
      )
    }
    edge.setRouter('normal', undefined, options)
    edge.setVertices(points.slice(1, -1), options)
    const segment = points.findIndex(
      (p, i) =>
        points[i + 1] &&
        Math.abs(p[axis] - coordinate) < 1e-6 &&
        Math.abs(points[i + 1][axis] - coordinate) < 1e-6,
    )
    if (segment >= 0) this.updateHandle(args.handle, points[segment], points[segment + 1], 0)
  }
}

Graph.registerEdgeTool('floating-segments', FloatingSegments, true)
