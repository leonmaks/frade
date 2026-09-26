import { RepositoryAdapterRegistry } from '../src/adapters'
import { it, expect } from 'vitest'
import { readFile, writeFile, cp } from 'node:fs/promises'
import { join } from 'node:path'
import { RepositoryBackend } from '../src/repositories'
import { fixture, unwrap, update } from '../../adapter-sberea-yaml/tests/fixtures/synthetic'
import type {
  WorkspaceRoot,
  RootSession,
  SessionScope,
  MetadataPreview,
} from '@frade/repository-api/workbench'
import type { RepositoryRequest } from '@frade/repository-api/protocol'
import type { JsonValue, RepositoryObject } from '@frade/repository-domain'
const scope = (s: RootSession): SessionScope => ({
  repositoryId: s.repositoryId,
  sessionId: s.sessionId,
  generation: s.generation,
  modelGeneration: s.modelGeneration,
})
const request = (
  backend: RepositoryBackend,
  s: RootSession,
  operation: RepositoryRequest['operation'],
  payload: Record<string, JsonValue> = {},
) =>
  backend.handle({
    operation: 'request',
    value: { scope: scope(s), request: { version: 1, operation, payload } },
  })
const root = (f: Awaited<ReturnType<typeof fixture>>, id: string): WorkspaceRoot => ({
  repositoryId: id,
  label: id,
  adapterKind: 'sberea',
  dataRoot: f.dataRoot,
  entry: 'root.yaml',
  metadataSets: [f.options.metadataSet],
  activeMetadataSet: f.options.metadataSet.id,
})
it('DS-004 scopes identical object IDs, rejects injection and stale sessions, isolates close and read failures', async () => {
  const a = await fixture(),
    b = await fixture(),
    backend = new RepositoryBackend()
  try {
    const A = unwrap(
        await backend.handle({ operation: 'open', root: root(a, 'A') }),
      ) as RootSession,
      B = unwrap(await backend.handle({ operation: 'open', root: root(b, 'B') })) as RootSession
    expect(
      await request(backend, A, 'getObject', { ref: { repositoryId: 'B', objectId: 'a' } }),
    ).toMatchObject({ ok: false, error: { code: 'REPOSITORY_MISMATCH' } })
    const object = unwrap(
      await request(backend, A, 'getObject', { ref: { repositoryId: 'A', objectId: 'a' } }),
    ) as RepositoryObject
    const before = await readFile(join(b.dataRoot, 'objects.yaml'))
    expect(
      await request(backend, A, 'applyChanges', {
        changeSet: {
          repositoryId: 'A',
          idempotencyKey: 'save-A',
          commands: [update(object, { ...object.attributes, description: 'A only' })],
        } as unknown as JsonValue,
      }),
    ).toMatchObject({ ok: true })
    expect(await readFile(join(b.dataRoot, 'objects.yaml'))).toEqual(before)
    expect(
      await backend.handle({ operation: 'open', root: { ...root(a, 'duplicate') } }),
    ).toMatchObject({ ok: false, error: { code: 'PROFILE_INVALID' } })
    expect(
      await backend.handle({
        operation: 'open',
        root: { ...root(a, 'missing'), dataRoot: join(a.destination, 'absent') },
      }),
    ).toMatchObject({ ok: false })
    await backend.handle({ operation: 'close', repositoryId: 'A' })
    expect(await request(backend, A, 'queryObjects', { query: { limit: 100 } })).toMatchObject({
      ok: false,
      error: { code: 'SESSION_CLOSED' },
    })
    expect(await request(backend, B, 'queryObjects', { query: { limit: 100 } })).toMatchObject({
      ok: true,
      value: { items: [{ ref: { repositoryId: 'B' } }, { ref: { repositoryId: 'B' } }] },
    })
    const reopened = unwrap(
      await backend.handle({ operation: 'open', root: root(a, 'A') }),
    ) as RootSession
    expect(reopened.generation).toBeGreaterThan(A.generation)
    expect(await request(backend, A, 'presentation')).toMatchObject({
      ok: false,
      error: { code: 'SESSION_CLOSED' },
    })
  } finally {
    await backend.closeAll()
    await a.cleanup()
    await b.cleanup()
  }
})
it('KM-005/006 relocates content without fingerprint changes; cancel unblocks writes; activation invalidates only A', async () => {
  const a = await fixture(),
    b = await fixture(),
    events: unknown[] = [],
    backend = new RepositoryBackend((e) => events.push(e))
  try {
    const A = unwrap(
        await backend.handle({ operation: 'open', root: root(a, 'A') }),
      ) as RootSession,
      B = unwrap(await backend.handle({ operation: 'open', root: root(b, 'B') })) as RootSession
    const moved = join(a.destination, 'moved')
    await cp(a.metadataRoot, moved, { recursive: true })
    const metadataSet = { ...a.options.metadataSet, id: 'moved', folderPath: moved }
    const candidate = unwrap(
      await backend.handle({ operation: 'stage', repositoryId: 'A', metadataSet }),
    ) as MetadataPreview
    expect(candidate.fingerprint).toBe(A.binding.fingerprint)
    await backend.handle({ operation: 'cancelCandidate', repositoryId: 'A' })
    expect(
      await backend.handle({
        operation: 'activate',
        repositoryId: 'A',
        candidateId: candidate.candidateId,
      }),
    ).toMatchObject({ ok: false })
    const second = unwrap(
      await backend.handle({ operation: 'stage', repositoryId: 'A', metadataSet }),
    ) as MetadataPreview
    const active = unwrap(
      await backend.handle({
        operation: 'activate',
        repositoryId: 'A',
        candidateId: second.candidateId,
      }),
    ) as RootSession
    expect(active.modelGeneration).toBe(A.modelGeneration + 1)
    expect(await request(backend, A, 'presentation')).toMatchObject({
      ok: false,
      error: { code: 'SESSION_CLOSED' },
    })
    expect(await request(backend, B, 'presentation')).toMatchObject({ ok: true })
    expect(await request(backend, active, 'presentation')).toMatchObject({ ok: true })
    await writeFile(join(moved, 'broken.yaml'), 'entities: {}')
    expect(
      await backend.handle({
        operation: 'stage',
        repositoryId: 'A',
        metadataSet: { ...metadataSet, schemaEntries: ['broken.yaml'] },
      }),
    ).toMatchObject({ ok: false })
    expect(
      await request(backend, active, 'getObject', { ref: { repositoryId: 'A', objectId: 'a' } }),
    ).toMatchObject({ ok: true })
    expect(
      await backend.handle({
        operation: 'stage',
        repositoryId: 'A',
        metadataSet: { ...metadataSet, folderPath: join(moved, 'missing') },
      }),
    ).toMatchObject({ ok: false })
  } finally {
    await backend.closeAll()
    await a.cleanup()
    await b.cleanup()
  }
})
it('KM-006 can stage a corrected folder for an unavailable root without an old session', async () => {
  const f = await fixture(),
    backend = new RepositoryBackend()
  try {
    const descriptor = root(f, 'A')
    const unavailable = {
      ...descriptor,
      metadataSets: [{ ...descriptor.metadataSets[0], folderPath: join(f.destination, 'missing') }],
    }
    expect(await backend.handle({ operation: 'open', root: unavailable })).toMatchObject({
      ok: false,
    })
    const candidate = unwrap(
      await backend.handle({
        operation: 'stage',
        repositoryId: 'A',
        root: unavailable,
        metadataSet: descriptor.metadataSets[0],
      }),
    ) as MetadataPreview
    const active = unwrap(
      await backend.handle({
        operation: 'activate',
        repositoryId: 'A',
        candidateId: candidate.candidateId,
      }),
    ) as RootSession
    expect(await request(backend, active, 'queryObjects', { query: { limit: 100 } })).toMatchObject(
      { ok: true },
    )
  } finally {
    await backend.closeAll()
    await f.cleanup()
  }
})
it('DS-002 discards an open result after root removal without publishing a zombie session', async () => {
  const f = await fixture()
  let release!: () => void, started!: () => void
  const gate = new Promise<void>((r) => (release = r)),
    entered = new Promise<void>((r) => (started = r))
  const registry = new RepositoryAdapterRegistry().register('sberea', async (grant) => {
    const session = await f.adapter({ repositoryId: grant.repositoryId }).open()
    started()
    await gate
    return session
  })
  const backend = new RepositoryBackend(() => {
    throw Error('Zombie event')
  }, registry)
  try {
    const opening = backend.handle({ operation: 'open', root: root(f, 'A') })
    await entered
    await backend.handle({ operation: 'close', repositoryId: 'A' })
    release()
    expect(await opening).toMatchObject({ ok: false, error: { code: 'CANCELLED' } })
  } finally {
    release()
    await backend.closeAll()
    await f.cleanup()
  }
})
it('KM-006/DS-002 pending writes and unknown acknowledgement block model switching until reconciliation', async () => {
  const f = await fixture()
  let release!: () => void, started!: () => void
  const gate = new Promise<void>((r) => (release = r)),
    entered = new Promise<void>((r) => (started = r))
  const registry = new RepositoryAdapterRegistry().register('sberea', (grant) =>
    f
      .adapter({
        repositoryId: grant.repositoryId,
        writeBarrier: async (phase) => {
          if (phase === 'replaced') {
            started()
            await gate
          }
        },
      })
      .open(),
  )
  const backend = new RepositoryBackend(() => {}, registry)
  try {
    const A = unwrap(
        await backend.handle({ operation: 'open', root: root(f, 'A') }),
      ) as RootSession,
      object = unwrap(
        await request(backend, A, 'getObject', { ref: { repositoryId: 'A', objectId: 'a' } }),
      ) as RepositoryObject
    const saving = backend.handle(
      {
        operation: 'request',
        value: {
          scope: scope(A),
          request: {
            version: 1,
            operation: 'applyChanges',
            payload: {
              changeSet: {
                repositoryId: 'A',
                idempotencyKey: 'pending',
                commands: [update(object, { ...object.attributes, description: 'written once' })],
              } as unknown as JsonValue,
            },
          },
        },
      },
      'request-write',
    )
    await entered
    expect(
      await backend.handle({
        operation: 'stage',
        repositoryId: 'A',
        metadataSet: f.options.metadataSet,
      }),
    ).toMatchObject({ ok: false, error: { code: 'OUTCOME_UNKNOWN' } })
    backend.cancel('request-write')
    release()
    await saving
    expect(
      await backend.handle({
        operation: 'stage',
        repositoryId: 'A',
        metadataSet: f.options.metadataSet,
      }),
    ).toMatchObject({ ok: false, error: { code: 'OUTCOME_UNKNOWN' } })
    await expect
      .poll(() => request(backend, A, 'reconcile', { operationId: 'pending' }))
      .toMatchObject({ ok: true, value: { status: 'committed' } })
    expect(
      await backend.handle({
        operation: 'stage',
        repositoryId: 'A',
        metadataSet: f.options.metadataSet,
      }),
    ).toMatchObject({ ok: true })
  } finally {
    release()
    await backend.closeAll()
    await f.cleanup()
  }
})
it('DS-004 shared metadata watchers independently advance model generations and survive another root closing', async () => {
  const a = await fixture(),
    b = await fixture(),
    events: { scope: SessionScope; event: { type: string } }[] = [],
    backend = new RepositoryBackend((e) => events.push(e))
  try {
    const A = unwrap(await backend.handle({ operation: 'open', root: root(a, 'A') })) as RootSession
    const descriptor = {
      ...root(b, 'B'),
      metadataSets: [a.options.metadataSet],
      activeMetadataSet: a.options.metadataSet.id,
    }
    const B = unwrap(await backend.handle({ operation: 'open', root: descriptor })) as RootSession
    const file = join(a.metadataRoot, 'schema.yaml'),
      schema = JSON.parse(await readFile(file, 'utf8'))
    schema.entities.systems.title = 'Shared changed title'
    await writeFile(file, JSON.stringify(schema))
    await expect
      .poll(
        () =>
          new Set(
            events
              .filter((e) => e.event.type === 'metamodel.changed')
              .map((e) => e.scope.repositoryId),
          ).size,
      )
      .toBe(2)
    expect(await request(backend, A, 'presentation')).toMatchObject({
      ok: false,
      error: { code: 'BINDING_MISMATCH' },
    })
    expect(await request(backend, B, 'presentation')).toMatchObject({
      ok: false,
      error: { code: 'BINDING_MISMATCH' },
    })
    await backend.close('A')
    const count = events.filter((e) => e.scope.repositoryId === 'A').length
    schema.entities.systems.title = 'B still watches'
    await writeFile(file, JSON.stringify(schema))
    await expect
      .poll(() => events.some((e) => e.scope.repositoryId === 'B' && e.scope.modelGeneration === 3))
      .toBe(true)
    expect(events.filter((e) => e.scope.repositoryId === 'A')).toHaveLength(count)
  } finally {
    await backend.closeAll()
    await a.cleanup()
    await b.cleanup()
  }
})
