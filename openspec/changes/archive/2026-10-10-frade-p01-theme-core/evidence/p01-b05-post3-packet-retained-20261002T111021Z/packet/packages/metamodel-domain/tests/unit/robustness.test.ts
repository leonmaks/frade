import { it, expect } from 'vitest'
import {
  decodeModel,
  analyzeModel,
  validateAttributes,
  validateValue,
  type ValueSchema,
} from '../../src'
import { company } from '../fixtures/models'
it('attaches known definition identities to structural diagnostics', () => {
  const m = company(),
    bad = { ...m, objectTypes: [{ ...m.objectTypes[0], extends: ['a:b', 'c:d'] }] }
  expect(
    decodeModel(bad).diagnostics.some(
      (d) => d.entityId === 'acme:asset' && d.path.at(-1) === 'extends',
    ),
  ).toBe(true)
})
it.each(['constructor', 'prototype'])('rejects unsafe local attribute key %s', (id) => {
  const m = {
    ...company(),
    objectTypes: [
      { id: 'a:b', attributes: [{ id, schema: { kind: 'string' }, default: 'unsafe' }] },
    ],
  }
  expect(decodeModel(m).ok).toBe(false)
})
it('keeps unrelated child definitions usable only in a wholly valid analysis', () => {
  const m = company()
  const result = analyzeModel({
    ...m,
    objectTypes: [...m.objectTypes, { id: 'a:bad', extends: 'missing:type', attributes: [] }],
  })
  expect(result.ok).toBe(false)
  expect(result).not.toHaveProperty('value')
})
it('rejects wrong boolean flags, incomplete recursive schemas and fractional bounds', () => {
  for (const schema of [
    { kind: 'list' },
    { kind: 'string', nullable: 'yes' },
    { kind: 'integer', minimum: 1.5 },
    { kind: 'object', fields: [{ id: 'x', schema: { kind: 'boolean' }, required: 'yes' }] },
  ])
    expect(validateValue(schema as ValueSchema, []).ok).toBe(false)
})
it('checks schema defaults before using an explicitly supplied value', () => {
  expect(
    validateAttributes([{ id: 'x', schema: { kind: 'integer' }, default: 'bad' }], { x: 1 }).ok,
  ).toBe(false)
})
it('uses Unicode code point lengths and validates leap years without Date coercion', () => {
  expect(validateValue({ kind: 'string', minLength: 1, maxLength: 1 }, '😀').ok).toBe(true)
  for (const date of ['1900-02-29', '2024-00-01', '2024-12-00', '2024-01-32'])
    expect(validateValue({ kind: 'date' }, date).ok).toBe(false)
  expect(validateValue({ kind: 'date' }, '2000-02-29').ok).toBe(true)
})
