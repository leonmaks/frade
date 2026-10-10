import type { FilesystemCommand, FilesystemSession } from './types'
/** Fail-closed TDD contract shell; no native process or filesystem effect. */
export class FilesystemCommandGate {
  constructor(_session: FilesystemSession) {}
  get closed(): boolean { return true }
  accept(_frame: Uint8Array, _nowMs: number): FilesystemCommand | null { return null }
  complete(_requestId: number, _success: boolean): boolean { return false }
}
