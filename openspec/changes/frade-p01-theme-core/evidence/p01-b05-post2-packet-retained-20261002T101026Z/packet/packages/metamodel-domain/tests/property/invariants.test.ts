import { it, expect } from 'vitest'
import fc from 'fast-check'
import {
  analyzeModel,
  decodeModel,
  validateAttributes,
  relationEligibility,
  isSubtype,
  type ModelDefinition,
  type Result,
} from '../../src'
import { company, freeze } from '../fixtures/models'
const options = { seed: 20260923, numRuns: 200 }
function value<T>(r: Result<T>): T {
  if (!r.ok) throw Error(JSON.stringify(r.diagnostics))
  return r.value
}
it('property: semantic diagnostics are invariant to definition order', () => {
  fc.assert(
    fc.property(
      fc.uniqueArray(fc.integer({ min: 0, max: 200 }), { minLength: 1, maxLength: 25 }),
      (ids) => {
        const m: ModelDefinition = {
          ...company(),
          profiles: [],
          viewpoints: [],
          relationTypes: [],
          objectTypes: ids.map((id) => ({
            id: 'test:T' + id,
            extends: 'test:missing',
            attributes: [],
          })),
        }
        expect(analyzeModel(m)).toEqual(
          analyzeModel({ ...m, objectTypes: [...m.objectTypes].reverse() }),
        )
      },
    ),
    options,
  )
})
it('property: decoding and validation do not mutate frozen input', () => {
  fc.assert(
    fc.property(fc.string(), (label) => {
      const m = company()
      const input = freeze({
        ...m,
        objectTypes: m.objectTypes.map((t) => ({ ...t, ui: { label } })),
      })
      const before = JSON.stringify(input)
      expect(decodeModel(input).ok).toBe(true)
      expect(analyzeModel(input).ok).toBe(true)
      expect(JSON.stringify(input)).toBe(before)
    }),
    options,
  )
})
it('property: recursive defaults are independent copies', () => {
  fc.assert(
    fc.property(fc.array(fc.integer(), { maxLength: 30 }), (xs) => {
      const fields = freeze([
        {
          id: 'v',
          schema: { kind: 'list' as const, items: { kind: 'integer' as const } },
          default: xs,
        },
      ])
      const first = value(validateAttributes(fields, {})),
        second = value(validateAttributes(fields, {}))
      ;(first.v as number[]).push(999)
      expect(second.v).toEqual(xs)
      expect(fields[0].default).toEqual(xs)
    }),
    options,
  )
})
it('property: subtype membership is transitive', () => {
  fc.assert(
    fc.property(fc.integer({ min: 2, max: 25 }), (depth) => {
      const m: ModelDefinition = {
        ...company(),
        profiles: [],
        viewpoints: [],
        relationTypes: [],
        objectTypes: Array.from({ length: depth + 1 }, (_, i) => ({
          id: 'test:T' + i,
          attributes: [],
          ...(i ? { extends: 'test:T' + (i - 1) } : {}),
        })),
      }
      const a = value(analyzeModel(m))
      for (let i = 1; i < depth; i++) {
        expect(isSubtype(a, 'test:T' + depth, 'test:T' + i)).toBe(true)
        expect(isSubtype(a, 'test:T' + i, 'test:T0')).toBe(true)
      }
      expect(isSubtype(a, 'test:T' + depth, 'test:T0')).toBe(true)
    }),
    options,
  )
})
it('property: undirected eligibility is invariant to orientation', () => {
  fc.assert(
    fc.property(fc.boolean(), fc.boolean(), (sourceFlag, targetFlag) => {
      const m = company(),
        r = {
          ...m.relationTypes[0],
          direction: 'undirected' as const,
          source: { ...m.relationTypes[0].source, includeSubtypes: sourceFlag },
          target: { ...m.relationTypes[0].target, includeSubtypes: targetFlag },
        }
      const a = value(analyzeModel({ ...m, relationTypes: [r] }))
      expect(relationEligibility(a, r.id, 'acme:app', 'acme:database')).toEqual(
        relationEligibility(a, r.id, 'acme:database', 'acme:app'),
      )
    }),
    options,
  )
})
