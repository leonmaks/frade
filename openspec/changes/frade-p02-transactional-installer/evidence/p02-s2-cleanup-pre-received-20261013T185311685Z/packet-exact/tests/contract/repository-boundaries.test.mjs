import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import {
  checkRepositoryBoundaries,
  inspectRepositorySource,
  repositoryManifestViolations,
  repositoryPolicies,
} from '../../scripts/check-repository-boundaries.mjs'
test('repository packages retain portable inward-only boundaries', async () => {
  assert.deepEqual(await checkRepositoryBoundaries(process.cwd()), [])
})
test('repository boundaries reject host, private, escaping and dynamic imports', () => {
  for (const [name, allowed] of Object.entries(repositoryPolicies)) {
    const scope = resolve('packages', name, 'src'),
      file = resolve(scope, 'fixture.ts')
    for (const code of [
      "import fs from 'node:fs'",
      "import 'electron'",
      "import React from 'react'",
      "import '@frade/adapter-yaml'",
      "import '@frade/metamodel-domain/src/types'",
      "import '../../runtime-node/src'",
      'import(variable)',
      'eval(source)',
      'new Function(source)',
      'document.querySelector("canvas")',
      'window.location.href',
      'const value: HTMLElement = element',
    ])
      assert.ok(inspectRepositorySource(file, code, scope, allowed).length, code)
    for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies'])
      assert.ok(repositoryManifestViolations(name, { [field]: { electron: '1' } }).length)
  }
})
