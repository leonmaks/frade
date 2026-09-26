import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  checkRuntimeBoundaries,
  inspectMetamodelSource,
  metamodelManifestViolations,
} from '../../scripts/check-runtime-boundaries.mjs'
test('metamodel production package is host-independent', async () => {
  assert.deepEqual(await checkRuntimeBoundaries(process.cwd()), [])
  const manifest = JSON.parse(await readFile('packages/metamodel-domain/package.json', 'utf8'))
  assert.deepEqual(metamodelManifestViolations(manifest), [])
})
test('metamodel rejects external imports, local escapes and dynamic execution', () => {
  const scope = resolve('packages/metamodel-domain/src'),
    file = resolve(scope, 'index.ts')
  for (const code of [
    "import fs from 'node:fs'",
    "import 'react'",
    "export * from '@frade/runtime-contracts'",
    "import('../../runtime-node/src')",
    'import(name)',
    'require(name)',
    'eval(source)',
    'new Function(source)',
  ])
    assert.ok(inspectMetamodelSource(file, code, scope).length > 0, code)
  assert.deepEqual(inspectMetamodelSource(file, "export * from './types'", scope), [])
})
test('metamodel rejects production, optional and peer dependencies', () => {
  for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies'])
    assert.equal(metamodelManifestViolations({ [field]: { electron: '1' } }).length, 1)
  assert.deepEqual(metamodelManifestViolations({ devDependencies: { vitest: '3' } }), [])
})
