import { describe, it as baseIt, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { Mock } from 'vitest'
import { createThemeRegistry, BUILTIN_IDS } from '../../src/design/theme/registry'
import { resolveTheme } from '../../src/design/theme/resolver'
import { createPresentationService } from '../../src/design/theme/service'
import type {
  PhaseContext,
  PaintAck,
  PresentationParticipant,
  PreparedPresentation,
  DurablePresentation,
  ServiceEvent,
  PersistenceOutcome,
} from '../../src/design/theme/service'
import type { PresentationSelection, ThemeKind } from '../../src/design/theme/types'

const featureText = readFileSync(
  new URL('../../../../docs/ui/bdd/p01-theme-core.feature', import.meta.url),
  'utf8',
)
const serviceCases = [...featureText.matchAll(/@(P01-TX-\d+)[^\n]*\n\s*Scenario: ([^\n]+)/g)].map(
  (match) => ({ id: match[1], name: match[2] }),
)
function storyName(name: string): string {
  const scenario = serviceCases.find((candidate) => candidate.name === name)
  if (!scenario) throw new Error('Missing P01 transaction BDD scenario: ' + name)
  return scenario.id + ' ' + name
}
const it = Object.assign(
  (name: string, run: () => void | Promise<void>) => baseIt(storyName(name), run),
  {
    each:
      <T>(rows: readonly T[]) =>
      (name: string, run: (row: T) => void | Promise<void>) =>
        baseIt.each(rows.map((row) => [row] as const))(storyName(name), run),
  },
)

const selection = (mode: ThemeKind): PresentationSelection => ({
  mode,
  density: 'compact',
  preferred: { ...BUILTIN_IDS },
})
const snapshot = (kind: ThemeKind, revision = 0) =>
  resolveTheme({ registry: createThemeRegistry(), selection: selection(kind), revision })
const gate = <T>() => {
  let resolve!: (v: T) => void, reject!: (e: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const tick = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve()
}
type ParticipantFixture = {
  p: PresentationParticipant
  document: { bytes: string; draft: string; undo: string[]; selection: string[] }
  before: string
  view: () => ReturnType<typeof snapshot>
  hidden: () => boolean
  prepareHook: Mock<(context: PhaseContext) => Promise<void>>
  applyHook: Mock<(context: PhaseContext) => Promise<void>>
  rollbackHook: Mock<(context: PhaseContext) => Promise<void>>
}
function fixture() {
  let generation = 0,
    durable: DurablePresentation = {
      revision: 0,
      generation: 0,
      transactionId: 'boot',
      selection: selection('light'),
    }
  const events: ServiceEvent[] = [],
    trace: string[] = []
  const host = {
    announceIntent: vi.fn(async (_requestId: string) => ({ generation: ++generation })),
    persist: vi.fn(
      async (
        context: PhaseContext,
        choice: PresentationSelection,
        expected: number,
      ): Promise<PersistenceOutcome> => {
        trace.push('persist:' + choice.mode)
        if (context.generation !== generation || expected !== durable.revision)
          return { status: 'REFUSED', message: 'CAS refused' }
        durable = {
          revision: durable.revision + 1,
          generation,
          transactionId: context.transactionId,
          selection: choice,
        }
        return { status: 'ACK', durable }
      },
    ),
    reconcile: vi.fn(async (context: PhaseContext, published: DurablePresentation) => {
      trace.push('reconcile:' + published.selection.mode)
      if (context.generation !== generation) throw Error('Stale compensation owner')
      if (JSON.stringify(durable.selection) !== JSON.stringify(published.selection))
        durable = {
          ...published,
          revision: durable.revision + 1,
          generation,
          transactionId: context.transactionId,
        }
      return durable
    }),
  }
  const barrier = {
    visible: false,
    paint: vi.fn(async (_context: PhaseContext) => {
      barrier.visible = true
      trace.push('barrier-painted')
    }),
    reveal: vi.fn((_context: PhaseContext) => {
      barrier.visible = false
      trace.push('reveal')
    }),
    recovery: vi.fn((_message: string) => {
      barrier.visible = true
      trace.push('recovery')
    }),
  }
  const service = createPresentationService({
    sessionId: 'window-1',
    initialSnapshot: snapshot('light'),
    initialDurable: durable,
    host,
    barrier,
  })
  service.subscribe((event) => events.push(event))
  const participants: ParticipantFixture[] = []
  function participant(id: string, participantGeneration = 1): ParticipantFixture {
    const document = {
      bytes: '{"authored":"unchanged"}',
      draft: 'unsaved text',
      undo: ['insert a', 'insert b'],
      selection: ['node1'],
    }
    let view = snapshot('light'),
      hidden = false
    const prepareHook = vi.fn(async (_context: PhaseContext) => undefined),
      applyHook = vi.fn(async (_context: PhaseContext) => undefined),
      rollbackHook = vi.fn(async (_context: PhaseContext) => undefined)
    const ack = (context: PhaseContext): PaintAck => ({
      ...context,
      participantId: id,
      participantGeneration,
      painted: true,
    })
    const p: PresentationParticipant = {
      id,
      generation: participantGeneration,
      hide: () => {
        hidden = true
      },
      reveal: () => {
        hidden = false
      },
      prepare: vi.fn(async (next, context, signal): Promise<PreparedPresentation> => {
        await prepareHook(context)
        return {
          apply: async (phase, phaseSignal) => {
            await applyHook(phase)
            if (signal.aborted || phaseSignal.aborted) throw Error('Invalidated handle')
            view = next
            trace.push('apply:' + id + ':' + next.kind)
            return ack(phase)
          },
          rollback: async (previous, phase, phaseSignal) => {
            await rollbackHook(phase)
            if (phaseSignal.aborted) throw Error('Invalidated rollback')
            view = previous
            trace.push('rollback:' + id + ':' + previous.kind)
            return ack(phase)
          },
          dispose: vi.fn(),
        }
      }),
    }
    const value = {
      p,
      document,
      before: JSON.stringify(document),
      view: () => view,
      hidden: () => hidden,
      prepareHook,
      applyHook,
      rollbackHook,
    }
    participants.push(value)
    return value
  }
  return {
    service,
    host,
    barrier,
    events,
    trace,
    participant,
    participants,
    durable: () => durable,
    setDurable: (value: DurablePresentation) => {
      durable = value
    },
    generation: () => generation,
  }
}
afterEach(() => vi.useRealTimers())
const unchanged = (f: ReturnType<typeof fixture>) => {
  for (const p of f.participants) expect(JSON.stringify(p.document)).toBe(p.before)
}

describe('P01 controlled transaction service', () => {
  it('joins hidden, waits for current applied-paint ACK, previews without persistence and cancels to published state', async () => {
    const f = fixture(),
      p = f.participant('root'),
      joined = f.service.register(p.p)
    expect(p.hidden()).toBe(true)
    await joined.ready
    expect(p.hidden()).toBe(false)
    f.trace.length = 0
    const preview = await f.service.preview(selection('dark'), snapshot('dark', 1))
    expect(preview.status).toBe('APPLIED')
    expect(p.view().kind).toBe('dark')
    expect(f.service.state().preview).toBe(true)
    expect(f.service.state().committedSnapshot.kind).toBe('light')
    expect(f.host.persist).not.toHaveBeenCalled()
    expect(f.durable().selection.mode).toBe('light')
    expect(f.trace.indexOf('barrier-painted')).toBeLessThan(f.trace.indexOf('apply:root:dark'))
    expect((await f.service.cancel()).status).toBe('CANCELED')
    expect(p.view().kind).toBe('light')
    expect(f.events.map((e) => e.type)).toEqual(['did-preview', 'did-cancel'])
    expect(f.barrier.visible).toBe(false)
    unchanged(f)
  })
  it('keeps curtain through apply ACK and durable publication; emits exactly one authoritative change', async () => {
    const f = fixture(),
      a = f.participant('root'),
      b = f.participant('native')
    await f.service.register(a.p).ready
    await f.service.register(b.p).ready
    const write = gate<PersistenceOutcome>(),
      original = f.host.persist.getMockImplementation()!
    f.host.persist.mockImplementationOnce(async (...args) => {
      const outcome = await original(...args)
      await write.promise
      return outcome
    })
    const result = f.service.commit(selection('dark'), snapshot('dark', 1))
    await tick()
    expect(f.service.state().phase).toBe('PERSISTING')
    expect(f.barrier.visible).toBe(true)
    expect(f.events).toHaveLength(0)
    write.resolve({ status: 'UNKNOWN', message: 'release only' })
    expect((await result).status).toBe('COMMITTED')
    expect(f.service.state().durable.selection.mode).toBe('dark')
    expect(f.service.state().preview).toBe(false)
    expect(f.events.map((e) => e.type)).toEqual(['did-change'])
    expect(f.barrier.visible).toBe(false)
    unchanged(f)
  })
  it.each(['prepare', 'apply', 'persist'] as const)(
    'refusal in %s restores all view/durable snapshots, dirty draft, selection and undo',
    async (phase) => {
      const f = fixture(),
        a = f.participant('root'),
        b = f.participant('frame')
      await f.service.register(a.p).ready
      await f.service.register(b.p).ready
      if (phase === 'prepare') b.prepareHook.mockRejectedValueOnce(Error('prepare refused'))
      if (phase === 'apply') b.applyHook.mockRejectedValueOnce(Error('apply refused'))
      if (phase === 'persist')
        f.host.persist.mockResolvedValueOnce({ status: 'REFUSED', message: 'disk refused' })
      const result = await f.service.commit(selection('dark'), snapshot('dark', 1))
      expect(result.status).toBe('REFUSED')
      expect(a.view().kind).toBe('light')
      expect(b.view().kind).toBe('light')
      expect(f.durable().selection.mode).toBe('light')
      expect(f.service.state().snapshot.kind).toBe('light')
      expect(f.events.some((e) => e.type === 'did-change')).toBe(false)
      expect(f.barrier.visible).toBe(false)
      unchanged(f)
    },
  )
  it('unknown response reconciles already-renamed settings before restoring/revealing; no false Saved', async () => {
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    f.host.persist.mockImplementationOnce(async (context) => {
      f.setDurable({
        revision: 1,
        generation: context.generation,
        transactionId: context.transactionId,
        selection: selection('dark'),
      })
      return { status: 'UNKNOWN', message: 'response lost after rename' }
    })
    const result = await f.service.commit(selection('dark'), snapshot('dark', 1))
    expect(result.status).toBe('REFUSED')
    expect(f.durable().selection.mode).toBe('light')
    expect(f.service.state().durable.revision).toBe(2)
    expect(f.trace.indexOf('reconcile:light')).toBeLessThan(f.trace.lastIndexOf('reveal'))
    expect(p.view().kind).toBe('light')
    unchanged(f)
  })
  it.each(['rollback', 'readback'] as const)(
    'unprovable %s retains recovery curtain and dirty editors with no success/reveal',
    async (fault) => {
      const f = fixture(),
        p = f.participant('root')
      await f.service.register(p.p).ready
      f.host.persist.mockResolvedValueOnce({ status: 'UNKNOWN', message: 'unknown' })
      if (fault === 'rollback') p.rollbackHook.mockRejectedValueOnce(Error('rollback refused'))
      else f.host.reconcile.mockRejectedValueOnce(Error('readback unavailable'))
      const result = await f.service.commit(selection('dark'), snapshot('dark', 1))
      expect(result.status).toBe('RECOVERY_BLOCKED')
      expect(f.service.state().phase).toBe('RECOVERY_BLOCKED')
      expect(f.barrier.visible).toBe(true)
      expect(f.events.map((e) => e.type)).toEqual(['recovery-blocked'])
      expect(
        (await f.service.preview(selection('high-contrast'), snapshot('high-contrast', 2))).status,
      ).toBe('RECOVERY_BLOCKED')
      unchanged(f)
    },
  )
  it('A B C supersession during preparation ignores late A, never writes B and publishes C only', async () => {
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    const prepared = gate<void>()
    p.prepareHook.mockImplementationOnce(async () => prepared.promise)
    const a = f.service.commit(selection('dark'), snapshot('dark', 1))
    await tick()
    const b = f.service.commit(selection('light'), snapshot('light', 2)),
      c = f.service.commit(selection('high-contrast'), snapshot('high-contrast', 3))
    prepared.resolve()
    expect((await a).status).toBe('SUPERSEDED')
    expect((await b).status).toBe('SUPERSEDED')
    expect((await c).status).toBe('COMMITTED')
    expect(p.view().kind).toBe('high-contrast')
    expect(f.durable().selection.mode).toBe('high-contrast')
    expect(f.host.persist).toHaveBeenCalledTimes(1)
    expect(f.events.filter((e) => e.type === 'did-change').map((e) => e.snapshot.kind)).toEqual([
      'high-contrast',
    ])
    unchanged(f)
  })
  it('C accepted during A rename reconciles A in the current ownership before any C write/ACK', async () => {
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    const rename = gate<void>(),
      original = f.host.persist.getMockImplementation()!
    f.host.persist.mockImplementationOnce(async (context, choice) => {
      f.trace.push('rename:A-start')
      await rename.promise
      f.setDurable({
        revision: 1,
        generation: context.generation,
        transactionId: context.transactionId,
        selection: choice,
      })
      f.trace.push('rename:A-readback')
      return { status: 'ACK', durable: f.durable() }
    })
    const a = f.service.commit(selection('dark'), snapshot('dark', 1))
    await tick()
    expect(f.service.state().phase).toBe('PERSISTING')
    const c = f.service.commit(selection('high-contrast'), snapshot('high-contrast', 2))
    await tick()
    rename.resolve()
    expect((await a).status).toBe('SUPERSEDED')
    expect((await c).status).toBe('COMMITTED')
    expect(f.trace.indexOf('rename:A-readback')).toBeLessThan(f.trace.indexOf('reconcile:light'))
    expect(f.trace.indexOf('reconcile:light')).toBeLessThan(
      f.trace.indexOf('persist:high-contrast'),
    )
    expect(f.durable().selection.mode).toBe('high-contrast')
    expect(p.view().kind).toBe('high-contrast')
    expect(f.events.filter((e) => e.type === 'did-change')).toHaveLength(1)
    unchanged(f)
    expect(original).toBeDefined()
  })
  it.each(['PREPARING', 'BARRIER_AWAIT_PAINT', 'APPLYING', 'PERSISTING'] as const)(
    'join during %s invalidates membership and safely reprepares once',
    async (phase) => {
      const f = fixture(),
        p = f.participant('root')
      await f.service.register(p.p).ready
      const wait = gate<void>()
      if (phase === 'PREPARING') p.prepareHook.mockImplementationOnce(async () => wait.promise)
      if (phase === 'BARRIER_AWAIT_PAINT')
        f.barrier.paint.mockImplementationOnce(async () => {
          f.barrier.visible = true
          await wait.promise
        })
      if (phase === 'APPLYING') p.applyHook.mockImplementationOnce(async () => wait.promise)
      if (phase === 'PERSISTING') {
        const original = f.host.persist.getMockImplementation()!
        f.host.persist.mockImplementationOnce(async (...args) => {
          await wait.promise
          return original(...args)
        })
      }
      const applying = f.service.commit(selection('dark'), snapshot('dark', 1))
      await tick()
      expect(f.service.state().phase).toBe(phase)
      const b = f.participant('frame', 2),
        joined = f.service.register(b.p)
      expect(b.hidden()).toBe(true)
      wait.resolve()
      expect((await applying).status).toBe('COMMITTED')
      await joined.ready
      expect(p.view().kind).toBe('dark')
      expect(b.view().kind).toBe('dark')
      expect(b.hidden()).toBe(false)
      expect(f.events.filter((e) => e.type === 'did-change')).toHaveLength(1)
      expect(f.barrier.visible).toBe(false)
      unchanged(f)
    },
  )
  it('ongoing membership churn is bounded and cancels instead of retrying indefinitely', async () => {
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    let count = 0
    p.prepareHook.mockImplementation(async (context) => {
      if (context.phase === 'prepare') {
        const b = f.participant('joined-' + ++count)
        f.service.register(b.p)
      }
    })
    const result = await f.service.commit(selection('dark'), snapshot('dark', 1))
    expect(result.status).toBe('REFUSED')
    expect(count).toBe(2)
    expect(p.view().kind).toBe('light')
    expect(f.host.persist).not.toHaveBeenCalled()
    unchanged(f)
  })
  it('leave and generation replacement reject a removed participant ACK', async () => {
    const f = fixture(),
      a = f.participant('root'),
      b = f.participant('frame', 1)
    await f.service.register(a.p).ready
    const old = f.service.register(b.p)
    await old.ready
    const applying = gate<void>()
    b.applyHook.mockImplementationOnce(async () => applying.promise)
    const result = f.service.commit(selection('dark'), snapshot('dark', 1))
    await tick()
    old.dispose()
    const next = f.participant('frame', 2),
      joined = f.service.register(next.p)
    applying.resolve()
    expect((await result).status).toBe('COMMITTED')
    await joined.ready
    expect(next.view().kind).toBe('dark')
    expect(next.hidden()).toBe(false)
    unchanged(f)
  })
  it('paint barrier is mandatory before apply, and forged ACK cannot publish or reveal', async () => {
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    const original = p.p.prepare
    p.p.prepare = async (...args) => {
      const handle = await original(...args)
      return {
        ...handle,
        apply: async (context, signal) => ({
          ...(await handle.apply(context, signal)),
          membership: context.membership + 1,
        }),
      }
    }
    const result = await f.service.commit(selection('dark'), snapshot('dark', 1))
    expect(result.status).toBe('REFUSED')
    expect(p.view().kind).toBe('light')
    expect(f.events.some((e) => e.type === 'did-change')).toBe(false)
    unchanged(f)
  })
  it('prepare deadline is 2s; a late handle is disposed and never applied', async () => {
    vi.useFakeTimers()
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    const wait = gate<void>()
    p.prepareHook.mockImplementationOnce(async () => wait.promise)
    const result = f.service.commit(selection('dark'), snapshot('dark', 1))
    await tick()
    await vi.advanceTimersByTimeAsync(2000)
    expect((await result).status).toBe('REFUSED')
    wait.resolve()
    await tick()
    expect(p.view().kind).toBe('light')
    expect(f.host.persist).not.toHaveBeenCalled()
    unchanged(f)
  })
  it('commit paint deadline is 2s and host/readback deadlines are 5s; unknown host outcome remains safely covered', async () => {
    vi.useFakeTimers()
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    p.applyHook.mockImplementationOnce(async () => new Promise(() => {}))
    const apply = f.service.commit(selection('dark'), snapshot('dark', 1))
    await tick()
    await vi.advanceTimersByTimeAsync(2000)
    expect((await apply).status).toBe('REFUSED')
    expect(p.view().kind).toBe('light')
    f.host.persist.mockImplementationOnce(async () => new Promise(() => {}))
    f.host.reconcile.mockImplementationOnce(async () => new Promise(() => {}))
    const persist = f.service.commit(selection('dark'), snapshot('dark', 2))
    await tick()
    await vi.advanceTimersByTimeAsync(5000)
    expect(f.barrier.visible).toBe(true)
    expect(f.service.state().phase).toBe('RECONCILING_UNKNOWN')
    await vi.advanceTimersByTimeAsync(5000)
    expect((await persist).status).toBe('RECOVERY_BLOCKED')
    expect(f.barrier.visible).toBe(true)
    unchanged(f)
  })
  it('cancel during persistence reconciles first, then permits close/dirty-guard continuation', async () => {
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    const wait = gate<void>()
    f.host.persist.mockImplementationOnce(async (context) => {
      await wait.promise
      f.setDurable({
        revision: 1,
        generation: context.generation,
        transactionId: context.transactionId,
        selection: selection('dark'),
      })
      return { status: 'ACK', durable: f.durable() }
    })
    const active = f.service.commit(selection('dark'), snapshot('dark', 1))
    await tick()
    const cancel = f.service.cancel()
    wait.resolve()
    expect((await active).status).toBe('SUPERSEDED')
    expect((await cancel).status).toBe('CANCELED')
    expect(p.view().kind).toBe('light')
    expect(f.durable().selection.mode).toBe('light')
    expect(f.barrier.visible).toBe(false)
    unchanged(f)
  })
  it.each(['BARRIER_AWAIT_PAINT', 'APPLYING', 'PERSISTING'] as const)(
    'curtain stays painted throughout %s membership compensation and reprepare',
    async (phase) => {
      const f = fixture(),
        p = f.participant('root')
      await f.service.register(p.p).ready
      const wait = gate<void>()
      if (phase === 'BARRIER_AWAIT_PAINT')
        f.barrier.paint.mockImplementationOnce(async () => {
          f.barrier.visible = true
          await wait.promise
        })
      if (phase === 'APPLYING') p.applyHook.mockImplementationOnce(async () => wait.promise)
      if (phase === 'PERSISTING') {
        const original = f.host.persist.getMockImplementation()!
        f.host.persist.mockImplementationOnce(async (...args) => {
          await wait.promise
          return original(...args)
        })
      }
      let preparations = 0
      p.prepareHook.mockImplementation(async (context) => {
        if (context.phase === 'prepare' && ++preparations === 2)
          expect(f.barrier.visible).toBe(true)
      })
      const active = f.service.commit(selection('dark'), snapshot('dark', 1))
      await tick()
      const b = f.participant('frame'),
        joined = f.service.register(b.p)
      wait.resolve()
      expect((await active).status).toBe('COMMITTED')
      await joined.ready
      expect(preparations).toBe(2)
      expect(f.barrier.visible).toBe(false)
      unchanged(f)
    },
  )
  it('membership change during compensation rejects obsolete rollback ACK and retains covered recovery', async () => {
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    f.host.persist.mockResolvedValueOnce({ status: 'UNKNOWN', message: 'unknown' })
    const wait = gate<void>()
    p.rollbackHook.mockImplementationOnce(async () => wait.promise)
    const active = f.service.commit(selection('dark'), snapshot('dark', 1))
    await tick()
    expect(f.service.state().phase).toBe('COMPENSATING')
    const b = f.participant('frame'),
      joined = f.service.register(b.p)
    const ready = joined.ready.catch((error) => error)
    wait.resolve()
    expect((await active).status).toBe('RECOVERY_BLOCKED')
    expect(f.barrier.visible).toBe(true)
    expect(b.hidden()).toBe(true)
    await ready
    unchanged(f)
  })
  it('membership change during reconciliation never reveals an incompletely acknowledged set', async () => {
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    f.host.persist.mockResolvedValueOnce({ status: 'UNKNOWN', message: 'unknown' })
    const wait = gate<void>(),
      original = f.host.reconcile.getMockImplementation()!
    f.host.reconcile.mockImplementationOnce(async (...args) => {
      await wait.promise
      return original(...args)
    })
    const active = f.service.commit(selection('dark'), snapshot('dark', 1))
    await tick()
    expect(f.service.state().phase).toBe('RECONCILING_UNKNOWN')
    const b = f.participant('frame'),
      joined = f.service.register(b.p),
      ready = joined.ready.catch((error) => error)
    wait.resolve()
    expect((await active).status).toBe('RECOVERY_BLOCKED')
    expect(f.barrier.visible).toBe(true)
    expect(b.hidden()).toBe(true)
    await ready
    unchanged(f)
  })
  it('recovery action proves current durable state and all participant paints before revealing', async () => {
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    f.host.persist.mockResolvedValueOnce({ status: 'UNKNOWN', message: 'lost' })
    f.host.reconcile.mockRejectedValueOnce(Error('offline'))
    expect((await f.service.commit(selection('dark'), snapshot('dark', 1))).status).toBe(
      'RECOVERY_BLOCKED',
    )
    expect((await f.service.recover()).status).toBe('CANCELED')
    expect(f.durable().selection.mode).toBe('light')
    expect(p.view().kind).toBe('light')
    expect(f.barrier.visible).toBe(false)
    unchanged(f)
  })
  it('service owns queued selections and snapshot revisions instead of retaining mutable caller references', async () => {
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    const wait = gate<void>()
    p.prepareHook.mockImplementationOnce(async () => wait.promise)
    const choice: {
      mode: PresentationSelection['mode']
      density: PresentationSelection['density']
      preferred: Record<ThemeKind, string>
    } = { ...selection('dark'), preferred: { ...BUILTIN_IDS } }
    const initial = snapshot('dark', 0)
    const active = f.service.commit(choice, initial)
    await tick()
    choice.mode = 'light'
    choice.preferred.dark = BUILTIN_IDS.light
    wait.resolve()
    expect((await active).status).toBe('COMMITTED')
    expect(f.durable().selection.mode).toBe('dark')
    expect(f.service.state().snapshot.revision).toBeGreaterThan(0)
    expect(f.service.state().durable.selection.preferred.dark).toBe(BUILTIN_IDS.dark)
    expect(initial.revision).toBe(0)
    unchanged(f)
  })
  it('join during published preview applies the visible revision hidden and cancellation restores every member', async () => {
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    await f.service.preview(selection('dark'), snapshot('dark', 1))
    expect(f.service.state().phase).toBe('PUBLISHED')
    const b = f.participant('frame'),
      wait = gate<void>()
    b.applyHook.mockImplementationOnce(async () => wait.promise)
    const joined = f.service.register(b.p)
    await tick()
    expect(b.hidden()).toBe(true)
    wait.resolve()
    await joined.ready
    expect(b.view().kind).toBe('dark')
    expect(b.hidden()).toBe(false)
    expect(f.host.persist).not.toHaveBeenCalled()
    await f.service.cancel()
    expect(b.view().kind).toBe('light')
    expect(p.view().kind).toBe('light')
    unchanged(f)
  })
  it('membership during cancellation is bounded and restores published selection before guard continuation', async () => {
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    await f.service.preview(selection('dark'), snapshot('dark', 1))
    const wait = gate<void>()
    p.prepareHook.mockImplementationOnce(async () => wait.promise)
    const cancel = f.service.cancel()
    await tick()
    expect(f.service.state().phase).toBe('CANCELING')
    const b = f.participant('frame'),
      joined = f.service.register(b.p)
    wait.resolve()
    expect((await cancel).status).toBe('CANCELED')
    await joined.ready
    expect(b.view().kind).toBe('light')
    expect(f.barrier.visible).toBe(false)
    expect(f.durable().selection.mode).toBe('light')
    unchanged(f)
  })
})

baseIt('P01 service BDD traceability rejects stale assertion source and missing cases', () => {
  const trace = JSON.parse(
    readFileSync(
      new URL('../../../../docs/ui/decisions/p01-theme-traceability.json', import.meta.url),
      'utf8',
    ),
  )
  expect(trace.serviceBindings.map((binding: { id: string }) => binding.id)).toEqual(
    serviceCases.map((scenario) => scenario.id),
  )
  for (const binding of trace.serviceBindings) {
    expect(binding.scope).toBe('CONTROLLED_TRANSACTION_SERVICE_BDD')
    expect(
      createHash('sha256')
        .update(readFileSync(new URL('../../../../' + binding.assertion.file, import.meta.url)))
        .digest('hex'),
    ).toBe(binding.assertion.sha256)
  }
})

baseIt(
  'named theme lifecycle events carry immutable snapshots and disposable listeners',
  async () => {
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    const will: string[] = [],
      did: string[] = [],
      failed: string[] = []
    const stop = f.service.onWillChangeTheme((event) => {
      expect(Object.isFrozen(event)).toBe(true)
      expect(Object.isFrozen(event.candidate.colors)).toBe(true)
      expect(event.previous.kind).toBe('light')
      expect(f.trace.some((line) => line === 'apply:root:dark')).toBe(false)
      will.push(event.candidate.kind)
    })
    f.service.onDidChangeTheme((event) => did.push(event.snapshot.kind))
    f.service.onThemeChangeFailed((event) => failed.push(event.reason))
    expect((await f.service.preview(selection('dark'), snapshot('dark', 1))).status).toBe('APPLIED')
    stop()
    expect((await f.service.cancel()).status).toBe('CANCELED')
    expect(will).toEqual(['dark'])
    expect(did).toEqual(['dark', 'light'])
    expect(failed).toEqual([])
    unchanged(f)
  },
)
baseIt(
  'named failure lifecycle never emits a successful change for a refused candidate',
  async () => {
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    const failed: string[] = [],
      did: string[] = []
    f.service.onDidChangeTheme((event) => did.push(event.snapshot.kind))
    f.service.onThemeChangeFailed((event) => failed.push(event.reason))
    p.prepareHook.mockRejectedValueOnce(Error('adapter refused'))
    expect((await f.service.commit(selection('dark'), snapshot('dark', 1))).status).toBe('REFUSED')
    expect(did).toEqual([])
    expect(failed).toEqual(['adapter refused'])
    unchanged(f)
  },
)

baseIt(
  'observer exception is diagnosed without replacing durable publication or damaging dirty editors',
  async () => {
    const f = fixture(),
      p = f.participant('root')
    await f.service.register(p.p).ready
    f.service.onDidChangeTheme(() => {
      throw Error('observer failed')
    })
    expect((await f.service.commit(selection('dark'), snapshot('dark', 1))).status).toBe(
      'COMMITTED',
    )
    expect(f.service.state().durable.selection.mode).toBe('dark')
    expect(f.service.state().diagnostics).toContain('Observer failure: observer failed')
    expect(f.barrier.visible).toBe(false)
    unchanged(f)
  },
)

baseIt(
  'independent prepared consumers paint concurrently beneath one barrier; publish and persist wait for every exact ACK',
  async () => {
    const f = fixture(),
      members = ['root', 'native', 'frame'].map((id) => f.participant(id))
    for (const member of members) await f.service.register(member.p).ready
    const waits = members.map(() => gate<void>())
    members.forEach((member, index) =>
      member.applyHook.mockImplementationOnce(async () => waits[index].promise),
    )
    const active = f.service.commit(selection('dark'), snapshot('dark', 1))
    try {
      await tick()
      members.forEach((member) => expect(member.applyHook).toHaveBeenCalledTimes(2))
      expect(f.barrier.visible).toBe(true)
      expect(f.host.persist).not.toHaveBeenCalled()
      expect(f.events).toHaveLength(0)
      waits[1].resolve()
      waits[2].resolve()
      await tick()
      expect(f.host.persist).not.toHaveBeenCalled()
      expect(f.barrier.visible).toBe(true)
      waits[0].resolve()
      expect((await active).status).toBe('COMMITTED')
      expect(f.host.persist).toHaveBeenCalledTimes(1)
      expect(f.events.map((event) => event.type)).toEqual(['did-change'])
      members.forEach((member) => {
        expect(member.view().kind).toBe('dark')
        expect(JSON.stringify(member.document)).toBe(member.before)
      })
    } finally {
      waits.forEach((wait) => wait.resolve())
      await active
    }
  },
)
baseIt(
  'a concurrent refused consumer aborts peers and waits for in-flight settlement before compensation; late paints cannot escape rollback',
  async () => {
    const f = fixture(),
      root = f.participant('root'),
      frame = f.participant('frame')
    await f.service.register(root.p).ready
    await f.service.register(frame.p).ready
    const wait = gate<void>()
    root.applyHook.mockImplementationOnce(async () => wait.promise)
    frame.applyHook.mockImplementationOnce(async () => {
      throw Error('Current frame refused')
    })
    const active = f.service.commit(selection('dark'), snapshot('dark', 1))
    try {
      await tick()
      expect(frame.applyHook).toHaveBeenCalledTimes(2)
      expect(root.rollbackHook).not.toHaveBeenCalled()
      expect(f.host.persist).not.toHaveBeenCalled()
      expect(f.barrier.visible).toBe(true)
      wait.resolve()
      expect((await active).status).toBe('REFUSED')
      expect(root.view().kind).toBe('light')
      expect(frame.view().kind).toBe('light')
      expect(f.host.persist).not.toHaveBeenCalled()
      expect(f.events.map((event) => event.type)).toEqual(['failure'])
      expect(f.barrier.visible).toBe(false)
      for (const member of [root, frame])
        expect(JSON.stringify(member.document)).toBe(member.before)
    } finally {
      wait.resolve()
      await active
    }
  },
)
