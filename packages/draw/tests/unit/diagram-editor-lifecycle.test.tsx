import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const instance = {
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
