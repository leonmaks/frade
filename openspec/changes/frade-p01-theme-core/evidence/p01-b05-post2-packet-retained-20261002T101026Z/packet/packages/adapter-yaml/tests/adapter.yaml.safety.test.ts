import { afterEach, expect, it } from 'vitest'
import { mkdtemp, readFile, writeFile, rm, mkdir, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NativeAdapter, createNativeRepository } from '../src/index'
const roots: string[] = []
const sessions: { close(): Promise<void> }[] = []
afterEach(async () => {
  for (const s of sessions.splice(0)) await s.close()
  for (const r of roots.splice(0)) await rm(r, { recursive: true, force: true })
})
async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'frade-safety-'))
  roots.push(root)
  await createNativeRepository(root, { repositoryId: 'R', displayName: 'Safety' })
  const opened = await new NativeAdapter(root).open()
  if (!opened.ok) throw Error('open')
  sessions.push(opened.value)
  return { root, session: opened.value }
}
it('writer rejects a changes list that differs from the validated candidate', async () => {
  const { root, session } = await setup(),
    snapshot = await session.snapshot()
  if (!snapshot.ok) throw Error('snapshot')
  const before = await readFile(join(root, 'repository.yaml'), 'utf8'),
    entity = {
      ref: { repositoryId: 'R', objectId: 'A' },
      typeId: 'sample:ApplicationSystem',
      name: 'A',
      attributes: { status: 'unknown' },
      revision: 'pending' as any,
    }
  const result = await session.writer!.commit({
    operationId: 'mismatch',
    expectedRevision: snapshot.value.revision,
    candidate: snapshot.value,
    changes: [{ kind: 'object', action: 'created', ref: entity.ref, entity }],
  })
  expect(result.ok).toBe(false)
  expect(await readFile(join(root, 'repository.yaml'), 'utf8')).toBe(before)
})
it('anchors are readable but unsafe structure transformations are refused', async () => {
  const { root, session } = await setup()
  await session.close()
  const filename = join(root, 'repository.yaml'),
    source =
      (await readFile(filename, 'utf8')) +
      '\nmetadata: &anchor\n  vendor: retained\nother: *anchor\n'
  await writeFile(filename, source)
  const reopened = await new NativeAdapter(root).open()
  expect(reopened.ok).toBe(true)
  if (!reopened.ok) throw Error('open')
  sessions.push(reopened.value)
  const snapshot = await reopened.value.snapshot()
  if (!snapshot.ok) throw Error('snapshot')
  expect(
    await reopened.value.writer!.commit({
      operationId: 'unsafe',
      expectedRevision: snapshot.value.revision,
      candidate: snapshot.value,
      changes: [],
    }),
  ).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED_CAPABILITY' } })
  expect(await readFile(filename, 'utf8')).toBe(source)
})
it('a directory junction cannot escape the configured source root', async () => {
  const { root, session } = await setup()
  await session.close()
  const outside = await mkdtemp(join(tmpdir(), 'frade-outside-'))
  roots.push(outside)
  await writeFile(join(outside, 'source.yaml'), 'protected')
  await mkdir(join(root, 'allowed'))
  await symlink(outside, join(root, 'allowed', 'escape'), 'junction')
  const path = join(root, 'profile.json'),
    profile = JSON.parse(await readFile(path, 'utf8'))
  profile.mapping.sourceFile = 'allowed/escape/source.yaml'
  await writeFile(path, JSON.stringify(profile))
  expect((await new NativeAdapter(root).open()).ok).toBe(false)
  expect(await readFile(join(outside, 'source.yaml'), 'utf8')).toBe('protected')
})
