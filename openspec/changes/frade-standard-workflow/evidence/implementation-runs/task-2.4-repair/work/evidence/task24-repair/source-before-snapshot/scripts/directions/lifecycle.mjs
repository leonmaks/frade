import { PHASES, scopeFingerprint, validateManifest } from './contracts.mjs'
import { isEvidenceBoundary, verifyGate } from './evidence.mjs'
import { isClosureReceipt } from './scope.mjs'

const issue = (issues, code, path, detail) => issues.push({ code, path, detail })
const hash = (x) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x)
const EXPECTED = {
  policyDecision: (s) => ({ planSha256: s.planSha256, scopeSha256: s.scopeSha256 }),
  checkpoint: (s) => ({ planSha256: s.planSha256, scopeSha256: s.scopeSha256 }),
  pre: (s) => ({ planSha256: s.planSha256, scopeSha256: s.scopeSha256 }),
  red: (s) => ({ planSha256: s.planSha256, scopeSha256: s.scopeSha256 }),
  green: (s) => ({ sourceSha256: s.sourceSha256, configSha256: s.configSha256 }),
  checks: (s) => ({ sourceSha256: s.sourceSha256, configSha256: s.configSha256 }),
  verify: (s) => ({ sourceSha256: s.sourceSha256, configSha256: s.configSha256 }),
  post: (s) => ({
    sourceSha256: s.sourceSha256,
    configSha256: s.configSha256,
    planSha256: s.planSha256,
    scopeSha256: s.scopeSha256,
  }),
}
const CODE = {
  policyDecision: 'POLICY_DECISION_PROOF',
  checkpoint: 'CHECKPOINT_PROOF',
  pre: 'PRE_PROOF',
  red: 'RED_PROOF',
  green: 'GREEN_PROOF',
  checks: 'CHECKS_PROOF',
  verify: 'VERIFY_PROOF',
  post: 'POST_PROOF',
}
const NEED = {
  PRE_REVIEW: ['policyDecision', 'checkpoint'],
  BDD_TDD: ['policyDecision', 'checkpoint', 'pre'],
  IMPLEMENTATION: ['policyDecision', 'checkpoint', 'pre', 'red'],
  CHECKS: ['policyDecision', 'checkpoint', 'pre', 'red'],
  VERIFICATION: ['policyDecision', 'checkpoint', 'pre', 'red', 'green', 'checks'],
  POST_REVIEW: ['policyDecision', 'checkpoint', 'pre', 'red', 'green', 'checks', 'verify'],
  ARCHIVE: ['policyDecision', 'checkpoint', 'pre', 'red', 'green', 'checks', 'verify', 'post'],
  CLOSED: ['policyDecision', 'checkpoint', 'pre', 'red', 'green', 'checks', 'verify', 'post'],
}
const RCA_CLASSES = new Set([
  'DOMAIN_MODEL',
  'INVARIANT',
  'ALGORITHM',
  'ABSTRACTION_BOUNDARY',
  'STATE_TRANSITION',
  'TEST',
  'SPEC_CONFLICT',
  'INTEGRATION',
  'ENVIRONMENT',
])

