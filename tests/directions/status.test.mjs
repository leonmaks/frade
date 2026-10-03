import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { manifest } from './fixtures.mjs'
import { validateManifest } from '../../scripts/directions/contracts.mjs'
import { createArtifactReader, createEvidenceBoundary } from '../../scripts/directions/evidence.mjs'
import {
  HEADINGS,
  LEGACY_BOUNDARY,
  parseStatus,
  parseTasks,
  projectStatus,
  renderStatus,
  refreshStatus,
} from '../../scripts/directions/status.mjs'

const sha = (x) => createHash('sha256').update(x).digest('hex')
const canonical = (x) => x.replaceAll('\\', '/')
const git = (cwd, ...args) => {
  const r = spawnSync('git', ['-c', 'core.autocrlf=false', '-c', 'core.longpaths=true', ...args], {
    cwd,
    encoding: 'utf8',
  })
  assert.equal(r.status, 0, r.stderr)
  return r.stdout.trim()
}
const trace = (source, config, artifact) => ({
  requirements: [
    { id: 'FWE-014', critical: true, scenarioIds: ['FWE-014-S01', 'FWE-014-S02', 'FWE-014-S03'] },
  ],
  scenarios: [
    {
      id: 'FWE-014-S01',
      requirementId: 'FWE-014',
      control: 'positive',
      taskIds: ['2.4'],
      assertionIds: ['A-P'],
    },
    {
      id: 'FWE-014-S02',
      requirementId: 'FWE-014',
      control: 'negative',
      taskIds: ['2.4'],
      assertionIds: ['A-N'],
    },
    {
      id: 'FWE-014-S03',
      requirementId: 'FWE-014',
      control: 'boundary',
      taskIds: ['2.4'],
      assertionIds: ['A-B'],
    },
    {
      id: 'FWE-014-S04',
      requirementId: 'FWE-014',
      control: 'human',
      taskIds: ['2.4'],
      boundaryReason: 'A human must approve the actual visual presentation.',
    },
  ],
  tasks: [{ id: '2.4', scenarioIds: ['FWE-014-S01', 'FWE-014-S02', 'FWE-014-S03', 'FWE-014-S04'] }],
  assertions: [
    { id: 'A-P', runId: 'RUN-1' },
    { id: 'A-N', runId: 'RUN-1' },
    { id: 'A-B', runId: 'RUN-1' },
  ],
  runs: [
    {
      id: 'RUN-1',
      kind: 'run',
      status: 'PASS',
      complete: true,
      scope: 'full',
      sourceSha256: source,
      configSha256: config,
      environment: 'node fixture',
      bindings: { sourceSha256: source, configSha256: config },
      artifact,
    },
  ],
})
const fixture = () => {
  const m = manifest()
  m.id = 'alpha-direction'
  m.title = 'Alpha direction'
  m.owner.branch = 'codex/alpha-direction'
  m.stages[0].change = 'alpha-direction'
  m.stages[0].id = 'S01'
  m.stages[0].phase = 'INTAKE'
  m.stages[0].health = 'BLOCKED'
  m.scope.closure.archiveOwner = 'alpha-direction'
  m.scope.closure.specDestinations = ['openspec/specs/alpha-direction/spec.md']
  m.scope.closure.archiveDestination =
    'openspec/changes/archive/<actual-archive-date>-alpha-direction/**'
  m.scope.planningAllowed = [
    'openspec/changes/alpha-direction/**',
    'docs/engineering/BRANCH-STATUS.md',
  ]
  return m
}
const input = (over = {}) => {
  const source = sha('source'),
    config = sha('config')
  return {
    manifest: fixture(),
    tasksText: '- [x] 2.4 Dashboard controls\n- [ ] 2.5 Review wrapper\n',
    trace: trace(source, config, { path: 'runs/raw.json', sha256: sha('raw') }),
    snapshot: { sourceSha256: source, configSha256: config },
    updatedAt: '2026-10-03T12:00:00.000Z',
    ...over,
  }
}

