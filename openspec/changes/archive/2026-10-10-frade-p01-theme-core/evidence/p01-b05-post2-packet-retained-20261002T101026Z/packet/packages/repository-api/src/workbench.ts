import {
  copyJson,
  fields,
  record,
  nonblank,
  decodeObject,
  decodeRelation,
  isReference,
  failure,
  success,
  type Result,
  type Issue,
  type RepositoryModelBinding,
  type JsonValue,
} from '@frade/repository-domain'
import type { Constraint, FieldMetadata } from '@frade/metamodel-domain'
import type { RepositoryCapabilities, RepositoryEvent } from '@frade/repository-ports'
import { decodeRequest, type RepositoryRequest } from './protocol'
export const WORKBENCH_CHANNEL = 'frade:workbench'
export const WORKBENCH_EVENT_CHANNEL = 'frade:workbench-event'
export interface MetadataSetProfile {
  readonly id: string
  readonly label: string
  readonly folderPath: string
  readonly dialect: string
  readonly schemaEntries: readonly string[]
  readonly documentEntries: readonly string[]
}
export interface WorkspaceRoot {
  readonly repositoryId: string
  readonly label: string
  readonly adapterKind: string
  readonly dataRoot: string
  readonly entry: string
  readonly metadataSets: readonly MetadataSetProfile[]
  readonly activeMetadataSet: string
  readonly readOnly?: boolean
  readonly externalCatalogs?: readonly { id: string; path: string }[]
}
export interface WorkspaceFile {
  readonly version: 1
  readonly roots: readonly WorkspaceRoot[]
}
export interface SessionScope {
  readonly repositoryId: string
  readonly sessionId: string
  readonly generation: number
  readonly modelGeneration: number
}
export interface RootSession extends SessionScope {
  readonly label: string
  readonly state: string
  readonly capabilities: RepositoryCapabilities
  readonly binding: RepositoryModelBinding
}
export interface TypePresentation {
  readonly integrationFlow?: import('@frade/repository-domain').IntegrationFlowCapability
  readonly idPatterns?: readonly string[]
  readonly id: string
  readonly externalId: string
  readonly source?: string
  readonly label: string
  readonly section: string
  readonly description: string
  readonly nameFields: readonly string[]
  readonly rule: Constraint
  readonly fields: readonly FieldMetadata[]
}
export interface RepositoryPresentation {
  readonly types: readonly TypePresentation[]
  readonly sources: readonly { objectId: string; entry: string; writable: boolean }[]
  readonly diagnostics: readonly Issue[]
  readonly sections: readonly { entry: string; key: string; kind: string; value: JsonValue }[]
  readonly revision: string
}
export type ScopedRequest = { readonly scope: SessionScope; readonly request: RepositoryRequest }
export type WorkbenchEvent = {
  readonly version: 1
  readonly scope: SessionScope
  readonly event: RepositoryEvent
}
export interface WorkbenchClient {
  command(command: HostCommand): Promise<Result<unknown>>
  request(request: ScopedRequest): Promise<Result<unknown>>
  subscribe(listener: (event: WorkbenchEvent) => void): () => void
}
export type HostCommand =
  | { readonly operation: 'connectCatalog'; readonly repositoryId: string }
  | {
      readonly operation: 'disconnectCatalog'
      readonly repositoryId: string
      readonly sourceId: string
    }
  | { readonly operation: 'add'; readonly adapterKind: string }
  | { readonly operation: 'remove'; readonly repositoryId: string }
  | { readonly operation: 'openWorkspace' }
  | { readonly operation: 'saveWorkspace'; readonly roots: readonly WorkspaceRoot[] }
  | { readonly operation: 'restore' }
  | { readonly operation: 'retry'; readonly repositoryId: string }
  | { readonly operation: 'reorder'; readonly repositoryIds: readonly string[] }
  | { readonly operation: 'rename'; readonly repositoryId: string; readonly label: string }
  | { readonly operation: 'approveClose' }
  | { readonly operation: 'cancelMetadata'; readonly repositoryId: string }
  | {
      readonly operation: 'removeMetadataSet'
      readonly repositoryId: string
      readonly metadataSetId: string
    }
  | { readonly operation: 'browseMetadata'; readonly repositoryId: string }
  | {
      readonly operation: 'stageMetadata'
      readonly repositoryId: string
      readonly metadataSet: MetadataSetProfile
    }
  | {
      readonly operation: 'activateMetadata'
      readonly repositoryId: string
      readonly candidateId: string
    }
  | { readonly operation: 'recoveryPreview'; readonly repositoryId: string }
  | {
      readonly operation: 'recoveryResolve'
      readonly repositoryId: string
      readonly journalHash: string
      readonly sourceHash: string
    }
  | { readonly operation: 'window'; readonly action: 'minimize' | 'maximize' | 'close' }
