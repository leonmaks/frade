import { describe, expect, it } from 'vitest'
import { SegmentDragController } from '../../src/segment-editing/segmentDragController'
import { extractSegments } from '../../src/segment-editing/segments'

const route = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
]
const segment = extractSegments(route)[0]
const createRaf = () => {
  let callback: FrameRequestCallback | undefined
  return {
    api: {
      request: (next: FrameRequestCallback) => {
        callback = next
        return 1
      },
      cancel: () => {
        callback = undefined
      },
    },
    flush: () => callback?.(0),
  }
}

describe('segment drag controller', () => {
  it('coalesces pointer moves and flushes the last coordinate on commit', () => {
    const raf = createRaf()
    const history = { begin: 0, commit: 0, rollback: 0 }
    const controller = new SegmentDragController(
      {
        begin: () => history.begin++,
        commit: () => history.commit++,
        rollback: () => history.rollback++,
      },
      raf.api,
    )
    const updates: number[] = []
    controller.begin('e', segment, route, { x: 50, y: 0 })
    controller.move({ x: 80, y: 10 }, (next) => updates.push(next[0].y))
    controller.move({ x: 80, y: 20 }, (next) => updates.push(next[0].y))
    controller.commit((next) => updates.push(next[0].y))
    expect(updates).toEqual([20])
    expect(history).toEqual({ begin: 1, commit: 1, rollback: 0 })
  })
  it('projects and snaps only the perpendicular axis', () => {
    const raf = createRaf()
    const controller = new SegmentDragController(
      { begin() {}, commit() {}, rollback() {} },
      raf.api,
      { scale: 2, snap: 10 },
    )
    controller.begin('e', segment, route, { x: 50, y: 0 })
    let result = route
    controller.move({ x: 170, y: 34 }, (next) => {
      result = next
    })
    raf.flush()
    expect(result[0].y).toBe(20)
    expect(result[1].y).toBe(20)
  })
  it('crosses unrelated objects and cancellation restores the original route', () => {
    const raf = createRaf()
    const controller = new SegmentDragController(
      { begin() {}, commit() {}, rollback() {} },
      raf.api,
      { obstacles: [{ x: 0, y: 30, width: 100, height: 20 }] },
    )
    controller.begin('e', segment, route, { x: 50, y: 0 })
    let emitted = false
    controller.move({ x: 50, y: 40 }, () => {
      emitted = true
    })
    raf.flush()
    expect(emitted).toBe(true)
    const restored = controller.cancel(() => undefined)
    expect(restored).toEqual(route)
  })
})
