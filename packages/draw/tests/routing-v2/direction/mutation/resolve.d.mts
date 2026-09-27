export function directionModuleAlias(source: string, mutantRoot: string): string | null
export function directionResolvePlugin(mutantRoot: string): {
  name: string
  enforce: 'pre'
  resolveId(source: string, importer?: string): string | null
}
