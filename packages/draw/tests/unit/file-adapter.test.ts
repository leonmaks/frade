import { describe, expect, it, vi } from 'vitest'
import { downloadDocument, readDocument } from '../../src/document/fileAdapter'
const model = {
  format: 'frade-draw' as const,
  version: 1 as const,
  metadata: { id: 'd', name: 'diagram' },
  graph: { nodes: [], edges: [] },
}
describe('file adapter', () => {
  it('reads validated JSON from a browser File', async () => {
    const file = Object.assign(new Blob([JSON.stringify(model)], { type: 'application/json' }), {
      name: 'diagram.json',
      text: async () => JSON.stringify(model),
    })
    expect(await readDocument(file as File)).toEqual(model)
  })
  it('downloads JSON without requiring File System Access API', () => {
    const click = vi.fn()
    const element = Object.assign(document.createElement('span'), { click })
    vi.spyOn(document, 'createElement').mockReturnValueOnce(element as never)
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:test'),
      configurable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true })
    downloadDocument(model)
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
