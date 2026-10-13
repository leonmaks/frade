/** Host-only installation filesystem wire contract; never exposed to renderer. */
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
  | { operation: 'write-close'; handle: string; sha256: string; retainForPublication?: boolean }
  | { operation: 'replace'; handle: string; parent: string[]; name: string; sha256: string }
  | { operation: 'remove'; path: string[]; kind: 'file' | 'directory'; expectedIdentity?: string; emptyOnly?: true }
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
