import { createPresentationService } from '@frade/ui-workspace/design/theme/service'
import { createThemeRegistry } from '@frade/ui-workspace/design/theme/registry'
import { resolveTheme } from '@frade/ui-workspace/design/theme/resolver'
import type { ResolvedTheme } from '@frade/ui-workspace/design/theme/types'
import { it, expect, vi, afterEach } from 'vitest'
import {
  mkdtemp,
  readFile,
  writeFile,
  rename,
  unlink,
  open,
  rm,
  readdir,
  realpath,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname, basename } from 'node:path'
import {
  createPresentationSettings,
  createPresentationVisibility,
} from '../../src/main/presentation-settings'
import type { PresentationFiles, SettingsOptions } from '../../src/main/presentation-settings'
import type {
  PresentationChoice,
  PresentationPhase,
  PresentationRecord,
} from '@frade/runtime-contracts'
const dirs: string[] = []
afterEach(async () => {
  vi.useRealTimers()
  for (const dir of dirs.splice(0)) {
    const target = await realpath(dir),
      root = await realpath(tmpdir())
    if (dirname(target) !== root || !basename(target).startsWith('frade-p01-settings-'))
      throw Error('Unsafe fixture cleanup target')
    await rm(target, { recursive: true, force: true })
  }
})
const choice = (
  mode: PresentationChoice['mode'],
  density: PresentationChoice['density'] = 'compact',
): PresentationChoice => ({
  mode,
  density,
  preferred: {
    light: 'frade.builtin/light',
    dark: 'frade.builtin/dark',
    'high-contrast': 'frade.builtin/high-contrast',
  },
})
const sender = { senderId: 5, mainFrame: true, url: 'frade://app/index.html' }
const gate = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}
async function fixture(patch: Partial<SettingsOptions> = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'frade-p01-settings-'))
  dirs.push(dir)
  const trace: string[] = []
  const files: PresentationFiles = {
    read: async (path) => {
      trace.push('read:' + path)
      try {
        return await readFile(path, 'utf8')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
        throw error
      }
    },
    stage: async (path, contents) => {
      trace.push('stage:' + path)
      const file = await open(path, 'wx')
      try {
        await file.writeFile(contents, 'utf8')
        await file.sync()
      } finally {
        await file.close()
      }
    },
    rename: async (staged, target) => {
      trace.push('rename:' + target)
      await rename(staged, target)
    },
    remove: async (path) => {
      trace.push('remove:' + path)
      try {
        await unlink(path)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
    },
  }
  const store = createPresentationSettings({
    userData: dir,
    sessionId: 'window-1',
    windowId: 5,
    files,
    ...patch,
  })
  const context = (generation: number, index = generation): PresentationPhase => ({
    version: 1,
    requestId: 'window-1/intent-' + index,
    sessionId: 'window-1',
    generation,
    transactionId: 'window-1/intent-' + index,
    revision: index,
    membership: 1,
    phase: 'apply',
  })
  return {
    dir,
    trace,
    files,
    store,
    context,
    target: join(dir, 'presentation-settings.json'),
    staged: join(dir, 'presentation-settings.json.staged'),
  }
}
it('initializes validated offline System/compact before bootstrap; cached bootstrap does no per-call IO', async () => {
  const f = await fixture({ environment: { colorScheme: 'dark' } }),
    boot = await f.store.initialize()
  expect(boot.durable.selection.mode).toBe('system')
  expect(boot.snapshot.kind).toBe('dark')
  expect(boot.snapshot.density).toBe('compact')
  expect(await readdir(f.dir)).toEqual([])
  const io = f.trace.length
  expect(f.store.bootstrap(sender)).toEqual(boot)
  expect(f.store.bootstrap(sender)).toEqual(boot)
  expect(f.trace).toHaveLength(io)
})
it('atomically commits then readbacks Light/comfortable and restores it at restart under OS Dark', async () => {
  const f = await fixture(),
    boot = await f.store.initialize(),
    a = await f.store.announceIntent('window-1/intent-1')
  const result = await f.store.persist(
    f.context(a.generation),
    choice('light', 'comfortable'),
    boot.durable.revision,
  )
  expect(result.status).toBe('ACK')
  const saved = JSON.parse(await readFile(f.target, 'utf8'))
  expect(saved.selection).toEqual(choice('light', 'comfortable'))
  expect(saved.revision).toBe(1)
  expect(await readdir(f.dir)).toEqual(['presentation-settings.json'])
  expect(f.trace.findIndex((item) => item.startsWith('stage:'))).toBeLessThan(
    f.trace.findIndex((item) => item.startsWith('rename:')),
  )
  const restart = createPresentationSettings({
      userData: f.dir,
      sessionId: 'window-2',
      windowId: 5,
      environment: { colorScheme: 'dark' },
    }),
    restored = await restart.initialize()
  expect(restored.snapshot.kind).toBe('light')
  expect(restored.snapshot.density).toBe('comfortable')
  expect(restored.durable).toEqual(saved)
})
it('intent announcement alone performs no filesystem mutation; stale generation/CAS refuse before staged writes', async () => {
  const f = await fixture()
  await f.store.initialize()
  const a = await f.store.announceIntent('window-1/intent-1'),
    c = await f.store.announceIntent('window-1/intent-2'),
    before = f.trace.length
  expect((await f.store.persist(f.context(a.generation), choice('dark'), 0)).status).toBe('REFUSED')
  expect((await f.store.persist(f.context(c.generation), choice('dark'), 7)).status).toBe('REFUSED')
  expect(
    f.trace.slice(before).some((item) => item.startsWith('stage:') || item.startsWith('rename:')),
  ).toBe(false)
  expect(await readdir(f.dir)).toEqual([])
})
it('C accepted during A rename is serialized with owned compensation and C commit; no stale A acknowledgement', async () => {
  const f = await fixture(),
    boot = await f.store.initialize(),
    a = await f.store.announceIntent('window-1/intent-1'),
    started = gate<void>(),
    release = gate<void>(),
    normal = f.files.rename
  f.files.rename = async (...args) => {
    started.resolve()
    await release.promise
    await normal(...args)
  }
  const pending = f.store.persist(f.context(a.generation), choice('dark'), 0)
  await started.promise
  const c = await f.store.announceIntent('window-1/intent-2'),
    compensation = f.store.reconcile(
      { ...f.context(c.generation), phase: 'rollback' },
      boot.durable,
    )
  release.resolve()
  expect((await pending).status).toBe('UNKNOWN')
  const previous = await compensation
  expect(previous.selection.mode).toBe('system')
  expect(previous.revision).toBe(2)
  f.files.rename = normal
  expect(
    (await f.store.persist(f.context(c.generation), choice('high-contrast'), previous.revision))
      .status,
  ).toBe('ACK')
  expect(JSON.parse(await readFile(f.target, 'utf8')).selection.mode).toBe('high-contrast')
})
it.each(['stage', 'rename', 'readback'] as const)(
  'filesystem %s failure reconciles authoritative state and compensates through current owner',
  async (fault) => {
    const f = await fixture(),
      boot = await f.store.initialize(),
      a = await f.store.announceIntent('window-1/intent-1')
    if (fault === 'stage') {
      const original = f.files.stage
      let failed = false
      f.files.stage = async (...args) => {
        if (!failed) {
          failed = true
          throw Error('disk full')
        }
        return original(...args)
      }
    }
    if (fault === 'rename') {
      const original = f.files.rename
      let failed = false
      f.files.rename = async (...args) => {
        if (!failed) {
          failed = true
          throw Error('rename refused')
        }
        return original(...args)
      }
    }
    if (fault === 'readback') {
      const original = f.files.read
      let reads = 0
      f.files.read = async (path) => {
        if (path === f.target && ++reads === 2) throw Error('readback lost')
        return original(path)
      }
    }
    const outcome = await f.store.persist(f.context(a.generation), choice('dark'), 0)
    expect(outcome.status).not.toBe('ACK')
    const restored = await f.store.reconcile(
      { ...f.context(a.generation), phase: 'rollback' },
      boot.durable,
    )
    expect(restored.selection.mode).toBe('system')
    expect(await readdir(f.dir)).not.toContain('presentation-settings.json.staged')
  },
)
it('a lost response after actual rename returns UNKNOWN then readback/compensation restores the last published record', async () => {
  const f = await fixture(),
    boot = await f.store.initialize(),
    a = await f.store.announceIntent('window-1/intent-1'),
    normal = f.files.rename
  f.files.rename = async (...args) => {
    await normal(...args)
    f.files.rename = normal
    throw Error('response lost after rename')
  }
  expect((await f.store.persist(f.context(a.generation), choice('dark'), 0)).status).toBe('UNKNOWN')
  expect(JSON.parse(await readFile(f.target, 'utf8')).selection.mode).toBe('dark')
  const restored = await f.store.reconcile(
    { ...f.context(a.generation), phase: 'rollback' },
    boot.durable,
  )
  expect(restored.selection.mode).toBe('system')
  expect(restored.revision).toBe(2)
})
it('malformed/stale startup settings fallback with diagnostics; incomplete staging is never adopted', async () => {
  const f = await fixture()
  await writeFile(f.target, '{broken')
  await writeFile(
    f.staged,
    JSON.stringify({
      version: 1,
      revision: 7,
      generation: 4,
      transactionId: 'orphan',
      selection: choice('dark'),
    }),
  )
  const boot = await f.store.initialize()
  expect(boot.snapshot.kind).toBe('light')
  expect(boot.diagnostics.length).toBeGreaterThan(0)
  expect(await readFile(f.target, 'utf8')).toBe('{broken')
  expect(await readdir(f.dir)).not.toContain('presentation-settings.json.staged')
  const stale: PresentationRecord = {
    version: 1,
    revision: 3,
    generation: 2,
    transactionId: 'old',
    selection: {
      ...choice('light'),
      preferred: { ...choice('light').preferred, light: 'missing.publisher/theme' },
    },
  }
  await writeFile(f.target, JSON.stringify(stale))
  const restart = createPresentationSettings({
      userData: f.dir,
      sessionId: 'window-2',
      windowId: 5,
    }),
    result = await restart.initialize()
  expect(result.snapshot.id).toBe('frade.builtin/light')
  expect(result.snapshot.issues.map((i) => i.code)).toContain('UNKNOWN_THEME')
})
it.each([
  { ...sender, mainFrame: false },
  { ...sender, senderId: 9 },
  { ...sender, url: 'https://example.invalid/' },
  { ...sender, url: 'frade://drawio/index.html' },
])('unauthorized sender %j is denied before any IO', async (source) => {
  const f = await fixture()
  await f.store.initialize()
  const count = f.trace.length
  expect(() => f.store.bootstrap(source)).toThrow('UNAUTHORIZED')
  await expect(
    f.store.request(source, {
      version: 1,
      sessionId: 'window-1',
      requestId: 'window-1/intent-1',
      operation: 'intent',
      payload: {},
    }),
  ).rejects.toThrow('UNAUTHORIZED')
  expect(f.trace).toHaveLength(count)
})
it('forged payload/session/revision/reconciliation and arbitrary path cannot mutate profile or repository', async () => {
  const f = await fixture(),
    boot = await f.store.initialize(),
    a = await f.store.announceIntent('window-1/intent-1'),
    before = f.trace.length
  const base = {
    version: 1,
    sessionId: 'window-1',
    requestId: 'window-1/intent-1',
    operation: 'persist',
    payload: { context: f.context(a.generation), selection: choice('dark'), expectedRevision: 0 },
  }
  for (const invalid of [
    { ...base, sessionId: 'foreign' },
    { ...base, path: f.target },
    { ...base, payload: { ...base.payload, selection: { ...choice('dark'), execution: true } } },
    { ...base, requestId: 'x'.repeat(40000) },
  ])
    await expect(f.store.request(sender, invalid)).rejects.toThrow()
  expect(
    (await f.store.persist({ ...f.context(a.generation), generation: 99 }, choice('dark'), 0))
      .status,
  ).toBe('REFUSED')
  await expect(
    f.store.reconcile(
      { ...f.context(a.generation), phase: 'rollback' },
      { ...boot.durable, revision: 999 },
    ),
  ).rejects.toThrow()
  expect(
    f.trace.slice(before).some((line) => line.startsWith('stage:') || line.startsWith('rename:')),
  ).toBe(false)
  expect(await readdir(f.dir)).toEqual([])
})
it('dual readiness requires exact bootstrap/root revision, shows once, and times out closed', async () => {
  vi.useFakeTimers()
  const f = await fixture(),
    boot = await f.store.initialize(),
    show = vi.fn(),
    failure = vi.fn(),
    gate = createPresentationVisibility(boot, show, failure)
  gate.presentationReady(boot.bootRevision + 1, boot.bootRevision + 1)
  gate.nativeReady()
  expect(show).not.toHaveBeenCalled()
  gate.presentationReady(boot.bootRevision, boot.bootRevision)
  expect(show).toHaveBeenCalledTimes(1)
  gate.nativeReady()
  expect(show).toHaveBeenCalledTimes(1)
  gate.dispose()
  const closed = createPresentationVisibility(boot, show, failure)
  closed.nativeReady()
  await vi.advanceTimersByTimeAsync(5000)
  expect(failure).toHaveBeenCalledTimes(1)
  expect(show).toHaveBeenCalledTimes(1)
  closed.presentationReady(boot.bootRevision, boot.bootRevision)
  expect(show).toHaveBeenCalledTimes(1)
  closed.dispose()
})

