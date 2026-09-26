import { copyJson, fields, nonblank, failure, success, type Result } from '@frade/repository-domain'
import type { RepositoryAdapter } from './contracts'
export interface ExternalConnection {
  readonly schemaVersion: 1
  readonly kind: 'postgres' | 'remote'
  /** Host resolves references; exported configuration never contains a password or token. */
  readonly connectionRef: string
  readonly mappingRef: string
  readonly authenticationRef?: string
}
export function decodeExternalConnection(input: unknown): Result<ExternalConnection> {
  const safe = copyJson(input)
  if (!safe.ok) return failure('PROFILE_INVALID')
  const v = safe.value
  if (
    !fields(v, ['schemaVersion', 'kind', 'connectionRef', 'mappingRef'], ['authenticationRef']) ||
    v.schemaVersion !== 1 ||
    !['postgres', 'remote'].includes(String(v.kind)) ||
    !nonblank(v.connectionRef) ||
    !nonblank(v.mappingRef) ||
    (v.authenticationRef !== undefined && !nonblank(v.authenticationRef))
  )
    return failure('PROFILE_INVALID')
  return success(v as unknown as ExternalConnection)
}
/** Explicit absence, not a PostgreSQL/remote storage implementation or a conformance claim. */
export function unconfiguredAdapter(_kind: string): RepositoryAdapter {
  return { open: async () => failure('UNSUPPORTED_CAPABILITY') }
}
export interface ExternalAdapterFactory {
  create(connection: ExternalConnection): Promise<Result<RepositoryAdapter>>
}
