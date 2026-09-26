import { documentationIndex, documentedRule } from './documentation'
import {
  checkConstraint,
  decodeModel,
  constraintFields,
  inspectJson,
  type Constraint,
  type FieldMetadata,
  type JsonValue,
} from '@frade/metamodel-domain'
import { compileConstraintTypes } from '@frade/metamodel-compiler'

export interface MetadataSet {
  readonly id: string
  readonly label: string
  readonly folderPath: string
  readonly schemaEntries: readonly string[]
  readonly documentEntries: readonly string[]
  readonly dialect: string
}
export interface DocumentLoader {
  load(entry: string): Promise<unknown>
  text?(entry: string): Promise<string>
}
export interface TypeMapping {
  readonly externalId: string
  readonly typeId: string
  readonly nameFields: readonly string[]
  readonly section: string
  readonly integrationFlow?: import('@frade/metamodel-domain').IntegrationFlowMetadata
}
export interface ConfigDialect {
  readonly id: string
  mapping(externalId: string, source: string): TypeMapping
}
export interface ImportedType extends TypeMapping {
  readonly label: string
  readonly description: string
  readonly source: string
  readonly rule: Constraint
  readonly idPatterns: readonly string[]
  readonly fields: readonly FieldMetadata[]
}
export interface ImportedMetamodel {
  readonly dialect: string
  readonly fingerprint: string
  readonly types: readonly ImportedType[]
  readonly documents: readonly { entry: string; text: string }[]
  readonly inputs: readonly string[]
}
export class MetadataError extends Error {
  constructor(
    readonly code: string,
    readonly entry: string,
    message: string,
  ) {
    super(message)
  }
}
const obj = (v: unknown): v is Record<string, any> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)
const canonical = (v: unknown): string =>
  JSON.stringify(v, (_k, x) =>
    obj(x)
      ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : x,
  )
