import { expect, it } from 'vitest'
import { readFile, writeFile, stat, rename, mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { openRepository } from '@frade/repository-application'
import { fixture, unwrap, update, schema } from './fixtures/synthetic'
import type { SbereaSession } from '../src'
import type { JsonValue } from '@frade/repository-domain'

const context = { callerId: 'test', repositoryIds: ['test'], permissions: ['read', 'write'] }

it('KA-005 permits existing diagnostics and repairs but rejects changed invalid values and references', async () => {
  const f = await fixture()
  let session: SbereaSession | undefined
  try {
    session = unwrap(await f.adapter().open())
    const core = unwrap(
      await openRepository(
        { open: async () => ({ ok: true as const, value: session! }) },
        context,
        { authorize: () => true },
      ),
    )
    const initial = unwrap(await session.snapshot()),
      a = initial.objects[0]
    const initialDiagnostics = session.inspect().diagnostics
    expect(initialDiagnostics.map((d) => d.code)).toContain('UNRESOLVED_REFERENCE')
    expect(initialDiagnostics.length).toBeGreaterThanOrEqual(2)
    const path = join(f.dataRoot, 'objects.yaml')
    for (const changes of [
      { status: 'another-invalid' },
      { parent: { repositoryId: 'test', objectId: 'another-missing' } },
      { count: -1 },
    ] as Record<string, JsonValue>[]) {
      const before = await readFile(path)
      const result = await core.applyChanges({
        repositoryId: 'test',
        commands: [update(a, { ...a.attributes, ...changes })],
      })
      expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } })
      expect(await readFile(path)).toEqual(before)
    }
    unwrap(
      await core.applyChanges({
        repositoryId: 'test',
        commands: [update(a, { ...a.attributes, description: 'allowed' })],
      }),
    )
    expect(session.inspect().diagnostics).toEqual(initialDiagnostics)
    const current = unwrap(await core.getObject(a.ref))
    unwrap(
      await core.applyChanges({
        repositoryId: 'test',
        commands: [
          update(current, {
            ...current.attributes,
            status: 'active',
            parent: { repositoryId: 'test', objectId: 'b' },
          }),
        ],
      }),
    )
    expect(session.inspect().diagnostics).toEqual([])
    const repaired = unwrap(await core.getObject(a.ref))
    expect(
      await core.applyChanges({
        repositoryId: 'test',
        commands: [update(repaired, { ...repaired.attributes, status: 'invalid' })],
      }),
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } })
    expect(unwrap(await session.snapshot()).relations[0].target.objectId).toBe('b')
    await core.close()
  } finally {
    await session?.close()
    await f.cleanup()
  }
})

it('KA-003 saves nested/list/reference/optional values, preserves neighbours and no-op mtime, and reopens from disk', async () => {
  const source =
    "\uFEFF# header\r\nsystems:\r\n  a:\r\n    title: A\r\n    count: 2 # number\r\n    enabled: true\r\n    optional: old\r\n    nested: {value: 1, untouched: 'quoted'}\r\n    links: [b]\r\n    mystery: [ 0, false, \"\" ] # extra\r\n  b: {title: 'B'} # neighbour\r\n"
  const f = await fixture(source)
  let session: SbereaSession | undefined
  try {
    session = unwrap(await f.adapter().open())
    const core = unwrap(
      await openRepository(
        { open: async () => ({ ok: true as const, value: session! }) },
        context,
        { authorize: () => true },
      ),
    )
    const a = unwrap(await session.snapshot()).objects[0]
    const rest = { ...a.attributes }
    delete rest.optional
    const attributes = {
      ...rest,
      count: 0,
      enabled: false,
      nested: { value: 5, untouched: 'quoted' },
      links: [
        { repositoryId: 'test', objectId: 'b' },
        { repositoryId: 'test', objectId: 'b' },
      ],
      empty: '',
      explicitNull: null,
    }
    unwrap(await core.applyChanges({ repositoryId: 'test', commands: [update(a, attributes)] }))
    const path = join(f.dataRoot, 'objects.yaml'),
      saved = await readFile(path, 'utf8')
    expect(saved.startsWith('\uFEFF# header\r\n')).toBe(true)
    expect(saved).toContain("  b: {title: 'B'} # neighbour\r\n")
    expect(saved).toContain('    mystery: [ 0, false, "" ] # extra\r\n')
    expect(saved).toContain("untouched: 'quoted'")
    expect(saved).not.toContain('repositoryId')
    expect(saved.replaceAll('\r\n', '')).not.toContain('\n')
    const current = unwrap(await core.getObject(a.ref)),
      mtime = (await stat(path)).mtimeMs
    expect(
      unwrap(
        await core.applyChanges({
          repositoryId: 'test',
          commands: [update(current, current.attributes)],
        }),
      ).changes,
    ).toEqual([])
    expect((await stat(path)).mtimeMs).toBe(mtime)
    await core.close()
    session = unwrap(await f.adapter().open())
    expect(unwrap(await session.read('object', a.ref)).attributes).toEqual(attributes)
    expect(await readFile(join(f.dataRoot, 'root.yaml'), 'utf8')).toBe(
      'imports: [objects.yaml]\nsber: {keep: true}\nunknown: {retain: 0}\n',
    )
  } finally {
    await session?.close()
    await f.cleanup()
  }
})

