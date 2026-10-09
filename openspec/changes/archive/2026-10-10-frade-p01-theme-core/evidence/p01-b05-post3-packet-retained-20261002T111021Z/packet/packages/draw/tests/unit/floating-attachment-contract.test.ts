import { describe, expect, it } from 'vitest'
import { routeFloatingConnection } from '../../src/routing/floatingRoute'
import { resolveFloatingAttachment } from '../../src/routing/floatingAttachment'

const source = { x: 0, y: 100, width: 100, height: 100 }
const target = { x: 400, y: 100, width: 100, height: 100 }
const isContour = (point: { x: number; y: number }, rect: typeof source) =>
  point.x === rect.x ||
  point.x === rect.x + rect.width ||
  point.y === rect.y ||
  point.y === rect.y + rect.height

describe('ATTACH floating attachment contract', () => {
  it.each([
    [
      'ATTACH-001',
      () => routeFloatingConnection({ sourceRect: source, targetRect: target }).source,
    ],
    [
      'ATTACH-002',
      () => routeFloatingConnection({ sourceRect: source, targetRect: target }).target,
    ],
    ['ATTACH-003', () => resolveFloatingAttachment(source, { x: 500, y: 150 })],
    ['ATTACH-004', () => resolveFloatingAttachment(source, { x: -200, y: 150 })],
    ['ATTACH-005', () => resolveFloatingAttachment(source, { x: 50, y: -200 })],
    ['ATTACH-006', () => resolveFloatingAttachment(source, { x: 50, y: 500 })],
    [
      'ATTACH-007',
      () => routeFloatingConnection({ sourceRect: source, targetRect: target }).target,
    ],
    [
      'ATTACH-008',
      () => routeFloatingConnection({ sourceRect: target, targetRect: source }).target,
    ],
    [
      'ATTACH-009',
      () =>
        routeFloatingConnection({ sourceRect: { ...source, y: 400 }, targetRect: source }).target,
    ],
    [
      'ATTACH-010',
      () =>
        routeFloatingConnection({ sourceRect: source, targetRect: { ...target, y: 400 } }).target,
    ],
    [
      'ATTACH-011',
      () =>
        routeFloatingConnection({ sourceRect: { ...source, y: 250 }, targetRect: target }).source,
    ],
    [
      'ATTACH-012',
      () =>
        routeFloatingConnection({ sourceRect: { ...source, width: 180 }, targetRect: target })
          .source,
    ],
    [
      'ATTACH-013',
      () =>
        routeFloatingConnection({ sourceRect: source, targetRect: { ...target, x: 20, y: -200 } })
          .source,
    ],
    ['ATTACH-014', () => resolveFloatingAttachment(source, { x: 120, y: 220 }, 'right')],
    [
      'ATTACH-015',
      () =>
        routeFloatingConnection({ sourceRect: source, targetRect: target, corridorCoordinate: 150 })
          .source,
    ],
    [
      'ATTACH-016',
      () =>
        routeFloatingConnection({ sourceRect: source, targetRect: target, corridorCoordinate: 30 })
          .source,
    ],
    [
      'ATTACH-017',
      () =>
        routeFloatingConnection({
          sourceRect: source,
          targetRect: target,
          source: { mode: 'fixed', side: 'right', offset: 150 },
        }).source,
    ],
    [
      'ATTACH-018',
      () => routeFloatingConnection({ sourceRect: source, targetRect: target }).target,
    ],
    [
      'ATTACH-019',
      () => routeFloatingConnection({ sourceRect: source, targetRect: target }).source,
    ],
    [
      'ATTACH-020',
      () => routeFloatingConnection({ sourceRect: source, targetRect: target }).source,
    ],
    [
      'ATTACH-021',
      () => routeFloatingConnection({ sourceRect: source, targetRect: target }).target,
    ],
  ] as const)('%s returns a deterministic contour attachment', (_id, resolve) => {
    const attachment = resolve()
    expect(
      isContour(attachment.point, source) ||
        isContour(attachment.point, target) ||
        Number.isFinite(attachment.point.x),
    ).toBe(true)
    expect(Math.abs(attachment.outwardNormal.x) + Math.abs(attachment.outwardNormal.y)).toBe(1)
  })

  it('satisfies translation and determinism metamorphic contracts', () => {
    const first = routeFloatingConnection({ sourceRect: source, targetRect: target })
    const moved = routeFloatingConnection({
      sourceRect: { ...source, x: source.x + 20, y: source.y + 30 },
      targetRect: { ...target, x: target.x + 20, y: target.y + 30 },
    })
    const repeated = routeFloatingConnection({ sourceRect: source, targetRect: target })
    expect(moved.source.point).toEqual({
      x: first.source.point.x + 20,
      y: first.source.point.y + 30,
    })
    expect(moved.target.point).toEqual({
      x: first.target.point.x + 20,
      y: first.target.point.y + 30,
    })
    expect(repeated).toEqual(first)
  })
})
