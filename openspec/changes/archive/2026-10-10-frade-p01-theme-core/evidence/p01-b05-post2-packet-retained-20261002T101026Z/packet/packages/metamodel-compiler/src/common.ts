import type { ModelImport, Path } from '@frade/metamodel-domain'
import type { CompilerCode, CompilerDiagnostic, CompilerResult, Stage } from './types'
export const LIMITS = Object.freeze({
  text: 1_000_000,
  depth: 64,
  values: 100_000,
  packages: 1024,
  edges: 8192,
  graphDepth: 128,
  totalValues: 1_000_000,
})
export const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
export const record = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === 'object' && !Array.isArray(v)
export function clone<T>(v: T): T {
  if (Array.isArray(v)) return v.map((x) => clone(x)) as T
  if (record(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])) as T
  return v
}
export function freeze<T>(v: T): T {
  if (v && typeof v === 'object') {
    for (const x of Object.values(v)) freeze(x)
    Object.freeze(v)
  }
  return v
}
export function diagnostic(
  code: CompilerCode,
  stage: Stage,
  path: Path = [],
  identity?: ModelImport,
  entityId?: string,
): CompilerDiagnostic {
  return {
    code,
    severity: 'error',
    stage,
    path: [...path],
    message: code.replaceAll('_', ' ').toLowerCase(),
    ...(identity ? { modelId: identity.id, modelVersion: identity.version } : {}),
    ...(entityId ? { entityId } : {}),
  }
}
export class Failure extends Error {
  constructor(readonly diagnostics: readonly CompilerDiagnostic[]) {
    super('Compilation failed')
  }
}
export function fail(
  code: CompilerCode,
  stage: Stage,
  path: Path = [],
  identity?: ModelImport,
  entityId?: string,
): never {
  throw new Failure([diagnostic(code, stage, path, identity, entityId)])
}
export function failure<T>(ds: readonly CompilerDiagnostic[]): CompilerResult<T> {
  return freeze({
    ok: false,
    diagnostics: clone(
      [...ds].sort(
        (a, b) =>
          compare(a.modelId ?? '', b.modelId ?? '') ||
          compare(a.modelVersion ?? '', b.modelVersion ?? '') ||
          compare(a.stage, b.stage) ||
          compare(a.entityId ?? '', b.entityId ?? '') ||
          compare(JSON.stringify(a.path), JSON.stringify(b.path)) ||
          compare(a.code, b.code),
      ),
    ),
  })
}
export const success = <T>(value: T): CompilerResult<T> => ({ ok: true, value, diagnostics: [] })
export function keys(
  v: unknown,
  allowed: string[],
  stage: Stage,
  path: Path = [],
  identity?: ModelImport,
): asserts v is Record<string, any> {
  if (!record(v) || Object.keys(v).some((k) => !allowed.includes(k)))
    fail(stage === 'lock' ? 'LOCK_MISMATCH' : 'INVALID_SOURCE', stage, path, identity)
}
/** Inspect descriptors before touching values. Returns an isolated plain JSON copy. */
export function inspect(
  input: unknown,
  stage: Stage,
  identity?: ModelImport,
): { value: any; count: number } {
  let count = 0
  const active = new Set<object>()
  const visit = (v: unknown, path: Path, depth: number): any => {
    if (++count > LIMITS.values || depth > LIMITS.depth)
      fail('RESOURCE_LIMIT', stage, path, identity)
    if (
      v === null ||
      typeof v === 'string' ||
      typeof v === 'boolean' ||
      (typeof v === 'number' && Number.isFinite(v))
    )
      return v
    if (typeof v !== 'object' || v === null || active.has(v))
      fail('UNSAFE_VALUE', stage, path, identity)
    const array = Array.isArray(v),
      proto = Object.getPrototypeOf(v)
    if (array ? proto !== Array.prototype : proto !== Object.prototype && proto !== null)
      fail('UNSAFE_VALUE', stage, path, identity)
    if (Reflect.ownKeys(v).some((k) => typeof k === 'symbol'))
      fail('UNSAFE_VALUE', stage, path, identity)
    active.add(v)
    const descriptors = Object.getOwnPropertyDescriptors(v)
    if (array) {
      if (v.length > LIMITS.values) fail('RESOURCE_LIMIT', stage, path, identity)
      if (Object.keys(descriptors).length !== v.length + 1)
        fail('UNSAFE_VALUE', stage, path, identity)
      const out: any[] = []
      for (let i = 0; i < v.length; i++) {
        const d = descriptors[String(i)]
        if (!d || !('value' in d) || !d.enumerable)
          fail('UNSAFE_VALUE', stage, [...path, i], identity)
        out.push(visit(d.value, [...path, i], depth + 1))
      }
      active.delete(v)
      return out
    }
    const out: Record<string, unknown> = {}
    for (const [k, d] of Object.entries(descriptors)) {
      if (['__proto__', 'constructor', 'prototype'].includes(k) || !('value' in d) || !d.enumerable)
        fail('UNSAFE_VALUE', stage, [...path, k], identity)
      out[k] = visit(d.value, [...path, k], depth + 1)
    }
    active.delete(v)
    return out
  }
  return { value: visit(input, [], 0), count }
}
const setKeys = new Set([
  'imports',
  'objectTypes',
  'relationTypes',
  'profiles',
  'viewpoints',
  'attributes',
  'fields',
  'typeIds',
  'values',
  'states',
  'transitions',
  'presentation',
  'extensions',
  'packages',
])
/** Defaults contain arbitrary ordered JSON. Never interpret their property names as schema. */
export function canonical(v: unknown, key = '', inDefault = false): string {
  if (Array.isArray(v)) {
    const parts = v.map((x) => ({
      text: canonical(x, '', inDefault),
      id: record(x) ? (x.id ?? x.typeId) : undefined,
    }))
    if (!inDefault && setKeys.has(key))
      parts.sort((a, b) => compare(a.id ?? a.text, b.id ?? b.text) || compare(a.text, b.text))
    return '[' + parts.map((p) => p.text).join(',') + ']'
  }
  if (record(v))
    return (
      '{' +
      Object.keys(v)
        .sort(compare)
        .filter((k) => v[k] !== undefined)
        .map((k) => JSON.stringify(k) + ':' + canonical(v[k], k, inDefault || k === 'default'))
        .join(',') +
      '}'
    )
  return JSON.stringify(v) ?? 'null'
}
