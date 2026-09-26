import { afterEach, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NativeAdapter, createNativeRepository } from '../../adapter-yaml/src/index'
import { openRepository, type RepositorySession } from '../src/index'
import { context, obj } from './fixtures/memory'
const roots: string[] = [],
  sessions: RepositorySession[] = []
afterEach(async () => {
  for (const session of sessions.splice(0)) await session.close()
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})
async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'frade-watch-'))
  roots.push(root)
  await createNativeRepository(root, { repositoryId: 'R', displayName: 'Watch', format: 'json' })
  const opened = await openRepository(new NativeAdapter(root), context, { authorize: () => true })
  if (!opened.ok) throw Error(opened.error.code)
  sessions.push(opened.value)
  return { root, session: opened.value }
}
it('CORE-013 real watcher detects source corruption, blocks writes and recovers after correction', async () => {
  const { root, session } = await setup(),
    file = join(root, 'repository.json'),
    before = await readFile(file, 'utf8')
  const events: any[] = []
  session.subscribe((event) => events.push(event))
  await writeFile(file, 'invalid JSON')
  await vi.waitFor(() => expect(session.state).toBe('DEGRADED'), { timeout: 3000 })
  expect(
    await session.applyChanges({
      repositoryId: 'R',
      commands: [{ op: 'createObject', object: obj() }],
    }),
  ).toMatchObject({ ok: false, error: { code: 'RECOVERY_REQUIRED' } })
  expect(await readFile(file, 'utf8')).toBe('invalid JSON')
  await writeFile(file, before)
  await vi.waitFor(() => expect(session.state).toBe('READY'), { timeout: 3000 })
  expect(events.some((e) => e.state === 'DEGRADED')).toBe(true)
  expect(events.some((e) => e.state === 'READY')).toBe(true)
  expect(
    (
      await session.applyChanges({
        repositoryId: 'R',
        commands: [{ op: 'createObject', object: obj() }],
      })
    ).ok,
  ).toBe(true)
})
it('CORE-013 watches model/profile changes without an explicit reload', async () => {
  const { root, session } = await setup(),
    events: any[] = []
  session.subscribe((event) => events.push(event))
  const modelPath = join(root, 'metamodel.json'),
    model = JSON.parse(await readFile(modelPath, 'utf8'))
  model.definition.objectTypes.push({ id: 'sample:Capability', attributes: [] })
  await writeFile(modelPath, JSON.stringify(model))
  await vi.waitFor(() => expect(events.some((e) => e.type === 'metamodel.changed')).toBe(true), {
    timeout: 3000,
  })
  const profilePath = join(root, 'profile.json'),
    profile = JSON.parse(await readFile(profilePath, 'utf8'))
  profile.accessMode = 'read-only'
  await writeFile(profilePath, JSON.stringify(profile))
  await vi.waitFor(() => expect(session.state).toBe('READ_ONLY'), { timeout: 3000 })
  expect(session.capabilities.canWrite).toBe(false)
  const count = events.length
  await session.close()
  await writeFile(modelPath, JSON.stringify(model) + '\n')
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(events).toHaveLength(count)
})
