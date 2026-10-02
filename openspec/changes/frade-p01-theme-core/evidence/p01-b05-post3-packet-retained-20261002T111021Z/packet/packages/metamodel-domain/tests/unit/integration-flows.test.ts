import { it, expect } from 'vitest'
import { decodeModel, analyzeModel } from '../../src'
import { company } from '../fixtures/models'
const capability = {
  source: 'producer',
  consumer: 'consumer',
  search: ['description'],
  columns: [{ field: 'technology', label: 'Technology' }],
  nonCloneable: ['audit'],
  idPatterns: ['^F[0-9]+$'],
}
it('validates configurable semantic flow roles and ID patterns', () => {
  const source = company()
  const model = {
    ...source,
    objectTypes: source.objectTypes.map((t, i) =>
      i === 0
        ? {
            ...t,
            integrationFlow: capability,
            attributes: [
              ...t.attributes,
              {
                id: 'producer',
                schema: {
                  kind: 'reference' as const,
                  targets: { typeIds: ['acme:app'], includeSubtypes: false },
                },
              },
              {
                id: 'consumer',
                schema: {
                  kind: 'reference' as const,
                  targets: { typeIds: ['acme:app'], includeSubtypes: false },
                },
              },
            ],
          }
        : t,
    ),
  }
  expect(decodeModel(model).ok).toBe(true)
  for (const patch of [
    { source: 'consumer' },
    { idPatterns: ['['] },
    { columns: [{ field: 'technology' }] },
    { consumer: '' },
    { unknown: true },
  ]) {
    const bad = {
      ...model,
      objectTypes: model.objectTypes.map((t, i) =>
        i === 0 ? { ...t, integrationFlow: { ...capability, ...patch } as any } : t,
      ),
    }
    expect(decodeModel(bad).ok).toBe(false)
  }
})
it('inherits explicit flow capability to derived types', () => {
  const source = company()
  const model = {
    ...source,
    objectTypes: source.objectTypes.map((t, i) =>
      i === 0
        ? {
            ...t,
            integrationFlow: capability,
            attributes: [
              ...t.attributes,
              ...['producer', 'consumer'].map((id) => ({
                id,
                schema: {
                  kind: 'reference' as const,
                  targets: { typeIds: ['acme:app'], includeSubtypes: false },
                },
              })),
            ],
          }
        : t,
    ),
  }
  const result = analyzeModel(model)
  expect(result.ok && result.value.objectTypes.get('acme:app')?.integrationFlow).toEqual(capability)
})
