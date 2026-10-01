import { freezeOwned } from './types'
import type { PresentationSelection, ResolvedTheme } from './types'
export type TransactionPhase =
  | 'IDLE'
  | 'PREPARING'
  | 'READY'
  | 'BARRIER_AWAIT_PAINT'
  | 'APPLYING'
  | 'PERSISTING'
  | 'RECONCILING_UNKNOWN'
  | 'COMPENSATING'
  | 'PUBLISHED'
  | 'CANCELING'
  | 'RECOVERY_BLOCKED'
export interface PhaseContext {
  readonly version: 1
  readonly requestId: string
  readonly sessionId: string
  readonly generation: number
  readonly transactionId: string
  readonly revision: number
  readonly membership: number
  readonly phase: 'prepare' | 'apply' | 'rollback' | 'join'
}
export interface PaintAck extends PhaseContext {
  readonly participantId: string
  readonly participantGeneration: number
  readonly painted: true
}
export interface PreparedPresentation {
  apply(context: PhaseContext, signal: AbortSignal): Promise<PaintAck>
  rollback(snapshot: ResolvedTheme, context: PhaseContext, signal: AbortSignal): Promise<PaintAck>
  dispose(): void
}
export interface PresentationParticipant {
  /** Needs the neutral cover before allowing its rendering surface to paint while concealed. */
  readonly requiresPaintCover?: boolean
  readonly id: string
  readonly generation: number
  hide(): void
  reveal(): void
  prepare(
    snapshot: ResolvedTheme,
    context: PhaseContext,
    signal: AbortSignal,
  ): Promise<PreparedPresentation>
}
export interface DurablePresentation {
  readonly revision: number
  readonly generation: number
  readonly transactionId: string
  readonly selection: PresentationSelection
}
export type PersistenceOutcome =
  | { readonly status: 'ACK'; readonly durable: DurablePresentation }
  | { readonly status: 'REFUSED' | 'UNKNOWN'; readonly message: string }
export interface PresentationHost {
  announceIntent(requestId: string): Promise<{ readonly generation: number }>
  persist(
    context: PhaseContext,
    selection: PresentationSelection,
    expectedRevision: number,
  ): Promise<PersistenceOutcome>
  reconcile(context: PhaseContext, lastPublished: DurablePresentation): Promise<DurablePresentation>
}
export interface PresentationBarrier {
  paint(context: PhaseContext): Promise<void>
  reveal(context: PhaseContext): void
  recovery(message: string): void
}
export interface ThemeWillChange {
  readonly previous: ResolvedTheme
  readonly candidate: ResolvedTheme
  readonly revision: number
}
export interface ThemeDidChange {
  readonly snapshot: ResolvedTheme
}
export interface ThemeChangeFailed {
  readonly reason: string
  readonly revision: number
}
export interface ServiceEvent {
  readonly type:
    'did-preview' | 'did-change' | 'did-cancel' | 'did-refresh' | 'failure' | 'recovery-blocked'
  readonly snapshot: ResolvedTheme
  readonly revision: number
  readonly message?: string
}
export interface ServiceState {
  readonly phase: TransactionPhase
  readonly snapshot: ResolvedTheme
  readonly committedSnapshot: ResolvedTheme
  readonly durable: DurablePresentation
  readonly preview: boolean
  readonly diagnostics: readonly string[]
}
export interface TransactionResult {
  readonly status:
    'APPLIED' | 'COMMITTED' | 'CANCELED' | 'REFUSED' | 'SUPERSEDED' | 'RECOVERY_BLOCKED'
  readonly snapshot: ResolvedTheme
  readonly message?: string
}
export interface PresentationService {
  state(): ServiceState
  subscribe(listener: (event: ServiceEvent) => void): () => void
  onWillChangeTheme(listener: (event: ThemeWillChange) => void): () => void
  onDidChangeTheme(listener: (event: ThemeDidChange) => void): () => void
  onThemeChangeFailed(listener: (event: ThemeChangeFailed) => void): () => void
  register(participant: PresentationParticipant): { ready: Promise<void>; dispose(): void }
  preview(selection: PresentationSelection, snapshot: ResolvedTheme): Promise<TransactionResult>
  commit(selection: PresentationSelection, snapshot: ResolvedTheme): Promise<TransactionResult>
  refreshEnvironment(
    committedSnapshot: ResolvedTheme,
    previewSnapshot?: ResolvedTheme,
  ): Promise<TransactionResult>
  cancel(currentEnvironmentBaseline?: ResolvedTheme): Promise<TransactionResult>
  recover(currentEnvironmentBaseline?: ResolvedTheme): Promise<TransactionResult>
}
export interface ServiceOptions {
  readonly sessionId: string
  readonly initialSnapshot: ResolvedTheme
  readonly initialDurable: DurablePresentation
  readonly host: PresentationHost
  readonly barrier: PresentationBarrier
}

