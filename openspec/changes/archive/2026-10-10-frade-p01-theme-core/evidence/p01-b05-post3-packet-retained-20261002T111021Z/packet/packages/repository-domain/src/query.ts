import { canonicalJson, copyJson, fields, LIMITS, record } from './codec'
import { failure, success, type JsonValue, type Result } from './types'
export type Filter =
  | { readonly op: 'and' | 'or'; readonly filters: readonly Filter[] }
  | { readonly op: 'not'; readonly filter: Filter }
  | {
      readonly op: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'in' | 'exists'
      readonly field: string
      readonly value?: JsonValue
    }
export interface Query {
  readonly where?: Filter
  readonly sort?: readonly { readonly field: string; readonly direction: 'asc' | 'desc' }[]
  readonly projection?: readonly string[]
  readonly limit?: number
  readonly cursor?: string
}
export interface Page<T> {
  readonly items: readonly T[]
  readonly revision: string
  readonly cursor?: string
}
export const QUERY_OPERATORS = [
  'eq',
  'ne',
  'lt',
  'lte',
  'gt',
  'gte',
  'in',
  'exists',
  'and',
  'or',
  'not',
] as const
const fieldValid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^(typeId|name|revision|ref\.(objectId|relationId|repositoryId)|source\.(objectId|repositoryId)|target\.(objectId|repositoryId)|attributes\.[A-Za-z0-9_.-]+)$/.test(
    v,
  ) &&
  !v.split('.').some((k) => ['__proto__', 'constructor', 'prototype'].includes(k))
function validFilter(v: unknown): boolean {
  if (!record(v)) return false
  if (v.op === 'and' || v.op === 'or')
    return (
      fields(v, ['op', 'filters']) &&
      Array.isArray(v.filters) &&
      v.filters.length > 0 &&
      v.filters.every(validFilter)
    )
  if (v.op === 'not') return fields(v, ['op', 'filter']) && validFilter(v.filter)
  if (!QUERY_OPERATORS.includes(v.op as (typeof QUERY_OPERATORS)[number]) || !fieldValid(v.field))
    return false
  return v.op === 'exists'
    ? fields(v, ['op', 'field'])
    : fields(v, ['op', 'field', 'value']) && (v.op !== 'in' || Array.isArray(v.value))
}
export function decodeQuery(input: unknown): Result<Query> {
  const safe = copyJson(input)
  if (!safe.ok) return safe
  const v = safe.value
  if (
    !fields(v, [], ['where', 'sort', 'projection', 'limit', 'cursor']) ||
    (v.where !== undefined && !validFilter(v.where)) ||
    (v.limit !== undefined &&
      (!Number.isInteger(v.limit) ||
        (v.limit as number) < 1 ||
        (v.limit as number) > LIMITS.page)) ||
    (v.cursor !== undefined && (typeof v.cursor !== 'string' || v.cursor.length > 20000))
  )
    return failure('INVALID_INPUT')
  if (
    v.sort !== undefined &&
    (!Array.isArray(v.sort) ||
      v.sort.length > 10 ||
      !v.sort.every(
        (s) =>
          fields(s, ['field', 'direction']) &&
          fieldValid(s.field) &&
          (s.direction === 'asc' || s.direction === 'desc'),
      ))
  )
    return failure('INVALID_INPUT')
  if (
    v.projection !== undefined &&
    (!Array.isArray(v.projection) ||
      !v.projection.every(
        (f) => typeof f === 'string' && ['name', 'attributes', 'source', 'target'].includes(f),
      ))
  )
    return failure('INVALID_INPUT')
  return success(v as unknown as Query)
}
export function fieldValue(entity: unknown, field: string): unknown {
  let current = entity
  for (const part of field.split('.')) {
    if (!record(current) || !Object.hasOwn(current, part)) return undefined
    current = current[part]
  }
  return current
}
function compare(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === undefined) return -1
  if (b === undefined) return 1
  if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : 1
  const left = canonicalJson(a as JsonValue),
    right = canonicalJson(b as JsonValue)
  return left < right ? -1 : left > right ? 1 : 0
}
export function compareQueryEntities(a: unknown, b: unknown, sort: Query['sort'] = []): number {
  for (const s of sort ?? []) {
    const order = compare(fieldValue(a, s.field), fieldValue(b, s.field))
    if (order) return s.direction === 'asc' ? order : -order
  }
  return compare(fieldValue(a, 'ref'), fieldValue(b, 'ref'))
}
export function matchesFilter(entity: unknown, filter: Filter): boolean {
  if (filter.op === 'and' || filter.op === 'or')
    return filter.op === 'and'
      ? filter.filters.every((f) => matchesFilter(entity, f))
      : filter.filters.some((f) => matchesFilter(entity, f))
  if (filter.op === 'not') return !matchesFilter(entity, filter.filter)
  if (!('field' in filter)) return false
  const actual = fieldValue(entity, filter.field)
  if (filter.op === 'exists') return actual !== undefined
  if (actual === undefined) return false
  if (filter.op === 'eq') return compare(actual, filter.value) === 0
  if (filter.op === 'ne') return compare(actual, filter.value) !== 0
  if (filter.op === 'in') return (filter.value as JsonValue[]).some((v) => compare(actual, v) === 0)
  if (typeof actual !== typeof filter.value || !['number', 'string'].includes(typeof actual))
    return false
  const order = compare(actual, filter.value)
  return filter.op === 'lt'
    ? order < 0
    : filter.op === 'lte'
      ? order <= 0
      : filter.op === 'gt'
        ? order > 0
        : order >= 0
}
/** Portable bounded executor for an already materialized catalog; storage may implement equivalent pushdown. */
export function queryEntities<T>(
  entities: readonly T[],
  input: unknown,
  scope: string,
  revision: string,
): Result<Page<Partial<T>>> {
  const decoded = decodeQuery(input)
  if (!decoded.ok) return decoded
  const query = decoded.value,
    { cursor, ...rest } = query
  const signature = canonicalJson(rest as unknown as JsonValue)
  let offset = 0
  if (cursor !== undefined) {
    try {
      const c: unknown = JSON.parse(cursor)
      if (
        !fields(c, ['scope', 'revision', 'query', 'offset']) ||
        c.scope !== scope ||
        c.query !== signature ||
        !Number.isSafeInteger(c.offset) ||
        (c.offset as number) < 0
      )
        return failure('INVALID_CURSOR')
      if (c.revision !== revision) return failure('STALE_CURSOR')
      offset = c.offset as number
    } catch {
      return failure('INVALID_CURSOR')
    }
  }
  const sorted = entities
    .filter((e) => !query.where || matchesFilter(e, query.where))
    .sort((a, b) => compareQueryEntities(a, b, query.sort))
  const limit = query.limit ?? 100
  const selected = sorted.slice(offset, offset + limit)
  const copied = copyJson(selected)
  if (!copied.ok) return copied
  const rows = (copied.value as Record<string, JsonValue>[]).map((row) =>
    query.projection
      ? Object.fromEntries(
          Object.entries(row).filter(([k]) =>
            ['ref', 'typeId', 'revision', ...query.projection!].includes(k),
          ),
        )
      : row,
  )
  return success({
    items: rows as Partial<T>[],
    revision,
    ...(offset + limit < sorted.length
      ? { cursor: JSON.stringify({ scope, revision, query: signature, offset: offset + limit }) }
      : {}),
  })
}
