import { PHASES, scopeFingerprint, validateManifest } from './contracts.mjs';
import { isEvidenceBoundary, verifyGate } from './evidence.mjs';

const issue = (issues, code, path, detail) => issues.push({ code, path, detail });
const hash = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const EXPECTED = {
  policyDecision: s => ({ planSha256: s.planSha256, scopeSha256: s.scopeSha256 }),
  checkpoint: s => ({ planSha256: s.planSha256, scopeSha256: s.scopeSha256 }),
  pre: s => ({ planSha256: s.planSha256, scopeSha256: s.scopeSha256 }),
  red: s => ({ planSha256: s.planSha256, scopeSha256: s.scopeSha256 }),
  green: s => ({ sourceSha256: s.sourceSha256, configSha256: s.configSha256 }),
  checks: s => ({ sourceSha256: s.sourceSha256, configSha256: s.configSha256 }),
  verify: s => ({ sourceSha256: s.sourceSha256, configSha256: s.configSha256 }),
  post: s => ({ sourceSha256: s.sourceSha256, configSha256: s.configSha256, planSha256: s.planSha256, scopeSha256: s.scopeSha256 })
};
const CODE = { policyDecision: 'POLICY_DECISION_PROOF', checkpoint: 'CHECKPOINT_PROOF', pre: 'PRE_PROOF', red: 'RED_PROOF', green: 'GREEN_PROOF', checks: 'CHECKS_PROOF', verify: 'VERIFY_PROOF', post: 'POST_PROOF' };
const NEED = {
  PRE_REVIEW: ['policyDecision', 'checkpoint'],
  BDD_TDD: ['policyDecision', 'checkpoint', 'pre'],
  IMPLEMENTATION: ['policyDecision', 'checkpoint', 'pre', 'red'],
  CHECKS: ['policyDecision', 'checkpoint', 'pre', 'red'],
  VERIFICATION: ['policyDecision', 'checkpoint', 'pre', 'red', 'green', 'checks'],
  POST_REVIEW: ['policyDecision', 'checkpoint', 'pre', 'red', 'green', 'checks', 'verify'],
  ARCHIVE: ['policyDecision', 'checkpoint', 'pre', 'red', 'green', 'checks', 'verify', 'post'],
  CLOSED: ['policyDecision', 'checkpoint', 'pre', 'red', 'green', 'checks', 'verify', 'post']
};

export async function evaluateTransition({ manifest, stageId, target, evidence = {}, boundary, snapshot } = {}) {
  const issues = [...validateManifest(manifest).issues];
  const stage = manifest?.stages?.find(s => s.id === stageId);
  if (!stage) issue(issues, 'STAGE_UNKNOWN', 'stageId', 'Stage absent');
  if (!PHASES.includes(target)) issue(issues, 'PHASE', 'target', 'Unknown target phase');
  if (stage && PHASES.includes(target) && PHASES.indexOf(target) !== PHASES.indexOf(stage.phase) + 1) issue(issues, 'PHASE_ORDER', 'target', 'Only the next phase can be entered');
  if (stage && ['FAIL', 'BLOCKED', 'PAUSED'].includes(stage.health)) issue(issues, 'HEALTH_STOP', 'stage.health', 'Owner stop state');
  if (!snapshot || !['planSha256', 'scopeSha256', 'sourceSha256', 'configSha256'].every(k => hash(snapshot[k]))) issue(issues, 'SNAPSHOT_BINDING', 'snapshot', 'Current raw plan/scope/source/config hashes required');
  if (!issues.length && snapshot.scopeSha256 !== scopeFingerprint(manifest)) issue(issues, 'SCOPE_DRIFT', 'snapshot.scopeSha256', 'Snapshot does not bind current semantic scope');
  if (!isEvidenceBoundary(boundary)) issue(issues, 'EVIDENCE_BOUNDARY', 'boundary', 'Trusted verifier required');
  if (issues.some(x => ['MANIFEST_SHAPE', 'SNAPSHOT_BINDING', 'EVIDENCE_BOUNDARY'].includes(x.code))) return { ok: false, issues };
  for (const kind of NEED[target] ?? []) if (!await verifyGate(boundary, kind, evidence?.[kind], EXPECTED[kind](snapshot))) issue(issues, CODE[kind], `evidence.${kind}`, 'Missing, stale or unverified gate proof');
  return { ok: issues.length === 0, issues };
}

// Historical labels are only a conservative projection. Even all textual PASS fields
// do not establish independent review or archive proof.
export function legacyClosureState(record = {}) {
  return record.tasksComplete === true ? 'IMPLEMENTED_PENDING_CLOSURE' : 'IN_PROGRESS';
}
