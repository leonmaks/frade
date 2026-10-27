import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const instance = {
  options: { interacting: {} },
  getNodes: vi.fn(() => []),
  getEdges: vi.fn(() => []),
  getCells: vi.fn(() => []),
  getSelectedCells: vi.fn(() => []),
  getCellById: vi.fn(),
  select: vi.fn(),
  zoom: vi.fn(() => 1),
  zoomTo: vi.fn(),
  translate: vi.fn(() => ({ tx: 0, ty: 0 })),
  isHistoryEnabled: vi.fn(() => true),
  disableHistory: vi.fn(),
  enableHistory: vi.fn(),
  cleanHistory: vi.fn(),
  cleanSelection: vi.fn(),
  resetCells: vi.fn(),
  enableKeyboard: vi.fn(),
  disableKeyboard: vi.fn(),
  clearTransformWidgets: vi.fn(),
  off: vi.fn(),
  canUndo: vi.fn(() => false),
  canRedo: vi.fn(() => false),
  on: vi.fn(),
  dispose: vi.fn(),
  addNode: vi.fn(),
  clearCells: vi.fn(),
  removeCell: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
}
const createGraph = vi.fn(() => instance)
vi.mock('../../src/editor/createGraph', () => ({ createGraph }))
const hosts: HTMLDivElement[] = []
// jsdom has no layout/scroll implementation; browser suites exercise actual tab scrolling.
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
})
afterEach(() => {
  hosts.splice(0).forEach((host) => host.remove())
  vi.clearAllMocks()
})
describe('DiagramEditor lifecycle', () =>
  it('creates once per mount and disposes on unmount', async () => {
    const { DiagramEditor } = await import('../../src/editor/DiagramEditor')
    const host = document.createElement('div')
    hosts.push(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(<DiagramEditor />)
    })
    expect(createGraph).toHaveBeenCalledTimes(1)
    await act(async () => {
      root.unmount()
    })
    expect(instance.dispose).toHaveBeenCalledTimes(1)
  }))
