import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../../src/segment-editing/floatingSegments', () => ({}))
vi.mock('../../src/routing/roundedConnector', () => ({}))

const use = vi.fn()
const graph = {
  use,
  bindKey: vi.fn(),
  removeCells: vi.fn(),
  getSelectedCells: vi.fn(() => []),
  undo: vi.fn(),
  redo: vi.fn(),
}
const Graph = vi.fn(() => graph)
vi.mock('@antv/x6', () => ({
  Graph,
  History: class History {
    constructor(_: unknown) {}
  },
  Selection: class Selection {
    constructor(_: unknown) {}
  },
  Transform: class Transform {
    constructor(_: unknown) {}
  },
  Keyboard: class Keyboard {
    constructor(_: unknown) {}
  },
  Export: class Export {
    constructor() {}
  },
}))

describe('createGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('creates one graph with floating boundary connections and lifecycle plugins', async () => {
    const { createGraph } = await import('../../src/editor/createGraph')
    expect(createGraph(document.createElement('div'))).toBe(graph)
    expect(Graph).toHaveBeenCalledWith(
      expect.objectContaining({
        connecting: expect.objectContaining({ anchor: 'center', connectionPoint: 'boundary' }),
      }),
    )
    expect(use).toHaveBeenCalledTimes(5)
    expect(graph.bindKey).toHaveBeenCalledWith(['backspace', 'delete'], expect.any(Function))
    expect(graph.bindKey).toHaveBeenCalledWith(['ctrl+z', 'meta+z'], expect.any(Function))
    expect(graph.bindKey).toHaveBeenCalledWith(['ctrl+y', 'meta+shift+z'], expect.any(Function))
  })
})
