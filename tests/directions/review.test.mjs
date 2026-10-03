import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { manifest as baseManifest } from './fixtures.mjs'
import { createRoleAuthority } from '../../scripts/directions/roles.mjs'

const api = await import('../../scripts/directions/review.mjs').catch(() => ({}))
const fixtureRoot = new URL('./authority-fixtures/', import.meta.url)
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const designPath = 'openspec/changes/frade-standard-workflow/design.md'
const policyPath =
  'openspec/changes/frade-standard-workflow/evidence/shared-policy/agent-workflow.md'
const decisionPath = 'openspec/changes/frade-standard-workflow/evidence/user-decisions.json'
const approvalPath = 'openspec/changes/frade-standard-workflow/evidence/policy-acceptance.json'
const proposalPath = 'openspec/changes/frade-standard-workflow/proposal.md'
const tasksPath = 'openspec/changes/frade-standard-workflow/tasks.md'
const specPaths = [
  'openspec/changes/frade-standard-workflow/specs/engineering-direction-lifecycle/spec.md',
  'openspec/changes/frade-standard-workflow/specs/engineering-role-dispatch/spec.md',
  'openspec/changes/frade-standard-workflow/specs/engineering-progress-publication/spec.md',
]
const authoritySnapshots = new Map([
  [
    designPath,
    ['w01-design.snapshot', '501168ced50a35e128a0fc86e79bab6ac9aa31cd343eca3eedac56f81570978a'],
  ],
  [
    decisionPath,
    ['w01-decisions.snapshot', '126589d990e2e44b04efe8825b5ec4d90582205ba6c729375528c383ccbaf186'],
  ],
  [
    approvalPath,
    ['w01-d03.snapshot', '98511f4a32f358b668809fa2e910d090b56617b5c05da1f332ac3517d2ff3239'],
  ],
  [
    policyPath,
    ['w01-policy.snapshot', '6c6cf78fccfc4dac9e53c859715850db127f897e7eb79aa94957134bd1c1ffeb'],
  ],
  [
    proposalPath,
    ['w01-proposal.snapshot', '97a26d30bf7dd54d5503000ebd754fa6ceb728d45a0d17c2ccb33e12e10c4d22'],
  ],
  [
    tasksPath,
    ['w01-tasks.snapshot', 'd5296756e7bd359dbb678a247ed628e9291c8958cf2fbe8ec24943a146b814e0'],
  ],
  [
    specPaths[0],
    ['w01-lifecycle.snapshot', 'fc0b8cec6ab51ccd03a902ec2874aca49c1814cc42464a0a3d3c25b35aa6b204'],
  ],
  [
    specPaths[1],
    [
      'w01-role-dispatch.snapshot',
      '0c2ac77851f57a1fec0e5d6b3959927c7c59646fe485f9dddbf6d1f2e2e4ed1b',
    ],
  ],
  [
    specPaths[2],
    ['w01-progress.snapshot', 'c023d6c5ba9b65dc49e5d63e1690e8fa9e0b46f950052f13dd157b7aeebd4481'],
  ],
])
const exec = promisify(execFile)
const git = async (cwd, ...args) =>
  (
    await exec(
      'git',
      [
        '-c',
        'core.hooksPath=/dev/null',
        '-c',
        'core.fsmonitor=false',
        '-c',
        'core.autocrlf=false',
        ...args,
      ],
      {
        cwd,
        encoding: 'utf8',
        env: {
          ...process.env,
          GIT_CONFIG_NOSYSTEM: '1',
          GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
        },
      },
    )
  ).stdout.trim()

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'frade-review-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await git(root, 'init', '-b', 'codex/frade-standard-workflow')
  await git(root, 'config', 'user.name', 'Fixture')
  await git(root, 'config', 'user.email', 'fixture@example.invalid')
  const copy = async (relative) => {
    const [snapshot, expected] = authoritySnapshots.get(relative)
    const bytes = await readFile(new URL(snapshot, fixtureRoot))
    assert.equal(hash(bytes), expected, `approved source fixture ${relative}`)
    await mkdir(join(root, relative, '..'), { recursive: true })
    await writeFile(join(root, relative), bytes)
    return bytes
  }
  const design = await copy(designPath)
  const policy = await copy(policyPath)
  const decision = await copy(decisionPath)
  const approval = await copy(approvalPath)
  await copy(proposalPath)
  await copy(tasksPath)
  for (const path of specPaths) await copy(path)
  await writeFile(join(root, 'AGENTS.md'), '# Fixture owner\n')
  await mkdir(join(root, 'docs/engineering'), { recursive: true })
  await writeFile(join(root, 'docs/engineering/BRANCH-STATUS.md'), '# Current status\n')
  await git(root, 'add', '.')
  await git(root, 'commit', '-m', 'fixture origin')
  const manifest = baseManifest()
  manifest.owner = {
    branch: 'codex/frade-standard-workflow',
    worktree: root.replaceAll('\\', '/'),
    gitCommon: join(root, '.git').replaceAll('\\', '/'),
  }
  manifest.originalBaseline = await git(root, 'rev-parse', 'HEAD')
  manifest.policy = {
    version: '1.1',
    release: 'a3ac63b52187e1f45f08b6d0beffcd67425c491d8ae1ac5d0d0efd3832e73fd0',
    sha256: hash(policy),
    artifact: policyPath,
  }
  manifest.stages[0].roleAssignments = [
    { role: 'independent-PRE', model: 'gpt-6-astra', effort: 'xhigh' },
    { role: 'independent-POST', model: 'gpt-6-astra', effort: 'xhigh' },
  ]
  manifest.stages[0].taskOverrides = []
  manifest.stages[0].roleAuthority = {
    path: designPath,
    hash: hash(design),
    revision: 'D03',
    decision: { path: approvalPath, sha256: hash(approval) },
  }
  const request = {
    phase: 'POST',
    stage: 'W01',
    task: '2.5',
    taskType: 'independent-POST',
    role: 'independent-POST',
    change: 'frade-standard-workflow',
    scope: 'Focused task 2.5 diagnostic only',
    focused: true,
    paths: [
      'AGENTS.md',
      proposalPath,
      designPath,
      tasksPath,
      ...specPaths,
      policyPath,
      decisionPath,
      approvalPath,
      'docs/engineering/BRANCH-STATUS.md',
    ],
    prompt: 'Review the focused task 2.5 diagnostic. Return one GATE_STATUS line.',
  }
  return { root, manifest, request, design, policy, decision, approval }
}