test('FWE-013-A01 exact current headings, order, duplicate and injection rejection', () => {
  const text = '# x\n\n' + HEADINGS.map((x) => `${x}\n\nbody\n`).join('\n')
  assert.equal(parseStatus(text).sections.length, 8)
  assert.throws(
    () => parseStatus(text.replace(HEADINGS[2], HEADINGS[1])),
    /SECTION_ORDER|SECTION_DUPLICATE/,
  )
  assert.throws(() => parseStatus(text + `\n${HEADINGS[0]}\n`), /SECTION_DUPLICATE/)
  assert.throws(() => parseStatus(text.replace('body', '## 9. Injected')), /SECTION_UNKNOWN/)
})
test('FWE-014-A01 stable checklist ids and administrative counts', () => {
  assert.deepEqual(
    parseTasks('- [x] 2.4 Done\n- [ ] 2.5 Open\n').map((x) => [x.id, x.complete]),
    [
      ['2.4', true],
      ['2.5', false],
    ],
  )
  assert.throws(() => parseTasks('- [x] 2.4 One\n- [ ] 2.4 Two'), /TASK_DUPLICATE/)
  assert.throws(() => parseTasks('- [x] wrong Missing stable id'), /TASK_MALFORMED/)
  assert.throws(() => parseTasks('- [z] 2.4 Invalid checkbox'), /TASK_MALFORMED/)
})
test('FWE-014-A02 current source-bound proof only; human boundary never accepted', async () => {
  const x = input()
  let p = await projectStatus(x)
  assert.deepEqual(p.metrics.tasks, { complete: 1, total: 2, remaining: 1 })
  assert.equal(p.metrics.requirements.accepted, 0)
  assert.equal(p.readyForArchive, false)
  const boundary = createEvidenceBoundary({
    verify: async (kind, ref, expected) =>
      kind === 'run' &&
      ref.id === 'RUN-1' &&
      ref.artifact.sha256 === sha('raw') &&
      Object.entries(expected).every(([k, v]) => ref.bindings[k] === v),
  })
  p = await projectStatus({ ...x, boundary })
  assert.equal(p.metrics.requirements.accepted, 0)
  assert.deepEqual(p.metrics.scenarios, {
    executed: 3,
    total: 4,
    negativeExecuted: 1,
    boundaryExecuted: 1,
    humanPending: 1,
  })
  const executable = {
    ...x.trace,
    scenarios: x.trace.scenarios.slice(0, 3),
    tasks: [{ id: '2.4', scenarioIds: ['FWE-014-S01', 'FWE-014-S02', 'FWE-014-S03'] }],
  }
  assert.equal(
    (await projectStatus({ ...x, trace: executable, boundary })).metrics.requirements.accepted,
    1,
  )
  for (const altered of [
    { snapshot: { sourceSha256: sha('new'), configSha256: x.snapshot.configSha256 } },
    { trace: { ...x.trace, runs: [{ ...x.trace.runs[0], status: 'FAIL' }] } },
    {
      trace: {
        ...x.trace,
        runs: [
          { ...x.trace.runs[0], artifact: { ...x.trace.runs[0].artifact, sha256: sha('forged') } },
        ],
      },
    },
    { boundary: undefined },
  ]) {
    const q = await projectStatus({ ...x, boundary, ...altered })
    assert.equal(q.metrics.requirements.accepted, 0)
    assert.equal(q.readyForArchive, false)
  }
})
test('FWE-014-A03 contradictory phase/health and applicability block', async () => {
  const x = input()
  x.manifest.stages[0].phase = 'CLOSED'
  x.manifest.stages[0].health = 'PASS'
  x.checks = [
    {
      id: 'routing',
      contract: 'routing',
      applicability: 'NOT_APPLICABLE',
      reason: 'No routing contract is changed in this stage.',
      status: 'FAIL',
    },
  ]
  const p = await projectStatus(x)
  assert.equal(p.readyForArchive, false)
  assert.ok(p.issues.some((i) => i.code === 'PHASE_PROOF'))
  assert.ok(p.issues.some((i) => i.code === 'FALSE_NOT_APPLICABLE'))
})
test('FWE-014-A04 raw artifact bytes bind every executable assertion', async () => {
  const root = mkdtempSync(join(tmpdir(), 'frade-raw-'))
  mkdirSync(join(root, 'runs'))
  const raw = JSON.stringify({
    id: 'RUN-1',
    status: 'PASS',
    complete: true,
    assertions: ['A-P', 'A-N', 'A-B'],
  })
  writeFileSync(join(root, 'runs/raw.json'), raw)
  const reader = createArtifactReader(root)
  const x = input()
  x.trace.scenarios = x.trace.scenarios.slice(0, 3)
  x.trace.tasks[0].scenarioIds = x.trace.scenarios.map((s) => s.id)
  x.trace.runs[0].artifact.sha256 = sha(raw)
  const boundary = createEvidenceBoundary({
    verify: async (kind, ref, expected) => {
      const artifact = await reader.read(ref.artifact.path)
      const actual = JSON.parse(artifact.bytes.toString('utf8'))
      return (
        kind === 'run' &&
        artifact.sha256 === ref.artifact.sha256 &&
        actual.id === ref.id &&
        actual.status === 'PASS' &&
        actual.complete === true &&
        x.trace.assertions.every((a) => actual.assertions.includes(a.id)) &&
        Object.entries(expected).every(([key, value]) => ref.bindings[key] === value)
      )
    },
  })
  assert.equal((await projectStatus({ ...x, boundary })).metrics.requirements.accepted, 1)
  writeFileSync(
    join(root, 'runs/raw.json'),
    JSON.stringify({
      id: 'RUN-1',
      status: 'FAIL',
      complete: true,
      assertions: ['A-P', 'A-N', 'A-B'],
    }),
  )
  assert.equal((await projectStatus({ ...x, boundary })).metrics.requirements.accepted, 0)
})
test('FWE-014-A05 required check PASS needs trusted bound raw receipt', async () => {
  const x = input()
  const run = {
    kind: 'check',
    status: 'PASS',
    complete: true,
    scope: 'full',
    artifact: { path: 'runs/check.json', sha256: sha('check raw') },
    bindings: { sourceSha256: x.snapshot.sourceSha256, configSha256: x.snapshot.configSha256 },
  }
  const checks = [
    {
      id: 'control',
      contract: 'workflow',
      applicability: 'REQUIRED',
      status: 'PASS',
      verified: true,
      run,
    },
  ]
  assert.equal((await projectStatus({ ...x, checks })).metrics.checks.complete, 0)
  const boundary = createEvidenceBoundary({
    verify: async (kind, ref, expected) =>
      kind === 'check' &&
      ref.artifact.sha256 === sha('check raw') &&
      Object.entries(expected).every(([key, value]) => ref.bindings[key] === value),
  })
  assert.equal((await projectStatus({ ...x, checks, boundary })).metrics.checks.complete, 1)
  assert.equal(
    (
      await projectStatus({
        ...x,
        checks,
        boundary,
        snapshot: { ...x.snapshot, sourceSha256: sha('changed') },
      })
    ).metrics.checks.complete,
    0,
  )
})
test('FWE-013-A02 different directions share exact Russian headings and safe strings', async () => {
  const a = renderStatus(await projectStatus(input()))
  const m = fixture()
  m.id = 'beta-direction'
  m.owner.branch = 'codex/beta-direction'
  m.stages[0].change = 'beta-direction'
  m.scope.closure.archiveOwner = 'beta-direction'
  m.scope.closure.specDestinations = ['openspec/specs/beta-direction/spec.md']
  m.scope.closure.archiveDestination =
    'openspec/changes/archive/<actual-archive-date>-beta-direction/**'
  m.scope.planningAllowed[0] = 'openspec/changes/beta-direction/**'
  m.title = 'Injected | <a href="evil">link</a>\n## 9. fake'
  const b = renderStatus(await projectStatus(input({ manifest: m })))
  assert.deepEqual(
    parseStatus(a).sections.map((s) => s.heading),
    HEADINGS,
  )
  assert.deepEqual(
    parseStatus(b).sections.map((s) => s.heading),
    HEADINGS,
  )
  assert.ok(!b.includes('\n## 9. fake'))
})
const actualOwner = (id = 'alpha-direction') => {
  const base = mkdtempSync(join(tmpdir(), 'frade-status-')),
    root = join(base, 'repo')
  mkdirSync(root)
  git(root, 'init', '-q')
  git(root, 'config', 'user.name', 'Fixture')
  git(root, 'config', 'user.email', 'fixture@example.test')
  writeFileSync(join(root, 'base.txt'), 'base')
  git(root, 'add', 'base.txt')
  git(root, 'commit', '-qm', 'base')
  const common = canonical(join(root, '.git')),
    owner = join(base, id)
  git(root, 'worktree', 'add', '-qb', `codex/${id}`, owner)
  const m = fixture()
  m.id = id
  m.owner.branch = `codex/${id}`
  m.stages[0].change = id
  m.scope.closure.archiveOwner = id
  m.scope.closure.specDestinations = [`openspec/specs/${id}/spec.md`]
  if (id === 'frade-standard-workflow')
    m.scope.closure.specDestinations = manifest().scope.closure.specDestinations
  m.scope.closure.archiveDestination = `openspec/changes/archive/<actual-archive-date>-${id}/**`
  m.scope.planningAllowed[0] = `openspec/changes/${id}/**`
  m.owner.worktree = canonical(owner)
  m.owner.gitCommon = common
  m.originalBaseline = git(owner, 'rev-parse', 'HEAD')
  m.statusPath = `docs/engineering/directions/${id}/DIRECTION-STATUS.md`
  m.scope.planningAllowed.push(m.statusPath)
  const request = {
    schemaVersion: 1,
    id: m.id,
    title: m.title,
    goal: 'Exercise registered status owner',
    users: ['fixture user'],
    outcomes: ['safe status projection'],
    constraints: ['preserve origin'],
    exclusions: ['foreign files'],
    sourceRoot: canonical(root),
    gitCommon: common,
    workspaceParent: canonical(base),
    baseline: m.originalBaseline,
    policy: m.policy,
    publication: {
      remote: 'fixture-origin',
      ref: `refs/heads/codex/${id}`,
      authorization: 'pending human decision',
    },
  }
  const origin = {
    schemaVersion: 2,
    id: m.id,
    branch: m.owner.branch,
    worktree: canonical(owner),
    sourceRoot: canonical(root),
    gitCommon: common,
    workspaceParent: canonical(base),
    baseline: m.originalBaseline,
    policy: m.policy,
    request,
    hash: sha(JSON.stringify(request)),
  }
  mkdirSync(join(common, 'frade-workflow/intents'), { recursive: true })
  writeFileSync(join(common, `frade-workflow/intents/${id}.json`), JSON.stringify(origin))
  writeFileSync(join(common, `frade-workflow/intents/${id}.complete.json`), JSON.stringify(origin))
  mkdirSync(join(owner, `docs/engineering/directions/${id}`), { recursive: true })
  const statusPath = join(owner, m.statusPath)
  return { base, root, common, owner, m, origin, statusPath }
}
test('FWE-013-S02 and FWE-015-S01 actual Git owner, freeze, legacy history, queued panel', async () => {
  const { common, owner, m, origin, statusPath } = actualOwner()
  const legacy = '\n<!-- LEGACY HISTORY: historical only -->\n2025-01-01 FAIL raw old run\n'
  writeFileSync(statusPath, renderStatus(await projectStatus(input({ manifest: m }))) + legacy)
  const before = readFileSync(statusPath, 'utf8')
  mkdirSync(join(common, 'frade-workflow/freeze'), { recursive: true })
  writeFileSync(join(common, 'frade-workflow/freeze/alpha-direction.json'), '{}')
  let result = await refreshStatus({ ...input({ manifest: m }), ownerRoot: owner, write: true })
  assert.equal(result.status, 'FROZEN', JSON.stringify(result))
  assert.equal(readFileSync(statusPath, 'utf8'), before)
  assert.equal(git(owner, 'rev-parse', 'HEAD'), m.originalBaseline)
  assert.equal(git(owner, 'diff', '--cached', '--name-only'), '')
  unlinkSync(join(common, 'frade-workflow/freeze/alpha-direction.json'))
  const receiptPath = 'docs/engineering/directions/alpha-direction/panel-receipt.json'
  const rawReceipt = JSON.stringify({
    state: 'QUEUED',
    owner: m.owner,
    statusPath: m.statusPath,
    event: 'actual-controller-open-request',
  })
  writeFileSync(join(owner, receiptPath), rawReceipt)
  const panelReceipt = {
    state: 'QUEUED',
    owner: m.owner,
    statusPath: m.statusPath,
    artifact: { path: receiptPath, sha256: sha(rawReceipt) },
  }
  const reader = createArtifactReader(owner)
  const { createPanelControllerBoundary } = await import('../../scripts/directions/status.mjs')
  const panelBoundary = createPanelControllerBoundary({
    verify: async (ref, expected) => {
      const artifact = await reader.read(ref.artifact.path)
      const actual = JSON.parse(artifact.bytes.toString('utf8'))
      return (
        artifact.sha256 === ref.artifact.sha256 &&
        actual.event === 'actual-controller-open-request' &&
        actual.state === ref.state &&
        actual.statusPath === expected.statusPath &&
        actual.owner.worktree === expected.owner.worktree &&
        actual.owner.branch === expected.owner.branch &&
        actual.owner.gitCommon === expected.owner.gitCommon
      )
    },
  })
  result = await refreshStatus({
    ...input({ manifest: m }),
    ownerRoot: owner,
    write: true,
    panelReceipt,
    panelBoundary,
  })
  assert.equal(result.status, 'WRITTEN')
  const after = readFileSync(statusPath, 'utf8')
  assert.ok(after.endsWith(legacy))
  assert.ok(after.includes('PANEL_STATE: QUEUED'))
  assert.ok(!after.includes('PANEL_STATE: VISIBLE'))
  assert.deepEqual(
    parseStatus(after).sections.map((s) => s.heading),
    HEADINGS,
  )
  const stale = await refreshStatus({
    ...input({ manifest: m }),
    tasksText: '- [ ] 2.4 Changed task\n',
    ownerRoot: owner,
  })
  assert.equal(stale.previousProjectionStale, true)
  assert.ok(stale.projection.issues.some((i) => i.code === 'STALE_PROJECTION'))
  const old = '# Old owner status\n\n## History\n2025-01-01 FAIL raw historical run\n'
  writeFileSync(statusPath, old)
  const adopted = await refreshStatus({ ...input({ manifest: m }), ownerRoot: owner, write: true })
  assert.equal(adopted.status, 'WRITTEN', JSON.stringify(adopted))
  assert.ok(readFileSync(statusPath, 'utf8').endsWith(`${LEGACY_BOUNDARY}\n${old}`))
  const retained = readFileSync(statusPath, 'utf8')
  writeFileSync(
    join(common, 'frade-workflow/intents/alpha-direction.complete.json'),
    JSON.stringify({ ...origin, baseline: '0'.repeat(40) }),
  )
  const forged = await refreshStatus({ ...input({ manifest: m }), ownerRoot: owner, write: true })
  assert.equal(forged.status, 'BLOCKED')
  assert.equal(readFileSync(statusPath, 'utf8'), retained)
})

