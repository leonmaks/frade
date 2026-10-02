import { describe, expect, it } from 'vitest'
import { graphToDocument } from '../../src/document/graphAdapter'
describe('graph document adapter', () =>
  it('persists floating and fixed terminals without resolved coordinates', () => {
    const node = {
      id: 'a',
      shape: 'rect',
      getPosition: () => ({ x: 4, y: 5 }),
      getSize: () => ({ width: 80, height: 40 }),
      attr: () => 'A',
    }
    const edge = {
      id: 'e',
      getPosition: () => ({ x: 0, y: 0 }),
      getSize: () => ({ width: 0, height: 0 }),
      getSource: () => ({ cell: 'a' }),
      getTarget: () => ({ cell: 'b', port: 'in' }),
      getProp: () => undefined,
    }
    expect(
      graphToDocument({ getNodes: () => [node], getEdges: () => [edge] }, { id: 'd', name: 'D' })
        .graph.edges[0],
    ).toEqual({
      id: 'e',
      source: { mode: 'floating', nodeId: 'a' },
      target: { mode: 'fixed', nodeId: 'b', portId: 'in' },
      constraints: undefined,
    })
    const withVertices = {
      ...edge,
      getVertices: () => [
        { x: 10, y: 20 },
        { x: 30, y: 20 },
      ],
    }
    expect(
      graphToDocument(
        { getNodes: () => [node], getEdges: () => [withVertices] },
        { id: 'd', name: 'D' },
      ).graph.edges[0].constraints,
    ).toEqual([
      { axis: 'x', coordinate: 10, order: 0 },
      { axis: 'y', coordinate: 20, order: 1 },
    ])
  }))

it('persists only manual bundle label geometry, never derived descriptions or automatic placement', () => {
  const automatic = { distance: 0.5, offset: { x: 0, y: -48 } }
  let position = automatic
  const edge = {
    id: 'bundle',
    getSource: () => ({ cell: 'a' }),
    getTarget: () => ({ cell: 'b' }),
    getProp: (key: string) =>
      (
        ({
          repositoryBundle: { kind: 'empty' },
          bundleAutoLabelPosition: automatic,
          labels: [{ position, attrs: { label: { text: 'Derived flow description' } } }],
        }) as Record<string, unknown>
      )[key],
  }
  const graph = { getNodes: () => [], getEdges: () => [edge] },
    metadata = { id: 'd', name: 'D' }
  expect(graphToDocument(graph, metadata).graph.edges[0]).not.toHaveProperty('labelPosition')
  position = { distance: 0.7, offset: { x: 40, y: -120 } }
  const saved = graphToDocument(graph, metadata)
  expect(saved.graph.edges[0].labelPosition).toEqual(position)
  expect(JSON.stringify(saved)).not.toContain('Derived flow description')
})
