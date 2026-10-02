import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load-core.mjs';
import { manifest } from './fixtures.mjs';

const { scopeFingerprint, validateManifest, validateTraceability, verifyTraceability, validateApplicability, verifyApplicability } = await loadCore('contracts');
const { createEvidenceBoundary } = await loadCore('evidence');

const H = 'a'.repeat(64);
const issue = (result, code) => result.issues.some(entry => entry.code === code);

test('FWE-001-S02 versioned manifest accepts safe separate owner and scope fields', () => {
  assert.equal(validateManifest(manifest()).ok, true);
});

test('FWE-001-S01 rejects unsafe direction identity, branch and owner paths', () => {
  for (const [field, value] of [['id', '../escape'], ['owner.branch', 'main'], ['owner.worktree', 'E:/dev/codex/frade-worktrees/../other'], ['owner.gitCommon', '//server/share/.git']]) {
    const m = manifest();
    const parts = field.split('.');
    if (parts.length === 1) m[field] = value; else m[parts[0]][parts[1]] = value;
    assert.equal(validateManifest(m).ok, false, field);
  }
});

test('FWE-001-S04 rejects unknown schema, unsafe glob, frozen overlap and widened closure destination', () => {
  const a = manifest(); a.schemaVersion = 3;
  assert.ok(issue(validateManifest(a), 'SCHEMA_VERSION'));
  const b = manifest(); b.scope.allowed.push('../packages/**');
  assert.ok(issue(validateManifest(b), 'UNSAFE_PATH'));
  const c = manifest(); c.scope.allowed.push('packages/**');
  assert.ok(issue(validateManifest(c), 'FROZEN_OVERLAP'));
  const d = manifest(); d.scope.closure.specDestinations.push('openspec/specs/foreign/spec.md');
  assert.ok(issue(validateManifest(d), 'CLOSURE_DESTINATION'));
  const e = manifest(); e.scope.allowed.push('docs/.GIT/config');
  assert.ok(issue(validateManifest(e), 'UNSAFE_PATH'));
  const f = manifest(); f.statusPath = 'docs/CON';
  assert.ok(issue(validateManifest(f), 'STATUS_PATH'));
  const g = manifest(); g.statusPath = 'docs/other/STATUS.md';
  assert.ok(issue(validateManifest(g), 'STATUS_SCOPE'));
  const h = manifest(); h.stages[0].tasks = 'malformed';
  assert.ok(issue(validateManifest(h), 'TASK_SHAPE'));
});

test('FWE-005-S01 phase, health and applicability are separate exact enums', () => {
  const m = manifest(); m.stages[0].phase = 'PASS';
  assert.ok(issue(validateManifest(m), 'PHASE'));
  m.stages[0].phase = 'BDD_TDD'; m.stages[0].health = 'NOT_APPLICABLE';
  assert.ok(issue(validateManifest(m), 'HEALTH'));
  m.stages[0].health = 'RUNNING'; m.stages[0].admission.formalPRE = true;
  assert.ok(issue(validateManifest(m), 'GATE_CLAIM'));
});

test('FWE-005-S01 progress edits preserve reviewed scope while allowed paths and acceptance links change it', () => {
  const m = manifest(); const before = scopeFingerprint(m);
  m.stages[0].phase = 'IMPLEMENTATION'; m.stages[0].health = 'PASS'; m.approvedCheckpoint = 'b'.repeat(40);
  assert.equal(scopeFingerprint(m), before);
  m.scope.allowed.push('docs/new/**');
  assert.notEqual(scopeFingerprint(m), before);
  const t = manifest(); t.stages[0].tasks = [{ id: '2.1', scenarioIds: ['FWE-001-S01'], complete: false }];
  const linked = scopeFingerprint(t); t.stages[0].tasks[0].complete = true;
  assert.equal(scopeFingerprint(t), linked);
  t.stages[0].tasks[0].scenarioIds.push('FWE-001-S04');
  assert.notEqual(scopeFingerprint(t), linked);
});

function trace() {
  return {
    requirements: [{ id: 'FWE-004', critical: true, scenarioIds: ['FWE-004-S01'] }],
    scenarios: [{ id: 'FWE-004-S01', requirementId: 'FWE-004', taskIds: ['2.1'], control: 'positive', assertionIds: ['A1'] }, { id: 'FWE-004-S02', requirementId: 'FWE-004', taskIds: ['2.1'], control: 'negative', assertionIds: ['A2'] }, { id: 'FWE-004-S03', requirementId: 'FWE-004', taskIds: ['2.1'], control: 'boundary', assertionIds: ['A3'] }],
    tasks: [{ id: '2.1', scenarioIds: ['FWE-004-S01', 'FWE-004-S02', 'FWE-004-S03'] }],
    assertions: [{ id: 'A1', runId: 'R1' }, { id: 'A2', runId: 'R1' }, { id: 'A3', runId: 'R1' }],
    runs: [{ id: 'R1', sourceSha256: H, configSha256: H, environment: 'node24.18.0-windows', status: 'PASS' }]
  };
}

test('FWE-004-S01 traceability links requirement to scenario, task, assertion and bound run', () => {
  const t = trace(); t.requirements[0].scenarioIds.push('FWE-004-S02', 'FWE-004-S03');
  assert.equal(validateTraceability(t).ok, true);
  t.assertions[1].runId = 'missing';
  assert.ok(issue(validateTraceability(t), 'TRACE_RUN'));
});