test('one direction freeze defers real status write for a distinct owning stage change', async () => {
  const { common, owner, m, statusPath } = actualOwner('alpha-direction')
  m.stages.push({ ...m.stages[0], id: 'B02', change: 'beta-change', dependencies: [] })
  m.scope.planningAllowed.push('openspec/changes/beta-change/**')
  assert.equal(validateManifest(m).ok, true)
  writeFileSync(statusPath, 'ORIGINAL STATUS\n')
  const freeze = join(common, 'frade-workflow/freeze/alpha-direction.json')
  mkdirSync(join(common, 'frade-workflow/freeze'), { recursive: true })
  writeFileSync(
    freeze,
    JSON.stringify({ directionId: m.id, stageId: 'B02', owningChange: 'beta-change' }),
  )
  const result = await refreshStatus({ ...input({ manifest: m }), ownerRoot: owner, write: true })
  assert.equal(result.status, 'FROZEN', JSON.stringify(result))
  assert.equal(readFileSync(statusPath, 'utf8'), 'ORIGINAL STATUS\n')
})

test('FWE-015-S02 actual checkpoint-only change stales the previous projection until refresh', async () => {
  const { owner, m, statusPath } = actualOwner()
  const x = input({ manifest: m })
  const firstHead = git(owner, 'rev-parse', 'HEAD')
  const first = await refreshStatus({ ...x, ownerRoot: owner, write: true })
  assert.equal(first.status, 'WRITTEN', JSON.stringify(first))
  const firstBody = readFileSync(statusPath, 'utf8')
  assert.match(firstBody, new RegExp(`SOURCE_CHECKPOINT_SHA: ${firstHead}`))
  assert.equal(first.projection.actualHead, firstHead)

  writeFileSync(
    join(owner, 'checkpoint-only.txt'),
    'Checkpoint progress without semantic input changes\n',
  )
  git(owner, 'add', 'checkpoint-only.txt')
  git(owner, 'commit', '-qm', 'checkpoint only')
  const secondHead = git(owner, 'rev-parse', 'HEAD')
  assert.notEqual(secondHead, firstHead)
  assert.equal(m.originalBaseline, firstHead)

  const stale = await refreshStatus({ ...x, ownerRoot: owner })
  assert.equal(stale.status, 'PREVIEW', JSON.stringify(stale))
  assert.equal(stale.projection.actualHead, secondHead)
  assert.equal(stale.previousProjectionStale, true)
  assert.ok(stale.projection.issues.some((i) => i.code === 'STALE_PROJECTION'))
  assert.notEqual(stale.projection.sourceInputSha256, first.sourceInputSha256)
  assert.match(stale.body, new RegExp(`SOURCE_CHECKPOINT_SHA: ${secondHead}`))
  assert.equal(readFileSync(statusPath, 'utf8'), firstBody)

  const refreshed = await refreshStatus({ ...x, ownerRoot: owner, write: true })
  assert.equal(refreshed.status, 'WRITTEN', JSON.stringify(refreshed))
  assert.equal(refreshed.sourceInputSha256, stale.projection.sourceInputSha256)
  const current = await refreshStatus({ ...x, ownerRoot: owner })
  assert.equal(current.previousProjectionStale, false)
  assert.ok(!current.projection.issues.some((i) => i.code === 'STALE_PROJECTION'))
  assert.match(readFileSync(statusPath, 'utf8'), new RegExp(`SOURCE_CHECKPOINT_SHA: ${secondHead}`))
})

