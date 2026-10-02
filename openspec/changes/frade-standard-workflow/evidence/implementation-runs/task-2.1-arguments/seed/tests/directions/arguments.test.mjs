import test from 'node:test';
import assert from 'node:assert/strict';
import { validateApplicability, verifyApplicability, scopeFingerprint } from '../../scripts/directions/contracts.mjs';
import { evaluateTransition } from '../../scripts/directions/lifecycle.mjs';
import { planClosure, executeClosure } from '../../scripts/directions/scope.mjs';
import { manifest } from './fixtures.mjs';

const invalid = (result, code) => {
  assert.equal(result?.ok, false);
  assert.ok(Array.isArray(result.issues));
  assert.ok(result.issues.some(issue => issue.code === code && issue.path === '$'));
};

test('FWE-007-S01 applicability rejects null and scalar plans with stable shape issues', () => {
  for (const value of [null, 0, 'checks', true, []]) invalid(validateApplicability(value), 'APPLICABILITY_SHAPE');
  assert.equal(validateApplicability({ checks: [], affectedContracts: [], previousResults: [] }).ok, true);
  invalid(validateApplicability({ checks: 'PASS' }), 'APPLICABILITY_SHAPE');
});

test('FWE-007-S02 applicability verification rejects malformed plans and options before proof access', async () => {
  for (const value of [null, 0, 'checks', true, []]) invalid(await verifyApplicability(value), 'APPLICABILITY_SHAPE');
  for (const value of [null, 0, 'options', true, []]) invalid(await verifyApplicability({ checks: [] }, value), 'APPLICABILITY_OPTIONS_SHAPE');
  const result = await verifyApplicability({ checks: [] }, { snapshot: { sourceSha256: 'a'.repeat(64), configSha256: 'b'.repeat(64) } });
  assert.equal(result.ok, true);
});

test('FWE-005-S01 transition rejects null and scalar options before gate access', async () => {
  for (const value of [null, 0, 'transition', true, []]) invalid(await evaluateTransition(value), 'TRANSITION_SHAPE');
  const m = manifest();
  const result = await evaluateTransition({ manifest: m, stageId: 'W01', target: 'IMPLEMENTATION', snapshot: { planSha256: 'a'.repeat(64), scopeSha256: scopeFingerprint(m), sourceSha256: 'b'.repeat(64), configSha256: 'c'.repeat(64) } });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.code === 'EVIDENCE_BOUNDARY'));
});

test('FWE-001-S04 closure planner rejects null and scalar options without an operation plan', async () => {
  for (const value of [null, 0, 'closure', true, []]) {
    const result = await planClosure(value);
    invalid(result, 'CLOSURE_SHAPE');
    assert.deepEqual(result.operations, []);
    assert.deepEqual(result.originMap, []);
  }
  const result = await planClosure({ manifest: manifest() });
  assert.equal(result.ok, false);
  assert.deepEqual(result.operations, []);
});

test('FWE-001-S04 closure executor rejects null and scalar options before filesystem access', async () => {
  for (const value of [null, 0, 'closure', true, []]) invalid(await executeClosure(value), 'CLOSURE_SHAPE');
  const result = await executeClosure({ manifest: manifest() });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.code === 'GIT_ROOT'));
});
