import { it, expect } from 'vitest'
import { decodeModel, analyzeModel, validateSnapshot, validateValue, type Result } from '../../src'
import { company, snapshot } from '../fixtures/models'
function value<T>(r: Result<T>): T {
  if (!r.ok) throw Error(JSON.stringify(r.diagnostics))
  return r.value
}
it.each(['id', 'version'])('rejects a trailing newline in %s', (field) => {
  const m = company()
  expect(decodeModel({ ...m, [field]: m[field as 'id' | 'version'] + '\n' }).ok).toBe(false)
})
it.each(['date', 'datetime'] as const)('rejects trailing newlines in %s values', (kind) => {
  expect(
    validateValue({ kind }, (kind === 'date' ? '2024-01-01' : '2024-01-01T00:00:00Z') + '\n').ok,
  ).toBe(false)
})
it('rejects custom array prototypes without invoking overridden methods', () => {
  const input: any[] = []
  Object.setPrototypeOf(input, {
    ...Array.prototype,
    map() {
      throw Error('EXECUTED')
    },
  })
  const r = decodeModel({ ...company(), extra: input })
  expect(r.ok).toBe(false)
  expect(r.diagnostics[0].code).toBe('UNSAFE_VALUE')
})
it('rejects lifecycle overrides and dangling declaration references', () => {
  const m = company()
  expect(
    analyzeModel({
      ...m,
      objectTypes: m.objectTypes.map((t) =>
        t.id === 'acme:app'
          ? { ...t, lifecycle: { states: ['other'], initial: 'other', transitions: [] } }
          : t,
      ),
    }).diagnostics.some((d) => d.code === 'CONFLICTING_OVERRIDE'),
  ).toBe(true)
  expect(
    analyzeModel({
      ...m,
      profiles: [{ id: 'a:p', objectTypes: ['missing:type'], relationTypes: [] }],
    }).diagnostics.some((d) => d.code === 'UNKNOWN_TYPE'),
  ).toBe(true)
})
it('counts incoming bounds and duplicate-policy allow using separate relation identities', () => {
  const m = company(),
    s = snapshot(),
    edges = [
      s.relations[0],
      { ...s.relations[0], ref: { repositoryId: 'R', relationId: 'second' } },
    ]
  const base = {
    ...m,
    relationTypes: [
      {
        ...m.relationTypes[0],
        duplicates: 'allow' as const,
        targetCardinality: { min: 0, max: 1 },
      },
    ],
  }
  expect(
    validateSnapshot(value(analyzeModel(base)), { ...s, relations: edges }).diagnostics.some(
      (d) => d.code === 'CARDINALITY' && d.path.at(-1) === 'target',
    ),
  ).toBe(true)
  const allowed = {
    ...base,
    relationTypes: [{ ...base.relationTypes[0], targetCardinality: { min: 0, max: 2 } }],
  }
  expect(validateSnapshot(value(analyzeModel(allowed)), { ...s, relations: edges }).ok).toBe(true)
})
it('invalid relation attributes do not satisfy a required minimum', () => {
  const m = company(),
    s = snapshot()
  const a = value(
    analyzeModel({
      ...m,
      relationTypes: [{ ...m.relationTypes[0], sourceCardinality: { min: 1, max: null } }],
    }),
  )
  const r = validateSnapshot(a, {
    ...s,
    relations: [{ ...s.relations[0], attributes: { unknown: true } }],
  })
  expect(r.diagnostics.map((d) => d.code)).toContain('UNKNOWN_ATTRIBUTE')
  expect(r.diagnostics.map((d) => d.code)).toContain('CARDINALITY')
})
