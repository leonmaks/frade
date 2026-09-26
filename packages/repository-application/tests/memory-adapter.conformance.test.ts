import { expect, it } from 'vitest'
import { type Revision } from '@frade/repository-domain'
import { type CommitRequest } from '@frade/repository-ports'
import { memory, obj, deferred } from './fixtures/memory'
const request = (f: Awaited<ReturnType<typeof memory>>, ids = ['A']): CommitRequest => {
  const objects = ids.map((id) => ({ ...obj(id), revision: 'pending' as Revision }))
  return {
    operationId: 'op',
    expectedRevision: f.state.revision,
    candidate: { ...f.state, objects: [...f.state.objects, ...objects] },
    changes: objects.map((entity) => ({
      kind: 'object',
      action: 'created',
      ref: entity.ref,
      entity,
    })),
  }
}
it('RP-4 memory adapter independently enforces create-if-absent and snapshot preconditions', async () => {
  const f = await memory()
  const first = request(f)
  expect((await f.session.writer!.commit(first)).ok).toBe(true)
  const before = f.state
  expect(await f.session.writer!.commit(request(f))).toMatchObject({
    ok: false,
    error: { code: 'REVISION_CONFLICT' },
  })
  expect(
    await f.session.writer!.commit({ ...request(f, ['B']), expectedRevision: 'r0' }),
  ).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } })
  expect(f.state).toEqual(before)
  await f.session.close()
})
it('RP-4 memory adapter rejects mutations hidden from the change list', async () => {
  const f = await memory(),
    r = request(f),
    before = f.state
  expect((await f.session.writer!.commit({ ...r, changes: [] })).ok).toBe(false)
  expect(f.state).toEqual(before)
  await f.session.close()
})
it('RP-4 single-resource adapter rejects multi-entity dispatch while readonly has no writer', async () => {
  const f = await memory({ writeMode: 'single' }),
    before = f.state
  expect(await f.session.writer!.commit(request(f, ['A', 'B']))).toMatchObject({
    ok: false,
    error: { code: 'UNSUPPORTED_CAPABILITY' },
  })
  expect(f.state).toEqual(before)
  await f.session.close()
  const readonly = await memory({ writeMode: 'read-only' })
  expect(readonly.session.writer).toBeUndefined()
  await readonly.session.close()
})
it('RP-4 atomic adapter rolls back a failure at the second staged entity', async () => {
  const f = await memory({ failChange: 1 } as any),
    before = f.state
  expect(await f.session.writer!.commit(request(f, ['A', 'B']))).toMatchObject({
    ok: false,
    error: { code: 'WRITE_FAILED' },
  })
  expect(f.state).toEqual(before)
  expect(await f.session.writer!.lookup('op')).toMatchObject({
    ok: true,
    value: { status: 'not-committed' },
  })
  await f.session.close()
})
it('RP-4 controlled competing writes recheck the revision inside the commit boundary', async () => {
  const gate = deferred<void>(),
    started = deferred<void>()
  let calls = 0
  const f = await memory({
    beforeCommit: async () => {
      if (++calls === 1) {
        started.resolve()
        await gate.promise
      }
    },
  } as any)
  const first = f.session.writer!.commit(request(f))
  await started.promise
  expect((await f.session.writer!.commit({ ...request(f, ['B']), operationId: 'other' })).ok).toBe(
    true,
  )
  gate.resolve()
  expect(await first).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } })
  expect(f.state.objects.map((o) => o.ref.objectId)).toEqual(['B'])
  await f.session.close()
}, 1000)
