import {
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
    Array.from(value).every(char => char.charCodeAt(0) > 31 && char.charCodeAt(0) !== 127) &&
    !/[<>:"/\\|?*]/.test(value) && !/[. ]$/.test(value) &&
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
    case 'write-close': return token(value.handle) && hash(value.sha256) &&
      (!Object.hasOwn(value, 'retainForPublication') || typeof value.retainForPublication === 'boolean')
    case 'replace': return token(value.handle) && components(value.parent, true) &&
      safeFilesystemComponent(value.name) && hash(value.sha256)
    case 'remove': return components(value.path) && (value.kind === 'file' || value.kind === 'directory') &&
      (!Object.hasOwn(value, 'expectedIdentity') || (typeof value.expectedIdentity === 'string' && /^[a-f0-9]{24}$/.test(value.expectedIdentity))) &&
      (!Object.hasOwn(value, 'emptyOnly') || (value.emptyOnly === true && value.kind === 'directory'))
    default: return false
  }
}
function validCommand(item: Record<string, unknown>, session: FilesystemSession, nextId: number, bound: boolean, nowMs: number): item is Record<string, unknown> & FilesystemCommand {
    if (typeof item.operation !== 'string' || !Object.hasOwn(operationKeys, item.operation)) return false
    const keys = [...envelopeKeys, ...operationKeys[item.operation]]
    if (item.operation === 'write-close' && Object.hasOwn(item, 'retainForPublication')) keys.push('retainForPublication')
    if (item.operation === 'remove') for (const key of ['expectedIdentity', 'emptyOnly']) if (Object.hasOwn(item, key)) keys.push(key)
    if (Object.keys(item).length !== keys.length || !keys.every(key => Object.hasOwn(item, key)) ||
      item.version !== 1 || item.session !== session.session || item.generation !== session.generation ||
      item.requestId !== nextId || !integer(item.requestId, 1, Number.MAX_SAFE_INTEGER) ||
      typeof item.deadlineMs !== 'number' || !Number.isFinite(item.deadlineMs) ||
      item.deadlineMs <= nowMs || item.deadlineMs > nowMs + MAX_OPERATION_MS ||
      (bound ? item.operation === 'bind' : item.operation !== 'bind') || !payload(item)) return false
  return true
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
    if (!validCommand(item, this.session, this.nextId, this.bound, nowMs)) return this.refuse()
    this.pending = item
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
