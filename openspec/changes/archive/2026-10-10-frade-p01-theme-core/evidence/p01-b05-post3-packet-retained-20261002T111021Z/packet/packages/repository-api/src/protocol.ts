import {
  copyJson,
  fields,
  failure,
  success,
  isReference,
  record,
  nonblank,
  type Result,
  type JsonValue,
} from '@frade/repository-domain'
export interface RepositoryRequest {
  readonly version: 1
  readonly operation:
    | 'getObject'
    | 'getRelation'
    | 'queryObjects'
    | 'queryRelations'
    | 'applyChanges'
    | 'validate'
    | 'getSubgraph'
    | 'reload'
    | 'capabilities'
    | 'reconcile'
    | 'presentation'
    | 'diagram'
    | 'integrationFlows'
  readonly payload: Readonly<Record<string, JsonValue>>
}
export const REPOSITORY_CHANNEL = 'frade:repository'
export const REPOSITORY_OPEN_CHANNEL = 'frade:repository-open'
export interface RepositoryClient {
  request(request: RepositoryRequest): Promise<Result<unknown>>
}
export function decodeRequest(input: unknown): Result<RepositoryRequest> {
  const safe = copyJson(input)
  if (!safe.ok) return safe
  const v = safe.value
  if (!fields(v, ['version', 'operation', 'payload']) || v.version !== 1)
    return failure('INVALID_INPUT')
  const keys: Record<string, string[]> = {
    getObject: ['ref'],
    getRelation: ['ref'],
    queryObjects: ['query'],
    queryRelations: ['query'],
    applyChanges: ['changeSet'],
    validate: ['changeSet'],
    getSubgraph: ['ref', 'options'],
    reload: [],
    capabilities: [],
    reconcile: ['operationId'],
    presentation: [],
    diagram: [],
    integrationFlows: ['query'],
  }
  if (
    typeof v.operation !== 'string' ||
    !Object.hasOwn(keys, v.operation) ||
    !record(v.payload) ||
    !(v.operation === 'diagram'
      ? fields(v.payload, ['action'], ['path', 'xml', 'revision', 'destination'])
      : fields(v.payload, keys[v.operation]))
  )
    return failure('INVALID_INPUT')
  if (
    (v.operation === 'getObject' ||
      v.operation === 'getRelation' ||
      v.operation === 'getSubgraph') &&
    !isReference(v.payload.ref, v.operation === 'getRelation' ? 'relation' : 'object')
  )
    return failure('MALFORMED_REFERENCE')
  if (
    v.operation === 'applyChanges' &&
    (!record(v.payload.changeSet) || !nonblank(v.payload.changeSet.idempotencyKey))
  )
    return failure('INVALID_INPUT')
  if (v.operation === 'reconcile' && !nonblank(v.payload.operationId))
    return failure('INVALID_INPUT')
  if (
    v.operation === 'getSubgraph' &&
    !fields(v.payload.options, [], ['direction', 'maxDepth', 'maxResults'])
  )
    return failure('INVALID_INPUT')
  if (v.operation === 'diagram') {
    const p = v.payload
    if (
      !['list', 'read', 'create', 'folder', 'write', 'rename', 'catalogs'].includes(
        String(p.action),
      ) ||
      Object.entries(p).some(([, value]) => typeof value !== 'string') ||
      (!['list', 'catalogs'].includes(String(p.action)) && !nonblank(p.path)) ||
      (p.action === 'write' && (!nonblank(p.xml) || !nonblank(p.revision))) ||
      (p.action === 'rename' && (!nonblank(p.destination) || !nonblank(p.revision)))
    )
      return failure('INVALID_INPUT')
  }
  return success(v as unknown as RepositoryRequest)
}
