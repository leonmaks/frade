import { createHash } from 'node:crypto'
import { safeRepoPath } from './contracts.mjs'

const authorities = new WeakMap()
const hash64 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const exactModel = (value) =>
  typeof value === 'string' && /^gpt-[0-9]+(?:\.[0-9]+)?(?:-[a-z][a-z0-9]*)?$/.test(value)
const exactEffort = (value) =>
  ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'].includes(value)
const blocked = (code, detail) => ({
  ok: false,
  status: 'BLOCKED',
  issues: [{ code, path: '$', detail }],
})

// The controller supplies immutable review bindings and a verifier backed by direct human or
// approved-plan evidence. A manifest, request, or PASS label cannot create this authority.
export function createRoleAuthority({ bindings, verifyApproval } = {}) {
  if (!Array.isArray(bindings) || !bindings.length || typeof verifyApproval !== 'function')
    throw new TypeError('Trusted role bindings and approval verifier required')
  const map = new Map()
  for (const binding of bindings) {
    if (!safeRepoPath(binding?.path) || !hash64(binding?.sha256) ||
      typeof binding?.revision !== 'string' || !binding.revision || map.has(binding.path))
      throw new TypeError('Unique exact source bindings required')
    map.set(binding.path, Object.freeze({ ...binding }))
  }
  const authority = Object.freeze({})
  authorities.set(authority, { map, verifyApproval })
  return authority
}

function canonicalSource(assignment, stage, override) {
  const base = assignment.source ?? stage.roleAuthority
  const sha256 = base?.sha256 ?? base?.hash
  const excerpt = override
    ? base?.excerpt
    : assignment.source?.excerpt ?? (assignment.taskType
      ? `| ${stage.id} | ${assignment.taskType} | ${assignment.role} | ` +
        `${assignment.model} | ${assignment.effort} |`
      : `| ${stage.id} | ${assignment.role} | ${assignment.model} | ${assignment.effort} |`)
  return { path: base?.path, sha256, excerpt, revision: base?.revision,
    decision: override ? assignment.approval : base?.decision ?? stage.roleAuthority?.decision }
}

function pairValid(assignment) {
  return exactModel(assignment?.model) && exactEffort(assignment?.effort)
}

async function verifySource(reader, authority, source, assignment) {
  const trusted = authorities.get(authority)
  if (!trusted) return blocked('ROLE_AUTHORITY', 'Trusted controller authority required')
  if (!safeRepoPath(source.path) || !hash64(source.sha256) ||
    typeof source.excerpt !== 'string' || !source.excerpt ||
    typeof source.revision !== 'string' || !source.revision)
    return blocked('ROLE_SOURCE', 'Complete canonical source provenance required')
  const binding = trusted.map.get(source.path)
  if (!binding || binding.sha256 !== source.sha256 || binding.revision !== source.revision)
    return blocked('ROLE_SOURCE_BINDING', 'Source differs from trusted approved binding')
  const decisionBinding = trusted.map.get(source.decision?.path)
  if (!decisionBinding || decisionBinding.sha256 !== source.decision?.sha256)
    return blocked('ROLE_APPROVAL', 'Separate approved decision binding required')
  let actual, decision
  try {
    actual = await reader.read(source.path)
    decision = await reader.read(source.decision.path)
  } catch {
    return blocked('ROLE_SOURCE_READ', 'Safe raw source and decision reads required')
  }
  if (!Buffer.isBuffer(actual?.bytes) || !Buffer.isBuffer(decision?.bytes) ||
    createHash('sha256').update(actual.bytes).digest('hex') !== source.sha256 ||
    createHash('sha256').update(decision.bytes).digest('hex') !== source.decision.sha256 ||
    actual.sha256 !== source.sha256 || decision.sha256 !== source.decision.sha256)
    return blocked('ROLE_SOURCE_DRIFT', 'Approved source or decision bytes changed')
  const lines = actual.bytes.toString('utf8').split(/\r?\n/)
  if (lines.filter((line) => line === source.excerpt).length !== 1)
    return blocked('ROLE_EXCERPT', 'Exact unique assignment row missing from raw source')
  let approved = false
  try {
    approved = (await trusted.verifyApproval({ assignment: { ...assignment, source },
      decision: source.decision, rawSource: actual, rawDecision: decision })) === true
  } catch {
    approved = false
  }
  if (!approved)
    return blocked('ROLE_APPROVAL', 'Direct human or reviewed-plan approval not verified')
  return { ok: true }
}

