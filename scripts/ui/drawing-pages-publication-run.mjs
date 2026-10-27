import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { publicationByteForms } from '../../tests/ui-contract/drawing-pages-adoption.mjs'
import {
  currentInputFiles,
  sourceSetSha256,
  sha256,
  evidenceOwner,
  executionRoles,
  desktopOutputs,
  reportCases,
  verifyDrawingPagesCurrent,
  bootstrapPin,
} from '../../tests/ui-contract/drawing-pages-current.mjs'
import {
  publicationEvidence,
  publicationProducer,
  publicationPhysical,
  publicationEnvironmentKeys,
  publicationExecutionSpec,
  publicationInvocation,
  verifyPublicationControls,
  readDrawingPagesPublication,
  legacyPublicationManifest,
} from '../../tests/ui-contract/drawing-pages-publication.mjs'

const root = fs.realpathSync(process.cwd()).replaceAll('\\', '/')
const [mode, profile] = process.argv.slice(2)
if (
  !['batch', 'gate', 'pin'].includes(mode) ||
  (mode !== 'pin' && !['clean', 'working'].includes(profile))
)
  throw Error('PUBLICATION_COMMAND')
const physical = (file) => publicationPhysical(profile, file)
const read = (file) => fs.readFileSync(physical(file))
const put = (file, bytes) => {
  fs.mkdirSync(path.dirname(physical(file)), { recursive: true })
  fs.writeFileSync(physical(file), bytes)
}
const json = (file, value) => put(file, JSON.stringify(value, null, 2) + '\n')
const artifact = (file) => ({ file, sha256: sha256(read(file)) })
const inputs = () =>
  currentInputFiles(root).map((file) => ({ file, ...publicationByteForms(read(file)) }))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
