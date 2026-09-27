import { describe, expect, it } from 'vitest'

import { point } from '../../../../src/routing/model'

describe('R02 isolated test discovery', () => {
  it('runs in Node and can consume the read-only R01 contracts', () => {
    expect(typeof globalThis.document).toBe('undefined')
    expect(point(3, 4)).toEqual({ x: 3, y: 4 })
  })
})
