import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createArtifactReader, createEvidenceBoundary } from '../../scripts/directions/evidence.mjs'
import {
  scopeFingerprint,
  verifyApplicability,
  verifyTraceability,
} from '../../scripts/directions/contracts.mjs'
import { evaluateTransition } from '../../scripts/directions/lifecycle.mjs'
import { projectStatus } from '../../scripts/directions/status.mjs'
import { manifest } from './fixtures.mjs'

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const sourceSha256 = sha('synthetic numeric fixture source')
const configSha256 = sha('synthetic numeric fixture config')
const planSha256 = sha('synthetic numeric fixture plan')

// The test controller fixes this synthetic contract before a reporter makes any candidate.
// It is deliberately not a Frade performance or geometry limit.
async function controller() {
  const root = await mkdtemp(join(tmpdir(), 'frade-budget-boundary-'))
  await mkdir(join(root, 'budget'))
  await mkdir(join(root, 'raw'))
  const budgetPath = 'budget/approved.json'
  const approvedBytes = Buffer.from(
    JSON.stringify({
      contract: 'synthetic-test-only',
      unit: 'fixture-units',
      maximum: 10,
      sourceSha256,
      configSha256,
    }),
  )
  await writeFile(join(root, budgetPath), approvedBytes)
  const approval = Object.freeze({
    path: budgetPath,
    sha256: sha(approvedBytes),
    sourceSha256,
    configSha256,
  })
  const reader = createArtifactReader(root)
  const pinnedMeasurements = new Map()
  const recordMeasurement = async (name, measurement) => {
    const path = `raw/${name}.json`
    const raw = Buffer.from(
      JSON.stringify({
        measurement,
        sourceSha256,
        configSha256,
        budgetSha256: approval.sha256,
      }),
    )
    await writeFile(join(root, path), raw)
    pinnedMeasurements.set(path, sha(raw))
    return Object.freeze({ path, sha256: sha(raw) })
  }
  const m = manifest()
  m.stages[0].phase = 'CHECKS'
  const snapshot = {
    planSha256,
    scopeSha256: scopeFingerprint(m),
    sourceSha256,
    configSha256,
  }
  const baseKinds = ['policyDecision', 'checkpoint', 'pre', 'red', 'green']
  const evidence = Object.fromEntries(
    baseKinds.map((kind) => [
      kind,
      {
        kind,
        status: 'PASS',
        complete: true,
        scope: 'full',
        artifact: { path: `raw/${kind}.json`, sha256: sha(kind) },
        bindings: ['green'].includes(kind)
          ? { sourceSha256, configSha256 }
          : { planSha256, scopeSha256: snapshot.scopeSha256 },
      },
    ]),
  )
  const controllerRefs = new WeakSet(Object.values(evidence))
  const boundary = createEvidenceBoundary({
    verify: async (kind, ref, expected) => {
      if (controllerRefs.has(ref))
        return (
          ref.kind === kind &&
          Object.entries(expected).every(([key, value]) => ref.bindings[key] === value)
        )
      if (!['run', 'check', 'checks'].includes(kind)) return false
      if (ref.budgetSha256 !== approval.sha256) return false
      const budget = await reader.read(approval.path)
      if (budget.sha256 !== approval.sha256) return false
      const contract = JSON.parse(budget.bytes.toString('utf8'))
      if (
        contract.sourceSha256 !== approval.sourceSha256 ||
        contract.configSha256 !== approval.configSha256 ||
        contract.contract !== 'synthetic-test-only' ||
        contract.unit !== 'fixture-units' ||
        contract.maximum !== 10
      )
        return false
      const artifact = await reader.read(ref.artifact.path)
      if (
        artifact.sha256 !== ref.artifact.sha256 ||
        artifact.sha256 !== pinnedMeasurements.get(ref.artifact.path)
      )
        return false
      const actual = JSON.parse(artifact.bytes.toString('utf8'))
      return (
        actual.sourceSha256 === approval.sourceSha256 &&
        actual.configSha256 === approval.configSha256 &&
        actual.budgetSha256 === approval.sha256 &&
        Number.isFinite(actual.measurement) &&
        actual.measurement <= contract.maximum &&
        Object.entries(expected).every(([key, value]) => ref.bindings[key] === value)
      )
    },
  })
  return { root, approval, m, snapshot, evidence, boundary, recordMeasurement }
}