const complete = (status = 'PASS') => ({
  events:
    [
      { type: 'thread.started', thread_id: 'fixture-thread' },
      { type: 'turn.started' },
      { type: 'item.completed', item: { type: 'agent_message', text: `GATE_STATUS: ${status}` } },
      { type: 'turn.completed' },
    ]
      .map((e) => JSON.stringify(e))
      .join('\n') + '\n',
  report: `GATE_STATUS: ${status}\n`,
  stderr: '',
  exit: status === 'PASS' ? 0 : 1,
  canary: 'PASS',
  runtime: '/mnt/c/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z/linux-runtime',
  version: '0.159.3',
})
const run = (input, fixture) =>
  api.runFixtureReview({ ...input, fixtureTransport: api.createFixtureTransport(fixture) })

test('approved W01 raw source, D03, decision and exact role resolve; illustrative manifest alone does not', async (t) => {
  const f = await fixture(t)
  const prepared = await api.prepareReview({ ...f, request: f.request })
  assert.equal(prepared.status, 'READY', JSON.stringify(prepared))
  const wrong = structuredClone(f.manifest)
  wrong.stages[0].roleAuthority = undefined
  assert.equal(
    (await api.prepareReview({ ...f, manifest: wrong, request: f.request })).status,
    'BLOCKED',
  )
})

test('canonical owner fields are required on every host', async (t) => {
  const f = await fixture(t)
  assert.equal((await api.prepareReview({ ...f, request: f.request })).status, 'READY')
  for (const field of ['worktree', 'gitCommon']) {
    const manifest = structuredClone(f.manifest)
    manifest.owner[field] = manifest.owner[field].replaceAll('/', '\\')
    const result = await api.prepareReview({ ...f, manifest, request: f.request })
    assert.match(result.code, /REVIEW_MANIFEST:.*OWNER_PATH/)
  }
})

