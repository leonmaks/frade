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
async function removeOwnedSiblings(source: string, target: string, tempParent: string) {
  for (const owned of [source, target]) {
    if (path.dirname(owned).toLowerCase() !== tempParent.toLowerCase() ||
      !path.basename(owned).startsWith('frade-p02-owned-native-sibling-')) throw Error('UNSAFE_SIBLING_CLEANUP')
    try { await fs.unlink(owned) } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
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
      await removeOwnedSiblings(source, target, tempParent)
    }
  }))
})


// Additional actual backend contract coverage; the original nine assertions above are unchanged.
describe('P02FS001/002/004: actual guard ownership and native protocol boundaries', () => {
  it('retains the exclusive coordinator lease after owned-object enumeration', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('list', { path: [], limit: 128, cursor: null })).status).toBe('ACK')
    await fixture(async second => {
      expect((await second.send('bind', { root: f.root })).status).toBe('REFUSED')
    })
    expect((await f.send('capabilities')).status).toBe('ACK')
    expect((await f.send('dispose')).status).toBe('ACK')
  }))
  it('enumerates an exact retained pending file without releasing its publication handle', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const opened = await f.send('write-open', { path: ['pending.json'], maxBytes: 0 })
    expect(opened.status).toBe('ACK')
    expect((await f.send('write-close', { handle: opened.handle, sha256: sha(Buffer.alloc(0)) })).status).toBe('ACK')
    const listed = await f.send('list', { path: [], limit: 128, cursor: null })
    expect(listed.status).toBe('ACK')
    expect(listed.entries.map((e: { name: string }) => e.name).sort()).toEqual(['.coordinator.lock', 'pending.json'])
    expect((await f.send('replace', { handle: opened.handle, parent: [], name: 'final.json', sha256: sha(Buffer.alloc(0)) })).status).toBe('ACK')
    expect(await fs.readFile(path.join(f.root, 'final.json'))).toEqual(Buffer.alloc(0))
    expect((await f.send('dispose')).status).toBe('ACK')
  }))
  it('refuses deletion of the exact held root lease without deleting its ordinary file', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const reply = await f.send('remove', { path: ['.coordinator.lock'], kind: 'file' })
    expect(reply.status).toBe('REFUSED'); expect(reply.code).toBe('OWNED_OBJECT_PROTECTED')
    expect(await fs.readdir(f.root)).toEqual(['.coordinator.lock'])
  }))
  it('does not trust a forged hardlinked lease name at binding', () => fixture(async f => {
    await fs.link(path.join(f.outside, 'sentinel'), path.join(f.root, '.coordinator.lock'))
    expect((await f.send('bind', { root: f.root })).status).toBe('REFUSED')
    const exit = await new Promise<number | null>((resolve, reject) => {
      if (f.process.exitCode !== null) { resolve(f.process.exitCode); return }
      const timer = setTimeout(() => reject(Error('EXPECTED_REFUSAL_EXIT_TIMEOUT')), 5000)
      f.process.once('close', code => { clearTimeout(timer); resolve(code) })
    })
    expect(exit).toBe(2)
    expect(await fs.readFile(path.join(f.outside, 'sentinel'), 'utf8')).toBe('outside-original')
  }))
  it('rejects a reparse outer ancestor before creating the missing installation root', () => fixture(async f => {
    const alias = path.join(path.dirname(f.root), 'outer-alias')
    await fs.symlink(f.outside, alias, 'junction')
    expect((await f.send('bind', { root: path.join(alias, 'extensions') })).status).toBe('REFUSED')
    expect(await fs.readdir(f.outside)).toEqual(['sentinel'])
  }))
  it('bootstraps only a missing last root using the fully checked parent', () => fixture(async f => {
    const missing = path.join(f.root, 'authorized-root')
    expect((await f.send('bind', { root: missing })).status).toBe('ACK')
    expect((await f.send('list', { path: [], limit: 128, cursor: null })).status).toBe('ACK')
    expect((await f.send('dispose')).status).toBe('ACK')
    expect(await fs.readdir(missing)).toEqual(['.coordinator.lock'])
  }))
  it('refuses a missing outer ancestor without creating directories', () => fixture(async f => {
    expect((await f.send('bind', { root: path.join(f.root, 'missing-outer', 'extensions') })).status).toBe('REFUSED')
    expect(await fs.readdir(f.root)).toEqual([])
  }))
  it('refuses unknown hardlinks in enumeration without changing outside bytes', () => fixture(async f => {
    await fs.link(path.join(f.outside, 'sentinel'), path.join(f.root, 'untrusted-link'))
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('list', { path: [], limit: 128, cursor: null })).status).toBe('REFUSED')
    expect(await fs.readFile(path.join(f.outside, 'sentinel'), 'utf8')).toBe('outside-original')
  }))
  const invalid = [
    ['session', { session: '00000000-0000-0000-0000-000000000000' }],
    ['generation', { generation: 2 }],
    ['replayed request', { requestId: 1 }],
    ['expired deadline', { deadlineMs: 0 }],
    ['version', { version: 2 }],
    ['unknown field', { extra: true }],
    ['traversal', { path: ['..'] }],
    ['stream path', { path: ['file:stream'] }],
    ['reserved name', { path: ['NUL'] }],
    ['excessive depth', { path: Array.from({ length: 33 }, () => 'dir') }],
  ] as const
  for (const [name, fields] of invalid) it('refuses native ' + name + ' before a directory effect', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('mkdir', { path: ['must-not-exist'], ...fields })).status).toBe('REFUSED')
    expect(await fs.readdir(f.root)).toEqual(['.coordinator.lock'])
  }))
  it('accepts valid portable component data containing apostrophe and ampersand', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const name = "O'Brien & workshop"
    expect((await f.send('mkdir', { path: [name] })).status).toBe('ACK')
    expect((await f.send('dispose')).status).toBe('ACK')
    expect(await fs.readdir(f.root)).toEqual(['.coordinator.lock', name])
  }))
})


