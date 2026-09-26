import { expect, it } from 'vitest'
import { success, failure, type Revision } from '@frade/repository-domain'
import { openRepository, CancellationSource } from '../src/index'
import { memory, context, obj, deferred } from './fixtures/memory'
const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw Error(JSON.stringify(r.error))
  return r.value
}
const command = (key = 'op') => ({
  repositoryId: 'R',
  idempotencyKey: key,
  commands: [{ op: 'createObject' as const, object: obj() }],
})
it('RP-2 synchronous cancellation during subscription neither opens storage nor leaks callbacks', async () => {
  const fixture = await memory()
  let opened = 0,
    subscriptions = 0
  const token = {
    isCancellationRequested: false,
    subscribe(listener: () => void) {
      subscriptions++
      listener()
      return () => {
        subscriptions--
      }
    },
  }
  expect(
    await openRepository(
      {
        open: async () => {
          opened++
          return success(fixture.session)
        },
      },
      context,
      undefined,
      token,
    ),
  ).toMatchObject({ ok: false, error: { code: 'CANCELLED' } })
  expect(opened).toBe(0)
  expect(subscriptions).toBe(0)
})
it('RP-2 handles synchronous close exceptions and still becomes CLOSED exactly once', async () => {
  const fixture = await memory(),
    session = unwrap(await openRepository(fixture.adapter, context))
  let closes = 0
  fixture.session.close = () => {
    closes++
    throw Error('secret path')
  }
  expect((await session.close()).ok).toBe(false)
  expect((await session.close()).ok).toBe(false)
  expect(session.state).toBe('CLOSED')
  expect(closes).toBe(1)
})
it('RC-4 secondary waiter cancellation does not cancel the originating command', async () => {
  const fixture = await memory(),
    session = unwrap(await openRepository(fixture.adapter, context, { authorize: () => true })),
    started = deferred<void>(),
    gate = deferred<void>(),
    commit = fixture.session.writer!.commit
  fixture.session.writer!.commit = async (request) => {
    started.resolve()
    await gate.promise
    return commit(request)
  }
  const first = session.applyChanges(command())
  await started.promise
  const token = new CancellationSource(),
    second = session.applyChanges(command(), token)
  token.cancel()
  expect(await second).toMatchObject({ ok: false, error: { code: 'CANCELLED' } })
  gate.resolve()
  expect((await first).ok).toBe(true)
  expect(fixture.writes).toBe(1)
  await session.close()
})
it('RC-2 permits a batch that repairs invalid state, but refuses an incomplete snapshot', async () => {
  const fixture = await memory(),
    session = unwrap(await openRepository(fixture.adapter, context, { authorize: () => true }))
  fixture.replaceState({
    ...fixture.state,
    objects: [{ ...obj(), attributes: { status: 'invalid' }, revision: 'bad' as Revision }],
  })
  expect(
    (
      await session.applyChanges({
        repositoryId: 'R',
        commands: [{ op: 'updateObject', object: obj(), expectedRevision: 'bad' }],
      })
    ).ok,
  ).toBe(true)
  expect(unwrap(await session.getObject(obj().ref)).attributes).toEqual({ status: 'created' })
  fixture.replaceState({ ...fixture.state, complete: false })
  expect(
    await session.applyChanges({
      ...command('other'),
      commands: [{ op: 'createObject', object: obj('B') }],
    }),
  ).toMatchObject({ ok: false, error: { code: 'INCOMPLETE_SNAPSHOT' } })
  expect(fixture.writes).toBe(1)
  await session.close()
})
it('RC-4 lookup failures and unknown reopened operations never replay', async () => {
  const fixture = await memory(),
    session = unwrap(await openRepository(fixture.adapter, context, { authorize: () => true }))
  let dispatches = 0
  fixture.session.writer!.commit = async () => {
    dispatches++
    return failure('OUTCOME_UNKNOWN', [], 'op')
  }
  await session.applyChanges(command())
  fixture.session.writer!.lookup = async () => {
    throw Error('secret backend')
  }
  expect(await session.reconcile('op')).toMatchObject({
    ok: false,
    error: { code: 'REPOSITORY_UNAVAILABLE' },
  })
  expect(await session.applyChanges(command())).toMatchObject({
    ok: false,
    error: { code: 'OUTCOME_UNKNOWN' },
  })
  expect(dispatches).toBe(1)
  await session.close()
  const another = await memory(),
    reopened = unwrap(await openRepository(another.adapter, context, { authorize: () => true }))
  expect(await reopened.reconcile('op')).toMatchObject({
    ok: false,
    error: { code: 'UNSUPPORTED_CAPABILITY' },
  })
  expect(another.writes).toBe(0)
  await reopened.close()
})
