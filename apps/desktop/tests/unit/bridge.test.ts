import { it, expect, vi } from 'vitest'
import { createDesktopApi } from '../../src/preload/bridge'
it('exposes named APIs only and verifies response correlation', async () => {
  const invoke = vi.fn(async () => ({
    type: 'response',
    protocolVersion: 1,
    requestId: 'id',
    ok: true,
    result: { state: 'ready', sequence: 3 },
  }))
  const api = createDesktopApi(
    invoke,
    () => () => {},
    () => 'id',
  )
  expect(Object.keys(api)).toEqual(['runtime', 'events'])
  expect(Object.keys(api.runtime)).toEqual(['getHealth'])
  expect(await api.runtime.getHealth()).toEqual({ state: 'ready', sequence: 3 })
  expect(invoke.mock.calls[0]).toEqual([
    { type: 'request', protocolVersion: 1, requestId: 'id', operation: 'health.get', payload: {} },
  ])
  const invalid = createDesktopApi(
    async () => ({
      type: 'response',
      protocolVersion: 1,
      requestId: 'other',
      ok: true,
      result: { state: 'ready', sequence: 0 },
    }),
    () => () => {},
    () => 'id',
  )
  await expect(invalid.runtime.getHealth()).rejects.toThrow('PROTOCOL_ERROR')
})
it('validates events, removes subscriptions and recovers via snapshot', async () => {
  let emit: (v: unknown) => void = () => {}
  const detach = vi.fn()
  const api = createDesktopApi(
    async () => ({
      type: 'response',
      protocolVersion: 1,
      requestId: 'id',
      ok: true,
      result: { state: 'ready', sequence: 5 },
    }),
    (f) => {
      emit = f
      return detach
    },
    () => 'id',
  )
  const listener = vi.fn()
  const off = api.events.subscribe(listener)
  const event = (sequence: number) => ({
    type: 'health',
    protocolVersion: 1,
    health: { state: 'ready', sequence },
  })
  emit(event(2))
  emit(event(2))
  emit(event(1))
  emit({ garbage: true })
  expect(listener).toHaveBeenCalledTimes(1)
  off()
  emit(event(3))
  expect(detach).toHaveBeenCalledTimes(1)
  expect(listener).toHaveBeenCalledTimes(1)
  expect((await api.runtime.getHealth()).sequence).toBe(5)
})
