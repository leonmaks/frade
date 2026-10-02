import { expect, it } from 'vitest'
import { failure, success } from '@frade/repository-domain'
import { openRepository } from '../src/index'
import { memory, obj, context, deferred } from './fixtures/memory'
import { SqliteIndex } from '../../local-index/src/index'
import { setTimeout as delay } from 'node:timers/promises'
it('CORE-012 index failure after commit preserves source success and never replays command', async () => {
  const fixture = await memory(),
    opened = await openRepository(fixture.adapter, context, { authorize: () => true })
  if (!opened.ok) throw Error('open')
  const session = opened.value
  let invalidated = 0,
    updates = 0
  const index = {
    rebuild: async () => success(true as const),
    applyChanges: async () => {
      updates++
      return failure('INDEX_OUT_OF_SYNC')
    },
    invalidate: () => {
      invalidated++
    },
    close: async () => {},
  }
  expect((await session.attachIndex(index)).ok).toBe(true)
  const command = {
    repositoryId: 'R',
    idempotencyKey: 'once',
    commands: [{ op: 'createObject', object: obj() }],
  }
  const result = await session.applyChanges(command)
  expect(result).toMatchObject({ ok: true, value: { warnings: ['INDEX_OUT_OF_SYNC'] } })
  expect(await session.applyChanges(command)).toEqual(result)
  expect(fixture.writes).toBe(1)
  expect(fixture.state.objects).toHaveLength(1)
  expect(updates).toBe(1)
  expect(invalidated).toBe(1)
  await session.close()
})
it('CORE-012 a delayed rebuild cannot overwrite the index of a newer committed source', async () => {
  const fixture = await memory(),
    opened = await openRepository(fixture.adapter, context, { authorize: () => true })
  if (!opened.ok) throw Error('open')
  const session = opened.value,
    index = new SqliteIndex(':memory:'),
    started = deferred<void>(),
    gate = deferred<void>()
  try {
    expect((await session.attachIndex(index)).ok).toBe(true)
    const rebuild = index.rebuild.bind(index)
    index.rebuild = async (snapshot) => {
      started.resolve()
      await gate.promise
      return rebuild(snapshot)
    }
    const refresh = session.refreshIndex()
    await started.promise
    const write = session.applyChanges({
      repositoryId: 'R',
      commands: [{ op: 'createObject', object: obj() }],
    })
    await Promise.race([write, delay(20)])
    gate.resolve()
    expect((await write).ok).toBe(true)
    expect((await refresh).ok).toBe(true)
    expect(await index.getObject(obj().ref)).toMatchObject({ ok: true, value: { name: 'A' } })
  } finally {
    gate.resolve()
    await session.close()
  }
})
