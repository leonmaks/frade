import { createHash, randomUUID } from 'node:crypto'
import { compileModel, type ModelSource } from '@frade/metamodel-compiler'
import {
  failure,
  success,
  entityKey,
  queryEntities,
  canonicalJson,
  validationProjection,
  type JsonValue,
  type RepositorySnapshot,
  type Entity,
  type Revision,
} from '@frade/repository-domain'
import type {
  RepositoryAdapter,
  RepositoryAdapterSession,
  ChangeResult,
  OperationOutcome,
  RepositoryEvent,
} from '@frade/repository-ports'
import { validateSnapshot } from '@frade/metamodel-domain'
import { sampleMetamodel } from '../../../adapter-yaml/src/index'
export const context = {
  callerId: 'fixture',
  repositoryIds: ['R'],
  permissions: ['read', 'write', 'cascade'],
}
export const obj = (id = 'A') => ({
  ref: { repositoryId: 'R', objectId: id },
  typeId: 'sample:ApplicationSystem',
  name: id,
  attributes: { status: 'created' },
})
export function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
export async function memory(
  options: {
    model?: ModelSource
    writeMode?: 'read-only' | 'single' | 'atomic'
    watch?: boolean
    failChange?: number
    beforeCommit?: () => Promise<void>
  } = {},
) {
  const compiled = await compileModel(options.model ?? sampleMetamodel(), {
    load: async () => {
      throw Error('not mapped')
    },
    sha256: async (text) => createHash('sha256').update(text).digest('hex'),
  })
  if (!compiled.ok) throw Error('model')
  let state: RepositorySnapshot = {
      repositoryId: 'R',
      revision: 'r0' as Revision,
      complete: true,
      binding: {
        modelId: compiled.value.id,
        modelVersion: compiled.value.version,
        fingerprint: compiled.value.fingerprint,
      },
      objects: [],
      relations: [],
    },
    revision = 0,
    writes = 0,
    closes = 0
  const outcomes = new Map<string, OperationOutcome>()
  const scope = randomUUID(),
    listeners = new Set<(event: RepositoryEvent) => void>()
  let closed = false,
    sequence = 0
  const session: RepositoryAdapterSession = {
    profile: {
      schemaVersion: 1,
      repositoryId: 'R',
      displayName: 'Memory fixture',
      adapterKind: 'memory',
      connection: {},
      metamodel: { path: 'fixture', version: '1.0.0' },
      mapping: { sourceFile: 'fixture', format: 'json' },
      policyRef: 'default',
      accessMode: 'read-write',
      indexing: { enabled: false },
      versioning: { provider: 'none' },
    },
    capabilities: {
      canRead: true,
      canWrite: true,
      supportsBatch: true,
      supportsAtomicBatch: true,
      supportsWatch: false,
      supportsHistory: false,
      supportsTransactions: true,
      supportsCrossRepositoryReferences: false,
      supportsServerSideQueries: false,
      supportedQueryOperators: [
        'eq',
        'ne',
        'exists',
        'and',
        'or',
        'not',
        'in',
        'lt',
        'lte',
        'gt',
        'gte',
      ],
      supportedMetamodelFeatures: ['attributes', 'references', 'relations'],
      guardedSnapshot: true,
      reconciliation: 'session',
      preservation: 'none',
      writerCoordination: 'none',
    },
    model: { ...state.binding, analysis: compiled.value.analysis },
    read: async (kind, ref) => {
      const found = (kind === 'object' ? state.objects : state.relations).find(
        (e) => entityKey(kind, e.ref) === entityKey(kind, ref),
      )
      return found ? success(structuredClone(found)) : failure('ENTITY_NOT_FOUND')
    },
    query: async (kind, query) =>
      queryEntities<Entity>(
        kind === 'object' ? state.objects : state.relations,
        query,
        scope,
        state.revision,
      ),
    snapshot: async () => success(structuredClone(state)),
    writer: {
      async commit(request) {
        writes++
        await options.beforeCommit?.()
        if (closed) return failure('SESSION_CLOSED')
        if (options.writeMode === 'single' && request.changes.length > 1)
          return failure('UNSUPPORTED_CAPABILITY')
        if (request.expectedRevision !== state.revision) return failure('REVISION_CONFLICT')
        if (
          canonicalJson(request.candidate.binding as unknown as JsonValue) !==
          canonicalJson(state.binding as unknown as JsonValue)
        )
          return failure('BINDING_MISMATCH')
        const objects = new Map(state.objects.map((e) => [entityKey('object', e.ref), e])),
          relations = new Map(state.relations.map((e) => [entityKey('relation', e.ref), e])),
          seen = new Set<string>()
        for (const [index, change] of request.changes.entries()) {
          const map: Map<string, Entity> = change.kind === 'object' ? objects : relations,
            key = entityKey(change.kind, change.ref),
            old = map.get(key)
          if (seen.has(key)) return failure('INVALID_INPUT')
          seen.add(key)
          if (change.action === 'created' ? !!old : !old) return failure('REVISION_CONFLICT')
          if (options.failChange === index) {
            outcomes.set(request.operationId, { status: 'not-committed' })
            return failure('WRITE_FAILED')
          }
          if (change.action === 'deleted') map.delete(key)
          else {
            if (!change.entity || entityKey(change.kind, change.entity.ref) !== key)
              return failure('INVALID_INPUT')
            if (old && change.entity.revision !== old.revision) return failure('REVISION_CONFLICT')
            map.set(key, change.entity)
          }
        }
        const expected = {
          ...state,
          objects: [...objects.values()],
          relations: [...relations.values()],
        }
        if (
          canonicalJson(expected as unknown as JsonValue) !==
          canonicalJson(request.candidate as unknown as JsonValue)
        )
          return failure('INVALID_INPUT')
        if (
          !validateSnapshot(compiled.value.analysis(), validationProjection(request.candidate)).ok
        )
          return failure('VALIDATION_FAILED')
        const copy = structuredClone(request.candidate),
          changes = request.changes.map((change) => {
            if (change.action === 'deleted') return change
            const entity = { ...change.entity!, revision: ('entity-' + ++revision) as Revision }
            const list = change.kind === 'object' ? copy.objects : copy.relations,
              index = list.findIndex(
                (e) => entityKey(change.kind, e.ref) === entityKey(change.kind, change.ref),
              )
            ;(list as Entity[])[index] = entity
            return { ...change, entity }
          })
        state = { ...copy, revision: ('snapshot-' + ++revision) as Revision }
        const result: ChangeResult = {
          operationId: request.operationId,
          revision: state.revision,
          changes,
          warnings: [],
        }
        outcomes.set(request.operationId, { status: 'committed', result })
        return success(structuredClone(result))
      },
      lookup: async (id) => success(structuredClone(outcomes.get(id) ?? { status: 'unknown' })),
    },
    close: async () => {
      if (closed) return
      closed = true
      closes++
      listeners.clear()
    },
  }
  if (options.writeMode === 'read-only') {
    Object.assign(session.capabilities, {
      canWrite: false,
      supportsBatch: false,
      supportsAtomicBatch: false,
      supportsTransactions: false,
      guardedSnapshot: false,
      reconciliation: 'none',
    })
    Object.assign(session, { writer: undefined })
  } else if (options.writeMode === 'single')
    Object.assign(session.capabilities, { supportsBatch: false, supportsAtomicBatch: false })
  if (options.watch) {
    Object.assign(session.capabilities, { supportsWatch: true })
    session.subscribe = (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
  const adapter: RepositoryAdapter = { open: async () => success(session) }
  return {
    adapter,
    session,
    get state() {
      return structuredClone(state)
    },
    get writes() {
      return writes
    },
    get closes() {
      return closes
    },
    get listeners() {
      return listeners.size
    },
    emit(event: Partial<RepositoryEvent> = {}) {
      const value: RepositoryEvent = {
        eventId: randomUUID(),
        repositoryId: 'R',
        sequence: ++sequence,
        type: 'object.updated',
        revision: state.revision,
        ref: obj().ref,
        ...event,
      }
      for (const listener of listeners) listener(value)
    },
    replaceState(next: RepositorySnapshot) {
      state = next
    },
  }
}
