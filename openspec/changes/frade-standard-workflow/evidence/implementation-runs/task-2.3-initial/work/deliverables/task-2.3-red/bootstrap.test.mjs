import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync } from 'node:fs'
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
const invoke = (cwd, command, file, env = {}) => {
  if (!existsSync(cli)) return { status: 2, body: { ok: false, status: 'NOT_IMPLEMENTED' } }
  const run = spawnSync(process.execPath, [cli, command, file], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })
  let body
  try { body = JSON.parse(run.stdout) } catch { body = { stdout: run.stdout, stderr: run.stderr } }
  return { status: run.status, body }
}
function fixture() {
  const base = mkdtempSync(join(tmpdir(), 'frade-bootstrap-'))
  const root = join(base, 'source')
  const parent = join(base, 'owners')
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
  const common = resolve(root, '.git')
  const policy = { version: 'fixture-1', release: sha('fixture-release'), sha256: sha(bytes), artifact: 'policy/agent-workflow.md' }
  const request = {
    schemaVersion: 1,
    id: 'alpha-direction', title: 'Alpha direction', goal: 'Improve a bounded workflow',
    users: ['engineers'], outcomes: ['repeatable setup'], constraints: ['preserve root rules'],
    exclusions: ['product changes'], sourceRoot: root, gitCommon: common,
    workspaceParent: parent, baseline, policy,
    publication: { remote: 'git@example.test:team/frade.git', ref: 'refs/heads/codex/alpha-direction', authorization: 'pending human decision' },
  }
  const requestFile = join(base, 'request.json')
  const save = () => writeFileSync(requestFile, `${JSON.stringify(request, null, 2)}\n`)
  save()
  const authorize = () => {
    const control = join(common, 'frade-workflow')
    mkdirSync(control, { recursive: true })
    const binding = { schemaVersion: 1, sourceRoot: root, gitCommon: common, workspaceParent: parent, policy, requestHashes: [sha(JSON.stringify(request))] }
    writeFileSync(join(control, 'bootstrap-authority.json'), `${JSON.stringify(binding)}\n`)
  }
  return { base, root, parent, common, baseline, request, requestFile, save, authorize }
}

test('FWE-003-A01 plan previews exact owner and files without writing', () => {
  const f = fixture()
  writeFileSync(join(f.root, 'product.txt'), 'dirty and private\n')
  const before = git(f.root, 'status', '--porcelain')
  const result = invoke(f.root, 'plan', f.requestFile)
  assert.equal(result.status, 0, JSON.stringify(result.body))
  assert.equal(result.body.branch, 'codex/alpha-direction')
  assert.equal(result.body.worktree, join(f.parent, f.request.id))
  assert.equal(result.body.baseline, f.baseline)
  assert.ok(result.body.files.includes('docs/engineering/directions/alpha-direction/direction.json'))
  assert.ok(result.body.unknowns.includes('publication authorization'))
  assert.equal(existsSync(result.body.worktree), false)
  assert.equal(git(f.root, 'status', '--porcelain'), before)
})

test('FWE-001-A01 and FWE-002-A01 create registers isolated baseline and intake', () => {
  const f = fixture()
  f.authorize()
  writeFileSync(join(f.root, 'product.txt'), 'dirty and private\n')
  const result = invoke(f.root, 'create', f.requestFile)
  assert.equal(result.status, 0, JSON.stringify(result.body))
  const owner = join(f.parent, f.request.id)
  assert.equal(git(owner, 'branch', '--show-current'), 'codex/alpha-direction')
  assert.equal(readFileSync(join(owner, 'product.txt'), 'utf8'), 'committed\n')
  assert.match(readFileSync(join(owner, 'AGENTS.md'), 'utf8'), /Root rules/)
  assert.match(readFileSync(join(owner, 'AGENTS.md'), 'utf8'), /direction.json/)
  const manifest = JSON.parse(readFileSync(join(owner, 'docs/engineering/directions/alpha-direction/direction.json')))
  assert.equal(manifest.originalBaseline, f.baseline)
  assert.equal(manifest.owner.gitCommon, f.common)
  assert.equal(manifest.scope.closure.enabled, false)
  assert.equal(manifest.stages[0].phase, 'INTAKE')
  assert.deepEqual(manifest.stages[0].roleAssignments, [])
  assert.match(readFileSync(join(owner, 'docs/engineering/directions/alpha-direction/INTAKE.md'), 'utf8'), /engineers/)
  assert.match(readFileSync(join(owner, 'docs/engineering/directions/alpha-direction/RESEARCH.md'), 'utf8'), /Unknowns/)
  assert.equal(git(f.root, 'status', '--porcelain'), ' M product.txt')
})

