import {
  failure,
  copyJson,
  record,
  nonblank,
  type ErrorCode,
  type Result,
} from '@frade/repository-domain'
import type { CancellationToken } from '@frade/repository-ports'
export class CancellationSource implements CancellationToken {
  private cancelled = false
  private listeners = new Set<() => void>()
  get isCancellationRequested() {
    return this.cancelled
  }
  subscribe(listener: () => void) {
    if (this.cancelled) listener()
    else this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  cancel() {
    if (this.cancelled) return
    this.cancelled = true
    for (const listener of this.listeners)
      try {
        listener()
      } catch {
        /* isolate cancellation observers */
      }
    this.listeners.clear()
  }
}
export function cancellable<T>(
  work: () => Promise<Result<T>>,
  token?: CancellationToken,
  closing?: CancellationToken,
  onLate?: (result: Result<T>) => void,
): Promise<Result<T>> {
  try {
    if (token?.isCancellationRequested) return Promise.resolve(failure('CANCELLED'))
    if (closing?.isCancellationRequested) return Promise.resolve(failure('SESSION_CLOSED'))
  } catch {
    return Promise.resolve(failure('ADAPTER_CONTRACT'))
  }
  return new Promise((resolve) => {
    let settled = false
    const cleanups: (() => void)[] = []
    const finish = (result: Result<T>) => {
      if (settled) {
        try {
          onLate?.(result)
        } catch {
          /* A late observer cannot alter the settled result. */
        }
        return
      }
      settled = true
      for (const off of cleanups) {
        try {
          off()
        } catch {
          /* A failing host cleanup must not strand public waits. */
        }
      }
      resolve(result)
    }
    const listen = (
      signal: CancellationToken | undefined,
      code: 'CANCELLED' | 'SESSION_CLOSED',
    ) => {
      if (!signal) return
      try {
        const off = signal.subscribe(() => finish(failure(code)))
        if (typeof off !== 'function') {
          finish(failure('ADAPTER_CONTRACT'))
          return
        }
        if (settled) {
          try {
            off()
          } catch {
            /* already settled */
          }
        } else cleanups.push(off)
      } catch {
        finish(failure('ADAPTER_CONTRACT'))
      }
    }
    listen(token, 'CANCELLED')
    if (!settled) listen(closing, 'SESSION_CLOSED')
    if (!settled)
      Promise.resolve()
        .then(() => (settled ? failure('CANCELLED') : work()))
        .then(
          (value) => {
            try {
              finish(sanitizeResult(value))
            } catch {
              finish(failure('ADAPTER_CONTRACT'))
            }
          },
          () => finish(failure('REPOSITORY_UNAVAILABLE')),
        )
  })
}
const codes = new Set([
  'PROFILE_INVALID',
  'METAMODEL_INVALID',
  'REPOSITORY_UNAVAILABLE',
  'REPOSITORY_READ_ONLY',
  'ENTITY_NOT_FOUND',
  'REFERENCE_UNRESOLVED',
  'MALFORMED_REFERENCE',
  'VALIDATION_FAILED',
  'ACCESS_DENIED',
  'REVISION_CONFLICT',
  'UNSUPPORTED_CAPABILITY',
  'WRITE_FAILED',
  'PARTIAL_FAILURE',
  'RECOVERY_REQUIRED',
  'INDEX_OUT_OF_SYNC',
  'SCHEMA_INCOMPATIBLE',
  'INVALID_INPUT',
  'RESOURCE_LIMIT',
  'CANCELLED',
  'SESSION_CLOSED',
  'INVALID_CURSOR',
  'STALE_CURSOR',
  'ADAPTER_CONTRACT',
  'OUTCOME_UNKNOWN',
  'OPERATION_ID_CONFLICT',
  'BINDING_MISMATCH',
  'INCOMPLETE_SNAPSHOT',
  'REPOSITORY_MISMATCH',
])
/** Service instances cannot be JSON-cloned; validate envelope descriptors without invoking getters. */
function sanitizeResult<T>(input: Result<T>): Result<T> {
  if (!input || typeof input !== 'object') return failure('ADAPTER_CONTRACT')
  const descriptors = Object.getOwnPropertyDescriptors(input),
    ok = descriptors.ok
  if (!ok || !('value' in ok) || typeof ok.value !== 'boolean') return failure('ADAPTER_CONTRACT')
  if (ok.value) {
    const value = descriptors.value
    return value && 'value' in value
      ? { ok: true, value: value.value as T }
      : failure('ADAPTER_CONTRACT')
  }
  const error = descriptors.error
  if (!error || !('value' in error)) return failure('ADAPTER_CONTRACT')
  const copied = copyJson(error.value)
  if (!copied.ok || !record(copied.value) || !codes.has(String(copied.value.code)))
    return failure('ADAPTER_CONTRACT')
  return failure(
    copied.value.code as ErrorCode,
    [],
    nonblank(copied.value.operationId) ? copied.value.operationId : undefined,
  )
}
