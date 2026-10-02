import { open, writeFile, realpath, lstat, rename, unlink, mkdir } from 'node:fs/promises'
import { watch, type FSWatcher } from 'node:fs'
import { resolve, relative, dirname, isAbsolute, sep, join } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { parseDocument, stringify, visit, isAlias, isNode, type Document } from 'yaml'
import { compileModel, type ModelSource } from '@frade/metamodel-compiler'
import { validateSnapshot } from '@frade/metamodel-domain'
import {
  copyJson,
  fields,
  nonblank,
  canonicalJson,
  decodeObject,
  decodeRelation,
  decodeSnapshot,
  entityKey,
  failure,
  success,
  queryEntities,
  record,
  validationProjection,
  decodeRepositoryPolicy,
  applyAttributePolicies,
  validatePolicyChanges,
  type ErrorCode,
  type Result,
  type Revision,
  type RepositorySnapshot,
  type Entity,
  type EntityKind,
  type ObjectRef,
  type RelationRef,
  type Query,
  type JsonValue,
} from '@frade/repository-domain'
import {
  decodeProfile,
  type RepositoryAdapter,
  type RepositoryAdapterSession,
  type RepositoryCapabilities,
  type RepositoryProfile,
  type RepositoryModel,
  type RepositoryEvent,
  type CommitRequest,
  type ChangeResult,
  type EntityChange,
  type OperationOutcome,
  type CancellationToken,
} from '@frade/repository-ports'
import { sampleMetamodel } from './sample'

