import { readFile, readdir } from 'node:fs/promises'
import { builtinModules } from 'node:module'
import { resolve, relative, dirname, isAbsolute, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
const builtins = new Set(builtinModules.flatMap((name) => [name, 'node:' + name]))
const policies = {
  'packages/runtime-contracts/src': new Set(),
  'packages/metamodel-domain/src': new Set(),
  'packages/metamodel-compiler/src': new Set(['@frade/metamodel-domain']),
  'packages/runtime-node/src': new Set([
    '@frade/runtime-contracts',
    '@frade/draw/document',
    'saxes',
    '@frade/adapter-yaml',
    '@frade/adapter-sberea-yaml',
    '@frade/repository-domain',
    '@frade/repository-ports',
    '@frade/metamodel-config',
    '@frade/metamodel-domain',
    '@frade/repository-api',
    '@frade/repository-api/workbench',
    '@frade/repository-application',
    '@frade/local-index',
  ]),
  'packages/runtime-electron/src': new Set(['@frade/runtime-contracts']),
  'apps/desktop/src/renderer': new Set([
    'react',
    'react-dom/client',
    '@frade/draw',
    '@frade/draw/styles.css',
    '@frade/ui-workspace',
    '@frade/ui-workspace/styles.css',
    '@frade/repository-api/workbench',
    '@frade/runtime-contracts',
  ]),
}
function allowed(file, specifier, scope, imports) {
  if (specifier.startsWith('.')) {
    const target = relative(resolve(scope), resolve(dirname(file), specifier))
    return target !== '..' && !target.startsWith('..' + sep) && !isAbsolute(target)
  }
  if (scope.replaceAll('\\', '/').endsWith('runtime-node/src') && builtins.has(specifier))
    return true
  return imports.has(specifier)
}
async function sources(root) {
  const entries = await readdir(root, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((e) =>
      e.isDirectory()
        ? sources(resolve(root, e.name))
        : /\.(ts|tsx)$/.test(e.name)
          ? [resolve(root, e.name)]
          : [],
    ),
  )
  return nested.flat()
}
export function inspectRuntimeSource(file, content, scope, imports) {
  const violations = []
  const pattern = /(?:\bfrom\s+|\bimport(?:\s+|\s*\(\s*)|\brequire\s*\(\s*)['"]([^'"]+)['"]/g
  for (const match of content.matchAll(pattern))
    if (!allowed(file, match[1], scope, new Set(imports)))
      violations.push(file + ': forbidden import ' + match[1])
  return violations
}
export async function checkRuntimeBoundaries(root) {
  const violations = []
  for (const [scope, imports] of Object.entries(policies)) {
    const absolute = resolve(root, scope)
    for (const file of await sources(absolute))
      violations.push(
        ...(scope === 'packages/metamodel-domain/src'
          ? inspectMetamodelSource(file, await readFile(file, 'utf8'), absolute)
          : scope === 'packages/metamodel-compiler/src'
            ? inspectCompilerSource(file, await readFile(file, 'utf8'), absolute)
            : inspectRuntimeSource(file, await readFile(file, 'utf8'), absolute, imports)),
      )
  }
  const manifest = JSON.parse(
    await readFile(resolve(root, 'packages/metamodel-domain/package.json'), 'utf8'),
  )
  violations.push(...metamodelManifestViolations(manifest))
  const compilerManifest = JSON.parse(
    await readFile(resolve(root, 'packages/metamodel-compiler/package.json'), 'utf8'),
  )
  violations.push(...compilerManifestViolations(compilerManifest))
  return violations
}
export function inspectMetamodelSource(file, content, scope) {
  const violations = inspectRuntimeSource(file, content, scope, [])
  if (/\b(?:eval|Function|require)\s*\(|\bimport\s*\(/.test(content))
    violations.push(file + ': dynamic execution or loading is forbidden')
  return violations
}
export function metamodelManifestViolations(manifest) {
  return ['dependencies', 'optionalDependencies', 'peerDependencies'].flatMap((field) =>
    Object.keys(manifest[field] ?? {}).map(
      (name) => 'packages/metamodel-domain/package.json: forbidden ' + field + ' ' + name,
    ),
  )
}
export function inspectCompilerSource(file, content, scope) {
  const violations = inspectRuntimeSource(file, content, scope, ['@frade/metamodel-domain'])
  if (/\b(?:eval|Function|require)\s*\(|\bimport\s*\(/.test(content))
    violations.push(file + ': dynamic execution or loading is forbidden')
  return violations
}
export function compilerManifestViolations(manifest) {
  return ['dependencies', 'optionalDependencies', 'peerDependencies'].flatMap((field) =>
    Object.keys(manifest[field] ?? {})
      .filter((name) => field !== 'dependencies' || name !== '@frade/metamodel-domain')
      .map((name) => 'packages/metamodel-compiler/package.json: forbidden ' + field + ' ' + name),
  )
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = await checkRuntimeBoundaries(
    resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  )
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else console.log('Runtime architecture boundaries: PASS')
}