async function reporterCandidate(c, name, measurement, overrides = {}) {
  const artifact = await c.recordMeasurement(name, measurement)
  const ref = (kind) => ({
    kind,
    status: 'PASS',
    complete: true,
    scope: 'full',
    artifact,
    budgetSha256: c.approval.sha256,
    bindings: { sourceSha256, configSha256 },
    ...overrides,
  })
  const run = ref('run')
  const checkRun = ref('check')
  const check = {
    ...checkRun,
    id: 'synthetic-budget',
    contract: 'synthetic-fixture',
    applicability: 'REQUIRED',
    run: checkRun,
  }
  const trace = {
    requirements: [{ id: 'FWE-004', critical: true, scenarioIds: ['FIX-P', 'FIX-N', 'FIX-B'] }],
    scenarios: ['positive', 'negative', 'boundary'].map((control, i) => ({
      id: ['FIX-P', 'FIX-N', 'FIX-B'][i],
      requirementId: 'FWE-004',
      control,
      taskIds: ['3.1'],
      assertionIds: [`A${i}`],
    })),
    tasks: [{ id: '3.1', scenarioIds: ['FIX-P', 'FIX-N', 'FIX-B'] }],
    assertions: [0, 1, 2].map((i) => ({ id: `A${i}`, runId: 'MEASURE' })),
    runs: [{ id: 'MEASURE', sourceSha256, configSha256, environment: 'synthetic fixture', ...run }],
  }
  return { trace, check, gate: ref('checks') }
}

async function exercise(c, candidate) {
  const plan = { checks: [candidate.check], affectedContracts: ['synthetic-fixture'] }
  const status = await projectStatus({
    manifest: c.m,
    trace: candidate.trace,
    checks: plan.checks,
    affectedContracts: plan.affectedContracts,
    snapshot: c.snapshot,
    boundary: c.boundary,
  })
  const check = await verifyApplicability(plan, { boundary: c.boundary, snapshot: c.snapshot })
  const acceptance = await verifyTraceability(candidate.trace, {
    boundary: c.boundary,
    snapshot: c.snapshot,
  })
  const transition = await evaluateTransition({
    manifest: c.m,
    stageId: 'W01',
    target: 'VERIFICATION',
    evidence: { ...c.evidence, checks: candidate.gate },
    boundary: c.boundary,
    snapshot: c.snapshot,
  })
  return { status, check, acceptance, transition }
}

test('FWE-004-S02 independently approved synthetic budget admits within and exact boundary', async () => {
  const c = await controller()
  try {
    for (const [name, measurement] of [
      ['within', 9],
      ['exact', 10],
    ]) {
      const result = await exercise(c, await reporterCandidate(c, name, measurement))
      assert.equal(result.check.ok, true)
      assert.equal(result.acceptance.ok, true)
      assert.equal(result.status.metrics.checks.complete, 1)
      assert.equal(result.status.metrics.requirements.accepted, 1)
      assert.equal(result.transition.ok, true)
    }
  } finally {
    await rm(c.root, { recursive: true, force: true })
  }
})

test('FWE-004-S02 L+1 and self-claimed PASS remain failed through check, acceptance and stage barrier', async () => {
  const c = await controller()
  try {
    const candidate = await reporterCandidate(c, 'over', 11)
    candidate.check.verified = true
    candidate.check.actual = 'PASS'
    const result = await exercise(c, candidate)
    assert.equal(result.check.ok, false)
    assert.ok(result.check.issues.some((x) => x.code === 'CHECK_PROOF'))
    assert.equal(result.acceptance.ok, false)
    assert.ok(result.acceptance.issues.some((x) => x.code === 'TRACE_RUN_PROOF'))
    assert.equal(result.status.metrics.checks.complete, 0)
    assert.equal(result.status.metrics.requirements.accepted, 0)
    assert.equal(result.status.readyForArchive, false)
    assert.ok(result.status.issues.some((x) => x.code === 'CHECK_NOT_VERIFIED'))
    assert.equal(result.transition.ok, false)
    assert.ok(result.transition.issues.some((x) => x.code === 'CHECKS_PROOF'))
  } finally {
    await rm(c.root, { recursive: true, force: true })
  }
})

