import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, copyFile, readFile, writeFile, realpath, stat, rm, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, relative } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { root, generatedPath, referenceDirectory, checkReferenceFiles, compositeColor, parseSourceClosure } from '../../scripts/ui/vscode-dark-2026.mjs'
import { checkFeatureColors, featureRoots } from '../../scripts/ui/colors.mjs'

const digest = bytes => createHash('sha256').update(bytes).digest('hex')
async function fixture(run) {
  const parent = await realpath(tmpdir()), directory = await mkdtemp(join(parent, 'frade-vscode-contract-'))
  const owner = await stat(directory, { bigint: true })
  const put = async (name, value) => { const target = resolve(directory, name); assert(!relative(directory, target).startsWith('..')); await mkdir(dirname(target), { recursive: true }); await writeFile(target, value) }
  try {
    for (const name of ['2026-dark.json', 'dark_modern.json', 'dark_plus.json', 'dark_vs.json', 'LICENSE.txt']) {
      const file = referenceDirectory + '/upstream/' + name
      await put(file, await readFile(resolve(root, file)))
    }
    for (const file of [referenceDirectory + '/.gitattributes', generatedPath, 'packages/ui-workspace/tokens/tokens.json']) await put(file, await readFile(resolve(root, file)))
    await run({ directory, put })
  } finally {
    const actual = await realpath(directory), current = await stat(actual, { bigint: true })
    assert.equal(dirname(actual), parent); assert(actual.startsWith(join(parent, 'frade-vscode-contract-')))
    assert.equal(current.ino, owner.ino); assert.equal(current.dev, owner.dev)
    await rm(actual, { recursive: true })
  }
}
function git(cwd, args) {
  const result = spawnSync('git', ['-c', 'core.longpaths=true', '-c', 'maintenance.auto=false', '-c', 'gc.auto=0', '-c', 'commit.gpgSign=false', ...args], { cwd, encoding: 'utf8', windowsHide: true, timeout: 30000 })
  assert.equal(result.status, 0, result.stderr + result.stdout)
  return result.stdout
}

test('VS2026 positive source-bound generation passes without rewriting files', async () => {
  const before = digest(await readFile(resolve(root, generatedPath)))
  assert.equal((await checkReferenceFiles()).status, 'PASS')
  assert.equal(digest(await readFile(resolve(root, generatedPath))), before)
})

test('VS2026 generated drift and original-source drift are rejected', async () => fixture(async ({ directory, put }) => {
  assert.equal((await checkReferenceFiles(directory)).status, 'PASS')
  const original = await readFile(resolve(directory, generatedPath))
  await put(generatedPath, Buffer.concat([original, Buffer.from('\n// isolated drift\n')]))
  assert.deepEqual((await checkReferenceFiles(directory)).errors, ['REFERENCE_GENERATED_DRIFT'])
  await put(generatedPath, original)
  const source = referenceDirectory + '/upstream/2026-dark.json'
  await put(source, Buffer.concat([await readFile(resolve(directory, source)), Buffer.from('\n')]))
  assert.match((await checkReferenceFiles(directory)).errors.join(), /REFERENCE_SOURCE_DRIFT/)
}))

test('VS2026 missing inherited source fails without fallback', async () => fixture(async ({ directory }) => {
  await unlink(resolve(directory, referenceDirectory, 'upstream/dark_plus.json'))
  assert.equal((await checkReferenceFiles(directory)).status, 'FAIL')
}))

test('VS2026 JSONC include inheritance, cycles and traversal are explicit', () => {
  const files = {
    '2026-dark.json': '{ "include":"./dark_modern.json", "colors":{"sample":"#121314",}, /* source comment */ }',
    'dark_modern.json': '{ "include":"./dark_plus.json", "colors":{"sample":"#222222"} }',
    'dark_plus.json': '{ "include":"./dark_vs.json", "tokenColors":[{"scope":"test","settings":{"foreground":"#abcdef"}}] }',
    'dark_vs.json': '{ "colors":{"base":"#010203"} }',
  }
  const parsed = parseSourceClosure(files)
  assert.equal(parsed.colors.sample, '#121314'); assert.equal(parsed.colors.base, '#010203')
  assert.equal(parsed.tokenColors.length, 1)
  assert.throws(() => parseSourceClosure({ ...files, '2026-dark.json': '{"include":"../private.json"}' }), /UNSAFE_REFERENCE_INCLUDE/)
  assert.throws(() => parseSourceClosure({ ...files, 'dark_vs.json': '{"include":"./2026-dark.json"}' }), /CYCLIC_REFERENCE_INCLUDE/)
})

test('VS2026 sRGB alpha composition uses the real backdrop', () => {
  assert.equal(compositeColor('#FFFFFF22', '#191A1B'), '#38393A')
  assert.equal(compositeColor('#0000', '#191A1B'), '#191A1B')
  assert.equal(compositeColor('#abc'), '#AABBCC')
  assert.throws(() => compositeColor('#ffffff22'), /UNBOUND_REFERENCE_ALPHA/)
  assert.throws(() => compositeColor('url(https://example.invalid)'), /INVALID_REFERENCE_COLOR/)
})

test('VS2026 exact generated exemption cannot conceal feature literals or generated tampering', async () => fixture(async ({ directory, put }) => {
  for (const folder of featureRoots) await mkdir(resolve(directory, folder), { recursive: true })
  await put('docs/ui/decisions/legacy-colors.json', JSON.stringify({ version: 1, normalization: 'LF UTF16 logical spans', occurrences: [] }))
  assert.equal((await checkFeatureColors(directory)).status, 'PASS')
  await put('packages/ui-workspace/src/isolated-negative.ts', "export const accidental = '#123456'\n")
  assert.match(JSON.stringify(await checkFeatureColors(directory)), /forbidden color/)
  await unlink(resolve(directory, 'packages/ui-workspace/src/isolated-negative.ts'))
  await put(generatedPath, '// arbitrary generated-file replacement\n')
  assert.match(JSON.stringify(await checkFeatureColors(directory)), /REFERENCE_GENERATED_DRIFT/)
}))

test('VS2026 scoped raw-asset attributes preserve exact bytes under autocrlf checkout', async () => fixture(async ({ directory }) => {
  git(directory, ['init'])
  git(directory, ['-c', 'core.autocrlf=true', 'add', '--', referenceDirectory])
  git(directory, ['-c', 'user.name=Frade isolated fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'owned raw source fixture'])
  const checkout = join(directory, 'isolated-checkout')
  git(directory, ['clone', '--no-hardlinks', '--no-checkout', '.', checkout])
  git(checkout, ['-c', 'core.autocrlf=true', 'checkout'])
  for (const name of ['2026-dark.json', 'dark_modern.json', 'dark_plus.json', 'dark_vs.json', 'LICENSE.txt']) {
    const file = referenceDirectory + '/upstream/' + name
    assert.equal(digest(await readFile(resolve(checkout, file))), digest(await readFile(resolve(root, file))))
  }
  assert.equal(digest(await readFile(resolve(checkout, generatedPath))), digest(await readFile(resolve(root, generatedPath))))
}))
