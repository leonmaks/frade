import { lstat, readFile, open, rename, unlink, mkdir } from 'node:fs/promises'
import { isAbsolute, join, resolve, dirname } from 'node:path'
import {
  parsePresentationBoot,
  parsePresentationRecord,
  parsePresentationRequest,
  parsePresentationChoice,
  parsePresentationPhase,
  PRESENTATION_MAX_BYTES,
} from '@frade/runtime-contracts'
import { createThemeRegistry, BUILTIN_IDS } from '@frade/ui-workspace/design/theme/registry'
import { resolveTheme } from '@frade/ui-workspace/design/theme/resolver'
import { authorizedSender } from './security'
import type {
  PresentationRecord,
  PresentationBoot,
  PresentationChoice,
  PresentationPhase,
  PresentationRequest,
} from '@frade/runtime-contracts'
export interface PresentationFiles {
  read(path: string): Promise<string | undefined>
  stage(path: string, contents: string): Promise<void>
  rename(staged: string, target: string): Promise<void>
  remove(path: string): Promise<void>
}
export interface PresentationSender {
  readonly senderId: number
  readonly mainFrame: boolean
  readonly url: string
}
export interface SettingsOptions {
  readonly userData: string
  readonly sessionId: string
  readonly windowId: number
  readonly devUrl?: string
  readonly environment?: {
    readonly colorScheme?: 'light' | 'dark'
    readonly highContrast?: boolean
    readonly forcedColors?: boolean
  }
  readonly files?: PresentationFiles
  readonly onReady?: (bootRevision: number, rootRevision: number) => void
}
export type SettingsOutcome =
  | { readonly status: 'ACK'; readonly durable: PresentationRecord }
  | { readonly status: 'REFUSED' | 'UNKNOWN'; readonly message: string }
export interface PresentationSettings {
  initialize(): Promise<PresentationBoot>
  bootstrap(sender: PresentationSender): PresentationBoot
  announceIntent(requestId: string): Promise<{ generation: number }>
  persist(
    context: PresentationPhase,
    selection: PresentationChoice,
    expectedRevision: number,
  ): Promise<SettingsOutcome>
  reconcile(
    context: PresentationPhase,
    lastPublished: PresentationRecord,
  ): Promise<PresentationRecord>
  request(sender: PresentationSender, input: unknown): Promise<unknown>
}

const errorText = (error: unknown): string =>
  (error instanceof Error ? error.message : String(error)).slice(0, 480)
const missing = (error: unknown) =>
  !!error && typeof error === 'object' && (error as NodeJS.ErrnoException).code === 'ENOENT'
