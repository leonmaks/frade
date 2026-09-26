import {
  failure,
  success,
  type Result,
  type Entity,
  type EntityKind,
  type ObjectRef,
  type RelationRef,
  type RepositorySnapshot,
  type RepositoryModelBinding,
  type ModelAnalysis,
  type JsonValue,
  type Page,
  type Query,
  type RepositoryObject,
  type RepositoryRelation,
  type RepositoryPolicy,
  type Issue,
} from '@frade/repository-domain'
import type { RepositoryProfile } from './profile'
export interface CancellationToken {
  readonly isCancellationRequested: boolean
  subscribe(listener: () => void): () => void
}
export interface RequestContext {
  readonly callerId: string
  readonly repositoryIds: readonly string[]
  readonly permissions: readonly string[]
}
export type SessionState =
  'CLOSED' | 'OPENING' | 'READY' | 'READ_ONLY' | 'DEGRADED' | 'ERROR' | 'CLOSING'
export interface RepositoryCapabilities {
  readonly canRead: boolean
  readonly canWrite: boolean
  readonly supportsBatch: boolean
  readonly supportsAtomicBatch: boolean
  readonly supportsWatch: boolean
  readonly supportsHistory: boolean
  readonly supportsTransactions: boolean
  readonly supportsCrossRepositoryReferences: boolean
  readonly supportsServerSideQueries: boolean
  readonly supportedQueryOperators: readonly string[]
  readonly supportedMetamodelFeatures: readonly string[]
  readonly guardedSnapshot: boolean
  readonly reconciliation: 'none' | 'session'
  readonly preservation: 'none' | 'structure'
  readonly writerCoordination: 'none' | 'cooperating-processes'
}
export interface RepositoryEvent {
  readonly eventId: string
  readonly repositoryId: string
  readonly sequence: number
  readonly type:
    | 'object.created'
    | 'object.updated'
    | 'object.deleted'
    | 'relation.created'
    | 'relation.updated'
    | 'relation.deleted'
    | 'metamodel.changed'
    | 'repository.reloaded'
  readonly revision: string
  readonly ref?: ObjectRef | RelationRef
  readonly state?: 'READY' | 'READ_ONLY' | 'DEGRADED'
}
/** Complete-snapshot validation for explicitly opted-in external model dialects. */
export interface SourceValidationPort {
  readonly mode: 'strict' | 'repair'
  /** Structural failures must return failure, never repairable diagnostics. */
  project(snapshot: RepositorySnapshot, previous: RepositorySnapshot): Result<RepositorySnapshot>
  diagnostics(snapshot: RepositorySnapshot): readonly Issue[]
}
export interface RepositoryModel extends RepositoryModelBinding {
  readonly sourceValidation?: SourceValidationPort
  readonly policy?: RepositoryPolicy
  analysis(): ModelAnalysis
}
export type RepositoryCommand =
  | { readonly op: 'createObject'; readonly object: Omit<RepositoryObject, 'revision'> }
  | {
      readonly op: 'updateObject'
      readonly object: Omit<RepositoryObject, 'revision'>
      readonly expectedRevision: string
    }
  | {
      readonly op: 'deleteObject'
      readonly ref: ObjectRef
      readonly expectedRevision: string
      readonly deletionPolicy?: 'RESTRICT' | 'CASCADE'
    }
  | { readonly op: 'createRelation'; readonly relation: Omit<RepositoryRelation, 'revision'> }
  | {
      readonly op: 'updateRelation'
      readonly relation: Omit<RepositoryRelation, 'revision'>
      readonly expectedRevision: string
    }
  | { readonly op: 'deleteRelation'; readonly ref: RelationRef; readonly expectedRevision: string }
