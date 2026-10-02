import { afterEach, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as native from '../src/index'
const fault = vi.hoisted(() => ({ enabled: false }))
vi.mock('node:fs/promises', async (original) => {
  const actual = await original<typeof import('node:fs/promises')>()
  return {
    ...actual,
    rename: async (...args: Parameters<typeof actual.rename>) => {
      if (fault.enabled && String(args[0]).includes('.frade-stage-')) throw Error('injected')
      return actual.rename(...args)
    },
  }
})
const roots: string[] = []
afterEach(async () => {
  fault.enabled = false
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})
async function staged() {
  const root = await mkdtemp(join(tmpdir(), 'frade-recover-service-'))
  roots.push(root)
  await native.createNativeRepository(root, { repositoryId: 'R', displayName: 'Recovery' })
  const opened = await new native.NativeAdapter(root).open()
  if (!opened.ok) throw Error('open')
  const snapshot = await opened.value.snapshot()
  if (!snapshot.ok) throw Error('snapshot')
  const entity = {
    ref: { repositoryId: 'R', objectId: 'A' },
    typeId: 'sample:ApplicationSystem',
    name: 'A',
    attributes: { status: 'created' },
    revision: 'pending' as any,
  }
  fault.enabled = true
  expect(
    await opened.value.writer!.commit({
      operationId: 'op',
      expectedRevision: snapshot.value.revision,
      candidate: { ...snapshot.value, objects: [entity] },
      changes: [{ kind: 'object', action: 'created', ref: entity.ref, entity }],
    }),
  ).toMatchObject({ ok: false, error: { code: 'RECOVERY_REQUIRED' } })
  fault.enabled = false
  await opened.value.close()
  return root
}
it('CORE-020 preview-bound recovery keeps source and preserves staged evidence without implicit replay', async () => {
  const root = await staged(),
    before = await readFile(join(root, 'repository.yaml'), 'utf8'),
    preview = await native.inspectNativeRecovery(root)
  expect(preview).toMatchObject({ ok: true, value: { phase: 'STAGED' } })
  if (!preview.ok) throw Error('preview')
  expect(
    await native.recoverNativeRepository(root, {
      expectedJournalHash: 'stale',
      strategy: 'keep-source',
    }),
  ).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } })
  const recovered = await native.recoverNativeRepository(root, {
    expectedJournalHash: preview.value.journalHash,
    strategy: 'keep-source',
  })
  expect(recovered.ok).toBe(true)
  expect(await readFile(join(root, 'repository.yaml'), 'utf8')).toBe(before)
  const opened = await new native.NativeAdapter(root).open()
  expect(opened.ok).toBe(true)
  if (opened.ok) {
    expect((await opened.value.read('object', { repositoryId: 'R', objectId: 'A' })).ok).toBe(false)
    await opened.value.close()
  }
  if (recovered.ok)
    expect(
      await readFile(join(root, recovered.value.evidenceDirectory, 'staged'), 'utf8'),
    ).toContain('objectId: A')
})
it('CORE-020 explicit completion validates stage and refuses a changed external source', async () => {
  const root = await staged(),
    preview = await native.inspectNativeRecovery(root)
  if (!preview.ok) throw Error('preview')
  const filename = join(root, 'repository.yaml'),
    before = await readFile(filename, 'utf8')
  await writeFile(filename, before + '\n# external\n')
  expect(
    await native.recoverNativeRepository(root, {
      expectedJournalHash: preview.value.journalHash,
      strategy: 'finish-staged',
    }),
  ).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } })
  expect(await readFile(filename, 'utf8')).toContain('# external')
  await writeFile(filename, before)
  expect(
    (
      await native.recoverNativeRepository(root, {
        expectedJournalHash: preview.value.journalHash,
        strategy: 'finish-staged',
      })
    ).ok,
  ).toBe(true)
  const opened = await new native.NativeAdapter(root).open()
  expect(opened.ok).toBe(true)
  if (opened.ok) {
    expect((await opened.value.read('object', { repositoryId: 'R', objectId: 'A' })).ok).toBe(true)
    await opened.value.close()
  }
})
