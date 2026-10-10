import { describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createHash, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createPresentationSettings } from '../../../apps/desktop/src/main/presentation-settings'
const executable = fileURLToPath(new URL('../dist/native/frade-filesystem.exe', import.meta.url))
interface Fixture {
  root: string
  outside: string
  process: ChildProcessWithoutNullStreams
  send: (operation: string, fields?: object) => Promise<Record<string, any>>
}
async function removeOwnedFixture(temp: string, tempParent: string) {
  const resolved = await fs.realpath(temp)
  if (path.dirname(resolved).toLowerCase() !== tempParent.toLowerCase() ||
    !path.basename(resolved).startsWith('frade-p02-native-')) throw new Error('UNSAFE_FIXTURE_CLEANUP')
  await fs.rm(resolved, { recursive: true })
}
async function fixture(run: (f: Fixture) => Promise<void>) {
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('WINDOWS_NATIVE_NOT_RUN_UNSUPPORTED_HOST')
  const integrity = JSON.parse(await fs.readFile(new URL('../dist/native/integrity.json', import.meta.url), 'utf8'))
  const source = await fs.readFile(new URL('../native/windows-filesystem.cs', import.meta.url))
  const artifact = await fs.readFile(executable)
  if (integrity.sourceSha256 !== createHash('sha256').update(source).digest('hex') ||
    integrity.executableSha256 !== createHash('sha256').update(artifact).digest('hex') ||
    integrity.protocol !== 1 || integrity.platform !== 'windows-x64') throw new Error('NATIVE_BUILD_DRIFT')
  const tempParent = await fs.realpath(os.tmpdir())
  const temp = await fs.mkdtemp(path.join(tempParent, 'frade-p02-native-'))
  const root = path.join(temp, 'extensions'), outside = path.join(temp, 'outside')
  await fs.mkdir(root); await fs.mkdir(outside)
  await fs.writeFile(path.join(outside, 'sentinel'), 'outside-original')
  const child = spawn(executable, [], { windowsHide: true, stdio: 'pipe' })
  const session = randomUUID(), generation = 1
  let requestId = 0, output = '', pending: { resolve: (v: Record<string, any>) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> } | null = null
  let stderr = ''
  child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); if (stderr.length > 131072) child.kill() })
  child.stdout.on('data', (data: Buffer) => {
    output += data.toString('utf8')
    if (output.length > 131072) { pending?.reject(new Error('OVERSIZED_REPLY')); child.kill(); return }
    const newline = output.indexOf('\n')
    if (newline < 0) return
    const line = output.slice(0, newline); output = output.slice(newline + 1)
    if (!pending) { child.kill(); return }
    clearTimeout(pending.timer)
    const current = pending; pending = null
    try { current.resolve(JSON.parse(line)) } catch (e) { current.reject(new Error(String(e))) }
  })
  child.on('error', (e) => { if (pending) { clearTimeout(pending.timer); pending.reject(e); pending = null } })
  child.on('close', () => { if (pending) { clearTimeout(pending.timer); pending.reject(new Error('HELPER_CLOSED ' + stderr)); pending = null } })
  const send = (operation: string, fields: object = {}) => new Promise<Record<string, any>>((resolve, reject) => {
    if (pending || child.exitCode !== null) { reject(new Error('UNUSABLE_FIXTURE_SESSION')); return }
    pending = { resolve, reject, timer: setTimeout(() => { child.kill(); reject(new Error('HELPER_TIMEOUT')) }, 5000) }
    child.stdin.write(JSON.stringify({ version: 1, session, generation, requestId: ++requestId, deadlineMs: 10000, operation, ...fields }) + '\n')
  })
  try { await run({ root, outside, process: child, send }) }
  finally {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = new Promise<void>(resolve => child.once('close', () => resolve()))
      child.kill(); await closed
    }
    expect(await fs.readFile(path.join(outside, 'sentinel'), 'utf8')).toBe('outside-original')
    expect(await fs.readdir(outside)).toEqual(['sentinel'])
    await removeOwnedFixture(temp, tempParent)
  }
}
const sha = (data: Buffer) => createHash('sha256').update(data).digest('hex')
describe('P02FS001–004: actual Windows checked handles and publication', () => {
  it('binds an ordinary owned root and releases all directory handles on dispose', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('dispose')).status).toBe('ACK')
  }))
  it('performs exclusive actual write, flush, same-parent absent-target rename and exact readback', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('mkdir', { path: ['records'] })).status).toBe('ACK')
    const bytes = Buffer.from('first-owned-record')
    const opened = await f.send('write-open', { path: ['records', 'pending.tmp'], maxBytes: bytes.length })
    expect(opened.status).toBe('ACK')
    expect((await f.send('write-chunk', { handle: opened.handle, offset: 0, data: bytes.toString('base64') })).status).toBe('ACK')
    expect((await f.send('write-close', { handle: opened.handle, sha256: sha(bytes) })).status).toBe('ACK')
    expect((await f.send('replace', { handle: opened.handle, parent: ['records'], name: 'final.json', sha256: sha(bytes) })).status).toBe('ACK')
    const read = await f.send('read', { path: ['records', 'final.json'], offset: 0, length: 65536 })
    expect(read.status).toBe('ACK'); expect(Buffer.from(read.data, 'base64')).toEqual(bytes)
    expect(await fs.readFile(path.join(f.root, 'records', 'final.json'))).toEqual(bytes)
    expect((await f.send('dispose')).status).toBe('ACK')
  }))
  it('refuses an existing junction installation root without outside writes', () => fixture(async f => {
    const junction = path.join(path.dirname(f.root), 'junction')
    await fs.symlink(f.outside, junction, 'junction')
    expect((await f.send('bind', { root: junction })).status).toBe('REFUSED')
  }))
  it('pins an ancestor so an actual attempted rename cannot redirect a later child effect', () => fixture(async f => {
    await fs.mkdir(path.join(f.root, 'checked'))
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('list', { path: ['checked'], limit: 128, cursor: null })).status).toBe('ACK')
    await expect(fs.rename(path.join(f.root, 'checked'), path.join(f.root, 'moved'))).rejects.toThrow()
    expect((await f.send('write-open', { path: ['checked', 'safe'], maxBytes: 0 })).status).toBe('ACK')
    expect((await f.send('dispose')).status).toBe('ACK')
  }))
  it('keeps actual Main persistence, readback, restart and compensation working while native root is bound', () => fixture(async f => {
    const userData = path.dirname(f.root), sessionId = 'window-1'
    const store = createPresentationSettings({ userData, sessionId, windowId: 5 })
    const initial = await store.initialize()
    const choice = (mode: 'light' | 'dark', density: 'compact' | 'comfortable') => ({
      mode, density, preferred: { light: 'frade.builtin/light', dark: 'frade.builtin/dark', 'high-contrast': 'frade.builtin/high-contrast' },
    })
    const context = (index: number, generation: number) => ({
      version: 1 as const, sessionId, requestId: 'window-1/intent-' + index,
      generation, transactionId: 'window-1/intent-' + index, revision: index,
      membership: 1, phase: 'apply' as const,
    })
    const firstIntent = await store.announceIntent('window-1/intent-1')
    const previous = await store.persist(context(1, firstIntent.generation), choice('dark', 'compact'), initial.durable.revision)
    expect(previous.status).toBe('ACK')
    if (previous.status !== 'ACK') throw Error(previous.message)
    const target = path.join(userData, 'presentation-settings.json')
    const previousBytes = await fs.readFile(target)
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const nextIntent = await store.announceIntent('window-1/intent-2')
    const phase = context(2, nextIntent.generation)
    const committed = await store.persist(phase, choice('light', 'comfortable'), previous.durable.revision)
    if (committed.status !== 'ACK') expect(await fs.readFile(target)).toEqual(previousBytes)
    expect(committed.status).toBe('ACK')
    if (committed.status !== 'ACK') throw Error(committed.message)
    expect(JSON.parse(await fs.readFile(target, 'utf8'))).toEqual(committed.durable)
    const restart = createPresentationSettings({ userData, sessionId: 'window-2', windowId: 5 })
    expect((await restart.initialize()).durable).toEqual(committed.durable)
    const restored = await store.reconcile({ ...phase, phase: 'rollback' }, previous.durable)
    expect(restored.selection).toEqual(previous.durable.selection)
    expect(restored.revision).toBeGreaterThan(committed.durable.revision)
    expect(JSON.parse(await fs.readFile(target, 'utf8'))).toEqual(restored)
    expect((await f.send('dispose')).status).toBe('ACK')
  }))
  it('lists the owned coordinator lease without reopening or releasing it', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const listing = await f.send('list', { path: [], limit: 128, cursor: null })
    expect(listing.status).toBe('ACK')
    expect(listing.entries).toHaveLength(1)
    expect(listing.entries[0]).toMatchObject({ name: '.coordinator.lock', kind: 'file', bytes: 0 })
    expect(listing.entries[0].identity).toMatch(/^[a-f0-9]{24}$/)
    expect(listing.cursor).toBeNull()
    expect((await f.send('dispose')).status).toBe('ACK')
  }))
  it('lists a retained checked child without relaxing its protection', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('mkdir', { path: ['parent'] })).status).toBe('ACK')
    expect((await f.send('mkdir', { path: ['parent', 'child'] })).status).toBe('ACK')
    const listing = await f.send('list', { path: ['parent'], limit: 128, cursor: null })
    expect(listing.status).toBe('ACK')
    expect(listing.entries).toHaveLength(1)
    expect(listing.entries[0]).toMatchObject({ name: 'child', kind: 'directory' })
    expect(listing.entries[0].identity).toMatch(/^[a-f0-9]{24}$/)
    await expect(fs.rename(path.join(f.root, 'parent', 'child'), path.join(f.root, 'parent', 'moved'))).rejects.toThrow()
    expect((await f.send('dispose')).status).toBe('ACK')
  }))
  it('performs actual bounded recursive cleanup of held descendants', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('mkdir', { path: ['parent'] })).status).toBe('ACK')
    expect((await f.send('mkdir', { path: ['parent', 'child'] })).status).toBe('ACK')
    const bytes = Buffer.from('owned-sealed-package-file')
    const written = await f.send('write-open', { path: ['parent', 'child', 'owned.txt'], maxBytes: bytes.length })
    expect(written.status).toBe('ACK')
    expect((await f.send('write-chunk', { handle: written.handle, offset: 0, data: bytes.toString('base64') })).status).toBe('ACK')
    expect((await f.send('write-close', { handle: written.handle, sha256: sha(bytes), retainForPublication: false })).status).toBe('ACK')
    expect((await f.send('remove', { path: ['parent'], kind: 'directory' })).status).toBe('ACK')
    await expect(fs.access(path.join(f.root, 'parent'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await fs.readdir(f.root)).toEqual(['.coordinator.lock'])
    expect((await f.send('dispose')).status).toBe('ACK')
  }))

  it('does not block owned sibling rename under an outer ancestor outside install/userData', () => fixture(async f => {
    const tempParent = await fs.realpath(os.tmpdir())
    const source = path.join(tempParent, 'frade-p02-owned-native-sibling-' + randomUUID() + '.tmp')
    const target = source + '.moved', bytes = Buffer.from('owned-sibling-original')
    await fs.writeFile(source, bytes, { flag: 'wx' })
    try {
      expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
      let renameError: unknown
      try { await fs.rename(source, target) } catch (error) { renameError = error }
      if (renameError) expect(await fs.readFile(source)).toEqual(bytes)
      expect(renameError).toBeUndefined()
      expect(await fs.readFile(target)).toEqual(bytes)
      expect((await f.send('dispose')).status).toBe('ACK')
    } finally {
      if (f.process.exitCode === null && f.process.signalCode === null) {
        const closed = new Promise<void>(resolve => f.process.once('close', () => resolve()))
        f.process.kill(); await closed
      }
      for (const owned of [source, target]) {
        if (path.dirname(owned).toLowerCase() !== tempParent.toLowerCase() ||
          !path.basename(owned).startsWith('frade-p02-owned-native-sibling-')) throw Error('UNSAFE_SIBLING_CLEANUP')
        try { await fs.unlink(owned) } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        }
      }
    }
  }))
})