test('FWE-015 no UI operation and self-declared panel flags remain NOT_OPENED', async () => {
  const x = input()
  const forged = { state: 'VISIBLE', verified: true, statusPath: x.manifest.statusPath }
  for (const overrides of [{}, { panelState: 'QUEUED' }, { panelReceipt: forged }]) {
    const p = await projectStatus({ ...x, ...overrides })
    assert.equal(p.panelState, 'NOT_OPENED')
    assert.match(renderStatus(p), /PANEL_STATE: NOT_OPENED/)
  }
  const { owner, m, statusPath } = actualOwner()
  const written = await refreshStatus({ ...input({ manifest: m }), ownerRoot: owner, write: true })
  assert.equal(written.status, 'WRITTEN', JSON.stringify(written))
  assert.equal(written.panelState, 'NOT_OPENED')
  assert.match(readFileSync(statusPath, 'utf8'), /PANEL_STATE: NOT_OPENED/)
})

test('FWE-015 visible state requires actual trusted controller raw receipt', async () => {
  const { owner, m } = actualOwner()
  const path = 'docs/engineering/directions/alpha-direction/visible-receipt.json'
  const raw = JSON.stringify({ state: 'VISIBLE', owner: m.owner, statusPath: m.statusPath })
  writeFileSync(join(owner, path), raw)
  const reader = createArtifactReader(owner)
  const { createPanelControllerBoundary } = await import('../../scripts/directions/status.mjs')
  const panelBoundary = createPanelControllerBoundary({
    verify: async (receipt, expected) => {
      const artifact = await reader.read(receipt.artifact.path)
      const actual = JSON.parse(artifact.bytes.toString('utf8'))
      return (
        artifact.sha256 === receipt.artifact.sha256 &&
        actual.state === receipt.state &&
        actual.statusPath === expected.statusPath &&
        actual.owner.worktree === expected.owner.worktree &&
        actual.owner.branch === expected.owner.branch &&
        actual.owner.gitCommon === expected.owner.gitCommon
      )
    },
  })
  const panelReceipt = {
    state: 'VISIBLE',
    owner: m.owner,
    statusPath: m.statusPath,
    artifact: { path, sha256: sha(raw) },
    verified: true,
  }
  const x = input({ manifest: m, panelReceipt, panelBoundary })
  assert.equal((await projectStatus(x)).panelState, 'VISIBLE')
  assert.equal(
    (await projectStatus({ ...x, panelReceipt: { ...panelReceipt, state: 'QUEUED' } })).panelState,
    'NOT_OPENED',
  )
  writeFileSync(join(owner, path), JSON.stringify({ ...JSON.parse(raw), state: 'QUEUED' }))
  assert.equal((await projectStatus(x)).panelState, 'NOT_OPENED')
})

