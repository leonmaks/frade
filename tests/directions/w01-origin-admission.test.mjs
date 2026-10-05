import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyHistoricalW01Evidence } from '../../scripts/directions/bootstrap.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const cli = join(root, 'scripts/directions/cli.mjs')
const fixtureRoot = join(root, 'tests/directions/authority-fixtures')
const manifestPath = join(fixtureRoot, 'w01-manifest.snapshot')
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const historicalSources = {
  design: 'w01-design.snapshot',
  decision: 'w01-d03.snapshot',
  user: 'w01-decisions.snapshot',
  audit: 'w01-audit.snapshot',
  pre: 'w01-pre.snapshot',
}
const call = (cwd, ...args) => {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: 'utf8',
  })
  assert.equal(result.error, undefined)
  assert.ok([0, 1, 2].includes(result.status), result.stderr)
  const lines = result.stdout.trim().split(/\r?\n/).filter(Boolean)
  assert.equal(lines.length, 1, result.stdout)
  return { status: result.status, body: JSON.parse(lines[0]) }
}
const git = (cwd, ...args) => {
  const result = spawnSync('git', ['-c', 'core.autocrlf=false', ...args], {
    cwd,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}

test('W01 historical evidence rejects foreign, stale and forged approvals without changing owner files', () => {
  const manifest = JSON.parse(readFileSync(manifestPath))
  const sources = Object.fromEntries(
    Object.entries(historicalSources).map(([key, path]) => [
      key,
      readFileSync(join(fixtureRoot, path)),
    ]),
  )
  const valid = {
    common: manifest.owner.gitCommon,
    owner: manifest.owner.worktree,
    manifest,
    control: {
      release: manifest.policy.release,
      policyVersion: manifest.policy.version,
      policySha256: manifest.policy.sha256,
    },
    sources,
  }
  assert.equal(verifyHistoricalW01Evidence(valid), true)
  const clone = () => JSON.parse(JSON.stringify(manifest))
  assert.throws(
    () => verifyHistoricalW01Evidence({ ...valid, common: 'E:/foreign/.git' }),
    /W01_HISTORICAL_ORIGIN_MISMATCH/,
  )
  assert.throws(
    () => verifyHistoricalW01Evidence({ ...valid, owner: 'E:/foreign/frade-standard-workflow' }),
    /W01_HISTORICAL_ORIGIN_MISMATCH/,
  )
  const stale = clone()
  stale.originalBaseline = '0'.repeat(40)
  assert.throws(
    () => verifyHistoricalW01Evidence({ ...valid, manifest: stale }),
    /W01_HISTORICAL_ORIGIN_MISMATCH/,
  )
  const staleCheckpoint = clone()
  staleCheckpoint.approvedCheckpoint = '0'.repeat(40)
  assert.throws(
    () => verifyHistoricalW01Evidence({ ...valid, manifest: staleCheckpoint }),
    /W01_HISTORICAL_ORIGIN_MISMATCH/,
  )
  const forged = clone()
  forged.stages[0].admission.formalPRE = 'PASS_forged'
  assert.throws(
    () => verifyHistoricalW01Evidence({ ...valid, manifest: forged }),
    /W01_HISTORICAL_ORIGIN_MISMATCH/,
  )
  const forgedReceipt = clone()
  forgedReceipt.reviewReceipts.formalPRE.sha256 = '0'.repeat(64)
  assert.throws(
    () => verifyHistoricalW01Evidence({ ...valid, manifest: forgedReceipt }),
    /W01_HISTORICAL_ORIGIN_MISMATCH/,
  )
  const changedDecision = Buffer.from(sources.decision)
  changedDecision[changedDecision.length - 2] ^= 1
  assert.throws(
    () =>
      verifyHistoricalW01Evidence({
        ...valid,
        sources: { ...sources, decision: changedDecision },
      }),
    /W01_HISTORICAL_DECISION_DRIFT/,
  )
  const changedPre = Buffer.from(sources.pre)
  changedPre[changedPre.length - 2] ^= 1
  assert.throws(
    () =>
      verifyHistoricalW01Evidence({
        ...valid,
        sources: { ...sources, pre: changedPre },
      }),
    /W01_HISTORICAL_PRE_DRIFT/,
  )
  assert.throws(
    () => verifyHistoricalW01Evidence({ ...valid, sources: { ...sources, audit: undefined } }),
    /W01_HISTORICAL_AUDIT_DRIFT/,
  )
})

test('FWE-012-S02 public writer dispatch remains unavailable and cannot mutate a repository', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'frade-writer-block-'))
  git(cwd, 'init', '-q')
  git(cwd, 'config', 'user.name', 'Fixture')
  git(cwd, 'config', 'user.email', 'fixture@example.test')
  writeFileSync(join(cwd, 'sentinel.txt'), 'unchanged\n')
  git(cwd, 'add', 'sentinel.txt')
  git(cwd, 'commit', '-qm', 'sentinel')
  const before = {
    head: git(cwd, 'rev-parse', 'HEAD'),
    index: git(cwd, 'ls-files', '-s'),
    files: git(cwd, 'status', '--porcelain'),
    sentinel: sha(readFileSync(join(cwd, 'sentinel.txt'))),
  }
  for (const command of ['writer-dispatch', 'writer']) {
    const result = call(cwd, command, manifestPath)
    assert.equal(result.status, 2)
    assert.equal(result.body.status, 'NOT_IMPLEMENTED')
    assert.equal(result.body.code, 'COMMAND_NOT_IMPLEMENTED')
  }
  assert.equal(git(cwd, 'rev-parse', 'HEAD'), before.head)
  assert.equal(git(cwd, 'ls-files', '-s'), before.index)
  assert.equal(git(cwd, 'status', '--porcelain'), before.files)
  assert.equal(sha(readFileSync(join(cwd, 'sentinel.txt'))), before.sentinel)
  assert.equal(existsSync(join(cwd, 'frade-workflow')), false)
})

