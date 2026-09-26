import { describe, expect, it } from 'vitest'
import {
  beginDrag,
  requestCoordinate,
  translateSegment,
} from '../../src/segment-editing/dragSession'
const segment = {
  index: 1,
  start: { x: 10, y: 20 },
  end: { x: 90, y: 20 },
  orientation: 'horizontal' as const,
  length: 80,
}
const route = [
  { x: 0, y: 0 },
  { x: 10, y: 20 },
  { x: 90, y: 20 },
  { x: 100, y: 0 },
]
describe('segment drag session', () => {
  it('projects pointer movement onto allowed axis from drag start', () => {
    const session = beginDrag('e', segment, route, { x: 40, y: 20 })
    expect(requestCoordinate(session, { x: 90, y: 60 })).toBe(60)
    expect(translateSegment(session, 60).slice(1, 3)).toEqual([
      { x: 10, y: 60 },
      { x: 90, y: 60 },
    ])
  })
  it('honors graph scale and one-axis snap', () => {
    const session = beginDrag('e', segment, route, { x: 40, y: 20 })
    expect(requestCoordinate(session, { x: 99, y: 60 }, 2, 10)).toBe(40)
  })
})
