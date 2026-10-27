import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  copyFile,
  realpath,
  stat,
  rm,
  unlink,
} from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import {
  generateDrawioEditor,
  checkDrawioEditor,
  root,
} from '../../scripts/ui/drawio-editor-style.mjs'
import { checkFeatureColors, featureRoots } from '../../scripts/ui/colors.mjs'
const css = 'packages/ui-workspace/src/design/generated/drawio-editor.css'
const ts = 'packages/ui-workspace/src/design/generated/drawio-editor.ts'
const source = 'packages/ui-workspace/tokens/drawio-editor-source.json'
const manifestPath = 'apps/desktop/vendor/drawio-manifest.json'
async function fixture(run) {
  const parent = await realpath(tmpdir()),
    directory = await mkdtemp(join(parent, 'frade-drawio-light-'))
  const identity = await stat(directory, { bigint: true })
  try {
    const { source: inventory } = await generateDrawioEditor()
    for (const file of [...inventory.inputs.map((v) => v.path), manifestPath]) {
      const target = resolve(directory, file)
      await mkdir(dirname(target), { recursive: true })
      await copyFile(resolve(root, file), target)
    }
    for (const folder of featureRoots) await mkdir(resolve(directory, folder), { recursive: true })
    await mkdir(resolve(directory, 'docs/ui/decisions'), { recursive: true })
    await writeFile(
      resolve(directory, 'docs/ui/decisions/legacy-colors.json'),
      JSON.stringify({ version: 1, normalization: 'LF UTF16 logical spans', occurrences: [] }),
    )
    const generated = await generateDrawioEditor({ base: directory })
    for (const [file, bytes] of Object.entries(generated.output)) {
      await mkdir(dirname(resolve(directory, file)), { recursive: true })
      await writeFile(resolve(directory, file), bytes)
    }
    await run(directory, generated)
  } finally {
    const actual = await realpath(directory),
      current = await stat(actual, { bigint: true })
    assert.equal(dirname(actual), parent)
    assert(actual.startsWith(join(parent, 'frade-drawio-light-')))
    assert.equal(current.ino, identity.ino)
    assert.equal(current.dev, identity.dev)
    await rm(actual, { recursive: true })
  }
}
test('LDE-UPSTREAM positive: source-verified generated styles pass without feature color exceptions', async (t) => {
  await fixture(async (directory) => {
    assert.deepEqual(await checkDrawioEditor({ base: directory }), [])
    const result = await checkFeatureColors(directory)
    t.diagnostic(
      JSON.stringify({ control: 'POSITIVE', status: result.status, errors: result.errors.length }),
    )
    assert.equal(result.status, 'PASS')
    assert.equal(result.legacyExceptions, 0)
  })
})
test('LDE-UPSTREAM negative: generated literal or scope drift is FAIL, not a blanket generated exemption', async (t) => {
  await fixture(async (directory) => {
    await writeFile(
      resolve(directory, css),
      (await readFile(resolve(directory, css), 'utf8')) + '\nbody{color:#ABCDEF}\n',
    )
    const errors = await checkDrawioEditor({ base: directory })
    assert(errors.some((v) => v.includes('DRAWIO_OUTPUT_DRIFT')))
    const colors = await checkFeatureColors(directory)
    t.diagnostic(JSON.stringify({ control: 'GENERATED_DRIFT', status: colors.status, errors }))
    assert.equal(colors.status, 'FAIL')
    assert(colors.errors.some((v) => v.includes('DRAWIO_OUTPUT_DRIFT')))
  })
})
test('LDE-UPSTREAM negative: forged source plus matching vendor manifest cannot bypass pinned CSS', async (t) => {
  await fixture(async (directory) => {
    const file = 'styles/grapheditor.css',
      target = resolve(directory, 'apps/desktop/vendor/drawio/' + file)
    const changed = Buffer.from(
      (await readFile(target, 'utf8')).replace(
        '--ge-panel-color: #f1f3f4',
        '--ge-panel-color: #abcdef',
      ),
    )
    await writeFile(target, changed)
    const manifest = JSON.parse(await readFile(resolve(directory, manifestPath), 'utf8'))
    const pin = manifest.assets.find((v) => v.path === file)
    pin.size = changed.length
    pin.sha = createHash('sha1')
      .update(Buffer.from('blob ' + changed.length + '\0'))
      .update(changed)
      .digest('hex')
    await writeFile(resolve(directory, manifestPath), JSON.stringify(manifest))
    const errors = await checkDrawioEditor({ base: directory })
    t.diagnostic(
      JSON.stringify({ control: 'FORGED_SOURCE', status: errors.length ? 'FAIL' : 'PASS', errors }),
    )
    assert(errors.some((v) => v.includes('UPSTREAM_SOURCE_DRIFT')))
  })
})
test('LDE-UPSTREAM negative: missing generated TS or manifest fails closed', async t => {
  await fixture(async directory => {
    for (const file of [ts, source]) {
      const original = await readFile(resolve(directory, file))
      await unlink(resolve(directory, file))
      const errors = await checkDrawioEditor({ base: directory })
      t.diagnostic(JSON.stringify({ control: 'MISSING_ARTIFACT', file, status: errors.length ? 'FAIL' : 'PASS' }))
      assert(errors.some(v => v.includes('DRAWIO_OUTPUT_MISSING: ' + file)))
      await writeFile(resolve(directory, file), original)
    }
  })
})
test('LDE-UPSTREAM negative: ordinary feature literals cannot use the source exemption', async t => {
  await fixture(async directory => {
    await writeFile(resolve(directory, 'packages/ui-inspector/src/forbidden.ts'), "export const color = '#ABCDEF'\n")
    const result = await checkFeatureColors(directory)
    t.diagnostic(JSON.stringify({ control: 'FEATURE_LITERAL', status: result.status, errors: result.errors }))
    assert.equal(result.status, 'FAIL')
    assert(result.errors.some(v => v.includes('forbidden color #ABCDEF')))
  })
})
test('LDE-UPSTREAM deterministic source coverage, scoped selectors and namespaced animations', async () => {
  await fixture(async (directory, first) => {
    const second = await generateDrawioEditor({ base: directory })
    assert.deepEqual(second.output, first.output)
    const inventory = JSON.parse(await readFile(resolve(directory, source), 'utf8'))
    const { createRequire } = await import('node:module')
    const require = createRequire(resolve(root, 'apps/desktop/package.json'))
    const postcss = require(require.resolve('postcss', { paths: [dirname(require.resolve('vite/package.json'))] }))
    let originalRules = 0
    for (const input of inventory.inputs.filter(v => v.path.endsWith('.css')))
      postcss.parse(await readFile(resolve(directory, input.path), 'utf8')).walkRules(() => originalRules++)
    assert.equal(inventory.rules.length, originalRules)
    const tree = postcss.parse(await readFile(resolve(directory, css), 'utf8'))
    tree.walkRules(rule => {
      let scope = rule.parent
      while (scope && !(scope.type === 'atrule' && scope.name === 'scope')) scope = scope.parent
      assert(scope, 'Unscoped rule: ' + rule.selector)
      assert(scope.params.includes("[data-frade-editor='light']"))
      assert(scope.params.includes('.canvas'))
      assert(scope.params.includes('svg'))
    })
    tree.walkAtRules(/keyframes$/, rule => assert(rule.params.startsWith('frade-drawio-')))
  })
})

