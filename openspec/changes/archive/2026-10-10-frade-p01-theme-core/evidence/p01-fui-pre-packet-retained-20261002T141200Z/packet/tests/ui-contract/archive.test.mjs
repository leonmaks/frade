import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, realpath, stat, mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, relative, dirname, isAbsolute } from 'node:path'
import { spawnSync } from 'node:child_process'
import { root } from '../../scripts/ui/tokens.mjs'
import { runControls } from '../../scripts/ui/controls.mjs'
import { assertTemporaryIdentity } from '../../scripts/ui/checkout.mjs'

const canonical = 'docs/ui/bdd/ui-contracts.feature'
const active = 'openspec/changes/frade-ui-design-contract'
const archived = 'openspec/changes/archive/2026-09-30-frade-ui-design-contract'
const mappingPath = 'docs/ui/decisions/ui-contract-traceability.json'
// Explicit RED fixture source only; normal/CI/post-archive execution reads canonical docs.
const fixtureSource =
  process.env.FRADE_UI_ARCHIVE_RED === '1' ? active + '/bdd/ui-contracts.feature' : canonical
const expectedExits = [0, 0, 1, 1, 1, 0, 1]

async function withFixture(callback) {
  const directory = await realpath(await mkdtemp(resolve(tmpdir(), 'frade-ui-checkout-')))
  const identity = await stat(directory, { bigint: true })
  const verify = () => assertTemporaryIdentity(directory, identity)
  const within = (path) => {
    const target = resolve(directory, path),
      child = relative(directory, target)
    if (!child || child.startsWith('..') || isAbsolute(child))
      throw Error('Fixture target escaped owned root')
    return target
  }
  const put = async (path, value) => {
    await verify()
    const target = within(path)
    await mkdir(dirname(target), { recursive: true })
    const child = relative(directory, await realpath(dirname(target)))
    if (child.startsWith('..') || isAbsolute(child))
      throw Error('Fixture parent escaped owned root')
    await writeFile(target, value)
  }
  const ownedExisting = async (path) => {
    await verify()
    const target = await realpath(within(path)),
      child = relative(directory, target)
    if (!child || child.startsWith('..') || isAbsolute(child))
      throw Error('Fixture subtree escaped owned root')
    return target
  }
  const moveChange = async () => {
    const source = await ownedExisting(active),
      target = within(archived)
    await mkdir(dirname(target), { recursive: true })
    const child = relative(directory, await realpath(dirname(target)))
    if (child.startsWith('..') || isAbsolute(child))
      throw Error('Archive parent escaped owned root')
    await verify()
    await rename(source, target)
  }
  const removeChange = async () => {
    const source = await ownedExisting(active)
    await verify()
    await rm(source, { recursive: true })
  }
  const removeFile = async (path) => {
    const target = await ownedExisting(path)
    await verify()
    await rm(target)
  }
  let failure, result
  const originals = new Map()
  try {
    const feature = await readFile(resolve(root, fixtureSource))
    const mapSource = await readFile(resolve(root, mappingPath)),
      mapping = JSON.parse(mapSource)
    for (const path of [
      fixtureSource,
      mappingPath,
      'packages/ui-workspace/tokens/tokens.json',
      'packages/ui-workspace/src/design/generated/tokens.css',
      'packages/ui-workspace/src/design/generated/tokens.ts',
      'tests/ui-contract/fixtures/upstream.tokens.css',
      ...new Set(mapping.entries.filter((entry) => entry.file).map((entry) => entry.file)),
    ]) {
      const bytes = await readFile(resolve(root, path))
      originals.set(path, bytes)
      await put(path, bytes)
    }
    await put(canonical, feature)
    await put(active + '/bdd/ui-contracts.feature', feature)
    for (const name of ['tokens', 'colors', 'traceability'])
      await put('scripts/ui/' + name + '.mjs', 'throw Error("UNTRUSTED_FIXTURE_SCRIPT_EXECUTED")\n')
    result = await callback({ directory, put, moveChange, removeChange, removeFile, mapping })
  } catch (error) {
    failure = error
  } finally {
    try {
      await verify()
      await rm(directory, { recursive: true })
    } catch (error) {
      failure = failure
        ? new AggregateError([failure, error], 'Archive assertion and cleanup failed')
        : error
    }
  }
  for (const [path, bytes] of originals)
    assert.ok(
      bytes.equals(await readFile(resolve(root, path))),
      'Production source/history mutated: ' + path,
    )
  assert.equal(existsSync(directory), false, 'Owned fixture was not removed')
  if (failure) throw failure
  return result
}

