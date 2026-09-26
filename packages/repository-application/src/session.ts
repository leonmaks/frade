import {
  copyJson,
  decodeObject,
  decodeRelation,
  decodeSnapshot,
  decodeQuery,
  entityKey,
  failure,
  success,
  fields,
  nonblank,
  isReference,
  LIMITS,
  type Result,
  type RepositoryObject,
  type RepositoryRelation,
  type RepositorySnapshot,
  type Entity,
  type EntityKind,
  type ObjectRef,
  type Query,
  type Page,
  type ValidationResult,
} from '@frade/repository-domain'
import {
  validateCapabilities,
  decodeProfile,
  decodeRepositoryPolicy,
  type RepositoryAdapter,
  type RepositoryReaderSession,
  type RequestContext,
  type SessionState,
  type RepositoryEvent,
  type ChangeResult,
  type ChangeSet,
  type CancellationToken,
  type AuthorizationPolicy,
  type CommitRequest,
  type OperationOutcome,
  type DerivedIndexPort,
  type HistoryEntry,
} from '@frade/repository-ports'
import { CancellationSource, cancellable } from './cancellation'
import { commandSignature, decodeChangeSet, prepare } from './commands'
import { canonicalJson, type JsonValue } from '@frade/repository-domain'
const clone = <T>(value: T): T => {
  const result = copyJson(value)
  if (!result.ok) throw Error('Invalid boundary data')
  return result.value as T
}
export class RepositorySession {
  private currentState: SessionState
  private closing = new CancellationSource()
  private closingPromise?: Promise<Result<void>>
  private listeners = new Set<(event: RepositoryEvent) => void>()
  private unsubscribe?: () => void
  private sequence = 0
  private deliverySequence = 0
  private lastEventRevision = 'unavailable'
  private generatedId = 0
  private index?: DerivedIndexPort
  private indexTail: Promise<unknown> = Promise.resolve()
  private operations = new Map<
    string,
    { signature: string; promise: Promise<Result<ChangeResult>>; request?: CommitRequest }
  >()
  constructor(
    private readonly adapter: RepositoryReaderSession,
    private readonly context: RequestContext,
    private readonly policy?: AuthorizationPolicy,
  ) {
    this.currentState =
      adapter.profile.accessMode === 'read-only' || !adapter.capabilities.canWrite
        ? 'READ_ONLY'
        : 'READY'
    this.unsubscribe = adapter.subscribe?.((event) => {
      if (this.closing.isCancellationRequested) return
      let value: RepositoryEvent | undefined
      try {
        value = clone(event)
      } catch {
        /* Lost/malformed feed data requires resync, never an invented entity change. */
      }
      const type = value?.type,
        kind = typeof type === 'string' && type.startsWith('object.') ? 'object' : 'relation',
        refresh = type === 'repository.reloaded' || type === 'metamodel.changed',
        valid =
          value &&
          fields(
            value,
            ['eventId', 'repositoryId', 'sequence', 'type', 'revision'],
            ['ref', 'state'],
          ) &&
          nonblank(value.eventId) &&
          nonblank(value.revision) &&
          value.repositoryId === this.repositoryId &&
          Number.isSafeInteger(value.sequence) &&
          value.sequence > 0 &&
          [
            'object.created',
            'object.updated',
            'object.deleted',
            'relation.created',
            'relation.updated',
            'relation.deleted',
            'metamodel.changed',
            'repository.reloaded',
          ].includes(value.type) &&
          (refresh
            ? value.ref === undefined
            : isReference(value.ref, kind) && value.ref.repositoryId === this.repositoryId) &&
          (value.state === undefined || ['READY', 'READ_ONLY', 'DEGRADED'].includes(value.state))
      if (!valid || !value) {
        this.currentState = 'DEGRADED'
        this.index?.invalidate()
        value = {
          eventId: 'invalid-feed-' + (this.deliverySequence + 1),
          repositoryId: this.repositoryId,
          sequence: 0,
          type: 'repository.reloaded',
          revision: this.lastEventRevision,
          state: 'DEGRADED',
        }
      } else {
        if (value.sequence <= this.sequence) return
        const gap = value.sequence !== this.sequence + 1
        this.sequence = value.sequence
        this.lastEventRevision = value.revision
        if (gap)
          value = {
            eventId: value.eventId,
            repositoryId: value.repositoryId,
            sequence: value.sequence,
            type: 'repository.reloaded',
            revision: value.revision,
            ...(value.state ? { state: value.state } : {}),
          }
        if (value.state)
          this.currentState =
            value.state === 'READY' &&
            (adapter.profile.accessMode === 'read-only' || !adapter.capabilities.canWrite)
              ? 'READ_ONLY'
              : value.state
      }
      value = { ...value, sequence: ++this.deliverySequence }
      if (value.type === 'repository.reloaded' || value.type === 'metamodel.changed') {
        this.index?.invalidate()
        if (value.state !== 'DEGRADED') void this.refreshIndex()
      }
      for (const listener of this.listeners)
        try {
          listener(clone(value))
        } catch {
          /* committed changes remain committed */
        }
    })
  }
  get state() {
    return this.currentState
  }
  get capabilities() {
    return clone(this.adapter.capabilities)
  }
  get repositoryId() {
    return this.adapter.profile.repositoryId
  }
  async attachIndex(index: DerivedIndexPort): Promise<Result<true>> {
    const guard = this.guard()
    if (!guard.ok) return guard
    return this.queueIndex(async () => {
      if (this.closing.isCancellationRequested) return failure('SESSION_CLOSED')
      if (this.index && this.index !== index) await this.index.close()
      this.index = index
      return this.rebuildIndex(index)
    })
  }
  async refreshIndex(): Promise<Result<true>> {
    return this.queueIndex(() => {
      if (this.closing.isCancellationRequested) return Promise.resolve(failure('SESSION_CLOSED'))
      return this.index
        ? this.rebuildIndex(this.index)
        : Promise.resolve(failure('UNSUPPORTED_CAPABILITY'))
    })
  }
  private queueIndex(work: () => Promise<Result<true>>): Promise<Result<true>> {
    const next = this.indexTail.then(work).catch(() => {
      try {
        this.index?.invalidate()
      } catch {
        /* failed infrastructure remains unavailable */
      }
      return failure('INDEX_OUT_OF_SYNC')
    })
    this.indexTail = next
    return next
  }
  private async rebuildIndex(index: DerivedIndexPort): Promise<Result<true>> {
    try {
      const snapshot = await this.exportSnapshot()
      if (!snapshot.ok) {
        index.invalidate()
        return snapshot
      }
      return await index.rebuild(snapshot.value)
    } catch {
      index.invalidate()
      return failure('INDEX_OUT_OF_SYNC')
    }
  }
  private guard(write = false): Result<true> {
    if (this.closing.isCancellationRequested) return failure('SESSION_CLOSED')
    if (
      !this.context.repositoryIds.includes(this.repositoryId) ||
      !this.context.permissions.includes(write ? 'write' : 'read')
    )
      return failure('ACCESS_DENIED')
    if (write && this.currentState === 'READ_ONLY') return failure('REPOSITORY_READ_ONLY')
    if (write && this.currentState !== 'READY') return failure('RECOVERY_REQUIRED')
    return success(true)
  }
  private async read(
    kind: EntityKind,
    input: unknown,
    token?: CancellationToken,
  ): Promise<Result<Entity>> {
    const allowed = this.guard()
    if (!allowed.ok) return allowed
    const copied = copyJson(input)
    if (!copied.ok || !isReference(copied.value, kind)) return failure('MALFORMED_REFERENCE')
    const ref = copied.value
    if (ref.repositoryId !== this.repositoryId) return failure('REPOSITORY_MISMATCH')
    const result = await cancellable(() => this.adapter.read(kind, ref, token), token, this.closing)
    if (!result.ok) return result
    const decoded = kind === 'object' ? decodeObject(result.value) : decodeRelation(result.value)
    if (!decoded.ok || entityKey(kind, decoded.value.ref) !== entityKey(kind, ref))
      return failure('ADAPTER_CONTRACT')
    return decoded
  }
  getObject(ref: unknown, token?: CancellationToken) {
    return this.read('object', ref, token) as Promise<Result<RepositoryObject>>
  }
  getRelation(ref: unknown, token?: CancellationToken) {
    return this.read('relation', ref, token) as Promise<Result<RepositoryRelation>>
  }
  resolveObject(ref: unknown, token?: CancellationToken) {
    const safe = copyJson(ref)
    if (!safe.ok || !isReference(safe.value)) return Promise.resolve(failure('MALFORMED_REFERENCE'))
    return safe.value.repositoryId !== this.repositoryId
      ? Promise.resolve(failure('REPOSITORY_UNAVAILABLE'))
      : this.getObject(ref, token)
  }
  resolveRelation(ref: unknown, token?: CancellationToken) {
    const safe = copyJson(ref)
    if (!safe.ok || !isReference(safe.value, 'relation'))
      return Promise.resolve(failure('MALFORMED_REFERENCE'))
    return safe.value.repositoryId !== this.repositoryId
      ? Promise.resolve(failure('REPOSITORY_UNAVAILABLE'))
      : this.getRelation(ref, token)
  }
  private async query(
    kind: EntityKind,
    input: unknown = {},
    token?: CancellationToken,
  ): Promise<Result<Page<Partial<Entity>>>> {
    const allowed = this.guard()
    if (!allowed.ok) return allowed
    const query = decodeQuery(input)
    if (!query.ok) return query
    if (!this.adapter.query) return failure('UNSUPPORTED_CAPABILITY')
    const result = await cancellable(
      () => this.adapter.query!(kind, query.value, token),
      token,
      this.closing,
    )
    if (!result.ok) return result
    const copied = copyJson(result.value)
    if (
      !copied.ok ||
      !fields(copied.value, ['items', 'revision'], ['cursor']) ||
      !Array.isArray(copied.value.items) ||
      !nonblank(copied.value.revision) ||
      copied.value.items.length > (query.value.limit ?? 100) ||
      (copied.value.cursor !== undefined && !nonblank(copied.value.cursor))
    )
      return failure('ADAPTER_CONTRACT')
    const seen = new Set<string>()
    for (const row of copied.value.items) {
      if (
        !fields(row, ['ref', 'typeId', 'revision'], ['name', 'source', 'target', 'attributes']) ||
        !isReference(row.ref, kind) ||
        row.ref.repositoryId !== this.repositoryId ||
        !nonblank(row.revision)
      )
        return failure('ADAPTER_CONTRACT')
      const key = entityKey(kind, row.ref)
      if (seen.has(key)) return failure('ADAPTER_CONTRACT')
      seen.add(key)
      if (
        !query.value.projection &&
        !(kind === 'object' ? decodeObject(row) : decodeRelation(row)).ok
      )
        return failure('ADAPTER_CONTRACT')
    }
    return success(copied.value as unknown as Page<Partial<Entity>>)
  }
  queryObjects(query: unknown = {}, token?: CancellationToken) {
    return this.query('object', query, token)
  }
  queryRelations(query: unknown = {}, token?: CancellationToken) {
    return this.query('relation', query, token)
  }
  queryByAttribute(key: string, value: unknown, query: Query = {}) {
    return this.queryObjects({ ...query, where: { op: 'eq', field: 'attributes.' + key, value } })
  }
  queryByType(typeId: string, query: Query = {}) {
    return this.queryObjects({ ...query, where: { op: 'eq', field: 'typeId', value: typeId } })
  }
  queryByStatus(status: string, query: Query = {}) {
    return this.queryByAttribute('status', status, query)
  }
  getIncomingRelations(ref: ObjectRef, query: Query = {}, token?: CancellationToken) {
    return this.queryRelations(
      {
        ...query,
        where: {
          op: 'and',
          filters: [
            { op: 'eq', field: 'target.repositoryId', value: ref.repositoryId },
            { op: 'eq', field: 'target.objectId', value: ref.objectId },
          ],
        },
      },
      token,
    )
  }
  getOutgoingRelations(ref: ObjectRef, query: Query = {}, token?: CancellationToken) {
    return this.queryRelations(
      {
        ...query,
        where: {
          op: 'and',
          filters: [
            { op: 'eq', field: 'source.repositoryId', value: ref.repositoryId },
            { op: 'eq', field: 'source.objectId', value: ref.objectId },
          ],
        },
      },
      token,
    )
  }
  /** Check the authenticated read boundary without reading or parsing sources. */
  checkReadAccess() {
    return this.guard()
  }
  async exportSnapshot(token?: CancellationToken): Promise<Result<RepositorySnapshot>> {
    const allowed = this.guard()
    if (!allowed.ok) return allowed
    if (!this.adapter.snapshot) return failure('UNSUPPORTED_CAPABILITY')
    const result = await cancellable(() => this.adapter.snapshot!(token), token, this.closing)
    if (!result.ok) return result
    const decoded = decodeSnapshot(result.value)
    if (!decoded.ok) return failure('ADAPTER_CONTRACT')
    if (decoded.value.repositoryId !== this.repositoryId) return failure('ADAPTER_CONTRACT')
    return decoded
  }
  async getSubgraph(
    input: unknown,
    options: {
      direction?: 'incoming' | 'outgoing' | 'both'
      maxDepth?: number
      maxResults?: number
    } = {},
    token?: CancellationToken,
  ): Promise<Result<{ objects: RepositoryObject[]; relations: RepositoryRelation[] }>> {
    const safe = copyJson(input)
    if (!safe.ok || !isReference(safe.value)) return failure('MALFORMED_REFERENCE')
    const ref = safe.value as ObjectRef,
      maxDepth = options.maxDepth ?? 2,
      maxResults = options.maxResults ?? 1000,
      direction = options.direction ?? 'outgoing'
    if (
      !Number.isInteger(maxDepth) ||
      maxDepth < 0 ||
      maxDepth > LIMITS.traversalDepth ||
      !Number.isInteger(maxResults) ||
      maxResults < 1 ||
      maxResults > LIMITS.traversalResults ||
      !['incoming', 'outgoing', 'both'].includes(direction)
    )
      return failure('RESOURCE_LIMIT')
    // Pin the portable traversal to one repository revision without fetching a full snapshot.
    const anchor = await this.queryObjects({ limit: 1, projection: [] }, token)
    if (!anchor.ok) return anchor
    const objects = new Map<string, RepositoryObject>(),
      relations = new Map<string, RepositoryRelation>(),
      queue = [{ ref, depth: 0 }],
      visited = new Set<string>()
    while (queue.length) {
      const next = queue.shift()!,
        key = entityKey('object', next.ref)
      if (visited.has(key)) continue
      visited.add(key)
      if (objects.size + relations.size >= maxResults) return failure('RESOURCE_LIMIT')
      const object = await this.getObject(next.ref, token)
      if (!object.ok) return object
      objects.set(key, object.value)
      if (next.depth >= maxDepth) continue
      for (const way of direction === 'both' ? (['incoming', 'outgoing'] as const) : [direction]) {
        let cursor: string | undefined
        do {
          const query: Query = { limit: Math.min(1000, maxResults), ...(cursor ? { cursor } : {}) }
          const page = await (way === 'incoming'
            ? this.getIncomingRelations(next.ref, query, token)
            : this.getOutgoingRelations(next.ref, query, token))
          if (!page.ok) return page
          if (page.value.revision !== anchor.value.revision) return failure('REVISION_CONFLICT')
          for (const item of page.value.items) {
            const edge = decodeRelation(item)
            if (!edge.ok) return failure('ADAPTER_CONTRACT')
            const k = entityKey('relation', edge.value.ref)
            if (!relations.has(k) && objects.size + relations.size >= maxResults)
              return failure('RESOURCE_LIMIT')
            relations.set(k, edge.value)
            queue.push({
              ref: way === 'incoming' ? edge.value.source : edge.value.target,
              depth: next.depth + 1,
            })
          }
          cursor = page.value.cursor
        } while (cursor)
      }
    }
    const final = await this.queryObjects({ limit: 1, projection: [] }, token)
    if (!final.ok) return final
    if (final.value.revision !== anchor.value.revision) return failure('REVISION_CONFLICT')
    return success({ objects: [...objects.values()], relations: [...relations.values()] })
  }
  getNeighbors(
    ref: ObjectRef,
    options: { direction?: 'incoming' | 'outgoing' | 'both'; maxResults?: number } = {},
  ) {
    return this.getSubgraph(ref, { ...options, maxDepth: 1 })
  }
  getDependencies(ref: ObjectRef, options: { maxDepth?: number; maxResults?: number } = {}) {
    return this.getSubgraph(ref, { ...options, direction: 'outgoing' })
  }
  subscribe(listener: (event: RepositoryEvent) => void) {
    if (this.closing.isCancellationRequested) return () => {}
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  async reload() {
    if (!this.adapter.reload) return failure('UNSUPPORTED_CAPABILITY')
    const result = await cancellable(() => this.adapter.reload!(), undefined, this.closing)
    this.currentState = result.ok
      ? this.capabilities.canWrite
        ? 'READY'
        : 'READ_ONLY'
      : 'DEGRADED'
    return result
  }
  async history(
    input: unknown = {},
    token?: CancellationToken,
  ): Promise<Result<Page<HistoryEntry>>> {
    const guard = this.guard()
    if (!guard.ok) return guard
    if (!this.adapter.capabilities.supportsHistory || !this.adapter.history)
      return failure('UNSUPPORTED_CAPABILITY')
    const safe = copyJson(input)
    if (!safe.ok || !fields(safe.value, [], ['limit', 'cursor']))
      return failure('UNSUPPORTED_CAPABILITY')
    const query = decodeQuery(safe.value)
    if (!query.ok) return query
    const response = await cancellable(
      () => this.adapter.history!.read(query.value, token),
      token,
      this.closing,
    )
    if (!response.ok) return response
    const page = copyJson(response.value)
    if (
      !page.ok ||
      !fields(page.value, ['items', 'revision'], ['cursor']) ||
      !Array.isArray(page.value.items) ||
      page.value.items.length > (query.value.limit ?? 100) ||
      !nonblank(page.value.revision) ||
      (page.value.cursor !== undefined &&
        (!nonblank(page.value.cursor) || page.value.cursor.length > 20000))
    )
      return failure('ADAPTER_CONTRACT')
    const revisions = new Set<string>()
    for (const item of page.value.items) {
      if (
        !fields(item, ['revision'], ['message', 'ref']) ||
        !nonblank(item.revision) ||
        revisions.has(item.revision) ||
        (item.message !== undefined && typeof item.message !== 'string') ||
        (item.ref !== undefined &&
          ((!isReference(item.ref) && !isReference(item.ref, 'relation')) ||
            (item.ref !== undefined && (item.ref as ObjectRef).repositoryId !== this.repositoryId)))
      )
        return failure('ADAPTER_CONTRACT')
      revisions.add(item.revision)
    }
    return success(page.value as unknown as Page<HistoryEntry>)
  }
  private async authorize(changeSet: ChangeSet): Promise<boolean> {
    try {
      return this.policy
        ? (await this.policy.authorize(clone(this.context), clone(changeSet))) === true
        : false
    } catch {
      return false
    }
  }
  async validate(input: unknown): Promise<ValidationResult> {
    const decoded = decodeChangeSet(input)
    if (!decoded.ok)
      return {
        errors: [{ code: decoded.error.code, message: decoded.error.message, path: [] }],
        warnings: [],
      }
    const guard = this.guard(true)
    if (!guard.ok || !(await this.authorize(decoded.value)))
      return {
        errors: [
          {
            code: guard.ok ? 'ACCESS_DENIED' : guard.error.code,
            message: 'Command unavailable',
            path: [],
          },
        ],
        warnings: [],
      }
    const result = await this.prepareCommand(decoded.value, 'validation')
    return {
      errors: result.ok
        ? []
        : result.error.issues.length
          ? result.error.issues
          : [{ code: result.error.code, message: result.error.message, path: [] }],
      warnings: [],
    }
  }
  private async prepareCommand(
    changeSet: ChangeSet,
    id: string,
    token?: CancellationToken,
  ): Promise<Result<CommitRequest>> {
    const paged = this.adapter.pagedValidation
    if (!paged) {
      const snapshot = await this.exportSnapshot(token)
      return snapshot.ok
        ? prepare(
            changeSet,
            snapshot.value,
            this.adapter.model,
            id,
            this.context.permissions.includes('cascade'),
          )
        : snapshot
    }
    const scope = await cancellable(() => paged.scope(changeSet, token), token, this.closing)
    if (!scope.ok) return scope
    const decoded = decodeSnapshot(scope.value.snapshot)
    if (!decoded.ok || decoded.value.complete || typeof scope.value.targets?.get !== 'function')
      return failure('ADAPTER_CONTRACT')
    const prepared = prepare(
      changeSet,
      decoded.value,
      this.adapter.model,
      id,
      this.context.permissions.includes('cascade'),
      scope.value.targets,
    )
    if (!prepared.ok) return prepared
    const valid = await cancellable(
      () => paged.validate(prepared.value, token),
      token,
      this.closing,
    )
    if (!valid.ok) return valid
    if (valid.value !== true) return failure('ADAPTER_CONTRACT')
    return prepared
  }
  async applyChanges(input: unknown, token?: CancellationToken): Promise<Result<ChangeResult>> {
    const decoded = decodeChangeSet(input)
    if (!decoded.ok) return decoded
    const guard = this.guard(true)
    if (!guard.ok) return guard
    if (decoded.value.repositoryId !== this.repositoryId) return failure('REPOSITORY_MISMATCH')
    if (
      !this.adapter.writer ||
      !this.capabilities.guardedSnapshot ||
      this.capabilities.reconciliation !== 'session' ||
      ((decoded.value.commands.length > 1 || decoded.value.requireAtomic) &&
        !this.capabilities.supportsAtomicBatch)
    )
      return failure('UNSUPPORTED_CAPABILITY')
    const changeSet = decoded.value,
      id = changeSet.idempotencyKey ?? 'generated-' + ++this.generatedId,
      signature = commandSignature(changeSet),
      previous = this.operations.get(id)
    if (previous) {
      if (previous.signature !== signature) return failure('OPERATION_ID_CONFLICT')
      const result = await cancellable(
        async () => success(await previous.promise),
        token,
        this.closing,
      )
      return result.ok ? clone(result.value) : result
    }
    if (this.operations.size >= LIMITS.operations) return failure('RESOURCE_LIMIT')
    const operation: {
      signature: string
      promise: Promise<Result<ChangeResult>>
      request?: CommitRequest
    } = { signature, promise: Promise.resolve(failure('OUTCOME_UNKNOWN', [], id)) }
    this.operations.set(id, operation)
    operation.promise = (async () => {
      const permitted = await cancellable(
        async () => success(await this.authorize(changeSet)),
        token,
        this.closing,
      )
      if (!permitted.ok) return permitted
      if (!permitted.value) return failure('ACCESS_DENIED')
      const prepared = await this.prepareCommand(changeSet, id, token)
      if (!prepared.ok) return prepared
      if (token?.isCancellationRequested) return failure('CANCELLED')
      if (this.closing.isCancellationRequested) return failure('SESSION_CLOSED')
      if (prepared.value.changes.length === 0)
        return success({
          operationId: id,
          revision: prepared.value.expectedRevision,
          changes: [],
          warnings: [],
        })
      operation.request = prepared.value
      const result = await cancellable(
        () => this.adapter.writer!.commit(prepared.value, token),
        token,
        this.closing,
      )
      if (!result.ok)
        return [
          'CANCELLED',
          'SESSION_CLOSED',
          'REPOSITORY_UNAVAILABLE',
          'ADAPTER_CONTRACT',
        ].includes(result.error.code)
          ? failure('OUTCOME_UNKNOWN', [], id)
          : result
      const acknowledged = this.acknowledge(prepared.value, result.value)
      if (acknowledged.ok && this.index) {
        try {
          const indexed = await this.queueIndex(async () => {
            if (this.closing.isCancellationRequested || !this.index)
              return failure('INDEX_OUT_OF_SYNC')
            return this.index.applyChanges(acknowledged.value, prepared.value.expectedRevision)
          })
          if (!indexed.ok) {
            this.index.invalidate()
            return success({
              ...acknowledged.value,
              warnings: [...acknowledged.value.warnings, 'INDEX_OUT_OF_SYNC'],
            })
          }
        } catch {
          this.index.invalidate()
          return success({
            ...acknowledged.value,
            warnings: [...acknowledged.value.warnings, 'INDEX_OUT_OF_SYNC'],
          })
        }
      }
      return acknowledged
    })().catch(() => failure('OUTCOME_UNKNOWN', [], id))
    return clone(await operation.promise)
  }
  private acknowledge(request: CommitRequest, input: unknown): Result<ChangeResult> {
    const safe = copyJson(input)
    if (
      !safe.ok ||
      !fields(safe.value, ['operationId', 'revision', 'changes', 'warnings']) ||
      safe.value.operationId !== request.operationId ||
      !nonblank(safe.value.revision) ||
      safe.value.revision === request.expectedRevision ||
      !Array.isArray(safe.value.changes) ||
      safe.value.changes.length !== request.changes.length ||
      !Array.isArray(safe.value.warnings)
    )
      return failure('OUTCOME_UNKNOWN', [], request.operationId)
    const result = safe.value as unknown as ChangeResult,
      seen = new Set<string>()
    for (const change of result.changes) {
      if (!['object', 'relation'].includes(change.kind) || !isReference(change.ref, change.kind))
        return failure('OUTCOME_UNKNOWN', [], request.operationId)
      const key = entityKey(change.kind, change.ref),
        expected = request.changes.find((c) => entityKey(c.kind, c.ref) === key)
      if (!expected || seen.has(key) || expected.action !== change.action)
        return failure('OUTCOME_UNKNOWN', [], request.operationId)
      seen.add(key)
      if (change.action !== 'deleted') {
        const decoded =
          change.kind === 'object' ? decodeObject(change.entity) : decodeRelation(change.entity)
        if (
          !decoded.ok ||
          entityKey(change.kind, decoded.value.ref) !== key ||
          decoded.value.revision === expected.entity?.revision
        )
          return failure('OUTCOME_UNKNOWN', [], request.operationId)
        if (
          canonicalJson({
            ...decoded.value,
            revision: expected.entity?.revision,
          } as unknown as JsonValue) !== canonicalJson(expected.entity as unknown as JsonValue)
        )
          return failure('OUTCOME_UNKNOWN', [], request.operationId)
      }
    }
    return success(result)
  }
  async reconcile(operationId: string): Promise<Result<OperationOutcome>> {
    const guard = this.guard(true)
    if (!guard.ok) return guard
    const operation = this.operations.get(operationId)
    if (!operation?.request || !this.adapter.writer) return failure('UNSUPPORTED_CAPABILITY')
    const result = await cancellable(
      () => this.adapter.writer!.lookup(operationId),
      undefined,
      this.closing,
    )
    if (!result.ok) return result
    if (result.value.status === 'committed') {
      const verified = this.acknowledge(operation.request, result.value.result)
      if (!verified.ok) return verified
      operation.promise = Promise.resolve(verified)
      return success({ status: 'committed', result: verified.value })
    }
    if (!['not-committed', 'pending', 'unknown'].includes(result.value.status))
      return failure('ADAPTER_CONTRACT')
    return success(clone(result.value))
  }
  close(): Promise<Result<void>> {
    if (this.closingPromise) return this.closingPromise
    this.currentState = 'CLOSING'
    this.closing.cancel()
    this.listeners.clear()
    try {
      this.unsubscribe?.()
    } catch {
      /* still close adapter */
    }
    this.closingPromise = Promise.allSettled([
      Promise.resolve().then(() => this.adapter.close()),
      this.indexTail.then(() => this.index?.close()),
    ])
      .then((results) =>
        results.some((result) => result.status === 'rejected')
          ? failure('REPOSITORY_UNAVAILABLE')
          : success(undefined),
      )
      .finally(() => {
        this.currentState = 'CLOSED'
      })
    return this.closingPromise
  }
}
export async function openRepository(
  adapter: RepositoryAdapter,
  input: RequestContext,
  policy?: AuthorizationPolicy,
  token?: CancellationToken,
): Promise<Result<RepositorySession>> {
  const copied = copyJson(input)
  if (
    !copied.ok ||
    !fields(copied.value, ['callerId', 'repositoryIds', 'permissions']) ||
    !nonblank(copied.value.callerId) ||
    !Array.isArray(copied.value.repositoryIds) ||
    !copied.value.repositoryIds.every(nonblank) ||
    !Array.isArray(copied.value.permissions) ||
    !copied.value.permissions.every(nonblank)
  )
    return failure('ACCESS_DENIED')
  const context = copied.value as unknown as RequestContext
  const opened = await cancellable(
    () => adapter.open(token),
    token,
    undefined,
    (late) => {
      if (late.ok)
        void Promise.resolve()
          .then(() => late.value.close())
          .catch(() => {})
    },
  )
  if (!opened.ok) return opened
  const session = opened.value
  const cleanup = () =>
    Promise.resolve()
      .then(() => session?.close())
      .catch(() => {})
  try {
    if (!session || typeof session !== 'object') {
      await cleanup()
      return failure('ADAPTER_CONTRACT')
    }
    const valid = validateCapabilities(session.capabilities, session),
      profile = decodeProfile(session.profile)
    if (!valid.ok) {
      await cleanup()
      return valid
    }
    if (!profile.ok) {
      await cleanup()
      return profile
    }
    if (session.model.policy) {
      const policy = decodeRepositoryPolicy(session.model.policy, session.model.analysis())
      if (!policy.ok) {
        await cleanup()
        return policy
      }
    }
    if (
      !context.repositoryIds.includes(profile.value.repositoryId) ||
      !context.permissions.includes('read')
    ) {
      await cleanup()
      return failure('ACCESS_DENIED')
    }
    return success(new RepositorySession(session, context, policy))
  } catch {
    await cleanup()
    return failure('ADAPTER_CONTRACT')
  }
}
