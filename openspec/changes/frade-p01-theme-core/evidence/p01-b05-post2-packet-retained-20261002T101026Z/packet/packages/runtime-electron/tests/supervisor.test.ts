import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { healthRequest, type ClientMessage } from '@frade/runtime-contracts'
import { BackendSupervisor, type ChildTransport } from '../src'
class Child implements ChildTransport {
  messages: ClientMessage[] = []
  killed = false
  listeners = new Set<(v: unknown) => void>()
  exits = new Set<() => void>()
  send(message: ClientMessage) {
    this.messages.push(message)
  }
  kill() {
    this.killed = true
  }
  onMessage(f: (v: unknown) => void) {
    this.listeners.add(f)
    return () => {
      this.listeners.delete(f)
    }
  }
  onExit(f: () => void) {
    this.exits.add(f)
    return () => {
      this.exits.delete(f)
    }
  }
  emit(v: unknown) {
    for (const f of this.listeners) f(v)
  }
  exit() {
    for (const f of [...this.exits]) f()
  }
  ready() {
    this.emit({ type: 'ready', protocolVersion: 1 })
  }
  reply(id: string) {
    this.emit({
      type: 'response',
      protocolVersion: 1,
      requestId: id,
      ok: true,
      result: { state: 'ready', sequence: 0 },
    })
  }
}
function setup() {
  const children: Child[] = []
  const host = new BackendSupervisor(
    () => {
      const c = new Child()
      children.push(c)
      return c
    },
    { startupMs: 50, requestMs: 20, backoffMs: 10, shutdownMs: 30, maxRestarts: 2 },
  )
  host.start()
  return { host, children, child: children[0] }
}
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())
describe('backend lifecycle', () => {
  it('requires handshake and correlates out-of-order responses', async () => {
    const { host, child } = setup()
    await expect(host.request(healthRequest('early'))).rejects.toThrow('UNAVAILABLE')
    child.ready()
    const a = host.request(healthRequest('a')),
      b = host.request(healthRequest('b'))
    child.reply('unknown')
    child.reply('b')
    child.reply('b')
    child.reply('a')
    expect(await a).toEqual({ state: 'ready', sequence: 2 })
    expect(await b).toEqual(await a)
    expect(host.pendingCount).toBe(0)
  })
  it.each(['invalid', 'timeout'])('bounds failed startup %s', async (kind) => {
    const { host, children, child } = setup()
    if (kind === 'invalid') child.emit({ type: 'ready', protocolVersion: 9 })
    else await vi.advanceTimersByTimeAsync(50)
    expect(child.killed).toBe(true)
    await vi.runAllTimersAsync()
    expect(children).toHaveLength(3)
    expect(host.snapshot().state).toBe('unavailable')
    expect(children.every((c) => c.killed)).toBe(true)
  })
  it('cleans timeout and abort entries without replay', async () => {
    const { host, child } = setup()
    child.ready()
    const controller = new AbortController()
    const cleanup = vi.spyOn(controller.signal, 'removeEventListener')
    const aborted = host.request(healthRequest('a'), controller.signal)
    const abortedCheck = expect(aborted).rejects.toThrow('CANCELLED')
    controller.abort()
    await abortedCheck
    expect(cleanup).toHaveBeenCalled()
    const timeout = host.request(healthRequest('b'))
    const timeoutCheck = expect(timeout).rejects.toThrow('TIMEOUT')
    await vi.advanceTimersByTimeAsync(20)
    await timeoutCheck
    child.reply('a')
    child.reply('b')
    expect(host.pendingCount).toBe(0)
    expect(child.messages.filter((m) => m.type === 'cancel')).toHaveLength(2)
  })
  it('rejects duplicates and already-aborted signals', async () => {
    const { host, child } = setup()
    child.ready()
    const p = host.request(healthRequest('a'))
    await expect(host.request(healthRequest('a'))).rejects.toThrow('INVALID_REQUEST')
    await expect(host.request(healthRequest('b'), AbortSignal.abort())).rejects.toThrow('CANCELLED')
    child.reply('a')
    await p
  })
  it('fails pending work on crash and never replays it', async () => {
    const { host, child, children } = setup()
    child.ready()
    const events: number[] = []
    const off = host.subscribe((e) => events.push(e.health.sequence))
    const pending = host.request(healthRequest('work'))
    const check = expect(pending).rejects.toThrow('UNAVAILABLE')
    child.exit()
    await check
    await vi.advanceTimersByTimeAsync(10)
    children[1].ready()
    expect(children[1].messages).toEqual([])
    expect(events).toEqual([3, 4, 5])
    off()
    children[1].exit()
    expect(events).toHaveLength(3)
    expect(host.snapshot()).toEqual({ state: 'unavailable', sequence: 6 })
  })
  it('terminates malformed backend responses', async () => {
    const { host, child } = setup()
    child.ready()
    const p = host.request(healthRequest('a'))
    const check = expect(p).rejects.toThrow('UNAVAILABLE')
    child.emit({
      type: 'response',
      protocolVersion: 1,
      requestId: 'a',
      ok: true,
      result: { state: 'ready', sequence: -1 },
    })
    await check
    expect(child.killed).toBe(true)
  })
  it.each([true, false])('stops gracefully or by bounded fallback: %s', async (graceful) => {
    const { host, child, children } = setup()
    child.ready()
    const p = host.request(healthRequest('a'))
    const check = expect(p).rejects.toThrow('SHUTTING_DOWN')
    const stop = host.stop()
    await check
    expect(child.messages.at(-1)).toEqual({ type: 'shutdown' })
    if (graceful) child.exit()
    await vi.runAllTimersAsync()
    await stop
    expect(child.killed).toBe(!graceful)
    expect(child.listeners.size + child.exits.size).toBe(0)
    expect(children).toHaveLength(1)
    host.start()
    expect(children).toHaveLength(1)
  })
  it('cancels scheduled recovery on shutdown', async () => {
    const { host, child, children } = setup()
    child.exit()
    await host.stop()
    await vi.runAllTimersAsync()
    expect(children).toHaveLength(1)
  })
  it('bounds synchronous spawn failures', async () => {
    const spawn = vi.fn(() => {
      throw new Error('spawn')
    })
    const host = new BackendSupervisor(spawn, { backoffMs: 1 })
    host.start()
    await vi.runAllTimersAsync()
    expect(spawn).toHaveBeenCalledTimes(3)
    expect(host.snapshot().state).toBe('unavailable')
  })
})
