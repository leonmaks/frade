import { afterEach, expect, it } from 'vitest'
import { mkdtemp, readFile, writeFile, rename, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as app from '../../src/index'
import * as native from '../../../adapter-yaml/src/index'
import * as index from '../../../local-index/src/index'
import * as git from '../../../versioning-git/src/index'
import * as bridge from '../../../repository-bridge/src/index'
import * as transport from '../../../repository-api/src/index'

const roots: string[] = []
const sessions: { close(): Promise<unknown> }[] = []
afterEach(async () => {
  for (const session of sessions.splice(0)) await session.close()
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})
const ref = (id: string) => ({ repositoryId: 'R', objectId: id })
const object = (id = 'A') => ({
  ref: ref(id),
  typeId: 'sample:ApplicationSystem',
  name: id,
  attributes: { status: 'created' },
})
const relation = () => ({
  ref: { repositoryId: 'R', relationId: 'edge' },
  typeId: 'sample:IntegrationFlow',
  source: ref('A'),
  target: ref('B'),
  attributes: {},
})
const context = {
  callerId: 'tester',
  repositoryIds: ['R'],
  permissions: ['read', 'write', 'configure', 'cascade'],
}
function value<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw Error('Expected success')
  return result.value
}
async function setup(options: Record<string, unknown> = {}) {
  const root = await mkdtemp(join(tmpdir(), 'frade-core-'))
  roots.push(root)
  await native.createNativeRepository(root, {
    repositoryId: 'R',
    displayName: 'Fixture',
    ...options,
  })
  const adapter = new native.NativeAdapter(root)
  const session = value(await app.openRepository(adapter, context, { authorize: () => true }))
  sessions.push(session)
  return { root, adapter, session }
}
async function pair(session: any) {
  return value(
    await session.applyChanges({
      repositoryId: 'R',
      idempotencyKey: 'pair',
      commands: [
        { op: 'createObject', object: object('A') },
        { op: 'createObject', object: object('B') },
      ],
    }),
  )
}
async function add(session: any, id = 'A', key = 'add-' + id) {
  value(
    await session.applyChanges({
      repositoryId: 'R',
      idempotencyKey: key,
      commands: [{ op: 'createObject', object: object(id) }],
    }),
  )
  return value<any>(await session.getObject(ref(id)))
}