export async function resolveRole(options = {}) {
  if (!object(options)) return blocked('ROLE_REQUEST', 'Resolver options required')
  const { manifest, stageId, taskId, taskType, role, reader, authority, invoked,
    executionKind } = options
  if (!object(manifest) || !Array.isArray(manifest.stages) ||
    typeof stageId !== 'string' || typeof taskId !== 'string' || !taskId ||
    typeof taskType !== 'string' || !taskType || typeof role !== 'string' || !role)
    return blocked('ROLE_REQUEST', 'Stage, task, task type and role required')
  const stages = manifest.stages.filter((stage) => stage?.id === stageId)
  if (stages.length !== 1) return blocked('ROLE_STAGE', 'Exactly one stage required')
  const stage = stages[0]
  if (!Array.isArray(stage.roleAssignments) || !Array.isArray(stage.taskOverrides))
    return blocked('ROLE_MISSING', 'Approved role matrix required')
  if (stage.roleAssignments.some((row) => !object(row)))
    return blocked('ROLE_ASSIGNMENT', 'Role assignment record required')
  if (stage.taskOverrides.some((row) => !object(row)))
    return blocked('ROLE_OVERRIDE_APPROVAL', 'Task override record required')
  const keys = new Set()
  for (const row of stage.roleAssignments) {
    const key = `${row?.taskType ?? row?.role}\0${row?.role}`
    if (keys.has(key)) return blocked('ROLE_CONFLICT', 'Duplicate stage/type/role assignment')
    keys.add(key)
  }
  const overrideKeys = new Set()
  for (const row of stage.taskOverrides) {
    const key = `${row?.taskId}\0${row?.taskType}\0${row?.role}`
    if (overrideKeys.has(key)) return blocked('ROLE_OVERRIDE_CONFLICT', 'Duplicate task override')
    overrideKeys.add(key)
  }
  for (const row of stage.taskOverrides) {
    if (typeof row.reason !== 'string' || !row.reason.trim() ||
      !row?.source?.excerpt || !row?.approval?.path ||
      !hash64(row.approval.sha256))
      return blocked('ROLE_OVERRIDE_APPROVAL', 'Task override needs source, reason and approval')
  }
  const matches = stage.roleAssignments.filter((row) =>
    (row.taskType ?? row.role) === taskType && row.role === role)
  if (matches.length !== 1) return blocked('ROLE_MISSING', 'No exact stage/type/role assignment')
  const base = matches[0]
  if (!pairValid(base)) return blocked('ROLE_PAIR', 'One exact model and effort required')
  const overrides = stage.taskOverrides.filter((row) =>
    row.taskId === taskId && row.taskType === taskType && row.role === role)
  if (overrides.length > 1) return blocked('ROLE_OVERRIDE_CONFLICT', 'Multiple matching overrides')
  const selected = overrides[0] ?? base
  if (!pairValid(selected)) return blocked('ROLE_PAIR', 'One exact model and effort required')
  const kind = ['independent-PRE', 'independent-POST', 'reviewer'].includes(role)
    ? 'reviewer' : 'executor'
  if ([base.executionKind, selected.executionKind, executionKind].some((value) =>
    value !== undefined && value !== kind))
    return blocked('ROLE_KIND', 'Executor and reviewer assignments must remain separate')
  const stageRow = base.taskType
    ? `| ${stageId} | ${taskType} | ${role} | ${base.model} | ${base.effort} |`
    : `| ${stageId} | ${role} | ${base.model} | ${base.effort} |`
  if (base.source?.excerpt !== undefined && base.source.excerpt !== stageRow)
    return blocked('ROLE_EXCERPT', 'Stage row must match exact type, role and pair')
  const overrideRow = `| ${stageId} | ${taskId} | ${taskType} | ${role} | ` +
    `${selected.model} | ${selected.effort} | exception: ${selected.reason} |`
  if (overrides.length && selected.source.excerpt !== overrideRow)
    return blocked('ROLE_EXCERPT', 'Override row must match exact task, role, pair and reason')
  if (!reader || typeof reader.read !== 'function')
    return blocked('ROLE_READER', 'Safe artifact reader required')
  const baseProof = await verifySource(reader, authority, canonicalSource(base, stage, false), {
    stage: stageId, task: taskId, taskType, role,
    model: base.model, effort: base.effort, exception: null,
  })
  if (!baseProof.ok) return baseProof
  const source = canonicalSource(selected, stage, !!overrides.length)
  const proof = overrides.length ? await verifySource(reader, authority, source, {
    stage: stageId, task: taskId, taskType, role,
    model: selected.model, effort: selected.effort,
    exception: overrides.length ? { reason: selected.reason, approval: selected.approval } : null,
  }) : { ok: true }
  if (!proof.ok) return proof
  if (invoked !== undefined && (invoked?.model !== selected.model ||
    invoked?.effort !== selected.effort))
    return blocked('ROLE_INVOKED_MISMATCH', 'Invoked pair differs from approved pair')
  const assignment = {
    stage: stageId, task: taskId, taskType, role,
    executionKind: kind,
    model: selected.model, effort: selected.effort,
    source: { path: source.path, sha256: source.sha256,
      excerpt: source.excerpt, revision: source.revision },
    exception: overrides.length ? { reason: selected.reason, approval: selected.approval } : null,
  }
  return {
    ok: true, status: 'RESOLVED', assignment,
    provenance: {
      requested: { model: selected.model, effort: selected.effort },
      invoked: invoked ?? null,
      actualBackend: 'NOT_CONFIRMED', actualEffort: 'NOT_CONFIRMED',
      availability: 'NOT_CONFIRMED',
    },
    issues: [],
  }
}

export function writableWorkerDispatch() {
  return blocked('WRITER_NOT_IMPLEMENTED',
    'Writable worker launch is NOT_IMPLEMENTED; reviewer packet confinement is read-only')
}
