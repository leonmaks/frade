import { afterEach, expect, it, vi } from 'vitest'
import { createPresentationService } from '../../src/design/theme/service'
import type {
  PaintAck,
  PhaseContext,
  PresentationParticipant,
} from '../../src/design/theme/service'
import { createThemeRegistry, BUILTIN_IDS } from '../../src/design/theme/registry'
import { resolveTheme } from '../../src/design/theme/resolver'

function gate() {
  let resolve!: () => void
  const promise = new Promise<void>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}
type Trace = {
  event: string
  id?: string
  attempt?: number
  context?: PhaseContext
  message?: string
}
type Hook = (id: string, attempt: number, context: PhaseContext) => Promise<void>
function harness(
  hooks: {
    prepare?: Hook
    apply?: Hook
    dispose?: (id: string, attempt: number) => void
    ack?: (ack: PaintAck) => PaintAck
    cover?: (context: PhaseContext) => Promise<void>
  } = {},
) {
  const selection = {
      mode: 'light' as const,
      density: 'compact' as const,
      preferred: { ...BUILTIN_IDS },
    },
    initial = { revision: 7, generation: 9, transactionId: 'boot', selection },
    snapshot = resolveTheme({ registry: createThemeRegistry(), selection, revision: 7 }),
    trace: Trace[] = [],
    attempts = new Map<string, number>()
  const host = {
    announceIntent: vi.fn(async () => {
      throw Error('Unexpected intent')
    }),
    persist: vi.fn(async () => {
      throw Error('Unexpected persist')
    }),
    reconcile: vi.fn(async () => {
      throw Error('Unexpected reconcile')
    }),
  }
  const service = createPresentationService({
    sessionId: 'fixture',
    initialSnapshot: snapshot,
    initialDurable: initial,
    host,
    barrier: {
      paint: async (context) => {
        trace.push({ event: 'cover', context })
        await hooks.cover?.(context)
      },
      reveal: (context) => {
        trace.push({ event: 'uncover', context })
      },
      recovery: (message) => {
        trace.push({ event: 'recovery', message })
      },
    },
  })
  const participant = (id: string): PresentationParticipant => ({
    id,
    generation: 1,
    requiresPaintCover: true,
    hide: () => {
      trace.push({ event: 'hide', id })
    },
    reveal: () => {
      trace.push({ event: 'reveal', id })
    },
    prepare: async (_snapshot, context) => {
      const attempt = (attempts.get(id) ?? 0) + 1
      attempts.set(id, attempt)
      trace.push({ event: 'prepare', id, attempt, context })
      await hooks.prepare?.(id, attempt, context)
      return {
        apply: async (next) => {
          trace.push({ event: 'apply', id, attempt, context: next })
          await hooks.apply?.(id, attempt, next)
          const ack: PaintAck = {
            ...next,
            participantId: id,
            participantGeneration: 1,
            painted: true,
          }
          trace.push({ event: 'ack', id, attempt, context: next })
          return hooks.ack?.(ack) ?? ack
        },
        rollback: async () => {
          throw Error('Unexpected rollback')
        },
        dispose: () => {
          trace.push({ event: 'dispose', id, attempt })
          hooks.dispose?.(id, attempt)
        },
      }
    },
  })
  return { service, trace, host, participant, attempts, initial, snapshot }
}
afterEach(() => vi.useRealTimers())