export interface ChangeSet {
  readonly repositoryId: string
  readonly commands: readonly RepositoryCommand[]
  readonly expectedRevision?: string
  readonly idempotencyKey?: string
  readonly requireAtomic?: boolean
}
export interface EntityChange {
  readonly kind: EntityKind
  readonly action: 'created' | 'updated' | 'deleted'
  readonly ref: ObjectRef | RelationRef
  readonly entity?: Entity
}
export interface CommitRequest {
  readonly operationId: string
  readonly expectedRevision: string
  readonly candidate: RepositorySnapshot
  readonly changes: readonly EntityChange[]
}
export interface ChangeResult {
  readonly operationId: string
  readonly revision: string
  readonly changes: readonly EntityChange[]
  readonly warnings: readonly string[]
}
export type OperationOutcome =
  | { readonly status: 'committed'; readonly result: ChangeResult }
  | { readonly status: 'not-committed' | 'pending' | 'unknown' }
export interface RepositoryWriter {
  commit(request: CommitRequest, token?: CancellationToken): Promise<Result<ChangeResult>>
  lookup(operationId: string): Promise<Result<OperationOutcome>>
}
/** Pinned command scope, never a complete graph. Target lookup belongs to the same revision. */
export interface PagedValidationPort {
  scope(
    changeSet: ChangeSet,
    token?: CancellationToken,
  ): Promise<
    Result<{
      snapshot: RepositorySnapshot
      targets: Pick<ReadonlyMap<string, string>, 'get'>
    }>
  >
  validate(request: CommitRequest, token?: CancellationToken): Promise<Result<true>>
}
/** Minimum session: point reads are required; richer read services are explicit and optional. */
export interface RepositoryReaderSession {
  readonly profile: RepositoryProfile
  readonly capabilities: RepositoryCapabilities
  readonly model: RepositoryModel
  read(
    kind: EntityKind,
    ref: ObjectRef | RelationRef,
    token?: CancellationToken,
  ): Promise<Result<Entity>>
  query?(
    kind: EntityKind,
    query: Query,
    token?: CancellationToken,
  ): Promise<Result<Page<Partial<Entity>>>>
  snapshot?(token?: CancellationToken): Promise<Result<RepositorySnapshot>>
  readonly writer?: RepositoryWriter
  readonly pagedValidation?: PagedValidationPort
  readonly history?: HistoryPort
  subscribe?(listener: (event: RepositoryEvent) => void): () => void
  reload?(): Promise<Result<boolean>>
  close(): Promise<void>
}
/** Compatible convenience contract for existing full-query/snapshot adapters. */
export interface RepositoryAdapterSession extends RepositoryReaderSession {
  query(
    kind: EntityKind,
    query: Query,
    token?: CancellationToken,
  ): Promise<Result<Page<Partial<Entity>>>>
  snapshot(token?: CancellationToken): Promise<Result<RepositorySnapshot>>
}
export interface HistoryQuery {
  readonly limit?: number
  readonly cursor?: string
}
export interface HistoryEntry {
  readonly revision: string
  readonly message?: string
  readonly ref?: ObjectRef | RelationRef
}
export interface HistoryPort {
  read(query: HistoryQuery, token?: CancellationToken): Promise<Result<Page<HistoryEntry>>>
}
type CapabilityServices<C extends RepositoryCapabilities> = (C['canWrite'] extends true
  ? { readonly writer: RepositoryWriter }
  : { readonly writer?: never }) &
  (C['supportsHistory'] extends true
    ? { readonly history: HistoryPort }
    : { readonly history?: never }) &
  (C['supportsWatch'] extends true
    ? { subscribe(listener: (event: RepositoryEvent) => void): () => void }
    : { subscribe?: never }) &
  (C['supportsServerSideQueries'] extends true
    ? { query: NonNullable<RepositoryReaderSession['query']> }
    : { query?: RepositoryReaderSession['query'] })
/** Literal capability declarations require matching services at compile time and runtime. */
export function defineAdapterSession<
  const C extends RepositoryCapabilities,
  S extends Omit<RepositoryReaderSession, 'capabilities' | 'writer' | 'history' | 'subscribe'> &
    CapabilityServices<NoInfer<C>>,