async function rawNativeRefusal(f: Fixture, frame: string) {
  const child = spawn(executable, [], { windowsHide: true, stdio: 'pipe' })
  let text = ''
  const closed = new Promise<number | null>(resolve => child.once('close', code => resolve(code)))
  try {
    const reply = new Promise<Record<string, any>>((resolve, reject) => {
      const timer = setTimeout(() => { child.kill(); reject(Error('RAW_FIXTURE_TIMEOUT')) }, 5000)
      child.once('error', error => { clearTimeout(timer); reject(error) })
      child.stdout.on('data', (bytes: Buffer) => {
        text += bytes.toString('utf8')
        if (text.length > 131072) { clearTimeout(timer); child.kill(); reject(Error('RAW_REPLY_LIMIT')); return }
        const end = text.indexOf('\n')
        if (end >= 0) { clearTimeout(timer); try { resolve(JSON.parse(text.slice(0, end))) } catch (error) { reject(Error(String(error))) } }
      })
    })
    child.stdin.end(frame + '\n')
    expect((await reply).status).toBe('REFUSED')
    expect(await closed).toBe(2)
    expect(await fs.readdir(f.root)).toEqual([])
  } finally {
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await closed }
  }
}

describe('P02FS004: canonical encoding keeps valid data and exact lexical rejection', () => {
  for (const code of [0x2028, 0x2029]) it('accepts normalized line-separator data U+' + code.toString(16), () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const name = 'atelier-' + String.fromCharCode(code)
    expect((await f.send('mkdir', { path: [name] })).status).toBe('ACK')
    const listed = await f.send('list', { path: [], limit: 128, cursor: null })
    expect(listed.status).toBe('ACK')
    expect(listed.entries.map((entry: { name: string }) => entry.name)).toContain(name)
    expect((await f.send('dispose')).status).toBe('ACK')
  }))
  it('preserves an escaped root backslash followed by literal u0027', () => fixture(async f => {
    const parent = path.join(f.root, 'u0027')
    await fs.mkdir(parent)
    const root = path.join(parent, 'installed')
    expect((await f.send('bind', { root })).status).toBe('ACK')
    expect((await f.send('dispose')).status).toBe('ACK')
    expect(await fs.readdir(parent)).toEqual(['installed'])
  }))
  it('still rejects duplicate native envelope keys before binding effects', () => fixture(async f => {
    const frame = JSON.stringify({ version: 1, session: randomUUID(), generation: 1, requestId: 1, deadlineMs: 10000, operation: 'bind', root: f.root })
    await rawNativeRefusal(f, frame.replace('"version":1', '"version":1,"version":1'))
  }))
  it('still rejects alternate escaped apostrophe encoding before bootstrap', () => fixture(async f => {
    const frame = JSON.stringify({ version: 1, session: randomUUID(), generation: 1, requestId: 1, deadlineMs: 10000, operation: 'bind', root: path.join(f.root, "O'Brien") })
    await rawNativeRefusal(f, frame.replace("'", String.fromCharCode(92) + 'u0027'))
  }))
})


import { spawnSync } from 'node:child_process'