function defaultFiles(): PresentationFiles {
  return {
    read: async (path) => {
      try {
        const info = await lstat(path)
        if (!info.isFile() || info.isSymbolicLink() || info.size > PRESENTATION_MAX_BYTES)
          throw Error('Invalid bounded presentation settings file')
        const contents = await readFile(path, 'utf8')
        if (Buffer.byteLength(contents, 'utf8') > PRESENTATION_MAX_BYTES)
          throw Error('Oversized presentation settings file')
        return contents
      } catch (error) {
        if (missing(error)) return undefined
        throw error
      }
    },
    stage: async (path, contents) => {
      await mkdir(dirname(path), { recursive: true })
      const file = await open(path, 'wx', 0o600)
      try {
        await file.writeFile(contents, 'utf8')
        await file.sync()
      } finally {
        await file.close()
      }
    },
    rename: async (staged, target) => {
      await rename(staged, target)
    },
    remove: async (path) => {
      try {
        const info = await lstat(path)
        if (info.isSymbolicLink() || !info.isFile()) throw Error('Unsafe presentation staged file')
        await unlink(path)
      } catch (error) {
        if (!missing(error)) throw error
      }
    },
  }
}
function sameSelection(a: PresentationChoice, b: PresentationChoice): boolean {
  return (
    a.mode === b.mode &&
    a.density === b.density &&
    a.preferred.light === b.preferred.light &&
    a.preferred.dark === b.preferred.dark &&
    a.preferred['high-contrast'] === b.preferred['high-contrast']
  )
}
function sameRecord(a: PresentationRecord, b: PresentationRecord): boolean {
  return (
    a.version === b.version &&
    a.revision === b.revision &&
    a.generation === b.generation &&
    a.transactionId === b.transactionId &&
    sameSelection(a.selection, b.selection)
  )
}
export function createPresentationSettings(options: SettingsOptions): PresentationSettings {
  if (!isAbsolute(options.userData)) throw Error('Presentation userData must be absolute')
  const root = resolve(options.userData),
    target = join(root, 'presentation-settings.json'),
    staged = join(root, 'presentation-settings.json.staged'),
    files = options.files ?? defaultFiles()
  const defaults = parsePresentationRecord({
    version: 1,
    revision: 0,
    generation: 0,
    transactionId: 'boot',
    selection: { mode: 'system', density: 'compact', preferred: { ...BUILTIN_IDS } },
  })
  let authoritative = defaults,
    origin: string | undefined,
    originProven = false,
    boot: PresentationBoot | undefined,
    initialization: Promise<PresentationBoot> | undefined
  let acceptedGeneration = 0,
    activeRequest = '',
    tail: Promise<unknown> = Promise.resolve(),
    maximumRevision = 0
  const known = new Map<number, PresentationRecord>(),
    candidates = new Map<number, PresentationRecord>()
  const remember = (map: Map<number, PresentationRecord>, value: PresentationRecord) => {
    map.set(value.revision, value)
    maximumRevision = Math.max(maximumRevision, value.revision)
    while (map.size > 64) map.delete(map.keys().next().value!)
  }
  const authorize = (sender: PresentationSender) => {
    if (
      !authorizedSender(
        sender.senderId,
        sender.mainFrame,
        sender.url,
        options.windowId,
        options.devUrl,
      )
    )
      throw Error('UNAUTHORIZED')
  }
  const queue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation, operation)
    tail = result
    return result
  }
  const requireInitialized = () => {
    if (!boot) throw Error('Presentation bootstrap unavailable')
  }
  const cachedBoot = (diagnostics: readonly string[]): PresentationBoot => {
    const snapshot = resolveTheme({
      registry: createThemeRegistry(),
      selection: authoritative.selection,
      environment: options.environment,
      revision: authoritative.revision,
    })
    return parsePresentationBoot({
      version: 1,
      sessionId: options.sessionId,
      bootRevision: snapshot.revision,
      snapshot,
      durable: authoritative,
      diagnostics,
    })
  }
  const current = (context: PresentationPhase) =>
    context.sessionId === options.sessionId &&
    context.generation === acceptedGeneration &&
    context.requestId === activeRequest &&
    context.transactionId === activeRequest
  async function readAuthoritative(): Promise<PresentationRecord> {
    const raw = await files.read(target)
    if (
      originProven &&
      raw === origin &&
      authoritative.revision === defaults.revision &&
      known.has(defaults.revision)
    )
      return known.get(defaults.revision)!
    if (raw === undefined) throw Error('Authoritative settings absence cannot be reconciled')
    const value = parsePresentationRecord(JSON.parse(raw))
    const expected = known.get(value.revision) ?? candidates.get(value.revision)
    if (!expected || !sameRecord(expected, value))
      throw Error('Unowned authoritative settings revision')
    return value
  }
  async function write(
    context: PresentationPhase,
    selection: PresentationChoice,
    base: PresentationRecord,
    onRename?: () => void,
  ): Promise<PresentationRecord> {
    if (!current(context)) throw Error('Stale presentation intent')
    const record = parsePresentationRecord({
      version: 1,
      revision: Math.max(base.revision, maximumRevision) + 1,
      generation: context.generation,
      transactionId: context.transactionId,
      selection,
    })
    remember(candidates, record)
    await files.stage(staged, JSON.stringify(record) + '\n')
    if (!current(context)) throw Error('Stale presentation intent before rename')
    onRename?.()
    await files.rename(staged, target)
    const raw = await files.read(target)
    if (raw === undefined) throw Error('Missing authoritative rename readback')
    const readback = parsePresentationRecord(JSON.parse(raw))
    if (!sameRecord(record, readback)) throw Error('Authoritative rename readback mismatch')
    if (!current(context)) throw Error('Stale presentation intent after rename')
    remember(known, readback)
    authoritative = readback
    return readback
  }
  const store: PresentationSettings = {
    initialize: () => {
      if (initialization) return initialization
      initialization = (async () => {
        const diagnostics: string[] = []
        try {
          origin = await files.read(target)
          originProven = true
          if (origin !== undefined) authoritative = parsePresentationRecord(JSON.parse(origin))
        } catch (error) {
          diagnostics.push('Presentation startup fallback: ' + errorText(error))
          authoritative = defaults
        }
        remember(known, authoritative)
        acceptedGeneration = authoritative.generation
        try {
          await files.remove(staged)
        } catch (error) {
          diagnostics.push('Presentation staging recovery: ' + errorText(error))
        }
        boot = cachedBoot(diagnostics)
        return boot
      })()
      return initialization
    },
    bootstrap: (sender) => {
      authorize(sender)
      requireInitialized()
      boot = cachedBoot(boot!.diagnostics)
      return parsePresentationBoot(boot)
    },
    announceIntent: async (requestId) => {
      requireInitialized()
      parsePresentationRequest({
        version: 1,
        sessionId: options.sessionId,
        requestId,
        operation: 'intent',
        payload: {},
      })
      if (activeRequest === requestId) throw Error('Replayed presentation intent')
      if (!Number.isSafeInteger(acceptedGeneration + 1)) throw Error('Presentation intent limit')
      activeRequest = requestId
      return Object.freeze({ generation: ++acceptedGeneration })
    },
    persist: (context, selection, expectedRevision) => {
      requireInitialized()
      const phase = parsePresentationPhase(context),
        choice = parsePresentationChoice(selection)
      if (
        phase.phase !== 'apply' ||
        !Number.isSafeInteger(expectedRevision) ||
        expectedRevision < 0
      )
        return Promise.resolve({
          status: 'REFUSED',
          message: 'Invalid persistence phase or revision',
        })
      return queue(async () => {
        if (!current(phase) || expectedRevision !== authoritative.revision)
          return { status: 'REFUSED', message: 'Stale intent/CAS refused' }
        let renameAttempted = false
        let outcome: SettingsOutcome
        // Before OS rename, refusal can prove no durable write. After it, reconcile ownership.
        try {
          const base = await readAuthoritative()
          if (!current(phase) || base.revision !== expectedRevision)
            outcome = { status: 'REFUSED', message: 'Authoritative CAS refused' }
          else {
            const durable = await write(phase, choice, base, () => {
              renameAttempted = true
            })
            outcome = { status: 'ACK', durable }
          }
        } catch (error) {
          outcome = { status: renameAttempted ? 'UNKNOWN' : 'REFUSED', message: errorText(error) }
        }
        try {
          await files.remove(staged)
        } catch (error) {
          return {
            status: 'UNKNOWN',
            message: 'Staging cleanup outcome unknown: ' + errorText(error),
          }
        }
        return outcome
      })
    },
    reconcile: (context, lastPublished) => {
      requireInitialized()
      const phase = parsePresentationPhase(context),
        published = parsePresentationRecord(lastPublished),
        expected = known.get(published.revision)
      if (phase.phase !== 'rollback' || !expected || !sameRecord(published, expected))
        return Promise.reject(Error('Forged published settings revision'))
      return queue(async () => {
        if (!current(phase)) throw Error('Stale compensation owner')
        const actual = await readAuthoritative()
        if (!current(phase)) throw Error('Stale compensation owner after readback')
        if (sameSelection(actual.selection, published.selection)) {
          remember(known, actual)
          authoritative = actual
          return actual
        }
        try {
          return await write(phase, published.selection, actual)
        } finally {
          await files.remove(staged)
        }
      })
    },
    request: async (sender, input) => {
      authorize(sender)
      requireInitialized()
      const request: PresentationRequest = parsePresentationRequest(input)
      if (request.sessionId !== options.sessionId) throw Error('UNAUTHORIZED_SESSION')
      switch (request.operation) {
        case 'intent':
          return store.announceIntent(request.requestId)
        case 'persist':
          return store.persist(
            request.payload.context,
            request.payload.selection,
            request.payload.expectedRevision,
          )
        case 'reconcile':
          return store.reconcile(request.payload.context, request.payload.lastPublished)
        case 'ready':
          if (
            request.payload.bootRevision !== boot!.bootRevision ||
            request.payload.rootRevision !== boot!.snapshot.revision
          )
            throw Error('STALE_PRESENTATION_READY')
          options.onReady?.(request.payload.bootRevision, request.payload.rootRevision)
          return { version: 1, ready: true }
      }
    },
  }
  return store
}
export function createPresentationVisibility(
  boot: PresentationBoot,
  show: () => void,
  failure: (reason: string) => void,
): {
  nativeReady(): void
  presentationReady(bootRevision: number, rootRevision: number): void
  dispose(): void
} {
  let native = false,
    presentation = false,
    closed = false,
    shown = false
  const timer = setTimeout(() => {
    if (!shown && !closed) {
      closed = true
      failure('Presentation bootstrap handshake timeout (5000ms)')
    }
  }, 5000)
  const reveal = () => {
    if (native && presentation && !closed && !shown) {
      shown = true
      clearTimeout(timer)
      show()
    }
  }
  return {
    nativeReady: () => {
      native = true
      reveal()
    },
    presentationReady: (bootRevision, rootRevision) => {
      if (bootRevision !== boot.bootRevision || rootRevision !== boot.snapshot.revision) return
      presentation = true
      reveal()
    },
    dispose: () => {
      closed = true
      clearTimeout(timer)
    },
  }
}
