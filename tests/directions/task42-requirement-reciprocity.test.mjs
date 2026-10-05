import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { manifest } from './fixtures.mjs'
import { validateTraceability } from '../../scripts/directions/contracts.mjs'
import { createEvidenceBoundary } from '../../scripts/directions/evidence.mjs'
import { projectStatus } from '../../scripts/directions/status.mjs'

const sha = (value) => createHash('sha256').update(value).digest('hex')
const sourceSha256 = sha('task42-requirement-current-source')
const configSha256 = sha('task42-requirement-current-config')
const snapshot = { sourceSha256, configSha256 }
const has = (result, code, path) =>
  result.issues.some((entry) => entry.code === code && entry.path === path)

function fixture({ second = 'FAIL', independent = false } = {}) {
  const raw = new Map()
  const pinned = new WeakSet()
  const runs = []
  for (const [id, status, assertion] of [
    ['R1', 'PASS', 'A1'],
    ['R2', second === 'UNVERIFIED' ? 'PASS' : second, 'A2'],
    ...(independent ? [['R3', 'PASS', 'A3']] : []),
  ]) {
    const bytes = JSON.stringify({ id, status, complete: true, assertions: [assertion] })
    if (id !== 'R2' || second !== 'UNVERIFIED') raw.set(id, bytes)
    const run = {
      id,
      kind: 'run',
      status,
      complete: true,
      scope: 'full',
      sourceSha256,
      configSha256,
      environment: 'independently pinned in-memory raw run',
      bindings: { ...snapshot },
      artifact: { path: `runs/${id}.json`, sha256: sha(bytes) },
    }
    pinned.add(run)
    runs.push(run)
  }
  const boundary = createEvidenceBoundary({
    verify: async (kind, ref, expected) => {
      const bytes = raw.get(ref.id)
      if (kind !== 'run' || !pinned.has(ref) || !bytes || sha(bytes) !== ref.artifact.sha256)
        return false
      const record = JSON.parse(bytes)
      const assertion = `A${ref.id.slice(1)}`
      return (
        record.id === ref.id &&
        record.status === 'PASS' &&
        record.complete === true &&
        record.assertions.includes(assertion) &&
        Object.entries(expected).every(([key, value]) => ref.bindings[key] === value)
      )
    },
  })
  const trace = {
    requirements: [{ id: 'REQ-001', scenarioIds: ['S1'] }],
    scenarios: [
      {
        id: 'S1',
        requirementId: 'REQ-001',
        control: 'positive',
        taskIds: ['2.1'],
        assertionIds: ['A1'],
      },
      {
        id: 'S2',
        requirementId: 'REQ-001',
        control: 'negative',
        taskIds: ['2.2'],
        assertionIds: ['A2'],
      },
    ],
    tasks: [
      { id: '2.1', scenarioIds: ['S1'] },
      { id: '2.2', scenarioIds: ['S2'] },
    ],
    assertions: [
      { id: 'A1', runId: 'R1' },
      { id: 'A2', runId: 'R2' },
    ],
    runs,
  }
  if (independent) {
    trace.requirements.push({ id: 'REQ-002', scenarioIds: ['S3'] })
    trace.scenarios.push({
      id: 'S3',
      requirementId: 'REQ-002',
      control: 'positive',
      taskIds: ['2.3'],
      assertionIds: ['A3'],
    })
    trace.tasks.push({ id: '2.3', scenarioIds: ['S3'] })
    trace.assertions.push({ id: 'A3', runId: 'R3' })
  }
  const m = manifest()
  m.stages[0].phase = 'CHECKS'
  return {
    trace,
    input: {
      manifest: m,
      tasksText: '- [x] 2.1 Proven work\n- [ ] 2.2 Unproven work\n',
      trace,
      snapshot,
      boundary,
    },
  }
}

for (const second of ['FAIL', 'UNVERIFIED']) {
  test(`FWE-014-S01 omitted ${second.toLowerCase()} executable scenario cannot accept its requirement`, async () => {
    const { trace, input } = fixture({ second })
    const evidenceBefore = JSON.stringify(trace.runs)
    const omitted = await projectStatus(input)
    assert.equal(has(validateTraceability(trace), 'TRACE_REQUIREMENT_SCENARIO', 'S2'), true)
    assert.equal(has(omitted, 'TRACE_REQUIREMENT_SCENARIO', 'S2'), true)
    assert.equal(has(omitted, 'RUN_NOT_VERIFIED', 'R2'), true)
    assert.equal(omitted.metrics.requirements.accepted, 0)
    assert.equal(omitted.metrics.requirements.uncovered, 1)
    assert.equal(omitted.metrics.scenarios.executed, 1)
    assert.equal(omitted.readyForArchive, false)
    trace.requirements[0].scenarioIds.push('S2')
    const reciprocal = await projectStatus(input)
    assert.equal(validateTraceability(trace).ok, true)
    assert.equal(reciprocal.metrics.requirements.accepted, 0)
    assert.equal(reciprocal.metrics.requirements.uncovered, 1)
    assert.equal(reciprocal.metrics.scenarios.executed, 1)
    assert.equal(reciprocal.readyForArchive, false)
    assert.equal(JSON.stringify(trace.runs), evidenceBefore, 'only the outgoing mapping changed')
  })
}