export async function evaluateTransition(options = {}) {
  if (options === null || typeof options !== 'object' || Array.isArray(options))
    return {
      ok: false,
      issues: [{ code: 'TRANSITION_SHAPE', path: '$', detail: 'Options object required' }],
    }
  const { manifest, stageId, target, evidence = {}, boundary, snapshot } = options
  const issues = [...validateManifest(manifest).issues]
  const stage = Array.isArray(manifest?.stages)
    ? manifest.stages.find((s) => s?.id === stageId)
    : undefined
  if (!stage) issue(issues, 'STAGE_UNKNOWN', 'stageId', 'Stage absent')
  if (!PHASES.includes(target)) issue(issues, 'PHASE', 'target', 'Unknown target phase')
  if (
    stage &&
    PHASES.includes(target) &&
    PHASES.indexOf(target) !== PHASES.indexOf(stage.phase) + 1
  )
    issue(issues, 'PHASE_ORDER', 'target', 'Only the next phase can be entered')
  if (stage && ['FAIL', 'BLOCKED', 'PAUSED'].includes(stage.health))
    issue(issues, 'HEALTH_STOP', 'stage.health', 'Owner stop state')
  if (
    !snapshot ||
    !['planSha256', 'scopeSha256', 'sourceSha256', 'configSha256'].every((k) => hash(snapshot[k]))
  )
    issue(
      issues,
      'SNAPSHOT_BINDING',
      'snapshot',
      'Current raw plan/scope/source/config hashes required',
    )
  if (!issues.length && snapshot.scopeSha256 !== scopeFingerprint(manifest))
    issue(
      issues,
      'SCOPE_DRIFT',
      'snapshot.scopeSha256',
      'Snapshot does not bind current semantic scope',
    )
  if (!isEvidenceBoundary(boundary))
    issue(issues, 'EVIDENCE_BOUNDARY', 'boundary', 'Trusted verifier required')
  if (
    issues.some((x) => ['MANIFEST_SHAPE', 'SNAPSHOT_BINDING', 'EVIDENCE_BOUNDARY'].includes(x.code))
  )
    return { ok: false, issues }
  for (const kind of NEED[target] ?? [])
    if (!(await verifyGate(boundary, kind, evidence?.[kind], EXPECTED[kind](snapshot))))
      issue(issues, CODE[kind], `evidence.${kind}`, 'Missing, stale or unverified gate proof')
  if (target === 'IMPLEMENTATION' && stage) {
    const failures = Array.isArray(stage.failedFixes) ? stage.failedFixes : []
    const counts = new Map()
    for (const f of failures)
      if (
        f?.deterministic === true &&
        f?.status === 'FAIL' &&
        typeof f?.defectId === 'string' &&
        f.defectId
      )
        counts.set(f.defectId, (counts.get(f.defectId) ?? 0) + 1)
    for (const [defectId, count] of counts)
      if (count >= 2) {
        const rca = stage.rca
        if (
          rca?.defectId !== defectId ||
          !RCA_CLASSES.has(rca?.classification) ||
          typeof rca?.root !== 'string' ||
          rca.root.trim().length < 10 ||
          typeof rca?.layer !== 'string' ||
          rca.layer.trim().length < 3
        )
          issue(
            issues,
            'RCA_REQUIRED',
            'stage.rca',
            'Classified root and responsible layer required after two failed fixes',
          )
        else if (
          rca?.artifact?.path !== evidence?.rca?.artifact?.path ||
          rca?.artifact?.sha256 !== evidence?.rca?.artifact?.sha256 ||
          !(await verifyGate(boundary, 'rca', evidence?.rca, {
            planSha256: snapshot.planSha256,
            scopeSha256: snapshot.scopeSha256,
            defectId,
            classification: rca.classification,
            root: rca.root,
            layer: rca.layer,
          }))
        )
          issue(
            issues,
            'RCA_PROOF',
            'evidence.rca',
            'Trusted classified RCA proof bound to documented source required',
          )
      }
  }
  if (target === 'CLOSED') {
    const receipt = evidence?.closureReceipt
    const publication = evidence?.archive?.bindings
    if (
      !/^[a-f0-9]{40}$/.test(publication?.checkpointSha ?? '') ||
      publication?.publishedSha !== publication?.checkpointSha ||
      publication?.publicationRef !== `refs/heads/${manifest?.owner?.branch}`
    )
      issue(
        issues,
        'ARCHIVE_PUBLICATION',
        'evidence.archive.bindings',
        'Bound checkpoint SHA and verified authorized publication required',
      )
    if (
      !isClosureReceipt(receipt, { manifest, stageId, snapshot }) ||
      !(await verifyGate(boundary, 'archive', evidence?.archive, {
        planSha256: snapshot.planSha256,
        scopeSha256: snapshot.scopeSha256,
        sourceSha256: snapshot.sourceSha256,
        configSha256: snapshot.configSha256,
        archiveHead: receipt?.head,
        archive: receipt?.archive,
        operationSha256: receipt?.operationSha256,
        publicationRef: `refs/heads/${manifest.owner.branch}`,
      }))
    )
      issue(
        issues,
        'ARCHIVE_PROOF',
        'evidence.archive',
        'Actual owner archive, checkpoint and publication authority required',
      )
  }
  return { ok: issues.length === 0, issues }
}

// Historical labels are only a conservative projection. Even all textual PASS fields
// do not establish independent review or archive proof.
export function legacyClosureState(record = {}) {
  return record.tasksComplete === true ? 'IMPLEMENTED_PENDING_CLOSURE' : 'IN_PROGRESS'
}
