import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const m=JSON.parse(fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json'));assert.equal(m.placementPRE.status,'PASS');
const files={
'packages/extension-service/native/windows-filesystem.cs':String.raw`// P02 no-effect TDD shell. First native positive fixture must fail before Win32 implementation.
using System;
using System.Collections.Generic;
using System.Text;
using System.Web.Script.Serialization;
public static class FradeFilesystem {
  public static int Main() {
    Console.InputEncoding = new UTF8Encoding(false, true);
    Console.OutputEncoding = new UTF8Encoding(false);
    string line = Console.ReadLine();
    if (line == null) return 2;
    try {
      var json = new JavaScriptSerializer();
      var value = json.Deserialize<Dictionary<string, object>>(line);
      Console.WriteLine(json.Serialize(new { version=1, requestId=value["requestId"], session=value["session"], generation=value["generation"], clockMs=0, status="REFUSED", code="NOT_IMPLEMENTED" }));
    } catch (Exception e) { Console.Error.WriteLine(e.GetType().Name); }
    return 2;
  }
}
`,
'packages/extension-service/scripts/build-windows-filesystem.mjs':String.raw`import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'native/windows-filesystem.cs')
const output = path.join(root, 'dist/native')
const sha = value => crypto.createHash('sha256').update(value).digest('hex')
if (process.platform !== 'win32') {
  console.log(JSON.stringify({ status: 'NOT_APPLICABLE_HOST', native: 'NOT_RUN' }))
} else {
  if (process.arch !== 'x64' || !process.env.WINDIR) throw new Error('BACKEND_UNAVAILABLE_ARCHITECTURE')
  const windows = fs.realpathSync(process.env.WINDIR)
  const compiler = path.join(windows, 'Microsoft.NET/Framework64/v4.0.30319/csc.exe')
  const compilerHash = sha(fs.readFileSync(compiler)), sourceHash = sha(fs.readFileSync(source))
  const ps = path.join(windows, 'System32/WindowsPowerShell/v1.0/powershell.exe')
  const version = spawnSync(ps, ['-NoProfile', '-NonInteractive', '-Command',
    "(Get-Item -LiteralPath '" + compiler.replaceAll("'", "''") + "').VersionInfo.FileVersion"],
    { encoding: 'utf8', windowsHide: true, timeout: 10000 })
  if (version.error || version.status !== 0 || !version.stdout.trim()) throw new Error('BACKEND_UNAVAILABLE_COMPILER_METADATA')
  fs.mkdirSync(output, { recursive: true })
  const executable = path.join(output, 'frade-filesystem.exe')
  const args = ['/nologo', '/target:exe', '/platform:x64', '/optimize+', '/warnaserror+',
    '/reference:System.Web.Extensions.dll', '/out:' + executable, source]
  const result = spawnSync(compiler, args, { encoding: 'utf8', windowsHide: true, timeout: 60000, cwd: root })
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  if (result.error || result.status !== 0) throw new Error('BACKEND_UNAVAILABLE_COMPILATION')
  if (sha(fs.readFileSync(source)) !== sourceHash || sha(fs.readFileSync(compiler)) !== compilerHash) throw new Error('BUILD_INPUT_CHANGED')
  const bytes = fs.readFileSync(executable)
  // PE machine field is x64; generated hash is integrity, never signing or publisher trust.
  if (bytes.length < 256 || bytes.readUInt16LE(0) !== 0x5a4d) throw new Error('INVALID_PE')
  const pe = bytes.readUInt32LE(0x3c)
  if (pe + 24 > bytes.length || bytes.readUInt32LE(pe) !== 0x4550 || bytes.readUInt16LE(pe + 4) !== 0x8664) throw new Error('INVALID_PE_ARCHITECTURE')
  const metadata = { schemaVersion: 1, protocol: 1, platform: 'windows-x64',
    source: 'native/windows-filesystem.cs', sourceSha256: sourceHash,
    executable: 'frade-filesystem.exe', executableSha256: sha(bytes), executableBytes: bytes.length,
    compiler, compilerSha256: compilerHash, compilerVersion: version.stdout.trim(),
    command: [compiler, ...args], compiledAtUtc: new Date().toISOString(),
    runtimeCapabilities: 'NOT_VERIFIED', publisherTrust: 'NOT_ASSERTED' }
  fs.writeFileSync(path.join(output, 'integrity.json'), JSON.stringify(metadata, null, 2) + '\n')
  console.log(JSON.stringify({ status: 'BUILT_INTEGRITY_ONLY', ...metadata }))
}
`,
'packages/extension-service/tests/filesystem.windows.test.ts':String.raw`import { describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createHash, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
const executable = fileURLToPath(new URL('../dist/native/frade-filesystem.exe', import.meta.url))
interface Fixture {
  root: string
  outside: string
  process: ChildProcessWithoutNullStreams
  send: (operation: string, fields?: object) => Promise<Record<string, any>>
}
async function fixture(run: (f: Fixture) => Promise<void>) {
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('WINDOWS_NATIVE_NOT_RUN_UNSUPPORTED_HOST')
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
    const resolved = await fs.realpath(temp)
    if (path.dirname(resolved).toLowerCase() !== tempParent.toLowerCase() || !path.basename(resolved).startsWith('frade-p02-native-')) throw new Error('UNSAFE_FIXTURE_CLEANUP')
    await fs.rm(resolved, { recursive: true })
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
})
`};for(const [p,s] of Object.entries(files)){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s,{flag:'wx'});}
const dir=m.base+'/evidence/p02-native-behavior-red-'+new Date().toISOString().replace(/[-:.]/g,'');fs.mkdirSync(dir);for(const [p,s] of Object.entries(files))fs.writeFileSync(dir+'/'+path.basename(p),s,{flag:'wx'});fs.writeFileSync(dir+'/test-intent.json',JSON.stringify({atUtc:new Date().toISOString(),phase:'ACTUAL_COMPILED_NO_EFFECT_CONTRACT_SHELL',PRE:m.placementPRE.reportSha256,files:Object.keys(files),root:'Owned unique Windows Temp fixtures only',claim:'Native positive behavior expected RED; compilation/integrity never runtime PASS; more adversarial cases remain required'},null,2)+'\n',{flag:'wx'});fs.copyFileSync(process.argv[1],dir+'/author-native-red.mjs',fs.constants.COPYFILE_EXCL);m.nativeRedDir=dir;m.phase='NATIVE_BEHAVIOR_RED';fs.writeFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json',JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify({dir}));