it('portable service and real host queue reconcile in-flight A rename then publish C once without losing dirty state', async () => {
  const f = await fixture(),
    boot = await f.store.initialize(),
    started = gate<void>(),
    release = gate<void>(),
    normal = f.files.rename
  f.files.rename = async (...args) => {
    started.resolve()
    await release.promise
    await normal(...args)
  }
  let view = boot.snapshot as ResolvedTheme,
    covered = false
  const document = {
      bytes: '{"authoredPaint":"retained"}',
      draft: 'dirty draft',
      undo: ['insert1', 'insert2'],
      selection: ['node1'],
    },
    before = JSON.stringify(document),
    published: string[] = []
  const service = createPresentationService({
    sessionId: 'window-1',
    initialSnapshot: view,
    initialDurable: boot.durable,
    host: {
      announceIntent: f.store.announceIntent,
      persist: f.store.persist,
      reconcile: (context, published) => f.store.reconcile(context, { version: 1, ...published }),
    },
    barrier: {
      paint: async () => {
        covered = true
      },
      reveal: () => {
        covered = false
      },
      recovery: () => {
        covered = true
      },
    },
  })
  service.onDidChangeTheme((event) => published.push(event.snapshot.kind))
  await service.register({
    id: 'root',
    generation: 1,
    hide: () => {},
    reveal: () => {},
    prepare: async (next) => ({
      apply: async (context) => {
        view = next
        return { ...context, participantId: 'root', participantGeneration: 1, painted: true }
      },
      rollback: async (previous, context) => {
        view = previous
        return { ...context, participantId: 'root', participantGeneration: 1, painted: true }
      },
      dispose: () => {},
    }),
  }).ready
  const a = service.commit(
    choice('dark'),
    resolveTheme({ registry: createThemeRegistry(), selection: choice('dark') }),
  )
  await started.promise
  const c = service.commit(
    choice('high-contrast'),
    resolveTheme({ registry: createThemeRegistry(), selection: choice('high-contrast') }),
  )
  release.resolve()
  expect((await a).status).toBe('SUPERSEDED')
  expect((await c).status).toBe('COMMITTED')
  expect(JSON.parse(await readFile(f.target, 'utf8')).selection.mode).toBe('high-contrast')
  expect(service.state().durable.revision).toBe(3)
  expect(view.kind).toBe('high-contrast')
  expect(published).toEqual(['high-contrast'])
  expect(covered).toBe(false)
  expect(JSON.stringify(document)).toBe(before)
})
it('default filesystem port writes and readbacks its fixed validated profile path', async () => {
  const f = await fixture(),
    store = createPresentationSettings({
      userData: f.dir,
      sessionId: 'default-window',
      windowId: 5,
    }),
    boot = await store.initialize(),
    accepted = await store.announceIntent('default-window/intent-1')
  const context: PresentationPhase = {
    ...f.context(accepted.generation),
    sessionId: 'default-window',
    requestId: 'default-window/intent-1',
    transactionId: 'default-window/intent-1',
  }
  const result = await store.persist(context, choice('light', 'comfortable'), boot.durable.revision)
  expect(result.status).toBe('ACK')
  expect(JSON.parse(await readFile(f.target, 'utf8')).selection).toEqual(
    choice('light', 'comfortable'),
  )
  expect(await readdir(f.dir)).toEqual(['presentation-settings.json'])
})

