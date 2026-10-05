// Execute only in native Windows with the registered W01 owner path as argv[2].
// Imports the staged production modules; restores the owner's exact status bytes.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, writeFile, lstat, open, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { refreshStatus } from '../../scripts/directions/status.mjs'

const owner = process.argv[2]
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const git = (...args) => {
  const run = spawnSync('git', ['-c', 'core.autocrlf=false', ...args], {
    cwd: owner,
    encoding: 'utf8',
  })
  assert.equal(run.status, 0, `${args.join(' ')}: ${run.stderr}`)
  return run.stdout.trim()
}

test('V-04 native registered historical W01 refuses frozen write then refreshes after release', async () => {
  assert.equal(process.platform, 'win32')
  assert.ok(
    owner && resolve(owner) === resolve('E:/dev/codex/frade-worktrees/frade-standard-workflow'),
  )
  const manifestPath = join(
    owner,
    'docs/engineering/directions/frade-standard-workflow/direction.json',
  )
  const manifestBytes = await readFile(manifestPath)
  const manifest = JSON.parse(manifestBytes)
  assert.equal(resolve(manifest.owner.worktree), resolve(owner))
  assert.equal(manifest.id, 'frade-standard-workflow')
  const common = resolve(owner, git('rev-parse', '--git-common-dir'))
  assert.equal(resolve(manifest.owner.gitCommon), common)
  const journal = join(common, 'frade-workflow/intents/frade-standard-workflow.json')
  const complete = join(common, 'frade-workflow/intents/frade-standard-workflow.complete.json')
  for (const path of [journal, complete]) {
    await assert.rejects(lstat(path), { code: 'ENOENT' })
  }
  const checkRun = spawnSync(
    process.execPath,
    [join(owner, 'scripts/directions/cli.mjs'), 'check', manifestPath],
    { cwd: owner, encoding: 'utf8' },
  )
  assert.equal(checkRun.status, 0, `${checkRun.stderr}\n${checkRun.stdout}`)
  const checked = JSON.parse(checkRun.stdout.trim())
  assert.equal(checked.status, 'VALID', JSON.stringify(checked))
  const statusPath = join(owner, manifest.statusPath)
  const original = await readFile(statusPath)
  const before = {
    head: git('rev-parse', 'HEAD'),
    index: git('ls-files', '-s'),
    status: git('status', '--porcelain'),
  }
  const tasksText = await readFile(
    join(owner, 'openspec/changes/frade-standard-workflow/tasks.md'),
    'utf8',
  )
  const input = {
    manifest,
    ownerRoot: owner,
    tasksText,
    snapshot: { sourceSha256: sha(manifestBytes), configSha256: manifest.policy.sha256 },
    updatedAt: '2026-10-05T00:00:00.000Z',
    write: true,
  }
  const marker = join(common, 'frade-workflow/freeze/frade-standard-workflow.json')
  const markerBytes = Buffer.from(
    JSON.stringify({ test: 'task41-V-04-native-replay', owner, head: before.head }) + '\n',
  )
  let created = false
  try {
    const handle = await open(marker, 'wx')
    created = true
    try {
      await handle.writeFile(markerBytes)
    } finally {
      await handle.close()
    }
    const frozen = await refreshStatus(input)
    assert.equal(frozen.status, 'FROZEN', JSON.stringify(frozen))
    assert.deepEqual(await readFile(statusPath), original)
    assert.deepEqual(await readFile(marker), markerBytes)
    await unlink(marker)
    created = false
    const written = await refreshStatus(input)
    assert.equal(written.status, 'WRITTEN', JSON.stringify(written))
    assert.ok(written.projection.issues.every((x) => x.code !== 'TASK_MALFORMED'))
    assert.ok((await readFile(statusPath)).includes(Buffer.from('PROJECTION_SOURCE_SHA256:')))
  } finally {
    if (created) {
      assert.deepEqual(await readFile(marker), markerBytes)
      await unlink(marker)
    }
    if (!(await readFile(statusPath)).equals(original)) await writeFile(statusPath, original)
    assert.deepEqual(await readFile(statusPath), original)
    assert.equal(git('rev-parse', 'HEAD'), before.head)
    assert.equal(git('ls-files', '-s'), before.index)
    assert.equal(git('status', '--porcelain'), before.status)
  }
})
