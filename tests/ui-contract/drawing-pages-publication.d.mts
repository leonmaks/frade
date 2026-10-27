export type PublicationInput = {
  file: string
  sha256: string
  canonicalSha256: string
  checkoutSha256: string
}
export function verifyPublicationInput(input: PublicationInput, bytes: Buffer): void
export function readDrawingPagesPublication(root: string): {
  name: 'clean' | 'working'
  manifest: { currentInputs: PublicationInput[] }
  read: (file: string) => Buffer
}
