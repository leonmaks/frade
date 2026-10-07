import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createArtifactReader } from '../../scripts/directions/evidence.mjs'
import { createRoleAuthority, resolveRole } from '../../scripts/directions/roles.mjs'
import { prepareReview } from '../../scripts/directions/review.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const read = async (path) => readFile(join(root, path))
const installed = async () =>
  JSON.parse(await read('docs/engineering/directions/frade-standard-workflow/direction.json'))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const change = 'openspec/changes/frade-standard-workflow/'

// Probe installed W01 scope before owner access. No reviewer is dispatched.
test('V-01 installed exact scope passes review source preflight; widened and foreign scope fail', async () => {
  const manifest = await installed()
  assert.ok(manifest.scope.allowed.includes('.github/workflows/ci.yml'))
  const request = {
    phase: 'POST',
    stage: 'W01',
    task: '4.1',
    taskType: 'independent-POST',
    role: 'independent-POST',
    change: manifest.id,
    scope: 'W01 exact installed control scope',
    prompt: 'Review current W01 candidate.',
    paths: [
      'AGENTS.md',
      `${change}proposal.md`,
      `${change}design.md`,
      `${change}tasks.md`,
      ...[
        'engineering-direction-lifecycle',
        'engineering-role-dispatch',
        'engineering-progress-publication',
      ].map((x) => `${change}specs/${x}/spec.md`),
      `${change}evidence/user-decisions.json`,
      `${change}evidence/policy-acceptance.json`,
      manifest.policy.artifact,
      manifest.statusPath,
    ],
  }
  const result = await prepareReview({ manifest, request, root })
  assert.notEqual(result.code, 'REVIEW_SOURCE', JSON.stringify(result))
  for (const forbidden of ['.github/workflows/**', 'packages/**']) {
    const altered = structuredClone(manifest)
    altered.scope.allowed.push(forbidden)
    const denied = await prepareReview({ manifest: altered, request, root })
    assert.equal(denied.code, 'REVIEW_SOURCE', forbidden)
  }
  const foreign = { ...request, paths: [...request.paths, 'packages/foreign/file.ts'] }
  assert.equal((await prepareReview({ manifest, request: foreign, root })).code, 'REVIEW_SOURCE')
})

test('V-02 all five installed roles resolve only through raw design and D03 decision', async () => {
  const manifest = await installed()
  const designPath = `${change}design.md`
  const d03Path = `${change}evidence/policy-acceptance.json`
  const design = await read(designPath),
    d03 = await read(d03Path)
  assert.equal(sha(design), '501168ced50a35e128a0fc86e79bab6ac9aa31cd343eca3eedac56f81570978a')
  assert.equal(sha(d03), manifest.policyAcceptance.sha256)
  const approval = JSON.parse(d03)
  assert.equal(approval.id, 'D03')
  assert.ok(
    approval.approvedArtifacts.some((x) => x.path === designPath && x.sha256 === sha(design)),
  )
  const reader = createArtifactReader(root)
  let approvals = 0
  const bindings = [
    { path: designPath, sha256: sha(design), revision: 'D03' },
    { path: d03Path, sha256: sha(d03), revision: 'D03' },
  ]
  const authority = createRoleAuthority({
    bindings,
    verifyApproval: async ({ assignment, rawDecision }) => {
      approvals++
      const doc = JSON.parse(rawDecision.bytes)
      return (
        doc.id === 'D03' &&
        doc.approvedArtifacts.some((x) => x.path === designPath && x.sha256 === sha(design)) &&
        design.toString('utf8').split(/\r?\n/).includes(assignment.source.excerpt)
      )
    },
  })
  const pairs = new Map([
    ['planning-architecture', ['gpt-6-astra', 'high']],
    ['tooling-tests', ['gpt-6-sol', 'high']],
    ['formal-Verify', ['gpt-6-astra', 'high']],
    ['independent-PRE', ['gpt-6-astra', 'xhigh']],
    ['independent-POST', ['gpt-6-astra', 'xhigh']],
  ])
  for (const [role, [model, effort]] of pairs) {
    const result = await resolveRole({
      manifest,
      stageId: 'W01',
      taskId: '4.1',
      taskType: role,
      role,
      reader,
      authority,
    })
    assert.equal(result.status, 'RESOLVED', `${role}: ${JSON.stringify(result)}`)
    assert.equal(result.assignment.model, model)
    assert.equal(result.assignment.effort, effort)
  }
  assert.equal(approvals, 5)
  const drifted = structuredClone(manifest)
  drifted.stages[0].roleAuthority.sha256 = '0'.repeat(64)
  assert.equal(
    (
      await resolveRole({
        manifest: drifted,
        stageId: 'W01',
        taskId: '4.1',
        taskType: 'tooling-tests',
        role: 'tooling-tests',
        reader,
        authority,
      })
    ).ok,
    false,
  )
  const noApproval = createRoleAuthority({ bindings, verifyApproval: async () => false })
  const denied = await resolveRole({
    manifest,
    stageId: 'W01',
    taskId: '4.1',
    taskType: 'tooling-tests',
    role: 'tooling-tests',
    reader,
    authority: noApproval,
    approved: true,
  })
  assert.equal(denied.ok, false)
  assert.equal(denied.issues[0].code, 'ROLE_APPROVAL')
  const changed = Buffer.from(d03)
  changed[changed.length - 2] ^= 1
  const driftReader = {
    read: async (path) =>
      path === d03Path ? { bytes: changed, sha256: sha(changed) } : reader.read(path),
  }
  const drift = await resolveRole({
    manifest,
    stageId: 'W01',
    taskId: '4.1',
    taskType: 'tooling-tests',
    role: 'tooling-tests',
    reader: driftReader,
    authority,
  })
  assert.equal(drift.ok, false)
  assert.equal(drift.issues[0].code, 'ROLE_SOURCE_DRIFT')
})
