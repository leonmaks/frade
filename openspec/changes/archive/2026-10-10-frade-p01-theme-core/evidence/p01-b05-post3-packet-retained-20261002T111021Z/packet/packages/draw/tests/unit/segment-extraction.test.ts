import { describe, expect, it } from 'vitest'
import { deriveHandles, extractSegments } from '../../src/segment-editing/segments'
describe('segment extraction', () => {
  it('derives orientation from normalized route', () =>
    expect(
      extractSegments([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 30 },
      ]).map((s) => s.orientation),
    ).toEqual(['horizontal', 'vertical']))
  it('creates midpoint and correct cursor', () =>
    expect(
      deriveHandles('e', [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 80 },
      ]),
    ).toEqual([
      { id: 'e:0', segmentIndex: 0, position: { x: 50, y: 0 }, cursor: 'ns-resize' },
      { id: 'e:1', segmentIndex: 1, position: { x: 100, y: 40 }, cursor: 'ew-resize' },
    ]))
  it('omits short segments', () =>
    expect(
      deriveHandles('e', [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
      ]),
    ).toEqual([]))
})
