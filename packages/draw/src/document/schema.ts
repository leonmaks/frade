export type Point = { x: number; y: number }
export const diagramShapes = ['rect', 'rounded-rect', 'ellipse', 'diamond', 'text'] as const
export type DiagramShape = (typeof diagramShapes)[number]
export const styleKeys = [
  'fill',
  'stroke',
  'strokeWidth',
  'strokeDasharray',
  'opacity',
  'fillOpacity',
  'strokeOpacity',
  'rx',
  'ry',
  'fontSize',
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'textAnchor',
] as const
export type DiagramStyle = Partial<Record<(typeof styleKeys)[number], string | number>>
export type Attachment = (
  { mode: 'floating'; nodeId: string } | { mode: 'fixed'; nodeId: string; portId: string }
) & { offset?: Point }
export type DiagramPort = Point & { id: string }
export type RepositoryNodeReference = { objectId: string; sourceId?: string }
export type DiagramShadow = { color: string; opacity: number; dx: number; dy: number; blur: number }
export type DiagramNode = {
  shadow?: DiagramShadow
  repositoryRef?: RepositoryNodeReference
  id: string
  shape: DiagramShape
  x: number
  y: number
  width: number
  height: number
  label: string
  style?: DiagramStyle
  labelStyle?: DiagramStyle
  ports?: DiagramPort[]
}
export type DiagramEdge = {
  labelPosition?: { distance: number; offset: Point }
  bundle?: { kind: 'empty'; integrationFlowRefs?: { repositoryId: string; objectId: string }[] }
  id: string
  source: Attachment
  target: Attachment
  constraints?: Array<{ axis: 'x' | 'y'; coordinate: number; order: number }>
  vertices?: Point[]
  style?: DiagramStyle
  router?: 'normal' | 'manhattan'
  targetMarker?: { name: 'classic' | 'block' | 'diamond' | 'circle'; size: number } | null
}
export interface DiagramDocument {
  format: 'frade-draw'
  version: 1
  metadata: { id: string; name: string }
  graph: { nodes: DiagramNode[]; edges: DiagramEdge[] }
  viewport?: { zoom: number; pan: Point }
}

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message)
  return value as Record<string, unknown>
}
function text(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(message)
  return value
}
function finite(value: unknown, message: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(message)
  return value
}
function point(value: unknown, message: string): Point {
  const p = record(value, message)
  return { x: finite(p.x, message), y: finite(p.y, message) }
}
function style(value: unknown): DiagramStyle | undefined {
  if (value === undefined) return undefined
  const input = record(value, 'Invalid style'),
    result: DiagramStyle = {}
  for (const [key, val] of Object.entries(input)) {
    if (
      !(styleKeys as readonly string[]).includes(key) ||
      !(
        (typeof val === 'number' && Number.isFinite(val)) ||
        (typeof val === 'string' &&
          val.length <= 200 &&
          !/[<>\\]|url\s*\(|expression\s*\(/i.test(val))
      )
    ) {
      throw new Error('Invalid style')
    }
    result[key as (typeof styleKeys)[number]] = val as string | number
  }
  return result
}
function attachment(value: unknown): Attachment {
  const input = record(value, 'Invalid edge')
  const nodeId = text(input.nodeId, 'Invalid edge')
  let result: Attachment
  if (input.mode === 'floating') result = { mode: 'floating', nodeId }
  else if (input.mode === 'fixed')
    result = { mode: 'fixed', nodeId, portId: text(input.portId, 'Invalid edge') }
  else throw new Error('Invalid edge')
  if (input.offset !== undefined) result.offset = point(input.offset, 'Invalid terminal offset')
  return result
}

export function parseDocument(value: unknown): DiagramDocument {
  const input = record(value, 'Document must be an object')
  if (input.format !== 'frade-draw' && input.format !== 'frade-designer')
    throw new Error('Unsupported document format')
  if (input.version !== 1) throw new Error('Unsupported document version')
  const metadata = record(input.metadata, 'Invalid document structure')
  const graph = record(input.graph, 'Invalid document structure')
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges))
    throw new Error('Invalid document structure')
  const ids = new Set<string>()
  const cellId = (value: unknown) => {
    const id = text(value, 'Invalid cell ID')
    if (ids.has(id)) throw new Error('Duplicate cell ID')
    ids.add(id)
    return id
  }
  const nodes: DiagramNode[] = graph.nodes.map((value) => {
    const n = record(value, 'Invalid node')
    const id = cellId(n.id),
      pos = point(n, 'Invalid node')
    const width = finite(n.width, 'Invalid node'),
      height = finite(n.height, 'Invalid node')
    if (
      width <= 0 ||
      height <= 0 ||
      !diagramShapes.includes(n.shape as DiagramShape) ||
      typeof n.label !== 'string'
    )
      throw new Error('Invalid node')
    const node: DiagramNode = {
      id,
      shape: n.shape as DiagramShape,
      ...pos,
      width,
      height,
      label: n.label,
    }
    if (n.repositoryRef !== undefined) {
      const ref = record(n.repositoryRef, 'Invalid repository reference')
      if (Object.keys(ref).some((k) => !['objectId', 'sourceId'].includes(k)))
        throw Error('Invalid repository reference')
      node.repositoryRef = {
        objectId: text(ref.objectId, 'Invalid repository reference'),
        ...(ref.sourceId !== undefined
          ? { sourceId: text(ref.sourceId, 'Invalid source reference') }
          : {}),
      }
    }
    if (n.shadow !== undefined) {
      const shadow = record(n.shadow, 'Invalid shadow')
      if (
        Object.keys(shadow).some((k) => !['color', 'opacity', 'dx', 'dy', 'blur'].includes(k)) ||
        typeof shadow.color !== 'string' ||
        !/^#[0-9a-f]{6}$/i.test(shadow.color)
      )
        throw Error('Invalid shadow')
      const opacity = finite(shadow.opacity, 'Invalid shadow'),
        dx = finite(shadow.dx, 'Invalid shadow'),
        dy = finite(shadow.dy, 'Invalid shadow'),
        blur = finite(shadow.blur, 'Invalid shadow')
      if (
        opacity < 0 ||
        opacity > 100 ||
        Math.abs(dx) > 100 ||
        Math.abs(dy) > 100 ||
        blur < 0 ||
        blur > 100
      )
        throw Error('Invalid shadow')
      node.shadow = { color: shadow.color, opacity, dx, dy, blur }
    }
    if (n.style !== undefined) node.style = style(n.style)
    if (n.labelStyle !== undefined) node.labelStyle = style(n.labelStyle)
    if (n.ports !== undefined) {
      if (!Array.isArray(n.ports)) throw new Error('Invalid ports')
      const portIds = new Set<string>()
      node.ports = n.ports.map((value) => {
        const port = record(value, 'Invalid port'),
          id = text(port.id, 'Invalid port')
        if (portIds.has(id)) throw new Error('Duplicate port ID')
        portIds.add(id)
        return { id, ...point(port, 'Invalid port') }
      })
    }
    return node
  })
  const nodeIds = new Map(nodes.map((node) => [node.id, node]))
  const edges: DiagramEdge[] = graph.edges.map((value) => {
    const e = record(value, 'Invalid edge')
    const edge: DiagramEdge = {
      id: cellId(e.id),
      source: attachment(e.source),
      target: attachment(e.target),
    }
    if (e.labelPosition !== undefined) {
      const position = record(e.labelPosition, 'Invalid label position')
      edge.labelPosition = {
        distance: finite(position.distance, 'Invalid label distance'),
        offset: point(position.offset, 'Invalid label offset'),
      }
    }
    if (e.bundle !== undefined) {
      const bundle = record(e.bundle, 'Invalid bundle')
      if (
        bundle.kind !== 'empty' ||
        Object.keys(bundle).some((k) => !['kind', 'integrationFlowRefs'].includes(k))
      )
        throw Error('Unsupported bundle')
      edge.bundle = { kind: 'empty' }
      if (bundle.integrationFlowRefs !== undefined) {
        if (
          !Array.isArray(bundle.integrationFlowRefs) ||
          bundle.integrationFlowRefs.length > 100000
        )
          throw Error('Invalid bundle references')
        const seen = new Set<string>()
        edge.bundle.integrationFlowRefs = bundle.integrationFlowRefs.map((value) => {
          const ref = record(value, 'Invalid bundle reference')
          if (Object.keys(ref).length !== 2) throw Error('Invalid bundle reference')
          const canonical = {
              repositoryId: text(ref.repositoryId, 'Invalid bundle reference'),
              objectId: text(ref.objectId, 'Invalid bundle reference'),
            },
            key = JSON.stringify([canonical.repositoryId, canonical.objectId])
          if (seen.has(key)) throw Error('Duplicate bundle reference')
          seen.add(key)
          return canonical
        })
      }
    }
    for (const terminal of [edge.source, edge.target]) {
      const node = nodeIds.get(terminal.nodeId)
      if (!node) throw new Error('Dangling node reference')
      if (
        terminal.mode === 'fixed' &&
        node.ports &&
        !node.ports.some((p) => p.id === terminal.portId)
      )
        throw new Error('Dangling port reference')
    }
    if (e.constraints !== undefined) {
      if (!Array.isArray(e.constraints)) throw new Error('Invalid edge constraints')
      const orders = new Set<number>()
      edge.constraints = e.constraints.map((value) => {
        const c = record(value, 'Invalid edge constraints')
        const order = finite(c.order, 'Invalid edge constraints')
        if (
          (c.axis !== 'x' && c.axis !== 'y') ||
          !Number.isInteger(order) ||
          order < 0 ||
          orders.has(order)
        )
          throw new Error('Invalid edge constraints')
        orders.add(order)
        return { axis: c.axis, coordinate: finite(c.coordinate, 'Invalid edge constraints'), order }
      })
    }
    if (e.vertices !== undefined) {
      if (!Array.isArray(e.vertices)) throw new Error('Invalid vertices')
      edge.vertices = e.vertices.map((p) => point(p, 'Invalid vertex'))
    }
    if (e.style !== undefined) edge.style = style(e.style)
    if (e.router !== undefined) {
      if (e.router !== 'normal' && e.router !== 'manhattan') throw new Error('Invalid router')
      edge.router = e.router
    }
    if (e.targetMarker === null) edge.targetMarker = null
    else if (e.targetMarker !== undefined) {
      const marker = record(e.targetMarker, 'Invalid marker')
      if (!['classic', 'block', 'diamond', 'circle'].includes(String(marker.name)))
        throw new Error('Invalid marker')
      const size = finite(marker.size, 'Invalid marker')
      if (size <= 0) throw new Error('Invalid marker')
      edge.targetMarker = { name: marker.name as 'classic', size }
    }
    return edge
  })
  const document: DiagramDocument = {
    format: 'frade-draw',
    version: 1,
    metadata: {
      id: text(metadata.id, 'Invalid document structure'),
      name: text(metadata.name, 'Invalid document structure'),
    },
    graph: { nodes, edges },
  }
  if (input.viewport !== undefined) {
    const v = record(input.viewport, 'Invalid viewport'),
      zoom = finite(v.zoom, 'Invalid viewport')
    if (zoom <= 0) throw new Error('Invalid viewport')
    document.viewport = { zoom, pan: point(v.pan, 'Invalid viewport') }
  }
  return document
}
