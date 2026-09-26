import { describe, it, expect } from 'vitest'
import {
  decodeModel,
  analyzeModel,
  validateValue,
  validateAttributes,
  isSubtype,
  objectKey,
  relationEligibility,
  validateSnapshot,
  type Result,
  type ValueSchema,
} from '../../src'
import { company, freeze, snapshot } from '../fixtures/models'
export function value<T>(r: Result<T>): T {
  expect(r.ok, JSON.stringify(r.diagnostics)).toBe(true)
  if (!r.ok) throw Error('invalid')
  return r.value
}
const codes = (r: Result<unknown>) => r.diagnostics.map((d) => d.code)
describe('definitions', () => {
  it('accepts independent configurable vocabularies and preserves metadata', () => {
    for (const ns of ['acme', 'other']) {
      const model = freeze(company(ns))
      expect(value(decodeModel(model))).toEqual(model)
    }
  })
  it.each([
    ['schemaVersion', 2, 'UNSUPPORTED_VERSION'],
    ['id', 'label', 'INVALID_ID'],
    ['version', '01.2.3', 'INVALID_DEFINITION'],
    ['extra', true, 'INVALID_DEFINITION'],
  ])('rejects invalid envelope %s', (key, v, code) =>
    expect(codes(decodeModel({ ...company(), [key]: v }))).toContain(code),
  )
  it.each(['1.0.0', '0.0.0', '1.2.3-alpha.1+build.01'])('accepts SemVer %s', (version) =>
    expect(decodeModel({ ...company(), version }).ok).toBe(true),
  )
  it.each(['1', 'v1.2.3', '1.2.3-01', '1.2.3+', '1.2.3-a..b'])('rejects SemVer %s', (version) =>
    expect(decodeModel({ ...company(), version }).ok).toBe(false),
  )
  it('rejects duplicate IDs and weakening metadata', () => {
    const m = company()
    expect(
      codes(decodeModel({ ...m, objectTypes: [...m.objectTypes, m.objectTypes[0]] })),
    ).toContain('DUPLICATE_ID')
    expect(decodeModel({ ...m, viewpoints: [{ ...m.viewpoints[0], constraints: [] }] }).ok).toBe(
      false,
    )
    expect(
      decodeModel({
        ...m,
        objectTypes: [
          {
            ...m.objectTypes[0],
            lifecycle: {
              states: ['draft'],
              initial: 'draft',
              transitions: [{ from: 'draft', to: 'missing' }],
            },
          },
        ],
      }).ok,
    ).toBe(false)
  })
  it('rejects unsafe data without invoking accessors', () => {
    const getter = Object.defineProperty({}, 'x', {
      enumerable: true,
      get() {
        throw Error('EXECUTED')
      },
    })
    for (const bad of [() => 0, getter, NaN, JSON.parse('{"__proto__":{}}')])
      expect(codes(decodeModel({ ...company(), bad }))).toContain('UNSAFE_VALUE')
    const cyclic: any = {}
    cyclic.self = cyclic
    expect(codes(decodeModel(cyclic))).toContain('UNSAFE_VALUE')
  })
  it('bounds depth and visited values', () => {
    let deep: any = {}
    for (let i = 0; i < 65; i++) deep = { x: deep }
    expect(codes(decodeModel(deep))).toContain('RESOURCE_LIMIT')
    expect(codes(decodeModel(Array(100001).fill(0)))).toContain('RESOURCE_LIMIT')
  })
})
describe('attribute values', () => {
  const cases: [ValueSchema, unknown, unknown][] = [
    [{ kind: 'string', minLength: 1 }, 'ok', 1],
    [{ kind: 'text' }, 'line\nline', true],
    [{ kind: 'integer' }, 3, 1.5],
    [{ kind: 'decimal' }, 1.5, Infinity],
    [{ kind: 'boolean' }, false, 'false'],
    [{ kind: 'date' }, '2024-02-29', '2023-02-29'],
    [{ kind: 'datetime' }, '2024-02-29T12:00:00+03:00', '2024-02-29T12:00:00'],
    [{ kind: 'enum', values: ['one'] }, 'one', 'two'],
    [
      { kind: 'reference', targets: { typeIds: ['acme:asset'], includeSubtypes: true } },
      { repositoryId: 'R', objectId: 'A' },
      { repositoryId: 'R', objectId: 'missing' },
    ],
    [{ kind: 'list', items: { kind: 'integer' } }, [1, 2], [1, '2']],
    [
      { kind: 'object', fields: [{ id: 'x', schema: { kind: 'boolean' }, required: true }] },
      { x: true },
      { x: 'true' },
    ],
  ]
  it.each(cases)('validates kind $kind', (schema, good, bad) => {
    const context = {
      analysis: value(analyzeModel(company())),
      targets: new Map([[objectKey({ repositoryId: 'R', objectId: 'A' }), 'acme:app']]),
    }
    expect(validateValue(schema, good, context).ok).toBe(true)
    expect(validateValue(schema, bad, context).ok).toBe(false)
  })
  it('reports nested item and unknown field paths', () => {
    const r = validateValue(
      {
        kind: 'list',
        items: { kind: 'object', fields: [{ id: 'n', schema: { kind: 'integer' } }] },
      },
      [{ n: 'x', extra: true }],
    )
    expect(r.diagnostics.map((d) => d.path)).toEqual([
      [0, 'extra'],
      [0, 'n'],
    ])
  })
  it('distinguishes missing, null, required and default', () => {
    for (const required of [false, true])
      for (const nullable of [false, true]) {
        const fields = [{ id: 'x', required, schema: { kind: 'string' as const, nullable } }]
        expect(validateAttributes(fields, {}).ok).toBe(!required)
        expect(validateAttributes(fields, { x: null }).ok).toBe(nullable)
        expect(value(validateAttributes([{ ...fields[0], default: 'd' }], {}))).toEqual({ x: 'd' })
        expect(validateAttributes([{ ...fields[0], default: 'd' }], { x: null }).ok).toBe(nullable)
      }
  })
  it('copies defaults independently without synthesizing optional objects', () => {
    const fields = freeze([
      {
        id: 'x',
        schema: { kind: 'list' as const, items: { kind: 'integer' as const } },
        default: [1],
      },
      {
        id: 'parent',
        schema: {
          kind: 'object' as const,
          fields: [{ id: 'n', schema: { kind: 'integer' as const }, default: 1 }],
        },
      },
    ])
    const a = value(validateAttributes(fields, {})),
      b = value(validateAttributes(fields, {}))
    ;(a.x as number[]).push(2)
    expect(b).toEqual({ x: [1] })
    expect(fields[0].default).toEqual([1])
  })
  it.each([
    [{ kind: 'integer', minimum: 2 }, 1],
    [{ kind: 'decimal', maximum: 2 }, 3],
    [{ kind: 'string', maxLength: 1 }, 'ab'],
    [{ kind: 'list', items: { kind: 'boolean' }, minItems: 1 }, []],
    [{ kind: 'integer' }, Number.MAX_SAFE_INTEGER + 1],
    [{ kind: 'date' }, '2024-04-31'],
    [{ kind: 'datetime' }, '2024-01-01T25:00:00Z'],
    [{ kind: 'datetime' }, '2024-01-01T00:00:60Z'],
    [{ kind: 'datetime' }, '2024-01-01T00:00:00+24:00'],
  ])('rejects constraint violation', (s, v) =>
    expect(validateValue(s as ValueSchema, v).ok).toBe(false),
  )
  it('rejects contradictory schemas and invalid defaults', () => {
    for (const field of [
      { id: 'x', schema: { kind: 'integer', minimum: 5, maximum: 1 } },
      { id: 'x', schema: { kind: 'enum', values: ['a', 'a'] } },
      { id: 'x', schema: { kind: 'integer' }, default: 'x' },
    ])
      expect(
        decodeModel({ ...company(), objectTypes: [{ id: 'a:b', attributes: [field] }] }).ok,
      ).toBe(false)
  })
  it('validates exact/subtype references and unresolved targets', () => {
    const a = value(analyzeModel(company())),
      ref = { repositoryId: 'R', objectId: 'A' },
      targets = new Map([[objectKey(ref), 'acme:app']])
    const schema: ValueSchema = {
      kind: 'reference',
      targets: { typeIds: ['acme:asset'], includeSubtypes: false },
    }
    expect(codes(validateValue(schema, ref, { analysis: a, targets }))).toContain(
      'FORBIDDEN_TARGET',
    )
    expect(codes(validateValue(schema, ref, { analysis: a }))).toContain('UNRESOLVED_REFERENCE')
  })
})
describe('inheritance', () => {
  it('inherits attributes/lifecycle without making the concrete child abstract', () => {
    const a = value(analyzeModel(freeze(company())))
    expect(a.objectTypes.get('acme:app')?.attributes[0].required).toBe(true)
    expect(a.objectTypes.get('acme:app')?.lifecycle?.initial).toBe('draft')
    expect(isSubtype(a, 'acme:app', 'acme:asset')).toBe(true)
    expect(isSubtype(a, 'missing', 'missing')).toBe(false)
    expect(validateSnapshot(a, snapshot()).ok).toBe(true)
    const s = snapshot()
    expect(
      codes(
        validateSnapshot(a, {
          ...s,
          objects: [{ ...s.objects[0], typeId: 'acme:asset' }, s.objects[1]],
        }),
      ),
    ).toContain('ABSTRACT_TYPE')
  })
  it.each(['missing', 'cycle', 'kind', 'default', 'constraint'])('rejects defect %s', (defect) => {
    const m = structuredClone(company()) as any
    if (defect === 'missing') m.objectTypes[1].extends = 'none:parent'
    else if (defect === 'cycle') m.objectTypes[0].extends = 'acme:app'
    else {
      const f = structuredClone(m.objectTypes[0].attributes[0])
      if (defect === 'kind') f.schema.kind = 'integer'
      if (defect === 'default') f.default = 'name'
      if (defect === 'constraint') f.required = false
      m.objectTypes[1].attributes = [f]
    }
    const r = analyzeModel(m)
    expect(r.ok).toBe(false)
    expect('value' in r).toBe(false)
  })
  it('accepts identical semantics with a new label and gives deterministic diagnostics', () => {
    const m = company()
    const child = {
      ...m.objectTypes[1],
      attributes: [{ ...m.objectTypes[0].attributes[0], ui: { label: 'Renamed' } }],
    }
    expect(
      analyzeModel({ ...m, objectTypes: [m.objectTypes[0], child, m.objectTypes[2]] }).ok,
    ).toBe(true)
    const bad = { ...m, objectTypes: m.objectTypes.map((t) => ({ ...t, extends: 'missing:type' })) }
    expect(analyzeModel(bad)).toEqual(
      analyzeModel({ ...bad, objectTypes: [...bad.objectTypes].reverse() }),
    )
  })
})
describe('relations', () => {
  it('distinguishes directed and undirected preliminary eligibility', () => {
    const m = company(),
      a = value(analyzeModel(m))
    expect(value(relationEligibility(a, 'acme:uses', 'acme:app', 'acme:database'))).toEqual({
      eligible: true,
      scope: 'types-only',
    })
    expect(value(relationEligibility(a, 'acme:uses', 'acme:database', 'acme:app')).eligible).toBe(
      false,
    )
    const undirected = value(
      analyzeModel({ ...m, relationTypes: [{ ...m.relationTypes[0], direction: 'undirected' }] }),
    )
    expect(
      value(relationEligibility(undirected, 'acme:uses', 'acme:database', 'acme:app')).eligible,
    ).toBe(true)
  })
  it.each(['missing', 'self', 'pair', 'id', 'attribute', 'max', 'min'])(
    'rejects final defect %s',
    (defect) => {
      const m = structuredClone(company()) as any,
        s = structuredClone(snapshot()) as any
      if (defect === 'missing') s.relations[0].target.objectId = 'missing'
      if (defect === 'self') s.relations[0].target = s.relations[0].source
      if (defect === 'pair')
        s.relations.push({ ...s.relations[0], ref: { repositoryId: 'R', relationId: 'second' } })
      if (defect === 'id') s.relations.push(structuredClone(s.relations[0]))
      if (defect === 'attribute') s.relations[0].attributes.extra = true
      if (defect === 'max') m.relationTypes[0].sourceCardinality = { min: 0, max: 0 }
      if (defect === 'min') {
        m.relationTypes[0].sourceCardinality = { min: 1, max: null }
        s.relations = []
      }
      expect(validateSnapshot(value(analyzeModel(m)), s).ok).toBe(false)
    },
  )
  it('counts updates once and undirected self-loop once', () => {
    const m = company(),
      s = snapshot(),
      r = { ...m.relationTypes[0], sourceCardinality: { min: 1, max: 1 } }
    expect(validateSnapshot(value(analyzeModel({ ...m, relationTypes: [r] })), s).ok).toBe(true)
    const loop = {
      ...r,
      target: r.source,
      direction: 'undirected' as const,
      targetCardinality: r.sourceCardinality,
      allowSelfReference: true,
    }
    const a = value(analyzeModel({ ...m, relationTypes: [loop] }))
    const ls = freeze({
      objects: [s.objects[0]],
      relations: [{ ...s.relations[0], target: s.objects[0].ref }],
    })
    expect(validateSnapshot(a, ls).ok).toBe(true)
    expect(validateSnapshot(a, ls)).toEqual(validateSnapshot(a, ls))
  })
  it('uses qualified identity and recognizes reversed undirected duplicates', () => {
    const m = company(),
      s = snapshot(),
      a = value(
        analyzeModel({ ...m, relationTypes: [{ ...m.relationTypes[0], direction: 'undirected' }] }),
      )
    const b = { ...s.objects[1], ref: { repositoryId: 'Other', objectId: 'A' } }
    expect(
      validateSnapshot(a, {
        objects: [s.objects[0], b],
        relations: [{ ...s.relations[0], target: b.ref }],
      }).ok,
    ).toBe(true)
    const reverse = {
      ...s.relations[0],
      ref: { repositoryId: 'R', relationId: 'reverse' },
      source: s.relations[0].target,
      target: s.relations[0].source,
    }
    expect(codes(validateSnapshot(a, { ...s, relations: [...s.relations, reverse] }))).toContain(
      'DUPLICATE_RELATION',
    )
  })
  it('rejects asymmetric undirected bounds', () => {
    const m = company()
    expect(
      decodeModel({
        ...m,
        relationTypes: [
          {
            ...m.relationTypes[0],
            direction: 'undirected',
            sourceCardinality: { min: 1, max: null },
          },
        ],
      }).ok,
    ).toBe(false)
  })
})