export function decodeScope(input: unknown): Result<SessionScope> {
  if (
    !fields(input, ['repositoryId', 'sessionId', 'generation', 'modelGeneration']) ||
    !nonblank(input.repositoryId) ||
    !nonblank(input.sessionId) ||
    ![input.generation, input.modelGeneration].every(
      (v) => Number.isSafeInteger(v) && (v as number) > 0,
    )
  )
    return failure('INVALID_INPUT')
  return success(input as unknown as SessionScope)
}
export function decodeScopedRequest(input: unknown): Result<ScopedRequest> {
  const safe = copyJson(input)
  if (!safe.ok) return safe
  if (!fields(safe.value, ['scope', 'request'])) return failure('INVALID_INPUT')
  const scope = decodeScope(safe.value.scope),
    request = decodeRequest(safe.value.request)
  if (!scope.ok) return scope
  if (!request.ok) return request
  return success({ scope: scope.value, request: request.value })
}
export function decodeMetadataSet(input: unknown): Result<MetadataSetProfile> {
  if (
    !fields(input, ['id', 'label', 'folderPath', 'dialect', 'schemaEntries', 'documentEntries']) ||
    !['id', 'label', 'folderPath', 'dialect'].every((k) => nonblank(input[k])) ||
    !['schemaEntries', 'documentEntries'].every(
      (k) =>
        Array.isArray(input[k]) &&
        (input[k] as unknown[]).length <= 100 &&
        (input[k] as unknown[]).every(nonblank),
    ) ||
    !(input.schemaEntries as unknown[]).length
  )
    return failure('INVALID_INPUT')
  return success(input as unknown as MetadataSetProfile)
}
export function decodeWorkspace(input: unknown): Result<WorkspaceFile> {
  const safe = copyJson(input)
  if (!safe.ok) return safe
  const value = safe.value
  if (
    !fields(value, ['version', 'roots']) ||
    value.version !== 1 ||
    !Array.isArray(value.roots) ||
    value.roots.length > 64
  )
    return failure('INVALID_INPUT')
  const ids = new Set<string>()
  for (const root of value.roots) {
    if (
      !fields(
        root,
        [
          'repositoryId',
          'label',
          'adapterKind',
          'dataRoot',
          'entry',
          'metadataSets',
          'activeMetadataSet',
        ],
        ['readOnly', 'externalCatalogs'],
      ) ||
      !['repositoryId', 'label', 'adapterKind', 'dataRoot', 'entry'].every((k) =>
        nonblank(root[k]),
      ) ||
      typeof root.activeMetadataSet !== 'string' ||
      (root.readOnly !== undefined && typeof root.readOnly !== 'boolean') ||
      !Array.isArray(root.metadataSets) ||
      root.metadataSets.length > 32
    )
      return failure('INVALID_INPUT')
    if (
      root.externalCatalogs !== undefined &&
      (!Array.isArray(root.externalCatalogs) ||
        root.externalCatalogs.length > 32 ||
        root.externalCatalogs.some(
          (c) => !fields(c, ['id', 'path']) || !nonblank(c.id) || !nonblank(c.path),
        ))
    )
      return failure('INVALID_INPUT')
    if (ids.has(root.repositoryId as string)) return failure('INVALID_INPUT')
    ids.add(root.repositoryId as string)
    const sets = new Set<string>()
    for (const set of root.metadataSets) {
      const decoded = decodeMetadataSet(set)
      if (!decoded.ok) return decoded
      if (sets.has(decoded.value.id)) return failure('INVALID_INPUT')
      sets.add(decoded.value.id)
    }
    if (root.adapterKind === 'sberea' && !sets.has(root.activeMetadataSet))
      return failure('INVALID_INPUT')
  }
  return success(value as unknown as WorkspaceFile)
}
export function decodeHostCommand(input: unknown): Result<HostCommand> {
  const safe = copyJson(input)
  if (!safe.ok) return safe
  const v = safe.value
  if (!record(v) || !nonblank(v.operation)) return failure('INVALID_INPUT')
  const shape: Record<string, string[]> = {
    connectCatalog: ['repositoryId'],
    disconnectCatalog: ['repositoryId', 'sourceId'],
    add: ['adapterKind'],
    remove: ['repositoryId'],
    openWorkspace: [],
    saveWorkspace: ['roots'],
    restore: [],
    retry: ['repositoryId'],
    reorder: ['repositoryIds'],
    rename: ['repositoryId', 'label'],
    approveClose: [],
    cancelMetadata: ['repositoryId'],
    removeMetadataSet: ['repositoryId', 'metadataSetId'],
    browseMetadata: ['repositoryId'],
    stageMetadata: ['repositoryId', 'metadataSet'],
    activateMetadata: ['repositoryId', 'candidateId'],
    recoveryPreview: ['repositoryId'],
    recoveryResolve: ['repositoryId', 'journalHash', 'sourceHash'],
    window: ['action'],
  }
  if (!Object.hasOwn(shape, v.operation) || !fields(v, ['operation', ...shape[v.operation]]))
    return failure('INVALID_INPUT')
  if (
    shape[v.operation].some(
      (k) => !['roots', 'metadataSet', 'repositoryIds'].includes(k) && !nonblank(v[k]),
    )
  )
    return failure('INVALID_INPUT')
  if (
    v.operation === 'reorder' &&
    (!Array.isArray(v.repositoryIds) ||
      !v.repositoryIds.every(nonblank) ||
      new Set(v.repositoryIds).size !== v.repositoryIds.length)
  )
    return failure('INVALID_INPUT')
  if (v.operation === 'saveWorkspace' && !decodeWorkspace({ version: 1, roots: v.roots }).ok)
    return failure('INVALID_INPUT')
  if (v.operation === 'stageMetadata' && !decodeMetadataSet(v.metadataSet).ok)
    return failure('INVALID_INPUT')
  if (v.operation === 'window' && !['minimize', 'maximize', 'close'].includes(String(v.action)))
    return failure('INVALID_INPUT')
  return success(v as unknown as HostCommand)
}