async function actualMutationActor(f: Fixture, kind: 'nt-rename' | 'reparse') {
  const base = await fs.realpath(path.dirname(f.root))
  const temp = await fs.realpath(os.tmpdir())
  if (path.dirname(base).toLowerCase() !== temp.toLowerCase() || !path.basename(base).startsWith('frade-p02-native-')) throw Error('UNSAFE_ACTOR_OWNER')
  const source = fileURLToPath(new URL('./fixtures/windows-' + kind + '-actor.cs', import.meta.url))
  const output = path.join(base, kind + '-actor.exe')
  const compiler = path.join(process.env.WINDIR ?? '', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe')
  const args = ['/nologo', '/target:exe', '/platform:x64', '/warnaserror+', '/reference:System.Web.Extensions.dll', '/out:' + output, source]
  const built = spawnSync(compiler, args, { encoding: 'utf8', windowsHide: true, timeout: 10000 })
  expect(built.error).toBeUndefined()
  expect(built.status, built.stdout + built.stderr).toBe(0)
  return async (target: string) => {
    const resolved = await fs.realpath(target)
    if (resolved.toLowerCase() !== base.toLowerCase() && !resolved.toLowerCase().startsWith(base.toLowerCase() + path.sep)) throw Error('UNSAFE_ACTOR_TARGET')
    const operated = spawnSync(output, kind === 'reparse' ? [resolved, f.outside] : [resolved], { encoding: 'utf8', windowsHide: true, timeout: 10000 })
    expect(operated.error).toBeUndefined()
    expect(operated.status, operated.stdout + operated.stderr).toBe(0)
    const result = JSON.parse(operated.stdout) as { stage: string; success: boolean; error: number; restoreError?: number; deleteError?: number; reparseRemoved?: boolean }
    if (result.restoreError !== undefined) expect(result.restoreError).toBe(0)
    if (result.deleteError !== undefined) expect(result.deleteError).toBe(0)
    return result
  }
}

describe('P02FS001: actual direct NT/FSCTL attacks with genuine setup proof', () => {
  for (const kind of ['nt-rename', 'reparse'] as const) {
    for (const targetKind of ['outer', 'root', 'child'] as const) {
      it('confines effects after actual ' + kind + ' attempt on ' + targetKind, () => fixture(async f => {
        const attack = await actualMutationActor(f, kind)
        // Same actor succeeds on this ordinary unbound empty root and restores it.
        // An unavailable/broken actor setup cannot be counted as attack refusal PASS.
        const positive = await attack(f.root)
        expect(positive.success).toBe(true); expect(positive.error).toBe(0)
        expect(positive.reparseRemoved).toBe(true)
        expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
        expect((await f.send('mkdir', { path: ['checked'] })).status).toBe('ACK')
        const target = targetKind === 'outer' ? path.dirname(f.root) : targetKind === 'root' ? f.root : path.join(f.root, 'checked')
        const rejected = await attack(target)
        expect(rejected.success).toBe(false)
        if (targetKind === 'outer') {
          expect(rejected.stage).toBe(kind === 'nt-rename' ? 'nt-same-parent-ancestor-rename' : 'set-reparse')
          expect(rejected.error).toBe(kind === 'nt-rename' ? 5 : 145)
        } else {
          expect(rejected.stage).toBe(kind === 'nt-rename' ? 'open-delete' : 'open')
          expect(rejected.error).toBe(32)
        }
        const opened = await f.send('write-open', { path: ['checked', 'safe.bin'], maxBytes: 0 })
        expect(opened.status).toBe('ACK')
        expect((await f.send('write-close', { handle: opened.handle, sha256: sha(Buffer.alloc(0)), retainForPublication: false })).status).toBe('ACK')
        expect((await f.send('dispose')).status).toBe('ACK')
        expect(await fs.readFile(path.join(f.root, 'checked', 'safe.bin'))).toEqual(Buffer.alloc(0))
        expect(await fs.readFile(path.join(f.outside, 'sentinel'), 'utf8')).toBe('outside-original')
        expect(await fs.readdir(f.outside)).toEqual(['sentinel'])
      }))
    }
  }
})


describe('P02FS001: preexisting writer refusal before guarded binding effects', () => {
  for (const targetKind of ['outer', 'root'] as const) it('refuses an incompatible writer on ' + targetKind + ' and releases a failed bind', () => fixture(async f => {
    const base = await fs.realpath(path.dirname(f.root)), temp = await fs.realpath(os.tmpdir())
    if (path.dirname(base).toLowerCase() !== temp.toLowerCase() || !path.basename(base).startsWith('frade-p02-native-')) throw Error('UNSAFE_WRITER_OWNER')
    const compiler = path.join(process.env.WINDIR ?? '', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe')
    const source = fileURLToPath(new URL('./fixtures/windows-preexisting-writer-actor.cs', import.meta.url)), output = path.join(base, 'writer-actor.exe')
    const built = spawnSync(compiler, ['/nologo', '/target:exe', '/platform:x64', '/warnaserror+', '/reference:System.Web.Extensions.dll', '/out:' + output, source], { encoding: 'utf8', windowsHide: true, timeout: 10000 })
    expect(built.error).toBeUndefined(); expect(built.status, built.stdout + built.stderr).toBe(0)
    const target = targetKind === 'outer' ? base : f.root
    const writer = spawn(output, [target], { windowsHide: true, stdio: 'pipe' })
    const writerClosed = new Promise<number | null>(resolve => writer.once('close', code => resolve(code)))
    const helperClosed = new Promise<number | null>(resolve => f.process.once('close', code => resolve(code)))
    try {
      const ready = await new Promise<{ stage: string; success: boolean; error: number }>((resolve, reject) => {
        let text = ''
        const timer = setTimeout(() => { writer.kill(); reject(Error('WRITER_SETUP_TIMEOUT')) }, 5000)
        writer.once('error', error => { clearTimeout(timer); reject(error) })
        writer.stdout.on('data', (bytes: Buffer) => {
          text += bytes.toString('utf8')
          if (text.length > 4096) { clearTimeout(timer); writer.kill(); reject(Error('WRITER_SETUP_LIMIT')); return }
          const end = text.indexOf('\n')
          if (end >= 0) { clearTimeout(timer); try { resolve(JSON.parse(text.slice(0, end))) } catch (error) { reject(Error(String(error))) } }
        })
      })
      expect(ready).toEqual({ stage: 'writer-held', success: true, error: 0 })
      const bound = await f.send('bind', { root: f.root })
      expect(bound.status).toBe('REFUSED'); expect(bound.code).toBe('WIN32_32')
      expect(await helperClosed).toBe(2)
      expect(await fs.readdir(f.root)).toEqual([])
      writer.stdin.end('\n')
      expect(await writerClosed).toBe(0)
      const moved = path.join(base, 'root-after-refusal')
      await fs.rename(f.root, moved); await fs.rename(moved, f.root)
      expect(await fs.readdir(f.outside)).toEqual(['sentinel'])
    } finally {
      if (writer.exitCode === null && writer.signalCode === null) { writer.kill(); await writerClosed }
    }
  }))
})


it('retains the complete original guard set through missing-root and overlapping handoff windows', () => fixture(async f => {
  const base = await fs.realpath(path.dirname(f.root)), temp = await fs.realpath(os.tmpdir())
  if (path.dirname(base).toLowerCase() !== temp.toLowerCase() || !path.basename(base).startsWith('frade-p02-native-')) throw Error('UNSAFE_WINDOW_OWNER')
  const rename = await actualMutationActor(f, 'nt-rename'), reparse = await actualMutationActor(f, 'reparse')
  expect((await rename(f.root)).success).toBe(true)
  expect((await reparse(f.root)).success).toBe(true)
  const production = await fs.readFile(new URL('../native/windows-filesystem.cs', import.meta.url), 'utf8')
  const phases = ['before-root-create', 'full-bound', 'replacement-set-overlap', 'settled'] as const
  const prefix = path.join(base, 'window-marker-')
  const helperSource = path.join(base, 'window-helper.cs'), helperExe = path.join(base, 'window-helper.exe')
  const barrier = '  static void FixtureBarrier(string phase) {Console.Error.WriteLine("FR_FIXTURE:"+phase);while(!File.Exists(@"' + prefix.replaceAll('"', '""') + '"+phase)){if(Clock.ElapsedMilliseconds>8000)Refuse("FIXTURE_WINDOW_TIMEOUT");System.Threading.Thread.Sleep(1);}}\n'
  let instrumented = production
  const change = (anchor: string, replacement: string) => {
    expect(instrumented.split(anchor)).toHaveLength(2)
    instrumented = instrumented.replace(anchor, replacement)
  }
  change('  static void HandoffOuter(string[] parts) {', barrier + '  static void HandoffOuter(string[] parts) {')
  change('VerifyBinding();int count=Chain.Count-1;', 'VerifyBinding();int count=Chain.Count-1;FixtureBarrier("full-bound");')
  change('Same(Chain[i].Original,Identity(PendingOuter[i],true,Chain[i].Final));VerifyBinding();', 'Same(Chain[i].Original,Identity(PendingOuter[i],true,Chain[i].Final));VerifyBinding();FixtureBarrier("replacement-set-overlap");')
  change('RedundantOuter.RemoveAt(i);}VerifyBinding();', 'RedundantOuter.RemoveAt(i);}VerifyBinding();FixtureBarrier("settled");')
  change('next=Relative(h,parts[i],true,2,false,false);', 'FixtureBarrier("before-root-create");next=Relative(h,parts[i],true,2,false,false);')
  await fs.writeFile(helperSource, instrumented, { flag: 'wx' })
  const compiler = path.join(process.env.WINDIR ?? '', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe')
  const buildArgs = ['/nologo', '/target:exe', '/platform:x64', '/optimize+', '/warnaserror+', '/reference:System.Web.Extensions.dll', '/out:' + helperExe, helperSource]
  const built = spawnSync(compiler, buildArgs, { encoding: 'utf8', windowsHide: true, timeout: 10000 })
  expect(built.error).toBeUndefined(); expect(built.status, built.stdout + built.stderr).toBe(0)
  const child = spawn(helperExe, [], { windowsHide: true, stdio: 'pipe' })
  const closed = new Promise<number | null>(resolve => child.once('close', code => resolve(code)))
  const waiting = new Map<string, () => void>(), ready = new Map(phases.map(phase => [phase, new Promise<void>(resolve => waiting.set(phase, resolve))]))
  let errors = '', output = '', pending: ((reply: Record<string, any>) => void) | null = null, requestId = 0
  const session = randomUUID()
  child.stderr.on('data', (bytes: Buffer) => {
    errors += bytes.toString('utf8')
    if (errors.length > 4096) { child.kill(); return }
    for (const phase of phases) if (errors.includes('FR_FIXTURE:' + phase + '\n') || errors.includes('FR_FIXTURE:' + phase + '\r\n')) waiting.get(phase)?.()
  })
  child.stdout.on('data', (bytes: Buffer) => {
    output += bytes.toString('utf8')
    if (output.length > 131072) { child.kill(); return }
    const end = output.indexOf('\n')
    if (end >= 0 && pending) { const callback = pending; pending = null; callback(JSON.parse(output.slice(0, end))); output = output.slice(end + 1) }
  })
  const send = (operation: string, fields: object = {}) => new Promise<Record<string, any>>(resolve => {
    if (pending) throw Error('WINDOW_PENDING_REQUEST')
    pending = resolve
    child.stdin.write(JSON.stringify({ version: 1, session, generation: 1, requestId: ++requestId, deadlineMs: 10000, operation, ...fields }) + '\n')
  })
  const releaseWindowFixture = async () => {
    let failure: unknown
    for (const phase of phases) {
      try { await fs.writeFile(prefix + phase, 'close', { flag: 'wx' }) } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') failure ??= error
      }
    }
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await closed }
    if (failure) throw failure
  }
  const observations: object[] = []
  try {
    const root = path.join(f.root, 'window-installed'), bind = send('bind', { root })
    for (const phase of phases) {
      await Promise.race([ready.get(phase), closed.then(() => { throw Error('WINDOW_HELPER_EARLY_CLOSE ' + errors) })])
      const nt = await rename(f.root), fsctl = await reparse(f.root)
      expect(nt.success).toBe(false); expect(fsctl.success).toBe(false)
      if (phase !== 'settled') {
        expect(nt.stage).toBe('open-delete'); expect(nt.error).toBe(32)
        expect(fsctl.stage).toBe('open'); expect(fsctl.error).toBe(32)
      } else {
        expect(nt.stage).toBe('nt-same-parent-ancestor-rename'); expect(nt.error).toBe(5)
        expect(fsctl.stage).toBe('set-reparse'); expect(fsctl.error).toBe(145)
      }
      observations.push({ phase, nt, fsctl })
      await fs.writeFile(prefix + phase, 'continue', { flag: 'wx' })
    }
    expect((await bind).status).toBe('ACK')
    expect((await send('dispose')).status).toBe('ACK')
    expect(await closed).toBe(0)
    expect(await fs.readdir(root)).toEqual(['.coordinator.lock'])
    expect(await fs.readFile(path.join(f.outside, 'sentinel'), 'utf8')).toBe('outside-original')
    console.log(JSON.stringify({ proof: 'INSTRUMENTED_FIXTURE_ONLY_NOT_RUNTIME_CAPABILITY', productionSourceSha256: sha(Buffer.from(production)), fixtureSourceSha256: sha(Buffer.from(instrumented)), compiler, buildArgs, phaseObservations: observations, originalNativeProductionUnchanged: true }))
  } finally {
    await releaseWindowFixture()
  }
}))


async function expectNativeExit(child: ChildProcessWithoutNullStreams, code: number) {
  if (child.exitCode !== null) { expect(child.exitCode).toBe(code); return }
  const actual = await new Promise<number | null>((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('EXPECTED_NATIVE_EXIT_TIMEOUT')), 5000)
    child.once('close', result => { clearTimeout(timer); resolve(result) })
  })
  expect(actual).toBe(code)
}