test('FWE-004-S02 reporter budget rewrite and approval claim cannot change controller approval', async () => {
  const c = await controller()
  try {
    const candidate = await reporterCandidate(c, 'rewrite', 11)
    const forgedClaim = sha('reporter-approved-replacement')
    candidate.check.budgetSha256 = forgedClaim
    candidate.check.run.budgetSha256 = forgedClaim
    candidate.trace.runs[0].budgetSha256 = forgedClaim
    candidate.gate.budgetSha256 = forgedClaim
    const claimOnly = await exercise(c, candidate)
    assert.equal(claimOnly.check.ok, false)
    assert.equal(claimOnly.acceptance.ok, false)
    assert.equal(claimOnly.status.metrics.checks.complete, 0)
    assert.equal(claimOnly.status.metrics.requirements.accepted, 0)
    assert.equal(claimOnly.transition.ok, false)
    await writeFile(
      join(c.root, c.approval.path),
      JSON.stringify({
        contract: 'synthetic-test-only',
        unit: 'fixture-units',
        maximum: 11,
        sourceSha256,
        configSha256,
      }),
    )
    const changedHash = sha(await readFile(join(c.root, c.approval.path)))
    candidate.check.approvalSha256 = changedHash
    candidate.check.budgetSha256 = changedHash
    candidate.check.run.budgetSha256 = changedHash
    candidate.trace.runs[0].budgetSha256 = changedHash
    candidate.gate.budgetSha256 = changedHash
    const result = await exercise(c, candidate)
    assert.notEqual(changedHash, c.approval.sha256)
    assert.equal(result.check.ok, false)
    assert.equal(result.acceptance.ok, false)
    assert.equal(result.status.metrics.checks.complete, 0)
    assert.equal(result.status.metrics.requirements.accepted, 0)
    assert.equal(result.transition.ok, false)
    assert.equal(result.status.readyForArchive, false)
  } finally {
    await rm(c.root, { recursive: true, force: true })
  }
})

test('FWE-004-S02 stale raw source or config binding cannot pass approved numeric fixture', async () => {
  const c = await controller()
  try {
    const candidate = await reporterCandidate(c, 'stale', 10, {
      bindings: { sourceSha256: sha('changed'), configSha256 },
    })
    const result = await exercise(c, candidate)
    assert.equal(result.check.ok, false)
    assert.equal(result.acceptance.ok, false)
    assert.equal(result.status.metrics.checks.complete, 0)
    assert.equal(result.status.metrics.requirements.accepted, 0)
    assert.equal(result.transition.ok, false)
    const rawChanged = await reporterCandidate(c, 'raw-source', 10)
    await writeFile(
      join(c.root, rawChanged.check.artifact.path),
      JSON.stringify({
        measurement: 10,
        sourceSha256: sha('changed raw source'),
        configSha256,
        budgetSha256: c.approval.sha256,
      }),
    )
    const alteredHash = sha(await readFile(join(c.root, rawChanged.check.artifact.path)))
    rawChanged.check.artifact = { ...rawChanged.check.artifact, sha256: alteredHash }
    rawChanged.check.run.artifact = { ...rawChanged.check.run.artifact, sha256: alteredHash }
    rawChanged.trace.runs[0].artifact = {
      ...rawChanged.trace.runs[0].artifact,
      sha256: alteredHash,
    }
    rawChanged.gate.artifact = { ...rawChanged.gate.artifact, sha256: alteredHash }
    const altered = await exercise(c, rawChanged)
    assert.equal(altered.check.ok, false)
    assert.equal(altered.acceptance.ok, false)
    assert.equal(altered.status.metrics.checks.complete, 0)
    assert.equal(altered.status.metrics.requirements.accepted, 0)
    assert.equal(altered.transition.ok, false)
  } finally {
    await rm(c.root, { recursive: true, force: true })
  }
})
