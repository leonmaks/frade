import { mkdtemp, mkdir, readFile, writeFile, rm, realpath, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, relative, sep, dirname, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { root } from './tokens.mjs'
import { featureRoots, inspectColors } from './colors.mjs'
import { featurePath } from './traceability.mjs'
const sha = (value) => createHash('sha256').update(value).digest('hex')
export async function runControls({ base = root, spawn = spawnSync, remove = rm } = {}) {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'frade-ui-contract-'))
  const canonicalTemp = await realpath(tmpdir()),
    verifiedRoot = await realpath(temporaryRoot)
  const within = relative(canonicalTemp, verifiedRoot)
  if (!within.startsWith('frade-ui-contract-') || within.includes(sep) || within.startsWith('..'))
    throw Error('Unverified temporary root')
  const identity = await stat(verifiedRoot, { bigint: true })
  const verify = async () => {
    if ((await realpath(verifiedRoot)) !== verifiedRoot)
      throw Error('Temporary root identity changed; refusing operation')
    const current = await stat(verifiedRoot, { bigint: true })
    if (current.dev !== identity.dev || current.ino !== identity.ino || !current.isDirectory())
      throw Error('Temporary root identity changed; refusing operation')
  }
  const controls = []
  let removed = false
  let failure
  const cleanup = async () => {
    await verify()
    await remove(verifiedRoot, { recursive: true })
    removed = true
  }
  const put = async (file, value) => {
    await verify()
    const target = resolve(verifiedRoot, file),
      child = relative(verifiedRoot, target)
    if (!child || child.startsWith('..') || isAbsolute(child))
      throw Error('Control target escaped temporary root')
    await mkdir(dirname(target), { recursive: true })
    const parent = relative(verifiedRoot, await realpath(dirname(target)))
    if (parent.startsWith('..') || isAbsolute(parent))
      throw Error('Control parent escaped temporary root')
    await verify()
    await writeFile(target, value)
  }
  const copy = async (file) => {
    await put(file, await readFile(resolve(base, file)))
  }
  const run = (name, script, expectedExit, fixture) => {
    const result = spawn(
      process.execPath,
      [resolve(root, 'scripts/ui/' + script + '.mjs'), '--root', verifiedRoot],
      { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
    )
    if (result.error) throw result.error
    controls.push({
      name,
      expectedExit,
      actualExit: result.status,
      fixtureHash: sha(fixture),
      stdout: result.stdout,
      stderr: result.stderr,
    })
  }
  try {
    const tokenPath = 'packages/ui-workspace/tokens/tokens.json',
      cssPath = 'packages/ui-workspace/src/design/generated/tokens.css'
    const source = await readFile(resolve(base, tokenPath), 'utf8'),
      css = await readFile(resolve(base, cssPath), 'utf8')
    for (const file of [
      tokenPath,
      cssPath,
      'packages/ui-workspace/src/design/generated/tokens.ts',
      'tests/ui-contract/fixtures/upstream.tokens.css',
    ])
      await copy(file)
    for (const directory of featureRoots)
      await mkdir(resolve(verifiedRoot, directory), { recursive: true })
    const literalPath = 'packages/ui-navigator/src/control.css',
      legacy = '.legacy { color: #123456; }'
    await put(literalPath, legacy)
    const inventory = JSON.stringify({
      version: 1,
      normalization: 'LF UTF16 logical spans',
      occurrences: inspectColors(literalPath, legacy).map((hit) => ({
        ...hit,
        classification: 'LEGACY',
        reason: 'isolated negative-control baseline only',
        stage: 'fixture',
      })),
    })
    await put('docs/ui/decisions/legacy-colors.json', inventory)
    run('positive tokens', 'tokens', 0, source + css)
    run('positive exact legacy occurrence', 'colors', 0, legacy + inventory)
    await put(cssPath, css + '\n/* isolated drift */')
    run('negative generated drift', 'tokens', 1, css + '\n/* isolated drift */')
    await put(cssPath, css)
    const low = JSON.parse(source)
    low.themes.light['text.primary'] = '#FFFFFF'
    const lowSource = JSON.stringify(low)
    await put(tokenPath, lowSource)
    run('negative contrast', 'tokens', 1, lowSource)
    await put(tokenPath, source)
    const added = legacy + '\n.new { color: red; }'
    await put(literalPath, added)
    run('negative new literal beside legacy', 'colors', 1, added + inventory)
    const mapPath = 'docs/ui/decisions/ui-contract-traceability.json'
    const mapSource = await readFile(resolve(base, mapPath), 'utf8'),
      mapping = JSON.parse(mapSource)
    await copy(featurePath)
    await put(mapPath, mapSource)
    for (const file of new Set(mapping.entries.filter((e) => e.file).map((e) => e.file)))
      await copy(file)
    run('positive complete traceability', 'traceability', 0, mapSource)
    mapping.entries.shift()
    const missing = JSON.stringify(mapping)
    await put(mapPath, missing)
    run('negative missing traceability', 'traceability', 1, missing)
  } catch (error) {
    failure = error
  } finally {
    try {
      await cleanup()
    } catch (error) {
      failure = failure ? new AggregateError([failure, error], 'Control and cleanup failed') : error
    }
  }
  if (failure) throw failure
  return {
    status:
      controls.length === 7 && controls.every((c) => c.actualExit === c.expectedExit)
        ? 'PASS'
        : 'FAIL',
    temporaryRoot: verifiedRoot,
    removed,
    controls,
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = await runControls()
    console.log(JSON.stringify(report))
    process.exitCode = report.status === 'PASS' ? 0 : 1
  } catch (error) {
    console.error(String(error))
    process.exitCode = 1
  }
}
