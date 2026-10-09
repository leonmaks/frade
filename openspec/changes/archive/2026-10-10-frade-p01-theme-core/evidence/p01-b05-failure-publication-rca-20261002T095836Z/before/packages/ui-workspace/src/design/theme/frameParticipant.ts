import type { PresentationParticipant, PhaseContext, PaintAck } from './service'
import type { ResolvedTheme } from './types'
import { validatePresentationSnapshot } from './rootParticipant'
export interface FrameParticipantOptions {
  readonly id: string
  readonly generation: number
  readonly sessionId: string
  readonly origin?: string
  readonly onInvalidated?: () => void
  readonly onShortcut?: (key: 'k' | 't' | 'Escape') => void
  /** Authenticated local lower-menu failure; never a second transaction outcome. */
  readonly onPresentationDiagnostic?: (message: string) => void
  /** Owned ancestor lease, acquired only under the service's painted neutral cover. */
  readonly paintSurface?: () => () => void
  /** Parent rendering checkpoint before a newly staged cross-frame paint request. */
  readonly surfacePaint?: () => Promise<void> | undefined
}
const phaseKeys = [
  'version',
  'requestId',
  'sessionId',
  'generation',
  'transactionId',
  'revision',
  'membership',
  'phase',
] as const
const boundedIdentity = (value: unknown) =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= 160 &&
  /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(value) &&
  !value.split('/').some((part) => !part || part === '.' || part === '..')
