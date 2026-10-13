import type { VerifiedFilesystem } from './filesystem/factory'
export function canonical(value: unknown): Buffer { return Buffer.from(JSON.stringify(value)) }
export function reserveEnvelope(_slots: number, _bytes: number, _remainingSlots = 0, _remainingBytes = 0): unknown { return undefined }
/** RED callable fixture, not an installer. */
export class InstallerJournal {
  constructor(readonly filesystem: VerifiedFilesystem, readonly generation: number) {}
  async scan(): Promise<any> { return { records: [], pending: [], usedSlots: 0, usedBytes: 0, remainingSlots: 0, remainingBytes: 0, active: null, authority: null, consumedRevision: 0 } }
  async begin(_transaction: string, _plan: unknown): Promise<any> { throw Error('S2A_NOT_IMPLEMENTED') }
  async phase(_transaction: string, _phase: string): Promise<any> { throw Error('S2A_NOT_IMPLEMENTED') }
  async recoveryPlan(_transaction: string, _recovery: unknown): Promise<any> { throw Error('S2A_NOT_IMPLEMENTED') }
  async disposition(_transaction: string, _outcome: unknown): Promise<any> { throw Error('S2A_NOT_IMPLEMENTED') }
}
