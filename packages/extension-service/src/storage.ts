import { createHash } from 'node:crypto'
import { validatePackage, ARCHIVE_LIMITS } from './archive'
import type { ValidationOptions, PackageValidation } from './archive'
import type { VerifiedFilesystem } from './filesystem/factory'
import type { FilesystemPayload } from './filesystem/windows'
import { safeFilesystemComponent } from './filesystem/windows-protocol'
import { MAX_CHUNK_BYTES } from './filesystem/types'
import type { JournalScan } from './journal'
export const digest = (bytes: Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex')
export interface CheckedEntry {
  name: string
  kind: 'file' | 'directory'
  bytes: number
  identity: string
}
const budgets = new WeakMap<VerifiedFilesystem, { creations: number }>()
/** A factory proof consumes exactly two native file creations. All adapters share its live budget. */
export class CheckedFiles {
  constructor(readonly filesystem: VerifiedFilesystem) {
    if (!budgets.has(filesystem)) budgets.set(filesystem, { creations: 2 })
  }
  reserveCreations(count: number): void {
    if (
      !Number.isSafeInteger(count) ||
      count < 0 ||
      budgets.get(this.filesystem)!.creations + count > 10000
    )
      throw Error('NATIVE_CREATION_CAPACITY')
  }
  async ask(payload: FilesystemPayload): Promise<Record<string, any>> {
    if (this.filesystem.state !== 'VERIFIED') throw Error('CHECKED_CONTEXT_CLOSED')
    const r = await this.filesystem.request(payload)
    if (r.status !== 'ACK' || this.filesystem.state !== 'VERIFIED')
      throw Error('CHECKED_ACK_REQUIRED')
    return r
  }
  async list(path: string[]): Promise<CheckedEntry[]> {
    this.path(path)
    const rows: CheckedEntry[] = [],
      cursors = new Set<string>()
    let cursor: string | null = null
    do {
      const r = await this.ask({ operation: 'list', path, limit: 128, cursor })
      if (
        !Array.isArray(r.entries) ||
        r.entries.length > 128 ||
        (r.cursor !== null &&
          (typeof r.cursor !== 'string' ||
            !/^[a-f0-9]{32}$/.test(r.cursor) ||
            cursors.has(r.cursor)))
      )
        throw Error('CHECKED_LIST_INVALID')
      for (const e of r.entries) {
        if (
          !e ||
          !safeFilesystemComponent(e.name) ||
          !['file', 'directory'].includes(e.kind) ||
          !Number.isSafeInteger(e.bytes) ||
          e.bytes < 0 ||
          !/^[a-f0-9]{24}$/.test(e.identity) ||
          rows.some((old) => old.name.toLowerCase() === e.name.toLowerCase())
        )
          throw Error('CHECKED_LIST_INVALID')
        rows.push({ ...e })
      }
      if (rows.length > 10000) throw Error('CHECKED_LIST_LIMIT')
      cursor = r.cursor
      if (cursor) cursors.add(cursor)
    } while (cursor !== null)
    return rows
  }
  private path(path: string[]): void {
    if (path.length > 32 || path.some((p) => !safeFilesystemComponent(p)))
      throw Error('CHECKED_PATH_INVALID')
  }
  async directory(path: string[]): Promise<void> {
    this.path(path)
    for (let i = 1; i <= path.length; i++) {
      const p = path.slice(0, i),
        e = (await this.list(p.slice(0, -1))).find(
          (e) => e.name.toLowerCase() === p.at(-1)!.toLowerCase(),
        )
      if (e) {
        if (e.kind !== 'directory' || e.name !== p.at(-1)) throw Error('CHECKED_DIRECTORY_INVALID')
      } else await this.ask({ operation: 'mkdir', path: p })
    }
  }
  async read(
    path: string[],
    maximum: number,
    expected?: CheckedEntry,
    verifyInventory = true,
  ): Promise<Buffer> {
    this.path(path)
    const e = expected ?? (await this.list(path.slice(0, -1))).find((e) => e.name === path.at(-1))
    if (!e || e.kind !== 'file' || e.bytes > maximum) throw Error('CHECKED_READ_BOUND')
    const chunks: Buffer[] = []
    let offset = 0
    do {
      const r = await this.ask({
          operation: 'read',
          path,
          offset,
          length: Math.min(MAX_CHUNK_BYTES, Math.max(1, e.bytes - offset)),
        }),
        b = typeof r.data === 'string' ? Buffer.from(r.data, 'base64') : Buffer.alloc(0)
      if (
        r.size !== e.bytes ||
        r.bytes !== b.length ||
        b.toString('base64') !== r.data ||
        b.length > MAX_CHUNK_BYTES ||
        offset + b.length > e.bytes ||
        (b.length === 0 && offset < e.bytes)
      )
        throw Error('CHECKED_READ_CHANGED')
      chunks.push(b)
      offset += b.length
    } while (offset < e.bytes)
    if (verifyInventory) {
      const now = (await this.list(path.slice(0, -1))).find((r) => r.name === e.name)
      if (!now || now.identity !== e.identity || now.bytes !== e.bytes || now.kind !== 'file')
        throw Error('CHECKED_READ_CHANGED')
    }
    return Buffer.concat(chunks, offset)
  }
  async write(path: string[], bytes: Buffer, publicationName?: string): Promise<void> {
    this.path(path)
    if (bytes.length > 200 * 1024 * 1024) throw Error('CHECKED_WRITE_BOUND')
    if (publicationName && !safeFilesystemComponent(publicationName))
      throw Error('CHECKED_PATH_INVALID')
    this.reserveCreations(1)
    budgets.get(this.filesystem)!.creations++
    const opened = await this.ask({ operation: 'write-open', path, maxBytes: bytes.length }),
      sha256 = digest(bytes)
    for (let offset = 0; offset < bytes.length; offset += MAX_CHUNK_BYTES)
      await this.ask({
        operation: 'write-chunk',
        handle: opened.handle,
        offset,
        data: bytes.subarray(offset, offset + MAX_CHUNK_BYTES).toString('base64'),
      })
    const original = (await this.list(path.slice(0, -1))).find((e) => e.name === path.at(-1))
    if (!original || original.kind !== 'file' || original.bytes !== bytes.length)
      throw Error('CHECKED_WRITE_IDENTITY')
    const closed = await this.ask({
      operation: 'write-close',
      handle: opened.handle,
      sha256,
      retainForPublication: !!publicationName,
    })
    if (closed.sha256 !== sha256) throw Error('CHECKED_WRITE_HASH')
    if (publicationName) {
      const published = await this.ask({
        operation: 'replace',
        handle: opened.handle,
        parent: path.slice(0, -1),
        name: publicationName,
        sha256,
      })
      if (published.sha256 !== sha256) throw Error('CHECKED_WRITE_HASH')
    }
    const final = [...path.slice(0, -1), publicationName ?? path.at(-1)!],
      e = (await this.list(final.slice(0, -1))).find((e) => e.name === final.at(-1))
    if (
      !e ||
      e.identity !== original.identity ||
      e.bytes !== bytes.length ||
      digest(await this.read(final, bytes.length, e)) !== sha256
    )
      throw Error('CHECKED_WRITE_READBACK')
  }
}
/** Host-only immutable native archive storage. Never registers or selects a theme. */
export class CheckedStorage {
  private readonly files: CheckedFiles
  constructor(filesystem: VerifiedFilesystem) {
    this.files = new CheckedFiles(filesystem)
  }
  async putArchive(
    source: Uint8Array,
    sha256: string,
    options: ValidationOptions,
    intent: () => Promise<JournalScan>,
  ): Promise<Extract<PackageValidation, { status: 'VALID' }>> {
    if (source.byteLength > ARCHIVE_LIMITS.compressed) throw Error('ARCHIVE_LIMIT')
    // Detach synchronously before the first await: never re-open a chosen external path.
    const bytes = Buffer.from(source)
    if (!/^[a-f0-9]{64}$/.test(sha256) || digest(bytes) !== sha256) throw Error('ARCHIVE_HASH')
    const validation = await validatePackage(bytes, options)
    if (validation.status !== 'VALID') throw Error(validation.diagnostic.code)
    const scan = await intent(),
      active = scan.active
    if (
      !active ||
      active.lastPhase !== 'STAGING' ||
      active.recovery ||
      !active.plan.versions.includes(sha256) ||
      !active.plan.newRegistry.entries.some((e) => e.archiveSha256 === sha256)
    )
      throw Error('STAGING_REQUIRED')
    const path = ['versions', sha256, 'archive.frade-extension'],
      root = await this.files.list([]),
      versions = root.find((e) => e.name === 'versions')
    if (versions && versions.kind !== 'directory') throw Error('ARCHIVE_INVENTORY')
    const version = versions
      ? (await this.files.list(['versions'])).find((e) => e.name === sha256)
      : undefined
    if (version) {
      if (version.kind !== 'directory') throw Error('ARCHIVE_INVENTORY')
      const inventory = await this.files.list(path.slice(0, -1))
      if (
        inventory.length !== 1 ||
        inventory[0].name !== path.at(-1) ||
        inventory[0].kind !== 'file'
      )
        throw Error('ARCHIVE_INVENTORY')
      const existing = await this.files.read(path, ARCHIVE_LIMITS.compressed, inventory[0])
      if (digest(existing) !== sha256 || !existing.equals(bytes)) throw Error('ARCHIVE_CORRUPT')
      const validated = await validatePackage(existing, options)
      if (validated.status !== 'VALID') throw Error('ARCHIVE_CORRUPT')
      return validated
    }
    await this.files.directory(path.slice(0, -1))
    await this.files.write(path, bytes)
    const stored = await this.files.read(path, ARCHIVE_LIMITS.compressed)
    if (digest(stored) !== sha256) throw Error('ARCHIVE_CORRUPT')
    const validated = await validatePackage(stored, options)
    if (validated.status !== 'VALID') throw Error('ARCHIVE_CORRUPT')
    return validated
  }
}
