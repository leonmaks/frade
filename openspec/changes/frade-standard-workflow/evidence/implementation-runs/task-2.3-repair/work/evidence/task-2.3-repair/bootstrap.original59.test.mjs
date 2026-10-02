import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { safeOwnerPath } from '../../scripts/directions/contracts.mjs'

const cli = fileURLToPath(new URL('../../scripts/directions/cli.mjs', import.meta.url))
const sha = (value) => createHash('sha256').update(value).digest('hex')
const git = (cwd, ...args) => {
  const run = spawnSync('git', ['-c', 'core.autocrlf=false', ...args], { cwd, encoding: 'utf8' })
  assert.equal(run.status, 0, `${args.join(' ')}: ${run.stderr}`)
  return run.stdout.trim()
}
const invoke = async (cwd, command, file, env = {}) => {
  if (!existsSync(cli)) return { status: 2, body: { ok: false, status: 'NOT_IMPLEMENTED' } }
  const { planDirection, createDirection, checkDirection } =
    await import('../../scripts/directions/bootstrap.mjs')
  const old = process.env.FRADE_BOOTSTRAP_FAULT
  if (env.FRADE_BOOTSTRAP_FAULT) process.env.FRADE_BOOTSTRAP_FAULT = env.FRADE_BOOTSTRAP_FAULT
  const prior = process.cwd()
  process.chdir(cwd)
  try {
    const body = command === 'check' ? await checkDirection(file) :
      command === 'plan' ? await planDirection(JSON.parse(readFileSync(file))) :
        await createDirection(JSON.parse(readFileSync(file)))
    return { status: body.ok ? 0 : 2, body }
  } finally {
    process.chdir(prior)
    if (old === undefined) delete process.env.FRADE_BOOTSTRAP_FAULT
    else process.env.FRADE_BOOTSTRAP_FAULT = old
  }
}
function fixture() {
  const slash = (x) => x.replaceAll('\\', '/')
  const base = slash(mkdtempSync(join(tmpdir(), 'frade-bootstrap-')))
  const root = slash(join(base, 'source'))
  const parent = slash(join(base, 'owners'))
  mkdirSync(root)
  mkdirSync(parent)
  git(root, 'init', '-q')
  git(root, 'config', 'user.name', 'Fixture')
  git(root, 'config', 'user.email', 'fixture@example.test')
  mkdirSync(join(root, 'policy'))
  const bytes = Buffer.from('reviewed fixture policy\n')
  writeFileSync(join(root, 'policy', 'agent-workflow.md'), bytes)
  writeFileSync(join(root, 'AGENTS.md'), '# Root rules\n')
  writeFileSync(join(root, 'product.txt'), 'committed\n')
  git(root, 'add', 'AGENTS.md', 'policy/agent-workflow.md', 'product.txt')
  git(root, 'commit', '-qm', 'fixture baseline')
  const baseline = git(root, 'rev-parse', 'HEAD')
  const common = slash(resolve(root, '.git'))
  const policy = {
    version: 'fixture-1', release: sha('fixture-release'), sha256: sha(bytes),
    artifact: 'policy/agent-workflow.md',
  }
  const request = {
    schemaVersion: 1,
    id: 'alpha-direction', title: 'Alpha direction', goal: 'Improve a bounded workflow',
    users: ['engineers'], outcomes: ['repeatable setup'], constraints: ['preserve root rules'],
    exclusions: ['product changes'], sourceRoot: root, gitCommon: common,
    workspaceParent: parent, baseline, policy,
    publication: {
      remote: 'git@example.test:team/frade.git',
      ref: 'refs/heads/codex/alpha-direction',
      authorization: 'pending human decision',
    },
  }
  const requestFile = join(base, 'request.json')
  const save = () => writeFileSync(requestFile, `${JSON.stringify(request, null, 2)}\n`)
  save()
  const authorize = () => {
    const control = join(common, 'frade-workflow')
    mkdirSync(control, { recursive: true })
    const binding = {
      schemaVersion: 1, sourceRoot: root, gitCommon: common, workspaceParent: parent, policy,
      bundle: [{ path: policy.artifact, sha256: policy.sha256 }],
      requestHashes: [sha(JSON.stringify(request))],
    }
    writeFileSync(join(control, 'bootstrap-authority.json'), `${JSON.stringify(binding)}\n`)
  }
  return { base, root, parent, common, baseline, request, requestFile, save, authorize }
}

