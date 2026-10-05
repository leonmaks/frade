import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  copyFileSync,
  renameSync,
  chmodSync,
  rmSync,
  unlinkSync,
  readdirSync,
  existsSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, win32 } from 'node:path'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { manifest as template } from './fixtures.mjs'

const cli = resolve('scripts/directions/publication.mjs')
const publicCli = resolve('scripts/directions/cli.mjs')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
function git(cwd, ...args) {
  const p = spawnSync(
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
        GIT_TERMINAL_PROMPT: '0',
      },
    },
  )
  assert.equal(p.status, 0, p.stderr)
  return p.stdout.trim()
}
async function invoke(f, command, path) {
  const prior = process.cwd()
  try {
    process.chdir(f.root)
    const api = await import(pathToFileURL(f.cli).href)
    const trustedContext = api.trustedPublicationFixtureContext(f.common, {
      brand: 'FRADE_PUBLICATION_TEST_CONTROLLER_V1',
    })
    const body =
      command === 'checkpoint'
        ? api.checkpoint(f.manifestPath, f.eventPath, { trustedContext })
        : api.publish(path, { trustedContext })
    return { exit: body.ok ? 0 : 2, body, via: 'CONTROLLER_BRANDED_FIXTURE_API' }
  } finally {
    process.chdir(prior)
  }
}
function fixture(t) {
  const base = mkdtempSync(join(tmpdir(), 'frade-publication-'))
  t.after(() => rmSync(base, { recursive: true, force: true }))
  const root = join(base, 'owner'),
    remote = join(base, 'remote.git'),
    other = join(base, 'other.git')
  mkdirSync(root)
  const copied = join(root, 'scripts/directions')
  mkdirSync(copied, { recursive: true })
  for (const file of readdirSync(resolve('scripts/directions')).filter((x) => x.endsWith('.mjs')))
    copyFileSync(resolve('scripts/directions', file), join(copied, file))
  git(root, 'init', '-b', 'codex/frade-standard-workflow')
  git(root, 'config', 'user.name', 'Fixture')
  git(root, 'config', 'user.email', 'fixture@example.invalid')
  git(base, 'init', '--bare', remote)
  git(base, 'init', '--bare', other)
  const design = 'openspec/changes/frade-standard-workflow/design.md'
  const approval = 'openspec/changes/frade-standard-workflow/evidence/user-decisions.json'
  const status = 'docs/engineering/BRANCH-STATUS.md'
  for (const path of [design, approval, status])
    mkdirSync(join(root, path, '..'), { recursive: true })
  const designText =
    'Approved publication ' +
    remote +
    ' refs/heads/codex/frade-standard-workflow; completed task and blocker cadence.\n'
  const approvalText =
    JSON.stringify({
      accepted: {
        publication: {
          remote,
          ref: 'refs/heads/codex/frade-standard-workflow',
          reply: 'Разрешаю commit/push в указанную ветку',
        },
      },
    }) + '\n'
  writeFileSync(join(root, design), designText)
  writeFileSync(join(root, approval), approvalText)
  writeFileSync(join(root, status), 'Health: BLOCKED\n')
  writeFileSync(join(root, 'AGENTS.md'), 'owner\n')
  git(root, 'add', '--', design, approval, status, 'AGENTS.md', 'scripts/directions')
  git(root, 'commit', '-m', 'origin')
  const baseline = git(root, 'rev-parse', 'HEAD'),
    common = join(root, '.git')
  const m = template()
  m.owner = {
    branch: 'codex/frade-standard-workflow',
    worktree: root.replaceAll('\\', '/'),
    gitCommon: common.replaceAll('\\', '/'),
  }
  m.originalBaseline = baseline
  m.policy.artifact = design
  m.policy.sha256 = hash(designText)
  m.statusPath = status
  const manifestPath = join(
    root,
    'docs/engineering/directions/frade-standard-workflow/direction.json',
  )
  mkdirSync(join(manifestPath, '..'), { recursive: true })
  writeFileSync(manifestPath, JSON.stringify(m) + '\n')
  git(root, 'add', '--', 'docs/engineering/directions/frade-standard-workflow/direction.json')
  git(root, 'commit', '-m', 'manifest')
  git(root, 'remote', 'add', 'origin', remote)
  git(
    root,
    'push',
    remote,
    git(root, 'rev-parse', 'HEAD') + ':refs/heads/codex/frade-standard-workflow',
  )
  git(root, 'push', remote, baseline + ':refs/heads/main')
  git(root, 'fetch', 'origin')
  git(root, 'branch', '--set-upstream-to=origin/codex/frade-standard-workflow')
  const authority = {
    schemaVersion: 1,
    id: m.id,
    owner: m.owner,
    originalBaseline: baseline,
    approvedSourceCommit: baseline,
    remote,
    ref: 'refs/heads/codex/frade-standard-workflow',
    requiredChecks: ['focused', 'regression'],
    approval: { path: approval, sha256: hash(approvalText) },
    plan: { path: design, sha256: hash(designText) },
  }
  const authorityPath = join(common, 'frade-workflow/publication-authority', m.id + '.json')
  mkdirSync(join(authorityPath, '..'), { recursive: true })
  writeFileSync(authorityPath, JSON.stringify(authority) + '\n')
  const evidencePath = 'openspec/changes/frade-standard-workflow/evidence/green.json'
  mkdirSync(join(root, evidencePath, '..'), { recursive: true })
  const evidence = JSON.stringify({ argv: ['node', '--test'], exitCode: 0, result: 'PASS' }) + '\n'
  writeFileSync(join(root, evidencePath), evidence)
  writeFileSync(join(root, status), 'Health: RUNNING; task 2.6 checks PASS; Verify/POST NOT_RUN\n')
  const event = {
    kind: 'TASK',
    task: '2.6',
    health: 'RUNNING',
    paths: [status, evidencePath],
    evidence: [{ path: evidencePath, sha256: hash(evidence) }],
    message: 'W01 task 2.6 tested checkpoint',
  }
  const eventPath = join(base, 'event.json')
  writeFileSync(eventPath, JSON.stringify(event) + '\n')
  const admissionDir = join(common, 'frade-workflow/publication-admission', m.id)
  const checksDir = join(common, 'frade-workflow/publication-checks', m.id)
  mkdirSync(admissionDir, { recursive: true })
  mkdirSync(checksDir, { recursive: true })
  const checks = authority.requiredChecks.map((id) => {
    const raw = `actual ${id} PASS\n`
    writeFileSync(join(checksDir, id + '.log'), raw)
    return {
      id,
      argv: ['node', '--check', id],
      exitCode: 0,
      result: 'PASS',
      raw: { name: id + '.log', sha256: hash(raw) },
    }
  })
  const candidateSha256 = hash(
    event.paths
      .slice()
      .sort()
      .map((p) => p + '\0' + hash(readFileSync(join(root, p))) + '\n')
      .join(''),
  )
  const admission = {
    schemaVersion: 1,
    id: m.id,
    kind: 'TASK',
    task: event.task,
    sourceHead: git(root, 'rev-parse', 'HEAD'),
    manifestSha256: hash(readFileSync(manifestPath)),
    authoritySha256: hash(readFileSync(authorityPath)),
    eventSha256: hash(readFileSync(eventPath)),
    candidateSha256,
    checks,
  }
  const admissionPath = join(admissionDir, admission.eventSha256 + '.json')
  writeFileSync(admissionPath, JSON.stringify(admission) + '\n')
  return {
    base,
    root,
    remote,
    other,
    common,
    m,
    manifestPath,
    authorityPath,
    admissionPath,
    admission,
    event,
    eventPath,
    evidencePath,
    status,
    cli: join(copied, 'publication.mjs'),
  }
}
const save = (f) => writeFileSync(f.eventPath, JSON.stringify(f.event) + '\n')
function bindCandidate(f, path, bytes) {
  mkdirSync(join(f.root, path, '..'), { recursive: true })
  writeFileSync(join(f.root, path), bytes)
  f.event.paths.push(path)
  save(f)
  f.admission.eventSha256 = hash(readFileSync(f.eventPath))
  f.admission.candidateSha256 = hash(
    f.event.paths
      .slice()
      .sort()
      .map((p) => p + '\0' + hash(readFileSync(join(f.root, p))) + '\n')
      .join(''),
  )
  const admissionPath = join(
    f.common,
    'frade-workflow/publication-admission',
    f.m.id,
    f.admission.eventSha256 + '.json',
  )
  writeFileSync(admissionPath, JSON.stringify(f.admission) + '\n')
}
function checkpointState(f) {
  return {
    head: git(f.root, 'rev-parse', 'HEAD'),
    index: git(f.root, 'diff', '--cached', '--name-only'),
    remote: git(f.base, 'ls-remote', f.remote),
  }
}
test('FWE-016 Windows owner containment accepts mixed separators and rejects traversal or sibling roots', async () => {
  const { ownedPath } = await import(pathToFileURL(cli).href)
  assert.doesNotThrow(() => ownedPath('C:/Frade/Owner', 'c:\\frade\\owner\\docs\\status.md', win32))
  assert.throws(
    () => ownedPath('C:/Frade/Owner', 'C:/Frade/Owner/../other.txt', win32),
    /PATH_ESCAPE/,
  )
  assert.throws(
    () => ownedPath('C:/Frade/Owner', 'C:/Frade/Owner-other/status.md', win32),
    /PATH_ESCAPE/,
  )
  assert.throws(() => ownedPath('C:/Frade/Owner', 'D:/Frade/Owner/status.md', win32), /PATH_ESCAPE/)
})
test('FWE-017 contradictory Git spawn diagnostics retain raw status and block', async () => {
  const { checkedGitRecord } = await import(pathToFileURL(cli).href)
  const commands = []
  assert.throws(
    () =>
      checkedGitRecord(
        ['rev-parse', 'HEAD'],
        {
          status: 0,
          signal: null,
          stdout: 'a'.repeat(40) + '\n',
          stderr: '',
          error: new Error('spawnSync git EPERM'),
        },
        commands,
      ),
    /GIT_EXECUTION_ERROR/,
  )
  assert.deepEqual(commands[0], {
    args: ['rev-parse', 'HEAD'],
    exitCode: 0,
    status: 0,
    signal: null,
    stdout: 'a'.repeat(40) + '\n',
    stderr: '',
    error: 'spawnSync git EPERM',
  })
  assert.throws(
    () =>
      checkedGitRecord(
        ['push'],
        {
          status: 0,
          signal: 'SIGTERM',
          stdout: '',
          stderr: '',
          error: undefined,
        },
        commands,
      ),
    /GIT_EXECUTION_ERROR/,
  )
  assert.equal(commands[1].status, 0)
  assert.equal(commands[1].signal, 'SIGTERM')
  assert.equal(
    checkedGitRecord(
      ['status'],
      {
        status: 0,
        signal: null,
        stdout: '',
        stderr: '',
        error: undefined,
      },
      commands,
    ).error,
    null,
  )
})
test('FWE-016 production publication module rejects foreign common with fabricated authority', async (t) => {
  const f = fixture(t)
  const { checkpoint, publish } = await import(pathToFileURL(cli).href)
  const foreign = async (command, path) => {
    if (process.platform !== 'win32')
      return command === 'checkpoint' ? checkpoint(f.manifestPath, f.eventPath) : publish(path)
    const run = spawnSync(
      process.execPath,
      [publicCli, command, ...(command === 'checkpoint' ? [f.manifestPath, f.eventPath] : [path])],
      { cwd: f.root, encoding: 'utf8' },
    )
    assert.equal(run.status, 2, run.stderr)
    return JSON.parse(run.stdout)
  }
  const prior = process.cwd()
  try {
    process.chdir(f.root)
    const result = await foreign('checkpoint')
    assert.equal(result.ok, false, JSON.stringify(result))
    assert.match(result.detail, /CONTROL_COMMON|TRUSTED_COMMON/)
    const local = await invoke(f, 'checkpoint')
    assert.equal(local.exit, 0, JSON.stringify(local))
    const publication = await foreign('publish', local.body.receiptPath)
    assert.equal(publication.ok, false, JSON.stringify(publication))
    assert.match(publication.detail, /CONTROL_COMMON|TRUSTED_COMMON/)
  } finally {
    process.chdir(prior)
  }
})
test('FWE-016 copied default CLI cannot trust fabricated foreign common', async (t) => {
  const f = fixture(t)
  if (process.platform === 'win32') {
    const run = spawnSync(
      process.execPath,
      [join(f.root, 'scripts/directions/cli.mjs'), 'checkpoint', f.manifestPath, f.eventPath],
      { cwd: f.root, encoding: 'utf8' },
    )
    assert.equal(run.status, 2, run.stderr)
    const body = JSON.parse(run.stdout)
    assert.equal(body.ok, false, JSON.stringify(body))
    assert.match(body.detail, /TRUSTED_COMMON/)
  }
  const prior = process.cwd()
  try {
    process.chdir(f.root)
    const { checkpoint } = await import(pathToFileURL(f.cli).href)
    const result = checkpoint(f.manifestPath, f.eventPath)
    assert.equal(result.ok, false, JSON.stringify(result))
    assert.match(result.detail, /TRUSTED_COMMON/)
  } finally {
    process.chdir(prior)
  }
})
test('FWE-017 exact authorized target, fresh remote SHA, other refs unchanged', async (t) => {
  const f = fixture(t),
    main = git(f.base, 'ls-remote', f.remote, 'refs/heads/main')
  const cp = await invoke(f, 'checkpoint')
  assert.equal(cp.exit, 0, JSON.stringify(cp))
  const pub = await invoke(f, 'publish', cp.body.receiptPath)
  assert.equal(pub.exit, 0, JSON.stringify(pub))
  assert.equal(pub.body.status, 'PUBLISHED')
  assert.equal(pub.body.verifiedRemoteSha, cp.body.checkpointSha)
  assert.equal(git(f.base, 'ls-remote', f.remote, 'refs/heads/main'), main)
  assert.equal(git(f.base, 'ls-remote', f.other), '')
  const receipt = JSON.parse(readFileSync(pub.body.publicationReceiptPath))
  assert.equal(receipt.sourceSha, cp.body.checkpointSha)
  assert.ok(receipt.commands.some((x) => x.args[0] === 'push' && x.exitCode === 0))
  assert.equal(receipt.commands.filter((x) => x.args[0] === 'ls-remote').length, 2)
})
test('design8 controller-branded bare fixture API checkpoint and publish', async (t) => {
  const f = fixture(t)
  const cp = await invoke(f, 'checkpoint')
  assert.equal(cp.exit, 0, JSON.stringify(cp))
  assert.equal(cp.via, 'CONTROLLER_BRANDED_FIXTURE_API')
  const pub = await invoke(f, 'publish', cp.body.receiptPath)
  assert.equal(pub.exit, 0, JSON.stringify(pub))
  assert.equal(pub.body.status, 'PUBLISHED')
  assert.equal(
    git(f.base, 'ls-remote', f.remote, 'refs/heads/codex/frade-standard-workflow').split('\t')[0],
    cp.body.checkpointSha,
  )
})
test('FWE-017 requester URL/ref, manifest approval and wrong branch cannot authorize', async (t) => {
  const f = fixture(t),
    before = git(f.base, 'ls-remote', f.remote)
  f.event.remote = f.other
  save(f)
  assert.equal((await invoke(f, 'checkpoint')).exit, 2)
  delete f.event.remote
  f.event.ref = 'refs/heads/main'
  save(f)
  assert.equal((await invoke(f, 'checkpoint')).exit, 2)
  delete f.event.ref
  save(f)
  f.m.publication = { approved: true, remote: f.other, ref: 'refs/heads/main' }
  writeFileSync(f.manifestPath, JSON.stringify(f.m))
  assert.equal((await invoke(f, 'checkpoint')).exit, 2)
  delete f.m.publication
  writeFileSync(f.manifestPath, JSON.stringify(f.m))
  git(f.root, 'branch', '-m', 'codex/other')
  assert.equal((await invoke(f, 'checkpoint')).exit, 2)
  assert.equal(git(f.base, 'ls-remote', f.remote), before)
})
test('FWE-017 external authority and approved raw source are mandatory', async (t) => {
  const f = fixture(t)
  const raw = readFileSync(f.authorityPath)
  unlinkSync(f.authorityPath)
  f.m.publication = {
    approved: true,
    remote: f.remote,
    ref: 'refs/heads/codex/frade-standard-workflow',
  }
  writeFileSync(f.manifestPath, JSON.stringify(f.m))
  const missing = await invoke(f, 'checkpoint')
  assert.equal(missing.exit, 2)
  assert.match(missing.body.detail, /UNSAFE_FILE|ENOENT/)
  writeFileSync(f.authorityPath, raw)
  delete f.m.publication
  writeFileSync(f.manifestPath, JSON.stringify(f.m))
  const planPath = join(f.root, 'openspec/changes/frade-standard-workflow/design.md')
  writeFileSync(
    planPath,
    'Unapproved plan with same target ' + f.remote + ' refs/heads/codex/frade-standard-workflow\n',
  )
  const drift = await invoke(f, 'checkpoint')
  assert.equal(drift.exit, 2)
  assert.equal(drift.body.detail, 'CURRENT_AUTHORITY_SOURCE_DRIFT')
})
test('FWE-016 rejects staged wrong scope, untracked and secret candidate without index loss', async (t) => {
  const f = fixture(t)
  writeFileSync(join(f.root, 'product.txt'), 'user\n')
  git(f.root, 'add', 'product.txt')
  const index = git(f.root, 'diff', '--cached', '--name-only')
  assert.equal((await invoke(f, 'checkpoint')).exit, 2)
  assert.equal(git(f.root, 'diff', '--cached', '--name-only'), index)
  git(f.root, 'restore', '--staged', 'product.txt')
  assert.equal((await invoke(f, 'checkpoint')).exit, 2)
  const seededSecret = ['password', '=secret\n'].join('')
  writeFileSync(join(f.root, f.evidencePath), seededSecret)
  f.event.evidence[0].sha256 = hash(seededSecret)
  save(f)
  assert.equal((await invoke(f, 'checkpoint')).exit, 2)
})
test('FWE-017 real divergent remote blocks and keeps local checkpoint', async (t) => {
  const f = fixture(t),
    cp = await invoke(f, 'checkpoint')
  assert.equal(cp.exit, 0, JSON.stringify(cp))
  const alien = join(f.base, 'alien')
  git(f.base, 'clone', f.remote, alien)
  git(alien, 'config', 'user.name', 'Alien')
  git(alien, 'config', 'user.email', 'alien@example.invalid')
  git(
    alien,
    'checkout',
    '-b',
    'codex/frade-standard-workflow',
    'origin/codex/frade-standard-workflow',
  )
  writeFileSync(join(alien, 'alien.txt'), 'alien\n')
  git(alien, 'add', 'alien.txt')
  git(alien, 'commit', '-m', 'alien')
  git(alien, 'push', f.remote, 'HEAD:refs/heads/codex/frade-standard-workflow')
  const pub = await invoke(f, 'publish', cp.body.receiptPath)
  assert.equal(pub.exit, 2, JSON.stringify(pub))
  assert.equal(pub.body.status, 'BLOCKED')
  assert.equal(git(f.root, 'rev-parse', 'HEAD'), cp.body.checkpointSha)
})
test('FWE-016 receipt-only event cannot recurse; repeated publish is refused', async (t) => {
  const f = fixture(t),
    cp = await invoke(f, 'checkpoint')
  assert.equal(cp.exit, 0, JSON.stringify(cp))
  f.event.kind = 'RECEIPT'
  f.event.paths = []
  f.event.evidence = []
  save(f)
  assert.equal((await invoke(f, 'checkpoint')).exit, 2)
  assert.equal(git(f.root, 'rev-parse', 'HEAD'), cp.body.checkpointSha)
  const pub = await invoke(f, 'publish', cp.body.receiptPath)
  assert.equal(pub.exit, 0, JSON.stringify(pub))
  assert.equal((await invoke(f, 'publish', cp.body.receiptPath)).exit, 2)
})
test('FWE-017 unavailable fresh remote is BLOCKED with local SHA retained', async (t) => {
  const f = fixture(t),
    cp = await invoke(f, 'checkpoint')
  assert.equal(cp.exit, 0, JSON.stringify(cp))
  renameSync(f.remote, f.remote + '.offline')
  const pub = await invoke(f, 'publish', cp.body.receiptPath)
  assert.equal(pub.exit, 2)
  assert.equal(pub.body.status, 'BLOCKED')
  assert.equal(pub.body.code, 'PUBLISH')
  assert.equal(git(f.root, 'rev-parse', 'HEAD'), cp.body.checkpointSha)
})
test('FWE-017 rejected push is BLOCKED, with raw failure and no publication claim', async (t) => {
  const f = fixture(t),
    cp = await invoke(f, 'checkpoint')
  assert.equal(cp.exit, 0, JSON.stringify(cp))
  const hook = join(f.remote, 'hooks/pre-receive')
  writeFileSync(hook, '#!/bin/sh\nexit 1\n')
  chmodSync(hook, 0o755)
  const pub = await invoke(f, 'publish', cp.body.receiptPath)
  assert.equal(pub.exit, 2, JSON.stringify(pub))
  assert.equal(pub.body.status, 'BLOCKED')
  assert.ok(pub.body.commands.some((x) => x.args[0] === 'push' && x.exitCode !== 0))
  assert.equal(git(f.root, 'rev-parse', 'HEAD'), cp.body.checkpointSha)
})
test('FWE-017 fresh post-push remote SHA mismatch is BLOCKED', async (t) => {
  const f = fixture(t),
    cp = await invoke(f, 'checkpoint')
  assert.equal(cp.exit, 0, JSON.stringify(cp))
  const old = git(f.base, 'ls-remote', f.remote, 'refs/heads/main').split('\t')[0]
  const hook = join(f.remote, 'hooks/post-receive')
  writeFileSync(
    hook,
    '#!/bin/sh\ngit update-ref refs/heads/codex/frade-standard-workflow ' + old + '\n',
  )
  chmodSync(hook, 0o755)
  const pub = await invoke(f, 'publish', cp.body.receiptPath)
  assert.equal(pub.exit, 2, JSON.stringify(pub))
  assert.equal(pub.body.status, 'BLOCKED')
  assert.equal(pub.body.detail, 'REMOTE_SHA_MISMATCH')
  assert.equal(git(f.root, 'rev-parse', 'HEAD'), cp.body.checkpointSha)
})
test('FWE-016 frozen checkpoint and missing new evidence remain blocked', async (t) => {
  const f = fixture(t)
  const freeze = join(f.common, 'frade-workflow/freeze/frade-standard-workflow.json')
  mkdirSync(join(freeze, '..'), { recursive: true })
  writeFileSync(freeze, '{}\n')
  assert.equal((await invoke(f, 'checkpoint')).exit, 2)
  renameSync(freeze, freeze + '.released')
  const cp = await invoke(f, 'checkpoint')
  assert.equal(cp.exit, 0, JSON.stringify(cp))
  assert.equal((await invoke(f, 'checkpoint')).exit, 2)
})
test('FWE-016 untrusted PASS and failed task health cannot grant tested cadence', async (t) => {
  const f = fixture(t)
  unlinkSync(f.admissionPath)
  const missing = await invoke(f, 'checkpoint')
  assert.equal(missing.exit, 2, JSON.stringify(missing))
  assert.match(missing.body.detail, /ADMISSION/)
  f.event.health = 'FAIL'
  save(f)
  const failed = await invoke(f, 'checkpoint')
  assert.equal(failed.exit, 2, JSON.stringify(failed))
  assert.match(failed.body.detail, /TASK_HEALTH/)
})
test('FWE-016 source and candidate admission bindings reject stale controller records', async (t) => {
  const f = fixture(t)
  const stale = { ...f.admission, candidateSha256: '0'.repeat(64) }
  writeFileSync(f.admissionPath, JSON.stringify(stale) + '\n')
  const result = await invoke(f, 'checkpoint')
  assert.equal(result.exit, 2, JSON.stringify(result))
  assert.match(result.body.detail, /ADMISSION_BINDING/)
})
test('FWE-017 origin and local URL rewrites reject alternate destination before remote operations', async (t) => {
  for (const config of ['origin', 'pushurl', 'rewrite']) {
    const f = fixture(t)
    const before = git(f.base, 'ls-remote', f.remote)
    if (config === 'origin') git(f.root, 'remote', 'set-url', 'origin', f.other)
    if (config === 'pushurl') git(f.root, 'config', 'remote.origin.pushurl', f.other)
    if (config === 'rewrite') git(f.root, 'config', 'url.' + f.other + '.insteadOf', f.remote)
    const result = await invoke(f, 'checkpoint')
    assert.equal(result.exit, 2, JSON.stringify(result))
    assert.equal(
      result.body.commands.some((x) => ['ls-remote', 'push'].includes(x.args[0])),
      false,
    )
    assert.equal(git(f.base, 'ls-remote', f.remote), before)
    assert.equal(git(f.base, 'ls-remote', f.other), '')
  }
})
test('FWE-016 changed candidate and missing current mandatory check block tested task', async (t) => {
  const f = fixture(t)
  writeFileSync(join(f.root, f.status), 'Health: RUNNING; task 2.6 different candidate\n')
  const changed = await invoke(f, 'checkpoint')
  assert.equal(changed.exit, 2, JSON.stringify(changed))
  assert.equal(changed.body.detail, 'ADMISSION_BINDING')
  const f2 = fixture(t)
  f2.admission.checks[0].exitCode = 1
  f2.admission.checks[0].result = 'FAIL'
  writeFileSync(f2.admissionPath, JSON.stringify(f2.admission) + '\n')
  const failed = await invoke(f2, 'checkpoint')
  assert.equal(failed.exit, 2, JSON.stringify(failed))
  assert.equal(failed.body.detail, 'ADMISSION_CHECK_FAILED')
})
test('FWE-016 honest blocker retains failed raw check and cannot claim tested task', async (t) => {
  const f = fixture(t)
  const failure = 'FAIL: regression exited 1\n'
  writeFileSync(join(f.root, f.evidencePath), failure)
  writeFileSync(
    join(f.root, f.status),
    'Health: BLOCKED; regression FAIL; READY_FOR_VERIFY: NO; READY_FOR_CLOSURE: NO\n',
  )
  f.event.kind = 'BLOCKER'
  f.event.health = 'BLOCKED'
  delete f.event.task
  f.event.evidence[0].sha256 = hash(failure)
  save(f)
  const rawPath = join(f.common, 'frade-workflow/publication-checks', f.m.id, 'regression.log')
  writeFileSync(rawPath, failure)
  const check = f.admission.checks.find((x) => x.id === 'regression')
  check.exitCode = 1
  check.result = 'FAIL'
  check.raw.sha256 = hash(failure)
  f.admission.kind = 'BLOCKER'
  f.admission.task = null
  f.admission.eventSha256 = hash(readFileSync(f.eventPath))
  f.admission.candidateSha256 = hash(
    f.event.paths
      .slice()
      .sort()
      .map((p) => p + '\0' + hash(readFileSync(join(f.root, p))) + '\n')
      .join(''),
  )
  const path = join(
    f.common,
    'frade-workflow/publication-admission',
    f.m.id,
    f.admission.eventSha256 + '.json',
  )
  writeFileSync(path, JSON.stringify(f.admission) + '\n')
  const cp = await invoke(f, 'checkpoint')
  assert.equal(cp.exit, 0, JSON.stringify(cp))
  assert.equal(cp.body.status, 'CHECKPOINTED')
  const receipt = JSON.parse(readFileSync(cp.body.receiptPath))
  assert.equal(receipt.event.kind, 'BLOCKER')
  assert.equal(receipt.event.health, 'BLOCKED')
  assert.equal(
    git(f.base, 'ls-remote', f.remote, 'refs/heads/codex/frade-standard-workflow').split(
      '\t',
    )[0] === cp.body.checkpointSha,
    false,
  )
})
test('FWE-016 stages current publication source and encoded negative test fixture safely', async (t) => {
  const f = fixture(t)
  const source = 'scripts/directions/cli.mjs'
  const testSource = 'tests/directions/publication.test.mjs'
  mkdirSync(join(f.root, 'tests/directions'), { recursive: true })
  copyFileSync(resolve(source), join(f.root, source))
  copyFileSync(resolve(testSource), join(f.root, testSource))
  writeFileSync(
    join(f.root, source),
    readFileSync(join(f.root, source), 'utf8') + '\n// Fixture candidate change\n',
  )
  f.event.paths.push(source, testSource)
  save(f)
  f.admission.eventSha256 = hash(readFileSync(f.eventPath))
  f.admission.candidateSha256 = hash(
    f.event.paths
      .slice()
      .sort()
      .map((p) => p + '\0' + hash(readFileSync(join(f.root, p))) + '\n')
      .join(''),
  )
  const admissionPath = join(
    f.common,
    'frade-workflow/publication-admission',
    f.m.id,
    f.admission.eventSha256 + '.json',
  )
  writeFileSync(admissionPath, JSON.stringify(f.admission) + '\n')
  const cp = await invoke(f, 'checkpoint')
  assert.equal(cp.exit, 0, JSON.stringify(cp))
  const tree = git(f.root, 'show', '--pretty=format:', '--name-only', cp.body.checkpointSha)
  assert.match(tree, /scripts\/directions\/cli\.mjs/)
  assert.match(tree, /tests\/directions\/publication\.test\.mjs/)
})
test('FWE-017 local config inspection does not copy unrelated values into receipts', async (t) => {
  const f = fixture(t)
  const marker = ['private', '-fixture-value'].join('')
  git(f.root, 'config', 'fixture.unrelated', marker)
  const cp = await invoke(f, 'checkpoint')
  assert.equal(cp.exit, 0, JSON.stringify(cp))
  const receipt = JSON.parse(readFileSync(cp.body.receiptPath))
  assert.equal(JSON.stringify(receipt).includes(marker), false)
})