test('second direction resolves its own approved stage pair; request metadata cannot grant approval', async (t) => {
  const f = await fixture(t)
  const sourcePath = 'docs/engineering/roles.md'
  const decisionPath = 'docs/engineering/approval.md'
  const source = '| S02 | independent-POST | gpt-5.5 | high |\n'
  const decision = 'Direct owner approval for S02 independent-POST gpt-5.5/high\n'
  await writeFile(join(f.root, sourcePath), source)
  await writeFile(join(f.root, decisionPath), decision)
  await git(f.root, 'add', '.')
  await git(f.root, 'commit', '-m', 'second direction approved source')
  await git(f.root, 'branch', '-m', 'codex/second-direction')
  const manifest = structuredClone(f.manifest)
  manifest.id = 'second-direction'
  manifest.owner.branch = 'codex/second-direction'
  manifest.stages[0].id = 'S02'
  manifest.stages[0].change = 'second-direction'
  manifest.scope.planningAllowed.push('openspec/changes/second-direction/**')
  manifest.scope.closure.archiveOwner = 'second-direction'
  manifest.scope.closure.archiveDestination =
    'openspec/changes/archive/<actual-archive-date>-second-direction/**'
  manifest.stages[0].roleAuthority = {
    path: sourcePath,
    hash: hash(source),
    revision: 'S02-approved',
    decision: { path: decisionPath, sha256: hash(decision) },
  }
  manifest.stages[0].roleAssignments = [
    { role: 'independent-POST', model: 'gpt-5.5', effort: 'high' },
  ]
  manifest.originalBaseline = await git(f.root, 'rev-parse', 'HEAD')
  const request = {
    ...f.request,
    change: 'second-direction',
    stage: 'S02',
    task: '3.1',
    paths: [...f.request.paths, sourcePath, decisionPath],
  }
  const authority = createRoleAuthority({
    bindings: [
      { path: sourcePath, sha256: hash(source), revision: 'S02-approved' },
      { path: decisionPath, sha256: hash(decision), revision: 'S02-approved' },
    ],
    verifyApproval: async ({ assignment, rawDecision }) =>
      rawDecision.bytes.toString('utf8') === decision &&
      assignment.model === 'gpt-5.5' &&
      assignment.effort === 'high',
  })
  const admission = api.createReviewAdmission({
    authority,
    policySha256: hash(f.policy),
    allowedPaths: ['AGENTS.md', ...manifest.scope.allowed],
    requiredPaths: [sourcePath, decisionPath],
    verifyPlan: async ({ reader }) => (await reader.read(decisionPath)).sha256 === hash(decision),
  })
  const ready = await api.prepareReview({ ...f, manifest, request, admission })
  assert.equal(ready.status, 'READY', JSON.stringify(ready))
  assert.equal(ready.assignment.model, 'gpt-5.5')
  assert.equal(ready.assignment.effort, 'high')
  const received = await run({ ...f, manifest, request, admission }, complete())
  assert.equal(received.status, 'PASS', JSON.stringify(received))
  assert.equal(received.closureAuthorized, false)
  assert.equal(received.assignment.stage, 'S02')
  assert.equal(received.actualBackend, 'NOT_CONFIRMED')
  assert.equal(received.actualEffort, 'NOT_CONFIRMED')
  assert.equal((await api.prepareReview({ ...f, manifest, request })).status, 'BLOCKED')
  assert.equal(
    (await api.prepareReview({ ...f, manifest, request, admission: { approved: true } })).status,
    'BLOCKED',
  )
  assert.equal(
    (await api.prepareReview({ ...f, manifest, request: { ...request, approved: true } })).status,
    'BLOCKED',
  )
  assert.equal(
    (
      await api.prepareReview({
        ...f,
        manifest,
        request: { ...request, approval: { approved: true } },
        admission,
      })
    ).status,
    'BLOCKED',
  )
  const widened = structuredClone(manifest)
  widened.scope.allowed.push('other-owner/**')
  assert.equal(
    (await api.prepareReview({ ...f, manifest: widened, request, admission })).status,
    'BLOCKED',
  )
  await writeFile(join(f.root, sourcePath), '| S02 | independent-POST | gpt-6-astra | xhigh |\n')
  assert.equal((await api.prepareReview({ ...f, manifest, request, admission })).status, 'BLOCKED')
})

