import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import {
  checkWorkbenchBoundaries,
  inspectWorkbenchSource,
  workbenchManifestViolations,
  workbenchPolicies,
} from '../../scripts/check-workbench-boundaries.mjs'
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
