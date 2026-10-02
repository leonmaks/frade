import { describe, it, expect } from 'vitest'
import { deserializeDocument, serializeDocument } from '../../src/document/serialize'
import { nodeToCell, graphToDocument } from '../../src/document/graphAdapter'
const document = {
  format: 'frade-draw',
  version: 1,
  metadata: { id: 'diagram', name: 'Repository' },
  graph: {
    nodes: [
      {
        id: 'cell',
        shape: 'rect',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        label: 'Object',
        repositoryRef: { objectId: 'object-1', sourceId: 'services' },
      },
    ],
    edges: [],
  },
}
describe('portable repository references', () => {
  it('roundtrips explicit source identity without host paths or repository handles', () => {
    const parsed = deserializeDocument(JSON.stringify(document))
    expect(JSON.parse(serializeDocument(parsed))).toEqual(document)
    const node = parsed.graph.nodes[0],
      cell = nodeToCell(node)
    expect(cell.repositoryRef).toEqual(node.repositoryRef)
    const exported = graphToDocument(
      {
        getNodes: () => [
          {
            id: 'cell',
            shape: 'rect',
            getPosition: () => ({ x: 0, y: 0 }),
            getSize: () => ({ width: 100, height: 50 }),
            getProp: (key) => (key === 'repositoryRef' ? node.repositoryRef : undefined),
            attr: (key) => (key === 'label/text' ? 'Object' : undefined),
          },
        ],
        getEdges: () => [],
      },
      document.metadata,
    )
    expect(exported.graph.nodes[0].repositoryRef).toEqual(node.repositoryRef)
  })
  it('rejects malformed or authority-bearing references', () => {
    for (const ref of [
      { objectId: '' },
      { objectId: 'x', sourceId: '' },
      { objectId: 'x', repositoryId: 'other' },
      { objectId: 'x', path: 'C:/secret' },
    ])
      expect(() =>
        deserializeDocument(
          JSON.stringify({
            ...document,
            graph: {
              ...document.graph,
              nodes: [{ ...document.graph.nodes[0], repositoryRef: ref }],
            },
          }),
        ),
      ).toThrow()
  })
})
