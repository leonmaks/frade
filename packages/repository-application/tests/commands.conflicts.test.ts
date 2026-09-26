import { expect, it } from 'vitest'
import fc from 'fast-check'
import { success } from '@frade/repository-domain'
import { openRepository, CancellationSource } from '../src/index'
import { memory, obj, context, deferred } from './fixtures/memory'
const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }) => {
  if (!r.ok) throw Error(JSON.stringify(r.error))
  return r.value
}
const command = (id = 'A', key = 'op') => ({
  repositoryId: 'R',
  idempotencyKey: key,
  commands: [{ op: 'createObject', object: obj(id) }],
})
it('RC-1 missing authorization policy denies writes despite write permission', async () => {
  const fixture = await memory(),
    session = unwrap(await openRepository(fixture.adapter, context))
  expect(await session.applyChanges(command())).toMatchObject({
    ok: false,
    error: { code: 'ACCESS_DENIED' },
  })
  expect(fixture.writes).toBe(0)
  await session.close()
})
it('RC-3 acknowledges only the requested entity body', async () => {
  const fixture = await memory(),
    session = unwrap(await openRepository(fixture.adapter, context, { authorize: () => true })),
    writer = fixture.session.writer!.commit
  fixture.session.writer!.commit = async (request) => {
    const result = await writer(request)
    if (!result.ok) return result
    return success({
      ...result.value,
      changes: result.value.changes.map((change) => ({
        ...change,
        entity: change.entity && { ...change.entity, attributes: { status: 'used' } },
      })),
    })
  }
  expect(await session.applyChanges(command())).toMatchObject({
    ok: false,
    error: { code: 'OUTCOME_UNKNOWN' },
  })
  expect(fixture.writes).toBe(1)
  await session.close()
})
it('RC-4 concurrent identical operations share one writer and retain defensive results', async () => {
  const fixture = await memory(),
    session = unwrap(await openRepository(fixture.adapter, context, { authorize: () => true })),
    gate = deferred<void>(),
    writer = fixture.session.writer!.commit
  fixture.session.writer!.commit = async (request) => {
    await gate.promise
    return writer(request)
  }
  const a = session.applyChanges(command()),
    b = session.applyChanges(command())
  gate.resolve()
  const [first, second] = await Promise.all([a, b])
  expect(first).toEqual(second)
  expect(fixture.writes).toBe(1)
  const result = unwrap(first)
  ;(result.changes as any[]).pop()
  expect(unwrap(await session.applyChanges(command())).changes).toHaveLength(1)
  await session.close()
})
it('RC-4 cancellation after commit retains operation for reconciliation without replay', async () => {
  const fixture = await memory(),
    session = unwrap(await openRepository(fixture.adapter, context, { authorize: () => true })),
    committed = deferred<void>(),
    reply = deferred<void>(),
    writer = fixture.session.writer!.commit,
    token = new CancellationSource()
  fixture.session.writer!.commit = async (request) => {
    const result = await writer(request)
    committed.resolve()
    await reply.promise
    return result
  }
  const pending = session.applyChanges(command(), token)
  await committed.promise
  token.cancel()
  expect(await pending).toMatchObject({
    ok: false,
    error: { code: 'OUTCOME_UNKNOWN', operationId: 'op' },
  })
  expect(await session.reconcile('op')).toMatchObject({ ok: true, value: { status: 'committed' } })
  reply.resolve()
  expect((await session.applyChanges(command())).ok).toBe(true)
  expect(fixture.writes).toBe(1)
  await session.close()
})
it('RP-2 pre-cancelled calls and close settle uncooperative readers', async () => {
  const fixture = await memory(),
    session = unwrap(await openRepository(fixture.adapter, context, { authorize: () => true })),
    pendingRead = deferred<any>()
  let reads = 0
  fixture.session.read = async () => {
    reads++
    return pendingRead.promise
  }
  const token = new CancellationSource()
  token.cancel()
  expect(await session.getObject(obj().ref, token)).toMatchObject({
    ok: false,
    error: { code: 'CANCELLED' },
  })
  expect(reads).toBe(0)
  const result = session.getObject(obj().ref)
  await Promise.resolve()
  await session.close()
  expect(await result).toMatchObject({ ok: false, error: { code: 'SESSION_CLOSED' } })
  await session.close()
  expect(fixture.closes).toBe(1)
  pendingRead.reject(Error('late failure'))
})
it('RP-2 late open after cancellation closes the returned session', async () => {
  const fixture = await memory(),
    pending = deferred<any>(),
    token = new CancellationSource(),
    started = deferred<void>()
  const result = openRepository(
    {
      open: async () => {
        started.resolve()
        return pending.promise
      },
    },
    context,
    undefined,
    token,
  )
  await started.promise
  token.cancel()
  expect(await result).toMatchObject({ ok: false, error: { code: 'CANCELLED' } })
  pending.resolve(success(fixture.session))
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(fixture.closes).toBe(1)
})
it('RC-3 malformed acknowledgements never report success', async () => {
  const fixture = await memory(),
    session = unwrap(await openRepository(fixture.adapter, context, { authorize: () => true }))
  fixture.session.writer!.commit = async (request) =>
    success({ operationId: request.operationId, revision: 'bad', changes: [], warnings: [] })
  expect(await session.applyChanges(command())).toMatchObject({
    ok: false,
    error: { code: 'OUTCOME_UNKNOWN' },
  })
  await session.close()
})
it('RC-4 exact operation admission limit preserves earlier identities', async () => {
  const fixture = await memory(),
    session = unwrap(await openRepository(fixture.adapter, context, { authorize: () => false }))
  for (let i = 0; i < 1024; i++)
    expect(await session.applyChanges(command('A', 'key' + i))).toMatchObject({
      ok: false,
      error: { code: 'ACCESS_DENIED' },
    })
  expect(await session.applyChanges(command('A', 'key1024'))).toMatchObject({
    ok: false,
    error: { code: 'RESOURCE_LIMIT' },
  })
  expect(await session.applyChanges(command('A', 'key0'))).toMatchObject({
    ok: false,
    error: { code: 'ACCESS_DENIED' },
  })
  expect(fixture.writes).toBe(0)
  await session.close()
})
it('seed 20260924: rejected changes preserve state for 200 inputs', async () => {
  await fc.assert(
    fc.asyncProperty(fc.string(), async (id) => {
      const fixture = await memory(),
        session = unwrap(await openRepository(fixture.adapter, context, { authorize: () => true })),
        before = fixture.state
      const bad = {
        ...command(id || 'A'),
        commands: [
          { op: 'createObject', object: { ...obj(id || 'A'), attributes: { status: 'invalid' } } },
        ],
      }
      expect((await session.applyChanges(bad)).ok).toBe(false)
      expect(fixture.state).toEqual(before)
      expect(fixture.writes).toBe(0)
      await session.close()
    }),
    { seed: 20260924, numRuns: 200 },
  )
})
it('seed 20260924: replay suppression and independent command copies for 200 inputs', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1 }).filter((s) => !!s.trim()),
      async (id) => {
        const fixture = await memory(),
          session = unwrap(
            await openRepository(fixture.adapter, context, { authorize: () => true }),
          ),
          change = command(id)
        const first = await session.applyChanges(change)
        expect(first.ok).toBe(true)
        expect(await session.applyChanges(change)).toEqual(first)
        expect(fixture.writes).toBe(1)
        change.commands[0].object.name = 'changed'
        expect(unwrap(await session.getObject(obj(id).ref)).name).toBe(id)
        await session.close()
      },
    ),
    { seed: 20260924, numRuns: 200 },
  )
})
