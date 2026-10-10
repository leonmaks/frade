import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const m=JSON.parse(fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json')),p='packages/extension-service/src/filesystem/windows-protocol.ts';assert(fs.readFileSync(p,'utf8').includes('Fail-closed TDD contract shell'));
const code=String.raw`import {
  MAX_CHUNK_BYTES, MAX_FILE_BYTES, MAX_FRAME_BYTES, MAX_OPERATION_MS,
} from './types'
import type { FilesystemCommand, FilesystemSession } from './types'
const envelopeKeys = ['version', 'session', 'generation', 'requestId', 'deadlineMs', 'operation']
const operationKeys: Record<string, readonly string[]> = {
  bind: ['root'], capabilities: [], dispose: [], mkdir: ['path'],
  read: ['path', 'offset', 'length'], list: ['path', 'limit', 'cursor'],
  'write-open': ['path', 'maxBytes'], 'write-chunk': ['handle', 'offset', 'data'],
  'write-close': ['handle', 'sha256'], replace: ['handle', 'parent', 'name', 'sha256'],
  remove: ['path', 'kind'],
}
const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
const token = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value)
const hash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
export function safeFilesystemComponent(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 255 &&
    value.normalize('NFC') === value && value !== '.' && value !== '..' &&
    !/[\x00-\x1f\x7f<>:"/\\|?*]/.test(value) && !/[. ]$/.test(value) &&
    !/^(CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])(?:\.|$)/i.test(value)
}
function components(value: unknown, empty = false): value is string[] {
  return Array.isArray(value) && value.length <= 32 && (empty || value.length > 0) &&
    value.every(safeFilesystemComponent) && value.join('\\').length <= 4096
}
function root(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z]:\\/.test(value) &&
    value.length <= 4096 && components(value.slice(3).split('\\'))
}
function payload(value: Record<string, unknown>): boolean {
  switch (value.operation) {
    case 'bind': return root(value.root)
    case 'capabilities': case 'dispose': return true
    case 'mkdir': return components(value.path)
    case 'read': return components(value.path) && integer(value.offset, 0, MAX_FILE_BYTES) &&
      integer(value.length, 1, MAX_CHUNK_BYTES) && value.offset + value.length <= MAX_FILE_BYTES
    case 'list': return components(value.path, true) && integer(value.limit, 1, 128) &&
      (value.cursor === null || token(value.cursor))
    case 'write-open': return components(value.path) && integer(value.maxBytes, 0, MAX_FILE_BYTES)
    case 'write-chunk': {
      if (!token(value.handle) || !integer(value.offset, 0, MAX_FILE_BYTES) ||
        typeof value.data !== 'string' || value.data.length === 0 ||
        value.data.length > 4 * Math.ceil(MAX_CHUNK_BYTES / 3) ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.data)) return false
      const bytes = Buffer.from(value.data, 'base64')
      return bytes.length > 0 && bytes.length <= MAX_CHUNK_BYTES &&
        bytes.toString('base64') === value.data && value.offset + bytes.length <= MAX_FILE_BYTES
    }
    case 'write-close': return token(value.handle) && hash(value.sha256)
    case 'replace': return token(value.handle) && components(value.parent, true) &&
      safeFilesystemComponent(value.name) && hash(value.sha256)
    case 'remove': return components(value.path) && (value.kind === 'file' || value.kind === 'directory')
    default: return false
  }
}
/** Admission has no filesystem effects. Native executor must independently recheck handles/offsets. */
export class FilesystemCommandGate {
  private unusable = false
  private bound = false
  private nextId = 1
  private pending: FilesystemCommand | null = null
  private readonly session: FilesystemSession
  constructor(session: FilesystemSession) {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(session.session) ||
      !integer(session.generation, 1, Number.MAX_SAFE_INTEGER)) throw new TypeError('INVALID_FILESYSTEM_SESSION')
    this.session = { ...session }
  }
  get closed(): boolean { return this.unusable }
  private refuse(): null { this.unusable = true; this.pending = null; return null }
  accept(frame: Uint8Array, nowMs: number): FilesystemCommand | null {
    if (this.unusable || this.pending || !Number.isFinite(nowMs) || nowMs < 0 ||
      frame.byteLength > MAX_FRAME_BYTES || frame.byteLength < 3) return this.refuse()
    let text: string, value: unknown
    try {
      text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(frame)
      if (!text.endsWith('\n') || text.slice(0, -1).includes('\n')) return this.refuse()
      text = text.slice(0, -1)
      value = JSON.parse(text)
      // Dedicated host transport uses one compact canonical encoding. This also refuses duplicate keys.
      if (JSON.stringify(value) !== text) return this.refuse()
    } catch { return this.refuse() }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return this.refuse()
    const item = value as Record<string, unknown>
    if (typeof item.operation !== 'string' || !Object.hasOwn(operationKeys, item.operation)) return this.refuse()
    const keys = [...envelopeKeys, ...operationKeys[item.operation]]
    if (Object.keys(item).length !== keys.length || !keys.every(key => Object.hasOwn(item, key)) ||
      item.version !== 1 || item.session !== this.session.session || item.generation !== this.session.generation ||
      item.requestId !== this.nextId || !integer(item.requestId, 1, Number.MAX_SAFE_INTEGER) ||
      typeof item.deadlineMs !== 'number' || !Number.isFinite(item.deadlineMs) ||
      item.deadlineMs <= nowMs || item.deadlineMs > nowMs + MAX_OPERATION_MS ||
      (this.bound ? item.operation === 'bind' : item.operation !== 'bind') || !payload(item)) return this.refuse()
    this.pending = item as FilesystemCommand
    return this.pending
  }
  complete(requestId: number, success: boolean): boolean {
    if (this.unusable || !this.pending || requestId !== this.pending.requestId || typeof success !== 'boolean') {
      this.refuse(); return false
    }
    const operation = this.pending.operation
    this.pending = null
    if (!success || operation === 'dispose' || this.nextId === Number.MAX_SAFE_INTEGER) this.unusable = true
    else { if (operation === 'bind') this.bound = true; this.nextId++ }
    return true
  }
}
`;
fs.writeFileSync(p,code);const dir=m.base+'/evidence/p02-filesystem-protocol-implementation-'+new Date().toISOString().replace(/[-:.]/g,'');fs.mkdirSync(dir);fs.writeFileSync(dir+'/windows-protocol.ts',code,{flag:'wx'});fs.writeFileSync(dir+'/implementation.json',JSON.stringify({atUtc:new Date().toISOString(),PRE:m.placementPRE.reportSha256,RED:m.protocolRedDir,source:p,sha256:crypto.createHash('sha256').update(code).digest('hex'),scope:'Closed pure admission state machine only; native executor independently validates actual object identity/offsets; backend and effects NOT_IMPLEMENTED',encoding:'Dedicated host sends compact JSON+LF; ambiguous/duplicate-key/noncanonical input rejected',clock:'Helper monotonic deadline; host must negotiate conservative helper-clock offset and independently enforce its own monotonic timeout'},null,2)+'\n',{flag:'wx'});fs.copyFileSync(process.argv[1],dir+'/author-green.mjs',fs.constants.COPYFILE_EXCL);m.protocolImplementationDir=dir;fs.writeFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json',JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify({dir}));