test('FWE-017 stdout-only cached diff diagnostic blocks checkpoint without losing Git error', async (t) => {
  const valid = fixture(t)
  const prerequisite = await invoke(valid, 'checkpoint')
  assert.equal(prerequisite.exit, 0, JSON.stringify(prerequisite))
  assert.equal(prerequisite.body.status, 'CHECKPOINTED')

  const f = fixture(t)
  const head = git(f.root, 'rev-parse', 'HEAD')
  const remoteRef = git(f.base, 'ls-remote', f.remote, 'refs/heads/codex/frade-standard-workflow')
  writeFileSync(
    join(f.root, f.status),
    'Health: RUNNING; task 2.6 checks PASS; Verify/POST NOT_RUN \n',
  )
  f.admission.candidateSha256 = hash(
    f.event.paths
      .slice()
      .sort()
      .map((p) => p + '\0' + hash(readFileSync(join(f.root, p))) + '\n')
      .join(''),
  )
  writeFileSync(f.admissionPath, JSON.stringify(f.admission) + '\n')

  const failed = await invoke(f, 'checkpoint')
  const diff = failed.body.commands.find(
    (entry) => JSON.stringify(entry.args) === JSON.stringify(['diff', '--cached', '--check']),
  )
  assert.ok(diff, JSON.stringify(failed))
  assert.deepEqual(diff.args, ['diff', '--cached', '--check'])
  assert.equal(diff.exitCode, 2, JSON.stringify(diff))
  assert.equal(diff.status, 2)
  assert.equal(diff.stderr, '')
  assert.match(diff.stdout, /BRANCH-STATUS\.md:\d+: trailing whitespace/)
  assert.equal(failed.exit, 2)
  assert.equal(failed.body.status, 'BLOCKED')
  assert.equal(failed.body.code, 'CHECKPOINT')
  assert.match(failed.body.detail, /GIT_diff:.*BRANCH-STATUS\.md:\d+: trailing whitespace/s)
  assert.doesNotMatch(failed.body.detail, /TypeError|\.trim is not a function/)
  assert.equal(git(f.root, 'rev-parse', 'HEAD'), head)
  assert.equal(
    git(f.base, 'ls-remote', f.remote, 'refs/heads/codex/frade-standard-workflow'),
    remoteRef,
  )
  assert.equal(
    failed.body.commands.some((entry) => ['commit', 'push'].includes(entry.args[0])),
    false,
  )
  assert.equal(existsSync(join(f.common, 'frade-workflow/publication', f.m.id)), false)
})

