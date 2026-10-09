import { expect, it } from 'vitest'
import { compileModel, compareModels } from '../../src'
import { setup, value, copy } from '../support/fixtures'
it('publishes byte-equivalent serializable data for reordered relation attributes and enum sets', async () => {
  const w = setup()
  w.base.definition.relationTypes[0].attributes = [
    { id: 'z', schema: { kind: 'enum', values: ['B', 'A'] } },
    { id: 'a', schema: { kind: 'string' } },
  ]
  const first = value(await compileModel(w.org, w.ports))
  w.base.definition.relationTypes[0].attributes.reverse()
  w.base.definition.relationTypes[0].attributes[1].schema.values.reverse()
  const second = value(await compileModel(w.org, w.ports))
  expect(first.fingerprint).toBe(second.fingerprint)
  expect(JSON.stringify(first)).toBe(JSON.stringify(second))
})
it('preserves all arbitrary default arrays including schema-like property names', async () => {
  const w = setup()
  w.base.definition.objectTypes[0].attributes.push({
    id: 'nested',
    schema: {
      kind: 'object',
      fields: [
        { id: 'values', schema: { kind: 'list', items: { kind: 'string' } } },
        { id: 'ui', schema: { kind: 'string' } },
      ],
    },
    default: { values: ['b', 'a'], ui: 'old' },
  })
  const first = value(await compileModel(w.org, w.ports)),
    before = copy(w.base)
  expect(first.objectTypes[0].attributes.find((a) => a.id === 'nested')!.default).toEqual({
    values: ['b', 'a'],
    ui: 'old',
  })
  w.base.definition.objectTypes[0].attributes[1].default.ui = 'new'
  const second = value(await compileModel(w.org, w.ports))
  expect(compareModels(first, second).changes).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: 'object', classification: 'review' })]),
  )
  expect(first.fingerprint).not.toBe(second.fingerprint)
  expect(before.definition.objectTypes[0].attributes[1].default.ui).toBe('old')
})
