export interface FixtureManifest {
  createdAt: string
  files: { path: string; sha256: string; bytes: number }[]
  counts: Record<string, number>
  objects: number
  sourceBytes: number
}
export function createKaFixture(options?: {
  dataRoot?: string
  metaRoot?: string
  destination?: string
}): Promise<{
  destination: string
  dataRoot: string
  metadataRoot: string
  manifest: FixtureManifest
}>