for (const mapping of ['malformed', 'empty', 'omitted', 'dangling', 'nonreciprocal']) {
  test(`FWE-004-S01 ${mapping} requirement outgoing mapping is structurally rejected`, async () => {
    const { trace, input } = fixture({ second: 'PASS' })
    if (mapping === 'malformed') trace.requirements[0].scenarioIds = 'S1,S2'
    if (mapping === 'empty') trace.requirements[0].scenarioIds = []
    if (mapping === 'omitted') delete trace.requirements[0].scenarioIds
    if (mapping === 'dangling') trace.requirements[0].scenarioIds = ['S1', 'S99']
    if (mapping === 'nonreciprocal') {
      trace.requirements.push({ id: 'REQ-002', scenarioIds: ['S2'] })
      trace.requirements[0].scenarioIds = ['S1', 'S2']
    }
    const validation = validateTraceability(trace)
    assert.equal(validation.ok, false)
    assert.equal(
      has(validation, 'TRACE_SCENARIO', mapping === 'nonreciprocal' ? 'REQ-002' : 'REQ-001'),
      true,
    )
    const result = await projectStatus(input)
    assert.equal(result.metrics.requirements.accepted, mapping === 'nonreciprocal' ? 1 : 0)
    assert.equal(result.metrics.requirements.uncovered, 1)
    assert.equal(result.readyForArchive, false)
  })
}

test('FWE-014-S01 fully reciprocal executable scenarios with trusted raw PASS accept', async () => {
  const { trace, input } = fixture({ second: 'PASS' })
  trace.requirements[0].scenarioIds.push('S2')
  assert.equal(validateTraceability(trace).ok, true)
  const result = await projectStatus(input)
  assert.equal(result.metrics.requirements.accepted, 1)
  assert.equal(result.metrics.requirements.uncovered, 0)
  assert.equal(result.metrics.scenarios.executed, 2)
  assert.equal(result.metrics.scenarios.negativeExecuted, 1)
  assert.equal(has(result, 'RUN_NOT_VERIFIED', 'R2'), false)
  assert.equal(result.readyForArchive, false)
})

for (const second of ['FAIL', 'UNVERIFIED']) {
  test(`FWE-014-S01 reciprocal ${second.toLowerCase()} evidence remains unaccepted`, async () => {
    const { trace, input } = fixture({ second })
    trace.requirements[0].scenarioIds.push('S2')
    assert.equal(validateTraceability(trace).ok, true)
    const result = await projectStatus(input)
    assert.equal(result.metrics.requirements.accepted, 0)
    assert.equal(result.metrics.requirements.uncovered, 1)
    assert.equal(result.metrics.scenarios.executed, 1)
    assert.equal(has(result, 'RUN_NOT_VERIFIED', 'R2'), true)
    assert.equal(result.readyForArchive, false)
  })
}

test('FWE-014-S01 unrelated valid requirement retains acceptance when another mapping is incomplete', async () => {
  const { input } = fixture({ independent: true })
  const result = await projectStatus(input)
  assert.equal(has(result, 'TRACE_REQUIREMENT_SCENARIO', 'S2'), true)
  assert.equal(result.metrics.requirements.accepted, 1)
  assert.equal(result.metrics.requirements.total, 2)
  assert.equal(result.metrics.requirements.uncovered, 1)
  assert.equal(result.metrics.scenarios.executed, 2)
  assert.equal(result.readyForArchive, false)
})

for (const control of ['human', 'future']) {
  test(`FWE-004-S01 ${control} boundary stays pending even when omitted from outgoing links`, async () => {
    const { trace, input } = fixture({ second: 'PASS' })
    trace.scenarios[1] = {
      id: 'S2',
      requirementId: 'REQ-001',
      control,
      taskIds: ['2.2'],
      boundaryReason: `The ${control} acceptance decision is reserved for a later owner review.`,
    }
    trace.assertions.pop()
    trace.runs.pop()
    const result = await projectStatus(input)
    assert.equal(has(result, 'TRACE_REQUIREMENT_SCENARIO', 'S2'), true)
    assert.equal(result.metrics.requirements.accepted, 0)
    assert.equal(result.metrics.requirements.uncovered, 1)
    assert.equal(result.metrics.scenarios.executed, 1)
    assert.equal(result.metrics.scenarios.humanPending, 1)
    assert.equal(result.readyForArchive, false)
    trace.requirements[0].scenarioIds.push('S2')
    const reciprocal = await projectStatus(input)
    assert.equal(validateTraceability(trace).ok, true)
    assert.equal(reciprocal.metrics.requirements.accepted, 0)
    assert.equal(reciprocal.metrics.scenarios.humanPending, 1)
  })
}
