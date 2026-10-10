import { describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createHash, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { WindowsFilesystemTransport } from '../src/filesystem/windows'
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

describe('P02 owned bootstrap cleanup: actual identity and empty-only guards', () => {
  const identity = async (f: Fixture, parent: string[], name: string) => {
    const r = await f.send('list', { path: parent, limit: 128, cursor: null })
    expect(r.status).toBe('ACK'); const row = r.entries.find((e: any) => e.name === name)
    expect(row.identity).toMatch(/^[a-f0-9]{24}$/); return row.identity as string
  }
  it('deletes only the exact ordinary file and exact empty held directory', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('mkdir', { path: ['probe'] })).status).toBe('ACK')
    const bytes = Buffer.from('owner-proof'), opened = await f.send('write-open', { path: ['probe', 'owner.json'], maxBytes: bytes.length })
    expect(opened.status).toBe('ACK'); expect((await f.send('write-chunk', { handle: opened.handle, offset: 0, data: bytes.toString('base64') })).status).toBe('ACK')
    expect((await f.send('write-close', { handle: opened.handle, sha256: sha(bytes), retainForPublication: false })).status).toBe('ACK')
    const fileId = await identity(f, ['probe'], 'owner.json'), dirId = await identity(f, [], 'probe')
    expect((await f.send('remove', { path: ['probe', 'owner.json'], kind: 'file', expectedIdentity: fileId })).status).toBe('ACK')
    expect(await fs.readdir(path.join(f.root, 'probe'))).toEqual([])
    expect((await f.send('remove', { path: ['probe'], kind: 'directory', expectedIdentity: dirId, emptyOnly: true })).status).toBe('ACK')
    expect(await fs.readdir(f.root)).toEqual(['.coordinator.lock'])
    expect((await f.send('dispose')).status).toBe('ACK')
  }))
  it('preserves genuinely new unknown child instead of recursive cleanup', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('mkdir', { path: ['probe'] })).status).toBe('ACK')
    const dirId = await identity(f, [], 'probe')
    await fs.writeFile(path.join(f.root, 'probe', 'unknown'), 'unowned-exact-bytes', { flag: 'wx' })
    expect(await fs.readFile(path.join(f.root, 'probe', 'unknown'), 'utf8')).toBe('unowned-exact-bytes')
    const r = await f.send('remove', { path: ['probe'], kind: 'directory', expectedIdentity: dirId, emptyOnly: true })
    expect(['REFUSED', 'UNKNOWN']).toContain(r.status); expect(r.code).not.toBe('INVALID_SCHEMA')
    expect(await fs.readFile(path.join(f.root, 'probe', 'unknown'), 'utf8')).toBe('unowned-exact-bytes')
    expect(await fs.readdir(path.join(f.root, 'probe'))).toEqual(['unknown'])
  }))
  it('refuses a genuinely changed same-path ordinary object using captured identity', () => fixture(async f => {
    await fs.writeFile(path.join(f.root, 'target'), 'original', { flag: 'wx' })
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const oldId = await identity(f, [], 'target'), closed = new Promise<void>(resolve => f.process.once('close', () => resolve()))
    expect((await f.send('dispose')).status).toBe('ACK'); await closed
    await fs.rename(path.join(f.root, 'target'), path.join(f.root, 'retained-original'))
    await fs.writeFile(path.join(f.root, 'target'), 'replacement', { flag: 'wx' })
    const port = await WindowsFilesystemTransport.connect({ installationRoot: f.root, distributionDirectory: fileURLToPath(new URL('../dist/native/', import.meta.url)), sourceSha256: sha(await fs.readFile(new URL('../native/windows-filesystem.cs', import.meta.url))), generation: 2 })
    try {
      const rows = await port.request({ operation: 'list', path: [], limit: 128, cursor: null })
      expect(rows.entries.find((e: any) => e.name === 'target').identity).not.toBe(oldId)
      await expect(port.request({ operation: 'remove', path: ['target'], kind: 'file', expectedIdentity: oldId } as any)).rejects.toThrow('TARGET_IDENTITY_MISMATCH')
      expect(await fs.readFile(path.join(f.root, 'target'), 'utf8')).toBe('replacement')
      expect(await fs.readFile(path.join(f.root, 'retained-original'), 'utf8')).toBe('original')
    } finally { await port.dispose() }
  }))
  for (const fields of [ { expectedIdentity: 'A'.repeat(24) }, { expectedIdentity: 'a'.repeat(23) }, { emptyOnly: false }, { emptyOnly: true, kind: 'file' }, { expectedIdentity: 'a'.repeat(24), extra: true } ])
    it('rejects invalid native guard fields before child effects ' + JSON.stringify(fields), () => fixture(async f => {
      await fs.mkdir(path.join(f.root, 'probe')); await fs.writeFile(path.join(f.root, 'probe', 'sentinel'), 'unchanged')
      expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
      expect((await f.send('remove', { path: ['probe'], kind: 'directory', ...fields })).status).toBe('REFUSED')
      expect(await fs.readFile(path.join(f.root, 'probe', 'sentinel'), 'utf8')).toBe('unchanged')
    }))
})
