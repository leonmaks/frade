import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import {
  checkRuntimeBoundaries,
  inspectRuntimeSource,
} from '../../scripts/check-runtime-boundaries.mjs'
test('runtime packages and renderer respect architecture boundaries', async () =>
  assert.deepEqual(await checkRuntimeBoundaries(process.cwd()), []))
test('renderer rejects Node, privileged packages and local escapes', () => {
  const scope = resolve('apps/desktop/src/renderer'),
    file = resolve(scope, 'main.tsx')
  for (const source of [
    "import fs from 'node:fs'",
    "import 'electron'",
    "import('../main/security')",
    "import { x } from '@frade/runtime-node'",
  ])
    assert.equal(inspectRuntimeSource(file, source, scope, ['react']).length, 1)
  assert.deepEqual(
    inspectRuntimeSource(file, "import './style.css'; import { useState } from 'react'", scope, [
      'react',
    ]),
    [],
  )
})

test('ordinary diagnostic text containing import is not an import declaration', () => {
  const scope = resolve('packages/metamodel-config/src'),
    file = resolve(scope, 'fixture.ts')
  assert.deepEqual(
    inspectRuntimeSource(
      file,
      "throw Error('Unexpected model import'); fail('INVALID_INPUT')",
      scope,
      [],
    ),
    [],
  )
})
