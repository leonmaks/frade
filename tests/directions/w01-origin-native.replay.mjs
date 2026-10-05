import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ownerRoot = 'E:/dev/codex/frade-worktrees/frade-standard-workflow'
const cli = join(ownerRoot, 'scripts/directions/cli.mjs')
const manifestPath = join(
  ownerRoot,
  'docs/engineering/directions/frade-standard-workflow/direction.json',
)
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const call = (command) => {
  const result = spawnSync(process.execPath, [cli, command, manifestPath], {
    cwd: ownerRoot,
    encoding: 'utf8',
  })
  assert.equal(result.error, undefined)
  const lines = result.stdout.trim().split(/\r?\n/).filter(Boolean)
  assert.equal(lines.length, 1, result.stdout)
  return { status: result.status, body: JSON.parse(lines[0]) }
}

test('W01 historical admission: real registered owner public check and status accept its original origin', () => {
  assert.equal(existsSync(manifestPath), true, 'Run in the registered W01 checkout')
  const manifest = JSON.parse(readFileSync(manifestPath))
  assert.equal(manifest.id, 'frade-standard-workflow')
  assert.equal(resolve(manifest.owner.worktree), resolve(ownerRoot))
  assert.equal(manifest.originalBaseline, '98f387f96b51b0ad139e3507c376ff1c3e8dec09')
  assert.equal(
    manifest.policy.artifact,
    'openspec/changes/frade-standard-workflow/evidence/shared-policy/agent-workflow.md',
  )
  assert.equal(
    sha(readFileSync(join(ownerRoot, 'openspec/changes/frade-standard-workflow/design.md'))),
    '501168ced50a35e128a0fc86e79bab6ac9aa31cd343eca3eedac56f81570978a',
  )
  const checked = call('check')
  assert.equal(checked.status, 0, JSON.stringify(checked.body))
  assert.equal(checked.body.status, 'VALID')
  const status = call('status')
  assert.equal(status.status, 0, JSON.stringify(status.body))
  assert.equal(status.body.ok, true)
  assert.equal(status.body.detail, undefined)
})