test('FWE-016 benign identifiers, functions, objects and regex checkpoint through public guard', async (t) => {
  const f = fixture(t)
  const source = [
    ['const to', 'ken = Object.freeze({})'].join(''),
    ['function se', 'cret(value) { return value }'].join(''),
    ['const pass', 'word = makeFixtureValue()'].join(''),
    ['const api_', 'key = { fixture: true }'].join(''),
    ['const matcher = /to', 'ken\\s*[:=]\\s*\\w+/i'].join(''),
    '',
  ].join('\n')
  const path = 'scripts/directions/checkpoint-content.mjs'
  bindCandidate(f, path, source)
  const cp = await invoke(f, 'checkpoint')
  assert.equal(cp.exit, 0, JSON.stringify(cp))
  assert.equal(cp.body.status, 'CHECKPOINTED')
  assert.equal(git(f.root, 'show', 'HEAD:' + path), source.trim())
})

test('FWE-016 historical W01 review control source checkpoints through public guard', async (t) => {
  const f = fixture(t)
  const sourcePath = 'scripts/directions/review.mjs'
  const source = readFileSync(
    resolve('tests/directions/authority-fixtures/w01-review-historical.snapshot'),
  )
  assert.equal(hash(source), '3eb07b29ebcf3d45a1246b2eccae3416f2cdc613b1442b6a997942580b1f87aa')
  bindCandidate(f, sourcePath, source)
  const cp = await invoke(f, 'checkpoint')
  assert.equal(cp.exit, 0, JSON.stringify(cp))
  assert.equal(hash(git(f.root, 'show', 'HEAD:' + sourcePath) + '\n'), hash(source))
})