it('sequential control accepts both joining members without intent, persistence or model changes', async () => {
  const h = harness()
  await h.service.register(h.participant('A')).ready
  await h.service.register(h.participant('B')).ready
  expect(h.attempts.get('A')).toBe(1)
  expect(h.attempts.get('B')).toBe(1)
  expect(h.service.state().snapshot).toEqual(h.snapshot)
  expect(h.service.state().durable).toEqual(h.initial)
  expect(h.host.persist).not.toHaveBeenCalled()
  expect(h.host.announceIntent).not.toHaveBeenCalled()
})
it.each(['prepare', 'apply', 'cover'] as const)(
  'reprepares once after unrelated member joins during %s, without accepting stale readiness',
  async (stage) => {
    const entered = gate(),
      release = gate()
    const hold: Hook = async (id, attempt) => {
      if (id === 'A' && attempt === 1) {
        entered.resolve()
        await release.promise
      }
    }
    const h = harness({
      ...(stage === 'prepare' ? { prepare: hold } : {}),
      ...(stage === 'apply' ? { apply: hold } : {}),
      ...(stage === 'cover'
        ? {
            cover: async () => {
              if (h.attempts.get('A') === 1) {
                entered.resolve()
                await release.promise
              }
            },
          }
        : {}),
    })
    const a = h.service.register(h.participant('A'))
    await entered.promise
    const b = h.service.register(h.participant('B')),
      outcomes = Promise.allSettled([a.ready, b.ready])
    release.resolve()
    expect((await outcomes).map((result) => result.status)).toEqual(['fulfilled', 'fulfilled'])
    const preparation = h.trace.filter((e) => e.event === 'prepare' && e.id === 'A')
    expect(preparation.map((e) => e.context?.membership)).toEqual([1, 2])
    expect(preparation.map((e) => e.context?.revision)).toEqual([7, 7])
    const freshAck = h.trace.findIndex((e) => e.event === 'ack' && e.id === 'A' && e.attempt === 2),
      reveal = h.trace.findIndex((e) => e.event === 'reveal' && e.id === 'A')
    expect(freshAck).toBeGreaterThan(-1)
    expect(reveal).toBeGreaterThan(freshAck)
    expect(
      h.trace.filter((e) => e.event === 'dispose' && e.id === 'A').map((e) => e.attempt),
    ).toEqual([1, 2])
    expect(h.trace.findIndex((e) => e.event === 'uncover')).toBeGreaterThan(freshAck)
    expect(h.service.state().durable).toEqual(h.initial)
    expect(h.host.persist).not.toHaveBeenCalled()
  },
)
it('a second unrelated churn still blocks both pending members and never reveals the original member', async () => {
  const firstEntered = gate(),
    firstRelease = gate(),
    secondEntered = gate(),
    secondRelease = gate()
  const h = harness({
    apply: async (id, attempt) => {
      if (id === 'A' && attempt === 1) {
        firstEntered.resolve()
        await firstRelease.promise
      }
      if (id === 'A' && attempt === 2) {
        secondEntered.resolve()
        await secondRelease.promise
      }
    },
  })
  const a = h.service.register(h.participant('A'))
  await firstEntered.promise
  const b = h.service.register(h.participant('B')),
    pendingAB = Promise.allSettled([a.ready, b.ready])
  firstRelease.resolve()
  await secondEntered.promise
  const c = h.service.register(h.participant('C')),
    pendingC = Promise.allSettled([c.ready])
  secondRelease.resolve()
  expect((await pendingAB).map((r) => r.status)).toEqual(['rejected', 'rejected'])
  expect((await pendingC)[0].status).toBe('rejected')
  expect(h.attempts.get('A')).toBe(2)
  expect(h.service.state().phase).toBe('RECOVERY_BLOCKED')
  expect(h.trace.some((e) => e.event === 'reveal')).toBe(false)
})
it('invalid ACK fields still block without reprepare even when membership also changes', async () => {
  const entered = gate(),
    release = gate(),
    h = harness({
      apply: async (id, attempt) => {
        if (id === 'A' && attempt === 1) {
          entered.resolve()
          await release.promise
        }
      },
      ack: (ack) => ({ ...ack, revision: ack.revision + 1 }),
    })
  const a = h.service.register(h.participant('A'))
  await entered.promise
  const b = h.service.register(h.participant('B')),
    results = Promise.allSettled([a.ready, b.ready])
  release.resolve()
  expect((await results).map((r) => r.status)).toEqual(['rejected', 'rejected'])
  expect(h.attempts.get('A')).toBe(1)
  expect(h.service.state().phase).toBe('RECOVERY_BLOCKED')
})
it('own registration loss is not mistaken for unrelated churn', async () => {
  const entered = gate(),
    release = gate(),
    h = harness({
      apply: async () => {
        entered.resolve()
        await release.promise
      },
    })
  const a = h.service.register(h.participant('A'))
  await entered.promise
  const results = Promise.allSettled([a.ready])
  a.dispose()
  release.resolve()
  expect((await results)[0].status).toBe('rejected')
  expect(h.attempts.get('A')).toBe(1)
  expect(h.trace.some((e) => e.event === 'reveal')).toBe(false)
})
it('cleanup failure prevents retry and ready publication and remains explicit recovery', async () => {
  const entered = gate(),
    release = gate(),
    h = harness({
      apply: async (id, attempt) => {
        if (id === 'A' && attempt === 1) {
          entered.resolve()
          await release.promise
        }
      },
      dispose: (id) => {
        if (id === 'A') throw Error('Controlled cleanup failure')
      },
    })
  const a = h.service.register(h.participant('A'))
  await entered.promise
  const b = h.service.register(h.participant('B')),
    results = Promise.allSettled([a.ready, b.ready])
  release.resolve()
  expect((await results).map((r) => r.status)).toEqual(['rejected', 'rejected'])
  expect(h.attempts.get('A')).toBe(1)
  expect(h.service.state().phase).toBe('RECOVERY_BLOCKED')
  expect(
    h.trace.some((e) => e.event === 'recovery' && e.message === 'Controlled cleanup failure'),
  ).toBe(true)
  expect(h.trace.filter((e) => e.event === 'dispose' && e.id === 'A')).toHaveLength(1)
})
it.each(['prepare', 'apply'] as const)(
  'existing 2000ms %s deadline remains a failure, not a retry',
  async (stage) => {
    vi.useFakeTimers()
    const entered = gate(),
      release = gate(),
      hold: Hook = async () => {
        entered.resolve()
        await release.promise
      }
    const h = harness(stage === 'prepare' ? { prepare: hold } : { apply: hold })
    const a = h.service.register(h.participant('A')),
      result = Promise.allSettled([a.ready])
    await entered.promise
    await vi.advanceTimersByTimeAsync(2000)
    expect((await result)[0].status).toBe('rejected')
    expect(h.attempts.get('A')).toBe(1)
    expect(h.service.state().phase).toBe('RECOVERY_BLOCKED')
    expect(
      h.trace.some(
        (e) => e.event === 'recovery' && e.message?.includes('deadline exceeded (2000ms)'),
      ),
    ).toBe(true)
    release.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(h.trace.some((e) => e.event === 'reveal')).toBe(false)
  },
)
