import type { Edge, Graph, Node } from '@antv/x6'
import { routeFloatingConnection, type FloatingRoute } from './floatingRoute'
import type { Rect } from './floatingAttachment'
import { movingRectangleRoute } from './movingRectangleRoute'
import { validateManhattanRoute } from '../geometry/validateManhattanRoute'

type NodeTerminal = { cell?: string; port?: string }
const bbox = (node: Node): Rect => {
  const value = node.getBBox()
  return { x: value.x, y: value.y, width: value.width, height: value.height }
}

/** Applies the deterministic floating route as X6 vertices while preserving X6 rendering. */
export function rerouteFloatingEdge(
  graph: Graph,
  edge: Edge,
  _geometryChanged = false,
): FloatingRoute | undefined {
  // Normalize every legacy/programmatic entry, including fixed ports and free previews.
  if (edge.getRouter()?.name === 'manhattan') edge.setRouter('orth', undefined, { routing: true })
  const source = edge.getSource() as NodeTerminal
  const target = edge.getTarget() as NodeTerminal
  if (!source.cell || !target.cell || source.port || target.port) return undefined
  const sourceNode = graph.getCellById(source.cell)
  const targetNode = graph.getCellById(target.cell)
  if (!sourceNode?.isNode() || !targetNode?.isNode()) return undefined
  const obstacles: Rect[] = []
  const resolveTerminals = sourceNode.shape === 'rect' && targetNode.shape === 'rect'
  const sourceRect = bbox(sourceNode),
    targetRect = bbox(targetNode)
  const route =
    (resolveTerminals ? movingRectangleRoute(sourceRect, targetRect, obstacles) : undefined) ??
    routeFloatingConnection({ sourceRect, targetRect, obstacles })
  if (resolveTerminals) {
    const bodies = [sourceRect, targetRect, ...obstacles].map((r) => ({
      x: r.x + 0.00001,
      y: r.y + 0.00001,
      width: r.width - 0.00002,
      height: r.height - 0.00002,
    }))
    const validation = validateManhattanRoute(route.points, 1e-6, bodies, {
      sourceDirection: route.source.outwardNormal,
      targetDirection: route.target.outwardNormal,
    })
    if (!validation.valid) {
      edge.setProp('routingDiagnostics', validation.issues)
      return { ...route, valid: false, diagnostics: validation.issues }
    }
  }
  if (!route.valid) {
    edge.setProp('routingDiagnostics', route.diagnostics)
    return route
  }
  if (resolveTerminals) {
    for (const terminal of ['source', 'target'] as const) {
      const r = terminal === 'source' ? sourceRect : targetRect,
        p = route[terminal].point
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
        { routing: true },
      )
    }
    // This polyline is already routed and validated. Running Manhattan again
    // would create a second, different path around stale terminal anchors.
    edge.setRouter('normal', undefined, { routing: true })
  }
  edge.setRouter('normal', undefined, { routing: true })
  edge.setVertices(route.points.slice(1, -1), { routing: true })
  edge.setProp('floatingRoute', route)
  edge.setProp('routingDiagnostics', [])
  return route
}

export function installFloatingRoutingLifecycle(graph: Graph) {
  let active = false
  const onGeometryChanged = ({ node }: { node: Node }) => {
    if (active) return
    active = true
    try {
      // An unrelated shape may cover an existing edge without changing it.
      // Only moving/resizing an endpoint authorizes recalculation of that edge.
      graph
        .getEdges()
        .filter((edge) => edge.getSourceCellId() === node.id || edge.getTargetCellId() === node.id)
        .forEach((edge) => rerouteFloatingEdge(graph, edge, true))
    } finally {
      active = false
    }
  }
  // Starting a magnet drag adds a temporary, incomplete edge. It must not
  // rewrite vertices of existing edges with already resolved terminal anchors.
  const onAdded = ({ edge, options }: { edge: Edge; options?: { documentRestore?: boolean } }) => {
    if (active || options?.documentRestore) return
    // Restored/duplicated/history-added manual bends must remain user-authored.
    const source = edge.getSource() as { anchor?: unknown }
    if (edge.getVertices().length || (edge.getRouter()?.name === 'normal' && source.anchor)) {
      if (edge.getRouter()?.name === 'manhattan')
        edge.setRouter('orth', undefined, { routing: true })
      return
    }
    active = true
    try {
      rerouteFloatingEdge(graph, edge)
    } finally {
      active = false
    }
  }
  // Interactive edges are added while their target is still a free point.
  // Resolve the committed connection once, then keep an explicit polyline so
  // later X6 view refreshes cannot reroute it around newly placed figures.
  const onConnected = ({ edge }: { edge: Edge }) => {
    if (active) return
    active = true
    try {
      rerouteFloatingEdge(graph, edge, true)
    } finally {
      active = false
    }
  }
  type RoutingListener = ((args: { node: Node }) => void) | ((args: { edge: Edge }) => void)
  const eventGraph = graph as unknown as {
    on?: (event: string, callback: RoutingListener) => void
    off?: (event: string, callback: RoutingListener) => void
  }
  eventGraph.on?.('edge:added', onAdded)
  eventGraph.on?.('edge:connected', onConnected)
  eventGraph.on?.('node:change:position', onGeometryChanged)
  eventGraph.on?.('node:change:size', onGeometryChanged)
  return () => {
    eventGraph.off?.('edge:added', onAdded)
    eventGraph.off?.('edge:connected', onConnected)
    eventGraph.off?.('node:change:position', onGeometryChanged)
    eventGraph.off?.('node:change:size', onGeometryChanged)
  }
}
