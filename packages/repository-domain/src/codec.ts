import {
  failure,
  success,
  type Result,
  type JsonValue,
  type RepositoryObject,
  type RepositoryRelation,
  type RepositorySnapshot,
  type ResourceProvenance,
  type ObjectRef,
  type RelationRef,
  type EntityKind,
} from './types'
import type { ProspectiveSnapshot } from '@frade/metamodel-domain'

export const LIMITS = Object.freeze({
  depth: 64,
  values: 100000,
  page: 1000,
  batch: 1000,
  operations: 1024,
  traversalDepth: 32,
  traversalResults: 10000,
})
const unsafe = new Set(['__proto__', 'prototype', 'constructor'])
export const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
export const nonblank = (value: unknown): value is string =>
  typeof value === 'string' && !!value.trim()
export const typeId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*:[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
export function fields(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is Record<string, unknown> {
  return (
    record(value) &&
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => required.includes(key) || optional.includes(key))
  )
}
/** Copies bounded plain JSON via descriptors. Never invokes property getters. */
export function copyJson(input: unknown): Result<JsonValue> {
  let count = 0
  const active = new Set<object>()
  const visit = (value: unknown, depth: number): JsonValue => {
    if (++count > LIMITS.values || depth > LIMITS.depth) throw 'RESOURCE_LIMIT'
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (value === null || typeof value !== 'object') throw 'INVALID_INPUT'
    if (active.has(value)) throw 'INVALID_INPUT'
    const array = Array.isArray(value),
      proto = Object.getPrototypeOf(value)
    if (array ? proto !== Array.prototype : proto !== Object.prototype && proto !== null)
      throw 'INVALID_INPUT'
    const keys = Reflect.ownKeys(value)
    if (keys.some((key) => typeof key === 'symbol')) throw 'INVALID_INPUT'
    if (keys.length > LIMITS.values + 1) throw 'RESOURCE_LIMIT'
    const descriptors = Object.getOwnPropertyDescriptors(value)
    active.add(value)
    let output: JsonValue
    if (array) {
      if (value.length > LIMITS.values) throw 'RESOURCE_LIMIT'
      if (keys.length !== value.length + 1) throw 'INVALID_INPUT'
      const values: JsonValue[] = []
      for (let i = 0; i < value.length; i++) {
        const d = descriptors[String(i)]
        if (!d || !('value' in d) || !d.enumerable) throw 'INVALID_INPUT'
        values.push(visit(d.value, depth + 1))
      }
      output = values
    } else {
      const values: Record<string, JsonValue> = {}
      for (const [key, d] of Object.entries(descriptors)) {
        if (unsafe.has(key) || !('value' in d) || !d.enumerable) throw 'INVALID_INPUT'
        values[key] = visit(d.value, depth + 1)
      }
      output = values
    }
    active.delete(value)
    return output
  }
  try {
    return success(visit(input, 0))
  } catch (error) {
    return failure(error === 'RESOURCE_LIMIT' ? 'RESOURCE_LIMIT' : 'INVALID_INPUT')
  }
}
/** Canonicalizes already validated JSON; keys sorted, array order preserved. */
export function canonicalJson(value: JsonValue): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']'
  if (value !== null && typeof value === 'object')
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ':' + canonicalJson(value[key]))
        .join(',') +
      '}'
    )
  return JSON.stringify(value)
}
export function isReference(
  value: unknown,
  kind: EntityKind = 'object',
): value is ObjectRef | RelationRef {
  const id = kind === 'object' ? 'objectId' : 'relationId'
  return fields(value, ['repositoryId', id]) && nonblank(value.repositoryId) && nonblank(value[id])
}
function entityShape(value: unknown, kind: EntityKind): boolean {
  const relation = kind === 'relation'
  return (
    fields(
      value,
      relation
        ? ['ref', 'typeId', 'source', 'target', 'attributes', 'revision']
        : ['ref', 'typeId', 'name', 'attributes', 'revision'],
    ) &&
    isReference(value.ref, kind) &&
    typeId(value.typeId) &&
    record(value.attributes) &&
    nonblank(value.revision) &&
    (relation ? isReference(value.source) && isReference(value.target) : nonblank(value.name))
  )
}
export function decodeObject(input: unknown): Result<RepositoryObject> {
  const safe = copyJson(input)
  if (!safe.ok) return safe
  return entityShape(safe.value, 'object')
    ? success(safe.value as unknown as RepositoryObject)
    : failure('INVALID_INPUT')
}
export function decodeRelation(input: unknown): Result<RepositoryRelation> {
  const safe = copyJson(input)
  if (!safe.ok) return safe
  return entityShape(safe.value, 'relation')
    ? success(safe.value as unknown as RepositoryRelation)
    : failure('INVALID_INPUT')
}
export function decodeProvenance(input: unknown): Result<ResourceProvenance> {
  const safe = copyJson(input)
  if (!safe.ok) return safe
  const v = safe.value
  return fields(v, ['kind', 'ref', 'locator'], ['label']) &&
    (v.kind === 'object' || v.kind === 'relation') &&
    isReference(v.ref, v.kind) &&
    nonblank(v.locator) &&
    (v.label === undefined || typeof v.label === 'string')
    ? success(v as unknown as ResourceProvenance)
    : failure('INVALID_INPUT')
}
export function decodeSnapshot(input: unknown): Result<RepositorySnapshot> {
  const safe = copyJson(input)
  if (!safe.ok) return safe
  const v = safe.value
  if (
    !fields(v, ['repositoryId', 'revision', 'complete', 'binding', 'objects', 'relations']) ||
    !nonblank(v.repositoryId) ||
    !nonblank(v.revision) ||
    typeof v.complete !== 'boolean' ||
    !Array.isArray(v.objects) ||
    !Array.isArray(v.relations)
  )
    return failure('INVALID_INPUT')
  const b = v.binding
  if (
    !fields(b, ['modelId', 'modelVersion', 'fingerprint']) ||
    !typeId(b.modelId) ||
    typeof b.modelVersion !== 'string' ||
    typeof b.fingerprint !== 'string' ||
    !/^\p{ASCII}+$/u.test(b.modelVersion) ||
    !/^([a-f0-9]{64})$/.test(b.fingerprint)
  )
    return failure('INVALID_INPUT')
  const version =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(
      b.modelVersion,
    )
  if (
    !version ||
    version[4]?.split('.').some((s) => /^\d+$/.test(s) && s !== '0' && s.startsWith('0'))
  )
    return failure('INVALID_INPUT')
  if (
    !v.objects.every((o) => entityShape(o, 'object')) ||
    !v.relations.every((r) => entityShape(r, 'relation'))
  )
    return failure('INVALID_INPUT')
  return success(v as unknown as RepositorySnapshot)
}
export function validationProjection(snapshot: RepositorySnapshot): ProspectiveSnapshot {
  const projected = {
    objects: snapshot.objects.map(({ ref, typeId, attributes }) => ({ ref, typeId, attributes })),
    relations: snapshot.relations.map(({ ref, typeId, source, target, attributes }) => ({
      ref,
      typeId,
      source,
      target,
      attributes,
    })),
  }
  const copied = copyJson(projected)
  if (!copied.ok) throw Error(copied.error.code)
  return copied.value as unknown as ProspectiveSnapshot
}
