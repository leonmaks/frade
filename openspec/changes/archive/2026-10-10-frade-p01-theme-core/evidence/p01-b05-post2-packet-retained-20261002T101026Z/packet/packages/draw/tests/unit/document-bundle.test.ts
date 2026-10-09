import { expect, it, vi } from 'vitest'
import type { Graph } from '@antv/x6'
import { parseDocument } from '../../src/document/schema'
import { loadDocument } from '../../src/document/graphAdapter'
import { serializeDocument, deserializeDocument } from '../../src/document/serialize'
const fixture = {
  format: 'frade-draw',
  version: 1,
  metadata: { id: 'd', name: 'D' },
  graph: {
    nodes: ['a', 'b'].map((id, i) => ({
      id,
      shape: 'rect',
      x: i * 300,
      y: 100,
      width: 180,
      height: 75,
      label: id,
    })),
    edges: [
      {
        id: 'bundle',
        bundle: { kind: 'empty' },
        source: { mode: 'floating', nodeId: 'a' },
        target: { mode: 'floating', nodeId: 'b' },
        vertices: [
          { x: 200, y: 130 },
          { x: 200, y: 200 },
        ],
        style: { stroke: '#404040', strokeWidth: 1 },
        targetMarker: null,
      },
      {
        id: 'ordinary',
        source: { mode: 'floating', nodeId: 'a' },
        target: { mode: 'floating', nodeId: 'b' },
        style: { stroke: '#FF0000', strokeWidth: 3 },
        targetMarker: { name: 'classic', size: 8 },
      },
    ],
  },
}
it('loads and encodes empty bundles without changing ordinary edges or geometry', () => {
  const doc = parseDocument(fixture)
  const graph = {
    createNode: vi.fn((value) => value),
    createEdge: vi.fn((value) => value),
    getCells: () => [],
    zoom: () => 1,
    translate: () => ({ tx: 0, ty: 0 }),
    zoomTo: () => {},
    isHistoryEnabled: () => false,
    disableHistory: () => {},
    enableHistory: () => {},
    resetCells: () => {},
    cleanSelection: () => {},
    cleanHistory: () => {},
  }
  loadDocument(graph as unknown as Graph, doc)
  expect(graph.createEdge.mock.calls[0][0]).toMatchObject({
    repositoryBundle: { kind: 'empty' },
    router: { name: 'orth' },
    source: { cell: 'a' },
    target: { cell: 'b' },
    vertices: doc.graph.edges[0].vertices,
    attrs: { line: { stroke: '#404040', strokeWidth: 1, sourceMarker: null, targetMarker: null } },
  })
  expect(graph.createEdge.mock.calls[1][0]).not.toHaveProperty('repositoryBundle')
  const saved = deserializeDocument(serializeDocument(doc))
  expect(saved.graph.edges).toEqual(doc.graph.edges)
})
it.each([{ kind: 'filled' }, { kind: 'empty', flows: ['f'] }, null])(
  'rejects unsupported bundle data instead of losing it: %j',
  (bundle) => {
    expect(() =>
      parseDocument({
        ...fixture,
        graph: { ...fixture.graph, edges: [{ ...fixture.graph.edges[0], bundle }] },
      }),
    ).toThrow()
  },
)

it('preserves canonical members and rejects duplicate/malformed references', () => {
  const refs = [{ repositoryId: 'repo', objectId: 'flow' }]
  const doc = parseDocument({
    ...fixture,
    graph: {
      ...fixture.graph,
      edges: [{ ...fixture.graph.edges[0], bundle: { kind: 'empty', integrationFlowRefs: refs } }],
    },
  })
  expect(
    deserializeDocument(serializeDocument(doc)).graph.edges[0].bundle?.integrationFlowRefs,
  ).toEqual(refs)
  for (const invalid of [
    [...refs, ...refs],
    [{ objectId: 'flow' }],
    [{ ...refs[0], path: 'file.yaml' }],
  ])
    expect(() =>
      parseDocument({
        ...fixture,
        graph: {
          ...fixture.graph,
          edges: [
            { ...fixture.graph.edges[0], bundle: { kind: 'empty', integrationFlowRefs: invalid } },
          ],
        },
      }),
    ).toThrow()
})

it('roundtrips free label geometry without derived descriptions', () => {
  const labelPosition = { distance: 0.75, offset: { x: 35, y: -160 } }
  const input = {
    ...fixture,
    graph: { ...fixture.graph, edges: [{ ...fixture.graph.edges[0], labelPosition }] },
  }
  expect(
    deserializeDocument(serializeDocument(parseDocument(input))).graph.edges[0],
  ).toHaveProperty('labelPosition', labelPosition)
  for (const invalid of [
    { distance: NaN, offset: { x: 0, y: 0 } },
    { distance: 0.5, offset: { x: Infinity, y: 0 } },
    { distance: '0.5', offset: { x: 0, y: 0 } },
  ])
    expect(() =>
      parseDocument({
        ...input,
        graph: { ...input.graph, edges: [{ ...input.graph.edges[0], labelPosition: invalid }] },
      }),
    ).toThrow()
})