test('missing or stale plan, role ambiguity, range, source drift and request self approval block', async (t) => {
  const f = await fixture(t)
  for (const change of [
    (x) => {
      x.manifest.stages[0].roleAssignments = []
    },
    (x) => {
      x.manifest.stages[0].roleAssignments.push({ ...x.manifest.stages[0].roleAssignments[1] })
    },
    (x) => {
      x.manifest.stages[0].roleAssignments[1].effort = 'high/xhigh'
    },
    (x) => {
      x.manifest.stages[0].roleAuthority.hash = '0'.repeat(64)
    },
    (x) => {
      x.request.approved = true
      x.request.reviewPolicy = { model: 'gpt-6-sol', reasoningEffort: 'high' }
    },
  ]) {
    const input = {
      ...f,
      manifest: structuredClone(f.manifest),
      request: structuredClone(f.request),
    }
    change(input)
    assert.equal((await api.prepareReview(input)).status, 'BLOCKED')
  }
})

test('foreign source is rejected before reading artifacts', async (t) => {
  const f = await fixture(t)
  const input = { ...f, request: { ...f.request, paths: ['../foreign/secret'] } }
  assert.equal((await api.prepareReview(input)).code, 'REVIEW_SOURCE')
})

test('credentials, unsafe paths, foreign paths and oversized packets block preparation', async (t) => {
  const f = await fixture(t)
  for (const path of ['.env', '.aws/credentials', '../foreign', 'other-owner/file.md']) {
    const input = { ...f, request: { ...f.request, paths: [...f.request.paths, path] } }
    assert.equal((await api.prepareReview(input)).status, 'BLOCKED')
  }
  const credential = 'docs/engineering/secret.md'
  // Assemble this known-fake credential only in the disposable Git fixture.
  const credentialBytes = `${['pass', 'word'].join('')} = "${['abcdefghijklmnop', '123456'].join('')}"\n`
  assert.equal(
    hash(credentialBytes),
    'c647dcfb1b98dc7a1ab6701acf02335b9965b314f107ab016ef8fa18414005f0',
  )
  await writeFile(join(f.root, credential), credentialBytes)
  assert.equal(await readFile(join(f.root, credential), 'utf8'), credentialBytes)
  const credentialResult = await api.prepareReview({
    ...f,
    request: {
      ...f.request,
      paths: [...f.request.paths, credential],
    },
  })
  assert.equal(credentialResult.status, 'BLOCKED')
  assert.equal(credentialResult.code, 'REVIEW_CREDENTIAL')
  assert.equal(
    (await api.prepareReview({ ...f, maxPacketBytes: 1, request: f.request })).status,
    'BLOCKED',
  )
})

test('public review test source is safe in the complete packet', async (t) => {
  const f = await fixture(t)
  const testPath = 'tests/directions/review.test.mjs'
  const source = await readFile(new URL('./review.test.mjs', import.meta.url))
  await mkdir(join(f.root, 'tests/directions'), { recursive: true })
  await writeFile(join(f.root, testPath), source)
  await git(f.root, 'add', testPath)
  await git(f.root, 'commit', '-m', 'public review test source')
  f.manifest.originalBaseline = await git(f.root, 'rev-parse', 'HEAD')
  const request = { ...f.request, paths: [...f.request.paths, testPath] }
  const prepared = await api.prepareReview({ ...f, request })
  assert.equal(prepared.status, 'READY', JSON.stringify(prepared))
  assert.equal(prepared.files.find((file) => file.path === testPath)?.sha256, hash(source))
})

test('wrong common, branch, source or owner registration blocks', async (t) => {
  const f = await fixture(t)
  for (const mutation of [
    (x) => {
      x.manifest.owner.gitCommon = join(x.root, 'other.git')
    },
    (x) => {
      x.manifest.owner.branch = 'codex/other'
    },
    (x) => {
      x.request.change = 'other'
    },
    (x) => {
      x.manifest.owner.worktree = join(x.root, 'other')
    },
    (x) => {
      x.manifest.scope.allowed.push('other-owner/**')
    },
  ]) {
    const input = {
      ...f,
      manifest: structuredClone(f.manifest),
      request: structuredClone(f.request),
    }
    mutation(input)
    assert.equal((await api.prepareReview(input)).status, 'BLOCKED')
  }
})