function trace(directory) {
  const result = spawnSync(
    process.execPath,
    [resolve(root, 'scripts/ui/traceability.mjs'), '--root', directory],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  )
  if (result.error) throw result.error
  return result
}
function assertControls(result) {
  assert.equal(result.status, 'PASS')
  assert.deepEqual(
    result.controls.map((control) => control.actualExit),
    expectedExits,
  )
  assert.deepEqual(
    result.controls.map((control) => control.expectedExit),
    expectedExits,
  )
  assert.equal(result.removed, true)
  assert.equal(existsSync(result.temporaryRoot), false)
}

test('UI-ARCHIVE:archived-change', async () => {
  await withFixture(async (fixture) => {
    await fixture.moveChange()
    assert.equal(existsSync(resolve(fixture.directory, active)), false)
    assert.equal(existsSync(resolve(fixture.directory, archived)), true)
    const cli = trace(fixture.directory)
    assert.equal(cli.status, 0, cli.stderr || cli.stdout)
    assert.equal(
      JSON.parse(cli.stdout).foundationBindings,
      fixture.mapping.entries.filter((entry) => entry.phase === 'foundation').length,
    )
    assert.equal(JSON.parse(cli.stdout).futureBoundariesNotExecuted, 23)
    const controls = await runControls({ base: fixture.directory })
    assertControls(controls)
    console.log(
      JSON.stringify({
        lifecycle: 'archived',
        traceExit: cli.status,
        controls: controls.controls.map((c) => c.actualExit),
        removed: controls.removed,
      }),
    )
  })
})

test('UI-ARCHIVE:no-change-artifacts', async () => {
  await withFixture(async (fixture) => {
    await fixture.removeChange()
    assert.equal(existsSync(resolve(fixture.directory, active)), false)
    assert.equal(existsSync(resolve(fixture.directory, archived)), false)
    const cli = trace(fixture.directory)
    assert.equal(cli.status, 0, cli.stderr || cli.stdout)
    assert.equal(JSON.parse(cli.stdout).futureBoundariesNotExecuted, 23)
    const controls = await runControls({ base: fixture.directory })
    assertControls(controls)
    console.log(
      JSON.stringify({
        lifecycle: 'no artifacts',
        traceExit: cli.status,
        controls: controls.controls.map((c) => c.actualExit),
        removed: controls.removed,
      }),
    )
  })
})

test('UI-ARCHIVE:canonical-no-fallback', async () => {
  await withFixture(async (fixture) => {
    const original = await readFile(resolve(fixture.directory, canonical))
    await fixture.removeFile(canonical)
    const missing = trace(fixture.directory)
    assert.equal(
      missing.status,
      1,
      'Missing canonical BDD must fail despite valid active/production copies',
    )
    assert.match(missing.stderr, /ENOENT/)
    await assert.rejects(runControls({ base: fixture.directory }), /ENOENT/)
    await fixture.put(canonical, 'This is not a Gherkin document\n')
    const malformed = trace(fixture.directory)
    assert.equal(
      malformed.status,
      1,
      'Malformed canonical BDD must fail despite valid historical copies',
    )
    assert.match(malformed.stdout, /Parser errors|expected/i)
    const controls = await runControls({ base: fixture.directory })
    assert.equal(controls.status, 'FAIL')
    assert.equal(
      controls.controls.find((control) => control.name === 'positive complete traceability')
        .actualExit,
      1,
    )
    assert.equal(controls.removed, true)
    await fixture.put(canonical, original)
    console.log(
      JSON.stringify({
        lifecycle: 'canonical negative',
        missingExit: missing.status,
        malformedExit: malformed.status,
        controlStatus: controls.status,
        removed: controls.removed,
      }),
    )
  })
})

test('UI-ARCHIVE:fixture-base-is-respected', async () => {
  await withFixture(async (fixture) => {
    await fixture.removeFile(canonical)
    await assert.rejects(runControls({ base: fixture.directory }), /ENOENT/)
    assert.equal(existsSync(resolve(fixture.directory, active + '/bdd/ui-contracts.feature')), true)
  })
})

test('UI-ARCHIVE:execution-and-cleanup-failures-preserved', async () => {
  const unavailable = () => ({ status: null, error: Error('Injected CLI execution failure') })
  await assert.rejects(runControls({ spawn: unavailable }), /Injected CLI execution failure/)
  const cleanupFailure = async (path, options) => {
    await rm(path, options)
    throw Error('Injected controls cleanup failure')
  }
  await assert.rejects(runControls({ remove: cleanupFailure }), /Injected controls cleanup failure/)
  await assert.rejects(runControls({ spawn: unavailable, remove: cleanupFailure }), (error) => {
    assert.ok(error instanceof AggregateError)
    assert.equal(error.errors.length, 2)
    assert.match(String(error.errors[0]), /Injected CLI execution failure/)
    assert.match(String(error.errors[1]), /Injected controls cleanup failure/)
    return true
  })
})
