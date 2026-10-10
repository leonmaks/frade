import fs from 'node:fs/promises'
import { join } from 'node:path'
import { createVerifiedFilesystem, NATIVE_FILESYSTEM_SOURCE_SHA256 } from '@frade/extension-service'
import type { VerifiedFilesystem } from '@frade/extension-service'

interface Ports {
  open?: typeof createVerifiedFilesystem
  rootAbsent?: (root: string) => Promise<boolean>
}
type Readiness = Readonly<{ state: 'BACKEND_VERIFIED'; installer: 'NOT_IMPLEMENTED' } | { state: 'UNAVAILABLE'; code: string }>
/** Read-only absence diagnostic, never a filesystem backend or write authorization. */
async function rootAbsent(root: string) {
  try { await fs.lstat(root); return false } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return true
    throw error
  }
}
/** Main-only S1 owner. Installed or ambiguous state remains blocked until the P02 coordinator exists. */
export class ExtensionInstallerHost {
  private initializing: Promise<Readiness> | undefined
  private disposing: Promise<void> | undefined
  private closing = false
  private generation = 1
  private context: VerifiedFilesystem | undefined
  private contextDisposal: Promise<void> | undefined
  constructor(private readonly userData: string, private readonly distributionDirectory: string, private readonly ports: Ports = {}) {}
  initialize(): Promise<Readiness> {
    if (this.closing) return Promise.reject(Error('EXTENSION_HOST_CLOSED'))
    return this.initializing ??= this.open()
  }
  private async open(): Promise<Readiness> {
    const generation = this.generation, installationRoot = join(this.userData, 'extensions')
    try {
      const context = await (this.ports.open ?? createVerifiedFilesystem)({ installationRoot, distributionDirectory: this.distributionDirectory, sourceSha256: NATIVE_FILESYSTEM_SOURCE_SHA256, generation })
      this.context = context
      if (this.closing || generation !== this.generation) { await this.closeContext(); throw Error('EXTENSION_HOST_CLOSED') }
      if (context.state !== 'VERIFIED' || context.rootEntries.some(entry => entry.name !== '.coordinator.lock')) {
        await this.closeContext(); throw Error('EXTENSION_RECOVERY_REQUIRED')
      }
      return Object.freeze({ state: 'BACKEND_VERIFIED', installer: 'NOT_IMPLEMENTED' })
    } catch (error) {
      if (this.closing || generation !== this.generation) throw error
      // Only a pre-effect typed unavailable backend + absent root permits built-ins.
      // A present/unsafe/unreadable root or possible-effect UNKNOWN never falls back.
      if (error instanceof Error && Reflect.get(error, 'status') === 'BACKEND_UNAVAILABLE' && await (this.ports.rootAbsent ?? rootAbsent)(installationRoot))
        return Object.freeze({ state: 'UNAVAILABLE', code: error.message })
      throw error
    }
  }
  private closeContext(): Promise<void> {
    return this.context ? this.contextDisposal ??= this.context.dispose() : Promise.resolve()
  }
  dispose(): Promise<void> {
    if (this.disposing) return this.disposing
    this.closing = true; this.generation++
    return this.disposing = (async () => {
      if (this.initializing) { try { await this.initializing } catch (error) {
        if (!this.context && error instanceof Error && error.message === 'FILESYSTEM_CLOSE_UNCONFIRMED') throw error
      } }
      await this.closeContext()
    })()
  }
}
