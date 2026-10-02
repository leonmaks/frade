import { expect, it } from 'vitest'
import { decodeSnapshot, validationProjection } from '../src/index'
const snapshot = () => ({
  repositoryId: 'R',
  revision: 'r',
  complete: true,
  binding: { modelId: 'sample:model', modelVersion: '1.0.0', fingerprint: 'a'.repeat(64) },
  objects: [
    {
      ref: { repositoryId: 'R', objectId: 'A' },
      typeId: 'sample:App',
      name: 'A',
      revision: 'r',
      attributes: { nested: { value: 1 } },
    },
  ],
  relations: [],
})
it('RE-3 rejects malformed version and fingerprint bindings', () => {
  for (const binding of [
    { ...snapshot().binding, modelVersion: 'anything' },
    { ...snapshot().binding, fingerprint: 'bad' },
  ])
    expect(decodeSnapshot({ ...snapshot(), binding }).ok).toBe(false)
})
it('RE-3 validation projection omits metadata and does not alias attributes', () => {
  const decoded = decodeSnapshot(snapshot())
  if (!decoded.ok) throw Error('snapshot')
  const projected = validationProjection(decoded.value)
  expect(Object.keys(projected.objects[0]).sort()).toEqual(['attributes', 'ref', 'typeId'])
  ;(projected.objects[0].attributes.nested as { value: number }).value = 9
  expect(decoded.value.objects[0].attributes).toEqual({ nested: { value: 1 } })
})