test('LDE-UPSTREAM manifest LF and CRLF yield identical source-verified generated artifacts', async () => {
  await fixture(async directory => {
    const file = resolve(directory, manifestPath)
    const lf = (await readFile(file, 'utf8')).replaceAll('\r\n', '\n')
    await writeFile(file, lf)
    const published = await generateDrawioEditor({ base: directory })
    await writeFile(file, lf.replaceAll('\n', '\r\n'))
    const checkout = await generateDrawioEditor({ base: directory })
    assert.deepEqual(checkout.output, published.output)
  })
})
test('LDE-UPSTREAM rejects unpinned third manifest byte form and metadata mutation', async () => {
  await fixture(async directory => {
    const file = resolve(directory, manifestPath)
    const lf = (await readFile(file, 'utf8')).replaceAll('\r\n', '\n')
    await writeFile(file, lf.replace('\n', '\r\n'))
    await assert.rejects(generateDrawioEditor({ base: directory }), /UPSTREAM_MANIFEST_DRIFT/)
    const mutated = JSON.parse(lf)
    mutated.unauthorizedMetadata = true
    await writeFile(file, JSON.stringify(mutated, null, 2) + '\n')
    await assert.rejects(generateDrawioEditor({ base: directory }), /UPSTREAM_MANIFEST_DRIFT/)
  })
})
