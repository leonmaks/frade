import { expect, it } from 'vitest'
import { cancellable } from '../src/cancellation'
import { success } from '@frade/repository-domain'
import { openRepository } from '../src/index'
import { memory, context } from './fixtures/memory'

it('RP-2 throwing cancellation registration returns a typed result without dispatch', async () => {
  let called = false
  const result = await cancellable(
    async () => {
      called = true
      return success(true)
    },
    {
      isCancellationRequested: false,
      subscribe() {
        throw Error('secret host token')
      },
    },
  )
  expect(result).toMatchObject({ ok: false, error: { code: 'ADAPTER_CONTRACT' } })
  expect(called).toBe(false)
})
it('RP-2 throwing cancellation cleanup cannot strand a completed read', async () => {
  const result = await Promise.race([
    cancellable(async () => success(true), {
      isCancellationRequested: false,
      subscribe: () => () => {
        throw Error('cleanup')
      },
    }),
    new Promise((resolve) => setTimeout(() => resolve('stranded'), 100)),
  ])
  expect(result).toEqual(success(true))
})
it('RP-3 a hostile result proxy is rejected without leaking an unhandled rejection', async () => {
  const result = await Promise.race([
    cancellable(
      async () =>
        new Proxy(success(true), {
          ownKeys() {
            throw Error('secret proxy')
          },
        }),
    ),
    new Promise((resolve) => setTimeout(() => resolve('stranded'), 100)),
  ])
  expect(result).toMatchObject({ ok: false, error: { code: 'ADAPTER_CONTRACT' } })
})
it('RP-5 malformed change envelopes invalidate instead of impersonating committed events', async () => {
  const fixture = await memory({ watch: true }),
    opened = await openRepository(fixture.adapter, context)
  if (!opened.ok) throw Error(opened.error.code)
  const events: unknown[] = []
  opened.value.subscribe((event) => events.push(event))
  try {
    fixture.emit({
      type: 'invented' as any,
      revision: '',
      state: 'READY',
      ref: { repositoryId: 'foreign', objectId: 'A' },
    })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ type: 'repository.reloaded', repositoryId: 'R' })
    expect(events[0]).not.toHaveProperty('ref')
    expect(opened.value.state).toBe('DEGRADED')
  } finally {
    await opened.value.close()
  }
})
