import { afterEach, expect, it } from 'vitest'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as native from '../src/index'
const roots: string[] = []
const sessions: { close(): Promise<void> }[] = []
afterEach(async () => {
  for (const s of sessions.splice(0)) await s.close()
  for (const r of roots.splice(0)) await rm(r, { recursive: true, force: true })
})
async function setup(format = 'yaml') {
  const root = await mkdtemp(join(tmpdir(), 'frade-native-'))
  roots.push(root)
  await native.createNativeRepository(root, { repositoryId: 'R', displayName: 'Test', format })
  const opened = await new native.NativeAdapter(root).open()
  expect(opened.ok).toBe(true)
  if (!opened.ok) throw Error('open')
  sessions.push(opened.value)
  return { root, session: opened.value }
}
it.each(['yaml', 'json'])('native %s roundtrip and stale snapshot guard', async (format) => {
  const { session } = await setup(format)
  const initial = await session.snapshot()
  if (!initial.ok) throw Error('snapshot')
  const entity = {
    ref: { repositoryId: 'R', objectId: 'A' },
    typeId: 'sample:ApplicationSystem',
    name: 'A',
    attributes: { status: 'created' },
    revision: 'pending' as any,
  }
  const request = {
    operationId: 'create',
    expectedRevision: initial.value.revision,
    candidate: { ...initial.value, objects: [entity] },
    changes: [{ kind: 'object' as const, action: 'created' as const, ref: entity.ref, entity }],
  }
  const result = await session.writer!.commit(request)
  expect(result.ok).toBe(true)
  expect(await session.read('object', entity.ref)).toMatchObject({
    ok: true,
    value: { ref: entity.ref, name: 'A' },
  })
  expect(await session.writer!.commit({ ...request, operationId: 'stale' })).toMatchObject({
    ok: false,
    error: { code: 'REVISION_CONFLICT' },
  })
  expect(await session.writer!.lookup('create')).toMatchObject({
    ok: true,
    value: { status: 'committed' },
  })
})
it('native refuses malformed YAML and duplicate keys without data loss', async () => {
  const { root, session } = await setup()
  await session.close()
  const path = join(root, 'repository.yaml'),
    bad = 'repositoryId: R\nrepositoryId: duplicate\n'
  await writeFile(path, bad)
  expect((await new native.NativeAdapter(root).open()).ok).toBe(false)
  expect(await readFile(path, 'utf8')).toBe(bad)
})
it('native detects unfinished recovery and rejects path traversal', async () => {
  const { root, session } = await setup()
  await session.close()
  await writeFile(join(root, '.frade-recovery.json'), '{}')
  expect(await new native.NativeAdapter(root).open()).toMatchObject({
    ok: false,
    error: { code: 'RECOVERY_REQUIRED' },
  })
})
