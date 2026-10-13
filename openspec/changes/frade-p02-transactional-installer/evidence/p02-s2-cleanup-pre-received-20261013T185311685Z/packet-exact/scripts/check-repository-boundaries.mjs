import { readFile, readdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inspectRuntimeSource } from './check-runtime-boundaries.mjs'
export const repositoryPolicies = {
  'repository-domain': ['@frade/metamodel-domain', '@frade/metamodel-compiler'],
  'repository-ports': ['@frade/repository-domain'],
  'repository-application': [
    '@frade/repository-domain',
    '@frade/repository-ports',
    '@frade/metamodel-domain',
    '@frade/metamodel-compiler',
  ],
  'repository-bridge': ['@frade/repository-domain', '@frade/repository-ports'],
}
export function inspectRepositorySource(file, content, scope, allowed) {
  const errors = inspectRuntimeSource(file, content, scope, allowed)
  if (/\b(?:eval|Function|require)\s*\(|\bimport\s*\(/.test(content))
    errors.push(file + ': dynamic execution or loading')
  if (
    /\b(?:document|window|navigator|localStorage|sessionStorage)\s*\.|\b(?:HTMLElement|HTMLCanvasElement|Document|Window)\b/.test(
      content,
    )
  )
    errors.push(file + ': DOM dependency in portable repository package')
  if (scope.replaceAll('\\', '/').endsWith('repository-domain/src')) {
    for (const match of content.matchAll(
      /import\s+([^;]*?)\s+from\s+['"]@frade\/metamodel-compiler['"]/g,
    ))
      if (!match[1].trimStart().startsWith('type '))
        errors.push(file + ': compiler import must be type-only')
  }
  return errors
}
export function repositoryManifestViolations(name, manifest) {
  const allowed = repositoryPolicies[name] ?? []
  return ['dependencies', 'optionalDependencies', 'peerDependencies'].flatMap((field) =>
    Object.keys(manifest[field] ?? {})
      .filter((dep) => !allowed.includes(dep))
      .map((dep) => name + ': forbidden ' + field + ' ' + dep),
  )
}
async function files(root) {
  const entries = await readdir(root, { withFileTypes: true })
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(resolve(root, entry.name))
          : /\.[cm]?[jt]sx?$/.test(entry.name)
            ? [resolve(root, entry.name)]
            : [],
      ),
    )
  ).flat()
}
export async function checkRepositoryBoundaries(root) {
  const errors = []
  for (const [name, allowed] of Object.entries(repositoryPolicies)) {
    const scope = resolve(root, 'packages', name, 'src')
    for (const file of await files(scope))
      errors.push(...inspectRepositorySource(file, await readFile(file, 'utf8'), scope, allowed))
    errors.push(
      ...repositoryManifestViolations(
        name,
        JSON.parse(await readFile(resolve(scope, '../package.json'), 'utf8')),
      ),
    )
  }
  const protocol = resolve(root, 'packages/repository-api/src/protocol.ts')
  errors.push(
    ...inspectRepositorySource(protocol, await readFile(protocol, 'utf8'), dirname(protocol), [
      '@frade/repository-domain',
    ]),
  )
  return errors
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = await checkRepositoryBoundaries(
    resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  )
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else console.log('Repository architecture boundaries: PASS')
}
