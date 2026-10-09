import { mkdtemp, mkdir, readdir, realpath, rm, open, rename, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, relative, sep } from 'node:path'
import { watch, type FSWatcher } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { compileModel, type ModelSource } from '@frade/metamodel-compiler'
import { objectKey, validateAttributes } from '@frade/metamodel-domain'
import { PagedCatalog, pageBucket } from '@frade/local-index'
import {
  copyJson,
  fields,
  nonblank,
  canonicalJson,
  decodeSnapshot,
  decodeObject,
  decodeRelation,
  entityKey,
  isReference,
  LIMITS,
  validateStreaming,
  decodeRepositoryPolicy,
  applyAttributePolicies,
  type RepositoryPolicy,
  failure,
  success,
  type Result,
  type Entity,
  type EntityKind,
  type ObjectRef,
  type RelationRef,
  type Revision,
  type RepositorySnapshot,
  type Query,
  type JsonValue,
  type ErrorCode,
} from '@frade/repository-domain'
import {
  decodeProfile,
  type RepositoryAdapter,
  type RepositoryAdapterSession,
  type RepositoryProfile,
  type RepositoryModel,
  type RepositoryCapabilities,
  type CancellationToken,
  type ChangeSet,
  type CommitRequest,
  type ChangeResult,
  type EntityChange,
  type RepositoryWriter,
  type PagedValidationPort,
  type OperationOutcome,
  type RepositoryEvent,
} from '@frade/repository-ports'
import { contained, boundedText, NativeAdapter } from './native'
import { sampleMetamodel } from './sample'
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const MAX_PAGE = 16 * 1024 * 1024,
  MAX_RECORDS = 8192
const activePagedWriters = new Set<string>()
class PagedFailure extends Error {
  constructor(readonly code: ErrorCode) {
    super(code)
  }
}
function fail(code: ErrorCode): never {
  throw new PagedFailure(code)
}
function parseJson(text: string, code: ErrorCode): unknown {
  try {
    return JSON.parse(text)
  } catch {
    fail(code)
  }
}
const unwrap = <T>(result: Result<T>): T => {
  if (!result.ok) fail(result.error.code)
  return (result as { ok: true; value: T }).value
}
const resultError = (error: unknown) =>
  failure(
    error instanceof PagedFailure
      ? error.code
      : typeof error === 'object' &&
          error &&
          'code' in error &&
          ['PROFILE_INVALID', 'ACCESS_DENIED', 'RESOURCE_LIMIT', 'REVISION_CONFLICT'].includes(
            String(error.code),
          )
        ? (error.code as ErrorCode)
        : 'REPOSITORY_UNAVAILABLE',
  )
interface PageEntry {
  bucket: number
  hash: string
  count: number
  bytes: number
}
interface Manifest {
  formatVersion: 2
  repositoryId: string
  generation: string
  binding: RepositorySnapshot['binding']
  pages: PageEntry[]
}
interface Config {
  root: string
  profile: RepositoryProfile
  profileText: string
  modelText: string
  policyText: string
  model: RepositoryModel
  manifest: Manifest
  manifestText: string
  revision: Revision
}
const same = (a: unknown, b: unknown) =>
  canonicalJson(a as JsonValue) === canonicalJson(b as JsonValue)
