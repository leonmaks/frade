import { expect, it } from 'vitest'
import { mkdtemp, readdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as native from '../src/index'
import { openRepository } from '@frade/repository-application'
import {
  queryEntities,
  type RepositoryObject,
  type RepositoryRelation,
} from '@frade/repository-domain'
const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw Error(JSON.stringify(r.error))
  return r.value
}
const ref = (id: string) => ({ repositoryId: 'R', objectId: id })
export const object = (id: string): RepositoryObject => ({
  ref: ref(id),
  name: id,
  typeId: 'sample:ApplicationSystem',
  attributes: { status: 'created' },
  revision: 'r1' as any,
})
export const edge = (id: string, source: string, target: string): RepositoryRelation => ({
  ref: { repositoryId: 'R', relationId: id },
  typeId: 'sample:IntegrationFlow',
  source: ref(source),
  target: ref(target),
  attributes: {},
  revision: 'r1' as any,
})
async function* stream<T>(items: Iterable<T>) {
  yield* items
}
async function fixture(objects = [object('A'), object('B')], relations = [edge('AB', 'A', 'B')]) {
  const root = await mkdtemp(join(tmpdir(), 'frade-v2-'))
  try {
    unwrap(
      await (native as any).createPagedNativeRepository(root, {
        repositoryId: 'R',
        displayName: 'Paged',
        objects: stream(objects),
        relations: stream(relations),
      }),
    )
    return root
  } catch (error) {
    await rm(root, { recursive: true, force: true })
    throw error
  }
}
it('v2-cross-page: immutable pages resolve targets and reuse portable query semantics', async () => {
  const objects = [object('B'), object('A'), object('😀'), object('\ue000')],
    root = await fixture(objects)
  try {
    const s: any = unwrap(await new (native as any).PagedNativeAdapter(root).open())
    try {
      expect((await readdir(join(root, 'pages'))).length).toBeGreaterThan(1)
      expect(unwrap(await s.read('object', ref('A')))).toEqual(object('A'))
      for (const query of [
        {},
        { where: { op: 'eq', field: 'attributes.status', value: 'created' } },
        { where: { op: 'not', filter: { op: 'exists', field: 'attributes.missing' } } },
        { sort: [{ field: 'name', direction: 'desc' }] },
      ])
        expect(unwrap<any>(await s.query('object', query)).items).toEqual(
          unwrap(queryEntities(objects, query, 'fixture', 'r')).items,
        )
      expect(
        unwrap<any>(
          await s.query('relation', { where: { op: 'eq', field: 'target.objectId', value: 'B' } }),
        ).items,
      ).toHaveLength(1)
    } finally {
      await s.close()
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
it('v2-invalid: duplicate identities and absent endpoints never publish a valid manifest', async () => {
  for (const [objects, relations] of [
    [[object('A'), object('A')], []],
    [[object('A')], [edge('missing', 'A', 'B')]],
  ] as const) {
    const root = await mkdtemp(join(tmpdir(), 'frade-v2-invalid-'))
    try {
      expect(
        (
          await (native as any).createPagedNativeRepository(root, {
            repositoryId: 'R',
            displayName: 'Invalid',
            objects: stream(objects),
            relations: stream(relations),
          })
        ).ok,
      ).toBe(false)
      expect(await readdir(root)).not.toContain('manifest.json')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }
})
it('v2-corrupt: edited content-addressed pages prevent READY and retain source evidence', async () => {
  const root = await fixture()
  try {
    const path = join(root, 'pages', (await readdir(join(root, 'pages')))[0]),
      before = await readFile(path, 'utf8'),
      changed = before + '\n'
    await writeFile(path, changed)
    expect((await new (native as any).PagedNativeAdapter(root).open()).ok).toBe(false)
    expect(await readFile(path, 'utf8')).toBe(changed)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
it('v2-capacity: a graph beyond the aggregate decoder budget opens with bounded point/adjacency reads', async () => {
  const objects = Array.from({ length: 8000 }, (_, i) => object('N' + i)),
    root = await fixture(objects, [])
  try {
    const s: any = unwrap(await new (native as any).PagedNativeAdapter(root).open())
    try {
      expect(unwrap<any>(await s.read('object', ref('N7999'))).ref).toEqual(ref('N7999'))
      expect(unwrap<any>(await s.query('object', { limit: 2 })).items).toHaveLength(2)
      expect((await s.snapshot()).ok).toBe(false)
    } finally {
      await s.close()
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 30000)
it('v2-compatibility: v2 refuses an occupied destination without changing v1 files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-v1-compat-'))
  try {
    await native.createNativeRepository(root, { repositoryId: 'R', displayName: 'v1' })
    const before = await readFile(join(root, 'repository.yaml'), 'utf8')
    expect(
      (
        await (native as any).createPagedNativeRepository(root, {
          repositoryId: 'R',
          displayName: 'v2',
          objects: stream([]),
          relations: stream([]),
        })
      ).ok,
    ).toBe(false)
    expect(await readFile(join(root, 'repository.yaml'), 'utf8')).toBe(before)
    const s = unwrap(await new native.NativeAdapter(root).open())
    await s.close()
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
it('v2-cursors: pages are stable and another session refuses a foreign cursor', async () => {
  const root = await fixture(),
    a: any = unwrap(await new (native as any).PagedNativeAdapter(root).open()),
    b: any = unwrap(await new (native as any).PagedNativeAdapter(root).open())
  try {
    const page = unwrap<any>(await a.query('object', { limit: 1 }))
    expect(page.cursor).toBeDefined()
    expect(
      unwrap<any>(await a.query('object', { limit: 1, cursor: page.cursor })).items[0].ref,
    ).toEqual(ref('B'))
    expect(await b.query('object', { limit: 1, cursor: page.cursor })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_CURSOR' },
    })
  } finally {
    await a.close()
    await b.close()
    await rm(root, { recursive: true, force: true })
  }
})
const context = {
  callerId: 'test',
  repositoryIds: ['R'],
  permissions: ['read', 'write', 'cascade'],
}
async function app(root: string) {
  return unwrap(
    await openRepository(new native.PagedNativeAdapter(root), context, { authorize: () => true }),
  )
}
it('v2-delta: commands use a pinned partial view without exporting the graph', async () => {
  const root = await fixture(
      Array.from({ length: 1100 }, (_, i) => object('N' + i)),
      [],
    ),
    session = await app(root)
  try {
    expect((await session.exportSnapshot()).ok).toBe(false)
    const current = unwrap(await session.getObject(ref('N0'))),
      { revision, ...body } = current
    const change = {
      repositoryId: 'R',
      idempotencyKey: 'rename',
      commands: [
        { op: 'updateObject', object: { ...body, name: 'Renamed' }, expectedRevision: revision },
      ],
    }
    expect((await session.validate(change)).errors).toEqual([])
    const result = unwrap(await session.applyChanges(change))
    expect(await session.applyChanges(change)).toEqual({ ok: true, value: result })
    expect(unwrap(await session.getObject(ref('N0'))).name).toBe('Renamed')
    expect(unwrap(await session.getObject(ref('N1099')))).toEqual(object('N1099'))
    await session.close()
    const reopened = await app(root)
    try {
      expect(unwrap(await reopened.getObject(ref('N0'))).name).toBe('Renamed')
    } finally {
      await reopened.close()
    }
  } finally {
    await session.close()
    await rm(root, { recursive: true, force: true })
  }
}, 30000)
it('v2-atomic: invalid batches and restricted deletions preserve the authoritative manifest', async () => {
  const root = await fixture(),
    session = await app(root)
  try {
    const before = await readFile(join(root, 'manifest.json'), 'utf8'),
      { revision, ...body } = object('A')
    expect(
      (
        await session.applyChanges({
          repositoryId: 'R',
          commands: [
            {
              op: 'updateObject',
              object: { ...body, name: 'Rejected' },
              expectedRevision: revision,
            },
            { op: 'deleteObject', ref: ref('B'), expectedRevision: 'r1' },
          ],
        })
      ).ok,
    ).toBe(false)
    expect(await readFile(join(root, 'manifest.json'), 'utf8')).toBe(before)
    unwrap(
      await session.applyChanges({
        repositoryId: 'R',
        requireAtomic: true,
        commands: [
          { op: 'deleteObject', ref: ref('B'), expectedRevision: 'r1', deletionPolicy: 'CASCADE' },
        ],
      }),
    )
    expect((await session.getObject(ref('B'))).ok).toBe(false)
    expect((await session.getRelation({ repositoryId: 'R', relationId: 'AB' })).ok).toBe(false)
    expect(unwrap(await session.getObject(ref('A')))).toEqual(object('A'))
  } finally {
    await session.close()
    await rm(root, { recursive: true, force: true })
  }
})
it('v2-conflict: two sessions cannot overwrite a committed manifest with a stale delta', async () => {
  const root = await fixture(),
    a = await app(root),
    b = await app(root)
  try {
    const { revision, ...body } = object('A')
    unwrap(
      await a.applyChanges({
        repositoryId: 'R',
        commands: [
          { op: 'updateObject', object: { ...body, name: 'Winner' }, expectedRevision: revision },
        ],
      }),
    )
    const before = await readFile(join(root, 'manifest.json'), 'utf8')
    expect(
      await b.applyChanges({
        repositoryId: 'R',
        commands: [
          { op: 'updateObject', object: { ...body, name: 'Loser' }, expectedRevision: revision },
        ],
      }),
    ).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } })
    expect(await readFile(join(root, 'manifest.json'), 'utf8')).toBe(before)
  } finally {
    await a.close()
    await b.close()
    await rm(root, { recursive: true, force: true })
  }
})
it('v2-routing: trusted native host selection opens v2 without changing v1 or accepting a browser path', async () => {
  const root = await fixture()
  try {
    const opened = unwrap(await new native.NativeAdapter(root).open())
    try {
      expect(opened.profile.adapterKind).toBe('native-v2')
      expect(unwrap(await opened.read('object', ref('A')))).toEqual(object('A'))
    } finally {
      await opened.close()
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
it('v2-export: semantic adoption requires acknowledgement and a distinct empty destination', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-v2-export-')),
    destination = await mkdtemp(join(tmpdir(), 'frade-v2-destination-'))
  try {
    await native.createNativeRepository(root, { repositoryId: 'R', displayName: 'Original' })
    const before = await readFile(join(root, 'repository.yaml'), 'utf8')
    expect(
      (
        await (native as any).exportNativeToPaged(root, destination, {
          acknowledgeSemanticOnly: false,
        })
      ).ok,
    ).toBe(false)
    const exported = unwrap<any>(
      await (native as any).exportNativeToPaged(root, destination, {
        acknowledgeSemanticOnly: true,
      }),
    )
    expect(exported.warnings).toContain('SOURCE_FORMAT_NOT_PRESERVED')
    expect(await readFile(join(root, 'repository.yaml'), 'utf8')).toBe(before)
    const opened = unwrap(await new native.PagedNativeAdapter(destination).open())
    await opened.close()
    expect(
      (
        await (native as any).exportNativeToPaged(root, destination, {
          acknowledgeSemanticOnly: true,
        })
      ).ok,
    ).toBe(false)
  } finally {
    await rm(root, { recursive: true, force: true })
    await rm(destination, { recursive: true, force: true })
  }
})
it('v2-events: confirmed changes precede notifications and external manifest changes support resync', async () => {
  const root = await fixture(),
    a = unwrap(await new native.PagedNativeAdapter(root).open()),
    b = unwrap(await new native.PagedNativeAdapter(root).open())
  try {
    expect(typeof a.subscribe).toBe('function')
    const events: string[] = [],
      refresh: string[] = []
    a.subscribe!(() => {
      throw Error('isolated subscriber')
    })
    a.subscribe!((e) => events.push(e.type))
    b.subscribe!((e) => refresh.push(e.type))
    const session = unwrap(
        await openRepository({ open: async () => ({ ok: true, value: a }) }, context, {
          authorize: () => true,
        }),
      ),
      { revision, ...body } = object('A')
    unwrap(
      await session.applyChanges({
        repositoryId: 'R',
        commands: [
          {
            op: 'updateObject',
            object: { ...body, name: 'Published' },
            expectedRevision: revision,
          },
        ],
      }),
    )
    expect(events).toContain('object.updated')
    const deadline = Date.now() + 5000
    while (!refresh.includes('repository.reloaded') && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 20))
    expect(refresh).toContain('repository.reloaded')
    expect(unwrap(await b.read('object', ref('A')))).toMatchObject({ name: 'Published' })
    await session.close()
    const count = events.length
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(events).toHaveLength(count)
  } finally {
    await a.close()
    await b.close()
    await rm(root, { recursive: true, force: true })
  }
})
it('v2-policies: declarative readonly and acyclic rules survive paged command boundaries', async () => {
  const root = await fixture()
  try {
    const profile = JSON.parse(await readFile(join(root, 'profile.json'), 'utf8'))
    await writeFile(
      join(root, 'profile.json'),
      JSON.stringify({ ...profile, policyPath: 'policy.json' }),
    )
    await writeFile(
      join(root, 'policy.json'),
      JSON.stringify({
        schemaVersion: 1,
        objectTypes: { 'sample:ApplicationSystem': { attributes: { status: { readOnly: true } } } },
        relationTypes: { 'sample:IntegrationFlow': { acyclic: true } },
      }),
    )
    const session = await app(root)
    try {
      const before = await readFile(join(root, 'manifest.json'), 'utf8'),
        { revision, ...body } = object('A')
      expect(
        (
          await session.applyChanges({
            repositoryId: 'R',
            commands: [
              {
                op: 'updateObject',
                object: { ...body, attributes: { status: 'used' } },
                expectedRevision: revision,
              },
            ],
          })
        ).ok,
      ).toBe(false)
      const { ref, typeId, source, target, attributes } = edge('BA', 'B', 'A'),
        cycle = { ref, typeId, source, target, attributes }
      expect(
        (
          await session.applyChanges({
            repositoryId: 'R',
            commands: [{ op: 'createRelation', relation: cycle }],
          })
        ).ok,
      ).toBe(false)
      expect(await readFile(join(root, 'manifest.json'), 'utf8')).toBe(before)
      unwrap(
        await session.applyChanges({
          repositoryId: 'R',
          commands: [
            {
              op: 'updateObject',
              object: { ...body, name: 'Allowed' },
              expectedRevision: revision,
            },
          ],
        }),
      )
    } finally {
      await session.close()
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
it('v2-attribute-references: cross-page attribute targets are checked on load and every delta', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-v2-refs-')),
    source = native.sampleMetamodel(),
    model = {
      ...source,
      definition: {
        ...source.definition,
        objectTypes: source.definition.objectTypes.map((t) =>
          t.id === 'sample:ApplicationSystem'
            ? {
                ...t,
                attributes: [
                  ...t.attributes,
                  {
                    id: 'owner',
                    schema: {
                      kind: 'reference' as const,
                      targets: { typeIds: ['sample:ApplicationSystem'], includeSubtypes: false },
                    },
                  },
                ],
              }
            : t,
        ),
      },
    }
  try {
    unwrap(
      await native.createPagedNativeRepository(root, {
        repositoryId: 'R',
        displayName: 'References',
        model,
        objects: stream([
          { ...object('A'), attributes: { status: 'created', owner: ref('B') } },
          object('B'),
        ]),
        relations: stream([]),
      }),
    )
    const session = await app(root)
    try {
      const before = await readFile(join(root, 'manifest.json'), 'utf8')
      expect(
        (
          await session.applyChanges({
            repositoryId: 'R',
            commands: [{ op: 'deleteObject', ref: ref('B'), expectedRevision: 'r1' }],
          })
        ).ok,
      ).toBe(false)
      expect(
        (
          await session.applyChanges({
            repositoryId: 'R',
            commands: [
              {
                op: 'updateObject',
                object: {
                  ref: ref('A'),
                  typeId: 'sample:ApplicationSystem',
                  name: 'A',
                  attributes: { status: 'created', owner: ref('missing') },
                },
                expectedRevision: 'r1',
              },
            ],
          })
        ).ok,
      ).toBe(false)
      expect(
        (
          await session.applyChanges({
            repositoryId: 'R',
            commands: [
              {
                op: 'updateObject',
                object: {
                  ref: ref('B'),
                  typeId: 'sample:BusinessProcess',
                  name: 'B',
                  attributes: {},
                },
                expectedRevision: 'r1',
              },
            ],
          })
        ).ok,
      ).toBe(false)
      expect(await readFile(join(root, 'manifest.json'), 'utf8')).toBe(before)
      const { revision, ...body } = object('A')
      unwrap(
        await session.applyChanges({
          repositoryId: 'R',
          commands: [{ op: 'updateObject', object: body, expectedRevision: revision }],
        }),
      )
      unwrap(
        await session.applyChanges({
          repositoryId: 'R',
          commands: [{ op: 'deleteObject', ref: ref('B'), expectedRevision: 'r1' }],
        }),
      )
    } finally {
      await session.close()
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
it('v2-stale-cursor: committed deltas invalidate old snapshot and changed-query continuation', async () => {
  const root = await fixture(),
    adapter = unwrap(await new native.PagedNativeAdapter(root).open()),
    session = unwrap(
      await openRepository({ open: async () => ({ ok: true, value: adapter }) }, context, {
        authorize: () => true,
      }),
    )
  try {
    const page = unwrap(await adapter.query('object', { limit: 1 }))
    expect(page.cursor).toBeDefined()
    expect(await adapter.query('object', { limit: 2, cursor: page.cursor })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_CURSOR' },
    })
    const { revision, ...body } = object('A')
    unwrap(
      await session.applyChanges({
        repositoryId: 'R',
        commands: [
          { op: 'updateObject', object: { ...body, name: 'Changed' }, expectedRevision: revision },
        ],
      }),
    )
    expect(await adapter.query('object', { limit: 1, cursor: page.cursor })).toMatchObject({
      ok: false,
      error: { code: 'STALE_CURSOR' },
    })
  } finally {
    await session.close()
    await rm(root, { recursive: true, force: true })
  }
})
it('v2-defensive-outcomes: callers cannot mutate retained commit results through reconciliation', async () => {
  const root = await fixture(),
    adapter = unwrap(await new native.PagedNativeAdapter(root).open()),
    session = unwrap(
      await openRepository({ open: async () => ({ ok: true, value: adapter }) }, context, {
        authorize: () => true,
      }),
    )
  try {
    const { revision, ...body } = object('A')
    unwrap(
      await session.applyChanges({
        repositoryId: 'R',
        idempotencyKey: 'copy',
        commands: [
          { op: 'updateObject', object: { ...body, name: 'Updated' }, expectedRevision: revision },
        ],
      }),
    )
    const found = unwrap(await adapter.writer!.lookup('copy'))
    if (found.status !== 'committed') throw Error('Missing commit')
    ;(found.result.changes[0].entity as any).name = 'Caller mutation'
    expect(await adapter.writer!.lookup('copy')).toMatchObject({
      ok: true,
      value: { status: 'committed', result: { changes: [{ entity: { name: 'Updated' } }] } },
    })
  } finally {
    await session.close()
    await rm(root, { recursive: true, force: true })
  }
})
it('v2-defensive-capabilities: verified operator collections cannot be edited by callers', async () => {
  const root = await fixture(),
    adapter = unwrap(await new native.PagedNativeAdapter(root).open())
  try {
    const operators = adapter.capabilities.supportedQueryOperators as string[]
    let pushed = false
    try {
      operators.push('invalid')
      pushed = true
    } catch {
      /* immutable as intended */
    }
    const corrupted = adapter.capabilities.supportedQueryOperators.includes('invalid')
    if (pushed) operators.pop()
    expect(corrupted).toBe(false)
  } finally {
    await adapter.close()
    await rm(root, { recursive: true, force: true })
  }
})
it('v2-operation-bounds: oversized operation identifiers cannot create unrecoverable journals', async () => {
  const root = await fixture(),
    session = await app(root)
  try {
    const before = await readFile(join(root, 'manifest.json'), 'utf8'),
      { revision, ...body } = object('A')
    expect(
      await session.applyChanges({
        repositoryId: 'R',
        idempotencyKey: '😀'.repeat(3000),
        commands: [
          {
            op: 'updateObject',
            object: { ...body, name: 'Too large key' },
            expectedRevision: revision,
          },
        ],
      }),
    ).toMatchObject({ ok: false, error: { code: 'RESOURCE_LIMIT' } })
    expect(await readFile(join(root, 'manifest.json'), 'utf8')).toBe(before)
    expect(await readdir(root)).not.toContain('.frade-v2-write.lock')
  } finally {
    await session.close()
    await rm(root, { recursive: true, force: true })
  }
})
it('v2-model-isolation: returned policy and binding cannot change validation authority', async () => {
  const root = await fixture()
  let adapter: Awaited<ReturnType<native.PagedNativeAdapter['open']>> | undefined
  try {
    const profile = JSON.parse(await readFile(join(root, 'profile.json'), 'utf8'))
    await writeFile(
      join(root, 'profile.json'),
      JSON.stringify({ ...profile, policyPath: 'policy.json' }),
    )
    await writeFile(
      join(root, 'policy.json'),
      JSON.stringify({
        schemaVersion: 1,
        objectTypes: { 'sample:ApplicationSystem': { attributes: { status: { readOnly: true } } } },
        relationTypes: {},
      }),
    )
    adapter = await new native.PagedNativeAdapter(root).open()
    const session = unwrap(adapter),
      before = session.model.modelId,
      view = session.model as any
    try {
      view.modelId = 'caller:model'
      view.policy.objectTypes['sample:ApplicationSystem'].attributes.status.readOnly = false
    } catch {
      /* frozen views are also valid */
    }
    expect(session.model.modelId).toBe(before)
    expect(
      session.model.policy?.objectTypes['sample:ApplicationSystem']?.attributes?.status?.readOnly,
    ).toBe(true)
  } finally {
    if (adapter?.ok) await adapter.value.close()
    await rm(root, { recursive: true, force: true })
  }
})
it('v2-reload-cursor: external reload keeps session scope and diagnoses a stale revision', async () => {
  const root = await fixture(),
    reader = unwrap(await new native.PagedNativeAdapter(root).open()),
    writer = await app(root)
  try {
    const page = unwrap(await reader.query('object', { limit: 1 })),
      { revision, ...body } = object('A')
    unwrap(
      await writer.applyChanges({
        repositoryId: 'R',
        commands: [
          { op: 'updateObject', object: { ...body, name: 'External' }, expectedRevision: revision },
        ],
      }),
    )
    unwrap(await reader.reload!())
    expect(await reader.query('object', { limit: 1, cursor: page.cursor })).toMatchObject({
      ok: false,
      error: { code: 'STALE_CURSOR' },
    })
  } finally {
    await writer.close()
    await reader.close()
    await rm(root, { recursive: true, force: true })
  }
})
