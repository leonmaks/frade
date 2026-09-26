import { expect, it } from 'vitest'
import * as bridge from '../src/index'
it('visual overrides dominate computed status style without changing geometry', () => {
  const binding = {
    elementId: 'node',
    kind: 'object',
    state: 'DETACHED',
    ref: { repositoryId: 'R', objectId: 'A' },
    snapshot: {
      ref: { repositoryId: 'R', objectId: 'A' },
      typeId: 'sample:App',
      name: 'A',
      revision: 'r',
      attributes: { status: 'used' },
    },
    overrides: { stroke: 'red' },
    geometry: { x: 10, y: 20 },
  }
  const result = bridge.resolveVisualAttributes(binding, {
    stroke: { attribute: 'status', values: { created: 'gray', used: 'green' } },
  })
  expect(result).toEqual({ stroke: 'red' })
  expect(binding.geometry).toEqual({ x: 10, y: 20 })
})
