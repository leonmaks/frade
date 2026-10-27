// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { DrawingDocument } from '@frade/draw'
import { sameDiagramContent } from '../src/diagramContent'
const node = {
  id: 'n',
  shape: 'rect' as const,
  x: 0,
  y: 0,
  width: 100,
  height: 50,
  label: 'Node',
  style: { fill: '#ffffff', stroke: '#000000' },
}
const document: Extract<DrawingDocument, { version: 2 }> = {
  format: 'frade-draw',
  version: 2,
  metadata: { id: 'd', name: 'Drawing' },
  pages: [
    {
      id: 'a',
      name: 'A',
      graph: { nodes: [node], edges: [] },
      viewport: { zoom: 1, pan: { x: 0, y: 0 } },
    },
    { id: 'b', name: 'B', graph: { nodes: [], edges: [] } },
  ],
}
const same = (a: unknown, b: unknown) =>
  sameDiagramContent('Drawing.frade', JSON.stringify(a), JSON.stringify(b))
describe('native complete-drawing dirty comparison', () => {
  it('ignores formatting, object key order and all page viewport navigation', () => {
    const other = structuredClone(document)
    other.pages[0].viewport = { zoom: 2, pan: { x: 300, y: 400 } }
    other.pages[0].graph.nodes[0].style = {
      stroke: '#000000',
      fill: '#ffffff',
    }
    expect(
      sameDiagramContent('Drawing.frade', JSON.stringify(document), JSON.stringify(other, null, 4)),
    ).toBe(true)
  })
  it('keeps page content, identity, order, names and metadata semantic', () => {
    for (const mutate of [
      (d: typeof document) => {
        d.pages[1].name = 'Changed'
      },
      (d: typeof document) => {
        d.pages[1].id = 'other'
      },
      (d: typeof document) => {
        d.pages.reverse()
      },
      (d: typeof document) => {
        d.pages[1].graph.nodes.push({ ...node, id: 'new' })
      },
      (d: typeof document) => {
        d.metadata.name = 'Other'
      },
    ]) {
      const other = structuredClone(document)
      mutate(other)
      expect(same(document, other)).toBe(false)
    }
  })
  it('ignores only the legacy viewport and retains malformed-input/XML behavior', () => {
    const legacy = {
      format: 'frade-draw',
      version: 1,
      metadata: document.metadata,
      graph: document.pages[0].graph,
    }
    expect(same(legacy, { ...legacy, viewport: { zoom: 2, pan: { x: 10, y: 20 } } })).toBe(true)
    expect(sameDiagramContent('d.frade', '{bad', '{}')).toBe(false)
    expect(
      same(document, {
        ...document,
        pages: [
          ...document.pages,
          {
            id: 'bad',
            name: 'bad',
            graph: { nodes: [{ ...node, width: 0 }], edges: [] },
          },
        ],
      }),
    ).toBe(false)
    expect(
      sameDiagramContent(
        'd.drawio',
        '<mxGraphModel dx="1" dy="2"/>',
        '<mxGraphModel dx="10" dy="20"/>',
      ),
    ).toBe(true)
    expect(
      sameDiagramContent('d.drawio', '<mxGraphModel/>', '<mxGraphModel><root/></mxGraphModel>'),
    ).toBe(false)
  })
})
