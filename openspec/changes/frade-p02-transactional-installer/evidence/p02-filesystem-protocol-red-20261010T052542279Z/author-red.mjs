import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const m=JSON.parse(fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json')),sha=b=>crypto.createHash('sha256').update(b).digest('hex');assert.equal(m.placementPRE.status,'PASS');
const files={
'packages/extension-service/src/filesystem/types.ts': `/** Host-only installation filesystem wire contract; never exposed to renderer. */
export const FILESYSTEM_PROTOCOL = 1 as const
export const MAX_FRAME_BYTES = 128 * 1024
export const MAX_CHUNK_BYTES = 64 * 1024
export const MAX_FILE_BYTES = 200 * 1024 * 1024
export const MAX_OPERATION_MS = 10_000
export interface FilesystemSession { session: string; generation: number }
export interface CommandEnvelope extends FilesystemSession {
  version: 1
  requestId: number
  /** Helper monotonic-clock milliseconds, negotiated by host; never wall-clock. */
  deadlineMs: number
}
export type FilesystemCommand = CommandEnvelope & (
  | { operation: 'bind'; root: string }
  | { operation: 'capabilities' | 'dispose' }
  | { operation: 'mkdir'; path: string[] }
  | { operation: 'read'; path: string[]; offset: number; length: number }
  | { operation: 'list'; path: string[]; limit: number; cursor: string | null }
  | { operation: 'write-open'; path: string[]; maxBytes: number }
  | { operation: 'write-chunk'; handle: string; offset: number; data: string }
  | { operation: 'write-close'; handle: string; sha256: string }
  | { operation: 'replace'; handle: string; parent: string[]; name: string; sha256: string }
  | { operation: 'remove'; path: string[]; kind: 'file' | 'directory' }
)
export type FilesystemFailure = 'REFUSED' | 'UNKNOWN' | 'BACKEND_UNAVAILABLE'
export interface FilesystemCapabilities {
  protocol: 1
  platform: 'windows-x64'
  filesystem: 'NTFS'
  checkedParents: true
  exclusiveWrites: true
  sameParentPublication: true
  writeThroughFlush: true
  unconditionalPowerLoss: 'NOT_PROVEN'
}
`,
'packages/extension-service/src/filesystem/windows-protocol.ts': `import type { FilesystemCommand, FilesystemSession } from './types'
/** Fail-closed TDD contract shell; no native process or filesystem effect. */
export class FilesystemCommandGate {
  constructor(_session: FilesystemSession) {}
  get closed(): boolean { return true }
  accept(_frame: Uint8Array, _nowMs: number): FilesystemCommand | null { return null }
  complete(_requestId: number, _success: boolean): boolean { return false }
}
`,
'packages/extension-service/tests/filesystem.protocol.test.ts': `import { describe, expect, it } from 'vitest'
import { FilesystemCommandGate } from '../src/filesystem/windows-protocol'
import { MAX_CHUNK_BYTES, MAX_FRAME_BYTES, MAX_FILE_BYTES } from '../src/filesystem/types'
const session = { session: 'fbd1ef36-884a-4c37-b12b-af508186d3f3', generation: 7 }
const frame = (value: object) => Buffer.from(JSON.stringify(value) + '\\n')
const command = (operation: string, fields: object = {}, requestId = 1) => ({
  version: 1, ...session, requestId, deadlineMs: 1000, operation, ...fields,
})
const bind = command('bind', { root: 'C:\\\\Frade-owned\\\\extensions' })
function bound() {
  const gate = new FilesystemCommandGate(session)
  expect(gate.accept(frame(bind), 10)).toEqual(bind)
  expect(gate.complete(1, true)).toBe(true)
  return gate
}
function refused(value: object, afterBind = false) {
  const gate = afterBind ? bound() : new FilesystemCommandGate(session)
  expect(gate.accept(frame(value), 10)).toBeNull()
  expect(gate.closed).toBe(true)
  expect(gate.accept(frame(bind), 10)).toBeNull()
}
describe('P02FS004: closed installation-root protocol admission', () => {
  it('admits one valid bind and capabilities in the same authenticated generation', () => {
    const gate = bound(), next = command('capabilities', {}, 2)
    expect(gate.closed).toBe(false)
    expect(gate.accept(frame(next), 20)).toEqual(next)
    expect(gate.complete(2, true)).toBe(true)
  })
  it.each([
    { version: 2 }, { generation: 6 }, { session: 'another-session' },
    { requestId: 0 }, { requestId: 2 }, { requestId: 1.5 },
    { deadlineMs: 10 }, { deadlineMs: 10_011 }, { deadlineMs: -1 },
    { root: '\\\\\\\\server\\\\share' }, { root: 'relative' },
    { root: 'C:\\\\Frade-owned\\\\..\\\\extensions' }, { root: 'C:\\\\Frade-owned\\\\extensions.' },
    { operation: 'execute' }, { extra: 'field' }, { root: 'C:\\\\CON\\\\extensions' },
  ])('rejects invalid bind before issuing a command: %j', (delta) => refused({ ...bind, ...delta }))
  it.each(['capabilities', 'mkdir', 'read', 'list', 'dispose'])('rejects %s before root bind', (op) =>
    refused(command(op, { path: ['version'] })))
  it('allows only one in-flight command and invalidates a pipeline instead of queueing effects', () => {
    const gate = new FilesystemCommandGate(session)
    expect(gate.accept(frame(bind), 10)).toEqual(bind)
    expect(gate.accept(frame(command('capabilities', {}, 2)), 10)).toBeNull()
    expect(gate.closed).toBe(true)
    expect(gate.complete(1, true)).toBe(false)
  })
  it('rejects replay, second bind and completion for another request', () => {
    refused(command('capabilities'), true)
    refused({ ...bind, requestId: 2 }, true)
    const gate = bound()
    expect(gate.accept(frame(command('capabilities', {}, 2)), 10)).not.toBeNull()
    expect(gate.complete(3, true)).toBe(false)
    expect(gate.closed).toBe(true)
  })
  it('failed bind permanently refuses later operations and failed mutation cannot be silently retried', () => {
    const gate = new FilesystemCommandGate(session)
    expect(gate.accept(frame(bind), 10)).not.toBeNull()
    expect(gate.complete(1, false)).toBe(true)
    expect(gate.closed).toBe(true)
    const mutation = bound()
    expect(mutation.accept(frame(command('mkdir', { path: ['versions'] }, 2)), 10)).not.toBeNull()
    expect(mutation.complete(2, false)).toBe(true)
    expect(mutation.accept(frame(command('mkdir', { path: ['versions'] }, 3)), 10)).toBeNull()
  })
  it('accepts every closed bounded operation after binding without leaking host paths', () => {
    const handle = 'a'.repeat(32), sha256 = 'b'.repeat(64)
    const cases = [
      command('mkdir', { path: ['versions', 'safe'] }, 2),
      command('read', { path: ['versions', 'safe.json'], offset: 0, length: MAX_CHUNK_BYTES }, 2),
      command('list', { path: [], limit: 128, cursor: null }, 2),
      command('write-open', { path: ['versions', 'safe.json'], maxBytes: MAX_FILE_BYTES }, 2),
      command('write-chunk', { handle, offset: 0, data: Buffer.alloc(MAX_CHUNK_BYTES, 7).toString('base64') }, 2),
      command('write-close', { handle, sha256 }, 2),
      command('replace', { handle, parent: ['journal', 'records'], name: 'record.json', sha256 }, 2),
      command('remove', { path: ['versions', 'safe'], kind: 'directory' }, 2),
      command('dispose', {}, 2),
    ]
    for (const value of cases) {
      const gate = bound()
      expect(gate.accept(frame(value), 10)).toEqual(value)
      expect(gate.complete(2, true)).toBe(true)
      expect(gate.closed).toBe(value.operation === 'dispose')
    }
  })
  it.each(['..', '.', '', 'a/b', 'a\\\\b', 'a:b', 'NUL', 'COM1.txt', 'last.', 'last ', 'x?', 'x\\u0000y', 'x<y'])
    ('rejects unsafe path component %j without forwarding any command', (name) =>
      refused(command('mkdir', { path: ['versions', name] }, 2), true))
  it('rejects depth, component length, oversized reads/writes and unbounded directory listing', () => {
    for (const value of [
      command('mkdir', { path: Array(33).fill('v') }, 2),
      command('mkdir', { path: ['a'.repeat(256)] }, 2),
      command('mkdir', { path: Array(32).fill('a'.repeat(255)) }, 2),
      command('read', { path: ['x'], offset: -1, length: 1 }, 2),
      command('read', { path: ['x'], offset: 0, length: MAX_CHUNK_BYTES + 1 }, 2),
      command('write-open', { path: ['x'], maxBytes: MAX_FILE_BYTES + 1 }, 2),
      command('write-chunk', { handle: 'a'.repeat(32), offset: 0, data: Buffer.alloc(MAX_CHUNK_BYTES + 1).toString('base64') }, 2),
      command('write-chunk', { handle: 'a'.repeat(32), offset: 0, data: 'not-base64' }, 2),
      command('write-chunk', { handle: 'a'.repeat(32), offset: 0, data: 'AB==' }, 2),
      command('list', { path: [], limit: 129, cursor: null }, 2),
      command('read', { path: 'C:\\\\arbitrary', offset: 0, length: 1 }, 2),
      command('remove', { path: [], kind: 'directory' }, 2),
    ]) refused(value, true)
  })
  it('rejects malformed UTF-8, oversized frames, duplicate JSON keys and ambiguous raw encodings', () => {
    const raw = [Buffer.from('{broken}\\n'), Buffer.from([0xff, 0x0a]), Buffer.alloc(MAX_FRAME_BYTES + 1, 0x61),
      Buffer.from(JSON.stringify(bind).replace('"version":1', '"version":2,"version":1') + '\\n'),
      Buffer.from(' ' + JSON.stringify(bind) + '\\n'), Buffer.from(JSON.stringify(bind) + '\\n\\n')]
    for (const value of raw) {
      const gate = new FilesystemCommandGate(session)
      expect(gate.accept(value, 10)).toBeNull()
      expect(gate.closed).toBe(true)
    }
  })
})
`};
for(const [p,s] of Object.entries(files)){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s,{flag:'wx'});}
const dir=m.base+'/evidence/p02-filesystem-protocol-red-'+new Date().toISOString().replace(/[-:.]/g,'');fs.mkdirSync(dir);for(const [p,s] of Object.entries(files))fs.writeFileSync(dir+'/'+path.basename(p),s,{flag:'wx'});fs.writeFileSync(dir+'/red-candidate.json',JSON.stringify({atUtc:new Date().toISOString(),PRE:m.placementPRE.reportSha256,phase:'CONTRACT_SHELL_BEFORE_BEHAVIOR',productionEffect:'NONE',paths:Object.keys(files),hashes:Object.entries(files).map(([file,s])=>({file,sha256:sha(s)})),native:'NOT_IMPLEMENTED'},null,2)+'\n',{flag:'wx'});fs.copyFileSync(process.argv[1],dir+'/author-red.mjs',fs.constants.COPYFILE_EXCL);m.protocolRedDir=dir;m.phase='FILESYSTEM_PROTOCOL_RED';fs.writeFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json',JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify({dir,files:Object.keys(files)}));
