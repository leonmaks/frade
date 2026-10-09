import { describe, expect, it } from 'vitest'
import {
  resolveFixedAttachment,
  resolveFloatingAttachment,
  resolveTargetAttachment,
} from '../../src/routing/floatingAttachment'
const rect = { x: 100, y: 100, width: 80, height: 60 }
describe('floating rectangular attachment', () => {
  it.each([
    [{ x: 400, y: 130 }, 'right', { x: 1, y: 0 }],
    [{ x: 0, y: 130 }, 'left', { x: -1, y: 0 }],
    [{ x: 140, y: 0 }, 'top', { x: 0, y: -1 }],
    [{ x: 140, y: 400 }, 'bottom', { x: 0, y: 1 }],
  ] as const)('resolves the %s contour side', (toward, side, normal) => {
    const attachment = resolveFloatingAttachment(rect, toward)
    expect(attachment.side).toBe(side)
    expect(attachment.outwardNormal).toEqual(normal)
  })
  it('clamps the attachment point to the real side interval', () =>
    expect(resolveFloatingAttachment(rect, { x: 400, y: 999 }).point).toEqual({ x: 180, y: 160 }))
  it('keeps the prior side near a tie boundary', () =>
    expect(resolveFloatingAttachment(rect, { x: 190, y: 160 }, 'right').side).toBe('right'))
  it('resolves target attachments from the opposite endpoint', () =>
    expect(resolveTargetAttachment(rect, { x: 0, y: 130 }).side).toBe('left'))
  it.each([
    ['right', { x: 180, y: 112 }],
    ['left', { x: 100, y: 148 }],
    ['top', { x: 164, y: 100 }],
    ['bottom', { x: 116, y: 160 }],
  ] as const)('keeps floating point on the %s contour', (side, expected) => {
    const toward =
      side === 'right' || side === 'left'
        ? { x: side === 'right' ? 400 : 0, y: expected.y }
        : { x: expected.x, y: side === 'top' ? 0 : 400 }
    expect(resolveFloatingAttachment(rect, toward).point).toEqual(expected)
  })
  it('is deterministic under equivalent translated geometry', () => {
    const first = resolveFloatingAttachment(rect, { x: 400, y: 130 })
    const translated = resolveFloatingAttachment(
      { x: 300, y: 240, width: 80, height: 60 },
      { x: 600, y: 270 },
    )
    expect(translated.side).toBe(first.side)
    expect(translated.outwardNormal).toEqual(first.outwardNormal)
    expect(translated.point).toEqual({ x: first.point.x + 200, y: first.point.y + 140 })
  })
  it.each([
    ['left', 120, { x: 100, y: 120 }],
    ['right', 140, { x: 180, y: 140 }],
    ['top', 130, { x: 130, y: 100 }],
    ['bottom', 150, { x: 150, y: 160 }],
  ] as const)('keeps an explicit fixed %s attachment', (side, offset, point) => {
    expect(resolveFixedAttachment(rect, side, offset)).toMatchObject({ side, point })
  })
})