describe('P02FS002/004: actual chunk, resource, publication and process-death boundaries', () => {
  const malformedChunks = [
    ['wrong offset', { offset: 1, data: 'YQ==' }, 'INVALID_WRITE_OFFSET'],
    ['empty bytes', { offset: 0, data: '' }, 'INVALID_CHUNK'],
    ['noncanonical base64', { offset: 0, data: 'YR==' }, 'WRITE_LIMIT'],
    ['invalid base64', { offset: 0, data: '!not-base64' }, 'INVALID_CHUNK'],
    ['per-file overflow', { offset: 0, data: Buffer.from('ab').toString('base64') }, 'WRITE_LIMIT'],
    ['chunk overflow', { offset: 0, data: Buffer.alloc(65537).toString('base64') }, 'WRITE_LIMIT'],
  ] as const
  for (const [name, fields, code] of malformedChunks) it('refuses ' + name + ' without a file-byte effect', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const opened = await f.send('write-open', { path: ['pending'], maxBytes: name === 'chunk overflow' ? 65537 : 1 })
    expect(opened.status).toBe('ACK')
    const refused = await f.send('write-chunk', { handle: opened.handle, ...fields })
    expect(refused.status).toBe('REFUSED'); expect(refused.code).toBe(code)
    await expectNativeExit(f.process, 2)
    expect(await fs.readFile(path.join(f.root, 'pending'))).toEqual(Buffer.alloc(0))
  }))
  it('accepts exactly 64KiB chunks and contiguous offsets with exact final hash/readback', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const first = Buffer.alloc(65536, 37), last = Buffer.from('last'), bytes = Buffer.concat([first, last])
    const opened = await f.send('write-open', { path: ['pending'], maxBytes: bytes.length })
    expect(opened.status).toBe('ACK')
    expect(await f.send('write-chunk', { handle: opened.handle, offset: 0, data: first.toString('base64') })).toMatchObject({ status: 'ACK', offset: first.length })
    expect(await f.send('write-chunk', { handle: opened.handle, offset: first.length, data: last.toString('base64') })).toMatchObject({ status: 'ACK', offset: bytes.length })
    expect((await f.send('write-close', { handle: opened.handle, sha256: sha(bytes), retainForPublication: false })).status).toBe('ACK')
    const read = await f.send('read', { path: ['pending'], offset: first.length, length: last.length })
    expect(read.status).toBe('ACK'); expect(Buffer.from(read.data, 'base64')).toEqual(last)
    expect((await f.send('dispose')).status).toBe('ACK')
    expect(await fs.readFile(path.join(f.root, 'pending'))).toEqual(bytes)
  }))
  it('refuses aggregate reserved byte overflow before creating another leaf', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('write-open', { path: ['reserved'], maxBytes: 209715200 })).status).toBe('ACK')
    expect(await f.send('write-open', { path: ['overflow'], maxBytes: 1 })).toMatchObject({ status: 'REFUSED', code: 'WRITE_RESOURCE_LIMIT' })
    await expectNativeExit(f.process, 2)
    expect((await fs.readdir(f.root)).sort()).toEqual(['.coordinator.lock', 'reserved'])
    expect(await fs.readFile(path.join(f.root, 'reserved'))).toEqual(Buffer.alloc(0))
  }))
  it('refuses a wrong closing hash and releases the existing ordinary bytes', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const bytes = Buffer.from('original'), opened = await f.send('write-open', { path: ['pending'], maxBytes: bytes.length })
    expect(opened.status).toBe('ACK')
    expect((await f.send('write-chunk', { handle: opened.handle, offset: 0, data: bytes.toString('base64') })).status).toBe('ACK')
    expect(await f.send('write-close', { handle: opened.handle, sha256: sha(Buffer.from('wrong')) })).toMatchObject({ status: 'REFUSED', code: 'HASH_MISMATCH' })
    await expectNativeExit(f.process, 2)
    expect(await fs.readFile(path.join(f.root, 'pending'))).toEqual(bytes)
    await fs.rename(path.join(f.root, 'pending'), path.join(f.root, 'released'))
    expect(await fs.readFile(path.join(f.root, 'released'))).toEqual(bytes)
  }))
  it('refuses writing a sealed held file without changing the sealed bytes', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const opened = await f.send('write-open', { path: ['pending'], maxBytes: 1 })
    expect(opened.status).toBe('ACK')
    expect((await f.send('write-close', { handle: opened.handle, sha256: sha(Buffer.alloc(0)) })).status).toBe('ACK')
    expect(await f.send('write-chunk', { handle: opened.handle, offset: 0, data: 'YQ==' })).toMatchObject({ status: 'REFUSED', code: 'INVALID_WRITE_OFFSET' })
    await expectNativeExit(f.process, 2)
    expect(await fs.readFile(path.join(f.root, 'pending'))).toEqual(Buffer.alloc(0))
  }))
  it('refuses an exclusive write over an existing ordinary leaf', () => fixture(async f => {
    const existing = path.join(f.root, 'existing'), bytes = Buffer.from('keep-original')
    await fs.writeFile(existing, bytes)
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('write-open', { path: ['existing'], maxBytes: 1 })).status).toBe('REFUSED')
    await expectNativeExit(f.process, 2)
    expect(await fs.readFile(existing)).toEqual(bytes)
  }))
  for (const kind of ['ordinary', 'directory', 'junction', 'hardlink'] as const) it('does not overwrite an existing ' + kind + ' publication target', () => fixture(async f => {
    const target = path.join(f.root, 'target'), old = Buffer.from('old-target')
    if (kind === 'ordinary') await fs.writeFile(target, old)
    if (kind === 'directory') { await fs.mkdir(target); await fs.writeFile(path.join(target, 'sentinel'), old) }
    if (kind === 'junction') await fs.symlink(f.outside, target, 'junction')
    if (kind === 'hardlink') await fs.link(path.join(f.outside, 'sentinel'), target)
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const bytes = Buffer.from('new-source'), opened = await f.send('write-open', { path: ['pending'], maxBytes: bytes.length })
    expect(opened.status).toBe('ACK')
    expect((await f.send('write-chunk', { handle: opened.handle, offset: 0, data: bytes.toString('base64') })).status).toBe('ACK')
    expect((await f.send('write-close', { handle: opened.handle, sha256: sha(bytes) })).status).toBe('ACK')
    expect((await f.send('replace', { handle: opened.handle, parent: [], name: 'target', sha256: sha(bytes) })).status).toBe('UNKNOWN')
    await expectNativeExit(f.process, 2)
    expect(await fs.readFile(path.join(f.root, 'pending'))).toEqual(bytes)
    if (kind === 'ordinary') expect(await fs.readFile(target)).toEqual(old)
    if (kind === 'directory') expect(await fs.readFile(path.join(target, 'sentinel'))).toEqual(old)
    if (kind === 'junction') expect((await fs.lstat(target)).isSymbolicLink()).toBe(true)
    if (kind === 'hardlink') expect(await fs.readFile(target, 'utf8')).toBe('outside-original')
  }))
  it('refuses a different publication parent before an NT rename effect', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('mkdir', { path: ['different'] })).status).toBe('ACK')
    const opened = await f.send('write-open', { path: ['pending'], maxBytes: 0 })
    expect(opened.status).toBe('ACK')
    expect((await f.send('write-close', { handle: opened.handle, sha256: sha(Buffer.alloc(0)) })).status).toBe('ACK')
    expect(await f.send('replace', { handle: opened.handle, parent: ['different'], name: 'target', sha256: sha(Buffer.alloc(0)) })).toMatchObject({ status: 'REFUSED', code: 'INVALID_PUBLICATION' })
    await expectNativeExit(f.process, 2)
    expect(await fs.readdir(path.join(f.root, 'different'))).toEqual([])
    expect(await fs.readFile(path.join(f.root, 'pending'))).toEqual(Buffer.alloc(0))
  }))
  for (const point of ['open', 'sealed', 'published'] as const) it('reopens exact guarded bytes and root after real helper kill at ' + point, () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const bytes = point === 'open' ? Buffer.alloc(0) : Buffer.from('survives-process-death')
    const opened = await f.send('write-open', { path: ['pending'], maxBytes: bytes.length })
    expect(opened.status).toBe('ACK')
    if (point !== 'open') {
      expect((await f.send('write-chunk', { handle: opened.handle, offset: 0, data: bytes.toString('base64') })).status).toBe('ACK')
      expect((await f.send('write-close', { handle: opened.handle, sha256: sha(bytes) })).status).toBe('ACK')
    }
    if (point === 'published') expect((await f.send('replace', { handle: opened.handle, parent: [], name: 'final', sha256: sha(bytes) })).status).toBe('ACK')
    const closed = new Promise<void>(resolve => f.process.once('close', () => resolve()))
    expect(f.process.kill()).toBe(true); await closed
    const name = point === 'published' ? 'final' : 'pending'
    expect(await fs.readFile(path.join(f.root, name))).toEqual(bytes)
    await fixture(async next => {
      expect((await next.send('bind', { root: f.root })).status).toBe('ACK')
      const read = await next.send('read', { path: [name], offset: 0, length: 65536 })
      expect(read.status).toBe('ACK'); expect(Buffer.from(read.data, 'base64')).toEqual(bytes)
      expect((await next.send('dispose')).status).toBe('ACK')
    })
    await fs.rename(f.root, f.root + '-released'); await fs.rename(f.root + '-released', f.root)
    expect(await fs.readFile(path.join(f.root, name))).toEqual(bytes)
  }))
})