test('FWE-013 W01 legacy BRANCH-STATUS remains mapped to its registered origin', async () => {
  const { owner, m } = actualOwner('frade-standard-workflow')
  m.statusPath = 'docs/engineering/BRANCH-STATUS.md'
  m.scope.planningAllowed.push(m.statusPath)
  mkdirSync(join(owner, 'docs/engineering'), { recursive: true })
  writeFileSync(join(owner, m.statusPath), 'W01 historical status\n')
  const result = await refreshStatus({ ...input({ manifest: m }), ownerRoot: owner, write: true })
  assert.equal(result.status, 'WRITTEN', JSON.stringify(result))
  assert.match(readFileSync(join(owner, m.statusPath), 'utf8'), /W01 historical status/)
})

test('FWE-015 freeze arriving during awaited trusted proof defers the write', async () => {
  const { common, owner, m, statusPath } = actualOwner()
  const prior = 'Historical dashboard remains byte-identical\n'
  writeFileSync(statusPath, prior)
  const beforeStatus = git(owner, 'status', '--porcelain')
  const beforeHead = git(owner, 'rev-parse', 'HEAD')
  const freeze = join(common, 'frade-workflow/freeze/alpha-direction.json')
  const boundary = createEvidenceBoundary({
    verify: async () => {
      mkdirSync(join(common, 'frade-workflow/freeze'), { recursive: true })
      writeFileSync(freeze, '{}')
      return true
    },
  })
  const result = await refreshStatus({
    ...input({ manifest: m }),
    ownerRoot: owner,
    write: true,
    boundary,
  })
  assert.equal(result.status, 'FROZEN', JSON.stringify(result))
  assert.equal(readFileSync(statusPath, 'utf8'), prior)
  assert.equal(git(owner, 'status', '--porcelain'), beforeStatus)
  assert.equal(git(owner, 'rev-parse', 'HEAD'), beforeHead)
})

