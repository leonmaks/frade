import { afterEach, expect, it, vi } from 'vitest'
import { createPresentationService } from '../../src/design/theme/service'
import type {
  DurablePresentation,
  PhaseContext,
  PresentationParticipant,
} from '../../src/design/theme/service'
import type { PresentationSelection, ResolvedTheme } from '../../src/design/theme/types'
import { createThemeRegistry, BUILTIN_IDS } from '../../src/design/theme/registry'
import { resolveTheme } from '../../src/design/theme/resolver'

afterEach(() => vi.useRealTimers())
const choice = (mode: 'light' | 'dark'): PresentationSelection => ({
  mode,
  density: 'compact',
  preferred: { ...BUILTIN_IDS },
})
const snapshot = (mode: 'light' | 'dark') =>
  resolveTheme({ registry: createThemeRegistry(), selection: choice(mode), revision: 0 })
function gate<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}
async function tick() {
  for (let i = 0; i < 100; i++) await Promise.resolve()
}
function fixture(staging = true) {
  const trace: string[] = []
  let generation = 0,
    covered = false
  let durable: DurablePresentation = {
    revision: 0,
    generation: 0,
    transactionId: 'boot',
    selection: choice('light'),
  }
  const host = {
    announceIntent: vi.fn(async (_id: string) => ({ generation: ++generation })),
    stage: vi.fn(
      async (
        _context: PhaseContext,
        _choice: PresentationSelection,
        _revision: number,
      ): Promise<{ status: 'STAGED' } | { status: 'REFUSED'; message: string }> => {
        trace.push('stage')
        return { status: 'STAGED' }
      },
    ),
    persist: vi.fn(
      async (context: PhaseContext, selection: PresentationSelection, expectedRevision: number) => {
        trace.push('persist')
        expect(context.generation).toBe(generation)
        expect(expectedRevision).toBe(durable.revision)
        durable = {
          revision: durable.revision + 1,
          generation,
          transactionId: context.transactionId,
          selection,
        }
        return { status: 'ACK' as const, durable }
      },
    ),
    reconcile: vi.fn(async (_context: PhaseContext, published: DurablePresentation) => {
      trace.push('reconcile')
      durable = published
      return durable
    }),
  }
  const barrier = {
    paint: vi.fn(async (_context: PhaseContext) => {
      trace.push('barrier')
      covered = true
    }),
    reveal: vi.fn((_context: PhaseContext) => {
      trace.push('reveal')
      covered = false
    }),
    recovery: vi.fn((_message: string) => {
      trace.push('recovery')
      covered = true
    }),
  }
  const legacy = { announceIntent: host.announceIntent, persist: host.persist, reconcile: host.reconcile }
  const service = createPresentationService({
    sessionId: 'stage-window',
    initialSnapshot: snapshot('light'),
    initialDurable: durable,
    host: staging ? host : legacy,
    barrier,
  })
  function participant(id: string) {
    const apply = vi.fn(async (_context: PhaseContext) => {})
    const ack = (context: PhaseContext) => ({
      ...context,
      participantId: id,
      participantGeneration: 1,
      painted: true as const,
    })
    const p: PresentationParticipant = {
      id,
      generation: 1,
      hide: vi.fn(),
      reveal: vi.fn(),
      prepare: vi.fn(async () => ({
        apply: async (context: PhaseContext) => {
          trace.push('apply:' + id + ':' + context.phase)
          await apply(context)
          return ack(context)
        },
        rollback: async (_snapshot: ResolvedTheme, context: PhaseContext) => {
          trace.push('rollback:' + id)
          return ack(context)
        },
        dispose: vi.fn(),
      })),
    }
    return { p, apply }
  }
  return { service, host, barrier, trace, participant, covered: () => covered }
}

