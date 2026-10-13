import { createHash } from 'node:crypto'
import type { VerifiedFilesystem } from '../src/filesystem/factory'
import type { FilesystemPayload } from '../src/filesystem/windows'
export const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
export const tx = '11111111-1111-4111-8111-111111111111'
export const tx2 = '22222222-2222-4222-8222-222222222222'
export const uuid = '33333333-3333-4333-8333-333333333333'
export function selection(mode: 'light' | 'dark' = 'light') {
  return {
    mode,
    density: 'compact' as const,
    preferred: {
      light: 'frade.builtin/light',
      dark: 'frade.builtin/dark',
      'high-contrast': 'frade.builtin/high-contrast',
    },
  }
}
export function record(revision = 9, mode: 'light' | 'dark' = 'light') {
  return {
    version: 1 as const,
    revision,
    generation: revision,
    transactionId: 'window/intent-' + revision,
    selection: selection(mode),
  }
}
export function plan(archiveSha256 = 'a'.repeat(64)) {
  return {
    oldRegistry: { revision: 0, entries: [] },
    newRegistry: {
      revision: 1,
      entries: [
        {
          id: 'frade.workshop-themes',
          version: '1.0.0',
          archiveSha256,
          enabled: true,
          previousSha256: null,
        },
      ],
    },
    oldPresentation: record(),
    newPresentation: record(12, 'dark'),
    versions: [archiveSha256],
    cleanup: [],
    consumedRevision: 12,
    envelope: { slots: 8, bytes: 8388608, maxRecordBytes: 1048576 },
  }
}
/** Deterministic checked-port fixture, separate from mandatory actual NTFS evidence. */
export class MemoryFilesystem implements VerifiedFilesystem {
  state: 'VERIFIED' | 'CLOSED' = 'VERIFIED'
  readonly capabilities = {
    protocol: 1 as const,
    platform: 'windows-x64' as const,
    filesystem: 'NTFS' as const,
    checkedParents: true as const,
    exclusiveWrites: true as const,
    sameParentPublication: true as const,
    writeThroughFlush: true as const,
    unconditionalPowerLoss: 'NOT_PROVEN' as const,
  }
  readonly rootEntries = []
  files = new Map<string, Buffer>([['.coordinator.lock', Buffer.alloc(0)]])
  dirs = new Set([''])
  identities = new Map<string, string>()
  calls: FilesystemPayload[] = []
  handles = new Map<
    string,
    { path: string; maxBytes: number; closed: boolean; retained: boolean }
  >()
  fail: 'replace-before' | 'replace-after' | 'read' | null = null
  serial = 0
  identity(path: string) {
    if (!this.identities.has(path))
      this.identities.set(path, (++this.serial).toString(16).padStart(24, '0'))
    return this.identities.get(path)!
  }
  seed(path: string, bytes: Buffer) {
    const parts = path.split('/')
    parts.pop()
    let dir = ''
    for (const p of parts) {
      dir = dir ? dir + '/' + p : p
      this.dirs.add(dir)
    }
    this.files.set(path, Buffer.from(bytes))
    this.identity(path)
  }
  async request(p: FilesystemPayload): Promise<Record<string, any>> {
    this.calls.push(structuredClone(p))
    if (this.state === 'CLOSED') throw Error('FIXTURE_CLOSED')
    const ack = (extra: object = {}) => ({ status: 'ACK', ...extra })
    if (p.operation === 'list') {
      const path = p.path.join('/')
      if (!this.dirs.has(path)) throw Error('MISSING_DIRECTORY')
      const prefix = path ? path + '/' : ''
      const names = [...this.dirs, ...this.files.keys()]
        .filter((n) => n.startsWith(prefix) && n !== path && !n.slice(prefix.length).includes('/'))
        .sort()
      const offset = p.cursor ? Number.parseInt(p.cursor, 16) : 0
      const rows = names
        .slice(offset, offset + p.limit)
        .map((n) => ({
          name: n.slice(prefix.length),
          kind: this.dirs.has(n) ? 'directory' : 'file',
          bytes: this.files.get(n)?.length ?? 0,
          identity: this.identity(n),
        }))
      const next = offset + rows.length
      return ack({
        entries: rows,
        cursor: next < names.length ? next.toString(16).padStart(32, '0') : null,
      })
    }
    if (p.operation === 'mkdir') {
      const path = p.path.join('/')
      if (this.files.has(path)) throw Error('WRONG_TYPE')
      this.dirs.add(path)
      return ack()
    }
    if (p.operation === 'write-open') {
      const path = p.path.join('/'),
        parent = p.path.slice(0, -1).join('/')
      if (!this.dirs.has(parent) || this.files.has(path) || this.dirs.has(path))
        throw Error('EXCLUSIVE_REFUSED')
      this.files.set(path, Buffer.alloc(0))
      this.identity(path)
      const handle = (++this.serial).toString(16).padStart(32, '0')
      this.handles.set(handle, { path, maxBytes: p.maxBytes, closed: false, retained: false })
      return ack({ handle })
    }
    if (p.operation === 'write-chunk') {
      const h = this.handles.get(p.handle)
      if (!h || h.closed) throw Error('INVALID_HANDLE')
      const prior = this.files.get(h.path)!,
        data = Buffer.from(p.data, 'base64')
      if (p.offset !== prior.length || prior.length + data.length > h.maxBytes) throw Error('BOUND')
      this.files.set(h.path, Buffer.concat([prior, data]))
      return ack({ offset: prior.length + data.length })
    }
    if (p.operation === 'write-close') {
      const h = this.handles.get(p.handle)
      if (!h || hash(this.files.get(h.path)!) !== p.sha256) throw Error('HASH')
      h.closed = true
      h.retained = p.retainForPublication !== false
      return ack({ sha256: p.sha256 })
    }
    if (p.operation === 'replace') {
      const h = this.handles.get(p.handle),
        target = [...p.parent, p.name].join('/')
      if (
        !h ||
        !h.closed ||
        !h.retained ||
        h.path.split('/').slice(0, -1).join('/') !== p.parent.join('/') ||
        this.files.has(target) ||
        this.dirs.has(target)
      )
        throw Error('PUBLICATION_REFUSED')
      if (this.fail === 'replace-before') {
        this.state = 'CLOSED'
        throw Error('UNKNOWN_BEFORE')
      }
      const data = this.files.get(h.path)!
      this.files.delete(h.path)
      this.files.set(target, data)
      this.identities.set(target, this.identity(h.path))
      this.identities.delete(h.path)
      h.path = target
      if (this.fail === 'replace-after') {
        this.state = 'CLOSED'
        throw Error('UNKNOWN_AFTER')
      }
      return ack({ sha256: p.sha256 })
    }
    if (p.operation === 'read') {
      if (this.fail === 'read') throw Error('READ_REFUSED')
      const data = this.files.get(p.path.join('/'))
      if (!data) throw Error('MISSING_FILE')
      const chunk = data.subarray(p.offset, p.offset + p.length)
      return ack({ data: chunk.toString('base64'), bytes: chunk.length, size: data.length })
    }
    if (p.operation === 'remove') {
      const path = p.path.join('/')
      if (p.expectedIdentity && this.identity(path) !== p.expectedIdentity) throw Error('IDENTITY')
      if (p.kind === 'file') this.files.delete(path)
      else {
        if ([...this.files.keys(), ...this.dirs].some((n) => n.startsWith(path + '/')))
          throw Error('NOT_EMPTY')
        this.dirs.delete(path)
      }
      return ack()
    }
    throw Error('UNEXPECTED_OPERATION')
  }
  async dispose() {
    this.state = 'CLOSED'
  }
}
