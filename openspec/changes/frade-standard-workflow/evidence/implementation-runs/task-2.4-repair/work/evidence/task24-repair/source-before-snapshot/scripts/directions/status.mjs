import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { lstat, readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import {
  PHASES,
  safeRepoPath,
  validateManifest,
  validateTraceability,
  validateApplicability,
} from './contracts.mjs'
import { verifyGate } from './evidence.mjs'

export const HEADINGS = Object.freeze([
  '## 1. Решение / следующий шаг',
  '## 2. Идентичность / scope',
  '## 3. Roadmap этапов',
  '## 4. Активные задачи / шаги',
  '## 5. Проверки / gates / качество',
  '## 6. Модели / исполнение',
  '## 7. Зависимости / решения / blockers',
  '## 8. Git / публикация / evidence',
])
export const LEGACY_BOUNDARY = '<!-- LEGACY HISTORY: historical only -->'
const sha = (x) => createHash('sha256').update(x).digest('hex')
const issue = (code, path) => ({ code, path })
const safe = (x) =>
  String(x ?? 'UNKNOWN')
    .replace(/[\r\n\t|<>`\[\]]/g, ' ')
    .replace(/#/g, '＃')
    .replace(/https?:\/\/\S+/g, '[external link]')
    .trim()
    .slice(0, 240) || 'UNKNOWN'
const row = (...cells) => `| ${cells.map(safe).join(' | ')} |`
const hash64 = (x) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x)
const age = (now, opened) => {
  const delta = Date.parse(now) - Date.parse(opened)
  return Number.isFinite(delta) && delta >= 0
    ? `${Math.floor(delta / 86400000)} days`
    : 'AGE_UNKNOWN'
}
const blankTrace = () => ({ requirements: [], scenarios: [], tasks: [], assertions: [], runs: [] })

export function parseStatus(input) {
  if (typeof input !== 'string') throw new Error('STATUS_TEXT')
  const at = input.indexOf(LEGACY_BOUNDARY),
    current = at < 0 ? input : input.slice(0, at)
  const legacy = at < 0 ? '' : input.slice(at),
    sections = []
  for (const line of current.split(/\r?\n/)) {
    if (!line.startsWith('## ')) continue
    if (!HEADINGS.includes(line)) throw new Error('SECTION_UNKNOWN')
    if (sections.some((x) => x.heading === line)) throw new Error('SECTION_DUPLICATE')
    if (line !== HEADINGS[sections.length]) throw new Error('SECTION_ORDER')
    sections.push({ heading: line })
  }
  if (sections.length !== 8) throw new Error('SECTION_COUNT')
  if (legacy && input.indexOf(LEGACY_BOUNDARY, at + LEGACY_BOUNDARY.length) >= 0)
    throw new Error('LEGACY_DUPLICATE_BOUNDARY')
  return { sections, legacy }
}
export function parseTasks(input) {
  if (typeof input !== 'string') throw new Error('TASK_TEXT')
  const tasks = [],
    seen = new Set()
  for (const line of input.split(/\r?\n/)) {
    if (!/^\s*- \[/.test(line)) continue
    const m = /^\s*- \[([ xX])\] (\d+(?:\.\d+)+)\s+(.+?)\s*$/.exec(line)
    if (!m) throw new Error('TASK_MALFORMED')
    if (seen.has(m[2])) throw new Error('TASK_DUPLICATE')
    seen.add(m[2])
    tasks.push({ id: m[2], complete: m[1].toLowerCase() === 'x', title: m[3] })
  }
  return tasks
}
export async function projectStatus(input) {
  const {
    manifest: m,
    tasksText = '',
    trace = blankTrace(),
    snapshot = {},
    boundary,
    checks = [],
    affectedContracts = [],
    previousResults = [],
    updatedAt = 'NOT_RUN',
  } = input
  const issues = [...validateManifest(m).issues, ...(input.sourceIssues ?? [])]
  const stage = m?.stages?.find((s) => s.phase !== 'CLOSED') ?? m?.stages?.at(-1)
  let tasks = []
  try {
    tasks = parseTasks(tasksText)
  } catch (error) {
    issues.push(issue(error.message, 'tasks'))
  }
  const traceValidation = validateTraceability(trace, { action: stage?.phase ?? 'INTAKE' })
  issues.push(...traceValidation.issues)
  issues.push(...validateApplicability({ checks, affectedContracts, previousResults }).issues)
  for (const check of checks)
    if (check.applicability === 'NOT_APPLICABLE' && check.status === 'FAIL')
      issues.push(issue('FALSE_NOT_APPLICABLE', check.id))
  if (!hash64(snapshot.sourceSha256) || !hash64(snapshot.configSha256))
    issues.push(issue('SNAPSHOT_BINDING', 'snapshot'))
  if (
    ['CLOSED', 'ARCHIVE'].includes(stage?.phase) ||
    (stage?.health === 'PASS' && PHASES.indexOf(stage.phase) < PHASES.indexOf('CHECKS'))
  )
    issues.push(issue('PHASE_PROOF', 'stage'))
  const runProof = new Map()
  for (const run of trace.runs ?? []) {
    const verified =
      run.sourceSha256 === snapshot.sourceSha256 &&
      run.configSha256 === snapshot.configSha256 &&
      (await verifyGate(boundary, 'run', run, {
        sourceSha256: snapshot.sourceSha256,
        configSha256: snapshot.configSha256,
      }))
    runProof.set(run.id, verified)
    if (!verified) issues.push(issue('RUN_NOT_VERIFIED', run.id))
  }
  const assertions = new Map((trace.assertions ?? []).map((a) => [a.id, a])),
    proven = new Set()
  for (const s of trace.scenarios ?? []) {
    if (['human', 'future'].includes(s.control)) continue
    if (
      Array.isArray(s.assertionIds) &&
      s.assertionIds.length &&
      s.assertionIds.every((id) => runProof.get(assertions.get(id)?.runId) === true)
    )
      proven.add(s.id)
  }
  const accepted = traceValidation.ok
    ? (trace.requirements ?? []).filter(
        (r) =>
          !r.unresolved?.length &&
          Array.isArray(r.scenarioIds) &&
          r.scenarioIds.length &&
          r.scenarioIds.every((id) => proven.has(id)) &&
          !(trace.scenarios ?? []).some(
            (s) => s.requirementId === r.id && ['human', 'future'].includes(s.control),
          ),
      ).length
    : 0
  const complete = tasks.filter((t) => t.complete).length,
    required = checks.filter((c) => c.applicability === 'REQUIRED')
  const checkRows = []
  for (const check of checks) {
    const proof =
      check.status === 'PASS' &&
      (await verifyGate(boundary, 'check', check.run, {
        sourceSha256: snapshot.sourceSha256,
        configSha256: snapshot.configSha256,
      }))
    checkRows.push({ ...check, proof })
    if (check.status === 'PASS' && !proof) issues.push(issue('CHECK_NOT_VERIFIED', check.id))
  }
  const passed = checkRows.filter((c) => c.applicability === 'REQUIRED' && c.proof).length
  const metrics = {
    tasks: { complete, total: tasks.length, remaining: tasks.length - complete },
    requirements: {
      accepted,
      total: trace.requirements?.length ?? 0,
      uncovered: (trace.requirements?.length ?? 0) - accepted,
    },
    scenarios: {
      executed: proven.size,
      total: trace.scenarios?.length ?? 0,
      negativeExecuted: (trace.scenarios ?? []).filter(
        (s) => s.control === 'negative' && proven.has(s.id),
      ).length,
      boundaryExecuted: (trace.scenarios ?? []).filter(
        (s) => s.control === 'boundary' && proven.has(s.id),
      ).length,
      humanPending: (trace.scenarios ?? []).filter((s) => ['human', 'future'].includes(s.control))
        .length,
    },
    checks: { complete: passed, total: required.length, remaining: required.length - passed },
  }
  if (
    tasks.some(
      (t) =>
        t.complete &&
        (trace.tasks ?? []).some(
          (a) => a.id === t.id && a.scenarioIds?.some((id) => !proven.has(id)),
        ),
    )
  )
    issues.push(issue('TASK_ACCEPTANCE_GAP', 'tasks'))
  const sourceInputSha256 = sha(
    JSON.stringify({
      manifest: m,
      tasksText,
      trace,
      snapshot,
      checks,
      affectedContracts,
      previousResults,
      sourceIssues: input.sourceIssues ?? [],
    }),
  )
  return {
    manifest: m,
    stage,
    tasks,
    trace,
    checks: checkRows,
    snapshot,
    updatedAt,
    sourceInputSha256,
    issues,
    metrics,
    actualHead: input.actualHead,
    readyForImplementation: false,
    readyForArchive: false,
    nextAction:
      stage?.phase === 'INTAKE'
        ? 'Record research and resolve acceptance decisions.'
        : issues.length
          ? 'Resolve listed blockers and refresh source-bound evidence.'
          : 'Continue the approved current stage.',
    humanDecision: input.humanDecision ?? 'NONE',
    panelState: 'QUEUED',
  }
}
export function renderStatus(p) {
  const m = p.manifest,
    s = p.stage,
    k = p.metrics,
    pub = m.publication ?? {}
  return [
    `# ${safe(m.title)} — статус`,
    '',
    `UPDATED_AT_UTC: ${safe(p.updatedAt)}`,
    `PROJECTION_SOURCE_SHA256: ${p.sourceInputSha256}`,
    `POLICY_VERSION: ${safe(m.policy?.version)} / ${safe(m.policy?.sha256)}`,
    '',
    HEADINGS[0],
    '',
    `STAGE: ${safe(s?.id)} | PHASE: ${safe(s?.phase)} | HEALTH: ${safe(s?.health)}`,
    `NEXT_PERMITTED_ACTION: ${safe(p.nextAction)}`,
    `HUMAN_DECISION: ${safe(p.humanDecision)}`,
    'READY_FOR_IMPLEMENTATION: NO | current PRE and checkpoint proof required',
    'READY_FOR_ARCHIVE: NO | current checks, Verify, POST and publication proof required',
    '',
    HEADINGS[1],
    '',
    '| Direction / change | Branch / worktree / Git common | Original origin | Approved checkpoint | Scope / exclusions / rules |',
    '|---|---|---|---|---|',
    row(
      `${m.id} / ${s?.change}`,
      `${m.owner?.branch}; ${m.owner?.worktree}; ${m.owner?.gitCommon}`,
      m.originalBaseline,
      m.checkpoint?.sha ?? 'NOT_RUN',
      `${(m.scope?.allowed ?? []).join(', ')}; frozen ${(m.scope?.frozen ?? []).join(', ')}`,
    ),
    '',
    HEADINGS[2],
    '',
    '| Stage | Goal / OpenSpec change | Dependencies | Phase / health | PRE / Verify / POST / archive |',
    '|---|---|---|---|---|',
    ...(m.stages ?? []).map((v) =>
      row(
        v.id,
        v.change,
        v.dependencies?.join(', ') || 'NONE',
        `${v.phase} / ${v.health}`,
        'NOT_VERIFIED',
      ),
    ),
    '',
    HEADINGS[3],
    '',
    '| Task / type | Required ordered steps | Acceptance | Status | Source-bound evidence |',
    '|---|---|---|---|---|',
    ...p.tasks.map((t) => {
      const record = s?.tasks?.find((v) => v.id === t.id)
      return row(
        `${t.id} / ${record?.type ?? 'UNRESOLVED'}`,
        Array.isArray(record?.steps) && record.steps.length
          ? record.steps.map((step, index) => `${index + 1}. ${step}`).join('; ')
          : 'NOT_RECORDED',
        record?.acceptance ?? 'NOT_RECORDED',
        t.complete ? 'ADMIN_COMPLETE' : 'OPEN',
        'NOT_VERIFIED unless listed below',
      )
    }),
    `TASKS_COMPLETE/TOTAL/REMAINING: ${k.tasks.complete}/${k.tasks.total}/${k.tasks.remaining}`,
    `REQUIREMENTS_ACCEPTED/TOTAL/UNCOVERED: ${k.requirements.accepted}/${k.requirements.total}/${k.requirements.uncovered}`,
    '',
    HEADINGS[4],
    '',
    '| Check / contract | Applicability + reason | Result | Command / run / source / environment | Limit / actual / gaps |',
    '|---|---|---|---|---|',
    ...p.checks.map((c) =>
      row(
        `${c.id} / ${c.contract}`,
        `${c.applicability}; ${c.reason ?? 'NONE'}`,
        c.status === 'PASS' && !c.proof ? 'NOT_VERIFIED' : c.status,
        `${c.command ?? 'NOT_RUN'}; ${c.run?.artifact?.path ?? 'NOT_RUN'}`,
        `NO_VERIFIED_LIMIT / ${c.actual ?? 'NOT_MEASURED'}`,
      ),
    ),
    `CHECKS_COMPLETE/TOTAL/REMAINING: ${k.checks.complete}/${k.checks.total}/${k.checks.remaining}`,
    `SCENARIOS_EXECUTED/TOTAL: ${k.scenarios.executed}/${k.scenarios.total}`,
    `NEGATIVE_EXECUTED: ${k.scenarios.negativeExecuted}; BOUNDARY_EXECUTED: ${k.scenarios.boundaryExecuted}; HUMAN_PENDING: ${k.scenarios.humanPending}`,
    `INVARIANT_FAILURES / STALE_EVIDENCE: ${p.issues.filter((x) => /FAIL|INVARIANT/.test(x.code)).length} / ${p.issues.filter((x) => /RUN_NOT_VERIFIED|SNAPSHOT/.test(x.code)).length}`,
    `REGRESSION_STATE: ${safe(m.regressionState ?? 'NOT_RUN')}`,
    ...p.issues.map((x) => `GAP: ${safe(x.code)} ${safe(x.path)}`),
    '',
    HEADINGS[5],
    '',
    '| Stage / task / role | Approved exact pair | Authority path/hash/excerpt | Invoked pair/runtime | Actual backend/effort | Override |',
    '|---|---|---|---|---|',
    ...(s?.roleAssignments?.length ? s.roleAssignments : [{ role: 'UNASSIGNED' }]).map((r) =>
      row(
        `${s.id} / ${r.role}`,
        r.model && r.effort ? `DECLARED_NOT_VERIFIED ${r.model} / ${r.effort}` : 'BLOCKED',
        `${r.source?.path ?? r.sourcePath ?? 'NOT_RUN'} / ${r.source?.sha256 ?? r.sourceSha256 ?? 'NOT_RUN'} / ${r.source?.excerpt ?? r.excerpt ?? 'NOT_RUN'}`,
        r.invoked ?? 'NOT_RUN',
        'NOT_CONFIRMED',
        r.override ?? 'NONE',
      ),
    ),
    '',
    HEADINGS[6],
    '',
    '| ID | Consumer owner / affected scope | State / age | Evidence / fix attempts / RCA | Required decision / next action |',
    '|---|---|---|---|---|',
    ...(m.blockers?.length ? m.blockers : [{ id: 'NONE', state: 'NONE' }]).map((b) =>
      row(
        b.id,
        b.owner ?? m.id,
        `${b.state}; ${age(p.updatedAt, b.openedAt)}`,
        `${b.evidence ?? 'NOT_RUN'}; attempts ${b.failedFixes ?? 0}; ${b.rca ?? 'NONE'}`,
        b.nextAction ?? 'NONE',
      ),
    ),
    '',
    HEADINGS[7],
    '',
    `SOURCE_CHECKPOINT_SHA: ${safe(p.actualHead ?? 'NONE')}`,
    'COMMIT_STATE: NOT_VERIFIED',
    `AUTHORIZED_REMOTE_REF: ${safe(pub.remote ?? 'BLOCKED')} ${safe(pub.ref ?? 'BLOCKED')}`,
    'PUSH_STATE: NOT_VERIFIED',
    'VERIFIED_REMOTE_SHA: NOT_VERIFIED',
    `CURRENT_EVIDENCE: ${
      (p.trace.runs ?? [])
        .map((r) => r.artifact?.path)
        .filter(Boolean)
        .map(safe)
        .join(', ') || 'NONE'
    }`,
    'PANEL_STATE: QUEUED | display confirmation requires Codex UI controller receipt',
    'HISTORICAL_EVIDENCE: retained below boundary when present',
    '',
  ].join('\n')
}
function git(cwd, args) {
  const env = {
    ...process.env,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
    GIT_OPTIONAL_LOCKS: '0',
  }
  const r = spawnSync(
    'git',
    [
      '-c',
      'core.autocrlf=false',
      '-c',
      'core.longpaths=true',
      '-c',
      'core.hooksPath=/dev/null',
      '-c',
      'core.fsmonitor=false',
      ...args,
    ],
    { cwd, env, encoding: 'utf8' },
  )
  if (r.status !== 0) throw new Error(`GIT_${args[0]}`)
  return r.stdout.trim()
}
const same = (a, b) =>
  process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
async function targetPath(root, path) {
  let cursor = root
  for (const part of path.split('/').slice(0, -1)) {
    const entries = await readdir(cursor)
    if (
      !entries.includes(part) ||
      entries.some((entry) => entry !== part && entry.toLowerCase() === part.toLowerCase())
    )
      throw new Error('STATUS_PARENT_CASE')
    cursor = join(cursor, part)
    const s = await lstat(cursor)
    if (!s.isDirectory() || s.isSymbolicLink() || !same(await realpath(cursor), cursor))
      throw new Error('STATUS_PARENT_REPARSE')
  }
  const target = join(root, path)
  const name = path.split('/').at(-1),
    entries = await readdir(cursor)
  if (entries.some((entry) => entry !== name && entry.toLowerCase() === name.toLowerCase()))
    throw new Error('STATUS_FILE_CASE')
  try {
    const s = await lstat(target)
    if (!s.isFile() || s.isSymbolicLink() || !same(await realpath(target), target))
      throw new Error('STATUS_FILE_REPARSE')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  return target
}
async function verifyOrigin(common, m, root) {
  for (const directory of [
    join(common, 'frade-workflow'),
    join(common, 'frade-workflow', 'intents'),
  ]) {
    const stat = await lstat(directory)
    if (!stat.isDirectory() || stat.isSymbolicLink() || !same(await realpath(directory), directory))
      throw new Error('ORIGIN_PARENT_REPARSE')
  }
  const prefix = join(common, 'frade-workflow', 'intents', m.id)
  const records = []
  for (const path of [`${prefix}.json`, `${prefix}.complete.json`]) {
    const stat = await lstat(path)
    if (!stat.isFile() || stat.isSymbolicLink() || !same(await realpath(path), path))
      throw new Error('ORIGIN_PATH')
    records.push(JSON.parse(await readFile(path, 'utf8')))
  }
  const [intent, complete] = records
  if (
    JSON.stringify(intent) !== JSON.stringify(complete) ||
    intent.schemaVersion !== 2 ||
    intent.id !== m.id ||
    intent.branch !== m.owner.branch ||
    !same(intent.worktree, root) ||
    !same(intent.gitCommon, common) ||
    intent.baseline !== m.originalBaseline ||
    intent.request?.schemaVersion !== 1 ||
    intent.request.id !== m.id ||
    intent.request.baseline !== m.originalBaseline ||
    intent.request.policy?.sha256 !== m.policy.sha256 ||
    intent.request.policy?.release !== m.policy.release ||
    intent.hash !== sha(JSON.stringify(intent.request))
  )
    throw new Error('ORIGIN_MISMATCH')
}
export async function refreshStatus(input) {
  const m = input.manifest,
    valid = validateManifest(m)
  if (!valid.ok)
    return { ok: false, status: 'BLOCKED', code: 'MANIFEST_INVALID', issues: valid.issues }
  if (
    !safeRepoPath(m.statusPath) ||
    !m.scope.allowed.some((p) =>
      p.endsWith('/**') ? m.statusPath.startsWith(p.slice(0, -2)) : p === m.statusPath,
    )
  )
    return { ok: false, status: 'BLOCKED', code: 'STATUS_SCOPE' }
  const root = resolve(input.ownerRoot ?? m.owner.worktree)
  try {
    if (!same(root, resolve(m.owner.worktree)) || !same(await realpath(root), root))
      throw new Error('OWNER_PATH')
    const common = resolve(root, git(root, ['rev-parse', '--git-common-dir']))
    if (
      !same(common, resolve(m.owner.gitCommon)) ||
      git(root, ['rev-parse', '--show-toplevel']) !== root ||
      git(root, ['branch', '--show-current']) !== m.owner.branch ||
      !git(root, ['worktree', 'list', '--porcelain'])
        .split(/\r?\n/)
        .some((line) => line === `worktree ${root}`)
    )
      throw new Error('OWNER_REGISTRATION')
    const ancestor = spawnSync(
      'git',
      ['-c', 'core.autocrlf=false', 'merge-base', '--is-ancestor', m.originalBaseline, 'HEAD'],
      { cwd: root },
    )
    if (ancestor.status !== 0) throw new Error('ORIGIN_ANCESTRY')
    if (input.write) await verifyOrigin(common, m, root)
    for (const directory of [
      join(common, 'frade-workflow'),
      join(common, 'frade-workflow', 'freeze'),
    ]) {
      try {
        const s = await lstat(directory)
        if (!s.isDirectory() || s.isSymbolicLink() || !same(await realpath(directory), directory))
          throw new Error('FREEZE_PARENT_REPARSE')
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
    }
    const freeze = join(common, 'frade-workflow', 'freeze', `${m.id}.json`)
    let frozen = false
    try {
      const s = await lstat(freeze)
      frozen = true
      if (!s.isFile() || s.isSymbolicLink()) throw new Error('FREEZE_PATH')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    if (frozen && input.write) return { ok: false, status: 'FROZEN', code: 'REVIEW_FREEZE' }
    const target = await targetPath(root, m.statusPath)
    let legacy = '',
      priorHash
    try {
      const prior = await readFile(target, 'utf8')
      try {
        legacy = parseStatus(prior).legacy
        priorHash = /^PROJECTION_SOURCE_SHA256: ([a-f0-9]{64})$/m.exec(prior)?.[1]
      } catch (error) {
        if (HEADINGS.some((heading) => prior.includes(heading))) throw error
        legacy = `${LEGACY_BOUNDARY}\n${prior}`
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    const projection = await projectStatus({
      ...input,
      actualHead: git(root, ['rev-parse', 'HEAD']),
    })
    const previousProjectionStale = !!priorHash && priorHash !== projection.sourceInputSha256
    if (previousProjectionStale && !input.write)
      projection.issues.push(issue('STALE_PROJECTION', 'statusPath'))
    const body = renderStatus(projection) + (legacy ? `\n${legacy}` : '')
    if (!input.write)
      return {
        ok: true,
        status: 'PREVIEW',
        path: target,
        body,
        projection,
        previousProjectionStale,
      }
    if (frozen) return { ok: false, status: 'FROZEN', code: 'REVIEW_FREEZE' }
    await writeFile(target, body)
    return {
      ok: true,
      status: 'WRITTEN',
      path: target,
      sourceInputSha256: projection.sourceInputSha256,
      panelState: 'QUEUED',
      projection,
    }
  } catch (error) {
    return { ok: false, status: 'BLOCKED', code: error.message }
  }
}
