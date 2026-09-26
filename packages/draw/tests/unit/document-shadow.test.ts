import { expect, it } from 'vitest'
import { parseDocument, type DiagramDocument } from '../../src/document/schema'
import { nodeToCell, graphToDocument } from '../../src/document/graphAdapter'
const shadow = { color: '#000000', opacity: 25, dx: 2, dy: 3, blur: 2 }
const document: DiagramDocument = {
  format: 'frade-draw',
  version: 1,
  metadata: { id: 'd', name: 'D' },
  graph: {
    nodes: [{ id: 'a', shape: 'rect', x: 10, y: 20, width: 180, height: 75, label: 'A', shadow }],
    edges: [],
  },
}
it('roundtrips portable shadow and renders a CSS drop-shadow without resource references', () => {
  const node = parseDocument(document).graph.nodes[0]
  const cell = nodeToCell(node)
  expect(cell.attrs?.body.style).toEqual({ filter: 'drop-shadow(2px 3px 2px #00000040)' })
  const result = graphToDocument(
    {
      getEdges: () => [],
      getNodes: () => [
        {
          id: 'a',
          shape: 'rect',
          getPosition: () => ({ x: 10, y: 20 }),
          getSize: () => ({ width: 180, height: 75 }),
          getProp: (key) => (key === 'diagramShadow' ? cell.diagramShadow : undefined),
          attr: (key) => (key === 'label/text' ? 'A' : undefined),
        },
      ],
    },
    document.metadata,
  )
  expect(result.graph.nodes[0].shadow).toEqual(shadow)
  expect(parseDocument(result).graph.nodes[0].shadow).toEqual(shadow)
  expect(
    parseDocument({ ...document, graph: { nodes: [{ ...node, shadow: undefined }], edges: [] } })
      .graph.nodes[0].shadow,
  ).toBeUndefined()
})
it.each([
  { ...shadow, color: 'url(https://example.com)' },
  { ...shadow, opacity: 101 },
  { ...shadow, dx: Infinity },
  { ...shadow, blur: -1 },
  { ...shadow, extra: 'x' },
])('rejects invalid shadow %j', (shadow) => {
  expect(() =>
    parseDocument({
      ...document,
      graph: { ...document.graph, nodes: [{ ...document.graph.nodes[0], shadow }] },
    }),
  ).toThrow('Invalid shadow')
})
