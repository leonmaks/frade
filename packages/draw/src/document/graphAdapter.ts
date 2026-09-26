import type { Graph } from '@antv/x6'
import {
  diagramShapes,
  parseDocument,
  styleKeys,
  type Attachment,
  type DiagramDocument,
  type DiagramEdge,
  type DiagramNode,
  type DiagramShape,
  type DiagramStyle,
  type Point,
} from './schema'

type NodeLike = {
  id: string
  shape?: string
  getPosition(): Point
  getSize(): { width: number; height: number }
  attr?(name: string): unknown
  getProp?(name: string): unknown
  getPorts?(): Array<{ id?: string; group?: string }>
  getPortsPosition?(group: string): Record<string, { position: Point }>
}
type EdgeLike = {
  id: string
  attr?(name: string): unknown
  getSource?(): unknown
  getTarget?(): unknown
  getProp?(name: string): unknown
  getVertices?(): Point[]
}
type GraphLike = { getNodes(): NodeLike[]; getEdges(): EdgeLike[] }
function attachment(value: unknown): Attachment {
  const terminal = value as {
    cell: string
    port?: string
    anchor?: { name?: string; args?: { dx?: number; dy?: number } }
    connectionPoint?: { name?: string }
  }
  const result: Attachment = terminal.port
    ? { mode: 'fixed', nodeId: terminal.cell, portId: terminal.port }
    : { mode: 'floating', nodeId: terminal.cell }
  if (terminal.anchor?.name === 'nodeCenter' && terminal.connectionPoint?.name === 'anchor')
    result.offset = { x: terminal.anchor.args?.dx ?? 0, y: terminal.anchor.args?.dy ?? 0 }
  return result
}
function readStyle(
  cell: { attr?(name: string): unknown },
  selector: string,
): DiagramStyle | undefined {
  const style: DiagramStyle = {}
  for (const key of styleKeys) {
    const value = cell.attr?.(selector + '/' + key)
    if (typeof value === 'string' || typeof value === 'number') style[key] = value
  }
  return Object.keys(style).length ? style : undefined
}
function semanticShape(node: NodeLike): DiagramShape {
  const saved = node.getProp?.('diagramShape')
  if (diagramShapes.includes(saved as DiagramShape)) return saved as DiagramShape
  if (node.shape === 'polygon') return 'diamond'
  if (node.shape === 'rect' && Number(node.attr?.('body/rx')) > 0) return 'rounded-rect'
  if (
    node.shape === 'rect' &&
    node.attr?.('body/fill') === 'transparent' &&
    node.attr?.('body/stroke') === 'none'
  )
    return 'text'
  return diagramShapes.includes(node.shape as DiagramShape) ? (node.shape as DiagramShape) : 'rect'
}
export function graphToDocument(
  graph: GraphLike,
  metadata: DiagramDocument['metadata'],
  viewport?: DiagramDocument['viewport'],
): DiagramDocument {
  const nodes: DiagramNode[] = graph.getNodes().map((node) => {
    const ports = node.getPorts?.().map((port) => ({
      id: port.id!,
      ...(node.getPortsPosition?.(port.group ?? '')[port.id!]?.position ?? {
        x: node.getSize().width,
        y: node.getSize().height / 2,
      }),
    }))
    return {
      id: node.id,
      ...(node.getProp?.('repositoryRef')
        ? { repositoryRef: node.getProp('repositoryRef') as DiagramNode['repositoryRef'] }
        : {}),
      ...(node.getProp?.('diagramShadow')
        ? { shadow: node.getProp('diagramShadow') as DiagramNode['shadow'] }
        : {}),
      shape: semanticShape(node),
      ...node.getPosition(),
      ...node.getSize(),
      label: String(node.attr?.('label/text') ?? ''),
      style: readStyle(node, 'body'),
      labelStyle: readStyle(node, 'label'),
      ...(ports?.length ? { ports } : {}),
    }
  })
  const edges: DiagramEdge[] = graph.getEdges().map((edge) => {
    const rawRouter = edge.getProp?.('router') as { name?: string } | undefined
    const rawMarker = edge.attr?.('line/targetMarker') as DiagramEdge['targetMarker'] | undefined
    const result: DiagramEdge = {
      ...(edge.getProp?.('repositoryBundle')
        ? { bundle: edge.getProp('repositoryBundle') as DiagramEdge['bundle'] }
        : {}),
      id: edge.id,
      source: attachment(edge.getSource!()),
      target: attachment(edge.getTarget!()),
      constraints: canonicalConstraints(edge.getProp?.('constraints') ?? edge.getVertices?.()),
      style: readStyle(edge, 'line'),
    }
    const label = edge.getProp?.('labels') as
      Array<{ position?: DiagramEdge['labelPosition'] }> | undefined
    const automaticPosition = edge.getProp?.(
      'bundleAutoLabelPosition',
    ) as DiagramEdge['labelPosition']
    if (
      edge.getProp?.('repositoryBundle') &&
      label?.[0]?.position &&
      (!automaticPosition ||
        label[0].position.distance !== automaticPosition.distance ||
        label[0].position.offset.x !== automaticPosition.offset.x ||
        label[0].position.offset.y !== automaticPosition.offset.y)
    )
      result.labelPosition = {
        distance: label[0].position.distance,
        offset: { ...label[0].position.offset },
      }
    // Keep complete vertices; reducing them to alternating coordinates loses information.
    if (edge.getVertices) result.vertices = edge.getVertices().map(({ x, y }) => ({ x, y }))
    if (rawRouter?.name === 'orth') result.router = 'manhattan'
    if (rawRouter?.name === 'normal' || rawRouter?.name === 'manhattan')
      result.router = rawRouter.name
    if (rawMarker === null) result.targetMarker = null
    else if (rawMarker && typeof rawMarker === 'object')
      result.targetMarker = { name: rawMarker.name, size: rawMarker.size ?? 8 }
    return result
  })
  return {
    format: 'frade-draw',
    version: 1,
    metadata: { ...metadata },
    graph: { nodes, edges },
    viewport,
  }
}
function canonicalConstraints(value: unknown): DiagramEdge['constraints'] {
  if (!Array.isArray(value)) return undefined
  return value.flatMap((point, order) => {
    if (!point || typeof point !== 'object') return []
    const candidate = point as { x?: unknown; y?: unknown; axis?: unknown; coordinate?: unknown }
    if (
      (candidate.axis === 'x' || candidate.axis === 'y') &&
      typeof candidate.coordinate === 'number'
    )
      return [{ axis: candidate.axis, coordinate: candidate.coordinate, order }]
    if (typeof candidate.x === 'number' && typeof candidate.y === 'number')
      return [
        {
          axis: order % 2 === 0 ? 'x' : ('y' as const),
          coordinate: order % 2 === 0 ? candidate.x : candidate.y,
          order,
        },
      ]
    return []
  })
}

