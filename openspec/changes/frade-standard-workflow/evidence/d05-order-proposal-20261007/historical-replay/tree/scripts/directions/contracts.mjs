import { createHash } from 'node:crypto'

export const PHASES = Object.freeze([
  'INTAKE',
  'RESEARCH',
  'REQUIREMENTS',
  'PLANNING',
  'PRE_REVIEW',
  'BDD_TDD',
  'IMPLEMENTATION',
  'CHECKS',
  'VERIFICATION',
  'POST_REVIEW',
  'ARCHIVE',
  'CLOSED',
])
export const HEALTH = Object.freeze(['NOT_RUN', 'RUNNING', 'PASS', 'FAIL', 'BLOCKED', 'PAUSED'])
export const APPLICABILITY = Object.freeze(['REQUIRED', 'NOT_APPLICABLE'])
const hash64 = (x) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x)
const hash40 = (x) => typeof x === 'string' && /^[a-f0-9]{40}$/.test(x)
const obj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x)
const outcome = (issues) => ({ ok: issues.length === 0, issues })
const add = (issues, code, path, detail) => issues.push({ code, path, detail })
const hasControlCharacter = (value) => {
  for (let i = 0; i < value.length; i++) if (value.charCodeAt(i) <= 31) return true
  return false
}
export const safeId = (x) =>
  typeof x === 'string' && x.length <= 64 && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(x)