test('snapshot binds source, tracked status, raw index bytes and HEAD', async (t) => {
  for (const mutate of [
    (root) => writeFile(join(root, 'AGENTS.md'), '# changed\n'),
    (root) => writeFile(join(root, 'docs/engineering/BRANCH-STATUS.md'), '# changed\n'),
    (root) => writeFile(join(root, '.git/index'), Buffer.from('modified index')),
    (root) => writeFile(join(root, '.git/HEAD'), 'ref: refs/heads/other\n'),
  ]) {
    const f = await fixture(t)
    const before = await api.snapshotCandidate(f.root)
    await mutate(f.root)
    const after = await api.snapshotCandidate(f.root).catch(() => ({ digest: 'UNAVAILABLE' }))
    assert.match(before.digest, /^[a-f0-9]{64}$/)
    assert.notEqual(after.digest, before.digest)
  }
})

test('complete PASS and FAIL are distinct from BLOCKED; focused PASS cannot close stage', async (t) => {
  const f = await fixture(t)
  for (const verdict of ['PASS', 'FAIL']) {
    const result = await run({ ...f, request: f.request }, complete(verdict))
    assert.equal(result.status, verdict, JSON.stringify(result))
    assert.equal(result.closureAuthorized, false)
    assert.match(result.raw.events.sha256, /^[a-f0-9]{64}$/)
    assert.match(result.raw.report.sha256, /^[a-f0-9]{64}$/)
    assert.equal(hash(await readFile(result.raw.events.path)), result.raw.events.sha256)
    assert.equal(hash(await readFile(result.raw.report.path)), result.raw.report.sha256)
  }
})

test('a real candidate status mutation blocks and retains the common freeze marker', async (t) => {
  const f = await fixture(t)
  const result = await run(
    { ...f, request: f.request },
    { ...complete(), mutateCandidate: 'status' },
  )
  assert.equal(result.status, 'BLOCKED')
  assert.equal(result.code, 'REVIEW_MUTATION')
  const lock = join(f.root, '.git/frade-workflow/freeze/frade-standard-workflow.json')
  assert.match(await readFile(lock, 'utf8'), /snapshotSha256/)
})

test('incomplete, error, timeout, ambiguous and differing final agent message block', async (t) => {
  const f = await fixture(t)
  const variants = [
    { ...complete(), events: JSON.stringify({ type: 'thread.started', thread_id: 'x' }) + '\n' },
    { ...complete(), events: complete().events.replace('"turn.completed"', '"turn.failed"') },
    { ...complete(), timedOut: true },
    { ...complete(), report: 'GATE_STATUS: PASS\nGATE_STATUS: FAIL\n' },
    { ...complete(), events: complete().events.replace('GATE_STATUS: PASS', 'GATE_STATUS: FAIL') },
    { ...complete(), events: complete().events.replace('{"type":"turn.completed"}\n', '') },
  ]
  for (const fixture of variants)
    assert.equal((await run({ ...f, request: f.request }, fixture)).status, 'BLOCKED')
})

test('canary, runtime, version, control, request, candidate and packet drift block', async (t) => {
  const f = await fixture(t)
  for (const delta of [
    { canary: 'FAIL' },
    { runtime: '/tmp/unverified' },
    { version: '0.0.0' },
    { policyDrift: true },
    { controlDrift: true },
    { requestDrift: true },
    { candidateDrift: true },
    { packetDrift: true },
  ])
    assert.equal(
      (await run({ ...f, request: f.request }, { ...complete(), ...delta })).status,
      'BLOCKED',
    )
})