it('AC-session-open: writable and read-only lifecycle', async () => {
  const { session } = await setup()
  expect(session.state).toBe('READY')
  expect(session.capabilities.canWrite).toBe(true)
  const readonly = await setup({ accessMode: 'read-only' })
  expect(readonly.session.state).toBe('READ_ONLY')
  expect(
    await readonly.session.applyChanges({
      repositoryId: 'R',
      commands: [{ op: 'createObject', object: object() }],
    }),
  ).toMatchObject({ ok: false, error: { code: 'REPOSITORY_READ_ONLY' } })
})
it('AC-session-close: close is idempotent and rejects new queries', async () => {
  const { session } = await setup()
  await session.close()
  await session.close()
  expect(session.state).toBe('CLOSED')
  expect(await session.getObject(ref('A'))).toMatchObject({
    ok: false,
    error: { code: 'SESSION_CLOSED' },
  })
})
it('AC-capabilities: unsupported distributed batches never write', async () => {
  const { session, root } = await setup()
  const before = await readFile(join(root, 'repository.yaml'), 'utf8')
  expect(
    (
      await session.applyChanges({
        repositoryId: 'external',
        commands: [{ op: 'createObject', object: object() }],
      })
    ).ok,
  ).toBe(false)
  expect(await readFile(join(root, 'repository.yaml'), 'utf8')).toBe(before)
  expect(session.capabilities.supportsCrossRepositoryReferences).toBe(false)
})
it('AC-metamodel: new configured type requires no core changes', async () => {
  const { root, session } = await setup()
  await session.close()
  const model = JSON.parse(await readFile(join(root, 'metamodel.json'), 'utf8'))
  model.definition.objectTypes.push({ id: 'sample:Capability', attributes: [] })
  await writeFile(join(root, 'metamodel.json'), JSON.stringify(model))
  const reopened = value(
    await app.openRepository(new native.NativeAdapter(root), context, { authorize: () => true }),
  )
  sessions.push(reopened)
  expect(
    (
      await reopened.applyChanges({
        repositoryId: 'R',
        commands: [
          {
            op: 'createObject',
            object: { ...object(), typeId: 'sample:Capability', attributes: {} },
          },
        ],
      })
    ).ok,
  ).toBe(true)
})
it('AC-model-version: unsupported schema refuses opening without migration', async () => {
  const { root, session } = await setup()
  await session.close()
  const filename = join(root, 'metamodel.json')
  const model = JSON.parse(await readFile(filename, 'utf8'))
  model.definition.schemaVersion = 999
  const content = JSON.stringify(model)
  await writeFile(filename, content)
  expect(
    (await app.openRepository(new native.NativeAdapter(root), context, { authorize: () => true }))
      .ok,
  ).toBe(false)
  expect(await readFile(filename, 'utf8')).toBe(content)
})
it('AC-identity: rename reload and source relocation preserve refs', async () => {
  const { root, session } = await setup()
  const a = await add(session)
  value(
    await session.applyChanges({
      repositoryId: 'R',
      commands: [
        {
          op: 'updateObject',
          object: { ...object(), name: 'Renamed' },
          expectedRevision: a.revision,
        },
      ],
    }),
  )
  await session.close()
  await mkdir(join(root, 'data'))
  await rename(join(root, 'repository.yaml'), join(root, 'data', 'moved.yaml'))
  const path = join(root, 'profile.json'),
    profile = JSON.parse(await readFile(path, 'utf8'))
  profile.mapping.sourceFile = 'data/moved.yaml'
  await writeFile(path, JSON.stringify(profile))
  const reopened = value(
    await app.openRepository(new native.NativeAdapter(root), context, { authorize: () => true }),
  )
  sessions.push(reopened)
  expect(value<any>(await reopened.getObject(ref('A')))).toMatchObject({
    ref: ref('A'),
    name: 'Renamed',
  })
})
it('AC-object-crud: create update delete and stale revision rejection', async () => {
  const { session } = await setup()
  const a = await add(session)
  value(
    await session.applyChanges({
      repositoryId: 'R',
      commands: [
        { op: 'updateObject', object: { ...object(), name: 'New' }, expectedRevision: a.revision },
      ],
    }),
  )
  expect(
    await session.applyChanges({
      repositoryId: 'R',
      commands: [{ op: 'deleteObject', ref: ref('A'), expectedRevision: a.revision }],
    }),
  ).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } })
  const current = value<any>(await session.getObject(ref('A')))
  expect(current.name).toBe('New')
  value(
    await session.applyChanges({
      repositoryId: 'R',
      commands: [{ op: 'deleteObject', ref: ref('A'), expectedRevision: current.revision }],
    }),
  )
  expect(await session.getObject(ref('A'))).toMatchObject({
    ok: false,
    error: { code: 'ENTITY_NOT_FOUND' },
  })
})
it('AC-relation-crud: canonical direction and restricted deletion', async () => {
  const { session } = await setup()
  await pair(session)
  value(
    await session.applyChanges({
      repositoryId: 'R',
      commands: [{ op: 'createRelation', relation: relation() }],
    }),
  )
  const incoming = value<any>(await session.getIncomingRelations(ref('B'))),
    outgoing = value<any>(await session.getOutgoingRelations(ref('A')))
  expect(incoming.items).toEqual(outgoing.items)
  expect(incoming.items).toHaveLength(1)
  const b = value<any>(await session.getObject(ref('B')))
  expect(
    await session.applyChanges({
      repositoryId: 'R',
      commands: [{ op: 'deleteObject', ref: ref('B'), expectedRevision: b.revision }],
    }),
  ).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } })
  expect(value<any>(await session.getObject(ref('B'))).revision).toBe(b.revision)
})
it('AC-resolve: missing foreign and malformed references remain distinct', async () => {
  const { session } = await setup()
  expect(await session.resolveObject(ref('absent'))).toMatchObject({
    ok: false,
    error: { code: 'ENTITY_NOT_FOUND' },
  })
  expect(await session.resolveObject({ repositoryId: 'external', objectId: 'A' })).toMatchObject({
    ok: false,
    error: { code: 'REPOSITORY_UNAVAILABLE' },
  })
  expect(await session.resolveObject({ repositoryId: '', objectId: '' })).toMatchObject({
    ok: false,
    error: { code: 'MALFORMED_REFERENCE' },
  })
})
it('AC-query: deterministic pagination and bounded filters', async () => {
  const { session } = await setup()
  await pair(session)
  const first = value<any>(
    await session.queryObjects({ limit: 1, sort: [{ field: 'name', direction: 'asc' }] }),
  )
  expect(first.items).toHaveLength(1)
  const next = value<any>(
    await session.queryObjects({
      limit: 1,
      sort: [{ field: 'name', direction: 'asc' }],
      cursor: first.cursor,
    }),
  )
  expect(next.items).toHaveLength(1)
  expect(new Set([...first.items, ...next.items].map((x) => x.ref.objectId)).size).toBe(2)
  expect((await session.queryObjects({ limit: 1001 })).ok).toBe(false)
  expect(
    value<any>(
      await session.queryObjects({
        where: { op: 'eq', field: 'attributes.status', value: 'created' },
      }),
    ).items,
  ).toHaveLength(2)
})
it('AC-traversal: cyclic traversal terminates and rejects unbounded depth', async () => {
  const { session } = await setup()
  await pair(session)
  value(
    await session.applyChanges({
      repositoryId: 'R',
      commands: [
        { op: 'createRelation', relation: relation() },
        {
          op: 'createRelation',
          relation: {
            ...relation(),
            ref: { repositoryId: 'R', relationId: 'back' },
            source: ref('B'),
            target: ref('A'),
          },
        },
      ],
    }),
  )
  const graph = value<any>(
    await session.getSubgraph(ref('A'), { direction: 'outgoing', maxDepth: 3, maxResults: 10 }),
  )
  expect(graph.objects).toHaveLength(2)
  expect(graph.relations).toHaveLength(2)
  expect((await session.getSubgraph(ref('A'), { maxDepth: Infinity })).ok).toBe(false)
})
it('AC-validation: invalid enum and invalid batch preserve source bytes', async () => {
  const { root, session } = await setup()
  const before = await readFile(join(root, 'repository.yaml'), 'utf8')
  expect(
    await session.applyChanges({
      repositoryId: 'R',
      commands: [
        { op: 'createObject', object: object('A') },
        { op: 'createObject', object: { ...object('B'), attributes: { status: 'unknown' } } },
      ],
    }),
  ).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } })
  expect(await readFile(join(root, 'repository.yaml'), 'utf8')).toBe(before)
})
it('AC-idempotency: repeated payload returns original result and changed payload conflicts', async () => {
  const { session } = await setup()
  const command = {
    repositoryId: 'R',
    idempotencyKey: 'once',
    commands: [{ op: 'createObject', object: object() }],
  }
  const first = await session.applyChanges(command)
  expect(first.ok).toBe(true)
  expect(await session.applyChanges(command)).toEqual(first)
  expect(
    await session.applyChanges({
      ...command,
      commands: [{ op: 'createObject', object: object('B') }],
    }),
  ).toMatchObject({ ok: false, error: { code: 'OPERATION_ID_CONFLICT' } })
  expect(value<any>(await session.queryObjects({})).items).toHaveLength(1)
})
it('AC-recovery: interrupted staging with journal blocks healthy open', async () => {
  const { root, session } = await setup()
  await session.close()
  const before = await readFile(join(root, 'repository.yaml'), 'utf8')
  await writeFile(
    join(root, '.frade-recovery.json'),
    JSON.stringify({ version: 1, operationId: 'interrupted', state: 'staged' }),
  )
  expect(
    await app.openRepository(new native.NativeAdapter(root), context, { authorize: () => true }),
  ).toMatchObject({ ok: false, error: { code: 'RECOVERY_REQUIRED' } })
  expect(await readFile(join(root, 'repository.yaml'), 'utf8')).toBe(before)
})
it('AC-yaml: unknown metadata and comments survive a known attribute edit', async () => {
  const { root, session } = await setup()
  const a = await add(session)
  await session.close()
  const path = join(root, 'repository.yaml')
  await writeFile(
    path,
    `# retained comment\nformatVersion: 1\nrepositoryId: R\nobjects:\n  - ref:\n      repositoryId: R\n      objectId: A\n    typeId: sample:ApplicationSystem\n    name: A\n    revision: ${a.revision}\n    vendorMetadata: keep-entity-metadata\n    attributes:\n      status: created\nrelations: []\nmetadata:\n  vendor: retained\n`,
  )
  const reopened = value(
    await app.openRepository(new native.NativeAdapter(root), context, { authorize: () => true }),
  )
  sessions.push(reopened)
  const current = value<any>(await reopened.getObject(a.ref))
  value(
    await reopened.applyChanges({
      repositoryId: 'R',
      commands: [
        {
          op: 'updateObject',
          object: { ...object(), name: 'Changed' },
          expectedRevision: current.revision,
        },
      ],
    }),
  )
  const content = await readFile(path, 'utf8')
  expect(content).toContain('# retained comment')
  expect(content).toContain('vendor: retained')
  expect(content).toContain('vendorMetadata: keep-entity-metadata')
})
it('AC-mapping: unsafe root escape is refused', async () => {
  const { root, session } = await setup()
  await session.close()
  const path = join(root, 'profile.json'),
    profile = JSON.parse(await readFile(path, 'utf8'))
  profile.mapping.sourceFile = '../outside.yaml'
  await writeFile(path, JSON.stringify(profile))
  expect(
    (await app.openRepository(new native.NativeAdapter(root), context, { authorize: () => true }))
      .ok,
  ).toBe(false)
})
it('AC-index: rebuild and corruption recovery preserve authoritative entities', async () => {
  const { root, session } = await setup()
  await pair(session)
  const snapshot = value<any>(await session.exportSnapshot())
  const filename = join(root, 'derived.sqlite'),
    cache = new index.SqliteIndex(filename)
  await cache.rebuild(snapshot)
  expect(value<any>(await cache.queryObjects({})).items).toEqual(
    value<any>(await session.queryObjects({})).items,
  )
  await cache.close()
  await writeFile(filename, 'corrupt')
  const recovered = new index.SqliteIndex(filename)
  await recovered.rebuild(snapshot)
  expect(value<any>(await recovered.queryObjects({})).items).toHaveLength(2)
  await recovered.close()
  expect(value<any>(await session.queryObjects({})).items).toHaveLength(2)
})
it('AC-watch: external change invalidates and reloads without duplicate callbacks', async () => {
  const { root, session } = await setup()
  await add(session)
  const events: any[] = []
  const off = session.subscribe((event: any) => events.push(event))
  const path = join(root, 'repository.yaml')
  await writeFile(path, (await readFile(path, 'utf8')).replace('name: A', 'name: External'))
  await session.reload()
  await session.reload()
  expect(value<any>(await session.getObject(ref('A'))).name).toBe('External')
  expect(events.filter((e) => e.type === 'repository.reloaded')).toHaveLength(1)
  off()
})
it('AC-events: committed events isolate subscriber failures and stop after unsubscribe', async () => {
  const { session } = await setup()
  const events: any[] = []
  session.subscribe(() => {
    throw Error('listener')
  })
  const off = session.subscribe((event: any) => events.push(event))
  await add(session)
  expect(events.map((e) => e.type)).toContain('object.created')
  off()
  await add(session, 'B')
  expect(events.filter((e) => e.type === 'object.created')).toHaveLength(1)
})
it('AC-git: non-git repository works and versioning returns explicit unavailable', async () => {
  const { root, session } = await setup()
  await add(session)
  expect(value<any>(await session.getObject(ref('A'))).name).toBe('A')
  expect((await new git.GitVersioning(root).status()).ok).toBe(false)
})
it('AC-access: repository scope and write permission checked before persistence', async () => {
  const { root, session } = await setup()
  await session.close()
  const restricted = value(
    await app.openRepository(new native.NativeAdapter(root), { ...context, permissions: ['read'] }),
  )
  sessions.push(restricted)
  expect(
    await restricted.applyChanges({
      repositoryId: 'R',
      commands: [{ op: 'createObject', object: object() }],
    }),
  ).toMatchObject({ ok: false, error: { code: 'ACCESS_DENIED' } })
  expect(
    (await app.openRepository(new native.NativeAdapter(root), { ...context, repositoryIds: [] }))
      .ok,
  ).toBe(false)
})
it('AC-binding: multiple visual instances do not mutate domain objects', async () => {
  const { session } = await setup()
  const a = await add(session)
  const b = new bridge.RepositoryBridge(session)
  const first = value<any>(await b.bindObject('node-1', ref('A'))),
    second = value<any>(await b.bindObject('node-2', ref('A')))
  expect(first.snapshot).toEqual(second.snapshot)
  expect(value<any>(await session.getObject(ref('A')))).toEqual(a)
})
it('AC-detached: detach retains cached entity and independent visual overrides', async () => {
  const { session } = await setup()
  await add(session)
  const b = new bridge.RepositoryBridge(session)
  const binding = value<any>(await b.bindObject('node', ref('A')))
  const detached = b.detach({
    ...binding,
    overrides: { stroke: 'red' },
    geometry: { x: 10, y: 20 },
  })
  await session.close()
  expect(detached.state).toBe('DETACHED')
  expect(detached.snapshot.name).toBe('A')
  expect(detached.overrides).toEqual({ stroke: 'red' })
})
it('AC-reconnect: domain revision changes mark stale and preserve overrides', async () => {
  const { session } = await setup()
  const a = await add(session)
  const b = new bridge.RepositoryBridge(session)
  const bound = value<any>(await b.bindObject('node', ref('A')))
  value(
    await session.applyChanges({
      repositoryId: 'R',
      commands: [
        {
          op: 'updateObject',
          object: { ...object(), name: 'External' },
          expectedRevision: a.revision,
        },
      ],
    }),
  )
  const reconnected = value<any>(
    await b.reconnect({ ...b.detach(bound), overrides: { stroke: 'red' } }),
  )
  expect(reconnected.state).toBe('STALE')
  expect(reconnected.overrides).toEqual({ stroke: 'red' })
  expect(value<any>(await session.getObject(ref('A'))).name).toBe('External')
})
it('AC-transport: invalid and path-bearing requests cannot invoke privileged methods', async () => {
  const { session } = await setup()
  const handler = new transport.RepositoryApi(session)
  expect((await handler.handle({ operation: 'fs.read', path: 'C:/private' })).ok).toBe(false)
  const response = await handler.handle({
    version: 1,
    operation: 'getObject',
    payload: { ref: ref('missing') },
  })
  expect(response).toMatchObject({ ok: false, error: { code: 'ENTITY_NOT_FOUND' } })
  expect(JSON.stringify(response)).not.toContain('stack')
})