test('FWE-004-S01 critical requirement needs negative and boundary controls, with no fake completed run', () => {
  const t = trace(); t.requirements[0].scenarioIds.push('FWE-004-S02', 'FWE-004-S03');
  t.scenarios.pop();
  assert.ok(issue(validateTraceability(t), 'CONTROL_BOUNDARY'));
  t.runs[0].sourceSha256 = 'PASS';
  assert.ok(issue(validateTraceability(t), 'RUN_BINDING'));
});

test('FWE-004-S01 traced PASS text needs trusted current run proof', async () => {
  const t = trace(); t.requirements[0].scenarioIds.push('FWE-004-S02', 'FWE-004-S03');
  const current = { sourceSha256: H, configSha256: H };
  const run = t.runs[0];
  const accepted = new WeakSet([run]);
  const boundary = createEvidenceBoundary({ verify: async (kind, ref, expected) => kind === 'run' && accepted.has(ref) && Object.entries(expected).every(([k, v]) => ref.bindings[k] === v) });
  assert.ok(issue(await verifyTraceability(t, { boundary, snapshot: current }), 'TRACE_RUN_PROOF'));
  Object.assign(run, { kind: 'run', scope: 'full', complete: true, artifact: { path: 'evidence/run.json', sha256: H }, bindings: current });
  assert.equal((await verifyTraceability(t, { boundary, snapshot: current })).ok, true);
  t.runs.push({ id: 'historical-fail', sourceSha256: H, configSha256: H, environment: 'node24.18.0-windows', status: 'FAIL' });
  assert.equal((await verifyTraceability(t, { boundary, snapshot: current })).ok, true);
  assert.ok(issue(await verifyTraceability(t, { boundary, snapshot: { ...current, sourceSha256: 'c'.repeat(64) } }), 'TRACE_RUN_PROOF'));
});

test('FWE-004-S01 human boundary is explicit rather than an implicit passing assertion', () => {
  const t = trace(); t.requirements[0].scenarioIds.push('FWE-004-S02', 'FWE-004-S03');
  t.scenarios.push({ id: 'FWE-004-S04', requirementId: 'FWE-004', taskIds: ['2.1'], control: 'human' });
  t.tasks[0].scenarioIds.push('FWE-004-S04'); t.requirements[0].scenarioIds.push('FWE-004-S04');
  assert.ok(issue(validateTraceability(t), 'TRACE_BOUNDARY_REASON'));
});

test('FWE-004-S01 malformed trace rows return issues without throwing', () => {
  const t = trace(); t.requirements = [null]; t.scenarios = [null];
  assert.ok(issue(validateTraceability(t), 'REQUIREMENT_ID'));
});

test('FWE-002-S02 unresolved acceptance blocks dependent task while independent research remains permitted', () => {
  const t = trace(); t.requirements[0].unresolved = ['human acceptance'];
  assert.ok(issue(validateTraceability(t, { action: 'IMPLEMENTATION' }), 'UNRESOLVED_ACCEPTANCE'));
  assert.equal(issue(validateTraceability(t, { action: 'RESEARCH' }), 'UNRESOLVED_ACCEPTANCE'), false);
});

test('FWE-007-S01 applicability rejects relabelled affected FAIL and accepts documented unaffected N/A', () => {
  const checks = [{ id: 'routing-semantic', contract: 'routing', applicability: 'NOT_APPLICABLE', reason: 'cosmetic' }];
  assert.ok(issue(validateApplicability({ checks, affectedContracts: ['routing'], previousResults: [{ id: 'routing-semantic', status: 'FAIL' }] }), 'FALSE_NOT_APPLICABLE'));
  checks[0].reason = 'No routing source or semantic contract changed; product tree hash matches baseline';
  assert.equal(validateApplicability({ checks, affectedContracts: [], previousResults: [] }).ok, true);
});

test('FWE-007-S02 required unavailable check blocks and never becomes PASS', () => {
  const result = validateApplicability({ checks: [{ id: 'controls', contract: 'workflow', applicability: 'REQUIRED', status: 'NOT_RUN' }], affectedContracts: ['workflow'] });
  assert.ok(issue(result, 'REQUIRED_CHECK_NOT_PASS'));
});

test('FWE-007-S02 required PASS label still needs a current trusted check run', async () => {
  const check = { id: 'controls', contract: 'workflow', applicability: 'REQUIRED', status: 'PASS' };
  const plan = { checks: [check], affectedContracts: ['workflow'] };
  const boundary = createEvidenceBoundary({ verify: async (kind, ref) => kind === 'check' && ref === check });
  assert.ok(issue(await verifyApplicability(plan, { boundary, snapshot: { sourceSha256: H, configSha256: H } }), 'CHECK_PROOF'));
  Object.assign(check, { kind: 'check', scope: 'full', complete: true, artifact: { path: 'evidence/check.json', sha256: H }, bindings: { sourceSha256: H, configSha256: H } });
  assert.equal((await verifyApplicability(plan, { boundary, snapshot: { sourceSha256: H, configSha256: H } })).ok, true);
});