async function actualMalformedFrame(f: Fixture, frame: Buffer, expected: { code?: string; errorType?: string }) {
  const child = spawn(executable, [], { windowsHide: true, stdio: 'pipe' })
  let output = ''
  const closed = new Promise<number | null>(resolve => child.once('close', code => resolve(code)))
  try {
    const reply = new Promise<Record<string, any>>((resolve, reject) => {
      const timer = setTimeout(() => { child.kill(); reject(Error('FRAME_FIXTURE_TIMEOUT')) }, 5000)
      child.once('error', error => { clearTimeout(timer); reject(error) })
      child.stdout.on('data', (bytes: Buffer) => {
        output += bytes.toString('utf8')
        if (output.length > 131072) { clearTimeout(timer); child.kill(); reject(Error('FRAME_REPLY_LIMIT')); return }
        const end = output.indexOf('\n')
        if (end >= 0) { clearTimeout(timer); try { resolve(JSON.parse(output.slice(0, end))) } catch (error) { reject(Error(String(error))) } }
      })
    })
    child.stdin.end(frame)
    expect(await reply).toMatchObject({ status: 'REFUSED', ...expected })
    expect(await closed).toBe(2)
    expect(await fs.readdir(f.root)).toEqual([])
  } finally {
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await closed }
  }
}

