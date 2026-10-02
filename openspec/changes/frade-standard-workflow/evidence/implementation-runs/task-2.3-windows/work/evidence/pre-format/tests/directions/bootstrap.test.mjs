import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync,
  unlinkSync, renameSync,
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
export const invoke = async (cwd, command, file, env = {}) => {
  if (!existsSync(cli)) return { status: 2, body: { ok: false, status: 'NOT_IMPLEMENTED' } }
  const { planDirection, createDirection, checkDirection } =
    await import('../../scripts/directions/bootstrap.mjs')
  const common = git(cwd, 'rev-parse', '--git-common-dir')
  let trustedContext
  try {
    const canonical = resolve(cwd, common).replaceAll('\\', '/')
    const pointer = JSON.parse(readFileSync(join(canonical, 'frade-workflow/current.json')))
    const policyPath = join(canonical, 'frade-workflow/releases', pointer.release,
      'docs/engineering/agent-workflow.md')
    trustedContext = await (await import('../../scripts/directions/bootstrap.mjs'))
      .trustedBootstrapFixtureContext(canonical, {
        status: 'AVAILABLE', release: pointer.release, policyVersion: 'fixture-1',
        policy: policyPath,
      })
  } catch { /* missing fixture control stays blocked */ }
  const options = { trustedContext: env.trustedContext ?? trustedContext }
  const old = process.env.FRADE_BOOTSTRAP_FAULT
  if (env.FRADE_BOOTSTRAP_FAULT) process.env.FRADE_BOOTSTRAP_FAULT = env.FRADE_BOOTSTRAP_FAULT
  const prior = process.cwd()
  process.chdir(cwd)
  try {
    const body = command === 'check' ? await checkDirection(file, options) :
      command === 'plan' ? await planDirection(JSON.parse(readFileSync(file)), options) :
        await createDirection(JSON.parse(readFileSync(file)), options)
    return { status: body.ok ? 0 : 2, body }
  } finally {
    process.chdir(prior)
    if (old === undefined) delete process.env.FRADE_BOOTSTRAP_FAULT
    else process.env.FRADE_BOOTSTRAP_FAULT = old
  }
}
export function fixture() {
  const slash = (x) => x.replaceAll('\\', '/')
  const fixtureTmp = process.platform === 'win32' ? tmpdir() : '/tmp'
  mkdirSync(fixtureTmp, { recursive: true })
  const base = slash(mkdtempSync(join(fixtureTmp, 'frade-bootstrap-')))
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
    version: 'fixture-1', release: '', sha256: sha(bytes),
    artifact: 'policy/agent-workflow.md',
  }
  const fixtureCli = "import path from 'node:path'; import {fileURLToPath} from 'node:url'; console.log(JSON.stringify({status:'AVAILABLE',release:path.basename(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')),policyVersion:'fixture-1'}))\n"
  const storage = join(common, 'frade-workflow')
  const bundle = { version: 1, common, policyVersion: policy.version,
    policySha256: policy.sha256, files: [
      { path: 'docs/engineering/agent-workflow.md', sha256: policy.sha256 },
      { path: 'scripts/agent-review/cli.mjs', sha256: sha(fixtureCli) },
    ] }
  const bundleBytes = Buffer.from(`${JSON.stringify(bundle)}\n`)
  policy.release = sha(bundleBytes)
  const releaseRoot = join(storage, 'releases', policy.release)
  mkdirSync(join(releaseRoot, 'docs/engineering'), { recursive: true })
  mkdirSync(join(releaseRoot, 'scripts/agent-review'), { recursive: true })
  writeFileSync(join(releaseRoot, 'docs/engineering/agent-workflow.md'), bytes)
  writeFileSync(join(releaseRoot, 'scripts/agent-review/cli.mjs'), fixtureCli)
  writeFileSync(join(releaseRoot, 'scripts/agent-review/bundle.json'), bundleBytes)
  writeFileSync(join(storage, 'current.json'), `${JSON.stringify({ version: 1,
    common, release: policy.release, policySha256: policy.sha256 })}\n`)
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
    const grant = {
      schemaVersion: 1, sourceRoot: request.sourceRoot, gitCommon: common,
      workspaceParent: request.workspaceParent, baseline: request.baseline,
      policy: request.policy, intentHash: sha(JSON.stringify(request)),
    }
    writeFileSync(join(control, 'bootstrap-authority.json'),
      `${JSON.stringify(grant)}\n`)
  }
  return { base, root, parent, common, baseline, request, requestFile, save, authorize,
    authorityFile: join(common, 'frade-workflow/bootstrap-authority.json') }
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

