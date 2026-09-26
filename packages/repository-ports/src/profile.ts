import {
  copyJson,
  fields,
  record,
  nonblank,
  failure,
  success,
  type Result,
  type JsonValue,
} from '@frade/repository-domain'
export interface RepositoryProfile {
  readonly schemaVersion: 1
  readonly repositoryId: string
  readonly displayName: string
  readonly adapterKind: string
  readonly connection: Readonly<Record<string, JsonValue>>
  readonly metamodel: { readonly path: string; readonly version: string }
  readonly mapping: { readonly sourceFile: string; readonly format: 'yaml' | 'json' }
  readonly policyRef: string
  readonly policyPath?: string
  readonly accessMode: 'read-only' | 'read-write'
  readonly indexing: { readonly enabled: boolean }
  readonly versioning: { readonly provider: 'none' | 'git' }
  readonly authenticationRef?: string
}
export function decodeProfile(input: unknown): Result<RepositoryProfile> {
  const safe = copyJson(input)
  if (!safe.ok) return failure('PROFILE_INVALID')
  const v = safe.value
  if (record(v) && v.schemaVersion !== 1) return failure('SCHEMA_INCOMPATIBLE')
  if (
    !fields(
      v,
      [
        'schemaVersion',
        'repositoryId',
        'displayName',
        'adapterKind',
        'connection',
        'metamodel',
        'mapping',
        'policyRef',
        'accessMode',
        'indexing',
        'versioning',
      ],
      ['authenticationRef', 'policyPath'],
    )
  )
    return failure('PROFILE_INVALID')
  const secret = (x: JsonValue): boolean =>
    Array.isArray(x)
      ? x.some(secret)
      : record(x)
        ? Object.entries(x).some(
            ([k, value]) =>
              /password|secret|token|credential|authorization/i.test(k) ||
              secret(value as JsonValue),
          )
        : typeof x === 'string' &&
          (/[a-z][a-z0-9+.-]*:\/\/[^/?#\s]*@/i.test(x) ||
            /[?&#;](?:[^=&#;]*(?:password|secret|token|credential|authorization|api[_-]?key)[^=&#;]*)=/i.test(
              x,
            ))
  if (
    !['repositoryId', 'displayName', 'adapterKind', 'policyRef'].every((k) => nonblank(v[k])) ||
    !record(v.connection) ||
    secret(v.connection as JsonValue) ||
    !fields(v.metamodel, ['path', 'version']) ||
    !nonblank(v.metamodel.path) ||
    !nonblank(v.metamodel.version) ||
    !fields(v.mapping, ['sourceFile', 'format']) ||
    !nonblank(v.mapping.sourceFile) ||
    !['yaml', 'json'].includes(String(v.mapping.format)) ||
    !['read-only', 'read-write'].includes(String(v.accessMode)) ||
    !fields(v.indexing, ['enabled']) ||
    typeof v.indexing.enabled !== 'boolean' ||
    !fields(v.versioning, ['provider']) ||
    !['none', 'git'].includes(String(v.versioning.provider)) ||
    (v.authenticationRef !== undefined && !nonblank(v.authenticationRef)) ||
    (v.policyPath !== undefined && !nonblank(v.policyPath))
  )
    return failure('PROFILE_INVALID')
  return success(v as unknown as RepositoryProfile)
}
