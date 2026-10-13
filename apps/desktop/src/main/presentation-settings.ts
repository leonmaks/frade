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

/** Main-only capability; never returned by the named renderer request protocol. */
export interface PresentationCoordinatorLease {
  readonly context: PresentationPhase
}
export interface MainPresentationCoordinator {
  acquire(context: PresentationPhase): Promise<PresentationCoordinatorLease>
  recover(records: readonly PresentationRecord[], consumedRevision: number): Promise<PresentationCoordinatorLease>
  seed(owner: PresentationCoordinatorLease, records: readonly PresentationRecord[], consumedRevision: number): Promise<void>
  highWater(owner: PresentationCoordinatorLease): Promise<number>
  read(owner: PresentationCoordinatorLease): Promise<PresentationRecord>
  reserve(owner: PresentationCoordinatorLease, selection: PresentationChoice): Promise<PresentationRecord>
  write(owner: PresentationCoordinatorLease, target: PresentationRecord): Promise<SettingsOutcome>
  release(owner: PresentationCoordinatorLease): Promise<void>
}


export interface PresentationSettings {
  readonly coordinator: MainPresentationCoordinator
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

  interface OwnedState {
    readonly context: PresentationPhase
    readonly recovery: boolean
    reserved?: PresentationRecord
    usable: boolean
  }
  const leases = new WeakMap<PresentationCoordinatorLease, OwnedState>()
  let liveLease: PresentationCoordinatorLease | undefined, recoverySequence = 0,
    coordinatedRecovery = false
  const boundedRecord = (raw: string): PresentationRecord => {
    if (Buffer.byteLength(raw, 'utf8') > PRESENTATION_MAX_BYTES)
      throw Error('Oversized coordinator settings record')
    return parsePresentationRecord(JSON.parse(raw))
  }
  const copiedRecords = (input: readonly PresentationRecord[], consumed: number) => {
    if (!Array.isArray(input) || input.length < 1 || input.length > 64 ||
        !Number.isSafeInteger(consumed) || consumed < 0) throw Error('Invalid coordinator record set')
    const records = input.map(value => parsePresentationRecord(JSON.parse(JSON.stringify(value))))
    const revisions = new Map<number, PresentationRecord>()
    for (const value of records) {
      const prior = revisions.get(value.revision) ?? known.get(value.revision) ?? candidates.get(value.revision)
      if ((prior && !sameRecord(prior, value)) || value.revision > consumed)
        throw Error('Conflicting coordinator record')
      revisions.set(value.revision, value)
    }
    return records
  }
  const requireOwner = (owner: PresentationCoordinatorLease) => {
    const state = leases.get(owner)
    if (liveLease !== owner || !state || !state.usable || !current(state.context))
      throw Error('Stale coordinator settings owner')
    return state
  }
  const newLease = (context: PresentationPhase, recovery: boolean) => {
    if (liveLease) throw Error('Coordinator settings already owned')
    const owner = Object.freeze({ context: Object.freeze({ ...context }) })
    leases.set(owner, { context: owner.context, recovery, usable: true })
    liveLease = owner
    return owner
  }
  const coordinator: MainPresentationCoordinator = Object.freeze({
    acquire: (input: PresentationPhase) => queue(async () => {
      requireInitialized()
      const context = parsePresentationPhase(input)
      if (!current(context)) throw Error('Stale coordinator acquisition')
      return newLease(context, context.phase === 'rollback')
    }),
    recover: (input: readonly PresentationRecord[], consumed: number) => queue(async () => {
      if (liveLease || (initialization && !boot)) throw Error('Coordinator recovery already owned')
      const records = copiedRecords(input, consumed)
      const raw = await files.read(target)
      const actual = raw === undefined ? defaults : boundedRecord(raw)
      if (!records.some(value => sameRecord(value, actual)))
        throw Error('Unowned coordinator recovery settings')
      const stagedRaw = await files.read(staged)
      if (stagedRaw !== undefined && !records.some(value => sameRecord(value, boundedRecord(stagedRaw))))
        throw Error('Unowned coordinator staged settings')
      const generation = Math.max(acceptedGeneration, actual.generation) + 1
      if (!Number.isSafeInteger(generation)) throw Error('Coordinator recovery generation limit')
      const requestId = options.sessionId + '/recovery-' + (recoverySequence + 1)
      const context = parsePresentationPhase({
        version:1,sessionId:options.sessionId,requestId,transactionId:requestId,
        generation,revision:actual.revision,membership:1,phase:'rollback',
      })
      // Trusted Main coordinator supplies only full journal-validated owned records.
      // This method is deliberately absent from renderer DTO operations.
      for (const value of records) remember(candidates, value)
      maximumRevision = Math.max(maximumRevision, consumed)
      remember(known, actual)
      authoritative = actual; origin = raw; originProven = true
      acceptedGeneration = generation; activeRequest = requestId; recoverySequence++
      coordinatedRecovery = true
      return newLease(context, true)
    }),
    seed: (owner: PresentationCoordinatorLease, input: readonly PresentationRecord[], consumed: number) => queue(async () => {
      requireOwner(owner)
      const records = copiedRecords(input, consumed)
      const actual = await readAuthoritative()
      requireOwner(owner)
      if (consumed < maximumRevision || !records.some(value => sameRecord(value, actual)))
        throw Error('Coordinator baseline or high-water conflict')
      for (const value of records) remember(candidates, value)
      maximumRevision = Math.max(maximumRevision, consumed)
    }),
    highWater: (owner: PresentationCoordinatorLease) => queue(async () => {
      requireOwner(owner)
      return maximumRevision
    }),
    read: (owner: PresentationCoordinatorLease) => queue(async () => {
      requireOwner(owner)
      const actual = await readAuthoritative()
      requireOwner(owner)
      return parsePresentationRecord(actual)
    }),
    reserve: (owner: PresentationCoordinatorLease, input: PresentationChoice) => queue(async () => {
      const state = requireOwner(owner), selection = parsePresentationChoice(input)
      if (state.reserved) {
        if (!sameSelection(state.reserved.selection, selection)) throw Error('Coordinator reservation changed')
        return state.reserved
      }
      const base = await readAuthoritative()
      requireOwner(owner)
      const record = parsePresentationRecord({
        version:1,revision:Math.max(base.revision,maximumRevision)+1,
        generation:state.context.generation,transactionId:state.context.transactionId,selection,
      })
      remember(candidates, record); state.reserved = record
      return record
    }),
    write: (owner: PresentationCoordinatorLease, input: PresentationRecord) => queue(async () => {
      let possibleEffect = false
      let state: OwnedState | undefined
      try {
        state = requireOwner(owner)
        const record = parsePresentationRecord(input), expected = candidates.get(record.revision) ?? known.get(record.revision)
        if (!expected || !sameRecord(expected, record) ||
            (!state.recovery && (!state.reserved || !sameRecord(state.reserved, record))))
          throw Error('Unowned exact coordinator target')
        const actual = await readAuthoritative()
        requireOwner(owner)
        if (record.revision < actual.revision) throw Error('Coordinator target revision regressed')
        if (!state.recovery && !sameRecord(actual, authoritative))
          throw Error('Coordinator authoritative CAS changed')
        let stagedRaw = await files.read(staged)
        requireOwner(owner)
        if (stagedRaw !== undefined) {
          const stagedRecord = boundedRecord(stagedRaw), stagedKnown = candidates.get(stagedRecord.revision) ?? known.get(stagedRecord.revision)
          if (!stagedKnown || !sameRecord(stagedKnown, stagedRecord))
            throw Error('Unowned coordinator staged settings')
          if (!sameRecord(stagedRecord, record) || sameRecord(actual, record)) {
            possibleEffect = true
            await files.remove(staged)
            requireOwner(owner)
            stagedRaw = undefined
          }
        }
        if (!sameRecord(actual, record)) {
          if (stagedRaw === undefined) {
            possibleEffect = true
            await files.stage(staged, JSON.stringify(record) + '\n')
            requireOwner(owner)
          }
          possibleEffect = true
          await files.rename(staged, target)
          requireOwner(owner)
        }
        const raw = await files.read(target)
        if (raw === undefined && sameRecord(record, defaults) && originProven && origin === undefined) {
          requireOwner(owner)
          return { status:'ACK' as const, durable:record }
        }
        if (raw === undefined || !sameRecord(boundedRecord(raw), record))
          throw Error('Exact coordinator readback mismatch')
        requireOwner(owner)
        remember(known, record); authoritative = record
        return { status:'ACK' as const, durable:record }
      } catch (error) {
        if (possibleEffect && state) state.usable = false
        return { status: possibleEffect ? 'UNKNOWN' as const : 'REFUSED' as const, message:errorText(error) }
      }
    }),
    release: (owner: PresentationCoordinatorLease) => queue(async () => {
      if (liveLease !== owner || !leases.has(owner)) throw Error('Unknown coordinator release')
      liveLease = undefined; leases.delete(owner)
    }),
  })


  const store: PresentationSettings = {
    coordinator,
    initialize: () => {
      if (liveLease) return Promise.reject(Error('Coordinated settings ownership still open'))
      if (initialization) return initialization
      initialization = (async () => {
        if (coordinatedRecovery) {
          authoritative = await readAuthoritative()
          if (await files.read(staged) !== undefined) throw Error('Coordinator staging not settled')
          boot = cachedBoot([])
          return boot
        }
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
        if (liveLease) return { status: 'REFUSED', message: 'Coordinator settings ownership is active' }
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
        if (liveLease) throw Error('Coordinator settings ownership is active')
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