async function compile(source: unknown): Promise<RepositoryModel> {
  const result = await compileModel(source, {
    load: async () => {
      throw Error('Imports need an explicit loader')
    },
    sha256: async (text) => hash(text),
  })
  if (!result.ok) fail('METAMODEL_INVALID')
  return {
    modelId: result.value.id,
    modelVersion: result.value.version,
    fingerprint: result.value.fingerprint,
    analysis: result.value.analysis,
  }
}
async function durable(path: string, text: string) {
  const file = await open(path, 'wx')
  try {
    await file.writeFile(text)
    await file.sync()
  } finally {
    await file.close()
  }
}
function decodeManifest(input: unknown, repositoryId: string): Manifest {
  const v = unwrap(copyJson(input))
  if (
    !fields(v, ['formatVersion', 'repositoryId', 'generation', 'binding', 'pages']) ||
    v.formatVersion !== 2 ||
    v.repositoryId !== repositoryId ||
    !nonblank(v.generation) ||
    !Array.isArray(v.pages) ||
    v.pages.length > 4096
  )
    fail('SCHEMA_INCOMPATIBLE')
  const binding = decodeSnapshot({
    repositoryId,
    revision: 'validation',
    complete: true,
    binding: v.binding,
    objects: [],
    relations: [],
  })
  if (!binding.ok) fail('SCHEMA_INCOMPATIBLE')
  const buckets = new Set<number>()
  let count = 0
  for (const p of v.pages) {
    if (
      !fields(p, ['bucket', 'hash', 'count', 'bytes']) ||
      !Number.isInteger(p.bucket) ||
      (p.bucket as number) < 0 ||
      (p.bucket as number) >= 4096 ||
      typeof p.hash !== 'string' ||
      !/^[a-f0-9]{64}$/.test(p.hash) ||
      !Number.isInteger(p.count) ||
      (p.count as number) < 1 ||
      (p.count as number) > MAX_RECORDS ||
      !Number.isInteger(p.bytes) ||
      (p.bytes as number) < 1 ||
      (p.bytes as number) > MAX_PAGE ||
      buckets.has(p.bucket as number)
    )
      fail('SCHEMA_INCOMPATIBLE')
    buckets.add(p.bucket as number)
    count += p.count as number
  }
  if (count > 5000000) fail('RESOURCE_LIMIT')
  return v as unknown as Manifest
}
async function config(root: string, allowRecovery = false): Promise<Config> {
  root = await realpath(root)
  await contained(root, 'pages')
  const names = await readdir(root)
  if (
    !allowRecovery &&
    (names.includes('.frade-v2-write.lock') ||
      names.includes('.frade-v2-recovery.json') ||
      names.includes('.frade-v2-recover.lock'))
  )
    fail('RECOVERY_REQUIRED')
  const profileText = await boundedText(await contained(root, 'profile.json'), 100000),
    profile = unwrap(decodeProfile(parseJson(profileText, 'PROFILE_INVALID')))
  if (profile.adapterKind !== 'native-v2' || profile.mapping.format !== 'json')
    fail('UNSUPPORTED_CAPABILITY')
  const modelText = await boundedText(await contained(root, profile.metamodel.path), 1000000),
    model = await compile(parseJson(modelText, 'METAMODEL_INVALID'))
  const policyText = profile.policyPath
    ? await boundedText(await contained(root, profile.policyPath), 1000000)
    : ''
  if (policyText)
    (model as { policy?: RepositoryPolicy }).policy = unwrap(
      decodeRepositoryPolicy(parseJson(policyText, 'METAMODEL_INVALID'), model.analysis()),
    )
  if (model.modelVersion !== profile.metamodel.version) fail('SCHEMA_INCOMPATIBLE')
  const manifestText = await boundedText(
      await contained(root, profile.mapping.sourceFile),
      1000000,
    ),
    manifest = decodeManifest(parseJson(manifestText, 'SCHEMA_INCOMPATIBLE'), profile.repositoryId)
  if (
    !same(manifest.binding, {
      modelId: model.modelId,
      modelVersion: model.modelVersion,
      fingerprint: model.fingerprint,
    })
  )
    fail('BINDING_MISMATCH')
  return {
    root,
    profile,
    profileText,
    modelText,
    policyText,
    model,
    manifest,
    manifestText,
    revision: hash(manifestText + profileText + modelText + policyText) as Revision,
  }
}
async function pages(
  root: string,
  catalog: PagedCatalog,
  selected = catalog.buckets(),
): Promise<PageEntry[]> {
  await mkdir(await contained(root, 'pages'), { recursive: true })
  const result: PageEntry[] = []
  for (const bucket of selected) {
    const rows: string[] = []
    let bytes = 0
    for (const { kind, entity } of catalog.bucket(bucket)) {
      const line = JSON.stringify({ kind, entity }) + '\n'
      bytes += Buffer.byteLength(line)
      if (bytes > MAX_PAGE || rows.length >= MAX_RECORDS) fail('RESOURCE_LIMIT')
      rows.push(line)
    }
    if (!rows.length) continue
    const text = rows.join(''),
      digest = hash(text),
      path = await contained(root, 'pages/' + digest + '.jsonl')
    try {
      await durable(path, text)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      if ((await boundedText(path)) !== text) fail('REVISION_CONFLICT')
    }
    result.push({ bucket, hash: digest, count: rows.length, bytes })
  }
  return result
}
export interface PagedCreateOptions {
  repositoryId: string
  displayName: string
  model?: ModelSource
  policy?: RepositoryPolicy
  objects: AsyncIterable<Entity>
  relations: AsyncIterable<Entity>
}
/** Explicit new-destination semantic import; never changes or auto-migrates v1 sources. */
export async function createPagedNativeRepository(
  root: string,
  options: PagedCreateOptions,
  token?: CancellationToken,
): Promise<Result<true>> {
  let directory: string | undefined, catalog: PagedCatalog | undefined
  try {
    await mkdir(root, { recursive: true })
    root = await realpath(root)
    if ((await readdir(root)).length) fail('WRITE_FAILED')
    if (!nonblank(options.repositoryId) || !nonblank(options.displayName)) fail('PROFILE_INVALID')
    const source = options.model ?? sampleMetamodel(),
      model = await compile(source)
    if (options.policy)
      (model as { policy?: RepositoryPolicy }).policy = unwrap(
        decodeRepositoryPolicy(options.policy, model.analysis()),
      )
    directory = await mkdtemp(join(tmpdir(), 'frade-v2-build-'))
    catalog = new PagedCatalog(join(directory, 'catalog.sqlite'))
    catalog.db.exec('BEGIN')
    catalog.beginImport()
    let n = 0
    for (const kind of ['object', 'relation'] as const)
      for await (const entity of kind === 'object' ? options.objects : options.relations) {
        if (token?.isCancellationRequested) fail('CANCELLED')
        if (entity.ref.repositoryId !== options.repositoryId) fail('REPOSITORY_MISMATCH')
        unwrap(catalog.put(kind, entity))
        if (++n > 5000000) fail('RESOURCE_LIMIT')
      }
    catalog.finishImport()
    const valid = await validateStreaming(
      model.analysis(),
      catalog,
      () => !!token?.isCancellationRequested,
      model.policy,
    )
    if (!valid.ok) return valid
    catalog.db.exec('COMMIT')
    const manifest: Manifest = {
      formatVersion: 2,
      repositoryId: options.repositoryId,
      generation: randomUUID(),
      binding: {
        modelId: model.modelId,
        modelVersion: model.modelVersion,
        fingerprint: model.fingerprint,
      },
      pages: await pages(root, catalog),
    }
    const profile: RepositoryProfile = {
      schemaVersion: 1,
      repositoryId: options.repositoryId,
      displayName: options.displayName,
      adapterKind: 'native-v2',
      connection: { source: 'local' },
      metamodel: { path: 'metamodel.json', version: model.modelVersion },
      mapping: { sourceFile: 'manifest.json', format: 'json' },
      policyRef: 'default',
      ...(model.policy ? { policyPath: 'policy.json' } : {}),
      accessMode: 'read-write',
      indexing: { enabled: true },
      versioning: { provider: 'none' },
    }
    const sourceText = JSON.stringify(source),
      profileText = JSON.stringify(profile),
      manifestText = JSON.stringify(manifest),
      policyText = model.policy ? JSON.stringify(model.policy) : ''
    if (
      Buffer.byteLength(sourceText) > 1000000 ||
      Buffer.byteLength(profileText) > 100000 ||
      Buffer.byteLength(manifestText) > 1000000 ||
      Buffer.byteLength(policyText) > 1000000
    )
      fail('RESOURCE_LIMIT')
    await durable(await contained(root, 'metamodel.json'), sourceText)
    if (model.policy) await durable(await contained(root, 'policy.json'), policyText)
    await durable(await contained(root, 'profile.json'), profileText)
    await durable(await contained(root, 'manifest.json'), manifestText)
    return success(true)
  } catch (error) {
    return resultError(error)
  } finally {
    catalog?.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  }
}
async function loadCatalog(c: Config, catalog: PagedCatalog, token?: CancellationToken) {
  catalog.db.exec('BEGIN')
  catalog.beginImport()
  let total = 0
  for (const page of c.manifest.pages) {
    if (token?.isCancellationRequested) fail('CANCELLED')
    const text = await boundedText(
      await contained(c.root, 'pages/' + page.hash + '.jsonl'),
      MAX_PAGE,
    )
    if (hash(text) !== page.hash || Buffer.byteLength(text) !== page.bytes || !text.endsWith('\n'))
      fail('VALIDATION_FAILED')
    const lines = text.slice(0, -1).split('\n')
    if (lines.length !== page.count) fail('VALIDATION_FAILED')
    for (const line of lines) {
      const row: unknown = parseJson(line, 'VALIDATION_FAILED')
      if (!fields(row, ['kind', 'entity']) || !['object', 'relation'].includes(String(row.kind)))
        fail('VALIDATION_FAILED')
      const entity = unwrap(catalog.put(row.kind as EntityKind, row.entity))
      if (
        entity.ref.repositoryId !== c.profile.repositoryId ||
        pageBucket(row.kind as EntityKind, entity.ref) !== page.bucket
      )
        fail('VALIDATION_FAILED')
      total++
    }
  }
  catalog.finishImport()
  const validationStarted = performance.now()
  unwrap(
    await validateStreaming(
      c.model.analysis(),
      catalog,
      () => !!token?.isCancellationRequested,
      c.model.policy,
    ),
  )
  catalog.measurements.completeValidationMs = performance.now() - validationStarted
  catalog.db.exec('COMMIT')
  return total
}
const readonlyCapabilities: RepositoryCapabilities = {
  canRead: true,
  canWrite: false,
  supportsBatch: false,
  supportsAtomicBatch: false,
  supportsWatch: false,
  supportsHistory: false,
  supportsTransactions: false,
  supportsCrossRepositoryReferences: false,
  supportsServerSideQueries: true,
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
    'references',
    'relations',
    'inheritance',
    'cardinality',
  ],
  guardedSnapshot: false,
  reconciliation: 'none',
  preservation: 'none',
  writerCoordination: 'none',
}
class PagedSession implements RepositoryAdapterSession {
  readonly capabilities: RepositoryCapabilities
  readonly writer?: RepositoryWriter
  readonly pagedValidation?: PagedValidationPort
  private closed = false
  private recovery = false
  private watchers: FSWatcher[] = []
  private debounce?: ReturnType<typeof setTimeout>
  private pageDirty = false
  private listeners = new Set<(event: RepositoryEvent) => void>()
  private sequence = 0
  private deltaIndexPatchMs = 0
  private deltaValidationMs = 0
  private tail: Promise<unknown> = Promise.resolve()
  private operations = new Map<string, { signature: string; result: Result<ChangeResult> }>()
  constructor(
    private data: Config,
    private catalog: PagedCatalog,
    private directory: string,
    private options: PagedAdapterOptions,
  ) {
    const writable = data.profile.accessMode === 'read-write'
    this.capabilities = Object.freeze({
      ...readonlyCapabilities,
      canWrite: writable,
      supportsBatch: writable,
      supportsAtomicBatch: writable,
      guardedSnapshot: writable,
      reconciliation: writable ? 'session' : 'none',
      writerCoordination: writable ? 'cooperating-processes' : 'none',
      supportsWatch: true,
      supportedQueryOperators: Object.freeze([...readonlyCapabilities.supportedQueryOperators]),
      supportedMetamodelFeatures: Object.freeze([
        ...readonlyCapabilities.supportedMetamodelFeatures,
      ]),
    })
    if (writable) {
      this.writer = {
        commit: (request, token) =>
          this.serial(() => this.commit(request, token)).then((result) => {
            const copy = copyJson(result)
            return copy.ok
              ? (copy.value as unknown as Result<ChangeResult>)
              : failure('OUTCOME_UNKNOWN', [], request.operationId)
          }),
        lookup: async (id) =>
          success(
            this.operations.get(id)?.result.ok
              ? {
                  status: 'committed',
                  result: unwrap(
                    copyJson(
                      (this.operations.get(id)!.result as { ok: true; value: ChangeResult }).value,
                    ),
                  ) as unknown as ChangeResult,
                }
              : ({ status: 'unknown' } as OperationOutcome),
          ),
      }
      this.pagedValidation = {
        scope: (changes, token) => this.serial(() => this.scope(changes, token)),
        validate: (request, token) => this.serial(() => this.validate(request, token)),
      }
    }
    const schedule = (page?: string) => {
      if (this.closed) return
      if (page) {
        if (!this.data.manifest.pages.some((p) => page === p.hash + '.jsonl')) return
        this.pageDirty = true
      }
      if (this.debounce) clearTimeout(this.debounce)
      this.debounce = setTimeout(() => {
        void this.reload()
      }, 60)
    }
    try {
      this.watchers.push(watch(data.root, () => schedule()))
      this.watchers.push(
        watch(join(data.root, 'pages'), (_event, file) => schedule(file?.toString())),
      )
      for (const watcher of this.watchers)
        watcher.on('error', () => {
          this.recovery = true
          this.emit('repository.reloaded', undefined, 'DEGRADED')
        })
    } catch (error) {
      for (const watcher of this.watchers) watcher.close()
      throw error
    }
  }
  subscribe(listener: (event: RepositoryEvent) => void) {
    if (this.closed) return () => {}
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private emit(
    type: RepositoryEvent['type'],
    ref?: ObjectRef | RelationRef,
    state?: RepositoryEvent['state'],
  ) {
    if (this.closed) return
    const event: RepositoryEvent = {
      eventId: randomUUID(),
      repositoryId: this.profile.repositoryId,
      sequence: ++this.sequence,
      type,
      revision: this.data.revision,
      ...(ref ? { ref } : {}),
      ...(state ? { state } : {}),
    }
    for (const listener of this.listeners)
      try {
        listener(unwrap(copyJson(event)) as unknown as RepositoryEvent)
      } catch {
        /* Best effort; committed source is unaffected. */
      }
  }
  reload() {
    return this.serial(async () => {
      if (this.closed) return failure('SESSION_CLOSED')
      let directory: string | undefined, catalog: PagedCatalog | undefined
      try {
        const data = await config(this.data.root),
          changed = data.revision !== this.data.revision
        if (!changed && !this.pageDirty && !this.recovery) return success(false)
        directory = await mkdtemp(join(tmpdir(), 'frade-v2-index-'))
        catalog = new PagedCatalog(join(directory, 'catalog.sqlite'), this.catalog.scope)
        await loadCatalog(data, catalog)
        if ((await config(data.root)).revision !== data.revision) fail('REVISION_CONFLICT')
        // Changing access mode or adapter configuration requires a fresh session; never elevate it in place.
        if (!same(data.profile, this.data.profile)) fail('SCHEMA_INCOMPATIBLE')
        const previous = this.data.model.fingerprint,
          oldDirectory = this.directory
        this.catalog.close()
        this.catalog = catalog
        catalog = undefined
        this.directory = directory
        directory = undefined
        this.data = data
        this.recovery = false
        this.pageDirty = false
        await rm(oldDirectory, { recursive: true, force: true })
        this.emit(
          previous === data.model.fingerprint ? 'repository.reloaded' : 'metamodel.changed',
          undefined,
          this.capabilities.canWrite ? 'READY' : 'READ_ONLY',
        )
        return success(true)
      } catch (error) {
        this.recovery = true
        this.emit('repository.reloaded', undefined, 'DEGRADED')
        return resultError(error)
      } finally {
        catalog?.close()
        if (directory) await rm(directory, { recursive: true, force: true })
      }
    })
  }
  private serial<T>(work: () => Promise<Result<T>>): Promise<Result<T>> {
    const next = this.tail.then(work).catch((error) => resultError(error))
    this.tail = next
    return next
  }
  get profile() {
    return unwrap(copyJson(this.data.profile)) as unknown as RepositoryProfile
  }
  get model() {
    const model = this.data.model
    return {
      modelId: model.modelId,
      modelVersion: model.modelVersion,
      fingerprint: model.fingerprint,
      analysis: () => model.analysis(),
      ...(model.policy
        ? { policy: unwrap(copyJson(model.policy)) as unknown as RepositoryPolicy }
        : {}),
    }
  }
  get metrics() {
    return {
      lastQueryScanned: this.catalog.scanned,
      entities: this.catalog.count(),
      ...this.catalog.measurements,
      deltaIndexPatchMs: this.deltaIndexPatchMs,
      deltaValidationMs: this.deltaValidationMs,
    }
  }
  private async guard(token?: CancellationToken) {
    if (this.closed) fail('SESSION_CLOSED')
    if (this.recovery) fail('RECOVERY_REQUIRED')
    if (token?.isCancellationRequested) fail('CANCELLED')
    const manifest = await boundedText(
        await contained(this.data.root, this.profile.mapping.sourceFile),
        1000000,
      ),
      profile = await boundedText(await contained(this.data.root, 'profile.json'), 100000),
      model = await boundedText(
        await contained(this.data.root, this.profile.metamodel.path),
        1000000,
      )
    const policy = this.profile.policyPath
      ? await boundedText(await contained(this.data.root, this.profile.policyPath), 1000000)
      : ''
    if (hash(manifest + profile + model + policy) !== this.data.revision) fail('REVISION_CONFLICT')
  }
  read(
    kind: EntityKind,
    ref: ObjectRef | RelationRef,
    token?: CancellationToken,
  ): Promise<Result<Entity>> {
    return this.serial(async () => {
      await this.guard(token)
      return this.catalog.read(kind, ref)
    })
  }
  query(kind: EntityKind, query: Query, token?: CancellationToken) {
    return this.serial(async () => {
      await this.guard(token)
      const result = await this.catalog.query(
        kind,
        query,
        this.data.revision,
        () => !!token?.isCancellationRequested || this.closed,
      )
      await this.guard(token)
      return result
    })
  }
  snapshot(token?: CancellationToken): Promise<Result<RepositorySnapshot>> {
    return this.serial(async () => {
      await this.guard(token)
      if (this.catalog.count() > 1000) return failure('RESOURCE_LIMIT')
      return decodeSnapshot({
        repositoryId: this.profile.repositoryId,
        revision: this.data.revision,
        complete: true,
        binding: this.data.manifest.binding,
        objects: [...this.catalog.entities('object')],
        relations: [...this.catalog.entities('relation')],
      })
    })
  }
  private async scope(changeSet: ChangeSet, token?: CancellationToken) {
    await this.guard(token)
    const objects = new Map<string, Entity>(),
      relations = new Map<string, Entity>(),
      revision = this.data.revision
    for (const command of changeSet.commands) {
      const kind = command.op.endsWith('Object') ? 'object' : 'relation',
        ref =
          'object' in command
            ? command.object.ref
            : 'relation' in command
              ? command.relation.ref
              : command.ref,
        read = this.catalog.read(kind, ref)
      if (read.ok) (kind === 'object' ? objects : relations).set(entityKey(kind, ref), read.value)
      if (command.op === 'deleteObject' && command.deletionPolicy === 'CASCADE') {
        for (const row of this.catalog.db
          .prepare(
            "SELECT body FROM entities WHERE kind='relation' AND (source=? OR target=?) LIMIT 1001",
          )
          .iterate(objectKey(command.ref), objectKey(command.ref))) {
          const entity = JSON.parse(String(row.body)) as Entity
          relations.set(entityKey('relation', entity.ref), entity)
          if (relations.size > LIMITS.batch) return failure('RESOURCE_LIMIT')
        }
      }
    }
    const snapshot = decodeSnapshot({
      repositoryId: this.profile.repositoryId,
      revision,
      complete: false,
      binding: this.data.manifest.binding,
      objects: [...objects.values()],
      relations: [...relations.values()],
    })
    if (!snapshot.ok) return snapshot
    return success({
      snapshot: snapshot.value,
      targets: {
        get: (key: string) => {
          if (this.closed || revision !== this.data.revision) fail('REVISION_CONFLICT')
          return this.catalog.targets.get(key)
        },
      },
    })
  }
  /** Apply to a SQLite savepoint only. The manifest remains the sole authoritative commit. */
  private async candidate(
    request: CommitRequest,
    token?: CancellationToken,
  ): Promise<Result<true>> {
    if (request.expectedRevision !== this.data.revision) return failure('REVISION_CONFLICT')
    const safe = copyJson(request)
    if (!safe.ok) return safe
    if (
      !fields(safe.value, ['operationId', 'expectedRevision', 'candidate', 'changes']) ||
      !nonblank(safe.value.operationId) ||
      !Array.isArray(safe.value.changes) ||
      !safe.value.changes.length ||
      safe.value.changes.length > LIMITS.batch
    )
      return failure('INVALID_INPUT')
    const snapshot = decodeSnapshot(request.candidate)
    if (!snapshot.ok) return snapshot
    if (
      snapshot.value.complete ||
      snapshot.value.repositoryId !== this.profile.repositoryId ||
      snapshot.value.revision !== this.data.revision ||
      !same(snapshot.value.binding, this.data.manifest.binding)
    )
      return failure('BINDING_MISMATCH')
    const seen = new Set<string>(),
      previous = new Map<string, Entity>()
    let simple = true
    for (const change of request.changes) {
      if (
        !fields(change, ['kind', 'action', 'ref'], ['entity']) ||
        !['object', 'relation'].includes(change.kind) ||
        !['created', 'updated', 'deleted'].includes(change.action) ||
        !isReference(change.ref, change.kind) ||
        change.ref.repositoryId !== this.profile.repositoryId
      )
        return failure('INVALID_INPUT')
      const key = entityKey(change.kind, change.ref),
        old = this.catalog.read(change.kind, change.ref)
      if (seen.has(key)) return failure('INVALID_INPUT')
      seen.add(key)
      if (change.action === 'created' ? old.ok : !old.ok) return failure('REVISION_CONFLICT')
      if (old.ok) previous.set(key, old.value)
      const rules =
        change.kind === 'object' ? this.model.policy?.objectTypes : this.model.policy?.relationTypes
      if (change.action === 'deleted' && old.ok && rules?.[old.value.typeId]?.deletion === 'deny')
        return failure('VALIDATION_FAILED')
      if (
        change.action === 'created' &&
        change.entity &&
        rules?.[change.entity.typeId]?.creation === 'deny'
      )
        return failure('VALIDATION_FAILED')
      const candidate = (
        change.kind === 'object' ? snapshot.value.objects : snapshot.value.relations
      ).find((e) => entityKey(change.kind, e.ref) === key)
      if (change.action === 'deleted') {
        if (change.entity || candidate) return failure('ADAPTER_CONTRACT')
        simple = false
        this.catalog.remove(change.kind, change.ref)
        continue
      }
      const decoded =
        change.kind === 'object' ? decodeObject(change.entity) : decodeRelation(change.entity)
      if (
        !decoded.ok ||
        entityKey(change.kind, decoded.value.ref) !== key ||
        !same(candidate, change.entity)
      )
        return failure('ADAPTER_CONTRACT')
      if (old.ok && old.value.revision !== decoded.value.revision)
        return failure('REVISION_CONFLICT')
      if (
        change.kind !== 'object' ||
        change.action !== 'updated' ||
        !old.ok ||
        old.value.typeId !== decoded.value.typeId
      )
        simple = false
      this.catalog.remove(change.kind, change.ref)
      unwrap(this.catalog.put(change.kind, decoded.value))
    }
    const analysis = this.model.analysis()
    for (const change of request.changes) {
      if (!change.entity) continue
      const entity = change.entity,
        type = (change.kind === 'object' ? analysis.objectTypes : analysis.relationTypes).get(
          entity.typeId,
        )
      if (!type || ('abstract' in type && type.abstract)) return failure('VALIDATION_FAILED')
      const rule = (
          change.kind === 'object'
            ? this.model.policy?.objectTypes
            : this.model.policy?.relationTypes
        )?.[entity.typeId],
        old = previous.get(entityKey(change.kind, change.ref)),
        policyResult = applyAttributePolicies(entity, old, rule)
      if (!policyResult.ok) return policyResult
      if (!same(policyResult.value.attributes, entity.attributes))
        return failure('VALIDATION_FAILED')
      const attrs = validateAttributes(type.attributes, entity.attributes, {
        analysis,
        targets: this.catalog.targets,
      })
      if (!attrs.ok || !same(attrs.value, entity.attributes)) return failure('VALIDATION_FAILED')
      if (change.kind === 'object' && 'lifecycle' in type && type.lifecycle) {
        const old = previous.get(entityKey(change.kind, change.ref)),
          next = entity.attributes[rule?.lifecycleAttribute ?? 'status'],
          before = old?.attributes[rule?.lifecycleAttribute ?? 'status'] ?? type.lifecycle.initial
        if (
          next !== undefined &&
          (typeof next !== 'string' ||
            !type.lifecycle.states.includes(next) ||
            (!old && next !== type.lifecycle.initial) ||
            (old &&
              typeof before === 'string' &&
              type.lifecycle.states.includes(before) &&
              before !== next &&
              !type.lifecycle.transitions.some((t) => t.from === before && t.to === next)))
        )
          return failure('VALIDATION_FAILED')
      }
    }
    // Only same-type object updates preserve every graph/cardinality fact from the verified base.
    return simple
      ? success(true)
      : validateStreaming(
          analysis,
          this.catalog,
          () => !!token?.isCancellationRequested,
          this.model.policy,
        )
  }
  private async validate(request: CommitRequest, token?: CancellationToken): Promise<Result<true>> {
    await this.guard(token)
    this.catalog.db.exec('SAVEPOINT proposed')
    try {
      const valid = await this.candidate(request, token)
      await this.guard(token)
      return valid
    } finally {
      this.catalog.db.exec('ROLLBACK TO proposed; RELEASE proposed')
    }
  }
  private async commit(
    request: CommitRequest,
    token?: CancellationToken,
  ): Promise<Result<ChangeResult>> {
    if (!nonblank(request.operationId)) return failure('INVALID_INPUT')
    if (Buffer.byteLength(JSON.stringify(request.operationId)) > 4096)
      return failure('RESOURCE_LIMIT')
    await this.guard(token)
    const signature = canonicalJson(unwrap(copyJson(request))),
      old = this.operations.get(request.operationId)
    if (old) return old.signature === signature ? old.result : failure('OPERATION_ID_CONFLICT')
    if (this.operations.size >= LIMITS.operations) return failure('RESOURCE_LIMIT')
    const lockPath = await contained(this.data.root, '.frade-v2-write.lock'),
      journalPath = await contained(this.data.root, '.frade-v2-recovery.json')
    let lock: Awaited<ReturnType<typeof open>> | undefined,
      savepoint = false,
      published = false,
      journal = false
    try {
      try {
        lock = await open(lockPath, 'wx')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') return failure('RECOVERY_REQUIRED')
        throw error
      }
      await lock.writeFile(JSON.stringify({ pid: process.pid, operationId: request.operationId }))
      await lock.sync()
      activePagedWriters.add(this.data.root)
      if ((await readdir(this.data.root)).includes('.frade-v2-recovery.json'))
        return failure('RECOVERY_REQUIRED')
      await this.guard(token)
      this.catalog.db.exec('SAVEPOINT proposed')
      savepoint = true
      const validationStarted = performance.now()
      const valid = await this.candidate(request, token)
      this.deltaValidationMs = performance.now() - validationStarted
      if (!valid.ok) return valid
      const changes: EntityChange[] = request.changes.map((c) =>
        c.entity ? { ...c, entity: { ...c.entity, revision: randomUUID() as Revision } } : c,
      )
      const indexStarted = performance.now()
      for (const c of changes)
        if (c.entity) {
          this.catalog.remove(c.kind, c.ref)
          unwrap(this.catalog.put(c.kind, c.entity))
        }
      this.deltaIndexPatchMs = performance.now() - indexStarted
      const touched = [...new Set(changes.map((c) => pageBucket(c.kind, c.ref)))].sort(
          (a, b) => a - b,
        ),
        replacement = await pages(this.data.root, this.catalog, touched)
      const manifest: Manifest = {
          ...this.data.manifest,
          generation: randomUUID(),
          pages: [
            ...this.data.manifest.pages.filter((p) => !touched.includes(p.bucket)),
            ...replacement,
          ].sort((a, b) => a.bucket - b.bucket),
        },
        manifestText = JSON.stringify(manifest),
        stage = '.frade-v2-' + randomUUID() + '.json'
      await durable(await contained(this.data.root, stage), manifestText)
      await durable(
        journalPath,
        JSON.stringify({
          formatVersion: 2,
          operationId: request.operationId,
          expectedRevision: this.data.revision,
          sourceHash: hash(this.data.manifestText),
          profileHash: hash(this.data.profileText),
          modelHash: hash(this.data.modelText + this.data.policyText),
          stage,
          stagedHash: hash(manifestText),
        }),
      )
      journal = true
      await this.options.writeBarrier?.('staged')
      await this.guard(token)
      await rename(
        await contained(this.data.root, stage),
        await contained(this.data.root, this.profile.mapping.sourceFile),
      )
      published = true
      this.data = {
        ...this.data,
        manifest,
        manifestText,
        revision: hash(
          manifestText + this.data.profileText + this.data.modelText + this.data.policyText,
        ) as Revision,
      }
      const result = success({
        operationId: request.operationId,
        revision: this.data.revision,
        changes,
        warnings: [] as string[],
      })
      this.operations.set(request.operationId, { signature, result })
      this.catalog.db.exec('RELEASE proposed')
      savepoint = false
      for (const change of changes)
        this.emit((change.kind + '.' + change.action) as RepositoryEvent['type'], change.ref)
      await this.options.writeBarrier?.('replaced')
      await unlink(journalPath)
      journal = false
      return result
    } catch (error) {
      if (published) {
        const result = this.operations.get(request.operationId)?.result
        if (result?.ok) {
          const warning = success({
            ...result.value,
            warnings: [...result.value.warnings, 'RECOVERY_REQUIRED'],
          })
          this.operations.set(request.operationId, { signature, result: warning })
          return warning
        }
        return failure('RECOVERY_REQUIRED')
      }
      return journal ? failure('RECOVERY_REQUIRED') : resultError(error)
    } finally {
      this.recovery = journal
      activePagedWriters.delete(this.data.root)
      if (savepoint) this.catalog.db.exec('ROLLBACK TO proposed; RELEASE proposed')
      await lock?.close()
      if (lock && !journal) await unlink(lockPath).catch(() => {})
    }
  }
  async close() {
    if (this.closed) return
    this.closed = true
    if (this.debounce) clearTimeout(this.debounce)
    for (const watcher of this.watchers) watcher.close()
    this.listeners.clear()
    await this.tail
    this.catalog.close()
    await rm(this.directory, { recursive: true, force: true })
  }
}
export interface PagedAdapterOptions {
  /** Trusted host hook, never repository configuration. */ writeBarrier?: (
    phase: 'staged' | 'replaced',
  ) => Promise<void>
}
export class PagedNativeAdapter implements RepositoryAdapter {
  constructor(
    private readonly root: string,
    private readonly options: PagedAdapterOptions = {},
  ) {}
  async open(token?: CancellationToken): Promise<Result<RepositoryAdapterSession>> {
    let catalog: PagedCatalog | undefined, directory: string | undefined
    try {
      if (token?.isCancellationRequested) fail('CANCELLED')
      const data = await config(this.root)
      directory = await mkdtemp(join(tmpdir(), 'frade-v2-index-'))
      catalog = new PagedCatalog(join(directory, 'catalog.sqlite'))
      await loadCatalog(data, catalog, token)
      const current = await config(this.root)
      if (current.revision !== data.revision) fail('REVISION_CONFLICT')
      return success(new PagedSession(data, catalog, directory, this.options))
    } catch (error) {
      catalog?.close()
      if (directory) await rm(directory, { recursive: true, force: true })
      return resultError(error)
    }
  }
}
interface PagedJournal {
  formatVersion: 2
  operationId: string
  expectedRevision: string
  sourceHash: string
  profileHash: string
  modelHash: string
  stage: string
  stagedHash: string
}
async function recoveryData(root: string) {
  const data = await config(root, true)
  if (!(await readdir(data.root)).includes('.frade-v2-recovery.json')) {
    const lockText = await boundedText(await contained(data.root, '.frade-v2-write.lock'), 10000),
      lock: unknown = JSON.parse(lockText)
    if (
      !fields(lock, ['pid', 'operationId']) ||
      !Number.isSafeInteger(lock.pid) ||
      (lock.pid as number) < 1 ||
      !nonblank(lock.operationId)
    )
      fail('RECOVERY_REQUIRED')
    let writerActive = activePagedWriters.has(data.root)
    if (lock.pid !== process.pid)
      try {
        process.kill(lock.pid as number, 0)
        writerActive = true
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') writerActive = true
      }
    return {
      data,
      journal: null,
      journalText: '',
      lockText,
      writerActive,
      phase: 'LOCK_ONLY',
      journalHash: hash(
        lockText + data.manifestText + data.profileText + data.modelText + data.policyText,
      ),
    }
  }
  const journalText = await boundedText(
      await contained(data.root, '.frade-v2-recovery.json'),
      10000,
    ),
    value: unknown = JSON.parse(journalText)
  if (
    !fields(value, [
      'formatVersion',
      'operationId',
      'expectedRevision',
      'sourceHash',
      'profileHash',
      'modelHash',
      'stage',
      'stagedHash',
    ]) ||
    value.formatVersion !== 2 ||
    !nonblank(value.operationId) ||
    !nonblank(value.expectedRevision) ||
    !['sourceHash', 'profileHash', 'modelHash', 'stagedHash'].every(
      (key) => typeof value[key] === 'string' && /^[a-f0-9]{64}$/.test(value[key] as string),
    ) ||
    typeof value.stage !== 'string' ||
    !/^\.frade-v2-[a-f0-9-]+\.json$/.test(value.stage)
  )
    fail('RECOVERY_REQUIRED')
  const journal = value as unknown as PagedJournal,
    lockText = await boundedText(await contained(data.root, '.frade-v2-write.lock'), 10000),
    lock: unknown = JSON.parse(lockText)
  if (
    !fields(lock, ['pid', 'operationId']) ||
    !Number.isSafeInteger(lock.pid) ||
    (lock.pid as number) < 1 ||
    lock.operationId !== journal.operationId
  )
    fail('RECOVERY_REQUIRED')
  let writerActive = activePagedWriters.has(data.root)
  if (lock.pid !== process.pid)
    try {
      process.kill(lock.pid as number, 0)
      writerActive = true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') writerActive = true
    }
  const currentHash = hash(data.manifestText),
    phase =
      currentHash === journal.stagedHash
        ? 'COMMITTED'
        : currentHash === journal.sourceHash
          ? 'STAGED'
          : 'CONFLICTED'
  const journalHash = hash(
    journalText +
      lockText +
      data.manifestText +
      data.profileText +
      data.modelText +
      data.policyText,
  )
  return { data, journal, journalText, lockText, writerActive, phase, journalHash }
}
export async function inspectPagedNativeRecovery(
  root: string,
): Promise<Result<{ journalHash: string; phase: string; writerActive: boolean }>> {
  try {
    const { journalHash, phase, writerActive } = await recoveryData(root)
    return success({ journalHash, phase, writerActive })
  } catch (error) {
    return resultError(error)
  }
}
/** Explicit host-only recovery. Retains immutable pages and journal/lock evidence; never retries a command. */
export async function recoverPagedNativeRepository(
  root: string,
  request: { expectedJournalHash: string; strategy: 'keep-source' | 'finish-staged' },
): Promise<Result<true>> {
  let coordination: Awaited<ReturnType<typeof open>> | undefined,
    coordinationPath: string | undefined,
    directory: string | undefined,
    catalog: PagedCatalog | undefined
  try {
    root = await realpath(root)
    coordinationPath = await contained(root, '.frade-v2-recover.lock')
    try {
      coordination = await open(coordinationPath, 'wx')
    } catch {
      return failure('REVISION_CONFLICT')
    }
    const inspected = await recoveryData(root),
      { data, journal } = inspected
    if (
      inspected.writerActive ||
      inspected.journalHash !== request.expectedJournalHash ||
      inspected.phase === 'CONFLICTED' ||
      (journal &&
        (hash(data.profileText) !== journal.profileHash ||
          hash(data.modelText + data.policyText) !== journal.modelHash))
    )
      return failure('REVISION_CONFLICT')
    if (!['keep-source', 'finish-staged'].includes(request.strategy))
      return failure('INVALID_INPUT')
    if (!journal && request.strategy !== 'keep-source') return failure('UNSUPPORTED_CAPABILITY')
    let selected = data
    if (journal && inspected.phase === 'STAGED' && request.strategy === 'finish-staged') {
      const text = await boundedText(await contained(root, journal.stage), 1000000)
      if (hash(text) !== journal.stagedHash) return failure('REVISION_CONFLICT')
      selected = {
        ...data,
        manifest: decodeManifest(JSON.parse(text), data.profile.repositoryId),
        manifestText: text,
      }
      if (!same(selected.manifest.binding, data.manifest.binding))
        return failure('BINDING_MISMATCH')
    }
    directory = await mkdtemp(join(tmpdir(), 'frade-v2-recover-'))
    catalog = new PagedCatalog(join(directory, 'catalog.sqlite'))
    await loadCatalog(selected, catalog)
    const rechecked = await recoveryData(root)
    if (rechecked.writerActive || rechecked.journalHash !== inspected.journalHash)
      return failure('REVISION_CONFLICT')
    if (selected !== data)
      await rename(
        await contained(root, journal!.stage),
        await contained(root, data.profile.mapping.sourceFile),
      )
    const evidence = '.frade-v2-recovered/' + randomUUID()
    await mkdir(await contained(root, evidence), { recursive: true })
    // Copy evidence before removing active markers so an interrupted cleanup stays diagnosable.
    if (journal)
      await durable(await contained(root, evidence + '/journal.json'), inspected.journalText)
    await durable(await contained(root, evidence + '/writer.json'), inspected.lockText)
    if (journal && (await readdir(root)).includes(journal.stage))
      await rename(
        await contained(root, journal.stage),
        await contained(root, evidence + '/staged.json'),
      )
    if (journal) await unlink(await contained(root, '.frade-v2-recovery.json'))
    await unlink(await contained(root, '.frade-v2-write.lock'))
    return success(true)
  } catch (error) {
    return resultError(error)
  } finally {
    catalog?.close()
    if (directory) await rm(directory, { recursive: true, force: true })
    await coordination?.close()
    if (coordination && coordinationPath) await unlink(coordinationPath).catch(() => {})
  }
}
export async function exportNativeToPaged(
  source: string,
  destination: string,
  options: { acknowledgeSemanticOnly: boolean },
): Promise<Result<{ warnings: readonly string[] }>> {
  let session: RepositoryAdapterSession | undefined
  try {
    if (options.acknowledgeSemanticOnly !== true) return failure('INVALID_INPUT')
    source = await realpath(source)
    destination = resolve(destination)
    const rel = relative(source, destination),
      back = relative(destination, source)
    if (
      !rel ||
      (!rel.startsWith('..' + sep) && rel !== '..') ||
      (!back.startsWith('..' + sep) && back !== '..')
    )
      return failure('ACCESS_DENIED')
    session = unwrap(await new NativeAdapter(source).open())
    if (session.profile.adapterKind !== 'native') return failure('UNSUPPORTED_CAPABILITY')
    const snapshot = unwrap(await session.snapshot()),
      model = JSON.parse(
        await boundedText(await contained(source, session.profile.metamodel.path), 1000000),
      ) as ModelSource
    async function* rows(entities: readonly Entity[]) {
      yield* entities
    }
    const result = await createPagedNativeRepository(destination, {
      repositoryId: session.profile.repositoryId,
      displayName: session.profile.displayName,
      model,
      ...(session.model.policy ? { policy: session.model.policy } : {}),
      objects: rows(snapshot.objects),
      relations: rows(snapshot.relations),
    })
    return result.ok ? success({ warnings: ['SOURCE_FORMAT_NOT_PRESERVED'] }) : result
  } catch (error) {
    return resultError(error)
  } finally {
    await session?.close()
  }
}