describe('P02FS004: actual native frame and cursor limits', () => {
  it('refuses a frame beyond the actual 128KiB byte limit before binding', () => fixture(async f => {
    await actualMalformedFrame(f, Buffer.concat([Buffer.alloc(131073, 32), Buffer.from('\n')]), { code: 'FRAME_LIMIT' })
  }))
  it('refuses a truncated frame at real stdin EOF without any root effect', () => fixture(async f => {
    await actualMalformedFrame(f, Buffer.from('{"version":1'), { code: 'TRUNCATED_FRAME' })
  }))
  it('refuses malformed UTF8 rather than replacing invalid bytes', () => fixture(async f => {
    await actualMalformedFrame(f, Buffer.from([0xc3, 0x28, 0x0a]), { errorType: 'DecoderFallbackException' })
  }))
  const envelopes = [
    ['string generation', { generation: '1' }],
    ['fractional generation', { generation: 1.5 }],
    ['unsafe request number', { requestId: 9007199254740992 }],
    ['future deadline', { deadlineMs: 60000 }],
    ['unbound operation', { operation: 'mkdir', path: ['wrong'] }],
  ] as const
  for (const [name, fields] of envelopes) it('refuses ' + name + ' before binding effects', () => fixture(async f => {
    const frame = JSON.stringify({ version: 1, session: randomUUID(), generation: 1, requestId: 1, deadlineMs: 10000, operation: 'bind', root: f.root, ...fields }) + '\n'
    await actualMalformedFrame(f, Buffer.from(frame), {})
  }))
  it('paginates actual ordinary identities and invalidates the exhausted cursor', () => fixture(async f => {
    const names = Array.from({ length: 130 }, (_, i) => 'item-' + String(i).padStart(3, '0'))
    await Promise.all(names.map(name => fs.writeFile(path.join(f.root, name), name, { flag: 'wx' })))
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const first = await f.send('list', { path: [], limit: 128, cursor: null })
    expect(first.status).toBe('ACK'); expect(first.entries).toHaveLength(128)
    expect(first.cursor).toMatch(/^[a-f0-9]{32}$/)
    const second = await f.send('list', { path: [], limit: 128, cursor: first.cursor })
    expect(second.status).toBe('ACK'); expect(second.entries).toHaveLength(3); expect(second.cursor).toBeNull()
    const rows = [...first.entries, ...second.entries]
    expect(rows.map((row: { name: string }) => row.name).sort()).toEqual(['.coordinator.lock', ...names])
    expect(new Set(rows.map((row: { identity: string }) => row.identity)).size).toBe(131)
    expect(await f.send('list', { path: [], limit: 128, cursor: first.cursor })).toMatchObject({ status: 'REFUSED', code: 'STALE_CURSOR' })
    await expectNativeExit(f.process, 2)
    for (const name of names) expect(await fs.readFile(path.join(f.root, name), 'utf8')).toBe(name)
  }))
  it('refuses a foreign cursor before returning directory contents', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect(await f.send('list', { path: [], limit: 128, cursor: '0'.repeat(32) })).toMatchObject({ status: 'REFUSED', code: 'STALE_CURSOR' })
    await expectNativeExit(f.process, 2)
    expect(await fs.readdir(f.root)).toEqual(['.coordinator.lock'])
  }))
  it('refuses an excessive read before returning file bytes', () => fixture(async f => {
    await fs.writeFile(path.join(f.root, 'ordinary'), 'original')
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('read', { path: ['ordinary'], offset: 0, length: 65537 })).status).toBe('REFUSED')
    await expectNativeExit(f.process, 2)
    expect(await fs.readFile(path.join(f.root, 'ordinary'), 'utf8')).toBe('original')
  }))
})