it.each(['file', 'model', 'object'] as const)(
  'KA-004 rejects stale %s revisions without overwriting sources',
  async (kind) => {
    const f = await fixture()
    let session: SbereaSession | undefined
    try {
      session = unwrap(await f.adapter().open())
      const core = unwrap(
        await openRepository(
          { open: async () => ({ ok: true as const, value: session! }) },
          context,
          { authorize: () => true },
        ),
      )
      const a = unwrap(await session.snapshot()).objects[0],
        path = join(f.dataRoot, 'objects.yaml')
      if (kind === 'file') await writeFile(path, (await readFile(path, 'utf8')) + '# external\n')
      if (kind === 'model')
        await writeFile(
          join(f.metadataRoot, 'schema.yaml'),
          JSON.stringify({ ...schema, marker: 'changed' }),
        )
      const before = await readFile(path)
      const command = update(a, { ...a.attributes, description: 'must not persist' })
      const result = await core.applyChanges({
        repositoryId: 'test',
        commands: [kind === 'object' ? { ...command, expectedRevision: 'stale' } : command],
      })
      expect(result).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } })
      expect(await readFile(path)).toEqual(before)
      await core.close()
    } finally {
      await session?.close()
      await f.cleanup()
    }
  },
)

it.each(['alias', 'tag'])(
  'KA-003 rejects edits to unsupported %s sources before any file change',
  async (kind) => {
    const source =
      kind === 'alias'
        ? 'systems:\n  a: &a {title: A}\n  b: *a\n'
        : 'systems:\n  a: {title: A, extra: !custom value}\n'
    const f = await fixture(source)
    let session: SbereaSession | undefined
    try {
      session = unwrap(await f.adapter().open())
      expect(session.inspect().locators.every((l) => !l.writable)).toBe(true)
      const core = unwrap(
        await openRepository(
          { open: async () => ({ ok: true as const, value: session! }) },
          context,
          { authorize: () => true },
        ),
      )
      const a = unwrap(await session.snapshot()).objects[0]
      expect(
        await core.applyChanges({
          repositoryId: 'test',
          commands: [update(a, { ...a.attributes, description: 'edit' })],
        }),
      ).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED_CAPABILITY' } })
      expect(await readFile(join(f.dataRoot, 'objects.yaml'), 'utf8')).toBe(source)
      await core.close()
    } finally {
      await session?.close()
      await f.cleanup()
    }
  },
)

it('KA-004 rechecks guards after staging and leaves external changes and recovery evidence intact', async () => {
  const f = await fixture()
  let session: SbereaSession | undefined
  const path = join(f.dataRoot, 'objects.yaml'),
    source = await readFile(path, 'utf8')
  try {
    session = unwrap(
      await f
        .adapter({
          writeBarrier: async (phase) => {
            if (phase === 'staged') await writeFile(path, source + '# concurrent writer\n')
          },
        })
        .open(),
    )
    const core = unwrap(
      await openRepository(
        { open: async () => ({ ok: true as const, value: session! }) },
        context,
        { authorize: () => true },
      ),
    )
    const a = unwrap(await session.snapshot()).objects[0]
    expect(
      await core.applyChanges({
        repositoryId: 'test',
        commands: [update(a, { ...a.attributes, description: 'edit' })],
      }),
    ).toMatchObject({ ok: false, error: { code: 'RECOVERY_REQUIRED' } })
    expect(await readFile(path, 'utf8')).toBe(source + '# concurrent writer\n')
    expect(await readdir(f.dataRoot)).toContain('.frade-sberea-recovery.json')
    await core.close()
  } finally {
    await session?.close()
    await f.cleanup()
  }
})

it('KA-004 retains evidence if replacement fails, without damaging the original file', async () => {
  const f = await fixture()
  let session: SbereaSession | undefined
  const path = join(f.dataRoot, 'objects.yaml'),
    source = await readFile(path, 'utf8')
  try {
    session = unwrap(
      await f
        .adapter({
          writeBarrier: async (phase) => {
            if (phase === 'staged') {
              const staged = (await readdir(f.dataRoot)).find(
                (n) => n.startsWith('.frade-') && n.endsWith('.tmp'),
              )!
              await rename(join(f.dataRoot, staged), join(f.dataRoot, staged + '.evidence'))
            }
          },
        })
        .open(),
    )
    const core = unwrap(
      await openRepository(
        { open: async () => ({ ok: true as const, value: session! }) },
        context,
        { authorize: () => true },
      ),
    )
    const a = unwrap(await session.snapshot()).objects[0]
    expect(
      await core.applyChanges({
        repositoryId: 'test',
        commands: [update(a, { ...a.attributes, description: 'edit' })],
      }),
    ).toMatchObject({ ok: false, error: { code: 'RECOVERY_REQUIRED' } })
    expect(await readFile(path, 'utf8')).toBe(source)
    expect(await readdir(f.dataRoot)).toContain('.frade-sberea-recovery.json')
    await core.close()
  } finally {
    await session?.close()
    await f.cleanup()
  }
})

