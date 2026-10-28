import { afterEach, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, open, unlink, rename, rm, realpath } from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { createPresentationSettings } from '../../src/main/presentation-settings'
import type { PresentationFiles } from '../../src/main/presentation-settings'
import type { PresentationChoice, PresentationPhase } from '@frade/runtime-contracts'
const roots: string[] = []
afterEach(async () => {
  for (const dir of roots.splice(0)) {
    const actual = await realpath(dir),
      parent = await realpath(tmpdir())
    if (dirname(actual) !== parent || !basename(actual).startsWith('frade-staging-'))
      throw Error('UNSAFE_TEST_CLEANUP')
    await rm(actual, { recursive: true, force: true })
  }
})
const choice = (mode: 'light' | 'dark'): PresentationChoice => ({
  mode,
  density: 'compact',
  preferred: {
    light: 'frade.builtin/light',
    dark: 'frade.builtin/dark',
    'high-contrast': 'frade.builtin/high-contrast',
  },
})
const sender = { senderId: 5, mainFrame: true, url: 'frade://app/index.html' }
function gate() {
  let resolve!: () => void
  const promise = new Promise<void>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}
const tick = async () => {
  for (let i = 0; i < 50; i++) await Promise.resolve()
}
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'frade-staging-'))
  roots.push(dir)
  const target = join(dir, 'presentation-settings.json'),
    staged = target + '.staged',
    trace: string[] = []
  const files: PresentationFiles = {
    read: vi.fn(async (path) => {
      trace.push('read:' + path)
      try {
        return await readFile(path, 'utf8')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
        throw error
      }
    }),
    stage: vi.fn(async (path, contents) => {
      trace.push('stage')
      const file = await open(path, 'wx', 0o600)
      try {
        await file.writeFile(contents, 'utf8')
        await file.sync()
        trace.push('sync')
      } finally {
        await file.close()
        trace.push('close')
      }
    }),
    rename: vi.fn(async (a, b) => {
      trace.push('rename')
      await rename(a, b)
    }),
    remove: vi.fn(async (path) => {
      trace.push('remove')
      try {
        await unlink(path)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
    }),
  }
  const store = createPresentationSettings({
      userData: dir,
      sessionId: 'stage-window',
      windowId: 5,
      files,
    }),
    boot = await store.initialize()
  function context(
    generation: number,
    phase: PresentationPhase['phase'] = 'prepare',
    membership = 1,
  ): PresentationPhase {
    return {
      version: 1,
      requestId: 'stage-window/' + generation,
      transactionId: 'stage-window/' + generation,
      sessionId: 'stage-window',
      generation,
      revision: generation,
      membership,
      phase,
    }
  }
  const announce = async () => {
    const generation = boot.durable.generation + vi.mocked(files.stage).mock.calls.length + 1
    return store.announceIntent('stage-window/' + generation)
  }
  return { dir, target, staged, trace, files, store, boot, context, announce }
}

it('stage flushes and closes only temporary bytes before owned finalization and restart', async () => {
  const f = await fixture(),
    a = await f.store.announceIntent('stage-window/1')
  expect(await f.store.stage(f.context(a.generation), choice('dark'), 0)).toEqual({
    status: 'STAGED',
  })
  await expect(readFile(f.target)).rejects.toMatchObject({ code: 'ENOENT' })
  const staged = await readFile(f.staged, 'utf8')
  expect(JSON.parse(staged)).toMatchObject({
    revision: 1,
    generation: 1,
    transactionId: 'stage-window/1',
    selection: choice('dark'),
  })
  expect(f.trace).toContain('sync')
  expect(f.trace).toContain('close')
  expect(f.files.rename).not.toHaveBeenCalled()
  const result = await f.store.persist(f.context(a.generation, 'apply'), choice('dark'), 0)
  expect(result.status).toBe('ACK')
  expect(await readFile(f.target, 'utf8')).toBe(staged)
  expect(f.files.stage).toHaveBeenCalledOnce()
  expect(f.files.rename).toHaveBeenCalledOnce()
  await expect(readFile(f.staged)).rejects.toMatchObject({ code: 'ENOENT' })
  const restart = createPresentationSettings({ userData: f.dir, sessionId: 'restart', windowId: 5 })
  expect((await restart.initialize()).durable.selection).toEqual(choice('dark'))
})

it('staging validates ownership phase CAS and every prepared context or choice before rename', async () => {
  for (const changed of [
    'membership',
    'revision',
    'selection',
    'generation',
    'request',
    'cas',
  ] as const) {
    const f = await fixture(),
      a = await f.store.announceIntent('stage-window/1')
    expect((await f.store.stage(f.context(a.generation, 'apply'), choice('dark'), 0)).status).toBe(
      'REFUSED',
    )
    expect((await f.store.stage(f.context(a.generation), choice('dark'), 7)).status).toBe('REFUSED')
    expect(f.files.stage).not.toHaveBeenCalled()
    expect((await f.store.stage(f.context(a.generation), choice('dark'), 0)).status).toBe('STAGED')
    const context = f.context(a.generation, 'apply'),
      selected = choice(changed === 'selection' ? 'light' : 'dark')
    const patched =
      changed === 'membership'
        ? { ...context, membership: 2 }
        : changed === 'revision'
          ? { ...context, revision: 2 }
          : changed === 'generation'
            ? { ...context, generation: 2 }
            : changed === 'request'
              ? { ...context, requestId: 'stage-window/other', transactionId: 'stage-window/other' }
              : context
    expect((await f.store.persist(patched, selected, changed === 'cas' ? 2 : 0)).status).toBe(
      'REFUSED',
    )
    expect(f.files.rename).not.toHaveBeenCalled()
    await expect(readFile(f.target)).rejects.toMatchObject({ code: 'ENOENT' })
  }
})