test('I23-WIN manifest boundary accepts native and canonical owner paths only', async () => {
  const f = fixture()
  f.authorize()
  const created = await invoke(f.root, 'create', f.requestFile)
  assert.equal(created.status, 0, JSON.stringify(created.body))
  const canonical = join(created.body.worktree, 'docs/engineering/directions',
    f.request.id, 'direction.json').replaceAll('\\', '/')
  const forwardCheck = await invoke(f.root, 'check', canonical)
  assert.equal(forwardCheck.status, 0, JSON.stringify(forwardCheck.body))
  assert.equal(forwardCheck.body.id, f.request.id)
  const native = canonical.replaceAll('/', '\\')
  const nativeCheck = await invoke(f.root, 'check', native)
  if (process.platform === 'win32') {
    assert.equal(nativeCheck.status, 0, JSON.stringify(nativeCheck.body))
    assert.equal(nativeCheck.body.id, forwardCheck.body.id)
  } else {
    assert.equal(nativeCheck.status, 2)
    assert.equal(nativeCheck.body.code, 'MANIFEST_PATH')
  }
  const unsafe = [
    canonical.replace('/direction.json', '/../direction.json'),
    canonical.replace('/direction.json', '//direction.json'),
    canonical.replace('/direction.json', '/CON/direction.json'),
    canonical.replace('/direction.json', '/direction.json/'),
    join(f.base, 'foreign', 'docs/engineering/directions', f.request.id,
      'direction.json').replaceAll('\\', '/'),
  ]
  for (const path of unsafe) {
    const result = await invoke(f.root, 'check',
      process.platform === 'win32' ? path.replaceAll('/', '\\') : path)
    assert.equal(result.status, 2, `${path}: ${JSON.stringify(result.body)}`)
    assert.match(`${result.body.code} ${result.body.detail}`, /MANIFEST_PATH|MANIFEST_OWNER_PATH/)
  }
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

test('I23-07 installed service cannot create without an external exact request grant', async () => {
  const f = fixture()
  const missing = await invoke(f.root, 'create', f.requestFile)
  assert.equal(missing.status, 2, JSON.stringify(missing.body))
  assert.match(missing.body.detail, /REQUEST_GRANT/)
  assert.equal(existsSync(join(f.common, 'frade-workflow/intents', `${f.request.id}.json`)), false)
  assert.equal(existsSync(join(f.parent, f.request.id)), false)
  f.request.approved = true
  f.save()
  const forged = await invoke(f.root, 'create', f.requestFile)
  assert.equal(forged.status, 2, JSON.stringify(forged.body))
  assert.equal(forged.body.code, 'REQUEST_SHAPE')
  delete f.request.approved
  f.save()
  f.authorize()
  const created = await invoke(f.root, 'create', f.requestFile)
  assert.equal(created.status, 0, JSON.stringify(created.body))
  assert.equal((await invoke(f.root, 'create', f.requestFile)).body.reused, true)
})

test('I23-07 grant for alpha rejects changed identity, title, goal, outcomes, baseline and parent',
  async () => {
  for (const field of ['id', 'title', 'goal', 'outcomes', 'baseline', 'workspaceParent']) {
    const f = fixture()
    f.authorize()
    if (field === 'id') {
      f.request.id = 'beta-direction'
      f.request.publication.ref = 'refs/heads/codex/beta-direction'
    } else if (field === 'title') f.request.title = 'Different title'
    else if (field === 'goal') f.request.goal = 'Different goal'
    else if (field === 'outcomes') f.request.outcomes = ['different result']
    else if (field === 'baseline') {
      writeFileSync(join(f.root, 'product.txt'), 'new baseline\n')
      git(f.root, 'add', 'product.txt')
      git(f.root, 'commit', '-qm', 'new baseline')
      f.request.baseline = git(f.root, 'rev-parse', 'HEAD')
    } else {
      const other = join(f.base, 'other-owners').replaceAll('\\', '/')
      mkdirSync(other)
      f.request.workspaceParent = other
    }
    f.save()
    const result = await invoke(f.root, 'create', f.requestFile)
    assert.equal(result.status, 2, `${field}: ${JSON.stringify(result.body)}`)
    assert.match(result.body.detail, /REQUEST_GRANT/, field)
    assert.equal(existsSync(join(f.request.workspaceParent, f.request.id)), false, field)
    assert.equal(existsSync(join(f.common, 'frade-workflow/intents', `${f.request.id}.json`)), false,
      field)
  }
})

test('I23-07 linked or forged grant cannot approve creation', async () => {
  const f = fixture()
  f.authorize()
  let trustedContext
  if (process.platform === 'win32') {
    const { trustedBootstrapFixtureContext } =
      await import('../../scripts/directions/bootstrap.mjs')
    trustedContext = await trustedBootstrapFixtureContext(f.common, {
      status: 'AVAILABLE', release: f.request.policy.release,
      policyVersion: f.request.policy.version,
      policy: join(f.common, 'frade-workflow/releases', f.request.policy.release,
        'docs/engineering/agent-workflow.md'),
    })
    const control = join(f.common, 'frade-workflow')
    const outside = join(f.base, 'outside-control')
    renameSync(control, outside)
    symlinkSync(outside, control, 'junction')
  } else {
    unlinkSync(f.authorityFile)
    const outside = join(f.base, 'outside-grant.json')
    writeFileSync(outside, JSON.stringify({ approved: true }))
    symlinkSync(outside, f.authorityFile)
  }
  const linked = await invoke(f.root, 'create', f.requestFile, { trustedContext })
  assert.equal(linked.status, 2, JSON.stringify(linked.body))
  assert.match(linked.body.detail, /REQUEST_GRANT/)
  const g = fixture()
  writeFileSync(g.authorityFile, JSON.stringify({ approved: true }))
  const forged = await invoke(g.root, 'create', g.requestFile)
  assert.equal(forged.status, 2, JSON.stringify(forged.body))
  assert.match(forged.body.detail, /REQUEST_GRANT/)
  assert.equal(existsSync(join(f.parent, f.request.id)), false)
  assert.equal(existsSync(join(g.parent, g.request.id)), false)
})

test('I23-08 retained origin fixes original baseline after branch progress', async () => {
  const f = fixture()
  const original = f.baseline
  writeFileSync(join(f.root, 'product.txt'), 'selected baseline\n')
  git(f.root, 'add', 'product.txt')
  git(f.root, 'commit', '-qm', 'selected baseline')
  f.request.baseline = git(f.root, 'rev-parse', 'HEAD')
  f.save()
  f.authorize()
  const created = await invoke(f.root, 'create', f.requestFile)
  assert.equal(created.status, 0, JSON.stringify(created.body))
  const path = join(created.body.worktree, 'docs/engineering/directions', f.request.id,
    'direction.json')
  git(created.body.worktree, 'add', 'AGENTS.md')
  git(created.body.worktree, 'commit', '-qm', 'advance owner')
  assert.equal((await invoke(f.root, 'check', path)).status, 0)
  const manifest = JSON.parse(readFileSync(path, 'utf8'))
  manifest.originalBaseline = original
  writeFileSync(path, `${JSON.stringify(manifest)}\n`)
  const moved = await invoke(f.root, 'check', path)
  assert.equal(moved.status, 2, JSON.stringify(moved.body))
  assert.match(moved.body.detail, /ORIGIN_BASELINE/)
})

test('I23-08 check requires both exact retained origin records', async () => {
  const f = fixture()
  f.authorize()
  const created = await invoke(f.root, 'create', f.requestFile)
  assert.equal(created.status, 0, JSON.stringify(created.body))
  const path = join(created.body.worktree, 'docs/engineering/directions', f.request.id,
    'direction.json')
  const completion = join(f.common, 'frade-workflow/intents', `${f.request.id}.complete.json`)
  unlinkSync(completion)
  const missing = await invoke(f.root, 'check', path)
  assert.equal(missing.status, 2, JSON.stringify(missing.body))
  assert.match(missing.body.detail, /ORIGIN_MISSING/)
})

test('I23-08 foreign malformed manifest is rejected as unowned before JSON parsing', async () => {
  const f = fixture()
  f.authorize()
  const created = await invoke(f.root, 'create', f.requestFile)
  assert.equal(created.status, 0, JSON.stringify(created.body))
  const owned = join(created.body.worktree, 'docs/engineering/directions', f.request.id,
    'direction.json')
  assert.equal((await invoke(f.root, 'check', owned)).status, 0)
  const foreign = join(f.base, 'foreign', 'docs/engineering/directions', f.request.id)
  mkdirSync(foreign, { recursive: true })
  const malformed = join(foreign, 'direction.json')
  writeFileSync(malformed, '{bad json')
  const rejected = await invoke(f.root, 'check', malformed)
  assert.equal(rejected.status, 2, JSON.stringify(rejected.body))
  assert.match(rejected.body.detail, /MANIFEST_OWNER_PATH/)
})
