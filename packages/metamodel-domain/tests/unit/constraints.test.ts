import { describe, it, expect } from 'vitest'
import {
  checkConstraint,
  validateConstraint,
  constraintFields,
  type Constraint,
} from '../../src/constraints'
describe('portable imported constraints', () => {
  it('composes conditional requirements without materializing fields', () => {
    const r: Constraint = {
      type: 'object',
      properties: { status: { enum: ['active', 'draft'] } },
      allOf: [
        {
          if: { properties: { status: { const: 'active' } }, required: ['status'] },
          then: { required: ['owner'], properties: { owner: { type: 'string', minLength: 2 } } },
        },
      ],
    }
    const input = { status: 'active' }
    expect(validateConstraint(r, input).map((x) => x.path)).toContainEqual(['owner'])
    expect(validateConstraint(r, { status: 'draft' })).toEqual([])
    expect(constraintFields(r, input).find((x) => x.key === 'owner')?.required).toBe(true)
    expect(input).toEqual({ status: 'active' })
  })
  it('checks anyOf oneOf patterns bounds and additional fields', () => {
    expect(validateConstraint({ oneOf: [{ type: 'number' }, { minimum: 0 }] }, 5)).toHaveLength(1)
    expect(
      validateConstraint({ anyOf: [{ type: 'number' }, { type: 'string', pattern: '^a' }] }, 'b'),
    ).not.toEqual([])
    expect(
      validateConstraint(
        {
          type: 'object',
          patternProperties: { '^x': { type: 'integer', maximum: 2 } },
          additionalProperties: false,
        },
        { x1: 3, y: true },
      ),
    ).toHaveLength(2)
  })
  it('retains qualified missing targets and rejects unsupported keywords', () => {
    const ref = { repositoryId: 'r', objectId: 'a' },
      rule = { referenceTargets: ['t'] }
    expect(validateConstraint(rule, ref)[0].code).toBe('UNRESOLVED_REFERENCE')
    expect(validateConstraint(rule, ref, { resolve: () => 't' })).toEqual([])
    expect(checkConstraint({ execute: 'anything' })).not.toEqual([])
  })
  it('distinguishes missing null false zero and empty', () => {
    const rule: Constraint = {
      required: ['x'],
      properties: { x: { type: ['string', 'number', 'boolean', 'null'] } },
    }
    for (const x of [null, false, 0, '']) expect(validateConstraint(rule, { x })).toEqual([])
    expect(validateConstraint(rule, {})).toHaveLength(1)
  })
})
it('KM-002 dates reject invalid calendar days and preserve valid leap days', () => {
  const rule: Constraint = { type: 'string', format: 'date' }
  expect(checkConstraint(rule)).toEqual([])
  expect(validateConstraint(rule, '2024-02-29')).toEqual([])
  expect(validateConstraint(rule, '2025-02-29')).toHaveLength(1)
  expect(checkConstraint({ type: 'string', format: 'executable' })).toHaveLength(1)
})
