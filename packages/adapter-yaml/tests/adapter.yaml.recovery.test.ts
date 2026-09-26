import { afterEach, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NativeAdapter, createNativeRepository } from '../src/index'
import type { RepositoryAdapterSession, CommitRequest } from '@frade/repository-ports'
import type { Revision } from '@frade/repository-domain'

const barrier = vi.hoisted(() => ({ beforeRename: undefined as undefined | (() => Promise<void>) }))
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    rename: async (...args: Parameters<typeof actual.rename>) => {
      await barrier.beforeRename?.()
      return actual.rename(...args)
    },
  }
})
const roots: string[] = [],
  sessions: RepositoryAdapterSession[] = []
afterEach(async () => {
  barrier.beforeRename = undefined
  for (const session of sessions.splice(0)) await session.close()
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'frade-recovery-'))
  roots.push(root)
  await createNativeRepository(root, { repositoryId: 'R', displayName: 'Recovery' })
  const opened = await new NativeAdapter(root).open()
  if (!opened.ok) throw Error(opened.error.code)
  const session = opened.value
  sessions.push(session)
  const snapshot = await session.snapshot()
  if (!snapshot.ok) throw Error(snapshot.error.code)
  const entity = {
    ref: { repositoryId: 'R', objectId: 'A' },
    typeId: 'sample:ApplicationSystem',
    name: 'A',
    attributes: { status: 'created' },
    revision: 'pending' as Revision,
  }
  const request: CommitRequest = {
    operationId: 'recovery-test',
    expectedRevision: snapshot.value.revision,
    candidate: { ...snapshot.value, objects: [entity] },
    changes: [{ kind: 'object', action: 'created', ref: entity.ref, entity }],
  }
  return { root, session, request }
}
it('failed replacement retains staged recovery evidence and authoritative source bytes', async () => {
  const { root, session, request } = await fixture(),
    before = await readFile(join(root, 'repository.yaml'), 'utf8')
  barrier.beforeRename = async () => {
    throw Error('injected replacement failure')
  }
  expect(await session.writer!.commit(request)).toMatchObject({
    ok: false,
    error: { code: 'RECOVERY_REQUIRED' },
  })
  expect(await readFile(join(root, 'repository.yaml'), 'utf8')).toBe(before)
  const journal = JSON.parse(await readFile(join(root, '.frade-recovery.json'), 'utf8'))
  expect(journal.operationId).toBe(request.operationId)
  expect(await readFile(join(root, journal.stagedFile), 'utf8')).toContain('objectId: A')
  expect(await readdir(root)).toContain('.frade-write.lock')
  await session.close()
  expect(await new NativeAdapter(root).open()).toMatchObject({
    ok: false,
    error: { code: 'RECOVERY_REQUIRED' },
  })
})
it('close waits for the already dispatched filesystem write and stops accepting new work', async () => {
  const { session, request } = await fixture()
  let entered!: () => void, release!: () => void
  const reached = new Promise<void>((resolve) => {
      entered = resolve
    }),
    gate = new Promise<void>((resolve) => {
      release = resolve
    })
  barrier.beforeRename = async () => {
    entered()
    await gate
  }
  const write = session.writer!.commit(request)
  await reached
  let closed = false
  const closing = session.close().then(() => {
    closed = true
  })
  try {
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(closed).toBe(false)
    expect(await session.read('object', { repositoryId: 'R', objectId: 'A' })).toMatchObject({
      ok: false,
      error: { code: 'SESSION_CLOSED' },
    })
  } finally {
    release()
    await write
    await closing
  }
  expect(closed).toBe(true)
})
