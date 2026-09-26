import { validateAttributes } from '@frade/metamodel-domain'
import { copyJson, fields, record, canonicalJson } from './codec'
import {
  failure,
  success,
  entityKey,
  type JsonValue,
  type ModelAnalysis,
  type Entity,
  type Result,
  type Issue,
  type RepositorySnapshot,
} from './types'
export interface AttributePolicy {
  readonly readOnly?: boolean
  readonly computed?:
    | { readonly kind: 'literal'; readonly value: JsonValue }
    | { readonly kind: 'attribute'; readonly key: string }
}
export interface EntityPolicy {
  readonly creation?: 'allow' | 'deny'
  readonly deletion?: 'RESTRICT' | 'CASCADE' | 'deny'
  readonly lifecycleAttribute?: string
  readonly attributes?: Readonly<Record<string, AttributePolicy>>
  readonly acyclic?: boolean
}
export interface RepositoryPolicy {
  readonly schemaVersion: 1
  readonly objectTypes: Readonly<Record<string, EntityPolicy>>
  readonly relationTypes: Readonly<Record<string, EntityPolicy>>
}
function computationOrder(
  attributes: Readonly<Record<string, AttributePolicy>>,
): string[] | undefined {
  const pending = new Set(Object.keys(attributes).filter((key) => attributes[key].computed)),
    ordered: string[] = []
  while (pending.size) {
    let changed = false
    for (const key of pending) {
      const computation = attributes[key].computed!
      if (computation.kind === 'attribute' && pending.has(computation.key)) continue
      ordered.push(key)
      pending.delete(key)
      changed = true
    }
    if (!changed) return undefined
  }
  return ordered
}
export function decodeRepositoryPolicy(
  input: unknown,
  analysis: ModelAnalysis,
): Result<RepositoryPolicy> {
  const safe = copyJson(input)
  if (!safe.ok) return failure('METAMODEL_INVALID')
  const value = safe.value
  if (
    !fields(value, ['schemaVersion', 'objectTypes', 'relationTypes']) ||
    value.schemaVersion !== 1 ||
    !record(value.objectTypes) ||
    !record(value.relationTypes)
  )
    return failure('METAMODEL_INVALID')
  for (const kind of ['objectTypes', 'relationTypes'] as const) {
    const policies = value[kind] as Record<string, unknown>,
      types = analysis[kind]
    for (const [id, rule] of Object.entries(policies)) {
      const type = types.get(id)
      if (
        !type ||
        !fields(
          rule,
          [],
          ['creation', 'deletion', 'lifecycleAttribute', 'attributes', 'acyclic'],
        ) ||
        (rule.creation !== undefined && !['allow', 'deny'].includes(String(rule.creation))) ||
        (rule.deletion !== undefined &&
          !['RESTRICT', 'CASCADE', 'deny'].includes(String(rule.deletion))) ||
        (rule.acyclic !== undefined &&
          (kind !== 'relationTypes' || typeof rule.acyclic !== 'boolean'))
      )
        return failure('METAMODEL_INVALID')
      const definitions = new Map(type.attributes.map((a) => [a.id, a]))
      if (
        rule.lifecycleAttribute !== undefined &&
        (kind !== 'objectTypes' ||
          !('lifecycle' in type) ||
          !type.lifecycle ||
          typeof rule.lifecycleAttribute !== 'string' ||
          !definitions.has(rule.lifecycleAttribute))
      )
        return failure('METAMODEL_INVALID')
      if (rule.attributes !== undefined) {
        if (!record(rule.attributes)) return failure('METAMODEL_INVALID')
        for (const [key, attribute] of Object.entries(rule.attributes)) {
          if (
            !definitions.has(key) ||
            !fields(attribute, [], ['readOnly', 'computed']) ||
            (attribute.readOnly !== undefined && typeof attribute.readOnly !== 'boolean')
          )
            return failure('METAMODEL_INVALID')
          if (attribute.computed !== undefined) {
            const expr = attribute.computed
            if (!record(expr)) return failure('METAMODEL_INVALID')
            if (expr.kind === 'literal') {
              if (
                !fields(expr, ['kind', 'value']) ||
                !validateAttributes([definitions.get(key)!], { [key]: expr.value }).ok
              )
                return failure('METAMODEL_INVALID')
            } else if (expr.kind === 'attribute') {
              if (
                !fields(expr, ['kind', 'key']) ||
                typeof expr.key !== 'string' ||
                !definitions.has(expr.key)
              )
                return failure('METAMODEL_INVALID')
            } else return failure('METAMODEL_INVALID')
          }
        }
        if (!computationOrder(rule.attributes as Record<string, AttributePolicy>))
          return failure('METAMODEL_INVALID')
      }
    }
  }
  return success(value as unknown as RepositoryPolicy)
}
const equal = (a: unknown, b: unknown) =>
  a === undefined || b === undefined
    ? a === b
    : canonicalJson(a as JsonValue) === canonicalJson(b as JsonValue)
