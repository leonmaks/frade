import { expect, it } from 'vitest'
import { serializeDocument, deserializeDocument, type DiagramDocument } from '@frade/draw/document'
import * as bridge from '../src/index'
const codec = { serialize: serializeDocument, deserialize: deserializeDocument }
it('CORE-014 bindings and cached labels roundtrip through the existing Draw document codec', () => {
  const diagram: DiagramDocument = {
    format: 'frade-draw',
    version: 1,
    metadata: { id: 'diagram', name: 'Detached' },
    graph: {
      nodes: [
        {
          id: 'node',
          shape: 'rect',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          label: 'Cached A',
          style: { stroke: 'red' },
        },
      ],
      edges: [],
    },
  }
  const binding = {
    elementId: 'node',
    kind: 'object' as const,
    state: 'DETACHED' as const,
    ref: { repositoryId: 'R', objectId: 'A' },
    snapshot: {
      ref: { repositoryId: 'R', objectId: 'A' },
      typeId: 'sample:App',
      name: 'Cached A',
      attributes: {},
      revision: 'r1' as any,
    },
    overrides: { stroke: 'red' },
  }
  const encoded = bridge.encodeRepositoryDiagram(diagram, [binding], codec)
  expect(encoded.ok).toBe(true)
  if (!encoded.ok) throw Error('encode')
  const decoded = bridge.decodeRepositoryDiagram(encoded.value, codec)
  expect(decoded.ok).toBe(true)
  if (!decoded.ok) throw Error('decode')
  decoded.value.diagram.graph.nodes[0].x = 200
  const standalone = deserializeDocument(serializeDocument(decoded.value.diagram))
  expect(standalone.graph.nodes[0]).toMatchObject({
    x: 200,
    label: 'Cached A',
    style: { stroke: 'red' },
  })
  expect(decoded.value.bindings[0].snapshot).toEqual(binding.snapshot)
})
