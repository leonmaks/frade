import { describe, expect, it } from 'vitest'
import { deserializeDocument, serializeDocument } from '../../src/document/serialize'
import { SegmentDragController } from '../../src/segment-editing/segmentDragController'
import { extractSegments } from '../../src/segment-editing/segments'

describe('segment persistence and history', () => {
  it('persists canonical constraints without transient drag state', () => {
    const document = {
      format: 'frade-draw' as const,
      version: 1 as const,
      metadata: { id: 'd', name: 'D' },
      graph: {
        nodes: [
          { id: 'a', shape: 'rect' as const, x: 0, y: 0, width: 100, height: 60, label: 'A' },
        ],
        edges: [
          {
            id: 'e',
            source: { mode: 'floating' as const, nodeId: 'a' },
            target: { mode: 'fixed' as const, nodeId: 'a', portId: 'right' },
            constraints: [{ axis: 'y' as const, coordinate: 140, order: 0 }],
          },
        ],
      },
    }
    expect(deserializeDocument(serializeDocument(document))).toEqual(document)
    expect(JSON.stringify(document)).not.toContain('pointer')
  })
  it('commits one history operation for many moves and cancel makes none', () => {
    let begin = 0,
      commit = 0,
      rollback = 0,
      callback: FrameRequestCallback | undefined
    const controller = new SegmentDragController(
      { begin: () => begin++, commit: () => commit++, rollback: () => rollback++ },
      {
        request: (next) => {
          callback = next
          return 1
        },
        cancel: () => {
          callback = undefined
        },
      },
    )
    const route = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
    ]
    controller.begin('e', extractSegments(route)[0], route, { x: 50, y: 0 })
    for (let y = 1; y <= 100; y++) controller.move({ x: 50, y }, () => undefined)
    callback?.(0)
    controller.commit(() => undefined)
    expect({ begin, commit, rollback }).toEqual({ begin: 1, commit: 1, rollback: 0 })
    controller.begin('e', extractSegments(route)[0], route, { x: 50, y: 0 })
    controller.cancel(() => undefined)
    expect({ begin, commit, rollback }).toEqual({ begin: 2, commit: 1, rollback: 1 })
  })
})
