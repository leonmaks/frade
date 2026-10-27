import type { Buffer } from 'node:buffer'
export function canonicalPublicationBytes(bytes: Buffer): Buffer
export function publicationByteForms(bytes: Buffer): {
  sha256: string
  canonicalSha256: string
  checkoutSha256: string
}