export interface WorkspaceStatus {
  readonly roots: readonly { root: WorkspaceRoot; session?: RootSession; error?: string }[]
  readonly file?: string
  readonly focusRoot?: string
}
export interface RecoveryInfo {
  operationId: string
  journalHash: string
  sourceHash: string
  entry: string
  state: 'before' | 'after' | 'conflict'
}
export type BackendCommand =
  | { operation: 'recoveryPreview'; dataRoot: string }
  | { operation: 'recoveryResolve'; dataRoot: string; journalHash: string; sourceHash: string }
  | { operation: 'legacyOpen'; dataRoot: string; indexDirectory: string }
  | { operation: 'legacyRequest'; value: unknown }
  | { operation: 'legacyClose' }
  | { operation: 'open'; root: WorkspaceRoot }
  | { operation: 'close'; repositoryId: string }
  | { operation: 'request'; value: ScopedRequest }
  | {
      operation: 'stage'
      repositoryId: string
      metadataSet: MetadataSetProfile
      root?: WorkspaceRoot
    }
  | { operation: 'activate'; repositoryId: string; candidateId: string }
  | { operation: 'cancelCandidate'; repositoryId: string }
export interface MetadataPreview {
  readonly candidateId: string
  readonly fingerprint: string
  readonly previousFingerprint?: string
  readonly changedTypes?: readonly string[]
  readonly diagnostics: readonly Issue[]
  readonly types: readonly string[]
}
export const WORKBENCH_REQUEST_CHANNEL = 'frade:workbench-request'
export const WORKBENCH_CLOSE_CHANNEL = 'frade:workbench-close-request'
export function boundedWorkbenchValue(input: unknown): Result<JsonValue> {
  const safe = copyJson(input)
  if (!safe.ok) return safe
  if (JSON.stringify(safe.value).length > 8_000_000) return failure('RESOURCE_LIMIT')
  return safe
}
export function decodeWorkbenchResult(input: unknown): Result<unknown> {
  const safe = boundedWorkbenchValue(input)
  if (!safe.ok) return safe
  const v = safe.value
  if (!record(v) || typeof v.ok !== 'boolean') return failure('ADAPTER_CONTRACT')
  if (v.ok) return fields(v, ['ok', 'value']) ? success(v.value) : failure('ADAPTER_CONTRACT')
  if (
    !fields(v, ['ok', 'error']) ||
    !fields(v.error, ['code', 'message', 'retriable', 'issues'], ['operationId']) ||
    !nonblank(v.error.code) ||
    typeof v.error.message !== 'string' ||
    typeof v.error.retriable !== 'boolean' ||
    !validIssues(v.error.issues) ||
    (v.error.operationId !== undefined && !nonblank(v.error.operationId))
  )
    return failure('ADAPTER_CONTRACT')
  return v as unknown as Result<unknown>
}
export function decodeWorkbenchEvent(input: unknown): Result<WorkbenchEvent> {
  const safe = boundedWorkbenchValue(input)
  if (!safe.ok) return safe
  if (!fields(safe.value, ['version', 'scope', 'event']) || safe.value.version !== 1)
    return failure('INVALID_INPUT')
  const scope = decodeScope(safe.value.scope),
    event = safe.value.event
  if (!scope.ok) return scope
  if (
    !fields(event, ['eventId', 'repositoryId', 'sequence', 'type', 'revision'], ['ref', 'state']) ||
    (event.state !== undefined &&
      !['READY', 'READ_ONLY', 'DEGRADED'].includes(String(event.state))) ||
    (event.ref !== undefined &&
      (!record(event.ref) ||
        event.ref.repositoryId !== scope.value.repositoryId ||
        !isReference(
          event.ref,
          String(event.type).startsWith('relation.') ? 'relation' : 'object',
        ))) ||
    event.repositoryId !== scope.value.repositoryId ||
    !nonblank(event.eventId) ||
    !Number.isSafeInteger(event.sequence) ||
    (event.sequence as number) < 1 ||
    !nonblank(event.revision) ||
    ![
      'object.created',
      'object.updated',
      'object.deleted',
      'relation.created',
      'relation.updated',
      'relation.deleted',
      'metamodel.changed',
      'repository.reloaded',
    ].includes(String(event.type))
  )
    return failure('INVALID_INPUT')
  return success(safe.value as unknown as WorkbenchEvent)
}
function validIssues(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (i) =>
        fields(i, ['code', 'message', 'path'], ['ref', 'details']) &&
        typeof i.code === 'string' &&
        typeof i.message === 'string' &&
        Array.isArray(i.path) &&
        i.path.every((p) => typeof p === 'string' || Number.isSafeInteger(p)),
    )
  )
}
/** Operation-specific response checks run again in the sandboxed preload. */
export function decodeOperationResult(input: unknown, request: RepositoryRequest): Result<unknown> {
  const result = decodeWorkbenchResult(input)
  if (!result.ok) return result
  const v = result.value,
    invalid = () => failure('ADAPTER_CONTRACT')
  if (request.operation === 'diagram') {
    if (!record(v)) return invalid()
    if (request.payload.action === 'catalogs') {
      if (
        !Array.isArray(v.catalogs) ||
        v.catalogs.length > 32 ||
        !Array.isArray(v.errors) ||
        !v.errors.every((e) => typeof e === 'string') ||
        v.catalogs.some(
          (c) =>
            !fields(c, ['version', 'id', 'label', 'objects']) ||
            c.version !== 1 ||
            !nonblank(c.id) ||
            typeof c.label !== 'string' ||
            !Array.isArray(c.objects) ||
            c.objects.length > 5000 ||
            c.objects.some(
              (o) =>
                !fields(o, ['id', 'name'], ['type', 'attributes']) ||
                !nonblank(o.id) ||
                typeof o.name !== 'string' ||
                (o.type !== undefined && typeof o.type !== 'string') ||
                (o.attributes !== undefined &&
                  (!record(o.attributes) || !copyJson(o.attributes).ok)),
            ),
        )
      )
        return invalid()
      return result
    }
    if (request.payload.action === 'list') {
      if (
        !Array.isArray(v.entries) ||
        v.entries.length > 2000 ||
        v.entries.some(
          (e) =>
            !fields(e, ['path', 'kind']) ||
            !nonblank(e.path) ||
            !['file', 'folder'].includes(String(e.kind)),
        )
      )
        return invalid()
    } else if (
      !nonblank(v.path) ||
      (['read', 'create', 'write'].includes(String(request.payload.action)) &&
        (typeof v.xml !== 'string' || !nonblank(v.revision)))
    )
      return invalid()
  }
  if (request.operation === 'getObject') return decodeObject(v).ok ? result : invalid()
  if (request.operation === 'getRelation') return decodeRelation(v).ok ? result : invalid()
  if (request.operation === 'queryObjects' || request.operation === 'queryRelations') {
    if (
      !record(v) ||
      !Array.isArray(v.items) ||
      v.items.length > 1000 ||
      !nonblank(v.revision) ||
      (v.cursor !== undefined && !nonblank(v.cursor))
    )
      return invalid()
    const decode = request.operation === 'queryObjects' ? decodeObject : decodeRelation
    if (v.items.some((item) => !decode(item).ok)) return invalid()
  }
  if (
    request.operation === 'validate' &&
    (!record(v) || !validIssues(v.errors) || !validIssues(v.warnings))
  )
    return invalid()
  if (request.operation === 'presentation') {
    if (
      !fields(v, ['types', 'sources', 'diagnostics', 'sections', 'revision']) ||
      !nonblank(v.revision) ||
      !Array.isArray(v.types) ||
      !Array.isArray(v.sources) ||
      !Array.isArray(v.sections) ||
      !validIssues(v.diagnostics)
    )
      return invalid()
    if (
      v.types.some(
        (t) =>
          !record(t) ||
          !['id', 'externalId', 'label', 'section', 'description'].every(
            (k) => typeof t[k] === 'string',
          ) ||
          !record(t.rule) ||
          !Array.isArray(t.fields) ||
          !Array.isArray(t.nameFields) ||
          !t.nameFields.every(nonblank),
      )
    )
      return invalid()
    if (
      v.sources.some(
        (s) =>
          !fields(s, ['objectId', 'entry', 'writable']) ||
          !nonblank(s.objectId) ||
          !nonblank(s.entry) ||
          typeof s.writable !== 'boolean',
      )
    )
      return invalid()
  }
  return result
}