it('stage overlaps barrier and apply but finalization waits for the flush', async () => {
  const f = fixture(),
    p = f.participant('root')
  await f.service.register(p.p).ready
  const flush = gate<{ status: 'STAGED' }>(),
    paint = gate<void>()
  f.host.stage.mockImplementationOnce(async () => {
    f.trace.push('stage')
    return flush.promise
  })
  f.barrier.paint.mockImplementationOnce(async () => {
    f.trace.push('barrier')
    await paint.promise
  })
  f.trace.length = 0
  const pending = f.service.commit(choice('dark'), snapshot('dark'))
  try {
    await tick()
    expect(f.host.stage).toHaveBeenCalledOnce()
    expect(f.trace).toEqual(['stage', 'barrier'])
    paint.resolve()
    await tick()
    expect(p.apply).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'apply' }))
    expect(f.host.persist).not.toHaveBeenCalled()
    expect(f.barrier.reveal).not.toHaveBeenCalled()
    expect(f.service.state().durable.revision).toBe(0)
    flush.resolve({ status: 'STAGED' })
    expect((await pending).status).toBe('COMMITTED')
    expect(f.trace.indexOf('persist')).toBeGreaterThan(f.trace.indexOf('apply:root:apply'))
    expect(f.trace.indexOf('reveal')).toBeGreaterThan(f.trace.indexOf('persist'))
  } finally {
    paint.resolve()
    flush.resolve({ status: 'STAGED' })
    await pending
  }
})

it('finalization waits for every exact paint acknowledgement', async () => {
  const f = fixture(),
    a = f.participant('root'),
    b = f.participant('frame')
  await f.service.register(a.p).ready
  await f.service.register(b.p).ready
  const wait = gate<void>()
  b.apply.mockImplementationOnce(async () => wait.promise)
  const pending = f.service.commit(choice('dark'), snapshot('dark'))
  await tick()
  expect(f.host.stage).toHaveBeenCalledOnce()
  expect(a.apply).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'apply' }))
  expect(f.host.persist).not.toHaveBeenCalled()
  expect(f.barrier.reveal).not.toHaveBeenCalled()
  wait.resolve()
  expect((await pending).status).toBe('COMMITTED')
  expect(f.host.persist).toHaveBeenCalledOnce()
})

it('preview cancel refresh and failed prepare do not stage', async () => {
  const f = fixture(),
    p = f.participant('root')
  await f.service.register(p.p).ready
  expect((await f.service.preview(choice('dark'), snapshot('dark'))).status).toBe('APPLIED')
  expect((await f.service.cancel()).status).toBe('CANCELED')
  expect((await f.service.refreshEnvironment(snapshot('light'))).status).toBe('APPLIED')
  expect(f.host.stage).not.toHaveBeenCalled()
  vi.mocked(p.p.prepare).mockRejectedValueOnce(Error('prepare refused'))
  expect((await f.service.commit(choice('dark'), snapshot('dark'))).status).toBe('REFUSED')
  expect(f.host.stage).not.toHaveBeenCalled()
  expect(f.host.persist).not.toHaveBeenCalled()
})

it('stage refusal and invalid paint reconcile without publication', async () => {
  for (const fault of ['refused', 'rejected', 'paint'] as const) {
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    if (fault === 'refused')
      f.host.stage.mockResolvedValueOnce({ status: 'REFUSED', message: 'flush refused' })
    if (fault === 'rejected') f.host.stage.mockRejectedValueOnce(Error('lost stage reply'))
    if (fault === 'paint') {
      vi.mocked(p.p.prepare).mockResolvedValueOnce({
        apply: async (context) => ({
          ...context,
          membership: context.membership + 1,
          participantId: 'root',
          participantGeneration: 1,
          painted: true,
        }),
        rollback: async (_snapshot, context) => ({
          ...context,
          participantId: 'root',
          participantGeneration: 1,
          painted: true,
        }),
        dispose: () => {},
      })
    }
    expect((await f.service.commit(choice('dark'), snapshot('dark'))).status).toBe('REFUSED')
    expect(f.host.stage).toHaveBeenCalledOnce()
    expect(f.host.persist).not.toHaveBeenCalled()
    expect(f.host.reconcile).toHaveBeenCalledOnce()
    expect(f.service.state().snapshot.kind).toBe('light')
    expect(f.service.state().durable.revision).toBe(0)
  }
})

