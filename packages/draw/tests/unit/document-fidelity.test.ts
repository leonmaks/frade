import { describe, expect, it } from 'vitest'
import { parseDocument } from '../../src/document/schema'
import { graphToDocument } from '../../src/document/graphAdapter'

const document = {
  format: 'frade-draw',
  version: 1,
  metadata: { id: 'd', name: 'Architecture' },
  graph: {
    nodes: [{ id: 'a', shape: 'rect', x: 0, y: 0, width: 100, height: 60, label: 'A' }],
    edges: [],
  },
}
describe('document fidelity regressions', () => {
  it('exports semantic shape, style, full vertices and terminal offsets', () => {
    const node = {
      id: 'a',
      shape: 'polygon',
      getPosition: () => ({ x: 10, y: 20 }),
      getSize: () => ({ width: 100, height: 60 }),
      attr: (key: string) =>
        (({ 'label/text': 'Diamond', 'body/fill': '#ff0000' }) as Record<string, string>)[key],
      getProp: (key: string) => (key === 'diagramShape' ? 'diamond' : undefined),
    }
    const edge = {
      ...node,
      id: 'e',
      getSource: () => ({
        cell: 'a',
        anchor: { name: 'nodeCenter', args: { dx: 50, dy: 0 } },
        connectionPoint: { name: 'anchor' },
      }),
      getTarget: () => ({ cell: 'a', port: 'in' }),
      getVertices: () => [
        { x: 200, y: 50 },
        { x: 200, y: 100 },
      ],
      getProp: () => undefined,
    }
    const result = graphToDocument(
      { getNodes: () => [node], getEdges: () => [edge] },
      document.metadata,
      { zoom: 1.5, pan: { x: 25, y: 35 } },
    )
    expect(result.graph.nodes[0]).toMatchObject({ shape: 'diamond', style: { fill: '#ff0000' } })
    expect(result.graph.edges[0]).toMatchObject({
      vertices: [
        { x: 200, y: 50 },
        { x: 200, y: 100 },
      ],
      source: { offset: { x: 50, y: 0 } },
    })
    expect(result.viewport).toEqual({ zoom: 1.5, pan: { x: 25, y: 35 } })
  })
  it.each([
    [
      'duplicate IDs',
      { graph: { ...document.graph, nodes: [document.graph.nodes[0], document.graph.nodes[0]] } },
    ],
    [
      'unknown shape',
      { graph: { ...document.graph, nodes: [{ ...document.graph.nodes[0], shape: 'html' }] } },
    ],
    [
      'dangling reference',
      {
        graph: {
          ...document.graph,
          edges: [
            {
              id: 'e',
              source: { mode: 'floating', nodeId: 'a' },
              target: { mode: 'floating', nodeId: 'missing' },
            },
          ],
        },
      },
    ],
    ['invalid viewport', { viewport: { zoom: 0, pan: { x: 0, y: 0 } } }],
    [
      'infinite size',
      { graph: { ...document.graph, nodes: [{ ...document.graph.nodes[0], width: Infinity }] } },
    ],
    [
      'invalid styles',
      {
        graph: {
          ...document.graph,
          nodes: [
            { ...document.graph.nodes[0], style: { fill: 'url(https://example.test/a.svg)' } },
          ],
        },
      },
    ],
  ])('rejects %s', (_name, patch) => {
    expect(() => parseDocument({ ...document, ...patch })).toThrow()
  })
  it('normalizes the legacy format without mutating caller input', () => {
    const legacy = { ...document, format: 'frade-designer' }
    expect(parseDocument(legacy).format).toBe('frade-draw')
    expect(legacy.format).toBe('frade-designer')
  })
})