test('FWE-018-S01 guide and bootstrap examples match public CLI guards and honest boundary', () => {
  const guide = readFileSync(join(root, 'docs/engineering/newcomer-guide.md'), 'utf8')
  const bootstrap = readFileSync(
    join(root, 'docs/engineering/templates/task-2.3-bootstrap.md'),
    'utf8',
  )
  assert.match(guide, /NOT_DEPLOYED_W01_CLOSURE_PENDING/)
  assert.match(guide, /Writer dispatch is `NOT_IMPLEMENTED`/)
  assert.match(
    guide,
    /You decide material goal\/spec\/scope, model, visual or destination questions/,
  )
  assert.match(guide, /absolute JSON request or manifest path/)
  assert.match(bootstrap, /node scripts\/directions\/cli\.mjs plan \/absolute\/path\/request\.json/)
  assert.match(
    bootstrap,
    /node scripts\/directions\/cli\.mjs create \/absolute\/path\/request\.json/,
  )
  assert.match(
    bootstrap,
    /node scripts\/directions\/cli\.mjs check \/absolute\/canonical\/owners\/example-direction\/docs\/engineering\/directions\/example-direction\/direction\.json/,
  )
  const example = JSON.parse(bootstrap.match(/```json\n([\s\S]*?)\n```/)?.[1] ?? '')
  assert.equal(example.schemaVersion, 1)
  assert.equal(example.publication.authorization, 'pending human decision')
  assert.match(bootstrap, /requires an external request grant/)
  for (const command of ['plan', 'create', 'check', 'status']) {
    const invalid = call(root, command, 'relative/request.json')
    assert.equal(invalid.status, 2)
    assert.equal(invalid.body.code, 'ARGUMENTS')
  }
  const invalidExtra = call(root, 'status', manifestPath, '--unexpected')
  assert.equal(invalidExtra.status, 2)
  assert.equal(invalidExtra.body.code, 'ARGUMENTS')
})
