import { Graph } from '@antv/x6'

const container = document.createElement('div')
container.id = 'x6-spike'
container.style.width = '900px'
container.style.height = '600px'
document.querySelector('#root')!.append(container)

const graph = new Graph({
  container,
  grid: true,
  connecting: {
    allowNode: true,
    allowPort: false,
    allowBlank: false,
    allowLoop: false,
    anchor: 'center',
    connectionPoint: 'boundary',
    router: { name: 'manhattan', args: { padding: 20 } },
    connector: { name: 'rounded', args: { radius: 8 } },
  },
})
graph.addNode({ id: 'a', x: 80, y: 220, width: 120, height: 80, attrs: { body: { magnet: true } } })
graph.addNode({
  id: 'b',
  x: 600,
  y: 220,
  width: 120,
  height: 80,
  attrs: { body: { magnet: true } },
})
const edge = graph.addEdge({
  id: 'floating-edge',
  source: { cell: 'a' },
  target: { cell: 'b' },
  router: { name: 'manhattan', args: { padding: 20 } },
  connector: { name: 'rounded', args: { radius: 8 } },
  attrs: { line: { stroke: '#334155', strokeWidth: 3, targetMarker: { name: 'classic' } } },
})
edge.addTools([
  {
    name: 'segments',
    args: { precision: 0.5, threshold: 20, snapRadius: 10, removeRedundancies: false },
  },
])

declare global {
  interface Window {
    FRADeSpike?: {
      source: unknown
      target: unknown
      vertices: unknown[]
      routePoints: unknown[]
      handles: number
      svgPath: string | null
    }
  }
}
requestAnimationFrame(() => {
  const view = graph.findViewByCell(edge)
  window.FRADeSpike = {
    source: edge.getSource(),
    target: edge.getTarget(),
    vertices: edge.getVertices(),
    routePoints: (view as unknown as { routePoints: unknown[] }).routePoints,
    handles: container.querySelectorAll('.x6-edge-tool-segment').length,
    svgPath: container.querySelector('.x6-edge path')?.getAttribute('d') ?? null,
  }
})