function fail(code: string, entry: string, message: string): never {
  throw new MetadataError(code, entry, message)
}
/** Logical, portable entries only. The host must additionally enforce realpath containment. */
export function resolveEntry(entry: string, from = ''): string {
  if (
    !entry ||
    entry.includes('\\') ||
    entry.startsWith('/') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(entry) ||
    entry.includes('\0')
  )
    return fail('INVALID_ENTRY', entry, 'Expected a relative metadata entry')
  const parts = from ? from.split('/').slice(0, -1) : []
  for (const part of entry.split('/')) {
    if (part === '..') {
      if (!parts.length) fail('PATH_ESCAPE', entry, 'Entry leaves metadata folder')
      parts.pop()
    } else if (part && part !== '.') parts.push(part)
  }
  return parts.join('/')
}
export async function importMetamodel(
  set: MetadataSet,
  loader: DocumentLoader,
  dialect: ConfigDialect,
  sha256: (text: string) => Promise<string>,
): Promise<ImportedMetamodel> {
  if (set.dialect !== dialect.id) fail('UNKNOWN_DIALECT', '', set.dialect)
  const docs = new Map<string, unknown>(),
    active = new Set<string>()
  let total = 0
  const load = async (entry: string, depth = 0): Promise<void> => {
    if (active.has(entry)) fail('IMPORT_CYCLE', entry, 'Metadata import cycle')
    if (docs.has(entry)) return
    if (depth > 64 || docs.size >= 1024) fail('RESOURCE_LIMIT', entry, 'Metadata graph limit')
    active.add(entry)
    const value = await loader.load(entry),
      unsafe = inspectJson(value)
    if (unsafe.length || !obj(value))
      fail('INVALID_DOCUMENT', entry, 'Expected safe metadata mapping')
    total += canonical(value).length
    if (total > 16_000_000) fail('RESOURCE_LIMIT', entry, 'Metadata size limit')
    docs.set(entry, value)
    const imports = value.imports ?? []
    if (!Array.isArray(imports) || imports.some((x) => typeof x !== 'string'))
      fail('INVALID_IMPORTS', entry, 'Expected import paths')
    for (const item of imports) await load(resolveEntry(item, entry), depth + 1)
    active.delete(entry)
  }
  for (const entry of set.schemaEntries) await load(resolveEntry(entry))
  const entities = new Map<string, { entry: string; value: Record<string, any> }>(),
    defs = new Map<string, unknown>(),
    routes = new Map<string, string>()
  for (const [entry, value] of docs) {
    const entries = (value as Record<string, any>).entities ?? {}
    if (!obj(entries)) fail('INVALID_ENTITIES', entry, 'Expected entity map')
    for (const [id, entity] of Object.entries(entries)) {
      if (!obj(entity) || !obj(entity.schema)) fail('INVALID_SCHEMA', entry, id)
      if (entities.has(id)) fail('DUPLICATE_ENTITY', entry, id)
      entities.set(id, { entry, value: entity })
      for (const [name, rule] of Object.entries(entity.schema.$defs ?? {})) {
        if (defs.has(name) && canonical(defs.get(name)) !== canonical(rule))
          fail('DUPLICATE_DEFINITION', entry, name)
        defs.set(name, rule)
      }
      for (const [name, route] of Object.entries(entity.objects ?? {})) {
        if (!obj(route) || route.route !== '/') fail('UNSUPPORTED_ROUTE', entry, id + '.' + name)
        routes.set(id + '.' + name, dialect.mapping(id, entry).typeId)
      }
    }
  }
  const stack = new Set<string>()
  let expanded = 0
  const normalize = (value: unknown, entry: string, group?: string): Constraint => {
    if (++expanded > 100000 || stack.size > 64)
      fail('RESOURCE_LIMIT', entry, 'Expanded schema limit')
    if (!obj(value)) return fail('INVALID_SCHEMA', entry, 'Expected schema object')
    const out: Record<string, any> = {}
    for (const [key, v] of Object.entries(value)) {
      if (key === '$defs' || key === '$ref' || key === '$comment') continue
      if (['properties', 'patternProperties'].includes(key)) {
        if (!obj(v)) fail('INVALID_SCHEMA', entry, key)
        out[key] = Object.fromEntries(
          Object.entries(v).map(([k, r]) => [k, normalize(r, entry, group)]),
        )
      } else if (['allOf', 'anyOf', 'oneOf'].includes(key)) {
        if (!Array.isArray(v)) fail('INVALID_SCHEMA', entry, key)
        out[key] = v.map((r: unknown) => normalize(r, entry, group))
      } else if (
        ['items', 'if', 'then', 'else'].includes(key) ||
        (key === 'additionalProperties' && typeof v !== 'boolean')
      )
        out[key] = normalize(v, entry, group)
      else out[key] = v
    }
    if (group && !out.group) out.group = group
    if (value.$ref !== undefined) {
      const ref = value.$ref
      if (typeof ref !== 'string') fail('INVALID_REFERENCE', entry, 'Reference must be text')
      if (ref.startsWith('#/$rels/')) {
        const type = routes.get(ref.slice(8))
        if (!type) fail('MISSING_ROUTE', entry, ref)
        out.referenceTargets = [type]
      } else if (ref.startsWith('#/$defs/')) {
        const name = ref.slice(8),
          definition = defs.get(name)
        if (!definition) fail('MISSING_DEFINITION', entry, ref)
        if (stack.has(name)) fail('REFERENCE_CYCLE', entry, ref)
        stack.add(name)
        const resolved = normalize(
          definition,
          entry,
          obj(definition) && typeof definition.$comment === 'string' ? definition.$comment : group,
        )
        stack.delete(name)
        if (!Object.keys(out).length) return resolved
        out.allOf = [resolved, ...(out.allOf ?? [])]
      } else fail('UNSUPPORTED_REFERENCE', entry, ref)
    }
    const issues = checkConstraint(out)
    if (issues.length)
      fail(
        'UNSUPPORTED_CONSTRAINT',
        entry,
        issues.map((i) => i.path.join('.') + ': ' + i.message).join('; '),
      )
    return out as Constraint
  }
  const types: ImportedType[] = []
  for (const [id, { entry, value }] of entities) {
    const patterns = value.schema.patternProperties
    if (!patterns) continue // shared definition-only entity, never a data collection
    if (!obj(patterns) || !Object.keys(patterns).length) fail('INVALID_SCHEMA', entry, id)
    const mapping = dialect.mapping(id, entry)
    const rules = Object.values(patterns).map((r) => normalize(r, entry))
    const rule: Constraint = rules.length === 1 ? rules[0] : { allOf: rules }
    const integrationFlow = value.integrationFlow ?? mapping.integrationFlow
    if (integrationFlow) {
      const checked = decodeModel({
        schemaVersion: 1,
        id: 'flow:capability',
        version: '1.0.0',
        imports: [],
        objectTypes: [{ id: mapping.typeId, attributes: [], integrationFlow }],
        relationTypes: [],
        profiles: [],
        viewpoints: [],
      })
      if (!checked.ok) fail('INVALID_SCHEMA', entry, 'Invalid integrationFlow capability')
      const fields = constraintFields(rule)
      if (integrationFlow.status && !fields.some((f) => f.key === integrationFlow.status))
        fail('INVALID_SCHEMA', entry, 'Flow status must name a field')
      for (const role of [integrationFlow.source, integrationFlow.consumer])
        if (!fields.some((f) => f.key === role && f.rule.referenceTargets?.length))
          fail('INVALID_SCHEMA', entry, 'Flow role must be a reference field: ' + role)
    }
    types.push({
      ...mapping,
      ...(integrationFlow ? { integrationFlow } : {}),
      label: value.title ?? id,
      description: value.description ?? '',
      source: entry,
      rule,
      idPatterns: Object.keys(patterns),
      fields: constraintFields(rule),
    })
  }
  types.sort((a, b) => (a.typeId < b.typeId ? -1 : 1))
  await compileConstraintTypes(
    types.map((t) => ({ id: t.typeId, rule: t.rule })),
    sha256,
  )
  const documents: { entry: string; text: string }[] = []
  for (const raw of set.documentEntries) {
    const entry = resolveEntry(raw)
    if (!loader.text) fail('MISSING_LOADER', entry, 'Text loader required')
    const text = await loader.text!(entry)
    total += text.length
    if (total > 16_000_000) fail('RESOURCE_LIMIT', entry, 'Metadata size limit')
    documents.push({ entry, text })
  }
  documents.sort((a, b) => (a.entry < b.entry ? -1 : 1))
  const documentation = documentationIndex(documents)
  for (let i = 0; i < types.length; i++) {
    const t = types[i],
      doc = documentation.get(t.externalId),
      rule = documentedRule(t.rule, doc)
    types[i] = {
      ...t,
      label: t.label === t.externalId && doc?.label ? doc.label : t.label,
      description: t.description || doc?.description || '',
      rule,
      fields: constraintFields(rule),
    }
  }
  const fingerprint = await sha256(
    canonical({
      dialect: dialect.id,
      types,
      documents,
      inputs: [...docs].sort(([a], [b]) => (a < b ? -1 : 1)),
    }),
  )
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) fail('INVALID_FINGERPRINT', '', 'Expected SHA-256')
  return { dialect: dialect.id, fingerprint, types, documents, inputs: [...docs.keys()].sort() }
}
/** Reference leaves stay explicit; alternatives may constrain their target types. */
export function referenceTargets(rule: Constraint): readonly string[] {
  return [
    ...new Set([
      ...(rule.referenceTargets ?? []),
      ...[...(rule.allOf ?? []), ...(rule.anyOf ?? []), ...(rule.oneOf ?? [])].flatMap(
        referenceTargets,
      ),
    ]),
  ]
}
export function mapAttributeReferences(
  value: JsonValue,
  rule: Constraint,
  transform: (
    value: JsonValue,
    targets: readonly string[],
    path: readonly (string | number)[],
  ) => JsonValue,
  path: readonly (string | number)[] = [],
): JsonValue {
  const targets = referenceTargets(rule)
  if (targets.length) return transform(value, targets, path)
  if (Array.isArray(value)) {
    const item =
      rule.items ??
      [...(rule.allOf ?? []), ...(rule.anyOf ?? []), ...(rule.oneOf ?? [])].find((r) => r.items)
        ?.items
    return item
      ? value.map((v, i) => mapAttributeReferences(v, item, transform, [...path, i]))
      : value
  }
  if (obj(value)) {
    const fields = constraintFields(rule, value)
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => {
        const field = fields.find((f) => f.key === k)
        return [k, field ? mapAttributeReferences(v, field.rule, transform, [...path, k]) : v]
      }),
    )
  }
  return value
}