test('FWE-003-A01 plan previews exact owner and files without writing', async () => {
  const f = fixture()
  writeFileSync(join(f.root, 'product.txt'), 'dirty and private\n')
  const before = git(f.root, 'status', '--porcelain')
  const result = await invoke(f.root, 'plan', f.requestFile)
  assert.equal(result.status, 0, JSON.stringify(result.body))
  assert.equal(result.body.branch, 'codex/alpha-direction')
  assert.equal(result.body.worktree, join(f.parent, f.request.id).replaceAll('\\', '/'))
  assert.equal(result.body.baseline, f.baseline)
  assert.ok(result.body.files.includes(
    'docs/engineering/directions/alpha-direction/direction.json'))
  assert.equal(result.body.intentPath,
    join(f.common, 'frade-workflow/intents/alpha-direction.json').replaceAll('\\', '/'))
  assert.equal(result.body.authorityPath,
    join(f.common, 'frade-workflow/bootstrap-authority.json').replaceAll('\\', '/'))
  assert.ok(result.body.unknowns.includes('publication authorization'))
  assert.equal(existsSync(result.body.worktree), false)
  assert.equal(git(f.root, 'status', '--porcelain'), before)
})

test('FWE-001-A01 and FWE-002-A01 create registers isolated baseline and intake', async () => {
  const f = fixture()
  f.authorize()
  writeFileSync(join(f.root, 'product.txt'), 'dirty and private\n')
  const result = await invoke(f.root, 'create', f.requestFile)
  assert.equal(result.status, 0, JSON.stringify(result.body))
  const owner = join(f.parent, f.request.id)
  assert.equal(git(owner, 'branch', '--show-current'), 'codex/alpha-direction')
  assert.equal(readFileSync(join(owner, 'product.txt'), 'utf8'), 'committed\n')
  assert.match(readFileSync(join(owner, 'AGENTS.md'), 'utf8'), /Root rules/)
  assert.match(readFileSync(join(owner, 'AGENTS.md'), 'utf8'), /direction.json/)
  const manifest = JSON.parse(readFileSync(join(owner,
    'docs/engineering/directions/alpha-direction/direction.json')))
  assert.equal(manifest.originalBaseline, f.baseline)
  assert.equal(manifest.owner.gitCommon, f.common)
  assert.equal(manifest.scope.closure.enabled, false)
  assert.equal(manifest.stages[0].phase, 'INTAKE')
  assert.deepEqual(manifest.stages[0].roleAssignments, [])
  const { resolveRole } = await import('../../scripts/directions/roles.mjs')
  const dispatch = await resolveRole({ manifest, stageId: 'S01', taskId: 'S01.1',
    taskType: 'research', role: 'executor' })
  assert.equal(dispatch.issues[0].code, 'ROLE_MISSING')
  assert.match(readFileSync(join(owner,
    'docs/engineering/directions/alpha-direction/INTAKE.md'), 'utf8'), /engineers/)
  const research = readFileSync(join(owner,
    'docs/engineering/directions/alpha-direction/RESEARCH.md'), 'utf8')
  assert.match(research, /Dated local source/)
  assert.match(research, /Unknowns/)
  const status = readFileSync(join(owner,
    'docs/engineering/directions/alpha-direction/DIRECTION-STATUS.md'), 'utf8')
  assert.equal([...status.matchAll(/^## [1-8]\. /gm)].length, 8)
  assert.match(status, /READY_FOR_IMPLEMENTATION: NO/)
  assert.equal(git(f.root, 'status', '--porcelain'), 'M product.txt')
})

test('FWE-003-A02 same request returns owner; changed request and foreign branch blocks',
  async () => {
  const f = fixture()
  f.authorize()
  assert.equal((await invoke(f.root, 'create', f.requestFile)).status, 0)
  const again = await invoke(f.root, 'create', f.requestFile)
  assert.equal(again.status, 0, JSON.stringify(again.body))
  assert.equal(again.body.reused, true)
  const owner = join(f.parent, f.request.id)
  git(owner, 'add', 'AGENTS.md')
  git(owner, 'commit', '-qm', 'advance owned branch')
  const progressed = await invoke(f.root, 'create', f.requestFile)
  assert.equal(progressed.status, 0, JSON.stringify(progressed.body))
  assert.equal(progressed.body.reused, true)
  f.request.goal = 'different goal'
  f.save()
  assert.equal((await invoke(f.root, 'create', f.requestFile)).status, 2)
  const g = fixture()
  g.authorize()
  git(g.root, 'branch', 'codex/alpha-direction')
  const foreign = await invoke(g.root, 'create', g.requestFile)
  assert.equal(foreign.status, 2, JSON.stringify(foreign.body))
  assert.equal(existsSync(join(g.parent, g.request.id)), false)
})

test('FWE-003-A03 retained intent recovers a registered partial worktree', async () => {
  const f = fixture()
  f.authorize()
  const failed = await invoke(f.root, 'create', f.requestFile,
    { FRADE_BOOTSTRAP_FAULT: 'after-worktree' })
  assert.equal(failed.status, 2, JSON.stringify(failed.body))
  assert.equal(git(join(f.parent, f.request.id), 'branch', '--show-current'),
    'codex/alpha-direction')
  const recovered = await invoke(f.root, 'create', f.requestFile)
  assert.equal(recovered.status, 0, JSON.stringify(recovered.body))
  assert.equal(recovered.body.recovered, true)
  assert.equal(git(f.root, 'worktree', 'list', '--porcelain')
    .match(/branch refs\/heads\/codex\/alpha-direction/g).length, 1)
})

test('FWE-003-A04 rejects foreign common, traversal, link and case collisions',
  async () => {
  const f = fixture()
  f.authorize()
  f.request.gitCommon = join(f.base, 'foreign.git')
  f.save()
  assert.equal((await invoke(f.root, 'plan', f.requestFile)).status, 2)
  f.request.gitCommon = f.common
  f.request.id = '../escape'
  f.save()
  assert.equal((await invoke(f.root, 'plan', f.requestFile)).status, 2)
  f.request.id = 'alpha-direction'
  f.request.publication.ref = 'refs/heads/main'
  f.save()
  assert.equal((await invoke(f.root, 'plan', f.requestFile)).status, 2)
  f.request.publication.ref = 'refs/heads/codex/alpha-direction'
  f.request.workspaceParent = f.root
  f.save()
  assert.equal((await invoke(f.root, 'plan', f.requestFile)).status, 2)
  f.request.workspaceParent = f.parent
  const outside = join(f.base, 'outside')
  mkdirSync(outside)
  symlinkSync(outside, join(f.parent, 'alpha-direction'),
    process.platform === 'win32' ? 'junction' : 'dir')
  f.save()
  assert.equal((await invoke(f.root, 'create', f.requestFile)).status, 2)
  const g = fixture()
  g.authorize()
  mkdirSync(join(g.parent, 'Alpha-Direction'))
  assert.equal((await invoke(g.root, 'create', g.requestFile)).status, 2)
  assert.equal(existsSync(join(g.parent, g.request.id,
    'docs/engineering/directions/alpha-direction/direction.json')), false)
})

test('FWE-001-A02 POSIX canonical owner paths accept safe absolute and reject unsafe', () => {
  assert.equal(safeOwnerPath('/tmp/frade/owner'), true)
  assert.equal(safeOwnerPath('/tmp/frade/.git', { gitCommon: true }), true)
  for (const path of [
    '/tmp/../owner', '/tmp//owner', '/tmp/link\\owner', '/tmp/COM1/owner',
    '/tmp/CON', '/tmp/x.', '/',
  ])
    assert.equal(safeOwnerPath(path), false, path)
  assert.equal(safeOwnerPath('C:/frade/owner'), true)
  assert.equal(safeOwnerPath('C:/frade/../owner'), false)
  assert.equal(safeOwnerPath('C:/frade/.git/owner'), false)
  assert.equal(safeOwnerPath('C:/frade//owner'), false)
  assert.equal(safeOwnerPath('C:/frade/CON'), false)
})

test('FWE-003-A05 request self-approval and policy drift cannot authorize create', async () => {
  const f = fixture()
  f.request.approved = true
  f.save()
  assert.equal((await invoke(f.root, 'create', f.requestFile)).status, 2)
  assert.equal(existsSync(join(f.parent, f.request.id)), false)
  f.authorize()
  writeFileSync(join(f.root, 'policy', 'agent-workflow.md'), 'unreviewed bytes\n')
  const drift = await invoke(f.root, 'create', f.requestFile)
  assert.equal(drift.status, 2)
  assert.equal(existsSync(join(f.parent, f.request.id)), false)
})

test('FWE-001-A03 check binds manifest to owner and rejects malformed state',
  async () => {
  const f = fixture()
  f.authorize()
  assert.equal((await invoke(f.root, 'create', f.requestFile)).status, 0)
  const path = join(f.parent, f.request.id,
    'docs/engineering/directions/alpha-direction/direction.json')
  const checked = await invoke(f.root, 'check', path)
  assert.equal(checked.status, 0, JSON.stringify(checked.body))
  writeFileSync(path, '{}\n')
  const malformed = await invoke(f.root, 'check', path)
  assert.equal(malformed.status, 2)
  assert.equal(malformed.body.code, 'MANIFEST_INVALID')
})

test('FWE-003-A06 rejects pre-existing baseline state and case-variant Git ref', async () => {
  const f = fixture()
  mkdirSync(join(f.root, 'docs/engineering/directions/alpha-direction'), { recursive: true })
  writeFileSync(join(f.root,
    'docs/engineering/directions/alpha-direction/direction.json'), 'foreign\n')
  git(f.root, 'add', 'docs/engineering/directions/alpha-direction/direction.json')
  git(f.root, 'commit', '-qm', 'foreign direction')
  f.request.baseline = git(f.root, 'rev-parse', 'HEAD')
  f.save()
  f.authorize()
  const collision = await invoke(f.root, 'create', f.requestFile)
  assert.equal(collision.status, 2, JSON.stringify(collision.body))
  assert.equal(existsSync(join(f.parent, f.request.id)), false)
  const g = fixture()
  g.authorize()
  git(g.root, 'branch', 'codex/Alpha-Direction')
  const variant = await invoke(g.root, 'create', g.requestFile)
  assert.equal(variant.status, 2, JSON.stringify(variant.body))
  assert.equal(existsSync(join(g.parent, g.request.id, 'AGENTS.md')), false)
})
