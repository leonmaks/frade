import { expect, it } from 'vitest'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNativeRepository, createPagedNativeRepository } from '@frade/adapter-yaml'
import * as host from '../src/native-session'
it('Desktop controller opens only a host-picked root and exposes domain operations', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-desktop-repo-'))
  await createNativeRepository(root, { repositoryId: 'R', displayName: 'Desktop fixture' })
  const controller = new host.NativeRepositoryController(async () => root)
  try {
    expect((await controller.request({ operation: 'fs.read', path: root })).ok).toBe(false)
    expect(await controller.open()).toMatchObject({
      ok: true,
      value: { repositoryId: 'R', state: 'READY' },
    })
    expect(
      await controller.request({ version: 1, operation: 'capabilities', payload: {} }),
    ).toMatchObject({ ok: true, value: { canRead: true } })
    expect(
      (
        await controller.request({
          version: 1,
          operation: 'getObject',
          payload: { ref: { repositoryId: 'R', objectId: 'A' }, path: root },
        })
      ).ok,
    ).toBe(false)
  } finally {
    await controller.close()
    await rm(root, { recursive: true, force: true })
  }
})
it('Desktop host routes writable and read-only v2 without requesting a whole-snapshot index', async () => {
  for (const accessMode of ['read-write', 'read-only']) {
    const root = await mkdtemp(join(tmpdir(), 'frade-desktop-v2-'))
    let indexCalls = 0
    async function* empty() {}
    const created = await createPagedNativeRepository(root, {
      repositoryId: 'R',
      displayName: 'Paged',
      objects: empty(),
      relations: empty(),
    })
    expect(created.ok).toBe(true)
    const profile = JSON.parse(await readFile(join(root, 'profile.json'), 'utf8'))
    await writeFile(join(root, 'profile.json'), JSON.stringify({ ...profile, accessMode }))
    const controller = new host.NativeRepositoryController(
      async () => root,
      async () => {
        indexCalls++
        throw Error('Legacy snapshot index must not be requested')
      },
    )
    try {
      expect(await controller.open()).toMatchObject({
        ok: true,
        value: { state: accessMode === 'read-only' ? 'READ_ONLY' : 'READY', warnings: [] },
      })
      expect(indexCalls).toBe(0)
      expect(
        await controller.request({
          version: 1,
          operation: 'queryObjects',
          payload: { query: { limit: 1 } },
        }),
      ).toMatchObject({ ok: true, value: { items: [] } })
      expect(
        (
          await controller.request({
            version: 1,
            operation: 'queryObjects',
            payload: { query: { limit: 1 }, path: root },
          })
        ).ok,
      ).toBe(false)
    } finally {
      await controller.close()
      await rm(root, { recursive: true, force: true })
    }
  }
}, 10000)