function fileHash(file) {
  const fd = fs.openSync(file, 'r'),
    buffer = Buffer.alloc(1024 * 1024),
    hash = createHash('sha256')
  try {
    for (let count; (count = fs.readSync(fd, buffer)) > 0;) hash.update(buffer.subarray(0, count))
  } finally {
    fs.closeSync(fd)
  }
  return hash.digest('hex')
}
function environment() {
  const inherited = new Map(
    Object.entries(process.env).map(([key, value]) => [key.toUpperCase(), value]),
  )
  const result = {}
  for (const key of publicationEnvironmentKeys)
    if (inherited.has(key)) result[key] = inherited.get(key)
  result.ELECTRON_OVERRIDE_DIST_PATH = root + '/apps/desktop/node_modules/electron/dist'
  result.FRADE_DRAW_E2E_PORT = '5187'
  return result
}
function runtime(env) {
  const require = createRequire(root + '/apps/desktop/package.json')
  const electronVersion = JSON.parse(
    fs.readFileSync(require.resolve('electron/package.json')),
  ).version
  const electron = fs
    .realpathSync(env.ELECTRON_OVERRIDE_DIST_PATH + '/electron.exe')
    .replaceAll('\\', '/')
  if (electronVersion !== '44.4.5' || !electron.startsWith(root + '/'))
    throw Error('NONLOCAL_ELECTRON')
  const node = fs.realpathSync(process.execPath).replaceAll('\\', '/')
  const shell = fs
    .realpathSync(path.join(env.SYSTEMROOT, 'System32/WindowsPowerShell/v1.0/powershell.exe'))
    .replaceAll('\\', '/')
  return {
    node: { path: node, version: process.version, sha256: fileHash(node) },
    shell: { path: shell, sha256: fileHash(shell) },
    electron: { path: electron, version: electronVersion, sha256: fileHash(electron) },
  }
}
async function execute(invocation, env) {
  const child = spawn(invocation.executable, invocation.args, {
    cwd: invocation.cwd,
    env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const out = [],
    err = []
  child.stdout.on('data', (data) => out.push(data))
  child.stderr.on('data', (data) => err.push(data))
  const exitCode = await new Promise((done, reject) => {
    child.once('error', reject)
    child.once('close', done)
  })
  return { exitCode, out: Buffer.concat(out), err: Buffer.concat(err) }
}
const legacy = () => JSON.parse(fs.readFileSync(legacyPublicationManifest))
function captureArtifacts(folder, target) {
  const result = []
  const visit = (relative) => {
    for (const entry of fs.readdirSync(path.join(folder, relative), { withFileTypes: true })) {
      const next = relative ? relative + '/' + entry.name : entry.name
      if (entry.isSymbolicLink()) throw Error('ARTIFACT_LINK')
      if (entry.isDirectory()) visit(next)
      else if (!entry.name.startsWith('.')) {
        const destination = target + '/' + next.replace(/\.zip$/, '.zip.bin'),
          raw = fs.readFileSync(path.join(folder, next))
        put(destination, raw)
        result.push({ file: destination, sha256: sha256(raw), bytes: raw.length })
      }
    }
  }
  if (fs.existsSync(folder)) visit('')
  json(target + '/index.json', result)
}
async function recordRole(role, control, buildSelection, plan) {
  const run =
    evidenceOwner +
    'current-execution/' +
    role +
    '-' +
    new Date().toISOString().replaceAll(/[:.]/g, '-')
  if (fs.existsSync(physical(run))) throw Error('IMMUTABLE_RUN_EXISTS')
  const before = inputs(),
    startedAt = new Date().toISOString(),
    runtimeBefore = runtime(control.environment)
  if (!same(runtimeBefore, control.runtime)) throw Error('RUNTIME_CHANGED_BEFORE_ROLE')
  json(run + '/before.json', before)
  const invocation = publicationInvocation(role, plan, control, run + '/report.json')
  const spec = publicationExecutionSpec(role, plan)
  let buildSha256, bundlesBefore
  if (role !== 'desktop-build' && role.startsWith('desktop-')) {
    const buildRaw = read(buildSelection.record.file),
      build = JSON.parse(buildRaw)
    if (
      sha256(buildRaw) !== buildSelection.record.sha256 ||
      build.exitCode !== 0 ||
      build.sourceSetBefore !== sourceSetSha256(before) ||
      build.sourceSetAfter !== sourceSetSha256(before)
    )
      throw Error('STALE_BUILD')
    buildSha256 = sha256(buildRaw)
    bundlesBefore = sha256(JSON.stringify(desktopOutputs(root)))
    if (bundlesBefore !== sha256(JSON.stringify(build.outputs))) throw Error('BUILD_OUTPUT_DRIFT')
  }
  console.log(
    JSON.stringify({
      stage: 'START',
      profile,
      role,
      startedAt,
      sourceFiles: before.length,
      run: physical(run),
    }),
  )
  const result = await execute(invocation, control.environment)
  put(run + '/stdout.txt', result.out)
  put(run + '/stderr.txt', result.err)
  if (spec.runner === 'playwright') put(run + '/report.json', result.out)
  const after = inputs(),
    runtimeAfter = runtime(control.environment)
  json(run + '/after.json', after)
  const record = {
    role,
    runner: spec.runner,
    cwd: spec.cwd,
    executable: invocation.executable,
    args: invocation.args,
    invocation,
    environment: control.environment,
    producer: control.producer,
    runtimeBefore,
    runtimeAfter,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: result.exitCode,
    sourceSetBefore: sourceSetSha256(before),
    sourceSetAfter: sourceSetSha256(after),
    before: artifact(run + '/before.json'),
    after: artifact(run + '/after.json'),
    stdout: artifact(run + '/stdout.txt'),
    stderr: artifact(run + '/stderr.txt'),
  }
  if (role === 'desktop-build') record.outputs = result.exitCode === 0 ? desktopOutputs(root) : []
  else
    record.report = fs.existsSync(physical(run + '/report.json'))
      ? artifact(run + '/report.json')
      : null
  if (buildSha256)
    Object.assign(record, {
      buildSha256,
      bundlesBefore,
      bundlesAfter: sha256(JSON.stringify(desktopOutputs(root))),
    })
  json(run + '/record.json', record)
  if (['desktop-performance', 'draw-visual', 'desktop-diagrams'].includes(role))
    captureArtifacts(
      role === 'draw-visual' ? 'packages/draw/test-results' : 'apps/desktop/test-results',
      run + '/artifacts',
    )
  if (
    result.exitCode !== 0 ||
    record.sourceSetBefore !== record.sourceSetAfter ||
    !same(before, after) ||
    !same(runtimeBefore, runtimeAfter)
  )
    throw Error('ROLE_FAILED_OR_INPUT_DRIFT:' + role + ':' + result.exitCode)
  if (role === 'desktop-build')
    return {
      record: artifact(run + '/record.json'),
      stdout: artifact(run + '/stdout.txt'),
      stderr: artifact(run + '/stderr.txt'),
    }
  const cases = reportCases(spec.runner, JSON.parse(read(run + '/report.json')))
  if (role === 'desktop-presentation' || role === 'desktop-performance') {
    const key = (x) => x.file.replaceAll('\\', '/').split('/').at(-1) + '\0' + x.title
    const perf = (item) =>
      item.file === 'ui-contract-theme-performance.spec.ts' || item.title.includes('p95')
    const selected = plan.cases.filter((item) =>
      role === 'desktop-performance' ? perf(item) : !perf(item),
    )
    if (!same(cases.map(key).sort(), selected.map(key).sort()))
      throw Error('EXECUTED_PLAN_CASE_SET')
  }
  const execution = {
    role,
    record: artifact(run + '/record.json'),
    report: artifact(run + '/report.json'),
    stdout: artifact(run + '/stdout.txt'),
    stderr: artifact(run + '/stderr.txt'),
    cases,
  }
  json(run + '/execution.json', execution)
  console.log(
    JSON.stringify({
      stage: 'PASS',
      profile,
      role,
      tests: cases.length,
      durationMs: Date.parse(record.finishedAt) - Date.parse(startedAt),
    }),
  )
  return execution
}
async function batch() {
  const target = publicationEvidence + '/profiles/' + profile
  if (fs.existsSync(target + '/progress.json')) throw Error('EXPLICIT_REASSESSMENT_REQUIRED')
  const planRaw = fs.readFileSync(
    legacyPublicationManifest.replace(
      'source-adoption-manifest.json',
      'presentation-execution-plan.json',
    ),
  )
  put(evidenceOwner + 'presentation-execution-plan.json', planRaw)
  const initial = inputs(),
    env = environment()
  const control = {
    version: 1,
    profile,
    snapshotRoot: root,
    producer: { file: publicationProducer, sha256: fileHash(publicationProducer) },
    runtime: runtime(env),
    environment: env,
  }
  const completed = [],
    executions = []
  let build
  const progress = (status, extra = {}) =>
    json(evidenceOwner + 'progress.json', {
      status,
      at: new Date().toISOString(),
      sourceSet: sourceSetSha256(initial),
      completed,
      ...extra,
    })
  progress('RUNNING')
  try {
    for (const role of [
      'desktop-build',
      'desktop-performance',
      ...executionRoles.filter((role) => role !== 'desktop-performance'),
    ]) {
      const result = await recordRole(role, control, build, JSON.parse(planRaw))
      if (role === 'desktop-build') build = result
      else executions.push(result)
      completed.push(role)
      progress('RUNNING')
    }
    if (!same(initial, inputs())) throw Error('FINAL_SOURCE_DRIFT')
    executions.sort((a, b) => executionRoles.indexOf(a.role) - executionRoles.indexOf(b.role))
    const old = legacy()
    const manifest = {
      version: 1,
      change: old.change,
      baseline: old.baseline,
      meaning:
        'Fresh exact ' +
        profile +
        ' publication profile; historical working713 proof remains immutable and is not reused as current execution.',
      historicalOrigin: {
        file: legacyPublicationManifest,
        sha256: fileHash(legacyPublicationManifest),
      },
      currentInputs: initial,
      sourceSetSha256: sourceSetSha256(initial),
      desktopBuild: build,
      executions,
      publicationControl: control,
    }
    const verified = verifyDrawingPagesCurrent(root, manifest, read)
    verifyPublicationControls(manifest, read, old)
    json(evidenceOwner + 'source-adoption-manifest.json', manifest)
    progress('PASS', {
      verified,
      manifestSha256: sha256(read(evidenceOwner + 'source-adoption-manifest.json')),
    })
    console.log(JSON.stringify({ stage: 'COMPLETE', profile, verified }))
  } catch (error) {
    progress('FAIL', { error: String(error) })
    throw error
  }
}
async function gate() {
  const proof = readDrawingPagesPublication(root)
  if (proof.name !== profile) throw Error('WRONG_GATE_PROFILE')
  verifyDrawingPagesCurrent(root, proof.manifest, proof.read)
  const before = inputs(),
    env = environment(),
    runtimeBefore = runtime(env),
    startedAt = new Date().toISOString()
  const run = evidenceOwner + 'general-gate-' + startedAt.replaceAll(/[:.]/g, '-')
  json(run + '/before.json', before)
  const invocation = {
    executable: runtimeBefore.shell.path,
    args: ['-NoProfile', '-NonInteractive', '-Command', 'pnpm check'],
    cwd: root,
  }
  console.log(
    JSON.stringify({
      stage: 'START_GATE',
      profile,
      run: physical(run),
      sourceSet: sourceSetSha256(before),
    }),
  )
  const result = await execute(invocation, env)
  put(run + '/stdout.txt', result.out)
  put(run + '/stderr.txt', result.err)
  const after = inputs(),
    runtimeAfter = runtime(env)
  json(run + '/after.json', after)
  const record = {
    role: 'general-gate',
    invocation,
    environment: env,
    runtimeBefore,
    runtimeAfter,
    producer: { file: publicationProducer, sha256: fileHash(publicationProducer) },
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: result.exitCode,
    sourceSetBefore: sourceSetSha256(before),
    sourceSetAfter: sourceSetSha256(after),
    before: artifact(run + '/before.json'),
    after: artifact(run + '/after.json'),
    stdout: artifact(run + '/stdout.txt'),
    stderr: artifact(run + '/stderr.txt'),
    status:
      result.exitCode === 0 && same(before, after) && same(runtimeBefore, runtimeAfter)
        ? 'PASS'
        : 'FAIL',
  }
  json(run + '/record.json', record)
  json(evidenceOwner + 'general-gate-selection.json', artifact(run + '/record.json'))
  console.log(
    JSON.stringify({
      stage: record.status,
      profile,
      run: physical(run),
      exitCode: result.exitCode,
    }),
  )
  if (record.status !== 'PASS') process.exitCode = 1
}
function pin() {
  const file = bootstrapPin,
    original = fs.readFileSync(file, 'utf8')
  const retained = original.replace(
    /^export const drawingPages(?:Clean|Working)PublicationManifestSha256 = '[a-f0-9]{64}'\r?\n/gm,
    '',
  )
  let text = retained.endsWith('\n') ? retained : retained + '\n'
  for (const name of ['clean', 'working']) {
    const raw = fs.readFileSync(
      publicationEvidence + '/profiles/' + name + '/source-adoption-manifest.json',
    )
    text +=
      'export const drawingPages' +
      (name === 'clean' ? 'Clean' : 'Working') +
      "PublicationManifestSha256 = '" +
      sha256(raw) +
      "'\n"
  }
  fs.writeFileSync(file, text)
  const proof = readDrawingPagesPublication(root)
  console.log(
    JSON.stringify({
      status: 'PASS',
      profile: proof.name,
      verified: verifyDrawingPagesCurrent(root, proof.manifest, proof.read),
    }),
  )
}
if (mode === 'batch') await batch()
else if (mode === 'gate') await gate()
else pin()
