import { describe, expect, it, vi } from 'vitest'
import type { Graph } from '@antv/x6'
import { loadDocument } from '../../src/document/graphAdapter'
import { parseDocument } from '../../src/document/schema'

const document = {
  format: 'frade-draw',
  version: 1,
  metadata: { id: 'new', name: 'New' },
  graph: {
    nodes: [{ id: 'n', shape: 'rect', x: 1, y: 2, width: 100, height: 50, label: 'Node' }],
    edges: [],
  },
  viewport: { zoom: 2, pan: { x: 10, y: 20 } },
}
function graphMock() {
  const originalCells = [{ id: 'original' }]
  return {
    originalCells,
    createNode: vi.fn((value) => value),
    createEdge: vi.fn((value) => value),
    getCells: vi.fn(() => originalCells),
    zoom: vi.fn(() => 1.5),
    translate: vi.fn(() => ({ tx: 4, ty: 5 })),
    isHistoryEnabled: vi.fn(() => true),
    disableHistory: vi.fn(),
    enableHistory: vi.fn(),
    resetCells: vi.fn(),
    zoomTo: vi.fn(),
    cleanSelection: vi.fn(),
    cleanHistory: vi.fn(),
  }
}
describe('document loading transaction', () => {
  it('validates before constructing or replacing cells', () => {
    const graph = graphMock()
    expect(() => loadDocument(graph as unknown as Graph, { ...document, version: 99 })).toThrow()
    expect(graph.createNode).not.toHaveBeenCalled()
    expect(graph.resetCells).not.toHaveBeenCalled()
    expect(graph.disableHistory).not.toHaveBeenCalled()
  })
  it('constructs cells before touching the active graph', () => {
    const graph = graphMock()
    graph.createNode.mockImplementationOnce(() => {
      throw new Error('construction failed')
    })
    expect(() => loadDocument(graph as unknown as Graph, document)).toThrow('construction failed')
    expect(graph.resetCells).not.toHaveBeenCalled()
    expect(graph.cleanHistory).not.toHaveBeenCalled()
  })
  it('restores previous cells and viewport when committing fails', () => {
    const graph = graphMock()
    graph.zoomTo.mockImplementationOnce(() => {
      throw new Error('viewport failed')
    })
    expect(() => loadDocument(graph as unknown as Graph, document)).toThrow('viewport failed')
    expect(graph.resetCells).toHaveBeenLastCalledWith(graph.originalCells, {
      documentRestore: true,
    })
    expect(graph.zoomTo).toHaveBeenLastCalledWith(1.5)
    expect(graph.translate).toHaveBeenLastCalledWith(4, 5)
    expect(graph.cleanHistory).not.toHaveBeenCalled()
    expect(graph.enableHistory).toHaveBeenCalledOnce()
  })
  it('resets selection/history on success and respects disabled history', () => {
    const graph = graphMock()
    graph.isHistoryEnabled.mockReturnValue(false)
    expect(loadDocument(graph as unknown as Graph, document)).toEqual(document)
    expect(graph.cleanSelection).toHaveBeenCalledOnce()
    expect(graph.cleanHistory).toHaveBeenCalledOnce()
    expect(graph.enableHistory).not.toHaveBeenCalled()
  })
  it('does not persist arbitrary markup or transient interaction state', () => {
    const parsed = parseDocument({
      ...document,
      pointer: { x: 1, y: 2 },
      graph: {
        nodes: [
          { ...document.graph.nodes[0], tools: ['resize'], markup: '<script/>', selected: true },
        ],
        edges: [],
      },
    })
    expect(parsed).toEqual(document)
  })
  it.each([
    { vertices: [{ x: Number.NaN, y: 3 }] },
    { source: { mode: 'floating', nodeId: 'n', offset: { x: 0, y: Infinity } } },
    {
      constraints: [
        { axis: 'x', coordinate: 1, order: 0 },
        { axis: 'y', coordinate: 2, order: 0 },
      ],
    },
    { router: 'unknown' },
    { targetMarker: { name: 'classic', size: -1 } },
  ])('rejects invalid optional edge data %j', (patch) => {
    expect(() =>
      parseDocument({
        ...document,
        graph: {
          ...document.graph,
          edges: [
            {
              id: 'e',
              source: { mode: 'floating', nodeId: 'n' },
              target: { mode: 'floating', nodeId: 'n' },
              ...patch,
            },
          ],
        },
      }),
    ).toThrow()
  })
})
