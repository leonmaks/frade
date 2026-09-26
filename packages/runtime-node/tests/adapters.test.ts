import { expect, it } from 'vitest'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import {
  createNativeRepository,
  createPagedNativeRepository,
  NativeAdapter,
} from '@frade/adapter-yaml'
import { failure, success } from '@frade/repository-domain'
import type { RepositoryAdapterSession } from '@frade/repository-ports'
import { createRepositoryAdapterRegistry, RepositoryAdapterRegistry } from '../src'
import { fixture, unwrap } from '../../adapter-sberea-yaml/tests/fixtures/synthetic'

it('SB-001 dispatches simultaneous sberea and native YAML roots explicitly and isolates unknown kinds', async () => {
  const f = await fixture()
  const sessions: RepositoryAdapterSession[] = []
  try {
    const nativeRoot = join(f.destination, 'native')
    await createNativeRepository(nativeRoot, { repositoryId: 'native', displayName: 'Native' })
    const before = await readFile(join(nativeRoot, 'repository.yaml'))
    const registry = createRepositoryAdapterRegistry()
    const grants = [
      { adapterKind: 'sberea', ...f.options },
      { adapterKind: 'native', dataRoot: nativeRoot, repositoryId: 'native' },
    ]
    const opened = await Promise.all(grants.map((g) => registry.open(g)))
    for (const result of opened) sessions.push(unwrap(result))
    expect(sessions.map((s) => s.profile.adapterKind)).toEqual(['sberea', 'native'])
    expect(unwrap(await sessions[0].snapshot()).objects).toHaveLength(2)
    expect(unwrap(await sessions[1].snapshot()).objects).toHaveLength(0)
    expect(await registry.open({ ...grants[0], adapterKind: 'unknown' })).toMatchObject({
      ok: false,
      error: { code: 'UNSUPPORTED_CAPABILITY', issues: [{ code: 'UNKNOWN_ADAPTER' }] },
    })
    expect((await sessions[1].snapshot()).ok).toBe(true)
    expect(await registry.open({ ...grants[0], adapterKind: 'native' })).toMatchObject({
      ok: false,
    })
    expect((await sessions[0].snapshot()).ok).toBe(true)
    expect(await readFile(join(nativeRoot, 'repository.yaml'))).toEqual(before)
  } finally {
    await Promise.all(sessions.map((s) => s.close()))
    await f.cleanup()
  }
})

it('SB-001 native registration retains native-v2 dispatch from its explicit profile', async () => {
  const f = await fixture()
  let session: RepositoryAdapterSession | undefined
  try {
    const root = join(f.destination, 'native-v2')
    unwrap(
      await createPagedNativeRepository(root, {
        repositoryId: 'v2',
        displayName: 'V2',
        objects: (async function* () {
          yield* []
        })(),
        relations: (async function* () {
          yield* []
        })(),
      }),
    )
    session = unwrap(
      await createRepositoryAdapterRegistry().open({
        adapterKind: 'native',
        dataRoot: root,
        repositoryId: 'v2',
      }),
    )
    expect(session.profile.adapterKind).toBe('native-v2')
    expect((await session.query('object', { limit: 1 })).ok).toBe(true)
  } finally {
    await session?.close()
    await f.cleanup()
  }
})

it('SB-001 accepts an injected factory without changing Core and isolates factory options', async () => {
  const f = await fixture()
  let session: RepositoryAdapterSession | undefined
  try {
    const root = join(f.destination, 'extension')
    await createNativeRepository(root, { repositoryId: 'extension', displayName: 'Extension' })
    const registry = createRepositoryAdapterRegistry()
    registry.register('custom-yaml', async (grant) => {
      expect(grant.settings).toEqual({ dialect: 'custom' })
      ;(grant.settings as Record<string, string>).dialect = 'mutated'
      return new NativeAdapter(grant.dataRoot).open()
    })
    const grant = {
      adapterKind: 'custom-yaml',
      dataRoot: root,
      repositoryId: 'extension',
      settings: { dialect: 'custom' },
    }
    session = unwrap(await registry.open(grant))
    expect(grant.settings.dialect).toBe('custom')
    expect(registry.kinds).toEqual(['custom-yaml', 'native', 'sberea'])
    expect(() => registry.register('custom-yaml', async () => failure('PROFILE_INVALID'))).toThrow(
      'already registered',
    )
    expect((await session.snapshot()).ok).toBe(true)
  } finally {
    await session?.close()
    await f.cleanup()
  }
})

it('SB-001 rejects incomplete sberea grants and closes a session returned for another repository', async () => {
  const f = await fixture()
  let closed = false
  try {
    const registry = createRepositoryAdapterRegistry()
    expect(
      await registry.open({ adapterKind: 'sberea', dataRoot: f.dataRoot, repositoryId: 'test' }),
    ).toMatchObject({ ok: false, error: { code: 'PROFILE_INVALID' } })
    const session = unwrap(await f.adapter().open()),
      close = session.close.bind(session)
    registry.register('mismatch', async () =>
      success({
        ...session,
        close: async () => {
          closed = true
          await close()
        },
      }),
    )
    expect(
      await registry.open({ adapterKind: 'mismatch', dataRoot: f.dataRoot, repositoryId: 'other' }),
    ).toMatchObject({ ok: false, error: { code: 'REPOSITORY_MISMATCH' } })
    expect(closed).toBe(true)
  } finally {
    await f.cleanup()
  }
})

it('SB-001 factory exceptions do not expose privileged paths or register a fallback', async () => {
  const registry = new RepositoryAdapterRegistry().register('broken', async () => {
    throw Error('E:/private/example')
  })
  const result = await registry.open({
    adapterKind: 'broken',
    repositoryId: 'test',
    dataRoot: 'E:/private',
  })
  expect(result).toMatchObject({ ok: false, error: { code: 'REPOSITORY_UNAVAILABLE' } })
  expect(JSON.stringify(result)).not.toContain('private')
  expect(registry.kinds).toEqual(['broken'])
  expect(() => registry.register('../arbitrary', async () => failure('PROFILE_INVALID'))).toThrow(
    'Invalid adapter kind',
  )
})