it('superseded staging settles before cleanup and newer durable acknowledgement', async () => {
  const f = await fixture(),
    a = await f.store.announceIntent('stage-window/1'),
    flush = gate(),
    entered = gate()
  const original = f.files.stage
  f.files.stage = vi.fn(async (path: string, contents: string) => {
    await original(path, contents)
    entered.resolve()
    await flush.promise
  })
  const pending = f.store.stage(f.context(a.generation), choice('dark'), 0)
  await entered.promise
  const c = await f.store.announceIntent('stage-window/2')
  const reconcile = f.store.reconcile(f.context(c.generation, 'rollback'), f.boot.durable)
  const next = f.store.stage(f.context(c.generation), choice('light'), 0)
  await tick()
  expect(f.files.stage).toHaveBeenCalledOnce()
  expect(f.files.rename).not.toHaveBeenCalled()
  flush.resolve()
  expect((await pending).status).toBe('REFUSED')
  await reconcile
  expect((await next).status).toBe('STAGED')
  expect((await f.store.persist(f.context(c.generation, 'apply'), choice('light'), 0)).status).toBe(
    'ACK',
  )
  const durable = await readFile(f.target, 'utf8')
  expect((await f.store.persist(f.context(a.generation, 'apply'), choice('dark'), 0)).status).toBe(
    'REFUSED',
  )
  expect(await readFile(f.target, 'utf8')).toBe(durable)
})

it('same-selection reconciliation removes prepared temporary state before another stage', async () => {
  const f = await fixture(),
    a = await f.store.announceIntent('stage-window/1')
  expect((await f.store.stage(f.context(a.generation), choice('dark'), 0)).status).toBe('STAGED')
  expect(await f.store.reconcile(f.context(a.generation, 'rollback'), f.boot.durable)).toEqual(
    f.boot.durable,
  )
  await expect(readFile(f.staged)).rejects.toMatchObject({ code: 'ENOENT' })
  expect(f.files.rename).not.toHaveBeenCalled()
  expect(
    (await f.store.stage(f.context(a.generation, 'prepare', 2), choice('dark'), 0)).status,
  ).toBe('STAGED')
  expect(
    (await f.store.persist(f.context(a.generation, 'apply', 2), choice('dark'), 0)).status,
  ).toBe('ACK')
})

it('staging and finalization faults preserve truthful REFUSED UNKNOWN and blocked cleanup', async () => {
  for (const fault of ['stage', 'cleanup', 'rename', 'readback'] as const) {
    const f = await fixture(),
      a = await f.store.announceIntent('stage-window/1')
    if (fault === 'stage' || fault === 'cleanup')
      f.files.stage = vi.fn(async () => {
        throw Error('disk flush failed')
      })
    if (fault === 'cleanup')
      f.files.remove = vi.fn(async () => {
        throw Error('cleanup unavailable')
      })
    const staged = await f.store.stage(f.context(a.generation), choice('dark'), 0)
    if (fault === 'stage' || fault === 'cleanup') {
      expect(staged.status).toBe(fault === 'cleanup' ? 'UNKNOWN' : 'REFUSED')
      expect(f.files.rename).not.toHaveBeenCalled()
      if (fault === 'cleanup')
        await expect(
          f.store.reconcile(f.context(a.generation, 'rollback'), f.boot.durable),
        ).rejects.toThrow('cleanup')
      continue
    }
    expect(staged.status).toBe('STAGED')
    if (fault === 'rename')
      f.files.rename = vi.fn(async () => {
        throw Error('rename response lost')
      })
    if (fault === 'readback') {
      const read = f.files.read
      let calls = 0
      f.files.read = vi.fn(async (path) => {
        if (path === f.target && ++calls > 1) throw Error('readback unavailable')
        return read(path)
      })
    }
    expect(
      (await f.store.persist(f.context(a.generation, 'apply'), choice('dark'), 0)).status,
    ).toBe('UNKNOWN')
  }
})

it('staging does no work on bare intent and rejects untrusted sender session fields and replay', async () => {
  const f = await fixture(),
    before = f.trace.length,
    a = await f.store.announceIntent('stage-window/1')
  expect(f.trace).toHaveLength(before)
  const request = {
    version: 1,
    sessionId: 'stage-window',
    requestId: 'stage-window/1',
    operation: 'stage',
    payload: { context: f.context(a.generation), selection: choice('dark'), expectedRevision: 0 },
  }
  for (const senderPatch of [
    { ...sender, mainFrame: false },
    { ...sender, senderId: 7 },
    { ...sender, url: 'https://hostile.invalid' },
  ])
    await expect(f.store.request(senderPatch, request)).rejects.toThrow()
  for (const patch of [
    { ...request, extra: true },
    { ...request, payload: { ...request.payload, path: 'outside' } },
    { ...request, sessionId: 'other' },
  ])
    await expect(f.store.request(sender, patch)).rejects.toThrow()
  expect(f.files.stage).not.toHaveBeenCalled()
  expect(await f.store.request(sender, request)).toEqual({ status: 'STAGED' })
  expect((await f.store.stage(f.context(a.generation), choice('dark'), 0)).status).toBe('REFUSED')
  expect(f.files.stage).toHaveBeenCalledOnce()
})
