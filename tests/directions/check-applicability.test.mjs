import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  existsSync,
  readFileSync,
  unlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkApplicability } from '../../scripts/directions/check-applicability.mjs'

function git(cwd, ...args) {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8' })
  assert.equal(run.error, undefined, `spawn ${args.join(' ')}: ${run.error?.message}`)
  assert.equal(run.signal, null, `signal ${args.join(' ')}: ${run.signal}`)
  assert.equal(run.status, 0, `status ${run.status}: ${run.stderr}`)
  return run.stdout.trim()
}
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'frade-applicability-'))
  git(root, 'init', '-q')
  git(root, 'config', 'user.name', 'Fixture')
  git(root, 'config', 'user.email', 'fixture@example.test')
  mkdirSync(join(root, 'packages/draw'), { recursive: true })
  writeFileSync(join(root, 'packages/draw/product.txt'), 'baseline\n')
  git(root, 'add', '.')
  git(root, 'commit', '-qm', 'baseline')
  const baseline = git(root, 'rev-parse', 'HEAD')
  const plan = {
    version: 1,
    owner: 'alpha',
    baseline,
    decidedBeforeExecution: true,
    required: ['direction-controls'],
    notApplicable: [{ family: 'visual', reason: 'No UI delta' }],
  }
  mkdirSync(join(root, 'docs/engineering/directions/alpha'), { recursive: true })
  writeFileSync(
    join(root, 'docs/engineering/directions/alpha/direction.json'),
    JSON.stringify({ id: 'alpha', originalBaseline: baseline }),
  )
  writeFileSync(join(root, 'docs/engineering/check-applicability.json'), JSON.stringify(plan))
  git(root, 'add', '.')
  git(root, 'commit', '-qm', 'control plan')
  return { root, plan }
}

test('N/A is reported only after unchanged committed and working product tree proof', () => {
  const { root } = fixture()
  const good = checkApplicability({ root })
  assert.equal(good.ok, true, JSON.stringify(good))
  assert.equal(good.productChecks, 'NOT_RUN')
  assert.match(good.planSha256, /^[a-f0-9]{64}$/)
  assert.match(good.protectedTreeSha256, /^[a-f0-9]{64}$/)
  assert.match(good.sourceHead, /^[a-f0-9]{40}$/)
  writeFileSync(join(root, 'packages/draw/product.txt'), 'working change\n')
  const dirty = checkApplicability({ root })
  assert.equal(dirty.ok, false, JSON.stringify(dirty))
  assert.match(dirty.detail, /PROTECTED_TREE_CHANGED/)
  git(root, 'add', 'packages/draw/product.txt')
  git(root, 'commit', '-qm', 'product changed')
  const committed = checkApplicability({ root })
  assert.equal(committed.ok, false, JSON.stringify(committed))
  assert.match(committed.detail, /PROTECTED_TREE_CHANGED/)
})

test('missing predecision and source-bound baseline cannot declare N/A', () => {
  const { root, plan } = fixture()
  plan.decidedBeforeExecution = false
  writeFileSync(join(root, 'docs/engineering/check-applicability.json'), JSON.stringify(plan))
  assert.match(checkApplicability({ root }).detail, /INVALID_APPLICABILITY_PLAN/)
  plan.decidedBeforeExecution = true
  plan.baseline = 'a'.repeat(40)
  writeFileSync(join(root, 'docs/engineering/check-applicability.json'), JSON.stringify(plan))
  assert.match(checkApplicability({ root }).detail, /BASELINE_MISMATCH/)
})

test('locally configured fsmonitor hook cannot run during applicability proof', () => {
  const { root } = fixture()
  const hook = join(root, 'fsmonitor-hook.sh')
  const marker = join(root, 'fsmonitor-ran.txt')
  const shellMarker = marker
    .replaceAll('\\', '/')
    .replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`)
    .replaceAll("'", "'\\''")
  writeFileSync(hook, `#!/bin/sh\nprintf 'executed\\n' >> '${shellMarker}'\nprintf '/\\n'\n`)
  chmodSync(hook, 0o755)
  git(root, 'config', 'core.fsmonitor', hook.replaceAll('\\', '/'))
  git(root, 'config', '--local', 'core.useBuiltinFSMonitor', 'false')
  assert.equal(git(root, 'config', '--get', 'core.fsmonitor'), hook.replaceAll('\\', '/'))
  assert.equal(git(root, 'config', '--get', 'core.useBuiltinFSMonitor'), 'false')

  const control = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: root,
    encoding: 'utf8',
  })
  assert.equal(control.error, undefined, `ordinary Git spawn: ${control.error?.message}`)
  assert.equal(control.signal, null, `ordinary Git signal: ${control.signal}`)
  assert.equal(control.status, 0, `ordinary Git status: ${control.stderr}`)
  assert.equal(existsSync(marker), true, 'ordinary Git must execute the configured hook')
  assert.equal(readFileSync(marker, 'utf8'), 'executed\n')
  unlinkSync(marker)

  const proven = checkApplicability({ root })
  assert.equal(proven.ok, true, JSON.stringify(proven))
  assert.equal(proven.status, 'APPLICABILITY_PROVEN')
  assert.match(proven.protectedTreeSha256, /^[a-f0-9]{64}$/)
  assert.equal(readFileSync(join(root, 'packages/draw/product.txt'), 'utf8'), 'baseline\n')
  assert.equal(existsSync(marker), false, 'applicability must not execute the local fsmonitor hook')

  writeFileSync(join(root, 'packages/draw/product.txt'), 'working product delta\n')
  const changed = checkApplicability({ root })
  assert.equal(changed.ok, false, JSON.stringify(changed))
  assert.match(changed.detail, /PROTECTED_TREE_CHANGED/)
  assert.equal(
    existsSync(marker),
    false,
    'delta detection must not execute the local fsmonitor hook',
  )
})
