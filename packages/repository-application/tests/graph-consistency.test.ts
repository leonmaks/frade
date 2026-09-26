import { expect, it } from 'vitest'
import { success, type Revision } from '@frade/repository-domain'
import { memory, context, obj, deferred } from './fixtures/memory'
import { openRepository, CancellationSource } from '../src/index'
const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw Error(JSON.stringify(r.error))
  return r.value
}
it('CORE-006 traversal rejects a graph changed between point and adjacency reads', async () => {
  const f = await memory()
  f.replaceState({ ...f.state, objects: [{ ...obj(), revision: 'a1' as Revision }] })
  const s = unwrap(await openRepository(f.adapter, context)),
    read = f.session.read
  f.session.read = async (...args) => {
    const result = await read(...args)
    f.replaceState({ ...f.state, revision: 'concurrent' as Revision })
    return result
  }
  expect(await s.getSubgraph(obj().ref)).toMatchObject({
    ok: false,
    error: { code: 'REVISION_CONFLICT' },
  })
  await s.close()
})
it('CORE-006 cancellation releases a traversal waiting on uncooperative adjacency I/O', async () => {
  const f = await memory()
  f.replaceState({ ...f.state, objects: [{ ...obj(), revision: 'a1' as Revision }] })
  const s = unwrap(await openRepository(f.adapter, context)),
    query = f.session.query,
    started = deferred<void>(),
    io = deferred<any>()
  f.session.query = async (kind, q) => {
    if (kind === 'object') return query(kind, q)
    started.resolve()
    return io.promise
  }
  const token = new CancellationSource(),
    pending = s.getSubgraph(obj().ref, {}, token)
  await started.promise
  token.cancel()
  try {
    expect(
      await Promise.race([
        pending,
        new Promise((resolve) => setTimeout(() => resolve('not cancelled'), 100)),
      ]),
    ).toMatchObject({ ok: false, error: { code: 'CANCELLED' } })
  } finally {
    io.resolve(success({ items: [], revision: f.state.revision }))
    await s.close()
  }
})
it('RC-4 an idempotent validation failure retains the original structured diagnostics', async () => {
  const f = await memory(),
    s = unwrap(await openRepository(f.adapter, context, { authorize: () => true }))
  const request = {
    repositoryId: 'R',
    idempotencyKey: 'invalid',
    commands: [{ op: 'createObject', object: { ...obj(), attributes: { status: 'unknown' } } }],
  }
  const first = await s.applyChanges(request)
  expect(first.ok).toBe(false)
  if (!first.ok) expect(first.error.issues.length).toBeGreaterThan(0)
  expect(await s.applyChanges(request)).toEqual(first)
  expect(f.writes).toBe(0)
  await s.close()
})
