import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { createArtifactReader } from '../../scripts/directions/evidence.mjs'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const missing = () => ({ ok: false, status: 'BLOCKED', issues: [{ code: 'NOT_IMPLEMENTED' }] })
const roles = await import('../../scripts/directions/roles.mjs').catch((error) => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
  return { createRoleAuthority: () => ({}), resolveRole: missing, writableWorkerDispatch: missing }
})
const issue = (result, code) => {
  assert.equal(result.ok, false)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.issues.some((entry) => entry.code === code), JSON.stringify(result))
}

async function fixture(t, rows = ['| S01 | build | executor | gpt-6-sol | high |']) {
  const root = await mkdtemp(join(tmpdir(), 'frade-roles-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const plan = `${rows.join('\n')}\n`
  const decision = JSON.stringify({ approved: true, revision: 'r1', rows })
  await writeFile(join(root, 'plan.md'), plan)
  await writeFile(join(root, 'decision.json'), decision)
  const reader = createArtifactReader(root)
  const source = { path: 'plan.md', sha256: hash(plan), revision: 'r1' }
  const authority = roles.createRoleAuthority({
    bindings: [source, { path: 'decision.json', sha256: hash(decision), revision: 'r1' }],
    verifyApproval: async ({ assignment, decision: proof }) => {
      const actual = await reader.read('decision.json')
      const approved = JSON.parse(actual.bytes.toString())
      return proof?.path === 'decision.json' && proof.sha256 === actual.sha256 &&
        approved.approved === true && approved.revision === 'r1' &&
        approved.rows.includes(assignment.source.excerpt)
    },
  })
  const stage = {
    id: 'S01',
    roleAssignments: [{ taskType: 'build', role: 'executor', model: 'gpt-6-sol', effort: 'high' }],
    roleAuthority: { ...source, decision: { path: 'decision.json', sha256: hash(decision) } },
    taskOverrides: [],
  }
  const request = { manifest: { stages: [stage] }, stageId: 'S01', taskId: '2.2',
    taskType: 'build', role: 'executor', reader, authority }
  return { root, stage, source, request, reader, authority }
}

test('FWE-009 exact stage/type/role resolves one pair and source provenance', async (t) => {
  const { request, source } = await fixture(t)
  const result = await roles.resolveRole(request)
  assert.equal(result.ok, true)
  assert.equal(result.status, 'RESOLVED')
  assert.equal(result.assignment.model, 'gpt-6-sol')
  assert.equal(result.assignment.effort, 'high')
  assert.equal(result.assignment.stage, 'S01')
  assert.equal(result.assignment.task, '2.2')
  assert.equal(result.assignment.taskType, 'build')
  assert.equal(result.assignment.role, 'executor')
  assert.equal(result.assignment.source.path, source.path)
  assert.equal(result.assignment.source.sha256, source.sha256)
  assert.equal(result.assignment.source.excerpt, '| S01 | build | executor | gpt-6-sol | high |')
  assert.equal(result.assignment.source.revision, 'r1')
  assert.equal(result.provenance.actualBackend, 'NOT_CONFIRMED')
  assert.equal(result.provenance.actualEffort, 'NOT_CONFIRMED')
  assert.equal(result.provenance.availability, 'NOT_CONFIRMED')
})

test('FWE-009 missing, range and contradictory assignments block', async (t) => {
  const { request, stage } = await fixture(t)
  stage.roleAssignments = []
  issue(await roles.resolveRole(request), 'ROLE_MISSING')
  stage.roleAssignments = [{ taskType: 'build', role: 'executor', model: 'gpt-6-sol', effort: 'high/xhigh' }]
  issue(await roles.resolveRole(request), 'ROLE_PAIR')
  stage.roleAssignments = [
    { taskType: 'build', role: 'executor', model: 'gpt-6-sol', effort: 'high' },
    { taskType: 'build', role: 'executor', model: 'gpt-6-astra', effort: 'high' },
  ]
  issue(await roles.resolveRole(request), 'ROLE_CONFLICT')
})

test('FWE-009 role confusion and forged request metadata cannot select a reviewer', async (t) => {
  const { request } = await fixture(t)
  issue(await roles.resolveRole({ ...request, role: 'independent-PRE' }), 'ROLE_MISSING')
  issue(await roles.resolveRole({ ...request, authority: { verifyApproval: () => true },
    approvedModel: 'gpt-6-astra' }), 'ROLE_AUTHORITY')
})

test('FWE-009 direct approval must be established outside the request', async (t) => {
  const { request, source, reader } = await fixture(t)
  issue(await roles.resolveRole({ ...request, authority: undefined }), 'ROLE_AUTHORITY')
  const falseAuthority = roles.createRoleAuthority({ bindings: [source], verifyApproval: async () => false })
  issue(await roles.resolveRole({ ...request, authority: falseAuthority }), 'ROLE_APPROVAL')
  const forged = roles.createRoleAuthority({ bindings: [{ ...source, sha256: 'a'.repeat(64) }],
    verifyApproval: async () => true })
  issue(await roles.resolveRole({ ...request, authority: forged, reader }), 'ROLE_SOURCE_BINDING')
})

test('FWE-009 changed source bytes and changed excerpt block', async (t) => {
  const { root, request } = await fixture(t)
  await writeFile(join(root, 'plan.md'), '| S01 | build | executor | gpt-6-sol | xhigh |\n')
  issue(await roles.resolveRole(request), 'ROLE_SOURCE_DRIFT')
  const other = await fixture(t)
  other.stage.roleAssignments[0].model = 'gpt-6-astra'
  issue(await roles.resolveRole(other.request), 'ROLE_EXCERPT')
})

test('FWE-009 reviewed task override applies only to its exact task and role', async (t) => {
  const row = '| S01 | 2.2 | build | executor | gpt-6-astra | xhigh | exception: deep audit |'
  const { root, stage, request, source } = await fixture(t, [
    '| S01 | build | executor | gpt-6-sol | high |', row,
  ])
  stage.taskOverrides = [{ taskId: '2.2', taskType: 'build', role: 'executor',
    model: 'gpt-6-astra', effort: 'xhigh', reason: 'deep audit',
    source: { ...source, excerpt: row },
    approval: stage.roleAuthority.decision }]
  const result = await roles.resolveRole(request)
  assert.equal(result.ok, true)
  assert.equal(result.assignment.model, 'gpt-6-astra')
  assert.equal(result.assignment.exception.reason, 'deep audit')
  assert.deepEqual(result.assignment.exception.approval, stage.roleAuthority.decision)
  const otherTask = await roles.resolveRole({ ...request, taskId: '2.3' })
  assert.equal(otherTask.assignment.model, 'gpt-6-sol')
  issue(await roles.resolveRole({ ...request, role: 'independent-PRE' }), 'ROLE_MISSING')
  await writeFile(join(root, 'plan.md'), '| altered |\n')
  issue(await roles.resolveRole(request), 'ROLE_SOURCE_DRIFT')
})

test('FWE-009 unapproved and duplicate task overrides block', async (t) => {
  const { stage, request } = await fixture(t)
  const override = { taskId: '2.2', taskType: 'build', role: 'executor',
    model: 'gpt-6-astra', effort: 'xhigh', reason: 'deep audit' }
  stage.taskOverrides = [override]
  issue(await roles.resolveRole(request), 'ROLE_OVERRIDE_APPROVAL')
  stage.taskOverrides = [override, { ...override }]
  issue(await roles.resolveRole(request), 'ROLE_OVERRIDE_CONFLICT')
})

test('FWE-012 invocation mismatch blocks; actual backend remains unattested', async (t) => {
  const { request } = await fixture(t)
  issue(await roles.resolveRole({ ...request, invoked: { model: 'gpt-6-astra', effort: 'high' } }),
    'ROLE_INVOKED_MISMATCH')
  const result = await roles.resolveRole({ ...request, invoked: { model: 'gpt-6-sol', effort: 'high' } })
  assert.deepEqual(result.provenance.requested, { model: 'gpt-6-sol', effort: 'high' })
  assert.deepEqual(result.provenance.invoked, { model: 'gpt-6-sol', effort: 'high' })
  assert.equal(result.provenance.actualBackend, 'NOT_CONFIRMED')
  assert.equal(result.provenance.actualEffort, 'NOT_CONFIRMED')
  issue(roles.writableWorkerDispatch(result), 'WRITER_NOT_IMPLEMENTED')
})

test('FWE-009 real W01 approved design and direct decisions resolve five roles', async () => {
  const root = fileURLToPath(new URL('../../../input/', import.meta.url))
  const reader = createArtifactReader(root)
  const design = 'openspec/changes/frade-standard-workflow/design.md'
  const decisions = 'openspec/changes/frade-standard-workflow/evidence/user-decisions.json'
  const designHash = '501168ced50a35e128a0fc86e79bab6ac9aa31cd343eca3eedac56f81570978a'
  const decisionHash = '126589d990e2e44b04efe8825b5ec4d90582205ba6c729375528c383ccbaf186'
  const pairs = [
    ['planning-architecture', 'gpt-6-astra', 'high', 'planningArchitecture'],
    ['independent-PRE', 'gpt-6-astra', 'xhigh', 'independentPRE'],
    ['tooling-tests', 'gpt-6-sol', 'high', 'toolingTests'],
    ['formal-Verify', 'gpt-6-astra', 'high', 'formalVerify'],
    ['independent-POST', 'gpt-6-astra', 'xhigh', 'independentPOST'],
  ]
  const authority = roles.createRoleAuthority({
    bindings: [{ path: design, sha256: designHash, revision: 'D03' },
      { path: decisions, sha256: decisionHash, revision: 'D03' }],
    verifyApproval: async ({ assignment, decision }) => {
      const actual = await reader.read(decisions)
      const record = JSON.parse(actual.bytes.toString())
      const key = pairs.find(([role]) => role === assignment.role)?.[3]
      return actual.sha256 === decisionHash && decision.path === decisions &&
        decision.sha256 === decisionHash && record.accepted.modelReply ===
        'Утверждаю предложенные назначения' &&
        record.accepted.concretePolicy.id === 'D03' &&
        record.accepted.concretePolicy.approvedArtifacts.some((item) =>
          item.path === design && item.sha256 === designHash) &&
        key && record.accepted.models[key]?.model === assignment.model &&
        record.accepted.models[key]?.effort === assignment.effort
    },
  })
  const manifest = { stages: [{ id: 'W01', roleAssignments: pairs.map(([role, model, effort]) =>
    ({ role, model, effort })), roleAuthority: { path: design, sha256: designHash,
    revision: 'D03', decision: { path: decisions, sha256: decisionHash } }, taskOverrides: [] }] }
  for (const [role, model, effort] of pairs) {
    const result = await roles.resolveRole({ manifest, stageId: 'W01', taskId: '2.2',
      taskType: role, role, reader, authority })
    assert.equal(result.ok, true, JSON.stringify(result))
    assert.equal(result.assignment.model, model)
    assert.equal(result.assignment.effort, effort)
    assert.equal(result.assignment.source.excerpt, `| W01 | ${role} | ${model} | ${effort} |`)
    assert.equal(result.assignment.source.sha256, designHash)
  }
})