const safeSegment = (p) =>
  !!p &&
  p !== '.' &&
  p !== '..' &&
  !/[<>":|?*\u007f]/.test(p) &&
  !/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$/i.test(p) &&
  p.toLowerCase() !== '.git' &&
  !p.endsWith(' ') &&
  !p.endsWith('.')

export function safeRepoPath(x, { glob = false } = {}) {
  if (
    typeof x !== 'string' ||
    !x ||
    x.length > 512 ||
    hasControlCharacter(x) ||
    /[\\:%?#]/.test(x) ||
    x.startsWith('/')
  )
    return false
  const body = glob && x.endsWith('/**') ? x.slice(0, -3) : x
  return !!body && !body.includes('*') && !body.includes('//') && body.split('/').every(safeSegment)
}
export function safeOwnerPath(x, { gitCommon = false } = {}) {
  if (typeof x !== 'string' || hasControlCharacter(x) || /\\/.test(x)) return false
  const windows = /^[A-Za-z]:\//.test(x)
  if (!windows && !x.startsWith('/')) return false
  if (windows && !/^[A-Za-z]:\/(?:[^/]+\/)*[^/]+$/.test(x)) return false
  if (x === '/' || x.endsWith('/') || x.includes('//')) return false
  const parts = (windows ? x.slice(3) : x.slice(1)).split('/')
  return parts.every((part, index) =>
    part === '.git' && gitCommon && index === parts.length - 1 ? true : safeSegment(part),
  )
}
export function pathMatches(pattern, path) {
  if (!safeRepoPath(pattern, { glob: true }) || !safeRepoPath(path)) return false
  const a = pattern.toLowerCase(),
    b = path.toLowerCase()
  return a.endsWith('/**') ? b.startsWith(a.slice(0, -2)) : b === a
}
const overlap = (a, b) => {
  const x = (a.endsWith('/**') ? a.slice(0, -3) : a).toLowerCase()
  const y = (b.endsWith('/**') ? b.slice(0, -3) : b).toLowerCase()
  return (
    x === y ||
    (a.endsWith('/**') && y.startsWith(`${x}/`)) ||
    (b.endsWith('/**') && x.startsWith(`${y}/`))
  )
}
const W01_SPECS = [
  'engineering-direction-lifecycle',
  'engineering-role-dispatch',
  'engineering-progress-publication',
].map((x) => `openspec/specs/${x}/spec.md`)
const BARRIERS = [
  'humanPolicyDecision',
  'requiredChecksPASS',
  'formalVerifyPASS',
  'currentIndependentPOSTPASS',
]
const canonical = (value) =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : obj(value)
      ? `{${Object.keys(value)
          .filter((k) => value[k] !== undefined)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
          .join(',')}}`
      : JSON.stringify(value)

export function scopeFingerprint(m) {
  const v = validateManifest(m)
  if (!v.ok) throw new TypeError(`Invalid manifest: ${v.issues.map((x) => x.code).join(',')}`)
  const content = {
    id: m.id,
    owner: m.owner,
    originalBaseline: m.originalBaseline,
    policy: {
      version: m.policy.version,
      release: m.policy.release,
      sha256: m.policy.sha256,
      artifact: m.policy.artifact,
    },
    scope: {
      allowed: m.scope.allowed,
      planningAllowed: m.scope.planningAllowed,
      frozen: m.scope.frozen,
      closure: {
        requires: m.scope.closure.requires,
        specDestinations: m.scope.closure.specDestinations,
        archiveDestination: m.scope.closure.archiveDestination,
        archiveOwner: m.scope.closure.archiveOwner,
      },
    },
    statusPath: m.statusPath,
    stages: m.stages.map((s) => ({
      id: s.id,
      change: s.change,
      dependencies: s.dependencies,
      roleAssignments: s.roleAssignments,
      roleAuthority: s.roleAuthority,
      taskOverrides: s.taskOverrides,
      tasksAuthority: s.tasksAuthority,
      tasks: s.tasks?.map((t) => ({
        id: t.id,
        type: t.type,
        dependencies: t.dependencies,
        scenarioIds: t.scenarioIds,
        acceptance: t.acceptance,
      })),
    })),
  }
  return createHash('sha256').update(canonical(content)).digest('hex')
}

export function validateManifest(m) {
  const issues = []
  if (!obj(m)) return outcome([{ code: 'MANIFEST_SHAPE', path: '$', detail: 'Expected object' }])
  if (m.schemaVersion !== 2)
    add(issues, 'SCHEMA_VERSION', 'schemaVersion', 'Only version 2 is supported')
  if (!safeId(m.id)) add(issues, 'DIRECTION_ID', 'id', 'Unsafe direction ID')
  if (typeof m.title !== 'string' || !m.title.trim())
    add(issues, 'TITLE', 'title', 'Title required')
  if (!obj(m.owner) || m.owner.branch !== `codex/${m.id}` || !safeId(m.owner.branch?.slice(6)))
    add(issues, 'OWNER_BRANCH', 'owner.branch', 'Branch must match ID')
  for (const key of ['worktree', 'gitCommon'])
    if (!safeOwnerPath(m.owner?.[key], { gitCommon: key === 'gitCommon' }))
      add(issues, 'OWNER_PATH', `owner.${key}`, 'Canonical absolute path required')
  if (!hash40(m.originalBaseline))
    add(issues, 'BASELINE', 'originalBaseline', 'Full commit ID required')
  if (
    !obj(m.policy) ||
    !hash64(m.policy.sha256) ||
    !hash64(m.policy.release) ||
    !safeRepoPath(m.policy.artifact)
  )
    add(issues, 'POLICY_BINDING', 'policy', 'Versioned policy bytes and artifact required')
  if (!safeRepoPath(m.statusPath)) add(issues, 'STATUS_PATH', 'statusPath', 'Unsafe status path')
  const scope = m.scope
  if (!obj(scope)) add(issues, 'SCOPE_SHAPE', 'scope', 'Scope required')
  else {
    if (!['PLANNING', 'PRE_REVIEW', 'IMPLEMENTATION', 'CLOSURE'].includes(scope.mode))
      add(issues, 'SCOPE_MODE', 'scope.mode', 'Unknown mode')
    for (const key of ['allowed', 'planningAllowed', 'frozen']) {
      if (!Array.isArray(scope[key]) || !scope[key].length)
        add(issues, 'SCOPE_LIST', `scope.${key}`, 'Nonempty list required')
      else
        scope[key].forEach((p, i) => {
          if (!safeRepoPath(p, { glob: true }))
            add(issues, 'UNSAFE_PATH', `scope.${key}[${i}]`, 'Unsafe path')
        })
    }
    for (const a of Array.isArray(scope.allowed) ? scope.allowed : [])
      for (const f of Array.isArray(scope.frozen) ? scope.frozen : [])
        if (safeRepoPath(a, { glob: true }) && safeRepoPath(f, { glob: true }) && overlap(a, f))
          add(issues, 'FROZEN_OVERLAP', 'scope.allowed', `${a} intersects ${f}`)
    if (
      safeRepoPath(m.statusPath) &&
      (!Array.isArray(scope.allowed) ||
        !scope.allowed.some((p) => pathMatches(p, m.statusPath)) ||
        !Array.isArray(scope.planningAllowed) ||
        !scope.planningAllowed.some((p) => pathMatches(p, m.statusPath)) ||
        !Array.isArray(scope.frozen) ||
        scope.frozen.some((p) => pathMatches(p, m.statusPath)))
    )
      add(
        issues,
        'STATUS_SCOPE',
        'statusPath',
        'Status path must stay in owning planning and implementation scope',
      )
    const c = scope.closure
    if (
      !obj(c) ||
      typeof c.enabled !== 'boolean' ||
      !safeId(c.archiveOwner) ||
      !Array.isArray(c.requires) ||
      BARRIERS.some((x) => !c.requires.includes(x))
    )
      add(issues, 'CLOSURE_CONTRACT', 'scope.closure', 'Owner and barriers required')
    const specs = c?.specDestinations
    if (
      !Array.isArray(specs) ||
      !specs.length ||
      specs.some(
        (p) =>
          typeof p !== 'string' ||
          !/^openspec\/specs\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*\/spec\.md$/.test(p) ||
          !safeRepoPath(p),
      ) ||
      new Set(specs.map((p) => p?.toLowerCase())).size !== specs.length ||
      (m.id === 'frade-standard-workflow' &&
        (specs.length !== W01_SPECS.length || specs.some((p) => !W01_SPECS.includes(p))))
    )
      add(
        issues,
        'CLOSURE_DESTINATION',
        'scope.closure.specDestinations',
        'Exact safe capability spec paths required',
      )
    if (
      c?.archiveDestination !==
      `openspec/changes/archive/<actual-archive-date>-${c?.archiveOwner}/**`
    )
      add(
        issues,
        'ARCHIVE_DESTINATION',
        'scope.closure.archiveDestination',
        'Archive must bind exact owner',
      )
  }
  if (!Array.isArray(m.stages) || !m.stages.length)
    add(issues, 'STAGES', 'stages', 'Stage list required')
  else {
    const seen = new Set()
    const changes = new Set()
    for (const [i, s] of m.stages.entries()) {
      const p = `stages[${i}]`
      if (!obj(s) || typeof s.id !== 'string' || !/^[A-Z][A-Z0-9]*$/.test(s.id) || seen.has(s.id))
        add(issues, 'STAGE_ID', `${p}.id`, 'Unique stage ID required')
      seen.add(s?.id)
      if (
        !safeId(s?.change) ||
        changes.has(s.change) ||
        !Array.isArray(m.scope?.planningAllowed) ||
        !m.scope.planningAllowed.some((path) =>
          pathMatches(path, `openspec/changes/${s.change}/proposal.md`),
        )
      )
        add(
          issues,
          'STAGE_OWNER',
          `${p}.change`,
          'Stage change must be safe, unique and in owned planning scope',
        )
      changes.add(s?.change)
      if (!PHASES.includes(s?.phase)) add(issues, 'PHASE', `${p}.phase`, 'Unknown phase')
      if (!HEALTH.includes(s?.health)) add(issues, 'HEALTH', `${p}.health`, 'Unknown health')
      if (
        !Array.isArray(s?.dependencies) ||
        s.dependencies.some((x) => typeof x !== 'string' || !/^[A-Z][A-Z0-9]*$/.test(x))
      )
        add(issues, 'DEPENDENCIES', `${p}.dependencies`, 'Dependencies required')
      if (
        s?.tasks !== undefined &&
        (!Array.isArray(s.tasks) ||
          s.tasks.some((t) => !obj(t) || typeof t.id !== 'string' || !t.id))
      )
        add(issues, 'TASK_SHAPE', `${p}.tasks`, 'Task records must have stable IDs')
      if (
        s?.failedFixes !== undefined &&
        (!Array.isArray(s.failedFixes) ||
          s.failedFixes.some(
            (f) =>
              !obj(f) ||
              typeof f.defectId !== 'string' ||
              !f.defectId ||
              typeof f.deterministic !== 'boolean' ||
              f.status !== 'FAIL',
          ))
      )
        add(
          issues,
          'FAILED_FIXES',
          `${p}.failedFixes`,
          'Recorded failed fixes require stable defect and deterministic classification',
        )
      if (s?.rca !== undefined && !obj(s.rca))
        add(issues, 'RCA_SHAPE', `${p}.rca`, 'RCA object required')
      if (s?.admission !== undefined && !obj(s.admission))
        add(issues, 'GATE_CLAIM', `${p}.admission`, 'Admission object required')
      for (const [key, claim] of Object.entries(obj(s?.admission) ? s.admission : {}))
        if (typeof claim !== 'string' || /^(?:true|false)$/i.test(claim))
          add(issues, 'GATE_CLAIM', `${p}.admission.${key}`, 'Boolean gate claim forbidden')
    }
    const stageIds = new Set(m.stages.map((s) => s?.id))
    for (const [i, s] of m.stages.entries())
      if (Array.isArray(s?.dependencies))
        for (const dep of s.dependencies)
          if (!stageIds.has(dep) || dep === s.id)
            add(
              issues,
              'DEPENDENCIES',
              `stages[${i}].dependencies`,
              'Unknown or self stage dependency',
            )
    const stageById = new Map(m.stages.filter(obj).map((s) => [s.id, s]))
    const visited = new Set(),
      visiting = new Set()
    const cycle = (id) => {
      if (visiting.has(id)) return true
      if (visited.has(id)) return false
      visiting.add(id)
      const found = (
        Array.isArray(stageById.get(id)?.dependencies) ? stageById.get(id).dependencies : []
      ).some((dep) => stageById.has(dep) && cycle(dep))
      visiting.delete(id)
      visited.add(id)
      return found
    }
    if ([...stageById.keys()].some(cycle))
      add(issues, 'DEPENDENCIES', 'stages', 'Circular stage dependency')
    if (!changes.has(m.scope?.closure?.archiveOwner))
      add(
        issues,
        'STAGE_OWNER',
        'scope.closure.archiveOwner',
        'Closure owner must be an owned stage change',
      )
  }
  return outcome(issues)
}

export function validateTraceability(t, { action = 'IMPLEMENTATION' } = {}) {
  const issues = []
  if (
    !obj(t) ||
    !['requirements', 'scenarios', 'tasks', 'assertions', 'runs'].every((k) => Array.isArray(t[k]))
  )
    return outcome([{ code: 'TRACE_SHAPE', path: '$', detail: 'Trace arrays required' }])
  const maps = Object.fromEntries(
    ['requirements', 'scenarios', 'tasks', 'assertions', 'runs'].map((k) => [
      k,
      new Map(t[k].map((x) => [x?.id, x])),
    ]),
  )
  for (const k of Object.keys(maps))
    if (maps[k].size !== t[k].length) add(issues, 'TRACE_DUPLICATE', k, 'Duplicate ID')
  for (const r of t.requirements) {
    if (
      typeof r?.id !== 'string' ||
      !/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/.test(r.id) ||
      r.id.length > 80
    )
      add(issues, 'REQUIREMENT_ID', 'requirements', 'Stable generic ID required')
    if (r?.unresolved?.length && !['INTAKE', 'RESEARCH'].includes(action))
      add(issues, 'UNRESOLVED_ACCEPTANCE', r?.id, 'Dependent work blocked')
    const linked = Array.isArray(r?.scenarioIds)
      ? r.scenarioIds.map((id) => maps.scenarios.get(id))
      : []
    if (!linked.length || linked.some((s) => !s || s.requirementId !== r?.id))
      add(issues, 'TRACE_SCENARIO', r?.id, 'Scenario link missing')
    if (r?.critical)
      for (const control of ['positive', 'negative', 'boundary'])
        if (!linked.some((s) => s?.control === control))
          add(issues, `CONTROL_${control.toUpperCase()}`, r?.id, `Missing ${control} control`)
  }
  for (const s of t.scenarios) {
    if (!maps.requirements.has(s?.requirementId))
      add(issues, 'TRACE_REQUIREMENT', s?.id, 'Unknown requirement')
    else if (
      !Array.isArray(maps.requirements.get(s?.requirementId)?.scenarioIds) ||
      !maps.requirements.get(s?.requirementId)?.scenarioIds.includes(s?.id)
    )
      add(issues, 'TRACE_REQUIREMENT_SCENARIO', s?.id, 'Reciprocal requirement link missing')
    if (!['positive', 'negative', 'boundary', 'human', 'future'].includes(s?.control))
      add(issues, 'TRACE_CONTROL', s?.id, 'Control class required')
    if (
      ['human', 'future'].includes(s?.control) &&
      (typeof s.boundaryReason !== 'string' || s.boundaryReason.trim().length < 20)
    )
      add(issues, 'TRACE_BOUNDARY_REASON', s?.id, 'Explicit human/future boundary required')
    if (
      !Array.isArray(s?.taskIds) ||
      !s.taskIds.length ||
      s.taskIds.some(
        (id) =>
          !maps.tasks.has(id) ||
          !Array.isArray(maps.tasks.get(id)?.scenarioIds) ||
          !maps.tasks.get(id).scenarioIds.includes(s?.id),
      )
    )
      add(issues, 'TRACE_TASK', s?.id, 'Reciprocal task link missing')
    if (
      !['human', 'future'].includes(s?.control) &&
      (!Array.isArray(s?.assertionIds) ||
        !s.assertionIds.length ||
        s.assertionIds.some((id) => !maps.assertions.has(id)))
    )
      add(issues, 'TRACE_ASSERTION', s?.id, 'Executable assertion missing')
  }
  for (const task of t.tasks)
    if (
      !Array.isArray(task?.scenarioIds) ||
      !task.scenarioIds.length ||
      task.scenarioIds.some((id) => {
        const scenario = maps.scenarios.get(id)
        return !scenario || !Array.isArray(scenario.taskIds) || !scenario.taskIds.includes(task?.id)
      })
    )
      add(issues, 'TRACE_TASK_SCENARIO', task?.id, 'Nonempty reciprocal scenario links required')
  for (const a of t.assertions)
    if (!maps.runs.has(a?.runId)) add(issues, 'TRACE_RUN', a?.id, 'Actual run missing')
  for (const r of t.runs)
    if (
      !hash64(r?.sourceSha256) ||
      !hash64(r?.configSha256) ||
      typeof r?.environment !== 'string' ||
      !r.environment.trim() ||
      !['PASS', 'FAIL', 'BLOCKED'].includes(r?.status)
    )
      add(issues, 'RUN_BINDING', r?.id, 'Source/config/environment binding required')
  return outcome(issues)
}

// A malformed row with no identifiable requirement makes every acceptance count
// ambiguous. Once an owner is known, its defect affects only that requirement.
export function acceptedRequirementCount(
  trace,
  proven,
  runProof,
  { action = 'IMPLEMENTATION' } = {},
) {
  const validation = validateTraceability(trace, { action })
  if (
    !Array.isArray(trace?.requirements) ||
    !Array.isArray(trace?.scenarios) ||
    !Array.isArray(trace?.tasks) ||
    !Array.isArray(trace?.assertions) ||
    !Array.isArray(trace?.runs)
  )
    return 0
  const { requirements, scenarios, tasks, assertions, runs } = trace
  const rows = [requirements, scenarios, tasks, assertions, runs]
  if (rows.some((items) => items.some((item) => typeof item?.id !== 'string' || !item.id))) return 0
  const blocked = new Set()
  let unassignable = false
  const scenarioOwners = (id) => scenarios.filter((s) => s.id === id).map((s) => s.requirementId)
  const taskOwners = (id) => {
    const task = tasks.find((t) => t.id === id)
    return Array.isArray(task?.scenarioIds) && task.scenarioIds.length
      ? task.scenarioIds.flatMap(scenarioOwners)
      : []
  }
  const assertionOwners = (id) =>
    scenarios
      .filter((s) => Array.isArray(s.assertionIds) && s.assertionIds.includes(id))
      .map((s) => s.requirementId)
  const runOwners = (id) =>
    assertions.filter((a) => a.runId === id).flatMap((a) => assertionOwners(a.id))
  for (const finding of validation.issues) {
    let owners = []
    if (
      [
        'TRACE_SCENARIO',
        'UNRESOLVED_ACCEPTANCE',
        'CONTROL_POSITIVE',
        'CONTROL_NEGATIVE',
        'CONTROL_BOUNDARY',
      ].includes(finding.code)
    )
      owners = [finding.path]
    else if (
      [
        'TRACE_REQUIREMENT_SCENARIO',
        'TRACE_CONTROL',
        'TRACE_BOUNDARY_REASON',
        'TRACE_TASK',
        'TRACE_ASSERTION',
      ].includes(finding.code)
    )
      owners = scenarioOwners(finding.path)
    else if (finding.code === 'TRACE_TASK_SCENARIO') owners = taskOwners(finding.path)
    else if (finding.code === 'TRACE_RUN') owners = assertionOwners(finding.path)
    else if (finding.code === 'RUN_BINDING') owners = runOwners(finding.path)
    if (!owners.length || owners.some((id) => requirements.filter((r) => r.id === id).length !== 1))
      unassignable = true
    else owners.forEach((id) => blocked.add(id))
  }
  if (unassignable) return 0
  return requirements.filter((r) => {
    if (
      blocked.has(r.id) ||
      r.unresolved?.length ||
      !/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/.test(r.id) ||
      r.id.length > 80 ||
      requirements.filter((other) => other.id === r.id).length !== 1 ||
      !Array.isArray(r.scenarioIds) ||
      !r.scenarioIds.length ||
      new Set(r.scenarioIds).size !== r.scenarioIds.length
    )
      return false
    const linked = scenarios.filter((s) => s.requirementId === r.id)
    if (
      linked.length !== r.scenarioIds.length ||
      !r.scenarioIds.every((id) => linked.filter((s) => s.id === id).length === 1) ||
      (r.critical &&
        ['positive', 'negative', 'boundary'].some(
          (control) => !linked.some((s) => s.control === control),
        ))
    )
      return false
    return linked.every((s) => {
      if (
        !['positive', 'negative', 'boundary'].includes(s.control) ||
        !proven.has(s.id) ||
        !Array.isArray(s.taskIds) ||
        !s.taskIds.length ||
        new Set(s.taskIds).size !== s.taskIds.length ||
        !s.taskIds.every((id) => {
          const matching = tasks.filter((task) => task.id === id)
          return (
            matching.length === 1 &&
            Array.isArray(matching[0].scenarioIds) &&
            matching[0].scenarioIds.includes(s.id)
          )
        }) ||
        tasks.some(
          (task) =>
            Array.isArray(task.scenarioIds) &&
            task.scenarioIds.includes(s.id) &&
            !s.taskIds.includes(task.id),
        ) ||
        !Array.isArray(s.assertionIds) ||
        !s.assertionIds.length ||
        new Set(s.assertionIds).size !== s.assertionIds.length
      )
        return false
      return s.assertionIds.every((id) => {
        const matching = assertions.filter((a) => a.id === id)
        return (
          matching.length === 1 &&
          runs.filter((run) => run.id === matching[0].runId).length === 1 &&
          runProof.get(matching[0].runId) === true
        )
      })
    })
  }).length
}

export async function verifyTraceability(
  trace,
  { boundary, snapshot, action = 'IMPLEMENTATION' } = {},
) {
  const issues = [...validateTraceability(trace, { action }).issues]
  const { verifyGate } = await import('./evidence.mjs')
  if (!hash64(snapshot?.sourceSha256) || !hash64(snapshot?.configSha256))
    add(issues, 'TRACE_SNAPSHOT', 'snapshot', 'Current source/config hashes required')
  const referenced = new Set(
    (Array.isArray(trace?.assertions) ? trace.assertions : []).map((a) => a?.runId),
  )
  for (const run of (Array.isArray(trace?.runs) ? trace.runs : []).filter((r) =>
    referenced.has(r?.id),
  )) {
    if (
      run?.status !== 'PASS' ||
      run?.sourceSha256 !== snapshot?.sourceSha256 ||
      run?.configSha256 !== snapshot?.configSha256 ||
      !(await verifyGate(boundary, 'run', run, {
        sourceSha256: snapshot?.sourceSha256,
        configSha256: snapshot?.configSha256,
      }))
    )
      add(issues, 'TRACE_RUN_PROOF', run?.id, 'Current trusted raw run proof required')
  }
  return outcome(issues)
}

export function validateApplicability(plan = {}) {
  if (!obj(plan))
    return outcome([{ code: 'APPLICABILITY_SHAPE', path: '$', detail: 'Plan object required' }])
  const { checks, affectedContracts = [], previousResults = [] } = plan
  const issues = []
  if (
    !Array.isArray(checks) ||
    !Array.isArray(affectedContracts) ||
    !Array.isArray(previousResults)
  )
    return outcome([{ code: 'APPLICABILITY_SHAPE', path: '$', detail: 'Arrays required' }])
  for (const c of checks) {
    if (!APPLICABILITY.includes(c?.applicability))
      add(issues, 'APPLICABILITY', c?.id, 'Unknown applicability')
    if (c?.applicability === 'NOT_APPLICABLE') {
      if (
        affectedContracts.includes(c.contract) ||
        previousResults.some((r) => r?.id === c.id && r?.status === 'FAIL')
      )
        add(issues, 'FALSE_NOT_APPLICABLE', c.id, 'Affected or failing check cannot be waived')
      if (typeof c.reason !== 'string' || c.reason.trim().length < 20)
        add(issues, 'NA_REASON', c.id, 'Contract reason required')
    }
    if (c?.applicability === 'REQUIRED' && c.status !== 'PASS')
      add(issues, 'REQUIRED_CHECK_NOT_PASS', c.id, 'Required run not passing')
  }
  return outcome(issues)
}

export async function verifyApplicability(plan, options = {}) {
  const validation = validateApplicability(plan)
  if (!validation.ok) return validation
  if (!obj(options))
    return outcome([
      { code: 'APPLICABILITY_OPTIONS_SHAPE', path: '$', detail: 'Options object required' },
    ])
  const { boundary, snapshot } = options
  const issues = []
  const { verifyGate } = await import('./evidence.mjs')
  if (!hash64(snapshot?.sourceSha256) || !hash64(snapshot?.configSha256))
    add(issues, 'CHECK_SNAPSHOT', 'snapshot', 'Current source/config hashes required')
  for (const c of Array.isArray(plan?.checks) ? plan.checks : [])
    if (
      c?.applicability === 'REQUIRED' &&
      !(await verifyGate(boundary, 'check', c, {
        sourceSha256: snapshot?.sourceSha256,
        configSha256: snapshot?.configSha256,
      }))
    )
      add(issues, 'CHECK_PROOF', c?.id, 'Current trusted raw check run required')
  return outcome(issues)
}