>(capabilities: C, services: S): Result<S & { readonly capabilities: C }> {
  const session = { ...services, capabilities }
  const valid = validateCapabilities(capabilities, session)
  return valid.ok ? success(session) : valid
}
export interface RepositoryAdapter {
  open(token?: CancellationToken): Promise<Result<RepositoryReaderSession>>
}
export interface AuthorizationPolicy {
  authorize(context: RequestContext, changeSet: ChangeSet): boolean | Promise<boolean>
}
export interface VersioningPort {
  status(): Promise<
    Result<{
      revision: string | null
      changedPaths: readonly string[]
      conflicts: readonly string[]
    }>
  >
  history(limit: number): Promise<Result<readonly { revision: string; message: string }[]>>
  commit(message: string, paths: readonly string[]): Promise<Result<string>>
}
export interface FederationPort {
  resolveObject(ref: ObjectRef, context: RequestContext): Promise<Result<RepositoryObject>>
  resolveRelation(ref: RelationRef, context: RequestContext): Promise<Result<RepositoryRelation>>
}
export interface SearchPort {
  search(query: string, limit: number): Promise<Result<readonly ObjectRef[]>>
}
export interface DerivedIndexPort {
  rebuild(snapshot: RepositorySnapshot): Promise<Result<true>>
  applyChanges(result: ChangeResult, expectedRevision: string): Promise<Result<true>>
  invalidate(): void
  close(): Promise<void>
}
export interface RemoteConnection {
  readonly endpoint: string
  readonly authenticationRef?: string
  readonly headers?: Readonly<Record<string, JsonValue>>
}
export function validateCapabilities(
  capabilities: Partial<RepositoryCapabilities>,
  services: Partial<RepositoryReaderSession>,
): Result<true> {
  const booleans = [
    'canRead',
    'canWrite',
    'supportsBatch',
    'supportsAtomicBatch',
    'supportsWatch',
    'supportsHistory',
    'supportsTransactions',
    'supportsCrossRepositoryReferences',
    'supportsServerSideQueries',
    'guardedSnapshot',
  ] as const
  if (
    booleans.some((key) => typeof capabilities[key] !== 'boolean') ||
    !Array.isArray(capabilities.supportedQueryOperators) ||
    !Array.isArray(capabilities.supportedMetamodelFeatures) ||
    !capabilities.supportedQueryOperators.every((op) =>
      ['eq', 'ne', 'lt', 'lte', 'gt', 'gte', 'in', 'exists', 'and', 'or', 'not'].includes(op),
    ) ||
    !capabilities.supportedMetamodelFeatures.every(
      (feature) => typeof feature === 'string' && feature.trim(),
    ) ||
    !['none', 'session'].includes(String(capabilities.reconciliation)) ||
    !['none', 'structure'].includes(String(capabilities.preservation)) ||
    !['none', 'cooperating-processes'].includes(String(capabilities.writerCoordination))
  )
    return failure('ADAPTER_CONTRACT')
  if (
    !capabilities.canRead ||
    typeof services.read !== 'function' ||
    (services.query !== undefined && typeof services.query !== 'function') ||
    (services.snapshot !== undefined && typeof services.snapshot !== 'function') ||
    ((capabilities.supportsServerSideQueries || capabilities.supportedQueryOperators!.length > 0) &&
      typeof services.query !== 'function') ||
    typeof services.close !== 'function'
  )
    return failure('ADAPTER_CONTRACT')
  if (
    capabilities.canWrite !== !!services.writer ||
    capabilities.supportsWatch !== !!services.subscribe ||
    (services.subscribe !== undefined && typeof services.subscribe !== 'function') ||
    capabilities.supportsHistory !== !!services.history ||
    (services.history !== undefined && typeof services.history.read !== 'function') ||
    (services.writer !== undefined && typeof services.writer.commit !== 'function') ||
    (capabilities.supportsBatch && !capabilities.canWrite) ||
    (capabilities.supportsTransactions && !capabilities.canWrite) ||
    (capabilities.supportsAtomicBatch && !capabilities.supportsBatch) ||
    (capabilities.guardedSnapshot && !services.writer) ||
    (capabilities.reconciliation === 'session' && typeof services.writer?.lookup !== 'function') ||
    (services.pagedValidation !== undefined &&
      (!capabilities.guardedSnapshot ||
        typeof services.pagedValidation.scope !== 'function' ||
        typeof services.pagedValidation.validate !== 'function'))
  )
    return failure('ADAPTER_CONTRACT')
  return success(true)
}