export function applyAttributePolicies(
  entity: Entity,
  previous: Entity | undefined,
  rule: EntityPolicy | undefined,
): Result<Entity> {
  const attributes = { ...entity.attributes },
    errors: Issue[] = [],
    policies = rule?.attributes ?? {}
  for (const [key, policy] of Object.entries(policies)) {
    if (policy.readOnly && previous && !equal(attributes[key], previous.attributes[key]))
      errors.push({
        code: 'READ_ONLY_ATTRIBUTE',
        message: 'Attribute is readonly',
        ref: entity.ref,
        path: ['attributes', key],
      })
  }
  const order = computationOrder(policies)
  if (!order) return failure('METAMODEL_INVALID')
  for (const key of order) {
    const computation = policies[key].computed!,
      value = computation.kind === 'literal' ? computation.value : attributes[computation.key]
    if (
      Object.hasOwn(entity.attributes, key) &&
      !equal(entity.attributes[key], previous?.attributes[key]) &&
      !equal(entity.attributes[key], value)
    )
      errors.push({
        code: 'COMPUTED_ATTRIBUTE',
        message: 'Computed attributes are not caller editable',
        ref: entity.ref,
        path: ['attributes', key],
      })
    if (value === undefined) delete attributes[key]
    else attributes[key] = value
  }
  if (errors.length) return failure('VALIDATION_FAILED', errors)
  const copied = copyJson(attributes)
  return copied.ok
    ? success({ ...entity, attributes: copied.value as Record<string, JsonValue> })
    : copied
}
export function validatePolicyChanges(
  policy: RepositoryPolicy | undefined,
  before: RepositorySnapshot,
  after: RepositorySnapshot,
): Result<true> {
  if (!policy) return success(true)
  const errors: Issue[] = []
  for (const kind of ['object', 'relation'] as const) {
    const oldEntities = kind === 'object' ? before.objects : before.relations,
      newEntities = kind === 'object' ? after.objects : after.relations,
      rules = kind === 'object' ? policy.objectTypes : policy.relationTypes
    const oldMap = new Map(oldEntities.map((e) => [entityKey(kind, e.ref), e])),
      newMap = new Map(newEntities.map((e) => [entityKey(kind, e.ref), e]))
    for (const [key, entity] of newMap)
      if (!oldMap.has(key) && rules[entity.typeId]?.creation === 'deny')
        errors.push({
          code: 'CREATION_FORBIDDEN',
          message: 'Creation policy denied',
          ref: entity.ref,
          path: [],
        })
    for (const [key, entity] of oldMap)
      if (!newMap.has(key) && rules[entity.typeId]?.deletion === 'deny')
        errors.push({
          code: 'DELETION_FORBIDDEN',
          message: 'Deletion policy denied',
          ref: entity.ref,
          path: [],
        })
  }
  for (const [typeId, rule] of Object.entries(policy.relationTypes))
    if (rule.acyclic) {
      const adjacency = new Map<string, string[]>(),
        degree = new Map<string, number>()
      for (const edge of after.relations)
        if (edge.typeId === typeId) {
          const a = entityKey('object', edge.source),
            b = entityKey('object', edge.target)
          if (!degree.has(a)) degree.set(a, 0)
          degree.set(b, (degree.get(b) ?? 0) + 1)
          const list = adjacency.get(a) ?? []
          list.push(b)
          adjacency.set(a, list)
        }
      const queue = [...degree].filter(([, n]) => n === 0).map(([key]) => key)
      let visited = 0
      for (let i = 0; i < queue.length; i++) {
        visited++
        for (const next of adjacency.get(queue[i]) ?? []) {
          const n = degree.get(next)! - 1
          degree.set(next, n)
          if (n === 0) queue.push(next)
        }
      }
      if (visited !== degree.size) {
        const edge = after.relations.find(
          (e) => e.typeId === typeId && degree.get(entityKey('object', e.source))! > 0,
        )!
        errors.push({
          code: 'RELATION_CYCLE',
          message: 'Relation type forbids cycles',
          ref: edge.ref,
          path: ['typeId'],
        })
      }
    }
  return errors.length ? failure('VALIDATION_FAILED', errors) : success(true)
}
