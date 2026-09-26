import { expect, it } from 'vitest'
import { mkdtemp, readFile, writeFile, rm, rename, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPagedNativeRepository, PagedNativeAdapter } from '../src/index'
const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw Error(JSON.stringify(r.error))
  return r.value
}
async function* empty() {}
it('v2-creation-bounds: creation refuses configuration too large to reopen', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-v2-config-size-'))
  try {
    expect(
      await createPagedNativeRepository(root, {
        repositoryId: 'R',
        displayName: 'x'.repeat(100001),
        objects: empty(),
        relations: empty(),
      }),
    ).toMatchObject({ ok: false, error: { code: 'RESOURCE_LIMIT' } })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
it('v2-containment: traversal mappings and symlinked page roots never access outside storage', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-v2-safe-')),
    outside = await mkdtemp(join(tmpdir(), 'frade-v2-outside-'))
  try {
    unwrap(
      await createPagedNativeRepository(root, {
        repositoryId: 'R',
        displayName: 'Safety',
        objects: empty(),
        relations: empty(),
      }),
    )
    const profileText = await readFile(join(root, 'profile.json'), 'utf8'),
      profile = JSON.parse(profileText)
    await writeFile(
      join(root, 'profile.json'),
      JSON.stringify({ ...profile, mapping: { format: 'json', sourceFile: '../outside.json' } }),
    )
    expect(await new PagedNativeAdapter(root).open()).toMatchObject({
      ok: false,
      error: { code: 'PROFILE_INVALID' },
    })
    await writeFile(join(root, 'profile.json'), profileText)
    await rename(join(root, 'pages'), join(outside, 'pages'))
    await symlink(
      join(outside, 'pages'),
      join(root, 'pages'),
      process.platform === 'win32' ? 'junction' : 'dir',
    )
    const escaped = await new PagedNativeAdapter(root).open()
    if (escaped.ok) await escaped.value.close()
    expect(escaped).toMatchObject({ ok: false, error: { code: 'ACCESS_DENIED' } })
  } finally {
    await rm(root, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  }
})
it('v2-boundaries: incompatible manifests, malformed profiles and cancelled opens never publish READY', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-v2-limits-'))
  try {
    unwrap(
      await createPagedNativeRepository(root, {
        repositoryId: 'R',
        displayName: 'Limits',
        objects: empty(),
        relations: empty(),
      }),
    )
    const profileText = await readFile(join(root, 'profile.json'), 'utf8'),
      manifestText = await readFile(join(root, 'manifest.json'), 'utf8'),
      manifest = JSON.parse(manifestText)
    for (const bad of [
      { ...manifest, formatVersion: 3 },
      { ...manifest, pages: [{ bucket: -1, hash: 'bad', count: 1, bytes: 1 }] },
      { ...manifest, pages: [{ bucket: 0, hash: 'a'.repeat(64), count: 8193, bytes: 1 }] },
      {
        ...manifest,
        pages: [{ bucket: 0, hash: 'a'.repeat(64), count: 1, bytes: 16 * 1024 * 1024 + 1 }],
      },
      {
        ...manifest,
        pages: [0, 0].map((bucket) => ({ bucket, hash: 'a'.repeat(64), count: 1, bytes: 1 })),
      },
      {
        ...manifest,
        pages: Array.from({ length: 4097 }, () => ({
          bucket: 0,
          hash: 'a'.repeat(64),
          count: 1,
          bytes: 1,
        })),
      },
    ]) {
      await writeFile(join(root, 'manifest.json'), JSON.stringify(bad))
      expect(await new PagedNativeAdapter(root).open()).toMatchObject({
        ok: false,
        error: { code: 'SCHEMA_INCOMPATIBLE' },
      })
      expect(await readFile(join(root, 'manifest.json'), 'utf8')).toBe(JSON.stringify(bad))
    }
    await writeFile(join(root, 'manifest.json'), manifestText)
    await writeFile(
      join(root, 'manifest.json'),
      JSON.stringify({
        ...manifest,
        pages: Array.from({ length: 1000 }, (_, bucket) => ({
          bucket,
          hash: 'a'.repeat(64),
          count: 8192,
          bytes: 1,
        })),
      }),
    )
    expect(await new PagedNativeAdapter(root).open()).toMatchObject({
      ok: false,
      error: { code: 'RESOURCE_LIMIT' },
    })
    await writeFile(join(root, 'manifest.json'), manifestText)
    for (const bad of [
      '{',
      'null',
      '[]',
      '{"schemaVersion":99}',
      '{"__proto__":{"polluted":true}}',
    ]) {
      await writeFile(join(root, 'profile.json'), bad)
      expect((await new PagedNativeAdapter(root).open()).ok).toBe(false)
    }
    await writeFile(join(root, 'profile.json'), profileText)
    expect(
      await new PagedNativeAdapter(root).open({
        isCancellationRequested: true,
        subscribe: () => () => {},
      }),
    ).toMatchObject({ ok: false, error: { code: 'CANCELLED' } })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
it('v2-errors: malformed profile and model failures retain their typed category', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-v2-errors-'))
  try {
    unwrap(
      await createPagedNativeRepository(root, {
        repositoryId: 'R',
        displayName: 'Errors',
        objects: empty(),
        relations: empty(),
      }),
    )
    const profile = await readFile(join(root, 'profile.json'), 'utf8')
    await writeFile(join(root, 'profile.json'), '{')
    expect(await new PagedNativeAdapter(root).open()).toMatchObject({
      ok: false,
      error: { code: 'PROFILE_INVALID' },
    })
    await writeFile(join(root, 'profile.json'), profile)
    await writeFile(join(root, 'metamodel.json'), '{')
    expect(await new PagedNativeAdapter(root).open()).toMatchObject({
      ok: false,
      error: { code: 'METAMODEL_INVALID' },
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
