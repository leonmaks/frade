import type { Graph } from '@antv/x6'
import { validateManhattanRoute } from '../geometry/validateManhattanRoute'
import { installSegmentAdapter } from '../segment-editing/x6Adapter'
export type VisualFixture = {
  nodes: Array<{ id: string; x: number; y: number; width?: number; height?: number }>
  edges?: Array<{
    id?: string
    source: string
    target: string
    vertices?: Array<{ x: number; y: number }>
  }>
}
export type VisualApi = {
  reset(): void
  loadFixture(fixture: VisualFixture): void
  addRectangle(id: string, x: number, y: number): void
  moveNode(id: string, x: number, y: number): void
  resizeNode(id: string, width: number, height: number): void
  connect(source: string, target: string): string
  reconnectSource(edgeId: string, nodeId: string): void
  reconnectTarget(edgeId: string, nodeId: string): void
  selectEdge(edgeId: string): void
  moveSegment(edgeId: string, vertexIndex: number, coordinate: number): void
  getHandles(): number
  getSegments(edgeId: string): Array<{
    start: { x: number; y: number }
    end: { x: number; y: number }
    orientation: 'horizontal' | 'vertical'
    length: number
  }>
  getAttachments(edgeId: string): unknown
  getExportCapabilities(): { svg: boolean; png: boolean }
  getGraphSnapshot(): { nodes: number; edges: number }
  getRoute(edgeId: string): unknown[]
  validateRoute(edgeId: string): { valid: boolean; issues: string[] }
  getRenderSnapshot(edgeId: string): { svg: boolean; path: string | null }
  waitForStable(timeout?: number): Promise<void>
}
export function installVisualApi(graph: Graph) {
  const getView = (edgeId: string) =>
    graph.findViewByCell(graph.getCellById(edgeId)) as unknown as {
      routePoints?: { x: number; y: number }[]
      sourcePoint?: { x: number; y: number }
      targetPoint?: { x: number; y: number }
    } | null
  const getRoutePoints = (edgeId: string) => {
    const view = getView(edgeId)
    return view?.sourcePoint && view.targetPoint
      ? [view.sourcePoint, ...(view.routePoints ?? []), view.targetPoint]
      : []
  }
  const api: VisualApi = {
    reset: () => graph.clearCells(),
    loadFixture: (fixture) => {
      graph.clearCells()
      fixture.nodes.forEach((node) =>
        graph.addNode({
          id: node.id,
          x: node.x,
          y: node.y,
          width: node.width ?? 120,
          height: node.height ?? 70,
          shape: 'rect',
          attrs: { body: { magnet: true }, label: { text: node.id } },
        }),
      )
      fixture.edges?.forEach((edge) =>
        graph.addEdge({
          id: edge.id,
          source: { cell: edge.source },
          target: { cell: edge.target },
          vertices: edge.vertices,
          router: { name: 'orth' },
          connector: { name: 'frade-rounded', args: { radius: 8 } },
        }),
      )
    },
    addRectangle: (id, x, y) =>
      graph.addNode({
        id,
        x,
        y,
        width: 120,
        height: 70,
        shape: 'rect',
        attrs: { body: { magnet: true }, label: { text: id } },
      }),
    moveNode: (id, x, y) => {
      const node = graph.getCellById(id)
      if (node?.isNode()) node.position(x, y)
    },
    resizeNode: (id, width, height) => {
      const node = graph.getCellById(id)
      if (node?.isNode()) node.resize(width, height)
    },
    connect: (source, target) =>
      graph.addEdge({
        source: { cell: source },
        target: { cell: target },
        router: { name: 'orth' },
        connector: { name: 'frade-rounded', args: { radius: 8 } },
      }).id,
    reconnectSource: (edgeId, nodeId) => {
      const edge = graph.getCellById(edgeId)
      if (edge?.isEdge()) edge.setSource({ cell: nodeId })
    },
    reconnectTarget: (edgeId, nodeId) => {
      const edge = graph.getCellById(edgeId)
      if (edge?.isEdge()) edge.setTarget({ cell: nodeId })
    },
    selectEdge: (edgeId) => {
      graph.getEdges().forEach((edge) => edge.removeTools())
      const edge = graph.getCellById(edgeId)
      if (edge?.isEdge()) {
        graph.select(edge)
        installSegmentAdapter(edge)
      }
    },
    moveSegment: (edgeId, vertexIndex, coordinate) => {
      const edge = graph.getCellById(edgeId)
      if (edge?.isEdge()) {
        const vertices = edge.getVertices()
        const vertex = vertices[vertexIndex]
        if (vertex)
          edge.setVertices(
            vertices.map((point, index) =>
              index === vertexIndex ? { ...point, y: coordinate } : point,
            ),
            { ui: true },
          )
      }
    },
    getHandles: () => document.querySelectorAll('.x6-edge-tool-segment').length,
    getSegments: (edgeId) => {
      const points = getRoutePoints(edgeId)
      return points.slice(1).map((end, index) => {
        const start = points[index]
        const horizontal = Math.abs(start.y - end.y) <= 1e-6
        return {
          start,
          end,
          orientation: horizontal ? 'horizontal' : 'vertical',
          length: horizontal ? Math.abs(end.x - start.x) : Math.abs(end.y - start.y),
        }
      })
    },
    getAttachments: (edgeId) => graph.getCellById(edgeId)?.getProp('floatingRoute') ?? null,
    getExportCapabilities: () => ({
      svg: typeof (graph as unknown as { exportSVG?: unknown }).exportSVG === 'function',
      png: typeof (graph as unknown as { exportPNG?: unknown }).exportPNG === 'function',
    }),
    getGraphSnapshot: () => ({ nodes: graph.getNodes().length, edges: graph.getEdges().length }),
    getRoute: (edgeId) => getView(edgeId)?.routePoints ?? [],
    validateRoute: (edgeId) => validateManhattanRoute(getRoutePoints(edgeId)),
    getRenderSnapshot: (edgeId) => {
      const view = graph.findViewByCell(graph.getCellById(edgeId))
      const path = view?.container.querySelector('path')
      return { svg: !!path, path: path?.getAttribute('d') ?? null }
    },
    waitForStable: (timeout = 2000) =>
      new Promise((resolve, reject) => {
        const timer = window.setTimeout(
          () => reject(new Error('Visual stability timeout')),
          timeout,
        )
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            window.clearTimeout(timer)
            resolve()
          }),
        )
      }),
  }
  window.FRADE_VISUAL_TEST = api
  return () => {
    delete window.FRADE_VISUAL_TEST
  }
}
declare global {
  interface Window {
    FRADE_VISUAL_TEST?: VisualApi
  }
}