test('one direction freeze blocks status writes for either change in a real Git owner', async () => {
  const { common, owner, m, statusPath } = actualOwner()
  const original = 'Direction status before either change review\n'
  writeFileSync(statusPath, original)
  const beforeHead = git(owner, 'rev-parse', 'HEAD')
  const indexPath = git(owner, 'rev-parse', '--git-path', 'index')
  const beforeIndex = readFileSync(indexPath)
  const freeze = join(common, 'frade-workflow/freeze/alpha-direction.json')
  mkdirSync(join(common, 'frade-workflow/freeze'), { recursive: true })
  writeFileSync(
    freeze,
    JSON.stringify({ directionId: m.id, owningChange: 'feature-a', stageId: 'S01' }),
  )
  for (const change of ['feature-a', 'feature-b']) {
    const variant = structuredClone(m)
    variant.stages[0].change = change
    variant.scope.planningAllowed.push(`openspec/changes/${change}/**`)
    variant.scope.closure.archiveOwner = change
    variant.scope.closure.archiveDestination = `openspec/changes/archive/<actual-archive-date>-${change}/**`
    const result = await refreshStatus({
      ...input({ manifest: variant }),
      ownerRoot: owner,
      write: true,
    })
    assert.equal(result.status, 'FROZEN', JSON.stringify(result))
    assert.equal(result.code, 'REVIEW_FREEZE')
    assert.equal(readFileSync(statusPath, 'utf8'), original)
    assert.equal(git(owner, 'rev-parse', 'HEAD'), beforeHead)
    assert.deepEqual(readFileSync(indexPath), beforeIndex)
  }
  assert.equal(
    readFileSync(freeze, 'utf8'),
    JSON.stringify({ directionId: m.id, owningChange: 'feature-a', stageId: 'S01' }),
  )
})