it('new intent during staging compensates before newer commit', async () => {
  for (const cancel of [false, true]) {
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    const flush = gate<{ status: 'STAGED' }>()
    f.host.stage.mockImplementationOnce(async () => flush.promise)
    const a = f.service.commit(choice('dark'), snapshot('dark'))
    await tick()
    expect(f.host.stage).toHaveBeenCalledOnce()
    const c = cancel ? f.service.cancel() : f.service.commit(choice('light'), snapshot('light'))
    await tick()
    flush.resolve({ status: 'STAGED' })
    expect((await a).status).toBe('SUPERSEDED')
    expect((await c).status).toBe(cancel ? 'CANCELED' : 'COMMITTED')
    expect(f.host.reconcile).toHaveBeenCalledOnce()
    expect(f.host.persist).toHaveBeenCalledTimes(cancel ? 0 : 1)
    if (!cancel) expect(f.trace.indexOf('reconcile')).toBeLessThan(f.trace.indexOf('persist'))
    expect(f.service.state().snapshot.kind).toBe('light')
  }
})

it('membership change during staging cleans and safely reprepares once', async () => {
  for (const secondChurn of [false, true]) {
    const f = fixture(),
      root = f.participant('root')
    await f.service.register(root.p).ready
    const flush = gate<{ status: 'STAGED' }>()
    f.host.stage.mockImplementationOnce(async () => flush.promise)
    const pending = f.service.commit(choice('dark'), snapshot('dark'))
    await tick()
    const first = f.service.register(f.participant('frame').p)
    if (secondChurn)
      f.host.stage.mockImplementationOnce(async () => {
        const extra = f.service.register(f.participant('extra').p)
        void extra.ready.catch(() => {})
        return { status: 'STAGED' }
      })
    flush.resolve({ status: 'STAGED' })
    expect((await pending).status).toBe(secondChurn ? 'REFUSED' : 'COMMITTED')
    await first.ready
    expect(f.host.stage).toHaveBeenCalledTimes(2)
    expect(f.host.reconcile).toHaveBeenCalledTimes(secondChurn ? 2 : 1)
    expect(f.host.persist).toHaveBeenCalledTimes(secondChurn ? 0 : 1)
  }
})

it('staging and finalization share the original five second host budget', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
  const f = fixture(),
    p = f.participant('root')
  await f.service.register(p.p).ready
  f.host.stage.mockImplementationOnce(async () => {
    await new Promise((resolve) => setTimeout(resolve, 4900))
    return { status: 'STAGED' }
  })
  f.host.persist.mockImplementationOnce(
    async () =>
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              status: 'ACK',
              durable: {
                revision: 1,
                generation: 1,
                transactionId: 'stage-window/intent-1',
                selection: choice('dark'),
              },
            }),
          200,
        ),
      ),
  )
  const pending = f.service.commit(choice('dark'), snapshot('dark'))
  await tick()
  await vi.advanceTimersByTimeAsync(4999)
  expect(f.host.reconcile).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect((await pending).status).toBe('REFUSED')
  expect(f.host.reconcile).toHaveBeenCalledOnce()
  expect(f.service.state().durable.revision).toBe(0)
  await vi.advanceTimersByTimeAsync(200)
  expect(f.service.state().durable.revision).toBe(0)
  const blocked = fixture()
  blocked.host.stage.mockImplementationOnce(async () => new Promise(() => {}))
  blocked.host.reconcile.mockRejectedValueOnce(Error('cannot prove cleanup'))
  const timeout = blocked.service.commit(choice('dark'), snapshot('dark'))
  await tick()
  await vi.advanceTimersByTimeAsync(5000)
  expect((await timeout).status).toBe('RECOVERY_BLOCKED')
  expect(blocked.covered()).toBe(true)
  expect(blocked.host.persist).not.toHaveBeenCalled()
})

it('legacy hosts preserve monolithic persistence after applied paint', async () => {
  const f = fixture(false),
    p = f.participant('root')
  await f.service.register(p.p).ready
  f.trace.length = 0
  expect((await f.service.commit(choice('dark'), snapshot('dark'))).status).toBe('COMMITTED')
  expect(f.host.stage).not.toHaveBeenCalled()
  expect(f.trace.indexOf('persist')).toBeGreaterThan(f.trace.indexOf('apply:root:apply'))
  expect(f.service.state().durable.selection.mode).toBe('dark')
})