test('FWE-003-A02 same request returns owner; changed request and foreign branch block', () => {
  const f = fixture()
  f.authorize()
  assert.equal(invoke(f.root, 'create', f.requestFile).status, 0)
  const again = invoke(f.root, 'create', f.requestFile)
  assert.equal(again.status, 0, JSON.stringify(again.body))
  assert.equal(again.body.reused, true)
  f.request.goal = 'different goal'
  f.save()
  assert.equal(invoke(f.root, 'create', f.requestFile).status, 2)
  const g = fixture()
  g.authorize()
  git(g.root, 'branch', 'codex/alpha-direction')
  const foreign = invoke(g.root, 'create', g.requestFile)
  assert.equal(foreign.status, 2, JSON.stringify(foreign.body))
  assert.equal(existsSync(join(g.parent, g.request.id)), false)
})

test('FWE-003-A03 retained intent recovers a registered partial worktree', () => {
  const f = fixture()
  f.authorize()
  const failed = invoke(f.root, 'create', f.requestFile, { FRADE_BOOTSTRAP_FAULT: 'after-worktree' })
  assert.equal(failed.status, 2, JSON.stringify(failed.body))
  assert.equal(git(join(f.parent, f.request.id), 'branch', '--show-current'), 'codex/alpha-direction')
  const recovered = invoke(f.root, 'create', f.requestFile)
  assert.equal(recovered.status, 0, JSON.stringify(recovered.body))
  assert.equal(recovered.body.recovered, true)
  assert.equal(git(f.root, 'worktree', 'list', '--porcelain').match(/branch refs\/heads\/codex\/alpha-direction/g).length, 1)
})

test('FWE-003-A04 rejects foreign common, traversal, link and case collision without writes', () => {
  const f = fixture()
  f.authorize()
  f.request.gitCommon = join(f.base, 'foreign.git')
  f.save()
  assert.equal(invoke(f.root, 'plan', f.requestFile).status, 2)
  f.request.gitCommon = f.common
  f.request.id = '../escape'
  f.save()
  assert.equal(invoke(f.root, 'plan', f.requestFile).status, 2)
  f.request.id = 'alpha-direction'
  const outside = join(f.base, 'outside')
  mkdirSync(outside)
  symlinkSync(outside, join(f.parent, 'alpha-direction'), 'dir')
  f.save()
  assert.equal(invoke(f.root, 'create', f.requestFile).status, 2)
  const g = fixture()
  g.authorize()
  mkdirSync(join(g.parent, 'Alpha-Direction'))
  assert.equal(invoke(g.root, 'create', g.requestFile).status, 2)
  assert.equal(existsSync(join(g.parent, g.request.id)), false)
})

test('FWE-001-A02 POSIX canonical owner paths accept safe absolute and reject unsafe', () => {
  assert.equal(safeOwnerPath('/tmp/frade/owner'), true)
  assert.equal(safeOwnerPath('/tmp/frade/.git', { gitCommon: true }), true)
  for (const path of ['/tmp/../owner', '/tmp//owner', '/tmp/link\\owner', '/tmp/.git/owner', '/tmp/CON', '/tmp/x.', '/'])
    assert.equal(safeOwnerPath(path), false, path)
  assert.equal(safeOwnerPath('C:/frade/owner'), true)
  assert.equal(safeOwnerPath('C:/frade/../owner'), false)
})
