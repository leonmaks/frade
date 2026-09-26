import { describe, expect, it } from 'vitest'
import { deserializeDocument, serializeDocument } from '../../src/document/serialize'
import { parseDocument, type DiagramDocument } from '../../src/document/schema'
const document: DiagramDocument = {
  format: 'frade-draw',
  version: 1,
  metadata: { id: 'd1', name: 'Test' },
  graph: {
    nodes: [{ id: 'a', shape: 'rect', x: 0, y: 0, width: 100, height: 50, label: 'A' }],
    edges: [
      {
        id: 'e',
        source: { mode: 'floating', nodeId: 'a' },
        target: { mode: 'fixed', nodeId: 'a', portId: 'out' },
      },
    ],
  },
}
describe('document schema', () => {
  it('round-trips canonical local documents', () =>
    expect(deserializeDocument(serializeDocument(document))).toEqual(document))
  it('reads a version 1 Frade Designer document as Frade Draw', () =>
    expect(parseDocument({ ...document, format: 'frade-designer' })).toMatchObject({
      format: 'frade-draw',
      version: 1,
    }))
  it('rejects unsupported versions', () =>
    expect(() => deserializeDocument(JSON.stringify({ ...document, version: 2 }))).toThrow(
      'Unsupported document version',
    ))
  it('rejects invalid geometry', () =>
    expect(() =>
      deserializeDocument(
        JSON.stringify({
          ...document,
          graph: { ...document.graph, nodes: [{ ...document.graph.nodes[0], width: 0 }] },
        }),
      ),
    ).toThrow('Invalid node'))
  it('rejects malformed constraints', () =>
    expect(() =>
      deserializeDocument(
        JSON.stringify({
          ...document,
          graph: {
            ...document.graph,
            edges: [
              { ...document.graph.edges[0], constraints: [{ axis: 'z', coordinate: 1, order: 0 }] },
            ],
          },
        }),
      ),
    ).toThrow('Invalid edge constraints'))
})
