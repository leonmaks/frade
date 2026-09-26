import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import {
  checkRuntimeBoundaries,
  inspectCompilerSource,
  compilerManifestViolations,
} from '../../scripts/check-runtime-boundaries.mjs'
test('compiler allows only public metamodel domain production dependencies', async () => {
  assert.deepEqual(await checkRuntimeBoundaries(process.cwd()), [])
  const manifest = JSON.parse(await readFile('packages/metamodel-compiler/package.json', 'utf8'))
  assert.deepEqual(compilerManifestViolations(manifest), [])
})
test('compiler rejects host imports, deep imports, source escapes and dynamic execution', () => {
  const scope = resolve('packages/metamodel-compiler/src'),
    file = resolve(scope, 'index.ts')
  for (const code of [
    "import fs from 'node:fs'",
    "import 'react'",
    "import 'electron'",
    "export * from '@frade/runtime-node'",
    "import '@frade/metamodel-domain/src/definitions'",
    "import '../../../apps/desktop/src/main'",
    "import 'yaml'",
    "import '@frade/repository-yaml'",
    'import(name)',
    'require(name)',
    'eval(source)',
    'new Function(source)',
  ])
    assert.ok(inspectCompilerSource(file, code, scope).length > 0, code)
  assert.deepEqual(
    inspectCompilerSource(
      file,
      "import { analyzeModel } from '@frade/metamodel-domain'; export * from './types'",
      scope,
    ),
    [],
  )
})
test('compiler manifest cannot smuggle runtime dependencies', () => {
  for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    assert.equal(compilerManifestViolations({ [field]: { electron: '1' } }).length, 1)
    assert.equal(
      compilerManifestViolations({ [field]: { '@frade/metamodel-domain': 'workspace:*' } }).length,
      field === 'dependencies' ? 0 : 1,
    )
  }
  assert.deepEqual(compilerManifestViolations({ devDependencies: { vitest: '3' } }), [])
})