it('KA-004 refuses multi-file atomic changes without partially saving either file', async () => {
  const f = await fixture('systems:\n  a: {title: A}\n')
  let session: SbereaSession | undefined
  try {
    await mkdir(join(f.dataRoot, 'other'))
    await writeFile(join(f.dataRoot, 'other/b.yaml'), 'systems:\n  b: {title: B}\n')
    await writeFile(join(f.dataRoot, 'root.yaml'), 'imports: [objects.yaml, other/b.yaml]\n')
    session = unwrap(await f.adapter().open())
    const core = unwrap(
      await openRepository(
        { open: async () => ({ ok: true as const, value: session! }) },
        context,
        { authorize: () => true },
      ),
    )
    const objects = unwrap(await session.snapshot()).objects
    const before = await Promise.all(
      ['objects.yaml', 'other/b.yaml'].map((p) => readFile(join(f.dataRoot, p))),
    )
    expect(
      await core.applyChanges({
        repositoryId: 'test',
        requireAtomic: true,
        commands: objects.map((o) => update(o, { ...o.attributes, description: 'edit' })),
      }),
    ).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED_CAPABILITY' } })
    expect(
      await Promise.all(['objects.yaml', 'other/b.yaml'].map((p) => readFile(join(f.dataRoot, p)))),
    ).toEqual(before)
    await core.close()
  } finally {
    await session?.close()
    await f.cleanup()
  }
})
it('KA-002 projects cycles and duplicate references with stable IDs across list reorder and atomic graph refresh', async () => {
  const f = await fixture(
    'systems:\n  a: {title: A, parent: b, links: [b, a, b]}\n  b: {title: B, parent: a}\n',
  )
  let session: SbereaSession | undefined
  try {
    session = unwrap(await f.adapter().open())
    const before = unwrap(await session.snapshot())
    expect(before.objects).toHaveLength(2)
    expect(before.relations).toHaveLength(5)
    expect(new Set(before.relations.map((r) => r.ref.relationId)).size).toBe(5)
    expect(before.relations.filter((r) => r.attributes.parent)).toHaveLength(2)
    const core = unwrap(
      await openRepository(
        { open: async () => ({ ok: true as const, value: session! }) },
        context,
        { authorize: () => true },
      ),
    )
    const a = before.objects[0]
    unwrap(
      await core.applyChanges({
        repositoryId: 'test',
        commands: [
          update(a, {
            ...a.attributes,
            links: [
              { repositoryId: 'test', objectId: 'a' },
              { repositoryId: 'test', objectId: 'b' },
              { repositoryId: 'test', objectId: 'b' },
            ],
          }),
        ],
      }),
    )
    const after = unwrap(await session.snapshot())
    expect(after.relations.map((r) => r.ref.relationId).sort()).toEqual(
      before.relations.map((r) => r.ref.relationId).sort(),
    )
    const current = unwrap(await core.getObject(a.ref))
    unwrap(
      await core.applyChanges({
        repositoryId: 'test',
        commands: [update(current, { ...current.attributes, links: [] })],
      }),
    )
    const latest = unwrap(await session.snapshot())
    expect(latest.relations).toHaveLength(2)
    const edge = latest.relations[0]
    expect(
      await core.applyChanges({
        repositoryId: 'test',
        commands: [{ op: 'deleteRelation', ref: edge.ref, expectedRevision: edge.revision }],
      }),
    ).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED_CAPABILITY' } })
    expect(unwrap(await session.snapshot()).relations).toHaveLength(2)
    await core.close()
  } finally {
    await session?.close()
    await f.cleanup()
  }
})

it('KA-001/DS-002 read-only Core supports point lookup and paging and refuses writes without changing bytes', async () => {
  const f = await fixture()
  let session: SbereaSession | undefined
  try {
    const source = await readFile(join(f.dataRoot, 'objects.yaml'))
    session = unwrap(await f.adapter({ readOnly: true }).open())
    const core = unwrap(
      await openRepository(
        { open: async () => ({ ok: true as const, value: session! }) },
        context,
        { authorize: () => true },
      ),
    )
    expect(core.capabilities.canWrite).toBe(false)
    const first = unwrap(await core.queryObjects({ limit: 1 })),
      second = unwrap(await core.queryObjects({ limit: 1, cursor: first.cursor }))
    expect(first.items).toHaveLength(1)
    expect(second.items).toHaveLength(1)
    const a = unwrap(await core.getObject(first.items[0].ref!))
    expect(a.attributes).toEqual(
      unwrap(await session.snapshot()).objects.find((o) => o.ref.objectId === a.ref.objectId)!
        .attributes,
    )
    expect(
      await core.applyChanges({
        repositoryId: 'test',
        commands: [update(a, { ...a.attributes, description: 'not allowed' })],
      }),
    ).toMatchObject({ ok: false, error: { code: 'REPOSITORY_READ_ONLY' } })
    await core.close()
    expect(await readFile(join(f.dataRoot, 'objects.yaml'))).toEqual(source)
  } finally {
    await session?.close()
    await f.cleanup()
  }
})