test('strict validation requires both exact actual commands, clean exits and current source binding', () => {
  const snapshotSha256 = 'a'.repeat(64)
  const toolchain = {
    node: '/trusted/node',
    nodeSha256: 'b'.repeat(64),
    packageRoot: '/trusted/openspec',
    packageSha256: 'c'.repeat(64),
    entry: '/trusted/openspec/bin/openspec.js',
    entrySha256: 'd'.repeat(64),
    packageName: '@fission-ai/openspec',
    version: '1.14.0',
    discovery: { source: 'OWNER_LOCAL' },
  }
  const output = (change) =>
    JSON.stringify({
      items: [{ id: change, type: 'change', valid: true, issues: [] }],
      summary: { totals: { items: 1, passed: 1, failed: 0 } },
      version: '1.0',
    })
  const records = [
    ['validate', 'frade-standard-workflow', '--strict', '--json'],
    ['validate', '--all', '--strict', '--json'],
  ].map((args) => ({
    command: 'openspec',
    args,
    launcher: toolchain.node,
    launchArgs: [toolchain.entry, ...args],
    toolchain,
    snapshotSha256,
    exit: 0,
    timedOut: false,
    stdout: output('frade-standard-workflow'),
    stderr: '',
    stdoutSha256: hash(output('frade-standard-workflow')),
    stderrSha256: hash(''),
  }))
  assert.equal(api.verifyStrictValidation(records, snapshotSha256), true)
  const second = records.map((record) => ({ ...record, args: [...record.args] }))
  second[0].args[1] = 'second-direction'
  second[0].launchArgs = [toolchain.entry, ...second[0].args]
  for (const record of second) {
    record.stdout = output('second-direction')
    record.stdoutSha256 = hash(record.stdout)
  }
  assert.equal(api.verifyStrictValidation(second, snapshotSha256, 'second-direction'), true)
  assert.equal(api.verifyStrictValidation(second, snapshotSha256), false)
  assert.equal(api.verifyStrictValidation(records.slice(0, 1), snapshotSha256), false)
  assert.equal(api.verifyStrictValidation(records, 'b'.repeat(64)), false)
  assert.equal(
    api.verifyStrictValidation([{ ...records[0], exit: 1 }, records[1]], snapshotSha256),
    false,
  )
  assert.equal(
    api.verifyStrictValidation([{ ...records[0], timedOut: true }, records[1]], snapshotSha256),
    false,
  )
  assert.equal(
    api.verifyStrictValidation([{ ...records[0], stdout: 'stale' }, records[1]], snapshotSha256),
    false,
  )
  assert.equal(
    api.verifyStrictValidation(
      [{ ...records[0], toolchain: { ...toolchain, version: '0.0.0' } }, records[1]],
      snapshotSha256,
    ),
    false,
  )
  const incomplete = { ...records[1], stdout: '{"items":[]}', stdoutSha256: hash('{"items":[]}') }
  assert.equal(api.verifyStrictValidation([records[0], incomplete], snapshotSha256), false)
})

