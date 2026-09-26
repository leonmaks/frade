export function createFlowFixture(): Promise<{
  destination: string
  dataRoot: string
  metadataRoot: string
  flows: Record<string, any>
  readFlows(): Promise<Record<string, any>>
}>
