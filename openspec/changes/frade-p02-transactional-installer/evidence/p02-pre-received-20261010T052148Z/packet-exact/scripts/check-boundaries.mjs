import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const forbiddenPackages = [
  /^electron(?:\/|$)/,
  /^better-sqlite3(?:\/|$)/,
  /^kysely(?:\/|$)/,
  /^simple-git(?:\/|$)/,
  /^isomorphic-git(?:\/|$)/,
  /^@frade\/(?:adapter-|repository-|runtime-|local-index|versioning-git|federation)/,
]

const forbiddenBuiltins = new Set([
  'child_process',
  'fs',
  'fs/promises',
  'node:child_process',
  'node:fs',
  'node:fs/promises',
  'node:sqlite',
  'node:worker_threads',
  'worker_threads',
])

const importPattern = /(?:from\s+|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return sourceFiles(entryPath)
      return /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name) ? [entryPath] : []
    }),
  )
  return nested.flat()
}

function importViolations(file, content) {
  const violations = []
  for (const match of content.matchAll(importPattern)) {
    const specifier = match[1]
    if (
      forbiddenBuiltins.has(specifier) ||
      forbiddenPackages.some((pattern) => pattern.test(specifier))
    ) {
      violations.push(`${file}: forbidden import ${specifier}`)
    }
  }
  return violations
}

export async function checkDrawBoundaries({ root, virtualSources = [] }) {
  const drawRoot = path.join(root, 'packages', 'draw')
  const manifest = JSON.parse(await readFile(path.join(drawRoot, 'package.json'), 'utf8'))
  const productionDependencies = {
    ...manifest.dependencies,
    ...manifest.optionalDependencies,
    ...manifest.peerDependencies,
  }
  const violations = []

  for (const dependency of Object.keys(productionDependencies)) {
    if (forbiddenPackages.some((pattern) => pattern.test(dependency))) {
      violations.push(`packages/draw/package.json: forbidden dependency ${dependency}`)
    }
  }

  const publicExports = Object.keys(manifest.exports ?? {})
  if (publicExports.some((entry) => entry.includes('visual') || entry.includes('test'))) {
    violations.push('packages/draw/package.json: test or visual API is publicly exported')
  }

  for (const file of await sourceFiles(path.join(drawRoot, 'src'))) {
    const relative = path.relative(root, file).replaceAll('\\', '/')
    violations.push(...importViolations(relative, await readFile(file, 'utf8')))
  }
  for (const source of virtualSources) {
    violations.push(...importViolations(source.file, source.content))
  }

  return violations
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const violations = await checkDrawBoundaries({ root })
  if (violations.length > 0) {
    console.error(violations.join('\n'))
    process.exitCode = 1
  } else {
    console.log('Draw architecture boundaries: PASS')
  }
}
