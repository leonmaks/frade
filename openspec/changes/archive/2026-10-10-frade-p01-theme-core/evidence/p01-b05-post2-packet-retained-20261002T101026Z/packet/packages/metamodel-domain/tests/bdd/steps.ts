import { expect } from 'vitest'
import {
  analyzeModel,
  decodeModel,
  isSubtype,
  objectKey,
  relationEligibility,
  validateAttributes,
  validateSnapshot,
  validateValue,
  type Result,
  type ValueSchema,
} from '../../src'
import { company, freeze, snapshot } from '../fixtures/models'
import type { Step } from './runner'
const unwrap = <T>(r: Result<T>): T => {
  expect(r.ok, JSON.stringify(r.diagnostics)).toBe(true)
  if (!r.ok) throw Error('Invalid fixture')
  return r.value
}
const codes = (r: Result<unknown>) => r.diagnostics.map((d) => d.code)
const binding = (text: string, run: Step['run']): Step => ({
  pattern: new RegExp('^' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'),
  run,
})
const mutable = () => structuredClone(company()) as any
const sample = () => structuredClone(snapshot()) as any
const ctx = () => ({
  analysis: unwrap(analyzeModel(company())),
  targets: new Map([
    [objectKey({ repositoryId: 'R', objectId: 'A' }), 'acme:app'],
    [objectKey({ repositoryId: 'R', objectId: 'B' }), 'acme:database'],
  ]),
})
const kinds: Record<string, [ValueSchema, unknown, unknown]> = {
  string: [{ kind: 'string' }, 'text', 1],
  text: [{ kind: 'text' }, 'a\nb', false],
  integer: [{ kind: 'integer' }, 5, 1.5],
  decimal: [{ kind: 'decimal' }, 1.25, '1.25'],
  boolean: [{ kind: 'boolean' }, false, 'false'],
  date: [{ kind: 'date' }, '2024-02-29', '2023-02-29'],
  datetime: [{ kind: 'datetime' }, '2024-02-29T12:30:00Z', '2024-02-29T12:30:00'],
  enum: [{ kind: 'enum', values: ['a', 'b'] }, 'a', 'c'],
  reference: [
    { kind: 'reference', targets: { typeIds: ['acme:asset'], includeSubtypes: true } },
    { repositoryId: 'R', objectId: 'A' },
    { repositoryId: 'R', objectId: 'missing' },
  ],
  list: [{ kind: 'list', items: { kind: 'integer' } }, [1, 2], [1, '2']],
  object: [
    { kind: 'object', fields: [{ id: 'x', schema: { kind: 'boolean' } }] },
    { x: true },
    { x: 1 },
  ],
}
export const steps: Step[] = [
  binding('two company models with equal display labels and different namespaces', (w) => {
    w.models = freeze([company('acme'), company('other')])
  }),
  binding('their definitions are validated', (w) => {
    w.results = w.models.map(decodeModel)
  }),
  binding('both models retain distinct stable type identities', (w) => {
    const a = unwrap(w.results[0]) as any,
      b = unwrap(w.results[1]) as any
    expect(a.objectTypes[1].ui.label).toBe(b.objectTypes[1].ui.label)
    expect(a.objectTypes[1].id).not.toBe(b.objectTypes[1].id)
  }),
  binding('no built-in architecture type is required', (w) => {
    for (const r of w.results) {
      const m = unwrap(r) as any
      expect(analyzeModel(m).ok).toBe(true)
      expect(m.objectTypes.every((t: any) => t.id.startsWith(m.id.split(':')[0] + ':'))).toBe(true)
    }
  }),
  {
    pattern: /^a model with "(.+)"$/,
    run(w, defect) {
      w.model = mutable()
      w.expected = 'INVALID_DEFINITION'
      switch (defect) {
        case 'unsupported schema version':
          w.model.schemaVersion = 2
          w.expected = 'UNSUPPORTED_VERSION'
          break
        case 'malformed namespaced ID':
          w.model.id = 'Label'
          w.expected = 'INVALID_ID'
          break
        case 'invalid semantic version':
          w.model.version = '01.0.0'
          break
        case 'duplicate type ID':
          w.model.objectTypes.push(structuredClone(w.model.objectTypes[0]))
          w.expected = 'DUPLICATE_ID'
          break
        case 'unknown structural field':
          w.model.script = 'run()'
          break
        case 'undeclared lifecycle transition end':
          w.model.objectTypes[0].lifecycle.transitions[0].to = 'missing'
          break
        case 'viewpoint domain constraint override':
          w.model.viewpoints[0].constraints = []
          break
        default:
          throw Error('Unknown fixture ' + defect)
      }
    },
  },
  binding('its definition is decoded', (w) => {
    w.result = decodeModel(w.model)
  }),
  binding('a structured definition diagnostic is returned', (w) => {
    expect(w.result.ok).toBe(false)
    expect(codes(w.result)).toContain(w.expected)
    expect(w.result.diagnostics[0]).toMatchObject({ severity: 'error', path: expect.any(Array) })
  }),
  binding('no successful definition is returned', (w) => {
    expect(w.result.ok).toBe(false)
    expect(w.result).not.toHaveProperty('value')
  }),
  binding('a valid model with imports profiles viewpoints lifecycle and UI metadata', (w) => {
    w.model = mutable()
    w.model.imports = [{ id: 'external:base', version: '1.0.0' }]
    freeze(w.model)
  }),
  binding('its declarations are preserved without I/O or code execution', (w) => {
    expect(unwrap(w.result)).toEqual(w.model)
    expect(unwrap(w.result)).not.toBe(w.model)
  }),
  binding('an abstract parent with a required attribute and a concrete child', (w) => {
    w.model = freeze(company())
  }),
  binding('the complete definition set is analyzed', (w) => {
    w.result = analyzeModel(w.model)
  }),
  binding('the child inherits the attribute and matches the parent subtype rule', (w) => {
    w.analysis = unwrap(w.result)
    expect(w.analysis.objectTypes.get('acme:app').attributes[0].required).toBe(true)
    expect(isSubtype(w.analysis, 'acme:app', 'acme:asset')).toBe(true)
  }),
  binding('an instance of the abstract parent is rejected', (w) => {
    const s = sample()
    s.objects[0].typeId = 'acme:asset'
    expect(codes(validateSnapshot(w.analysis, s))).toContain('ABSTRACT_TYPE')
  }),
  {
    pattern: /^a complete definition set with "(.+)"$/,
    run(w, defect) {
      w.model = mutable()
      w.expected = 'CONFLICTING_OVERRIDE'
      const parent = w.model.objectTypes[0],
        child = w.model.objectTypes[1]
      switch (defect) {
        case 'missing parent':
          child.extends = 'missing:parent'
          w.expected = 'UNKNOWN_TYPE'
          break
        case 'multiple parents':
          child.extends = ['acme:asset', 'acme:database']
          w.expected = 'INVALID_ID'
          break
        case 'inheritance cycle':
          parent.extends = child.id
          w.expected = 'INHERITANCE_CYCLE'
          break
        default: {
          const f = structuredClone(parent.attributes[0])
          child.attributes = [f]
          if (defect === 'inherited attribute kind change') f.schema.kind = 'text'
          else if (defect === 'inherited default change') f.default = 'new'
          else if (defect === 'inherited constraint change') f.required = false
          else throw Error('Unknown fixture ' + defect)
        }
      }
    },
  },
  binding('an inheritance diagnostic identifies the offending type', (w) => {
    expect(codes(w.result)).toContain(w.expected)
    expect(w.result.diagnostics.some((d: any) => d.entityId?.startsWith('acme:'))).toBe(true)
  }),
  binding('no usable partial analysis is returned', (w) => {
    expect(w.result.ok).toBe(false)
    expect(w.result).not.toHaveProperty('value')
  }),
  binding('frozen invalid definitions in two equivalent collection orders', (w) => {
    const m = mutable()
    m.objectTypes[1].extends = 'missing:type'
    w.models = freeze([m, { ...m, objectTypes: [...m.objectTypes].reverse() }])
    w.input = w.models
    w.before = JSON.stringify(w.input)
  }),
  binding('both definition sets are analyzed repeatedly', (w) => {
    w.results = [...w.models.map(analyzeModel), ...w.models.map(analyzeModel)]
  }),
  binding('their ordered semantic diagnostic identities and paths agree', (w) => {
    expect(w.results[0].ok).toBe(false)
    for (const r of w.results) expect(r).toEqual(w.results[0])
  }),
  binding('all input values are unchanged', (w) => {
    expect(JSON.stringify(w.input)).toBe(w.before)
  }),
  {
    pattern: /^an input containing "(.+)"$/,
    run(w, defect) {
      w.expected =
        defect.includes('depth') || defect.includes('100000') ? 'RESOURCE_LIMIT' : 'UNSAFE_VALUE'
      if (defect === 'executable value')
        w.model = {
          execute: () => {
            throw Error('Executed')
          },
        }
      else if (defect === 'cyclic object') {
        w.model = {}
        w.model.self = w.model
      } else if (defect === 'recursion depth above 64') {
        w.model = {}
        for (let i = 0; i < 65; i++) w.model = { nested: w.model }
      } else if (defect === 'more than 100000 values') w.model = Array(100001).fill(null)
      else if (defect === 'prototype-polluting key')
        w.model = JSON.parse('{"__proto__":{"polluted":true}}')
      else throw Error('Unknown fixture ' + defect)
    },
  },
  binding('domain decoding is attempted', (w) => {
    w.result = decodeModel(w.model)
  }),
  binding(
    'a structured safety diagnostic is returned without executing code or truncating input',
    (w) => {
      expect(codes(w.result)).toContain(w.expected)
      expect(w.result).not.toHaveProperty('value')
      expect(({} as any).polluted).toBeUndefined()
    },
  ),
  {
    pattern: /^valid and invalid fixture values for "(.+)"$/,
    run(w, kind) {
      if (!kinds[kind]) throw Error(kind)
      ;[w.schema, w.good, w.bad] = kinds[kind]
      w.context = ctx()
    },
  },
  binding('both values are validated against their attribute schema', (w) => {
    const fields = [{ id: 'v', schema: w.schema, required: true }]
    w.goodResult = validateAttributes(fields, { v: w.good }, w.context)
    w.badResult = validateAttributes(fields, { v: w.bad }, w.context)
  }),
  binding('the valid value passes without coercion', (w) => {
    expect(unwrap(w.goodResult)).toEqual({ v: w.good })
  }),
  binding('the invalid value reports its precise attribute path', (w) => {
    expect(w.badResult.ok).toBe(false)
    expect(w.badResult.diagnostics.every((d: any) => d.path[0] === 'v')).toBe(true)
  }),
  binding('a list of structured objects with one invalid and one undeclared field', (w) => {
    w.schema = {
      kind: 'list',
      items: { kind: 'object', fields: [{ id: 'n', schema: { kind: 'integer' } }] },
    }
    w.input = freeze([{ n: 'bad', extra: true }])
    w.before = JSON.stringify(w.input)
  }),
  binding('the list value is validated', (w) => {
    w.result = validateValue(w.schema, w.input)
  }),
  binding('diagnostics identify the list index and both fields without dropping data', (w) => {
    expect(w.result.diagnostics.map((d: any) => d.path)).toEqual([
      [0, 'extra'],
      [0, 'n'],
    ])
    expect(JSON.stringify(w.input)).toBe(w.before)
  }),
  binding('the required optional nullable and defaulted attribute truth table', (w) => {
    w.rows = []
    for (const required of [false, true])
      for (const nullable of [false, true]) w.rows.push({ required, nullable })
  }),
  binding('missing null and present values are validated', (w) => {
    w.rows = w.rows.map((row: any) => {
      const f = {
        id: 'x',
        required: row.required,
        schema: { kind: 'string' as const, nullable: row.nullable },
      }
      return {
        ...row,
        missing: validateAttributes([f], {}),
        nullResult: validateAttributes([f], { x: null }),
        present: validateAttributes([f], { x: 'a' }),
        defaultResult: validateAttributes([{ ...f, default: 'd' }], {}),
        explicitNull: validateAttributes([{ ...f, default: 'd' }], { x: null }),
      }
    })
  }),
  binding('only permitted combinations succeed', (w) => {
    for (const r of w.rows) {
      expect(r.missing.ok).toBe(!r.required)
      expect(r.nullResult.ok).toBe(r.nullable)
      expect(r.present.ok).toBe(true)
    }
  }),
  binding('defaults apply only to absent values', (w) => {
    for (const r of w.rows) {
      expect(unwrap(r.defaultResult)).toEqual({ x: 'd' })
      expect(r.explicitNull.ok).toBe(r.nullable)
      if (r.nullable) expect(unwrap(r.explicitNull)).toEqual({ x: null })
    }
  }),
  binding('an absent optional parent object remains absent', () => {
    expect(
      unwrap(
        validateAttributes(
          [
            {
              id: 'parent',
              schema: {
                kind: 'object',
                fields: [{ id: 'child', schema: { kind: 'integer' }, default: 1 }],
              },
            },
          ],
          {},
        ),
      ),
    ).toEqual({})
  }),
  binding('a schema with a nested mutable default', (w) => {
    w.fields = freeze([
      {
        id: 'x',
        schema: {
          kind: 'object',
          fields: [{ id: 'items', schema: { kind: 'list', items: { kind: 'integer' } } }],
        },
        default: { items: [1] },
      },
    ])
  }),
  binding('defaults are applied to two inputs', (w) => {
    w.a = unwrap(validateAttributes(w.fields, {}))
    w.b = unwrap(validateAttributes(w.fields, {}))
  }),
  binding('both results satisfy the schema', (w) => {
    expect(validateAttributes(w.fields, w.a).ok).toBe(true)
    expect(validateAttributes(w.fields, w.b).ok).toBe(true)
  }),
  binding('changing one result leaves the other result and schema unchanged', (w) => {
    w.a.x.items.push(2)
    expect(w.b).toEqual({ x: { items: [1] } })
    expect(w.fields[0].default).toEqual({ items: [1] })
  }),
  {
    pattern: /^an attribute fixture with "(.+)"$/,
    run(w, defect) {
      w.expected = 'CONSTRAINT'
      w.field = { id: 'x', schema: { kind: 'integer', minimum: 2 } }
      w.input = { x: 1 }
      if (defect === 'numeric bound violation') return
      if (defect === 'string length violation') {
        w.field.schema = { kind: 'string', minLength: 2 }
        w.input = { x: 'a' }
      } else if (defect === 'list cardinality violation') {
        w.field.schema = { kind: 'list', items: { kind: 'integer' }, minItems: 1 }
        w.input = { x: [] }
      } else if (defect === 'contradictory bounds') {
        w.field.schema = { kind: 'integer', minimum: 2, maximum: 1 }
        w.expected = 'INVALID_DEFINITION'
      } else if (defect === 'invalid default') {
        w.field = { id: 'x', schema: { kind: 'integer' }, default: 'bad' }
        w.input = {}
        w.expected = 'TYPE_MISMATCH'
      } else throw Error(defect)
    },
  },
  binding('its schema and value are validated', (w) => {
    w.result = validateAttributes([w.field], w.input)
  }),
  binding('the expected constraint diagnostic is returned', (w) => {
    expect(codes(w.result)).toContain(w.expected)
  }),
  binding('permitted subtype forbidden type and unresolved reference targets', (w) => {
    w.schema = kinds.reference[0]
    w.context = ctx()
  }),
  binding('reference values are validated with the supplied target map', (w) => {
    w.results = ['A', 'B', 'missing'].map((objectId) =>
      validateValue(w.schema, { repositoryId: 'R', objectId }, w.context),
    )
  }),
  binding('only the permitted subtype reference succeeds', (w) => {
    expect(w.results.map((r: any) => r.ok)).toEqual([true, false, false])
  }),
  binding('other references report explicit target diagnostics without I/O', (w) => {
    expect(codes(w.results[1])).toContain('FORBIDDEN_TARGET')
    expect(codes(w.results[2])).toContain('UNRESOLVED_REFERENCE')
  }),
  binding('a parent subtype and target type with endpoint rules', (w) => {
    w.model = company()
  }),
  binding('directed and undirected type pairs are checked in both orientations', (w) => {
    const a = unwrap(analyzeModel(w.model)),
      b = unwrap(
        analyzeModel({
          ...w.model,
          relationTypes: [{ ...w.model.relationTypes[0], direction: 'undirected' }],
        }),
      )
    w.directed = [
      relationEligibility(a, 'acme:uses', 'acme:app', 'acme:database'),
      relationEligibility(a, 'acme:uses', 'acme:database', 'acme:app'),
    ]
    w.undirected = [
      relationEligibility(b, 'acme:uses', 'acme:app', 'acme:database'),
      relationEligibility(b, 'acme:uses', 'acme:database', 'acme:app'),
    ]
  }),
  binding('directed results respect source and target roles', (w) => {
    expect(w.directed.map((r: any) => (unwrap(r) as any).eligible)).toEqual([true, false])
  }),
  binding('undirected eligibility is invariant under endpoint reversal', (w) => {
    expect(w.undirected[0]).toEqual(w.undirected[1])
    expect((unwrap(w.undirected[0]) as any).eligible).toBe(true)
  }),
  binding('successful eligibility is not presented as mutation approval', (w) => {
    expect(unwrap(w.directed[0])).toEqual({ eligible: true, scope: 'types-only' })
  }),
  {
    pattern: /^an eligible relation pair in a complete prospective snapshot with "(.+)"$/,
    run(w, defect) {
      w.model = mutable()
      w.input = sample()
      expect(
        unwrap(
          relationEligibility(
            unwrap(analyzeModel(w.model)),
            'acme:uses',
            'acme:app',
            'acme:database',
          ),
        ).eligible,
      ).toBe(true)
      const r = w.input.relations[0]
      const expected: Record<string, string> = {
        'missing endpoint': 'MISSING_ENDPOINT',
        'forbidden self-reference': 'SELF_REFERENCE',
        'forbidden duplicate pair': 'DUPLICATE_RELATION',
        'duplicate relation identity': 'DUPLICATE_ID',
        'invalid relation attribute': 'UNKNOWN_ATTRIBUTE',
        'maximum cardinality exceeded': 'CARDINALITY',
        'minimum cardinality unsatisfied': 'CARDINALITY',
      }
      w.expected = expected[defect]
      if (!w.expected) throw Error(defect)
      if (defect === 'missing endpoint') r.target.objectId = 'missing'
      if (defect === 'forbidden self-reference') r.target = r.source
      if (defect === 'forbidden duplicate pair')
        w.input.relations.push({ ...r, ref: { repositoryId: 'R', relationId: 'other' } })
      if (defect === 'duplicate relation identity') w.input.relations.push(structuredClone(r))
      if (defect === 'invalid relation attribute') r.attributes.unknown = 1
      if (defect === 'maximum cardinality exceeded')
        w.model.relationTypes[0].sourceCardinality = { min: 0, max: 0 }
      if (defect === 'minimum cardinality unsatisfied') {
        w.model.relationTypes[0].sourceCardinality = { min: 1, max: null }
        w.input.relations = []
      }
      w.analysis = unwrap(analyzeModel(w.model))
    },
  },
  binding('the full snapshot is validated', (w) => {
    w.result = validateSnapshot(w.analysis, w.input)
    if (w.qualified) w.qualifiedResult = validateSnapshot(w.analysis, w.qualified)
  }),
  binding('a constraint-specific diagnostic rejects the snapshot', (w) => {
    expect(w.result.ok).toBe(false)
    expect(codes(w.result)).toContain(w.expected)
  }),
  binding('different repositories reuse a local object ID', (w) => {
    w.model = mutable()
    w.model.relationTypes[0].direction = 'undirected'
    w.analysis = unwrap(analyzeModel(w.model))
    w.qualified = sample()
    w.qualified.objects[1].ref = { repositoryId: 'Other', objectId: 'A' }
    w.qualified.relations[0].target = w.qualified.objects[1].ref
  }),
  binding('an undirected relation is repeated with reversed endpoints', (w) => {
    w.input = sample()
    const r = w.input.relations[0]
    w.input.relations.push({
      ...r,
      ref: { repositoryId: 'R', relationId: 'reverse' },
      source: r.target,
      target: r.source,
    })
  }),
  binding('repository-qualified objects remain distinct', (w) => {
    expect(w.qualifiedResult.ok).toBe(true)
    expect(objectKey(w.qualified.objects[0].ref)).not.toBe(objectKey(w.qualified.objects[1].ref))
  }),
  binding('the reversed relation is recognized as a duplicate pair', (w) => {
    expect(codes(w.result)).toContain('DUPLICATE_RELATION')
  }),
  binding('a valid snapshot with exactly one required relation', (w) => {
    w.model = mutable()
    w.model.relationTypes[0].sourceCardinality = { min: 1, max: 1 }
    w.analysis = unwrap(analyzeModel(w.model))
    w.input = sample()
    expect(validateSnapshot(w.analysis, w.input).ok).toBe(true)
  }),
  binding('that relation is updated in place and separately removed', (w) => {
    w.updated = validateSnapshot(w.analysis, {
      ...w.input,
      relations: [{ ...w.input.relations[0], attributes: {} }],
    })
    w.removed = validateSnapshot(w.analysis, { ...w.input, relations: [] })
  }),
  binding('the updated snapshot counts the relation once', (w) => {
    expect(w.updated.ok).toBe(true)
  }),
  binding('the removal snapshot fails minimum cardinality', (w) => {
    expect(codes(w.removed)).toContain('CARDINALITY')
  }),
  binding('an undirected definition with unequal source and target bounds', (w) => {
    w.model = mutable()
    w.model.relationTypes[0].direction = 'undirected'
    w.model.relationTypes[0].sourceCardinality = { min: 1, max: null }
  }),
  binding('its definition is validated', (w) => {
    w.result = decodeModel(w.model)
  }),
  binding('an ambiguous cardinality diagnostic is returned', (w) => {
    expect(codes(w.result)).toContain('INVALID_DEFINITION')
    expect(w.result.diagnostics.some((d: any) => d.message.includes('symmetric'))).toBe(true)
  }),
  binding('a frozen complete snapshot with one permitted undirected self-loop', (w) => {
    w.model = mutable()
    const r = w.model.relationTypes[0]
    r.direction = 'undirected'
    r.target = r.source
    r.allowSelfReference = true
    r.sourceCardinality = { min: 1, max: 1 }
    r.targetCardinality = { min: 1, max: 1 }
    w.analysis = unwrap(analyzeModel(w.model))
    const s = sample()
    w.input = freeze({
      objects: [s.objects[0]],
      relations: [{ ...s.relations[0], target: s.objects[0].ref }],
    })
    w.before = JSON.stringify(w.input)
  }),
  binding('the full snapshot is validated twice', (w) => {
    w.results = [validateSnapshot(w.analysis, w.input), validateSnapshot(w.analysis, w.input)]
  }),
  binding('the incident count for its object is one', (w) => {
    expect(w.results[0].ok).toBe(true)
  }),
  binding('both ordered diagnostic results agree', (w) => {
    expect(w.results[0]).toEqual(w.results[1])
  }),
]
