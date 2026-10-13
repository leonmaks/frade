import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { FilesystemCommandGate, safeFilesystemComponent } from './windows-protocol'
import { MAX_FRAME_BYTES, MAX_FILE_BYTES, MAX_CHUNK_BYTES, MAX_OPERATION_MS } from './types'
import type { CommandEnvelope, FilesystemCommand, FilesystemFailure } from './types'
type PayloadOf<T> = T extends CommandEnvelope ? Omit<T, keyof CommandEnvelope> : never
export type FilesystemPayload = PayloadOf<FilesystemCommand>
type Reply = Record<string, any>
interface Pending { sentAt: number; command: FilesystemCommand; resolve: (reply: Reply) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
export interface NativeTransportOptions { installationRoot: string; distributionDirectory: string; sourceSha256: string; generation: number }
export class FilesystemTransportError extends Error {
  constructor(readonly status: FilesystemFailure, code: string) { super(code); this.name = 'FilesystemTransportError' }
}
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const integer = (n: unknown, maximum = Number.MAX_SAFE_INTEGER): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= maximum
const exact = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
const token = (s: unknown) => typeof s === 'string' && /^[a-f0-9]{32}$/.test(s)
function payloadMatches(reply: Reply, command: FilesystemCommand): boolean {
  const base = ['version', 'requestId', 'session', 'generation', 'clockMs', 'status']
  if (reply.status !== 'ACK') return (reply.status === 'REFUSED' || reply.status === 'UNKNOWN') && exact(reply, [...base, 'code', 'errorType']) && typeof reply.code === 'string' && typeof reply.errorType === 'string'
  switch (command.operation) {
    case 'bind': case 'dispose': case 'mkdir': case 'remove': return exact(reply, base)
    case 'write-open': return exact(reply, [...base, 'handle']) && token(reply.handle)
    case 'write-chunk': return exact(reply, [...base, 'offset']) && reply.offset === command.offset + Buffer.from(command.data, 'base64').length
    case 'write-close': case 'replace': return exact(reply, [...base, 'sha256']) && reply.sha256 === command.sha256
    case 'read': {
      if (!exact(reply, [...base, 'data', 'bytes', 'size']) || typeof reply.data !== 'string' || !integer(reply.bytes, command.length) || !integer(reply.size, MAX_FILE_BYTES)) return false
      const bytes = Buffer.from(reply.data, 'base64')
      return bytes.length <= MAX_CHUNK_BYTES && bytes.length === reply.bytes && bytes.toString('base64') === reply.data && command.offset + reply.bytes <= reply.size
    }
    case 'list': return exact(reply, [...base, 'entries', 'cursor']) && Array.isArray(reply.entries) && reply.entries.length <= command.limit && (reply.cursor === null || token(reply.cursor)) && reply.entries.every((row: unknown) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return false
      const item = row as Reply
      return exact(item, ['name', 'kind', 'bytes', 'identity']) && safeFilesystemComponent(item.name) && (item.kind === 'file' || item.kind === 'directory') && integer(item.bytes, MAX_FILE_BYTES) && typeof item.identity === 'string' && /^[a-f0-9]{24}$/.test(item.identity)
    })
    case 'capabilities': {
      const caps = reply.capabilities
      return exact(reply, [...base, 'capabilities']) && caps && typeof caps === 'object' && !Array.isArray(caps) && exact(caps, ['protocol', 'platform', 'filesystem', 'runtimeProof', 'unconditionalPowerLoss']) && caps.protocol === 1 && caps.platform === 'windows-x64' && caps.filesystem === 'NTFS' && caps.runtimeProof === 'NOT_VERIFIED' && caps.unconditionalPowerLoss === 'NOT_PROVEN'
    }
  }
}
/** Host-only closed transport. Internal proof layer, not a verified installer factory. */
export class WindowsFilesystemTransport {
  private readonly child: ChildProcessWithoutNullStreams
  private readonly exit: Promise<number | null>
  private readonly session = randomUUID()
  private readonly gate: FilesystemCommandGate
  private nextId = 1
  private pending: Pending | null = null
  private disposal: Promise<void> | undefined
  private unusable = false
  private bytes = Buffer.alloc(0)
  private stderrBytes = 0
  private helperClock = 0
  private receivedAt = performance.now()
  private constructor(executable: string, private readonly options: NativeTransportOptions) {
    this.gate = new FilesystemCommandGate({ session: this.session, generation: options.generation })
    this.child = spawn(executable, [], { windowsHide: true, stdio: 'pipe', shell: false })
    this.exit = new Promise(resolve => this.child.once('close', code => {
      if (this.pending) this.fail('FILESYSTEM_HELPER_CLOSED')
      this.unusable = true; resolve(code)
    }))
    this.child.once('error', () => this.fail('FILESYSTEM_HELPER_UNAVAILABLE'))
    this.child.stdout.on('data', (chunk: Buffer) => this.reply(chunk))
    this.child.stderr.on('data', (chunk: Buffer) => { this.stderrBytes += chunk.length; if (this.stderrBytes > 4096) this.fail('FILESYSTEM_STDERR_LIMIT') })
    this.child.stdin.on('error', () => this.fail('FILESYSTEM_INPUT_CLOSED'))
  }
  static async connect(options: NativeTransportOptions): Promise<WindowsFilesystemTransport> {
    if (process.platform !== 'win32' || process.arch !== 'x64') throw new FilesystemTransportError('BACKEND_UNAVAILABLE', 'WINDOWS_BACKEND_UNAVAILABLE')
    if (!path.isAbsolute(options.installationRoot) || !path.isAbsolute(options.distributionDirectory) || !/^[a-f0-9]{64}$/.test(options.sourceSha256) || !Number.isSafeInteger(options.generation) || options.generation < 1) throw new FilesystemTransportError('BACKEND_UNAVAILABLE', 'INVALID_NATIVE_OPTIONS')
    const directory = path.resolve(options.distributionDirectory), executable = path.join(directory, 'frade-filesystem.exe'), metadataFile = path.join(directory, 'integrity.json')
    try {
      for (const file of [executable, metadataFile]) { const entry = await fs.lstat(file); if (!entry.isFile() || entry.isSymbolicLink() || entry.nlink !== 1) throw new FilesystemTransportError('BACKEND_UNAVAILABLE', 'NATIVE_BUILD_DRIFT') }
      const metadataBytes = await fs.readFile(metadataFile)
      if (metadataBytes.length > 16384) throw new FilesystemTransportError('BACKEND_UNAVAILABLE', 'NATIVE_BUILD_DRIFT')
      const metadata = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(metadataBytes)), executableBytes = await fs.readFile(executable)
      if (!metadata || metadata.schemaVersion !== 1 || metadata.protocol !== 1 || metadata.platform !== 'windows-x64' || metadata.source !== 'native/windows-filesystem.cs' || metadata.executable !== 'frade-filesystem.exe' || metadata.sourceSha256 !== options.sourceSha256 || metadata.executableSha256 !== sha(executableBytes) || metadata.executableBytes !== executableBytes.length || metadata.runtimeCapabilities !== 'NOT_VERIFIED' || metadata.publisherTrust !== 'NOT_ASSERTED') throw new FilesystemTransportError('BACKEND_UNAVAILABLE', 'NATIVE_BUILD_DRIFT')
      if (executableBytes.length < 256 || executableBytes.readUInt16LE(0) !== 0x5a4d) throw new FilesystemTransportError('BACKEND_UNAVAILABLE', 'NATIVE_BUILD_DRIFT')
      const pe = executableBytes.readUInt32LE(0x3c)
      if (pe + 24 > executableBytes.length || executableBytes.readUInt32LE(pe) !== 0x4550 || executableBytes.readUInt16LE(pe + 4) !== 0x8664) throw new FilesystemTransportError('BACKEND_UNAVAILABLE', 'NATIVE_BUILD_DRIFT')
    } catch (error) {
      if (error instanceof FilesystemTransportError) throw error
      throw new FilesystemTransportError('BACKEND_UNAVAILABLE', 'NATIVE_BUILD_UNAVAILABLE')
    }
    const transport = new WindowsFilesystemTransport(executable, { ...options })
    try { await transport.request({ operation: 'bind', root: options.installationRoot }); return transport }
    catch (error) { await transport.dispose(); throw error }
  }
  get closed(): boolean { return this.unusable }
  private fail(code: string) {
    const pending = this.pending
    this.pending = null; this.unusable = true; this.bytes = Buffer.alloc(0)
    if (pending) {
      clearTimeout(pending.timer); this.gate.complete(pending.command.requestId, false)
      pending.reject(new FilesystemTransportError(['read', 'list', 'capabilities', 'dispose'].includes(pending.command.operation) ? 'REFUSED' : 'UNKNOWN', code))
    }
    if (this.child.exitCode === null && this.child.signalCode === null) this.child.kill()
  }
  request(payload: FilesystemPayload): Promise<Reply> {
    if (this.unusable) return Promise.reject(new FilesystemTransportError('REFUSED', 'FILESYSTEM_SESSION_CLOSED'))
    if (this.pending) { this.fail('CONCURRENT_FILESYSTEM_COMMAND'); return Promise.reject(new FilesystemTransportError('REFUSED', 'CONCURRENT_FILESYSTEM_COMMAND')) }
    const now = this.nextId === 1 ? 0 : Math.floor(this.helperClock + Math.max(0, performance.now() - this.receivedAt))
    const command = { version: 1, session: this.session, generation: this.options.generation, requestId: this.nextId, deadlineMs: now + MAX_OPERATION_MS, ...payload }
    const frame = Buffer.from(JSON.stringify(command) + '\n')
    const accepted = this.gate.accept(frame, now)
    if (!accepted) { this.fail('INVALID_FILESYSTEM_COMMAND'); return Promise.reject(new FilesystemTransportError('REFUSED', 'INVALID_FILESYSTEM_COMMAND')) }
    return new Promise((resolve, reject) => {
      this.pending = { sentAt: performance.now(), command: accepted, resolve, reject, timer: setTimeout(() => this.fail('FILESYSTEM_TIMEOUT'), MAX_OPERATION_MS) }
      this.child.stdin.write(frame, error => { if (error) this.fail('FILESYSTEM_INPUT_CLOSED') })
    })
  }
  private reply(chunk: Buffer) {
    if (!this.pending || this.bytes.length + chunk.length > MAX_FRAME_BYTES) { this.fail('INVALID_FILESYSTEM_REPLY'); return }
    this.bytes = Buffer.concat([this.bytes, chunk])
    const newline = this.bytes.indexOf(10)
    if (newline < 0) return
    const pending = this.pending
    try {
      if (newline !== this.bytes.length - 1) throw Error('MULTIPLE_REPLY_FRAMES')
      const bodyEnd = newline > 0 && this.bytes[newline - 1] === 13 ? newline - 1 : newline
      const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(this.bytes.subarray(0, bodyEnd)), reply = JSON.parse(text)
      if (!reply || typeof reply !== 'object' || Array.isArray(reply) || JSON.stringify(reply) !== text || reply.version !== 1 || reply.requestId !== pending.command.requestId || reply.session !== this.session || reply.generation !== this.options.generation || !integer(reply.clockMs) || reply.clockMs < this.helperClock || reply.clockMs >= pending.command.deadlineMs || performance.now() - pending.sentAt > MAX_OPERATION_MS || !payloadMatches(reply, pending.command)) throw Error('INVALID_FILESYSTEM_REPLY')
      if (reply.status !== 'ACK') {
        this.pending = null; clearTimeout(pending.timer); this.gate.complete(pending.command.requestId, false); this.fail('FILESYSTEM_NATIVE_REFUSAL')
        pending.reject(new FilesystemTransportError(reply.status, reply.code)); return
      }
      if (!this.gate.complete(pending.command.requestId, true)) throw Error('INVALID_FILESYSTEM_COMPLETION')
      this.helperClock = reply.clockMs; this.receivedAt = performance.now(); this.nextId++
      this.bytes = Buffer.alloc(0); this.pending = null; clearTimeout(pending.timer)
      if (pending.command.operation === 'dispose') this.unusable = true
      pending.resolve(reply)
    } catch { this.fail('INVALID_FILESYSTEM_REPLY') }
  }
  dispose(): Promise<void> {
    return this.disposal ??= (async () => {
      let failure: unknown
      try {
        if (!this.unusable && !this.pending) await this.request({ operation: 'dispose' })
        else this.fail('FILESYSTEM_SESSION_CLOSED')
      } catch (error) { failure = error; this.fail('FILESYSTEM_SESSION_CLOSED') }
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        await Promise.race([this.exit, new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new FilesystemTransportError('UNKNOWN', 'FILESYSTEM_CLOSE_UNCONFIRMED')), MAX_OPERATION_MS)
        })])
      } finally { clearTimeout(timer) }
      if (failure) throw failure
    })()
  }
}
