import type { VerifiedFilesystem } from './filesystem/factory'
import type { ValidationOptions } from './archive'
/** RED callable fixture: durable storage behavior is not implemented yet. */
export class CheckedStorage {
  constructor(readonly filesystem: VerifiedFilesystem) {}
  async putArchive(_bytes: Uint8Array, _sha256: string, _options: ValidationOptions, _intent: () => Promise<unknown>): Promise<unknown> { throw Error('S2A_NOT_IMPLEMENTED') }
}