class Invalidated extends Error {
  constructor(readonly reason: 'intent' | 'membership') {
    super(reason + ' invalidated')
  }
}
const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)
function bounded<T>(
  promise: Promise<T>,
  milliseconds: number,
  phase: string,
  late?: (value: T) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let finished = false
    const timer = setTimeout(() => {
      finished = true
      reject(new Error(phase + ' deadline exceeded (' + milliseconds + 'ms)'))
    }, milliseconds)
    promise.then(
      (value) => {
        if (finished) {
          late?.(value)
          return
        }
        finished = true
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        if (finished) return
        finished = true
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}
export function createPresentationService(options: ServiceOptions): PresentationService {
  type Work = {
    sequence: number
    requestId: string
    intent: Promise<{ generation: number }>
    generation: number
    action: 'preview' | 'commit' | 'cancel' | 'recover' | 'refresh'
    environmentBaseline?: ResolvedTheme
    preservePreview?: boolean
    selection: PresentationSelection
    snapshot: ResolvedTheme
  }
  type Member = { participant: PresentationParticipant; readyRevision?: number }
  type Handle = { member: Member; prepared: PreparedPresentation }
  const members = new Map<string, Member>(),
    listeners = new Set<(event: ServiceEvent) => void>(),
    willListeners = new Set<(event: ThemeWillChange) => void>(),
    diagnostics: string[] = []
  let phase: TransactionPhase = 'IDLE',
    current = freezeOwned(structuredClone(options.initialSnapshot)),
    committed = current,
    durable = freezeOwned(structuredClone(options.initialDurable)),
    preview = false
  let sequence = 0,
    membership = 0,
    latest: Work | undefined,
    controller: AbortController | undefined,
    tail: Promise<unknown> = Promise.resolve()
  const notify = <T>(targets: ReadonlySet<(event: T) => void>, event: T) => {
    for (const listener of targets)
      try {
        listener(event)
      } catch (error) {
        diagnostics.push('Observer failure: ' + messageOf(error))
      }
  }
  const emit = (type: ServiceEvent['type'], message?: string) =>
    notify(
      listeners,
      Object.freeze({
        type,
        snapshot: current,
        revision: latest?.snapshot.revision ?? current.revision,
        ...(message === undefined ? {} : { message }),
      }),
    )
  const enqueue = <T>(run: () => Promise<T>): Promise<T> => {
    const result = tail.then(run, run)
    tail = result
    return result
  }
  const context = (
    work: Work,
    stage: PhaseContext['phase'],
    revision = work.snapshot.revision,
    version = membership,
  ): PhaseContext =>
    Object.freeze({
      version: 1,
      requestId: work.requestId,
      sessionId: options.sessionId,
      generation: work.generation,
      transactionId: work.requestId,
      revision,
      membership: version,
      phase: stage,
    })
  const check = (work: Work, version: number) => {
    if (work !== latest) throw new Invalidated('intent')
    if (version !== membership) throw new Invalidated('membership')
  }
  const validateAck = (ack: PaintAck, expected: PhaseContext, member: Member) => {
    const keys = [
      'version',
      'requestId',
      'sessionId',
      'generation',
      'transactionId',
      'revision',
      'membership',
      'phase',
      'participantId',
      'participantGeneration',
      'painted',
    ]
    if (
      Object.keys(ack).length !== keys.length ||
      Object.keys(ack).some((key) => !keys.includes(key)) ||
      ack.painted !== true ||
      ack.participantId !== member.participant.id ||
      ack.participantGeneration !== member.participant.generation ||
      Object.keys(expected).some(
        (key) => ack[key as keyof PhaseContext] !== expected[key as keyof PhaseContext],
      )
    )
      throw new Error('Invalid applied-paint acknowledgement: ' + member.participant.id)
    if (members.get(member.participant.id) !== member || expected.membership !== membership)
      throw new Invalidated('membership')
  }
  const block = (error: unknown): TransactionResult => {
    phase = 'RECOVERY_BLOCKED'
    const message = messageOf(error)
    options.barrier.recovery(message)
    emit('recovery-blocked', message)
    return Object.freeze({ status: 'RECOVERY_BLOCKED', snapshot: current, message })
  }
  const validateDurable = (
    value: DurablePresentation,
    choice: PresentationSelection,
    previousRevision: number,
  ) => {
    if (
      !Number.isSafeInteger(value.revision) ||
      value.revision < previousRevision ||
      !Number.isSafeInteger(value.generation) ||
      value.generation < 0 ||
      typeof value.transactionId !== 'string' ||
      JSON.stringify(value.selection) !== JSON.stringify(choice)
    )
      throw new Error('Unprovable authoritative settings readback')
  }
  async function owner(): Promise<Work> {
    if (!latest) throw new Error('No accepted intent owner')
    const work = latest,
      accepted = await bounded(work.intent, 5000, 'announce')
    work.generation = accepted.generation
    if (latest !== work) return owner()
    return work
  }
  async function compensate(
    work: Work,
    handles: Handle[],
    changed: boolean,
    persistenceAttempted: boolean,
    keepCovered = false,
  ): Promise<void> {
    controller?.abort()
    const owned = await bounded(owner(), 5000, 'compensation ownership'),
      recoveryController = new AbortController(),
      signal = recoveryController.signal,
      capturedMembership = membership
    try {
      if (changed || persistenceAttempted || preview) {
        phase = 'COMPENSATING'
        await bounded(
          options.barrier.paint(context(owned, 'rollback', committed.revision, capturedMembership)),
          2000,
          'compensation barrier paint',
        )
        for (const member of [...members.values()]) {
          const existing = handles.find((item) => item.member === member)
          const expected = context(owned, 'rollback', committed.revision, capturedMembership)
          if (existing)
            validateAck(
              await bounded(
                existing.prepared.rollback(committed, expected, signal),
                2000,
                'rollback ' + member.participant.id,
              ),
              expected,
              member,
            )
          else {
            const prepared = await bounded(
              member.participant.prepare(committed, expected, signal),
              2000,
              'rollback prepare ' + member.participant.id,
              (late) => late.dispose(),
            )
            try {
              validateAck(
                await bounded(
                  prepared.apply(expected, signal),
                  2000,
                  'rollback paint ' + member.participant.id,
                ),
                expected,
                member,
              )
            } finally {
              prepared.dispose()
            }
          }
          member.readyRevision = committed.revision
        }
      }
      if (persistenceAttempted) {
        phase = 'RECONCILING_UNKNOWN'
        const value = await bounded(
          options.host.reconcile(context(owned, 'rollback', committed.revision), durable),
          5000,
          'authoritative reconciliation',
        )
        validateDurable(value, durable.selection, durable.revision)
        durable = freezeOwned(structuredClone(value))
      }
      if (capturedMembership !== membership) throw new Invalidated('membership')
      current = committed
      preview = false
      for (const item of handles) item.prepared.dispose()
      if (work === latest && !keepCovered) {
        for (const member of members.values())
          if (member.readyRevision === current.revision) member.participant.reveal()
        options.barrier.reveal(context(owned, 'rollback', committed.revision))
      }
    } finally {
      recoveryController.abort()
    }
  }
  async function execute(work: Work): Promise<TransactionResult> {
    if (phase === 'RECOVERY_BLOCKED' && work.action !== 'recover')
      return { status: 'RECOVERY_BLOCKED', snapshot: current, message: 'Recovery required' }
    if (work !== latest) return { status: 'SUPERSEDED', snapshot: current }
    try {
      work.generation = (await bounded(work.intent, 5000, 'announce')).generation
    } catch (error) {
      return block(error)
    }
    if (work !== latest) return { status: 'SUPERSEDED', snapshot: current }
    if (work.action === 'recover') {
      try {
        await compensate(work, [], true, true, true)
      } catch (error) {
        return block(error)
      }
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      const capturedMembership = membership,
        handles: Handle[] = []
      let changed = false,
        persistenceAttempted = false
      controller = new AbortController()
      const signal = controller.signal
      try {
        phase = work.action === 'cancel' || work.action === 'recover' ? 'CANCELING' : 'PREPARING'
        if (attempt === 0)
          notify(
            willListeners,
            Object.freeze({
              previous: current,
              candidate: work.snapshot,
              revision: work.snapshot.revision,
            }),
          )
        for (const member of [...members.values()]) {
          check(work, capturedMembership)
          const expected = context(work, 'prepare', work.snapshot.revision, capturedMembership)
          const prepared = await bounded(
            member.participant.prepare(work.snapshot, expected, signal),
            2000,
            'prepare ' + member.participant.id,
            (late) => late.dispose(),
          )
          handles.push({ member, prepared })
          check(work, capturedMembership)
        }
        phase = 'READY'
        check(work, capturedMembership)
        phase = 'BARRIER_AWAIT_PAINT'
        await bounded(
          options.barrier.paint(context(work, 'apply', work.snapshot.revision, capturedMembership)),
          2000,
          'barrier paint',
        )
        check(work, capturedMembership)
        phase = 'APPLYING'
        changed = true
        const expected = context(work, 'apply', work.snapshot.revision, capturedMembership)
        // The transaction stays serialized; independent prepared consumers share one
        // painted cover. Await every settlement before any compensation or publication.
        const applied = await Promise.allSettled(
          handles.map(async (item) => {
            try {
              check(work, capturedMembership)
              validateAck(
                await bounded(
                  item.prepared.apply(expected, signal),
                  2000,
                  'apply ' + item.member.participant.id,
                ),
                expected,
                item.member,
              )
              check(work, capturedMembership)
            } catch (error) {
              controller?.abort()
              throw error
            }
          }),
        )
        const failed = applied.find((result) => result.status === 'rejected')
        if (failed?.status === 'rejected') throw failed.reason
        check(work, capturedMembership)
        for (const item of handles) item.member.readyRevision = work.snapshot.revision
        if (work.action === 'commit') {
          phase = 'PERSISTING'
          persistenceAttempted = true
          const expected = context(work, 'apply', work.snapshot.revision, capturedMembership)
          const outcome = await bounded(
            options.host.persist(expected, work.selection, durable.revision),
            5000,
            'host write/readback',
          )
          check(work, capturedMembership)
          if (outcome.status !== 'ACK') throw new Error(outcome.message)
          validateDurable(outcome.durable, work.selection, durable.revision + 1)
          if (
            outcome.durable.generation !== work.generation ||
            outcome.durable.transactionId !== work.requestId
          )
            throw new Error('Stale durable acknowledgement')
          durable = freezeOwned(structuredClone(outcome.durable))
          committed = work.snapshot
        }
        check(work, capturedMembership)
        if (work.environmentBaseline) committed = work.environmentBaseline
        current = work.snapshot
        preview =
          work.action === 'preview' || (work.action === 'refresh' && work.preservePreview === true)
        phase = 'PUBLISHED'
        for (const item of handles) item.prepared.dispose()
        for (const member of members.values()) member.participant.reveal()
        options.barrier.reveal(context(work, 'apply', work.snapshot.revision, capturedMembership))
        emit(
          work.action === 'refresh'
            ? 'did-refresh'
            : work.action === 'preview'
              ? 'did-preview'
              : work.action === 'commit'
                ? 'did-change'
                : 'did-cancel',
        )
        return {
          status:
            work.action === 'preview' || work.action === 'refresh'
              ? 'APPLIED'
              : work.action === 'commit'
                ? 'COMMITTED'
                : 'CANCELED',
          snapshot: current,
        }
      } catch (error) {
        // A disposed apply handle may throw its own adapter error. Membership ownership,
        // rather than its error class, determines whether the one safe reprepare applies.
        const invalidatedMembership = capturedMembership !== membership
        try {
          await compensate(
            work,
            handles,
            changed,
            persistenceAttempted,
            invalidatedMembership && attempt === 0,
          )
        } catch (recoveryError) {
          return block(recoveryError)
        }
        if (work !== latest) return { status: 'SUPERSEDED', snapshot: current }
        if (invalidatedMembership && attempt === 0) continue
        phase = 'IDLE'
        const message = messageOf(error)
        emit('failure', message)
        return { status: 'REFUSED', snapshot: current, message }
      }
    }
    throw new Error('Unreachable bounded transaction state')
  }
  const request = (
    action: Work['action'],
    choice: PresentationSelection,
    snapshot: ResolvedTheme,
    environmentBaseline?: ResolvedTheme,
    preservePreview = false,
  ): Promise<TransactionResult> => {
    if (phase === 'RECOVERY_BLOCKED' && action !== 'recover')
      return Promise.resolve({
        status: 'RECOVERY_BLOCKED',
        snapshot: current,
        message: 'Recovery required',
      })
    const requestId = options.sessionId + '/intent-' + ++sequence
    const work: Work = {
      sequence,
      requestId,
      intent: options.host.announceIntent(requestId),
      generation: 0,
      action,
      selection: freezeOwned(structuredClone(choice)),
      snapshot: freezeOwned({
        ...structuredClone(snapshot),
        revision:
          (action === 'cancel' || action === 'recover') && !environmentBaseline
            ? snapshot.revision
            : options.initialSnapshot.revision + sequence,
      }),
    }
    if (environmentBaseline) {
      work.environmentBaseline = freezeOwned({
        ...structuredClone(environmentBaseline),
        revision: work.snapshot.revision,
      })
      work.preservePreview = preservePreview
    }
    latest = work
    controller?.abort()
    return enqueue(() => execute(work))
  }
  return {
    state: () =>
      Object.freeze({
        phase,
        snapshot: current,
        committedSnapshot: committed,
        durable,
        preview,
        diagnostics: Object.freeze([...diagnostics]),
      }),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    onWillChangeTheme: (listener) => {
      willListeners.add(listener)
      return () => {
        willListeners.delete(listener)
      }
    },
    onDidChangeTheme: (listener) => {
      const handler = (event: ServiceEvent) => {
        if (
          event.type === 'did-refresh' ||
          event.type === 'did-preview' ||
          event.type === 'did-change' ||
          event.type === 'did-cancel'
        )
          listener(Object.freeze({ snapshot: event.snapshot }))
      }
      listeners.add(handler)
      return () => {
        listeners.delete(handler)
      }
    },
    onThemeChangeFailed: (listener) => {
      const handler = (event: ServiceEvent) => {
        if (event.type === 'failure' || event.type === 'recovery-blocked')
          listener(
            Object.freeze({
              reason: event.message ?? 'Unknown presentation failure',
              revision: event.revision,
            }),
          )
      }
      listeners.add(handler)
      return () => {
        listeners.delete(handler)
      }
    },
    preview: (choice, snapshot) => request('preview', choice, snapshot),
    commit: (choice, snapshot) => request('commit', choice, snapshot),
    refreshEnvironment: (baseline, visible) =>
      request('refresh', durable.selection, visible ?? baseline, baseline, visible !== undefined),
    cancel: (baseline) => request('cancel', durable.selection, baseline ?? committed, baseline),
    recover: (baseline) => request('recover', durable.selection, baseline ?? committed, baseline),
    register: (participant) => {
      if (members.has(participant.id))
        throw new Error('Participant identity already registered: ' + participant.id)
      const member: Member = { participant }
      participant.hide()
      members.set(participant.id, member)
      membership++
      controller?.abort()
      const ready = enqueue(async () => {
        if (members.get(participant.id) !== member) return
        if (phase === 'RECOVERY_BLOCKED')
          throw new Error('Participant remains hidden: recovery required')
        const owned = latest
          ? await owner()
          : {
              sequence: 0,
              requestId: options.sessionId + '/boot',
              generation: durable.generation,
              intent: Promise.resolve({ generation: durable.generation }),
              action: 'preview' as const,
              selection: durable.selection,
              snapshot: current,
            }
        const expected = context(owned, 'join', current.revision),
          signal = new AbortController().signal
        let prepared: PreparedPresentation | undefined
        try {
          prepared = await bounded(
            participant.prepare(current, expected, signal),
            2000,
            'join prepare ' + participant.id,
            (late) => late.dispose(),
          )
          if (participant.requiresPaintCover)
            await bounded(options.barrier.paint(expected), 2000, 'join cover ' + participant.id)
          if (members.get(participant.id) !== member) throw Error('Joining participant invalidated')
          validateAck(
            await bounded(prepared.apply(expected, signal), 2000, 'join paint ' + participant.id),
            expected,
            member,
          )
          member.readyRevision = current.revision
          participant.reveal()
          if (participant.requiresPaintCover) options.barrier.reveal(expected)
        } catch (error) {
          block(error)
          throw error
        } finally {
          prepared?.dispose()
        }
      })
      return {
        ready,
        dispose: () => {
          if (members.get(participant.id) === member) {
            members.delete(participant.id)
            membership++
            controller?.abort()
          }
        },
      }
    },
  }
}