test('FWE-013 status target cannot overwrite an in-scope non-dashboard file', async () => {
  const { owner, m } = actualOwner()
  for (const target of [
    'docs/engineering/directions/alpha-direction/direction.json',
    'openspec/changes/alpha-direction/specs/feature/spec.md',
    'scripts/directions/status.mjs',
    'docs/engineering/ordinary.md',
    'packages/product/FROZEN-STATUS.md',
    'docs/engineering/FOREIGN-STATUS.md',
  ]) {
    const altered = structuredClone(m)
    altered.statusPath = target
    altered.scope.planningAllowed.push(target)
    altered.scope.allowed.push(target)
    if (!target.startsWith('packages/'))
      assert.equal(validateManifest(altered).ok, true, `${target} must reach status target guard`)
    const path = join(owner, target)
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, 'PROTECTED ORIGINAL\n')
    const before = git(owner, 'status', '--porcelain')
    const result = await refreshStatus({
      ...input({ manifest: altered }),
      ownerRoot: owner,
      write: true,
    })
    assert.equal(result.status, 'BLOCKED', `${target}: ${JSON.stringify(result)}`)
    assert.equal(readFileSync(path, 'utf8'), 'PROTECTED ORIGINAL\n')
    assert.equal(git(owner, 'status', '--porcelain'), before)
  }
})

test('FWE-013 POSIX origin fields reject native backslashes', async () => {
  if (process.platform === 'win32') return
  const { owner, m, statusPath } = actualOwner()
  writeFileSync(statusPath, 'ORIGINAL\n')
  m.owner.worktree = owner.replaceAll('/', '\\')
  const result = await refreshStatus({ ...input({ manifest: m }), ownerRoot: owner, write: true })
  assert.equal(result.code, 'MANIFEST_INVALID')
  assert.equal(readFileSync(statusPath, 'utf8'), 'ORIGINAL\n')
})