function validatePhase(value: PhaseContext, sessionId: string): void {
  if (
    Object.keys(value).length !== phaseKeys.length ||
    phaseKeys.some((key) => !Object.hasOwn(value, key)) ||
    value.version !== 1 ||
    value.sessionId !== sessionId ||
    !['prepare', 'apply', 'rollback', 'join'].includes(value.phase) ||
    value.requestId !== value.transactionId ||
    ![value.requestId, value.sessionId, value.transactionId].every(boundedIdentity) ||
    ![value.generation, value.revision, value.membership].every(
      (number) => Number.isSafeInteger(number) && number >= 0,
    )
  )
    throw Error('Invalid frame presentation phase')
}
const samePhase = (actual: unknown, expected: PhaseContext): boolean => {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false
  const value = actual as Record<string, unknown>
  return (
    Object.keys(value).length === phaseKeys.length &&
    phaseKeys.every((key) => value[key] === expected[key])
  )
}
/** Independent frame capability; no document export/import or semantic vendor operations. */
export function createFrameParticipant(
  frame: HTMLIFrameElement,
  options: FrameParticipantOptions,
): PresentationParticipant & { dispose(): void } {
  const view = frame.ownerDocument.defaultView,
    origin = options.origin ?? 'frade://drawio'
  if (
    !view ||
    origin !== 'frade://drawio' ||
    !boundedIdentity(options.id) ||
    !boundedIdentity(options.sessionId) ||
    !Number.isSafeInteger(options.generation) ||
    options.generation < 1
  )
    throw Error('Invalid frame presentation identity')
  type Waiting = {
    context: PhaseContext
    operation: string
    status: 'READY' | 'PAINTED'
    resolve: (value: PaintAck) => void
    reject: (error: Error) => void
    cleanup: () => void
  }
  const waiting = new Map<string, Waiting>(),
    initialRevision = frame.getAttribute('data-frade-revision')
  let disposed = false,
    hidden = false,
    visibility = '',
    priority = '',
    releaseSurface: (() => void) | undefined,
    lastContext: PhaseContext | undefined,
    paintedContext: PhaseContext | undefined,
    diagnosticOwner: { context: PhaseContext; operation: string; reported: boolean } | undefined
  const key = (context: PhaseContext, operation: string) =>
    JSON.stringify(phaseKeys.map((name) => context[name])) + '/' + operation
  function send(operation: string, context: PhaseContext, snapshot?: ResolvedTheme) {
    const payload = JSON.stringify({
      action: 'fradePresentation',
      version: 1,
      participantId: options.id,
      participantGeneration: options.generation,
      context,
      operation,
      ...(snapshot ? { snapshot } : {}),
    })
    if (new TextEncoder().encode(payload).byteLength > 32768)
      throw Error('Frame presentation payload exceeds 32KiB')
    if (!frame.contentWindow) throw Error('Frame presentation window unavailable')
    frame.contentWindow.postMessage(payload, origin)
    lastContext = context
  }
  // A removed browsing context has no recipient for one-way cleanup.
  // Required prepare/apply/rollback still use strict send and must refuse without an ACK.
  function sendCleanup(operation: 'release' | 'detach', context: PhaseContext) {
    if (frame.isConnected && frame.contentWindow) send(operation, context)
  }
  function command(
    operation: string,
    context: PhaseContext,
    signal: AbortSignal,
    snapshot?: ResolvedTheme,
  ): Promise<PaintAck> {
    if (disposed || signal.aborted)
      return Promise.reject(Error('Frame presentation handle invalidated'))
    validatePhase(context, options.sessionId)
    if (snapshot) {
      validatePresentationSnapshot(snapshot)
      if (snapshot.revision !== context.revision) throw Error('Frame snapshot revision mismatch')
    }
    const token = key(context, operation)
    if (waiting.has(token)) return Promise.reject(Error('Duplicate pending frame phase'))
    // A new required command supersedes diagnostic ownership even before its ACK.
    // Normal prepared-handle release after publication does not end the painted lease.
    diagnosticOwner = undefined
    return new Promise((resolve, reject) => {
      const fail = (reason: string) => {
        const pending = waiting.get(token)
        if (!pending) return
        pending.cleanup()
        waiting.delete(token)
        reject(Error(reason))
      }
      const abort = () => {
        fail('Frame presentation phase aborted')
        sendCleanup('release', context)
      }
      const timer = setTimeout(
        () => fail('Frame ' + operation + ' applied-paint deadline exceeded (2000ms)'),
        2000,
      )
      const cleanup = () => {
        clearTimeout(timer)
        signal.removeEventListener('abort', abort)
      }
      waiting.set(token, {
        context,
        operation,
        status: operation === 'prepare' ? 'READY' : 'PAINTED',
        resolve,
        reject,
        cleanup,
      })
      signal.addEventListener('abort', abort, { once: true })
      try {
        send(operation, context, snapshot)
      } catch (error) {
        fail(error instanceof Error ? error.message : String(error))
      }
    })
  }
  const message = (event: MessageEvent) => {
    if (
      disposed ||
      event.source !== frame.contentWindow ||
      event.origin !== origin ||
      typeof event.data !== 'string' ||
      new TextEncoder().encode(event.data).byteLength > 32768
    )
      return
    let input: unknown
    try {
      input = JSON.parse(event.data)
    } catch {
      return
    }
    if (!input || typeof input !== 'object' || Array.isArray(input)) return
    const value = input as Record<string, unknown>
    if (
      value.version !== 1 ||
      value.participantId !== options.id ||
      value.participantGeneration !== options.generation
    )
      return
    if (value.event === 'fradePresentationKey') {
      const names = ['event', 'version', 'participantId', 'participantGeneration', 'context', 'key']
      if (
        Object.keys(value).length !== names.length ||
        Object.keys(value).some((name) => !names.includes(name)) ||
        !paintedContext ||
        !samePhase(value.context, paintedContext) ||
        !['k', 't', 'Escape'].includes(String(value.key))
      )
        return
      options.onShortcut?.(value.key as 'k' | 't' | 'Escape')
      return
    }
    const names = [
      'event',
      'version',
      'participantId',
      'participantGeneration',
      'context',
      'operation',
      'status',
      ...(value.status === 'REFUSED' ? ['message'] : []),
    ]
    if (
      value.event !== 'fradePresentation' ||
      Object.keys(value).length !== names.length ||
      Object.keys(value).some((name) => !names.includes(name)) ||
      typeof value.operation !== 'string'
    )
      return
    for (const [token, pending] of waiting) {
      if (value.operation !== pending.operation || !samePhase(value.context, pending.context))
        continue
      if (value.status === 'REFUSED') {
        if (
          typeof value.message !== 'string' ||
          value.message.length < 1 ||
          value.message.length > 512 ||
          [...value.message].some((char) => char.charCodeAt(0) < 32)
        )
          return
        pending.cleanup()
        waiting.delete(token)
        pending.reject(Error(value.message))
        return
      }
      if (value.status !== pending.status) return
      pending.cleanup()
      waiting.delete(token)
      if (value.status === 'PAINTED') {
        paintedContext = pending.context
        diagnosticOwner = { context: pending.context, operation: pending.operation, reported: false }
        frame.dataset.fradeRevision = String(pending.context.revision)
      }
      pending.resolve(
        Object.freeze({
          ...pending.context,
          participantId: options.id,
          participantGeneration: options.generation,
          painted: true,
        }),
      )
      return
    }
    if (
      value.status === 'REFUSED' &&
      frame.isConnected &&
      waiting.size === 0 &&
      diagnosticOwner &&
      !diagnosticOwner.reported &&
      value.operation === diagnosticOwner.operation &&
      samePhase(value.context, diagnosticOwner.context) &&
      value.message ===
        'LOWER_MENU_REFLOW_UNAVAILABLE: original targets cannot fit without forbidden behavior'
    ) {
      diagnosticOwner.reported = true
      options.onPresentationDiagnostic?.(value.message)
    }
  }
  const stop = (navigate: boolean) => {
    if (disposed) return
    disposed = true
    diagnosticOwner = undefined
    for (const pending of waiting.values()) {
      pending.cleanup()
      pending.reject(
        Error(
          navigate ? 'Frame navigation invalidated presentation' : 'Frame presentation disposed',
        ),
      )
    }
    waiting.clear()
    releaseSurface?.()
    releaseSurface = undefined
    view.removeEventListener('message', message)
    frame.removeEventListener('load', navigateHandler)
    if (!navigate && lastContext) sendCleanup('detach', lastContext)
    if (hidden) {
      if (visibility) frame.style.setProperty('visibility', visibility, priority)
      else frame.style.removeProperty('visibility')
      hidden = false
    }
    if (initialRevision === null) frame.removeAttribute('data-frade-revision')
    else frame.setAttribute('data-frade-revision', initialRevision)
    if (navigate) options.onInvalidated?.()
  }
  // CSS visibility:hidden suppresses cross-frame RAF. The service has already painted
  // the neutral cover before apply; render under it without giving up reveal ownership.
  const renderForPaint = () => {
    if (!releaseSurface) releaseSurface = options.paintSurface?.()
    if (hidden) {
      if (visibility) frame.style.setProperty('visibility', visibility, priority)
      else frame.style.removeProperty('visibility')
    }
    return options.surfacePaint?.()
  }
  const navigateHandler = () => stop(true)
  view.addEventListener('message', message)
  frame.addEventListener('load', navigateHandler)
  return {
    id: options.id,
    generation: options.generation,
    requiresPaintCover: true,
    hide: () => {
      if (hidden) return
      hidden = true
      visibility = frame.style.getPropertyValue('visibility')
      priority = frame.style.getPropertyPriority('visibility')
      frame.style.visibility = 'hidden'
    },
    reveal: () => {
      releaseSurface?.()
      releaseSurface = undefined
      if (!hidden) return
      hidden = false
      if (visibility) frame.style.setProperty('visibility', visibility, priority)
      else frame.style.removeProperty('visibility')
    },
    prepare: async (snapshot, context, signal) => {
      await command('prepare', context, signal, snapshot)
      let released = false
      const valid = (next: PhaseContext, nextSignal: AbortSignal, rollback: boolean) => {
        if (disposed || released || nextSignal.aborted || (!rollback && signal.aborted))
          throw Error('Frame presentation handle invalidated')
        validatePhase(next, options.sessionId)
        if (
          rollback ? next.phase !== 'rollback' : !['apply', 'join', 'rollback'].includes(next.phase)
        )
          throw Error('Frame presentation phase mismatch')
        if (
          !rollback &&
          phaseKeys.filter((key) => key !== 'phase').some((key) => next[key] !== context[key])
        )
          throw Error('Frame presentation owner mismatch')
      }
      return {
        apply: async (next, nextSignal) => {
          valid(next, nextSignal, false)
          const stagedPaint = renderForPaint()
          if (stagedPaint) await stagedPaint
          valid(next, nextSignal, false)
          return command('apply', next, nextSignal)
        },
        rollback: async (previous, next, nextSignal) => {
          valid(next, nextSignal, true)
          const stagedPaint = renderForPaint()
          if (stagedPaint) await stagedPaint
          valid(next, nextSignal, true)
          return command('rollback', next, nextSignal, previous)
        },
        dispose: () => {
          if (released) return
          released = true
          if (!disposed) sendCleanup('release', context)
        },
      }
    },
    dispose: () => stop(false),
  }
}
