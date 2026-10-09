import { describe, expect, it } from 'vitest'
import { hasValidTerminalDirections } from '../../src/routing/terminalPolicy'
const source = { point: { x: 10, y: 20 }, side: 'right' as const, outwardNormal: { x: 1, y: 0 } }
const target = { point: { x: 100, y: 20 }, side: 'left' as const, outwardNormal: { x: -1, y: 0 } }
describe('terminal policy', () => {
  it('accepts an outward source and inward target', () =>
    expect(
      hasValidTerminalDirections(
        [
          { x: 10, y: 20 },
          { x: 100, y: 20 },
        ],
        source,
        target,
      ),
    ).toBe(true))
  it('rejects a reversed source exit', () =>
    expect(
      hasValidTerminalDirections(
        [
          { x: 10, y: 20 },
          { x: 0, y: 20 },
          { x: 100, y: 20 },
        ],
        source,
        target,
      ),
    ).toBe(false))
  it('rejects diagonal terminals', () =>
    expect(
      hasValidTerminalDirections(
        [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
          { x: 100, y: 20 },
        ],
        source,
        target,
      ),
    ).toBe(false))
})