test('FWE-016 authenticated current W01 review control source checkpoints through public guard', async (t) => {
  const f = fixture(t)
  const sourcePath = 'scripts/directions/review.mjs'
  const source = readFileSync(resolve(sourcePath))
  assert.equal(hash(source), '26aca7b752e4bd00212d6a6d5fe6f9eac5d328a607aa40ad760c57d926ad691f')
  bindCandidate(f, sourcePath, source)
  const cp = await invoke(f, 'checkpoint')
  assert.equal(cp.exit, 0, JSON.stringify(cp))
  assert.equal(hash(git(f.root, 'show', 'HEAD:' + sourcePath) + '\n'), hash(source))
})

test('FWE-016 literal credential candidates block before HEAD, index or remote changes', async (t) => {
  const values = [
    ['to', 'ken = fixture_only_value_1234'].join(''),
    ['pass', 'word: "fixture_only_value_1234"'].join(''),
    ['api_', "key = 'fixture_only_value_1234'"].join(''),
    ['const se', 'cret = `fixture_only_value_1234`'].join(''),
  ]
  for (const [index, content] of values.entries()) {
    const f = fixture(t)
    bindCandidate(f, 'scripts/directions/checkpoint-content-' + index + '.mjs', content + '\n')
    const before = checkpointState(f)
    const result = await invoke(f, 'checkpoint')
    assert.equal(result.exit, 2, JSON.stringify({ content, result }))
    assert.match(result.body.detail, /SECRET_CANDIDATE/)
    assert.deepEqual(checkpointState(f), before)
    assert.equal(
      result.body.commands.some((x) => ['add', 'commit', 'push'].includes(x.args[0])),
      false,
    )
  }
})

test('FWE-016 private key blocks and prohibited credential filenames block before mutation', async (t) => {
  const samples = [
    [
      'scripts/directions/checkpoint-content.pem.txt',
      ['-----BEGIN ', 'OPENSSH PRIVATE KEY-----'].join('') +
        '\nfixture_only_material\n' +
        ['-----END ', 'OPENSSH PRIVATE KEY-----'].join('') +
        '\n',
    ],
    ['docs/engineering/.env.local', 'fixture metadata\n'],
    ['docs/engineering/checkpoint.key', 'fixture metadata\n'],
    ['docs/engineering/checkpoint.p12', 'fixture metadata\n'],
  ]
  for (const [path, content] of samples) {
    const f = fixture(t)
    bindCandidate(f, path, content)
    const before = checkpointState(f)
    const result = await invoke(f, 'checkpoint')
    assert.equal(result.exit, 2, JSON.stringify({ path, result }))
    assert.match(result.body.detail, /SECRET_CANDIDATE/)
    assert.deepEqual(checkpointState(f), before)
    assert.equal(
      result.body.commands.some((x) => ['add', 'commit', 'push'].includes(x.args[0])),
      false,
    )
  }
})
