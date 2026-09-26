import { readFile, readdir, access } from 'node:fs/promises'
import { builtinModules } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inspectRuntimeSource } from './check-runtime-boundaries.mjs'

export const workbenchPolicies = {
  'adapter-sberea-yaml': [
    '@frade/metamodel-config',
    '@frade/metamodel-domain',
    '@frade/metamodel-compiler',
    '@frade/repository-domain',
    '@frade/repository-ports',
    'yaml',
  ],
  'metamodel-config': ['@frade/metamodel-domain', '@frade/metamodel-compiler'],
  'ui-navigator': ['@frade/repository-api', '@frade/repository-domain', 'react'],
  'ui-inspector': [
    '@frade/repository-api',
    '@frade/repository-domain',
    '@frade/metamodel-domain',
    'react',
  ],
  'ui-workspace': [
    '@frade/repository-api',
    '@frade/repository-domain',
    '@frade/ui-navigator',
    '@frade/ui-inspector',
    '@frade/draw',
    'react-dom',
    'react',
  ],
}
export function inspectWorkbenchSource(file, text, scope, name) {
  const allowed = [...workbenchPolicies[name]]
  if (name === 'adapter-sberea-yaml')
    allowed.push(...builtinModules.flatMap((n) => [n, 'node:' + n]))
  if (name.startsWith('ui-'))
    allowed.push(
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@frade/repository-api/workbench',
      '@frade/repository-api/protocol',
    )
  const errors = inspectRuntimeSource(file, text, scope, allowed)
  if (/\b(?:eval|Function)\s*\(|\bimport\s*\(\s*[^'"\s]/.test(text))
    errors.push(file + ': dynamic execution or loading')
  if (
    name === 'metamodel-config' &&
    /\b(?:document|window|navigator|localStorage|sessionStorage)\s*\.|\b(?:HTMLElement|HTMLCanvasElement|Document|Window)\b/.test(
      text,
    )
  )
    errors.push(file + ': DOM dependency in portable metadata package')
  return errors
}
export function workbenchManifestViolations(name, manifest) {
  return ['dependencies', 'optionalDependencies', 'peerDependencies'].flatMap((field) =>
    Object.keys(manifest[field] ?? {})
      .filter((dep) => !workbenchPolicies[name].includes(dep))
      .map((dep) => name + ': forbidden ' + field + ' ' + dep),
  )
}
async function sources(root) {
  return (
    await Promise.all(
      (await readdir(root, { withFileTypes: true })).map((entry) =>
        entry.isDirectory()
          ? sources(resolve(root, entry.name))
          : /\.[cm]?[jt]sx?$/.test(entry.name)
            ? [resolve(root, entry.name)]
            : [],
      ),
    )
  ).flat()
}
export async function checkWorkbenchBoundaries(root) {
  const errors = []
  for (const name of Object.keys(workbenchPolicies)) {
    const packageRoot = resolve(root, 'packages', name),
      scope = resolve(packageRoot, 'src')
    const manifest = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'))
    errors.push(...workbenchManifestViolations(name, manifest))
    for (const file of await sources(scope))
      errors.push(...inspectWorkbenchSource(file, await readFile(file, 'utf8'), scope, name))
    for (const [name, target] of Object.entries(manifest.exports ?? {})) {
      if (typeof target !== 'string') {
        errors.push(packageRoot + ': unsupported export ' + name)
        continue
      }
      try {
        await access(resolve(packageRoot, target))
      } catch {
        errors.push(packageRoot + ': missing export ' + name)
      }
    }
  }
  return errors
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = await checkWorkbenchBoundaries(
    resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  )
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else console.log('Workbench architecture boundaries: PASS')
}
