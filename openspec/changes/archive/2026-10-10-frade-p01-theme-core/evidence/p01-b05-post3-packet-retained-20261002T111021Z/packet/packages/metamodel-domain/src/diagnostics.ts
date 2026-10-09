import type { Diagnostic, DiagnosticCode, Path, Result } from './types'
export const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
export function diagnostic(
  code: DiagnosticCode,
  path: Path,
  message: string,
  entityId?: string,
): Diagnostic {
  return {
    code,
    severity: 'error',
    path: [...path],
    ...(entityId === undefined ? {} : { entityId }),
    message,
  }
}
export function ordered(diagnostics: readonly Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort(
    (a, b) =>
      compare(a.entityId ?? '', b.entityId ?? '') ||
      compare(JSON.stringify(a.path), JSON.stringify(b.path)) ||
      compare(a.code, b.code) ||
      compare(a.message, b.message),
  )
}
export function result<T>(value: T, diagnostics: readonly Diagnostic[]): Result<T> {
  return diagnostics.length
    ? { ok: false, diagnostics: ordered(diagnostics) }
    : { ok: true, value, diagnostics: [] }
}
export class ValidationFailure extends Error {
  constructor(readonly diagnostic: Diagnostic) {
    super(diagnostic.message)
  }
}
export const MAX_DEPTH = 64
export const MAX_VALUES = 100000
export const dangerousKeys = new Set(['__proto__', 'prototype', 'constructor'])
export const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)
export function inspectJson(input: unknown): Diagnostic[] {
  let count = 0
  const active = new Set<object>()
  const visit = (v: unknown, path: Path, depth: number) => {
    if (++count > MAX_VALUES || depth > MAX_DEPTH)
      throw new ValidationFailure(
        diagnostic('RESOURCE_LIMIT', path, 'JSON traversal limit exceeded'),
      )
    if (
      v === null ||
      typeof v === 'string' ||
      typeof v === 'boolean' ||
      (typeof v === 'number' && Number.isFinite(v))
    )
      return
    if (typeof v !== 'object' || v === null)
      throw new ValidationFailure(diagnostic('UNSAFE_VALUE', path, 'Expected finite JSON data'))
    if (active.has(v)) throw new ValidationFailure(diagnostic('UNSAFE_VALUE', path, 'Cyclic value'))
    if (Array.isArray(v) && Object.getPrototypeOf(v) !== Array.prototype)
      throw new ValidationFailure(diagnostic('UNSAFE_VALUE', path, 'Non-JSON array prototype'))
    if (
      !Array.isArray(v) &&
      Object.getPrototypeOf(v) !== Object.prototype &&
      Object.getPrototypeOf(v) !== null
    )
      throw new ValidationFailure(diagnostic('UNSAFE_VALUE', path, 'Non-JSON prototype'))
    if (Reflect.ownKeys(v).some((k) => typeof k === 'symbol'))
      throw new ValidationFailure(
        diagnostic('UNSAFE_VALUE', path, 'Symbol properties are not JSON'),
      )
    active.add(v)
    const entries = Object.getOwnPropertyDescriptors(v)
    if (Array.isArray(v)) {
      if (v.length > MAX_VALUES)
        throw new ValidationFailure(diagnostic('RESOURCE_LIMIT', path, 'Value budget exceeded'))
      if (Object.keys(entries).length !== v.length + 1)
        throw new ValidationFailure(diagnostic('UNSAFE_VALUE', path, 'Sparse or extended array'))
      for (let i = 0; i < v.length; i++) {
        const d = entries[String(i)]
        if (!d || !('value' in d) || !d.enumerable)
          throw new ValidationFailure(
            diagnostic('UNSAFE_VALUE', [...path, i], 'Accessor or sparse array'),
          )
        visit(d.value, [...path, i], depth + 1)
      }
    } else
      for (const [key, d] of Object.entries(entries)) {
        if (dangerousKeys.has(key) || !('value' in d) || !d.enumerable)
          throw new ValidationFailure(diagnostic('UNSAFE_VALUE', [...path, key], 'Unsafe property'))
        visit(d.value, [...path, key], depth + 1)
      }
    active.delete(v)
  }
  try {
    visit(input, [], 0)
    return []
  } catch (error) {
    if (error instanceof ValidationFailure) return [error.diagnostic]
    throw error
  }
}
export function clone<T>(v: T): T {
  if (Array.isArray(v)) return v.map((x) => clone(x)) as T
  if (record(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])) as T
  return v
}
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']'
  if (record(v))
    return (
      '{' +
      Object.keys(v)
        .sort(compare)
        .filter((k) => v[k] !== undefined)
        .map((k) => JSON.stringify(k) + ':' + canonical(v[k]))
        .join(',') +
      '}'
    )
  return JSON.stringify(v) ?? 'undefined'
}