test('strict validation launches the discovered public Node entry and binds semantic results', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'frade-public-cli-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const bin = join(root, 'npm')
  const pkg = join(bin, 'node_modules/@fission-ai/openspec')
  await mkdir(join(pkg, 'bin'), { recursive: true })
  await writeFile(
    join(bin, process.platform === 'win32' ? 'openspec.cmd' : 'openspec'),
    'public shim\n',
  )
  await writeFile(
    join(pkg, 'package.json'),
    JSON.stringify({
      name: '@fission-ai/openspec',
      version: '1.14.0',
      type: 'module',
      bin: { openspec: './bin/openspec.js' },
    }),
  )
  await writeFile(
    join(pkg, 'bin/openspec.js'),
    `#!/usr/bin/env node
import { writeSync } from 'node:fs'
const args = process.argv.slice(2)
const change = args[1] === '--all' ? 'other-change' : args[1]
const items = args[1] === '--all'
  ? [{ id: 'other-change', type: 'change', valid: true, issues: [] }, { id: 'second-direction', type: 'change', valid: true, issues: [] }]
  : [{ id: change, type: 'change', valid: true, issues: [] }]
writeSync(1, JSON.stringify({ items, summary: { totals: { items: items.length, passed: items.length, failed: 0 } }, version: '1.0' }) + '\\n')
`,
  )
  const previous = process.env.PATH
  process.env.PATH = bin
  t.after(() => {
    process.env.PATH = previous
  })
  const run = join(root, 'receipts')
  await mkdir(run)
  const records = await api
    .runStrictValidation(root, run, 'a'.repeat(64), 'second-direction')
    .catch(async (error) => {
      assert.fail(
        `${error.message}: ${await readFile(join(run, 'strict-1.json'), 'utf8')} ${await readFile(join(run, 'strict-2.json'), 'utf8')}`,
      )
    })
  assert.equal(records.length, 2)
  assert.equal(records[0].args[1], 'second-direction')
  assert.equal(records[0].launcher, process.execPath)
  assert.equal(records[0].launchArgs[0], join(pkg, 'bin/openspec.js'))
  assert.equal(records[0].toolchain.version, '1.14.0')
  assert.equal(api.verifyStrictValidation(records, 'a'.repeat(64), 'second-direction'), true)
  assert.equal(await api.strictToolchainUnchanged(root, records), true)
  assert.equal(
    api.verifyStrictValidation(
      [{ ...records[0], launchArgs: ['wrong'] }, records[1]],
      'a'.repeat(64),
      'second-direction',
    ),
    false,
  )
  assert.equal(
    api.verifyStrictValidation(
      [{ ...records[0], command: 'other' }, records[1]],
      'a'.repeat(64),
      'second-direction',
    ),
    false,
  )
  assert.equal(
    api.verifyStrictValidation(
      [{ ...records[0], stdout: '{"items":[]}' }, records[1]],
      'a'.repeat(64),
      'second-direction',
    ),
    false,
  )
  assert.equal(
    api.verifyStrictValidation(
      [{ ...records[0], stdout: '{"items":[]}', stdoutSha256: hash('{"items":[]}') }, records[1]],
      'a'.repeat(64),
      'second-direction',
    ),
    false,
  )
  await writeFile(
    join(pkg, 'bin/openspec.js'),
    `import { writeSync } from 'node:fs'
writeSync(1, 'failed stdout\\n')
writeSync(2, 'failed stderr\\n')
process.exit(1)
`,
  )
  assert.equal(await api.strictToolchainUnchanged(root, records), false)
  const failedRun = join(root, 'failed-receipts')
  await mkdir(failedRun)
  await assert.rejects(
    api.runStrictValidation(root, failedRun, 'a'.repeat(64), 'second-direction'),
    /REVIEW_STRICT_VALIDATION/,
  )
  const failed = JSON.parse(await readFile(join(failedRun, 'strict-1.json'), 'utf8'))
  assert.equal(failed.exit, 1)
  assert.equal(failed.stdout, 'failed stdout\n')
  assert.equal(failed.stderr, 'failed stderr\n')
  const secondBin = join(root, 'other-npm')
  const secondPkg = join(secondBin, 'node_modules/@fission-ai/openspec')
  await mkdir(join(secondPkg, 'bin'), { recursive: true })
  await writeFile(
    join(secondBin, process.platform === 'win32' ? 'openspec.cmd' : 'openspec'),
    'second public shim\n',
  )
  await writeFile(join(secondPkg, 'package.json'), await readFile(join(pkg, 'package.json')))
  await writeFile(join(secondPkg, 'bin/openspec.js'), await readFile(join(pkg, 'bin/openspec.js')))
  process.env.PATH = [bin, secondBin].join(process.platform === 'win32' ? ';' : ':')
  await assert.rejects(
    api.runStrictValidation(root, run, 'a'.repeat(64), 'second-direction'),
    /REVIEW_TOOLCHAIN_AMBIGUOUS/,
  )
  process.env.PATH = join(root, 'empty')
  await assert.rejects(
    api.runStrictValidation(root, run, 'a'.repeat(64), 'second-direction'),
    /REVIEW_TOOLCHAIN_UNKNOWN/,
  )
})

test('approved proposal and task source omissions or drift block', async (t) => {
  const f = await fixture(t)
  assert.equal(
    (
      await api.prepareReview({
        ...f,
        request: {
          ...f.request,
          paths: f.request.paths.filter((x) => x !== proposalPath),
        },
      })
    ).status,
    'BLOCKED',
  )
  await writeFile(join(f.root, proposalPath), '# Changed proposal\n')
  assert.equal((await api.prepareReview({ ...f, request: f.request })).status, 'BLOCKED')
})

test('raw external request is retained exactly and any later byte drift blocks', async (t) => {
  const f = await fixture(t)
  const external = await mkdtemp(join(tmpdir(), 'frade-request-test-'))
  t.after(() => rm(external, { recursive: true, force: true }))
  const requestPath = join(external, 'request.json')
  const original = JSON.stringify(f.request, null, 2) + '\n'
  await writeFile(requestPath, original)
  const pass = await run({ ...f, request: f.request, requestPath }, complete())
  assert.equal(pass.status, 'PASS', JSON.stringify(pass))
  assert.equal(await readFile(join(pass.run, 'external-request.raw.json'), 'utf8'), original)
  const blocked = await run(
    { ...f, request: f.request, requestPath },
    {
      ...complete(),
      mutateRequestFile: true,
    },
  )
  assert.equal(blocked.status, 'BLOCKED')
})