it('cleanup uncertainty returns explicit UNKNOWN without replacing the completed rename outcome by an opaque thrown error', async () => {
  const f = await fixture(),
    boot = await f.store.initialize(),
    accepted = await f.store.announceIntent('window-1/intent-1'),
    normal = f.files.remove
  f.files.remove = async () => {
    throw Error('cleanup unavailable')
  }
  const result = await f.store.persist(f.context(accepted.generation), choice('dark'), 0)
  expect(result.status).toBe('UNKNOWN')
  if (result.status !== 'ACK') expect(result.message).toContain('cleanup')
  expect(JSON.parse(await readFile(f.target, 'utf8')).selection.mode).toBe('dark')
  f.files.remove = normal
  const restored = await f.store.reconcile(
    { ...f.context(accepted.generation), phase: 'rollback' },
    boot.durable,
  )
  expect(restored.selection.mode).toBe('system')
  expect(restored.revision).toBe(2)
})

it('subsequent bootstrap resolves latest validated authoritative cache without IO and rejects older ready revision', async () => {
  const ready = vi.fn(),
    f = await fixture({ environment: { colorScheme: 'dark' }, onReady: ready }),
    original = await f.store.initialize(),
    a = await f.store.announceIntent('window-1/intent-1'),
    outcome = await f.store.persist(
      f.context(a.generation),
      choice('light', 'comfortable'),
      original.durable.revision,
    )
  expect(outcome.status).toBe('ACK')
  const io = f.trace.length,
    boot = f.store.bootstrap(sender)
  expect(boot.durable.selection).toEqual(choice('light', 'comfortable'))
  expect(boot.snapshot.kind).toBe('light')
  expect(boot.snapshot.density).toBe('comfortable')
  expect(boot.bootRevision).toBe(1)
  expect(f.trace).toHaveLength(io)
  await expect(
    f.store.request(sender, {
      version: 1,
      sessionId: 'window-1',
      requestId: 'window-1/old-ready',
      operation: 'ready',
      payload: { bootRevision: 0, rootRevision: 0 },
    }),
  ).rejects.toThrow('STALE_PRESENTATION_READY')
  await f.store.request(sender, {
    version: 1,
    sessionId: 'window-1',
    requestId: 'window-1/ready',
    operation: 'ready',
    payload: { bootRevision: 1, rootRevision: 1 },
  })
  expect(ready).toHaveBeenCalledWith(1, 1)
})
