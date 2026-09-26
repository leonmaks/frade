import { describe, expect, it, vi } from 'vitest'
import { installSegmentAdapter, segmentEditingTokens } from '../../src/segment-editing/x6Adapter'
describe('X6 segment adapter', () =>
  it('uses centralized tokens and disposes tools', () => {
    const edge = { addTools: vi.fn(), removeTools: vi.fn() }
    const dispose = installSegmentAdapter(edge as never)
    expect(edge.addTools).toHaveBeenCalledWith([
      {
        name: 'floating-segments',
        args: expect.objectContaining({
          threshold: segmentEditingTokens.minEditableLength,
          snapRadius: segmentEditingTokens.snapRadius,
        }),
      },
      expect.objectContaining({
        name: 'source-arrowhead',
        args: expect.objectContaining({
          attrs: expect.objectContaining({ fill: '#29b6f2', 'stroke-width': 1 }),
        }),
      }),
      expect.objectContaining({
        name: 'target-arrowhead',
        args: expect.objectContaining({
          attrs: expect.objectContaining({ fill: '#29b6f2', 'stroke-width': 1 }),
        }),
      }),
    ])
    dispose()
    expect(edge.removeTools).toHaveBeenCalled()
  }))