const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const activeWriters = new Set<string>()
export interface NativeAdapterOptions {
  /** Trusted host/test observability; never loaded from repository configuration. */ readonly writeBarrier?: (
    phase: 'staged' | 'replaced',
  ) => Promise<void>
}
class NativeFailure extends Error {
  constructor(readonly code: ErrorCode) {
    super(code)
  }
}
function fail(code: ErrorCode): never {
  throw new NativeFailure(code)
}
const unwrap = <T>(result: Result<T>): T => {
  if (!result.ok) fail(result.error.code)
  return (result as { ok: true; value: T }).value
}
const clone = <T>(value: T): T => unwrap(copyJson(value)) as T
const exists = async (path: string) => {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}
/** Roots come only from a trusted host. Every configured component is checked for symlinks. */
export async function contained(root: string, name: string): Promise<string> {
  if (
    !name ||
    name.includes('\0') ||
    isAbsolute(name) ||
    name.split(/[\\/]/).some((p) => p === '..' || p === '') ||
    name.includes(':')
  )
    fail('PROFILE_INVALID')
  const target = resolve(root, name),
    rel = relative(root, target)
  if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) fail('PROFILE_INVALID')
  let current = root
  for (const part of rel.split(sep)) {
    current = join(current, part)
    try {
      if ((await lstat(current)).isSymbolicLink()) fail('ACCESS_DENIED')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
  return target
}
export async function boundedText(path: string, max = 16 * 1024 * 1024): Promise<string> {
  const handle = await open(path, 'r')
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.size > max) fail('RESOURCE_LIMIT')
    const buffer = Buffer.alloc(stat.size + 1)
    let length = 0
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null)
      if (!bytesRead) break
      length += bytesRead
    }
    if (length > stat.size || (await handle.stat()).size !== stat.size) fail('REVISION_CONFLICT')
    return buffer.subarray(0, length).toString('utf8')
  } finally {
    await handle.close()
  }
}
interface Loaded {
  policyText: string
  profile: RepositoryProfile
  profileText: string
  modelText: string
  sourceText: string
  sourcePath: string
  doc: Document
  preservable: boolean
  snapshot: RepositorySnapshot
  model: RepositoryModel
}
async function load(
  root: string,
  options: { allowRecovery?: boolean; sourceText?: string } = {},
): Promise<Loaded> {
  if (!options.allowRecovery && (await exists(await contained(root, '.frade-recovery.json'))))
    fail('RECOVERY_REQUIRED')
  const profileText = await boundedText(await contained(root, 'profile.json'), 100000)
  let profile: RepositoryProfile
  try {
    profile = unwrap(decodeProfile(JSON.parse(profileText)))
  } catch (error) {
    if (error instanceof NativeFailure) throw error
    fail('PROFILE_INVALID')
  }
  if (profile!.adapterKind !== 'native') fail('UNSUPPORTED_CAPABILITY')
  const modelText = await boundedText(await contained(root, profile!.metamodel.path), 1000000)
  let source: unknown
  try {
    source = JSON.parse(modelText)
  } catch {
    fail('METAMODEL_INVALID')
  }
  if (record(source) && record(source.definition) && source.definition.schemaVersion !== 1)
    fail('SCHEMA_INCOMPATIBLE')
  const compiled = await compileModel(source, {
    load: async () => {
      throw Error('Imports require an explicit mapped loader')
    },
    sha256: async (text) => hash(text),
  })
  if (!compiled.ok) fail('METAMODEL_INVALID')
  const compiledModel = compiled.value
  if (compiledModel.version !== profile!.metamodel.version) fail('SCHEMA_INCOMPATIBLE')
  const model: RepositoryModel = {
    modelId: compiledModel.id,
    modelVersion: compiledModel.version,
    fingerprint: compiledModel.fingerprint,
    analysis: compiledModel.analysis,
  }
  const policyText = profile!.policyPath
    ? await boundedText(await contained(root, profile!.policyPath), 1000000)
    : ''
  if (policyText) {
    let rawPolicy: unknown
    try {
      rawPolicy = JSON.parse(policyText)
    } catch {
      fail('METAMODEL_INVALID')
    }
    Object.assign(model, { policy: unwrap(decodeRepositoryPolicy(rawPolicy, model.analysis())) })
  }
  const sourcePath = await contained(root, profile!.mapping.sourceFile),
    sourceText = options.sourceText ?? (await boundedText(sourcePath))
  const doc = parseDocument(sourceText, {
    strict: true,
    uniqueKeys: true,
    prettyErrors: false,
    logLevel: 'silent',
    keepSourceTokens: true,
  })
  if (doc.errors.length || doc.warnings.length) fail('VALIDATION_FAILED')
  let raw: unknown
  try {
    raw =
      profile!.mapping.format === 'json' ? JSON.parse(sourceText) : doc.toJS({ maxAliasCount: 100 })
  } catch {
    fail('VALIDATION_FAILED')
  }
  const data = unwrap(copyJson(raw))
  if (!record(data) || data.formatVersion !== 1) fail('SCHEMA_INCOMPATIBLE')
  if (
    data.repositoryId !== profile!.repositoryId ||
    !Array.isArray(data.objects) ||
    !Array.isArray(data.relations)
  )
    fail('VALIDATION_FAILED')
  const objects = data.objects.map((value: unknown) => {
    if (!record(value)) fail('VALIDATION_FAILED')
    const v = value as Record<string, unknown>
    return unwrap(
      decodeObject(
        Object.fromEntries(
          ['ref', 'typeId', 'name', 'attributes', 'revision'].map((k) => [k, v[k]]),
        ),
      ),
    )
  })
  const relations = data.relations.map((value: unknown) => {
    if (!record(value)) fail('VALIDATION_FAILED')
    const v = value as Record<string, unknown>
    return unwrap(
      decodeRelation(
        Object.fromEntries(
          ['ref', 'typeId', 'source', 'target', 'attributes', 'revision'].map((k) => [k, v[k]]),
        ),
      ),
    )
  })
  const seen = new Set<string>()
  for (const [kind, list] of [
    ['object', objects],
    ['relation', relations],
  ] as const)
    for (const entity of list) {
      const key = entityKey(kind, entity.ref)
      if (entity.ref.repositoryId !== profile!.repositoryId || seen.has(key))
        fail('VALIDATION_FAILED')
      seen.add(key)
    }
  const snapshot = unwrap(
    decodeSnapshot({
      repositoryId: profile!.repositoryId,
      revision: hash(sourceText + modelText + profileText + policyText),
      complete: true,
      binding: {
        modelId: model.modelId,
        modelVersion: model.modelVersion,
        fingerprint: model.fingerprint,
      },
      objects,
      relations,
    }),
  )
  if (!validateSnapshot(model.analysis(), validationProjection(snapshot)).ok)
    fail('VALIDATION_FAILED')
  let preservable = true
  visit(doc, (_key, node) => {
    if (isAlias(node) || (isNode(node) && (('anchor' in node && node.anchor) || node.tag)))
      preservable = false
  })
  return {
    policyText,
    profile: profile!,
    profileText,
    modelText,
    sourceText,
    sourcePath,
    doc: doc as Document,
    preservable,
    snapshot,
    model,
  }
}
function patchValue(
  doc: Document,
  path: (string | number)[],
  before: unknown,
  after: unknown,
): void {
  if (JSON.stringify(before) === JSON.stringify(after)) return
  if (record(before) && record(after)) {
    for (const key of Object.keys(before))
      if (!Object.hasOwn(after, key)) doc.deleteIn([...path, key])
    for (const [key, value] of Object.entries(after))
      patchValue(doc, [...path, key], before[key], value)
  } else doc.setIn(path, after)
}
class NativeSession implements RepositoryAdapterSession {
  capabilities: RepositoryCapabilities
  private writeService: RepositoryAdapterSession['writer']
  get writer() {
    return this.capabilities.canWrite ? this.writeService : undefined
  }
  private closed = false
  private sequence = 0
  private readonly sessionId = randomUUID()
  private listeners = new Set<(event: RepositoryEvent) => void>()
  private watchers: FSWatcher[] = []
  private healthy = true
  private reloading?: Promise<Result<boolean>>
  private timer?: ReturnType<typeof setTimeout>
  private operations = new Map<string, { payload: string; outcome: OperationOutcome }>()
  private committing = false
  private activeWrites = new Set<Promise<Result<ChangeResult>>>()
  private closingPromise?: Promise<void>
  constructor(
    private readonly root: string,
    private data: Loaded,
    private readonly options: NativeAdapterOptions = {},
  ) {
    const canWrite = data.profile.accessMode === 'read-write'
    this.capabilities = Object.freeze({
      canRead: true,
      canWrite,
      supportsBatch: canWrite,
      supportsAtomicBatch: canWrite,
      supportsWatch: true,
      supportsHistory: false,
      supportsTransactions: canWrite,
      supportsCrossRepositoryReferences: false,
      supportsServerSideQueries: false,
      supportedQueryOperators: [
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
      ],
      supportedMetamodelFeatures: [
        'attributes',
        'defaults',
        'inheritance',
        'references',
        'relations',
        'cardinality',
        'lifecycle',
      ],
      guardedSnapshot: canWrite,
      reconciliation: canWrite ? 'session' : 'none',
      preservation: 'structure',
      writerCoordination: 'cooperating-processes',
    })
    this.writeService = {
      commit: (request, token) => {
        const pending = this.commit(request, token)
        this.activeWrites.add(pending)
        void pending.then(
          () => this.activeWrites.delete(pending),
          () => this.activeWrites.delete(pending),
        )
        return pending
      },
      lookup: async (id) =>
        success(clone(this.operations.get(id)?.outcome ?? { status: 'unknown' })),
    }
    this.startWatchers()
  }
  private updateCapabilities() {
    const canWrite = this.healthy && this.data.profile.accessMode === 'read-write'
    this.capabilities = Object.freeze({
      ...this.capabilities,
      canWrite,
      supportsBatch: canWrite,
      supportsAtomicBatch: canWrite,
      supportsTransactions: canWrite,
      guardedSnapshot: canWrite,
      reconciliation: canWrite ? 'session' : 'none',
    })
  }
  private startWatchers() {
    for (const watcher of this.watchers) watcher.close()
    this.watchers = []
    const directories = new Set([
      this.root,
      dirname(this.data.sourcePath),
      dirname(resolve(this.root, this.data.profile.metamodel.path)),
      ...(this.data.profile.policyPath
        ? [dirname(resolve(this.root, this.data.profile.policyPath))]
        : []),
    ])
    for (const directory of directories) {
      const watcher = watch(directory, () => {
        if (this.closed) return
        if (this.timer) clearTimeout(this.timer)
        this.timer = setTimeout(() => {
          void this.reload()
        }, 40)
      })
      watcher.on('error', () => {
        this.healthy = false
        this.updateCapabilities()
        this.publish('repository.reloaded', this.data.snapshot.revision)
      })
      this.watchers.push(watcher)
    }
  }
  get profile() {
    return clone(this.data.profile)
  }
  get model() {
    return this.data.model
  }
  private publish(type: RepositoryEvent['type'], revision: string, ref?: ObjectRef | RelationRef) {
    if (this.closed) return
    const event: RepositoryEvent = {
      eventId: randomUUID(),
      repositoryId: this.data.profile.repositoryId,
      sequence: ++this.sequence,
      type,
      revision,
      state: this.healthy
        ? this.data.profile.accessMode === 'read-only'
          ? 'READ_ONLY'
          : 'READY'
        : 'DEGRADED',
      ...(ref ? { ref } : {}),
    }
    for (const listener of this.listeners)
      try {
        listener(clone(event))
      } catch {
        /* best-effort independent delivery */
      }
  }
  subscribe(listener: (event: RepositoryEvent) => void) {
    if (this.closed) return () => {}
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  reload(): Promise<Result<boolean>> {
    if (!this.reloading)
      this.reloading = this.reloadWork().finally(() => {
        this.reloading = undefined
      })
    return this.reloading
  }
  private async reloadWork(): Promise<Result<boolean>> {
    if (this.closed) return failure('SESSION_CLOSED')
    if (this.committing) return success(false)
    try {
      const next = await load(this.root)
      if (this.closed) return failure('SESSION_CLOSED')
      if (next.snapshot.revision === this.data.snapshot.revision && this.healthy)
        return success(false)
      const modelChanged =
        next.model.fingerprint !== this.data.model.fingerprint ||
        next.policyText !== this.data.policyText
      this.data = next
      this.healthy = true
      this.updateCapabilities()
      this.startWatchers()
      this.publish(
        modelChanged ? 'metamodel.changed' : 'repository.reloaded',
        next.snapshot.revision,
      )
      return success(true)
    } catch (error) {
      const wasHealthy = this.healthy
      this.healthy = false
      this.updateCapabilities()
      if (wasHealthy) this.publish('repository.reloaded', this.data.snapshot.revision)
      return failure(error instanceof NativeFailure ? error.code : 'REPOSITORY_UNAVAILABLE')
    }
  }
  async snapshot(token?: CancellationToken): Promise<Result<RepositorySnapshot>> {
    if (token?.isCancellationRequested) return failure('CANCELLED')
    const reloaded = await this.reload()
    if (!reloaded.ok) return reloaded
    return success(clone(this.data.snapshot))
  }
  async read(
    kind: EntityKind,
    ref: ObjectRef | RelationRef,
    token?: CancellationToken,
  ): Promise<Result<Entity>> {
    if (this.closed) return failure('SESSION_CLOSED')
    if (token?.isCancellationRequested) return failure('CANCELLED')
    if (!this.healthy) return failure('REPOSITORY_UNAVAILABLE')
    if (ref.repositoryId !== this.profile.repositoryId) return failure('REPOSITORY_MISMATCH')
    const list = kind === 'object' ? this.data.snapshot.objects : this.data.snapshot.relations
    const found = list.find((entity) => entityKey(kind, entity.ref) === entityKey(kind, ref))
    return found ? success(clone(found)) : failure('ENTITY_NOT_FOUND')
  }
  async query(kind: EntityKind, query: Query, token?: CancellationToken) {
    if (this.closed) return failure('SESSION_CLOSED')
    if (token?.isCancellationRequested) return failure('CANCELLED')
    if (!this.healthy) return failure('REPOSITORY_UNAVAILABLE')
    const list: readonly Entity[] =
      kind === 'object' ? this.data.snapshot.objects : this.data.snapshot.relations
    return queryEntities(list, query, this.sessionId + ':' + kind, this.data.snapshot.revision)
  }
  private async commit(
    input: CommitRequest,
    token?: CancellationToken,
  ): Promise<Result<ChangeResult>> {
    if (this.closed) return failure('SESSION_CLOSED')
    if (token?.isCancellationRequested) return failure('CANCELLED')
    if (!this.healthy) return failure('RECOVERY_REQUIRED')
    let request: CommitRequest
    try {
      request = clone(input)
    } catch {
      return failure('INVALID_INPUT')
    }
    const payload = JSON.stringify(request),
      previous = this.operations.get(request.operationId)
    if (previous) {
      if (previous.payload !== payload) return failure('OPERATION_ID_CONFLICT')
      return previous.outcome.status === 'committed'
        ? success(clone(previous.outcome.result))
        : failure('OUTCOME_UNKNOWN', [], request.operationId)
    }
    if (this.operations.size >= 1024) return failure('RESOURCE_LIMIT')
    if (this.committing) return failure('REVISION_CONFLICT')
    const lockPath = await contained(this.root, '.frade-write.lock'),
      journalPath = await contained(this.root, '.frade-recovery.json')
    let lock: Awaited<ReturnType<typeof open>> | undefined,
      staged = false,
      committed = false,
      tempPath: string | undefined
    this.committing = true
    try {
      if (await exists(await contained(this.root, '.frade-recover.lock'))) fail('RECOVERY_REQUIRED')
      try {
        lock = await open(lockPath, 'wx')
      } catch {
        fail('REVISION_CONFLICT')
      }
      activeWriters.add(this.root)
      await lock.writeFile(
        JSON.stringify({ version: 1, pid: process.pid, operationId: request.operationId }),
      )
      await lock.sync()
      const latest = await load(this.root)
      if (latest.profile.accessMode === 'read-only') fail('REPOSITORY_READ_ONLY')
      if (latest.snapshot.revision !== request.expectedRevision) fail('REVISION_CONFLICT')
      if (!latest.preservable) fail('UNSUPPORTED_CAPABILITY')
      if (
        request.candidate.repositoryId !== latest.profile.repositoryId ||
        JSON.stringify(request.candidate.binding) !== JSON.stringify(latest.snapshot.binding)
      )
        fail('BINDING_MISMATCH')
      const candidate = unwrap(decodeSnapshot(request.candidate))
      if (!validateSnapshot(latest.model.analysis(), validationProjection(candidate)).ok)
        fail('VALIDATION_FAILED')
      const changes: EntityChange[] = []
      const raw = latest.doc.toJS() as {
        objects: Entity[]
        relations: Entity[]
        [key: string]: unknown
      }
      for (const change of request.changes) {
        const collection = change.kind === 'object' ? 'objects' : 'relations',
          rows = raw[collection]
        const position = rows.findIndex(
          (entity) => entityKey(change.kind, entity.ref) === entityKey(change.kind, change.ref),
        )
        if (
          (change.action === 'created' && position >= 0) ||
          (change.action !== 'created' && position < 0)
        )
          fail('REVISION_CONFLICT')
        if (change.action === 'deleted') {
          latest.doc.deleteIn([collection, position])
          rows.splice(position, 1)
          changes.push(change)
          continue
        }
        if (!change.entity) fail('INVALID_INPUT')
        const entity = { ...change.entity!, revision: randomUUID() as Revision }
        if (position < 0) {
          latest.doc.addIn([collection], entity)
          rows.push(entity)
        } else {
          // Only canonical fields are owned by Core; source-specific siblings remain untouched.
          for (const [field, value] of Object.entries(entity))
            patchValue(
              latest.doc,
              [collection, position, field],
              (rows[position] as unknown as Record<string, unknown>)[field],
              value,
            )
          rows[position] = { ...rows[position], ...entity }
        }
        changes.push({ ...change, entity })
      }
      // Validate the actual document to be written, not just a caller-supplied candidate.
      const actual = {
        objects: raw.objects.map((entity) =>
          unwrap(
            decodeObject(
              Object.fromEntries(
                ['ref', 'typeId', 'name', 'attributes', 'revision'].map((key) => [
                  key,
                  (entity as unknown as Record<string, unknown>)[key],
                ]),
              ),
            ),
          ),
        ),
        relations: raw.relations.map((entity) =>
          unwrap(
            decodeRelation(
              Object.fromEntries(
                ['ref', 'typeId', 'source', 'target', 'attributes', 'revision'].map((key) => [
                  key,
                  (entity as unknown as Record<string, unknown>)[key],
                ]),
              ),
            ),
          ),
        ),
      }
      const projection = validationProjection({ ...candidate, ...actual })
      const policyValidation = validatePolicyChanges(latest.model.policy, latest.snapshot, {
        ...candidate,
        ...actual,
      })
      if (!policyValidation.ok) fail('VALIDATION_FAILED')
      for (const change of changes)
        if (change.entity) {
          const previous = (
            change.kind === 'object' ? latest.snapshot.objects : latest.snapshot.relations
          ).find(
            (entity) => entityKey(change.kind, entity.ref) === entityKey(change.kind, change.ref),
          )
          const rule =
            change.kind === 'object'
              ? latest.model.policy?.objectTypes[change.entity.typeId]
              : latest.model.policy?.relationTypes[change.entity.typeId]
          const checked = applyAttributePolicies(change.entity, previous, rule)
          if (
            !checked.ok ||
            canonicalJson(checked.value.attributes as JsonValue) !==
              canonicalJson(change.entity.attributes as JsonValue)
          )
            fail('VALIDATION_FAILED')
        }
      if (
        !validateSnapshot(latest.model.analysis(), projection).ok ||
        canonicalJson(projection as unknown as JsonValue) !==
          canonicalJson(validationProjection(candidate) as unknown as JsonValue)
      )
        fail('VALIDATION_FAILED')
      const names = (items: readonly Entity[]) =>
        items.map((entity) => ({
          ref: entity.ref,
          ...('name' in entity ? { name: entity.name } : {}),
        }))
      if (
        canonicalJson(names(actual.objects) as unknown as JsonValue) !==
        canonicalJson(names(candidate.objects) as unknown as JsonValue)
      )
        fail('VALIDATION_FAILED')
      const nextText =
        latest.profile.mapping.format === 'json'
          ? JSON.stringify(latest.doc.toJS(), null, 2) + '\n'
          : latest.doc.toString()
      if (token?.isCancellationRequested) fail('CANCELLED')
      this.operations.set(request.operationId, { payload, outcome: { status: 'pending' } })
      tempPath = await contained(
        this.root,
        relative(
          this.root,
          join(dirname(latest.sourcePath), '.frade-stage-' + randomUUID() + '.tmp'),
        ),
      )
      const journal = await open(journalPath, 'wx')
      try {
        await journal.writeFile(
          JSON.stringify({
            version: 1,
            operationId: request.operationId,
            sourceFile: latest.profile.mapping.sourceFile,
            expectedRevision: request.expectedRevision,
            stagedFile: relative(this.root, tempPath),
            nextContentHash: hash(nextText),
          }),
        )
        await journal.sync()
        staged = true
      } finally {
        await journal.close()
      }
      const temp = await open(tempPath, 'wx')
      try {
        await temp.writeFile(nextText)
        await temp.sync()
      } finally {
        await temp.close()
      }
      await this.options.writeBarrier?.('staged')
      // Revalidate source/config immediately before replacement. The lock coordinates participating writers only.
      await contained(this.root, latest.profile.mapping.sourceFile)
      const [sourceNow, modelNow, profileNow, policyNow] = await Promise.all([
        boundedText(latest.sourcePath),
        boundedText(await contained(this.root, latest.profile.metamodel.path), 1000000),
        boundedText(await contained(this.root, 'profile.json'), 100000),
        latest.profile.policyPath
          ? boundedText(await contained(this.root, latest.profile.policyPath), 1000000)
          : Promise.resolve(''),
      ])
      if (hash(sourceNow + modelNow + profileNow + policyNow) !== request.expectedRevision)
        fail('REVISION_CONFLICT')
      await rename(tempPath, latest.sourcePath)
      committed = true
      await this.options.writeBarrier?.('replaced')
      const revision = hash(nextText + latest.modelText + latest.profileText + latest.policyText)
      const result: ChangeResult = {
        operationId: request.operationId,
        revision,
        changes,
        warnings: [],
      }
      this.operations.set(request.operationId, {
        payload,
        outcome: { status: 'committed', result: clone(result) },
      })
      try {
        await unlink(journalPath)
        staged = false
        this.data = await load(this.root)
      } catch {
        ;(result.warnings as string[]).push('RECOVERY_REQUIRED')
      }
      for (const change of changes)
        this.publish(
          (change.kind + '.' + change.action) as RepositoryEvent['type'],
          revision,
          change.ref,
        )
      return success(clone(result))
    } catch (error) {
      const code = error instanceof NativeFailure ? error.code : 'WRITE_FAILED'
      if (committed) return failure('OUTCOME_UNKNOWN', [], request.operationId)
      this.operations.set(request.operationId, { payload, outcome: { status: 'not-committed' } })
      // A staged failure is left for explicit recovery; never discard its source/staged evidence.
      return failure(staged ? 'RECOVERY_REQUIRED' : code, [], request.operationId)
    } finally {
      if (lock) {
        activeWriters.delete(this.root)
        await lock.close()
        if (!staged) await unlink(lockPath).catch(() => {})
      }
      this.committing = false
    }
  }
  close(): Promise<void> {
    if (this.closingPromise) return this.closingPromise
    this.closed = true
    if (this.timer) clearTimeout(this.timer)
    for (const watcher of this.watchers) watcher.close()
    this.watchers = []
    this.listeners.clear()
    this.closingPromise = Promise.allSettled([...this.activeWrites, this.reloading]).then(() => {})
    return this.closingPromise
  }
}
export class NativeAdapter implements RepositoryAdapter {
  constructor(
    private readonly root: string,
    private readonly options: NativeAdapterOptions = {},
  ) {}
  async open(token?: CancellationToken): Promise<Result<RepositoryAdapterSession>> {
    if (token?.isCancellationRequested) return failure('CANCELLED')
    try {
      const root = await realpath(this.root)
      if (await exists(await contained(root, '.frade-write.lock'))) fail('RECOVERY_REQUIRED')
      if (await exists(await contained(root, '.frade-recover.lock'))) fail('RECOVERY_REQUIRED')
      const profileText = await boundedText(await contained(root, 'profile.json'), 100000)
      let profile: RepositoryProfile
      try {
        profile = unwrap(decodeProfile(JSON.parse(profileText)))
      } catch (error) {
        if (error instanceof NativeFailure) throw error
        fail('PROFILE_INVALID')
      }
      if (profile.adapterKind === 'native-v2') {
        const { PagedNativeAdapter } = await import('./paged')
        return new PagedNativeAdapter(root, this.options).open(token)
      }
      const data = await load(root)
      if (token?.isCancellationRequested) return failure('CANCELLED')
      return success(new NativeSession(root, data, this.options))
    } catch (error) {
      return failure(error instanceof NativeFailure ? error.code : 'REPOSITORY_UNAVAILABLE')
    }
  }
}
interface RecoveryState {
  journalHash: string
  operationId: string
  phase: 'STAGED' | 'COMMITTED' | 'CONFLICTED'
  writerActive: boolean
}
async function recoveryState(root: string) {
  const journalText = await boundedText(await contained(root, '.frade-recovery.json'), 65536),
    journal: unknown = JSON.parse(journalText)
  if (
    !fields(journal, [
      'version',
      'operationId',
      'sourceFile',
      'expectedRevision',
      'stagedFile',
      'nextContentHash',
    ]) ||
    journal.version !== 1 ||
    !['operationId', 'sourceFile', 'expectedRevision', 'stagedFile', 'nextContentHash'].every(
      (key) => nonblank(journal[key]),
    )
  )
    fail('RECOVERY_REQUIRED')
  const profile = unwrap(
    decodeProfile(JSON.parse(await boundedText(await contained(root, 'profile.json'), 100000))),
  )
  if (journal.sourceFile !== profile.mapping.sourceFile) fail('RECOVERY_REQUIRED')
  const sourcePath = await contained(root, journal.sourceFile as string),
    stagePath = await contained(root, journal.stagedFile as string)
  if (dirname(sourcePath) !== dirname(stagePath) || !stagePath.includes('.frade-stage-'))
    fail('RECOVERY_REQUIRED')
  const sourceText = await boundedText(sourcePath),
    modelText = await boundedText(await contained(root, profile.metamodel.path), 1000000),
    profileText = await boundedText(await contained(root, 'profile.json'), 100000),
    policyText = profile.policyPath
      ? await boundedText(await contained(root, profile.policyPath), 1000000)
      : ''
  let writerActive = activeWriters.has(root)
  const lockPath = await contained(root, '.frade-write.lock')
  if (await exists(lockPath)) {
    const owner = JSON.parse(await boundedText(lockPath, 65536))
    if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0) fail('RECOVERY_REQUIRED')
    if (owner.pid !== process.pid) {
      try {
        process.kill(owner.pid, 0)
        writerActive = true
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') writerActive = true
      }
    }
  }
  const phase =
    hash(sourceText) === journal.nextContentHash
      ? 'COMMITTED'
      : hash(sourceText + modelText + profileText + policyText) === journal.expectedRevision
        ? 'STAGED'
        : 'CONFLICTED'
  return {
    journalText,
    journal,
    sourceText,
    sourcePath,
    stagePath,
    lockPath,
    preview: {
      journalHash: hash(journalText),
      operationId: journal.operationId as string,
      phase,
      writerActive,
    } as RecoveryState,
  }
}
/** Read-only inspection; a preview token never authorizes an automatic replay. */
export async function inspectNativeRecovery(root: string): Promise<Result<RecoveryState>> {
  try {
    return success((await recoveryState(await realpath(root))).preview)
  } catch (error) {
    return failure(error instanceof NativeFailure ? error.code : 'RECOVERY_REQUIRED')
  }
}
/** Trusted host operation: authorize operator recovery before calling with a host-owned root. */
export async function recoverNativeRepository(
  root: string,
  options: { expectedJournalHash: string; strategy: 'keep-source' | 'finish-staged' },
): Promise<Result<{ evidenceDirectory: string; status: 'RECOVERED' }>> {
  let recoveryLock: Awaited<ReturnType<typeof open>> | undefined,
    recoveryLockPath: string | undefined
  try {
    if (
      !['keep-source', 'finish-staged'].includes(options.strategy) ||
      !nonblank(options.expectedJournalHash)
    )
      fail('INVALID_INPUT')
    root = await realpath(root)
    recoveryLockPath = await contained(root, '.frade-recover.lock')
    recoveryLock = await open(recoveryLockPath, 'wx')
    const state = await recoveryState(root)
    if (state.preview.writerActive || state.preview.journalHash !== options.expectedJournalHash)
      fail('REVISION_CONFLICT')
    if (options.strategy === 'finish-staged' && state.preview.phase === 'CONFLICTED')
      fail('REVISION_CONFLICT')
    const stagedText = (await exists(state.stagePath))
      ? await boundedText(state.stagePath)
      : undefined
    if (
      options.strategy === 'finish-staged' &&
      state.preview.phase !== 'COMMITTED' &&
      (stagedText === undefined || hash(stagedText) !== state.journal.nextContentHash)
    )
      fail('RECOVERY_REQUIRED')
    await load(root, {
      allowRecovery: true,
      ...(options.strategy === 'finish-staged' && state.preview.phase !== 'COMMITTED'
        ? { sourceText: stagedText }
        : {}),
    })
    const evidenceDirectory = '.frade-recovered/' + randomUUID(),
      evidencePath = await contained(root, evidenceDirectory)
    await mkdir(evidencePath, { recursive: true })
    await writeFile(join(evidencePath, 'source'), state.sourceText, { flag: 'wx' })
    await writeFile(join(evidencePath, 'journal'), state.journalText, { flag: 'wx' })
    if (stagedText !== undefined)
      await writeFile(join(evidencePath, 'staged'), stagedText, { flag: 'wx' })
    if (await exists(state.lockPath))
      await writeFile(join(evidencePath, 'writer-lock'), await boundedText(state.lockPath, 65536), {
        flag: 'wx',
      })
    const check = await recoveryState(root)
    if (
      check.preview.journalHash !== state.preview.journalHash ||
      check.sourceText !== state.sourceText ||
      check.preview.writerActive
    )
      fail('REVISION_CONFLICT')
    if (options.strategy === 'finish-staged' && state.preview.phase !== 'COMMITTED')
      await rename(state.stagePath, state.sourcePath)
    // Move recovery markers into preserved evidence only after a valid source is confirmed.
    await load(root, { allowRecovery: true })
    await rename(
      await contained(root, '.frade-recovery.json'),
      join(evidencePath, 'resolved-journal'),
    )
    if (await exists(state.lockPath))
      await rename(state.lockPath, join(evidencePath, 'resolved-lock'))
    if (await exists(state.stagePath))
      await rename(state.stagePath, join(evidencePath, 'resolved-stage'))
    return success({ evidenceDirectory, status: 'RECOVERED' })
  } catch (error) {
    return failure(error instanceof NativeFailure ? error.code : 'RECOVERY_REQUIRED')
  } finally {
    if (recoveryLock) {
      await recoveryLock.close()
      await unlink(recoveryLockPath!).catch(() => {})
    }
  }
}
/** Creates only new files with exclusive flags; never overwrites an existing repository. */
export async function createNativeRepository(
  root: string,
  options: {
    repositoryId: string
    displayName: string
    format?: string
    accessMode?: 'read-only' | 'read-write'
    model?: ModelSource
  },
): Promise<void> {
  await mkdir(root, { recursive: true })
  const base = await realpath(root),
    format = options.format ?? 'yaml'
  if (format !== 'yaml' && format !== 'json') throw Error('Unsupported format')
  const model = options.model ?? sampleMetamodel()
  const profile: RepositoryProfile = {
    schemaVersion: 1,
    repositoryId: options.repositoryId,
    displayName: options.displayName,
    adapterKind: 'native',
    connection: { source: 'local' },
    metamodel: { path: 'metamodel.json', version: model.definition.version },
    mapping: { sourceFile: 'repository.' + format, format },
    policyRef: 'default',
    accessMode: options.accessMode ?? 'read-write',
    indexing: { enabled: false },
    versioning: { provider: 'none' },
  }
  unwrap(decodeProfile(profile))
  const paths = await Promise.all(
    ['profile.json', 'metamodel.json', profile.mapping.sourceFile].map((name) =>
      contained(base, name),
    ),
  )
  if ((await Promise.all(paths.map(exists))).some(Boolean)) throw Error('Repository already exists')
  const data = { formatVersion: 1, repositoryId: options.repositoryId, objects: [], relations: [] }
  await writeFile(paths[1], JSON.stringify(model, null, 2) + '\n', { flag: 'wx' })
  await writeFile(
    paths[2],
    format === 'yaml' ? stringify(data) : JSON.stringify(data, null, 2) + '\n',
    { flag: 'wx' },
  )
  await writeFile(paths[0], JSON.stringify(profile, null, 2) + '\n', { flag: 'wx' })
}
