import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import {
  checkWorkbenchBoundaries,
  inspectWorkbenchSource,
  workbenchManifestViolations,
  workbenchPolicies,
} from '../../scripts/check-workbench-boundaries.mjs'

test('workspace may use only the declared pure Draw document facade, without granting new dependencies', async () => {
  const scope = resolve('packages/ui-workspace/src'),
    file = resolve(scope, 'diagramContent.ts')
  assert.deepEqual(
    inspectWorkbenchSource(
      file,
      "import { drawingContentKey } from '@frade/draw/document'",
      scope,
      'ui-workspace',
    ),
    [],
  )
  for (const name of [
    '@frade/draw/private',
    '@frade/draw/src/document/drawing',
    '@frade/draw/document/private',
    '@frade/runtime-node',
    '../../draw/src/document/drawing',
  ])
    assert.ok(inspectWorkbenchSource(file, `import '${name}'`, scope, 'ui-workspace').length, name)
  assert.ok(
    workbenchManifestViolations('ui-workspace', { dependencies: { '@frade/draw/document': '1' } })
      .length,
  )
  const otherScope = resolve('packages/ui-inspector/src')
  assert.ok(
    inspectWorkbenchSource(
      resolve(otherScope, 'fixture.ts'),
      "import '@frade/draw/document'",
      otherScope,
      'ui-inspector',
    ).length,
  )
  const manifest = JSON.parse(await readFile('packages/draw/package.json', 'utf8'))
  assert.equal(manifest.exports['./document'], './src/document/serialize.ts')
  for (const name of ['serialize.ts', 'schema.ts', 'drawing.ts']) {
    const source = await readFile('packages/draw/src/document/' + name, 'utf8')
    assert.doesNotMatch(
      source,
      /from\s*['"](?:react|@antv|node:)|\bwindow\.|\bdocument\.(?:createElement|querySelector|body|head)\b|\b(?:HTMLElement|HTMLCanvasElement)\b/,
    )
  }
})
test('pilot public exports and package boundaries exist and remain inward-only', async () => {
  assert.deepEqual(await checkWorkbenchBoundaries(process.cwd()), [])
})
for (const name of Object.keys(workbenchPolicies)) {
  test(name + ' rejects privileged, private and escaping dependencies', () => {
    const scope = resolve('packages', name, 'src'),
      file = resolve(scope, 'fixture.ts')
    for (const source of [
      "import 'electron'",
      "import '@frade/runtime-node'",
      "import '../../other/src'",
      "import '@frade/repository-domain/src/types'",
      'import(variable)',
      'eval(source)',
      'new Function(source)',
    ])
      assert.ok(inspectWorkbenchSource(file, source, scope, name).length, source)
    for (const dep of ['electron', '@frade/runtime-node', '@frade/ui-workspace']) {
      if (workbenchPolicies[name].includes(dep)) continue
      for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies'])
        assert.ok(workbenchManifestViolations(name, { [field]: { [dep]: '1' } }).length)
    }
    for (const dependency of workbenchPolicies[name])
      assert.deepEqual(inspectWorkbenchSource(file, `import '${dependency}'`, scope, name), [])
    const nodeImport = "import {readFile} from 'node:fs/promises'"
    if (name === 'adapter-sberea-yaml')
      assert.deepEqual(inspectWorkbenchSource(file, nodeImport, scope, name), [])
    else assert.ok(inspectWorkbenchSource(file, nodeImport, scope, name).length)
    if (name === 'metamodel-config')
      assert.ok(inspectWorkbenchSource(file, 'document.querySelector("form")', scope, name).length)
  })
}