export function nodeToCell(node: DiagramNode): Parameters<Graph['createNode']>[0] {
  const shadow = node.shadow
  const filter = shadow
    ? 'drop-shadow(' +
      shadow.dx +
      'px ' +
      shadow.dy +
      'px ' +
      shadow.blur +
      'px ' +
      shadow.color +
      Math.round(shadow.opacity * 2.55)
        .toString(16)
        .padStart(2, '0') +
      ')'
    : 'none'
  const body = {
    style: { filter },
    magnet: true,
    fill: '#ffffff',
    stroke: '#334155',
    strokeWidth: 1.5,
    ...(node.shape === 'rounded-rect' ? { rx: 12, ry: 12 } : {}),
    ...(node.shape === 'diamond' ? { refPoints: '0,10 10,0 20,10 10,20' } : {}),
    ...(node.shape === 'text' ? { fill: 'transparent', stroke: 'none' } : {}),
    ...node.style,
  }
  return {
    id: node.id,
    shape: node.shape === 'diamond' ? 'polygon' : node.shape === 'ellipse' ? 'ellipse' : 'rect',
    diagramShape: node.shape,
    ...(shadow ? { diagramShadow: { ...shadow } } : {}),
    ...(node.repositoryRef ? { repositoryRef: { ...node.repositoryRef } } : {}),
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    attrs: { body, label: { text: node.label, ...node.labelStyle } },
    ...(node.ports?.length
      ? {
          ports: {
            groups: {
              document: { position: 'absolute', attrs: { circle: { r: 4, magnet: true } } },
            },
            items: node.ports.map(({ id, x, y }) => ({ id, group: 'document', args: { x, y } })),
          },
        }
      : {}),
  }
}
function terminalToCell(terminal: Attachment) {
  return {
    cell: terminal.nodeId,
    ...(terminal.mode === 'fixed' ? { port: terminal.portId } : {}),
    ...(terminal.offset
      ? {
          anchor: { name: 'nodeCenter', args: { dx: terminal.offset.x, dy: terminal.offset.y } },
          connectionPoint: { name: 'anchor' },
        }
      : {}),
  }
}
function legacyVertices(edge: DiagramEdge, nodes: DiagramNode[]): Point[] | undefined {
  if (!edge.constraints?.length) return undefined
  const source = nodes.find((n) => n.id === edge.source.nodeId)!
  let cursor = { x: source.x + source.width / 2, y: source.y + source.height / 2 }
  return [...edge.constraints]
    .sort((a, b) => a.order - b.order)
    .map(({ axis, coordinate }) => {
      cursor = { ...cursor, [axis]: coordinate }
      return { ...cursor }
    })
}
export function loadDocument(graph: Graph, value: unknown): DiagramDocument {
  const document = parseDocument(value)
  // Older files only stored port identities; provide deterministic fallback positions.
  for (const edge of document.graph.edges)
    for (const terminal of [edge.source, edge.target]) {
      if (terminal.mode === 'fixed') {
        const node = document.graph.nodes.find((n) => n.id === terminal.nodeId)!
        node.ports ??= []
        if (!node.ports.some((p) => p.id === terminal.portId))
          node.ports.push({ id: terminal.portId, x: node.width, y: node.height / 2 })
      }
    }
  const nodes = document.graph.nodes.map((node) => graph.createNode(nodeToCell(node)))
  const edges = document.graph.edges.map((edge) => {
    const vertices = edge.vertices ?? legacyVertices(edge, document.graph.nodes)
    return graph.createEdge({
      id: edge.id,
      ...(edge.bundle ? { repositoryBundle: { ...edge.bundle } } : {}),
      ...(edge.labelPosition
        ? { labels: [{ position: { ...edge.labelPosition, options: { absoluteOffset: true } } }] }
        : {}),
      source: terminalToCell(edge.source),
      target: terminalToCell(edge.target),
      vertices,
      constraints: edge.constraints,
      router: { name: edge.router === 'normal' ? 'normal' : 'orth' },
      connector: { name: 'frade-rounded', args: { radius: 8 } },
      attrs: {
        line: {
          stroke: edge.bundle ? '#404040' : '#2563eb',
          strokeWidth: edge.bundle ? 1 : 2,
          ...edge.style,
          ...(edge.bundle ? { sourceMarker: null } : {}),
          targetMarker:
            edge.targetMarker === undefined
              ? edge.bundle
                ? null
                : { name: 'classic', size: 8 }
              : edge.targetMarker,
        },
      },
    })
  })
  const previous = graph.getCells(),
    zoom = graph.zoom(),
    translation = graph.translate()
  const historyEnabled = graph.isHistoryEnabled()
  graph.disableHistory()
  try {
    graph.resetCells([...nodes, ...edges], { documentRestore: true })
    graph.zoomTo(document.viewport?.zoom ?? 1)
    graph.translate(document.viewport?.pan.x ?? 0, document.viewport?.pan.y ?? 0)
    graph.cleanSelection()
    graph.cleanHistory()
  } catch (error) {
    graph.resetCells(previous, { documentRestore: true })
    graph.zoomTo(zoom)
    graph.translate(translation.tx, translation.ty)
    throw error
  } finally {
    if (historyEnabled) graph.enableHistory()
  }
  return document
}
