import path from 'node:path'

export function directionModuleAlias(source, mutantRoot) {
  const normalized = source.replaceAll('\\', '/')
  if (
    !mutantRoot ||
    !(
      normalized === 'src/routing/orthogonal/direction' ||
      normalized.endsWith('/src/routing/orthogonal/direction')
    )
  ) {
    return null
  }
  return path.resolve(mutantRoot, 'index.ts')
}

export function directionResolvePlugin(mutantRoot) {
  return {
    name: 'r03-direction-mutant-source',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer?.replaceAll('\\', '/').includes('/tests/routing-v2/direction/')) return null
      return directionModuleAlias(source, mutantRoot) ?? null
    },
  }
}
