import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm, readdir, readFile, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import {
  checkRuntimeBoundaries,
  inspectRuntimeSource,
} from '../../scripts/check-runtime-boundaries.mjs'

test('actual runtime policy permits three approved presentation leaves but rejects arbitrary deep UI and privileged renderer imports', async () => {
  const parent = await realpath(tmpdir()),
    root = await mkdtemp(join(parent, 'frade-p01-boundary-'))
  try {
    const scopes = [
      'packages/runtime-contracts/src',
      'packages/metamodel-domain/src',
      'packages/metamodel-compiler/src',
      'packages/runtime-node/src',
      'packages/runtime-electron/src',
      'apps/desktop/src/renderer',
    ]
    for (const scope of scopes) await mkdir(join(root, scope), { recursive: true })
    for (const name of ['metamodel-domain', 'metamodel-compiler'])
      await writeFile(
        join(root, 'packages', name, 'package.json'),
        JSON.stringify({ name: '@frade/' + name, dependencies: {} }),
      )
    const file = join(root, 'apps/desktop/src/renderer', 'presentation-fixture.ts')
    await writeFile(
      file,
      [
        "import '@frade/ui-workspace/design/theme'",
        "import '@frade/ui-workspace/design/tokens.css'",
        "import '@frade/ui-workspace/design/theme/theme-consumers.css'",
      ].join(String.fromCharCode(10)),
    )
    assert.deepEqual(await checkRuntimeBoundaries(root), [])
    for (const specifier of [
      '@frade/ui-workspace/design/theme/installer',
      '@frade/ui-workspace/design/theme/service',
      '@frade/runtime-node',
      'electron',
      'node:fs',
      '../main/presentation-settings',
    ]) {
      await writeFile(file, 'import ' + JSON.stringify(specifier))
      const failures = await checkRuntimeBoundaries(root)
      assert.equal(failures.length, 1, specifier)
      assert.ok(failures[0].includes(specifier), failures[0])
    }
  } finally {
    const target = await realpath(root)
    assert.ok(
      target.startsWith(parent + sep) &&
        target !== parent &&
        target.split(sep).at(-1).startsWith('frade-p01-boundary-'),
    )
    await rm(target, { recursive: true, force: true })
  }
})
test('portable theme layer keeps runtime-contracts, Electron and Node behind injected host ports', async () => {
  const scope = resolve('packages/ui-workspace/src/design')
  async function files(folder) {
    const output = []
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name)
      if (entry.isDirectory()) output.push(...(await files(path)))
      else if (/\.(ts|tsx)$/.test(entry.name)) output.push(path)
    }
    return output
  }
  for (const file of await files(join(scope, 'theme')))
    assert.deepEqual(
      inspectRuntimeSource(file, await readFile(file, 'utf8'), scope, ['react', '@frade/draw']),
      [],
      file,
    )
  const file = join(scope, 'theme', 'fixture.ts')
  for (const specifier of [
    '@frade/runtime-contracts',
    '@frade/runtime-electron',
    'electron',
    'node:fs',
    '@frade/ui-navigator',
    '../../../../apps/desktop/src/main/presentation-settings',
  ])
    assert.equal(
      inspectRuntimeSource(file, 'import ' + JSON.stringify(specifier), scope, [
        'react',
        '@frade/draw',
      ]).length,
      1,
      specifier,
    )
})
