import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { manifest } from './fixtures.mjs'
import { validateTraceability } from '../../scripts/directions/contracts.mjs'
import { createEvidenceBoundary } from '../../scripts/directions/evidence.mjs'
import { projectStatus } from '../../scripts/directions/status.mjs'

const sha = (value) => createHash('sha256').update(value).digest('hex')
const sourceSha256 = sha('task42-current-source')
const configSha256 = sha('task42-current-config')
const raw = JSON.stringify({
  id: 'TASK42-RUN',
  status: 'PASS',
  complete: true,
  assertions: ['A-ONE', 'A-TWO'],
})
const run = {
  id: 'TASK42-RUN',
  kind: 'run',
  status: 'PASS',
  complete: true,
  scope: 'full',
  sourceSha256,
  configSha256,
  environment: 'deterministic in-memory raw evidence fixture',
  bindings: { sourceSha256, configSha256 },
  artifact: { path: 'runs/task42.json', sha256: sha(raw) },
}
const trustedRun = new WeakSet([run])
const boundary = createEvidenceBoundary({
  verify: async (kind, ref, expected) => {
    const actual = JSON.parse(raw)
    return (
      kind === 'run' &&
      trustedRun.has(ref) &&
      ref.artifact.sha256 === sha(raw) &&
      actual.id === ref.id &&
      actual.status === 'PASS' &&
      actual.complete === true &&
      ['A-ONE', 'A-TWO'].every((id) => actual.assertions.includes(id)) &&
      Object.entries(expected).every(([key, value]) => ref.bindings[key] === value)
    )
  },
})
const has = (result, code, path) =>
  result.issues.some((entry) => entry.code === code && entry.path === path)

function fixture() {
  const trace = {
    requirements: [{ id: 'FWE-014', scenarioIds: ['FWE-014-S01', 'FWE-014-S02'] }],
    scenarios: [
      {
        id: 'FWE-014-S01',
        requirementId: 'FWE-014',
        control: 'positive',
        taskIds: ['2.1'],
        assertionIds: ['A-ONE'],
      },
      {
        id: 'FWE-014-S02',
        requirementId: 'FWE-014',
        control: 'negative',
        taskIds: ['2.2'],
        assertionIds: ['A-TWO'],
      },
    ],
    tasks: [
      { id: '2.1', scenarioIds: ['FWE-014-S01'] },
      { id: '2.2', scenarioIds: ['FWE-014-S02'] },
    ],
    assertions: [
      { id: 'A-ONE', runId: run.id },
      { id: 'A-TWO', runId: run.id },
    ],
    runs: [run],
  }
  const input = {
    manifest: manifest(),
    tasksText: '- [x] 2.1 Verified work\n- [x] 2.2 Completed work\n',
    trace,
    snapshot: { sourceSha256, configSha256 },
    boundary,
  }
  return { trace, input }
}

function removeSecondScenario(trace) {
  trace.requirements[0].scenarioIds = ['FWE-014-S01']
  trace.scenarios.pop()
  trace.assertions.pop()
}

for (const mapping of ['missing', 'empty', 'omitted']) {
  test(`FWE-014-S01 completed task with ${mapping} mapping reports a gap while other task has trusted proof`, async () => {
    const { trace, input } = fixture()
    removeSecondScenario(trace)
    if (mapping === 'missing') trace.tasks.pop()
    if (mapping === 'empty') trace.tasks[1].scenarioIds = []
    if (mapping === 'omitted') delete trace.tasks[1].scenarioIds
    const result = await projectStatus(input)
    assert.equal(result.metrics.tasks.complete, 2)
    assert.equal(result.metrics.tasks.total, 2)
    assert.equal(result.metrics.scenarios.executed, 1, 'the independent task has verified evidence')
    assert.equal(has(result, 'RUN_NOT_VERIFIED', run.id), false)
    assert.equal(has(result, 'TASK_ACCEPTANCE_GAP', 'tasks'), true)
    assert.equal(result.readyForImplementation, false)
    assert.equal(result.readyForArchive, false)
    assert.match(result.nextAction, /Resolve listed blockers/)
    if (mapping !== 'missing') {
      assert.equal(has(validateTraceability(trace), 'TRACE_TASK_SCENARIO', '2.2'), true)
      assert.equal(result.metrics.requirements.accepted, 0)
    }
  })
}

test('FWE-014-S01 fully mapped and independently verified completed tasks have no acceptance gap', async () => {
  const { trace, input } = fixture()
  assert.equal(validateTraceability(trace).ok, true)
  const result = await projectStatus(input)
  assert.equal(result.metrics.tasks.complete, 2)
  assert.equal(result.metrics.scenarios.executed, 2)
  assert.equal(result.metrics.requirements.accepted, 1)
  assert.equal(has(result, 'TASK_ACCEPTANCE_GAP', 'tasks'), false)
  assert.equal(result.readyForArchive, false)
})

for (const link of ['dangling', 'nonreciprocal']) {
  test(`FWE-004-S01 task outgoing ${link} scenario link is rejected`, () => {
    const { trace } = fixture()
    trace.tasks[1].scenarioIds.push(link === 'dangling' ? 'FWE-014-S99' : 'FWE-014-S01')
    assert.equal(has(validateTraceability(trace), 'TRACE_TASK_SCENARIO', '2.2'), true)
  })
}

for (const control of ['human', 'future']) {
  test(`FWE-004-S01 explicit ${control} boundary remains pending and never accepted`, async () => {
    const { trace, input } = fixture()
    trace.scenarios[1] = {
      id: 'FWE-014-S02',
      requirementId: 'FWE-014',
      control,
      taskIds: ['2.2'],
      boundaryReason: `The ${control} acceptance decision is explicitly reserved for a later owner review.`,
    }
    trace.assertions.pop()
    assert.equal(validateTraceability(trace).ok, true)
    const result = await projectStatus(input)
    assert.equal(result.metrics.tasks.complete, 2)
    assert.equal(result.metrics.scenarios.executed, 1)
    assert.equal(result.metrics.scenarios.humanPending, 1)
    assert.equal(result.metrics.requirements.accepted, 0)
    assert.equal(has(result, 'TASK_ACCEPTANCE_GAP', 'tasks'), false)
    assert.equal(result.readyForArchive, false)
  })
}
