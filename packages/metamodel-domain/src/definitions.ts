import type {
  AttributeDefinition,
  Diagnostic,
  ModelDefinition,
  Path,
  Result,
  ValueSchema,
  Cardinality,
} from './types'
import {
  clone,
  diagnostic,
  inspectJson,
  record,
  result,
  ValidationFailure,
  dangerousKeys,
} from './diagnostics'
import { valueEngine } from './value-engine'
const localPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const qualifiedPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*:[A-Za-z0-9][A-Za-z0-9._-]*$/
const versionPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
export function validVersion(v: unknown): boolean {
  if (typeof v !== 'string') return false
  const m = versionPattern.exec(v)
  return (
    !!m && (!m[4] || m[4].split('.').every((s) => !/^\d+$/.test(s) || s === '0' || s[0] !== '0'))
  )
}
export const cardinality = (v: Cardinality | undefined): Cardinality => v ?? { min: 0, max: null }
export class DefinitionReader {
  readonly diagnostics: Diagnostic[] = []
  add(path: Path, message: string, code: Diagnostic['code'] = 'INVALID_DEFINITION') {
    this.diagnostics.push(diagnostic(code, path, message))
  }
  object(
    v: unknown,
    path: Path,
    required: readonly string[],
    optional: readonly string[] = [],
  ): v is Record<string, unknown> {
    if (!record(v)) {
      this.add(path, 'Expected object')
      return false
    }
    for (const k of required) if (!Object.hasOwn(v, k)) this.add([...path, k], 'Missing field')
    for (const k of Object.keys(v))
      if (!required.includes(k) && !optional.includes(k)) this.add([...path, k], 'Unknown field')
    return true
  }
  id(v: unknown, p: Path, qualified = true) {
    if (
      typeof v !== 'string' ||
      !(qualified ? qualifiedPattern : localPattern).test(v) ||
      (!qualified && dangerousKeys.has(v))
    )
      this.add(p, 'Invalid stable identifier', 'INVALID_ID')
  }
  text(v: unknown, p: Path) {
    if (typeof v !== 'string') this.add(p, 'Expected string')
  }
  bool(v: unknown, p: Path) {
    if (typeof v !== 'boolean') this.add(p, 'Expected boolean')
  }
  array(v: unknown, p: Path, each: (v: unknown, p: Path) => void) {
    if (!Array.isArray(v)) {
      this.add(p, 'Expected array')
      return
    }
    v.forEach((x, i) => each(x, [...p, i]))
  }
  unique(v: unknown, p: Path, key: (v: any) => unknown = (x) => x) {
    if (!Array.isArray(v)) return
    const seen = new Set()
    for (let i = 0; i < v.length; i++) {
      const k = key(v[i])
      if (seen.has(k)) this.add([...p, i], 'Duplicate identity', 'DUPLICATE_ID')
      seen.add(k)
    }
  }
  ui(v: unknown, p: Path) {
    if (!this.object(v, p, [], ['label', 'description', 'group', 'order'])) return
    for (const k of ['label', 'description', 'group'])
      if (Object.hasOwn(v, k)) this.text(v[k], [...p, k])
    if (Object.hasOwn(v, 'order') && !Number.isFinite(v.order))
      this.add([...p, 'order'], 'Expected finite order')
  }
  rule(v: unknown, p: Path) {
    if (!this.object(v, p, ['typeIds', 'includeSubtypes'])) return
    this.array(v.typeIds, [...p, 'typeIds'], (x, q) => this.id(x, q))
    this.unique(v.typeIds, [...p, 'typeIds'])
    if (Array.isArray(v.typeIds) && !v.typeIds.length)
      this.add([...p, 'typeIds'], 'At least one type is required')
    this.bool(v.includeSubtypes, [...p, 'includeSubtypes'])
  }
  bounds(v: Record<string, unknown>, p: Path, minKey: string, maxKey: string, integer: boolean) {
    for (const k of [minKey, maxKey])
      if (Object.hasOwn(v, k)) {
        if (
          typeof v[k] !== 'number' ||
          !Number.isFinite(v[k]) ||
          (integer && (!Number.isSafeInteger(v[k]) || (v[k] as number) < 0))
        )
          this.add([...p, k], 'Invalid bound')
      }
    if (typeof v[minKey] === 'number' && typeof v[maxKey] === 'number' && v[minKey] > v[maxKey])
      this.add(p, 'Contradictory bounds')
  }
  schema(v: unknown, p: Path) {
    if (!record(v)) {
      this.add(p, 'Expected value schema')
      return
    }
    const options: Record<string, string[]> = {
      string: ['minLength', 'maxLength'],
      text: ['minLength', 'maxLength'],
      integer: ['minimum', 'maximum'],
      decimal: ['minimum', 'maximum'],
      boolean: [],
      date: [],
      datetime: [],
      enum: ['values'],
      reference: ['targets'],
      list: ['items', 'minItems', 'maxItems'],
      object: ['fields'],
    }
    if (typeof v.kind !== 'string' || !Object.hasOwn(options, v.kind)) {
      this.add([...p, 'kind'], 'Unknown attribute kind')
      return
    }
    this.object(v, p, ['kind'], ['nullable', ...options[v.kind]])
    if (Object.hasOwn(v, 'nullable')) this.bool(v.nullable, [...p, 'nullable'])
    switch (v.kind) {
      case 'string':
      case 'text':
        this.bounds(v, p, 'minLength', 'maxLength', true)
        break
      case 'integer':
      case 'decimal':
        this.bounds(v, p, 'minimum', 'maximum', false)
        if (v.kind === 'integer')
          for (const k of ['minimum', 'maximum'])
            if (Object.hasOwn(v, k) && !Number.isSafeInteger(v[k]))
              this.add([...p, k], 'Integer bound must be safe')
        break
      case 'enum':
        this.array(v.values, [...p, 'values'], (x, q) => this.text(x, q))
        this.unique(v.values, [...p, 'values'])
        if (Array.isArray(v.values) && !v.values.length) this.add([...p, 'values'], 'Empty enum')
        break
      case 'reference':
        this.rule(v.targets, [...p, 'targets'])
        break
      case 'list':
        this.schema(v.items, [...p, 'items'])
        this.bounds(v, p, 'minItems', 'maxItems', true)
        break
      case 'object':
        this.fields(v.fields, [...p, 'fields'])
        break
    }
  }
  field(v: unknown, p: Path) {
    const before = this.diagnostics.length
    if (!this.object(v, p, ['id', 'schema'], ['required', 'default', 'ui'])) return
    this.id(v.id, [...p, 'id'], false)
    this.schema(v.schema, [...p, 'schema'])
    if (Object.hasOwn(v, 'required')) this.bool(v.required, [...p, 'required'])
    if (Object.hasOwn(v, 'ui')) this.ui(v.ui, [...p, 'ui'])
    if (this.diagnostics.length === before && Object.hasOwn(v, 'default')) {
      const engine = valueEngine({}, true)
      try {
        engine.value(v.schema as ValueSchema, v.default, [...p, 'default'])
      } catch (e) {
        if (e instanceof ValidationFailure) engine.diagnostics.push(e.diagnostic)
        else throw e
      }
      this.diagnostics.push(...engine.diagnostics)
    }
  }
  fields(v: unknown, p: Path) {
    this.array(v, p, (x, q) => this.field(x, q))
    this.unique(v, p, (x) => (record(x) ? x.id : undefined))
  }
  lifecycle(v: unknown, p: Path) {
    if (!this.object(v, p, ['states', 'initial', 'transitions'])) return
    this.array(v.states, [...p, 'states'], (x, q) => this.id(x, q, false))
    this.unique(v.states, [...p, 'states'])
    this.id(v.initial, [...p, 'initial'], false)
    const states = Array.isArray(v.states) ? v.states : []
    if (!states.includes(v.initial)) this.add([...p, 'initial'], 'Undeclared initial state')
    this.array(v.transitions, [...p, 'transitions'], (x, q) => {
      if (!this.object(x, q, ['from', 'to'])) return
      for (const k of ['from', 'to'])
        if (!states.includes(x[k])) this.add([...q, k], 'Undeclared transition state')
    })
    this.unique(v.transitions, [...p, 'transitions'], (x) =>
      record(x) ? JSON.stringify([x.from, x.to]) : undefined,
    )
  }
  objectType(v: unknown, p: Path) {
    if (
      !this.object(
        v,
        p,
        ['id', 'attributes'],
        ['extends', 'abstract', 'lifecycle', 'ui', 'integrationFlow'],
      )
    )
      return
    this.id(v.id, [...p, 'id'])
    this.fields(v.attributes, [...p, 'attributes'])
    if (Object.hasOwn(v, 'integrationFlow')) {
      const c = v.integrationFlow,
        q = [...p, 'integrationFlow']
      if (
        this.object(
          c,
          q,
          ['source', 'consumer', 'search', 'columns', 'nonCloneable'],
          ['editable', 'idPatterns', 'status'],
        )
      ) {
        if (Object.hasOwn(c, 'status')) this.text(c.status, [...q, 'status'])
        this.id(c.source, [...q, 'source'], false)
        this.id(c.consumer, [...q, 'consumer'], false)
        if (c.source === c.consumer) this.add(q, 'Source and consumer must differ')
        for (const key of ['search', 'nonCloneable', 'editable', 'idPatterns'])
          if (Object.hasOwn(c, key))
            this.array(c[key], [...q, key], (value, path) => this.text(value, path))
        if (Array.isArray(c.idPatterns))
          c.idPatterns.forEach((pattern, i) => {
            if (typeof pattern === 'string')
              try {
                new RegExp(pattern, 'u')
              } catch {
                this.add([...q, 'idPatterns', i], 'Invalid ID pattern')
              }
          })
        this.array(c.columns, [...q, 'columns'], (value, path) => {
          if (this.object(value, path, ['field', 'label'])) {
            this.text(value.field, [...path, 'field'])
            this.text(value.label, [...path, 'label'])
          }
        })
      }
    }
    if (Object.hasOwn(v, 'extends')) this.id(v.extends, [...p, 'extends'])
    if (Object.hasOwn(v, 'abstract')) this.bool(v.abstract, [...p, 'abstract'])
    if (Object.hasOwn(v, 'ui')) this.ui(v.ui, [...p, 'ui'])
    if (Object.hasOwn(v, 'lifecycle')) this.lifecycle(v.lifecycle, [...p, 'lifecycle'])
  }
  cardinality(v: unknown, p: Path) {
    if (!this.object(v, p, ['min', 'max'])) return
    if (!Number.isSafeInteger(v.min) || (v.min as number) < 0)
      this.add([...p, 'min'], 'Invalid minimum')
    if (v.max !== null && (!Number.isSafeInteger(v.max) || (v.max as number) < 0))
      this.add([...p, 'max'], 'Invalid maximum')
    if (typeof v.min === 'number' && typeof v.max === 'number' && v.min > v.max)
      this.add(p, 'Contradictory cardinality')
  }
  relation(v: unknown, p: Path) {
    if (
      !this.object(
        v,
        p,
        ['id', 'source', 'target', 'attributes'],
        [
          'direction',
          'sourceCardinality',
          'targetCardinality',
          'allowSelfReference',
          'duplicates',
          'ui',
        ],
      )
    )
      return
    this.id(v.id, [...p, 'id'])
    this.rule(v.source, [...p, 'source'])
    this.rule(v.target, [...p, 'target'])
    this.fields(v.attributes, [...p, 'attributes'])
    if (
      Object.hasOwn(v, 'direction') &&
      !['directed', 'undirected'].includes(v.direction as string)
    )
      this.add([...p, 'direction'], 'Invalid direction')
    if (
      Object.hasOwn(v, 'duplicates') &&
      !['allow', 'forbid-same-type-and-pair'].includes(v.duplicates as string)
    )
      this.add([...p, 'duplicates'], 'Invalid duplicate policy')
    if (Object.hasOwn(v, 'allowSelfReference'))
      this.bool(v.allowSelfReference, [...p, 'allowSelfReference'])
    if (Object.hasOwn(v, 'ui')) this.ui(v.ui, [...p, 'ui'])
    for (const k of ['sourceCardinality', 'targetCardinality'])
      if (Object.hasOwn(v, k)) this.cardinality(v[k], [...p, k])
    if (v.direction === 'undirected') {
      const a = cardinality(v.sourceCardinality as Cardinality | undefined),
        b = cardinality(v.targetCardinality as Cardinality | undefined)
      if (!record(a) || !record(b) || a.min !== b.min || a.max !== b.max)
        this.add(p, 'Undirected bounds must be symmetric')
    }
  }
  profile(v: unknown, p: Path, viewpoint = false) {
    if (
      !this.object(
        v,
        p,
        ['id', 'objectTypes', 'relationTypes'],
        viewpoint ? ['ui', 'presentation'] : ['ui'],
      )
    )
      return
    this.id(v.id, [...p, 'id'])
    for (const k of ['objectTypes', 'relationTypes']) {
      this.array(v[k], [...p, k], (x, q) => this.id(x, q))
      this.unique(v[k], [...p, k])
    }
    if (Object.hasOwn(v, 'ui')) this.ui(v.ui, [...p, 'ui'])
    if (viewpoint && Object.hasOwn(v, 'presentation')) {
      this.array(v.presentation, [...p, 'presentation'], (x, q) => {
        if (this.object(x, q, ['typeId', 'ui'])) {
          this.id(x.typeId, [...q, 'typeId'])
          this.ui(x.ui, [...q, 'ui'])
        }
      })
      this.unique(v.presentation, [...p, 'presentation'], (x) => (record(x) ? x.typeId : undefined))
    }
  }
  model(v: unknown) {
    if (
      !this.object(
        v,
        [],
        [
          'schemaVersion',
          'id',
          'version',
          'imports',
          'objectTypes',
          'relationTypes',
          'profiles',
          'viewpoints',
        ],
      )
    )
      return
    if (v.schemaVersion !== 1)
      this.add(['schemaVersion'], 'Unsupported schema version', 'UNSUPPORTED_VERSION')
    this.id(v.id, ['id'])
    if (!validVersion(v.version)) this.add(['version'], 'Expected semantic version')
    this.array(v.imports, ['imports'], (x, p) => {
      if (this.object(x, p, ['id', 'version'])) {
        this.id(x.id, [...p, 'id'])
        if (!validVersion(x.version)) this.add([...p, 'version'], 'Expected exact semantic version')
      }
    })
    this.unique(v.imports, ['imports'], (x) => (record(x) ? x.id : undefined))
    this.array(v.objectTypes, ['objectTypes'], (x, p) => this.objectType(x, p))
    this.array(v.relationTypes, ['relationTypes'], (x, p) => this.relation(x, p))
    this.array(v.profiles, ['profiles'], (x, p) => this.profile(x, p))
    this.array(v.viewpoints, ['viewpoints'], (x, p) => this.profile(x, p, true))
    const ids = new Set<string>()
    for (const k of ['objectTypes', 'relationTypes', 'profiles', 'viewpoints'])
      if (Array.isArray(v[k]))
        v[k].forEach((x, i) => {
          if (record(x) && typeof x.id === 'string') {
            if (ids.has(x.id)) this.add([k, i, 'id'], 'Duplicate identity', 'DUPLICATE_ID')
            ids.add(x.id)
          }
        })
  }
}
export function decodeModel(input: unknown): Result<ModelDefinition> {
  const safety = inspectJson(input)
  if (safety.length) return { ok: false, diagnostics: safety }
  const reader = new DefinitionReader()
  reader.model(input)
  const diagnostics = reader.diagnostics.map((d) => {
    if (!record(input)) return d
    const collection = input[String(d.path[0])]
    const entry =
      Array.isArray(collection) && typeof d.path[1] === 'number' ? collection[d.path[1]] : undefined
    const entityId =
      record(entry) && typeof entry.id === 'string'
        ? entry.id
        : typeof input.id === 'string'
          ? input.id
          : undefined
    return entityId === undefined ? d : { ...d, entityId }
  })
  return result(clone(input) as ModelDefinition, diagnostics)
}
export function checkFields(fields: readonly AttributeDefinition[]): Diagnostic[] {
  const safety = inspectJson(fields)
  if (safety.length) return safety
  const reader = new DefinitionReader()
  reader.fields(fields, [])
  return reader.diagnostics
}
