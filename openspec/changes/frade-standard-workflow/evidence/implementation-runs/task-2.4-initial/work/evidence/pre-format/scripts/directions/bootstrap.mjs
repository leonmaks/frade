import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { safeId, safeOwnerPath, safeRepoPath, validateManifest } from './contracts.mjs'
import { projectStatus, renderStatus } from './status.mjs'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const blocked = (code, detail) => ({ ok: false, status: 'BLOCKED', code, detail })
const object = (x) => x !== null && typeof x === 'object' && !Array.isArray(x)
const forward = (x) => x.replaceAll('\\', '/')
const trustedContexts = new WeakSet()
const oneLine = (x) =>
  typeof x === 'string' &&
  x.trim() &&
  ![...x].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
const samePath = (a, b) =>
  process.platform === 'win32' ? forward(a).toLowerCase() === forward(b).toLowerCase() : a === b
const inPath = (parent, child) =>
  samePath(parent, child) ||
  (process.platform === 'win32'
    ? forward(child)
        .toLowerCase()
        .startsWith(`${forward(parent)}/`.toLowerCase())
    : child.startsWith(`${parent}${sep}`))
const normalizeRequest = (request) => {
  if (process.platform !== 'win32' || !object(request)) return request
  const copy = { ...request }
  for (const key of ['sourceRoot', 'gitCommon', 'workspaceParent'])
    if (typeof copy[key] === 'string') copy[key] = forward(copy[key])
  return copy
}
const gitEnv = () => ({
  ...process.env,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
  GIT_OPTIONAL_LOCKS: '0',
})
const gitOptions = [
  '-c',
  'core.autocrlf=false',
  '-c',
  'core.hooksPath=/dev/null',
  '-c',
  'core.fsmonitor=false',
  '-c',
  'core.attributesFile=/dev/null',
]
function git(cwd, args, { buffer = false } = {}) {
  const run = spawnSync('git', [...gitOptions, ...args], {
    cwd,
    env: gitEnv(),
    encoding: buffer ? null : 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
  if (run.status !== 0) throw new Error(`GIT_${args[0]}: ${String(run.stderr).trim()}`)
  return buffer ? run.stdout : run.stdout.trim()
}
function gitRefExists(cwd, ref) {
  const run = spawnSync('git', [...gitOptions, 'show-ref', '--verify', '--quiet', ref], {
    cwd,
    env: gitEnv(),
    encoding: 'utf8',
  })
  if (run.status !== 0 && run.status !== 1) throw new Error(`GIT_REF: ${run.stderr.trim()}`)
  return run.status === 0
}
// The caller supplies this only from a trusted control location. The request never
// selects the release to inspect. Fixture callers use the same verified shape.
async function loadVerifiedControl(common, { fixtureStatus } = {}) {
  const canonical = forward(await realpath(common))
  if (!safeOwnerPath(canonical, { gitCommon: true })) throw new Error('CONTROL_COMMON_PATH')
  const storage = join(canonical, 'frade-workflow')
  await canonicalControlDirectory(storage)
  const pointerPath = join(storage, 'current.json')
  await canonicalControlFile(pointerPath)
  const pointer = JSON.parse(await readFile(pointerPath, 'utf8'))
  if (
    pointer.version !== 1 ||
    !samePath(pointer.common, canonical) ||
    !/^[a-f0-9]{64}$/.test(pointer.release ?? '')
  )
    throw new Error('CONTROL_POINTER')
  const releaseRoot = join(storage, 'releases', pointer.release)
  await canonicalControlDirectory(releaseRoot)
  const manifestBytes = await readFile(join(releaseRoot, 'scripts/agent-review/bundle.json'))
  if (hash(manifestBytes) !== pointer.release) throw new Error('CONTROL_RELEASE_HASH')
  const manifest = JSON.parse(manifestBytes)
  if (
    manifest.version !== 1 ||
    !samePath(manifest.common, canonical) ||
    manifest.policySha256 !== pointer.policySha256 ||
    !Array.isArray(manifest.files)
  )
    throw new Error('CONTROL_BUNDLE')
  const seen = new Set()
  for (const item of manifest.files) {
    if (
      !safeRepoPath(item.path) ||
      !/^[a-f0-9]{64}$/.test(item.sha256 ?? '') ||
      seen.has(item.path.toLowerCase())
    )
      throw new Error('CONTROL_BUNDLE_FILE')
    seen.add(item.path.toLowerCase())
    const file = await safeRelative(releaseRoot, item.path)
    if (hash(await readFile(file)) !== item.sha256) throw new Error('CONTROL_BUNDLE_DRIFT')
  }
  const publicPolicy = manifest.files.find((x) => x.path === 'docs/engineering/agent-workflow.md')
  if (
    !publicPolicy ||
    publicPolicy.sha256 !== manifest.policySha256 ||
    !seen.has('scripts/agent-review/cli.mjs')
  )
    throw new Error('CONTROL_POLICY')
  const cli = await safeRelative(releaseRoot, 'scripts/agent-review/cli.mjs')
  let status = fixtureStatus
  if (!status) {
    const run = spawnSync(process.execPath, [cli, 'status'], {
      cwd: dirname(fileURLToPath(import.meta.url)),
      encoding: 'utf8',
      env: gitEnv(),
      maxBuffer: 1024 * 1024,
    })
    if (run.status !== 0) throw new Error('CONTROL_STATUS')
    status = JSON.parse(run.stdout)
  }
  if (
    status.status !== 'AVAILABLE' ||
    status.release !== pointer.release ||
    status.policyVersion !== manifest.policyVersion ||
    !samePath(status.policy, join(releaseRoot, publicPolicy.path))
  )
    throw new Error('CONTROL_STATUS_MISMATCH')
  const context = Object.freeze({
    common: canonical,
    release: pointer.release,
    policyVersion: manifest.policyVersion,
    policySha256: manifest.policySha256,
  })
  trustedContexts.add(context)
  return context
}
async function canonicalControlDirectory(path) {
  const stat = await lstat(path)
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(await realpath(path), path))
    throw new Error('CONTROL_DIRECTORY_LINK')
}
async function canonicalControlFile(path) {
  const stat = await lstat(path)
  if (!stat.isFile() || stat.isSymbolicLink() || !samePath(await realpath(path), path))
    throw new Error('CONTROL_FILE_LINK')
}
// Explicit library seam for disposable, hash-verified fixture services.
export async function trustedBootstrapFixtureContext(common, fixtureStatus) {
  if (!object(fixtureStatus)) throw new Error('FIXTURE_STATUS_REQUIRED')
  return loadVerifiedControl(common, { fixtureStatus })
}
async function runningControl() {
  const moduleDir = dirname(fileURLToPath(import.meta.url))
  const common = forward(resolve(moduleDir, git(moduleDir, ['rev-parse', '--git-common-dir'])))
  return loadVerifiedControl(common)
}
async function controlFor(options) {
  if (trustedContexts.has(options?.trustedContext)) return options.trustedContext
  if (options?.trustedContext) throw new Error('UNTRUSTED_CONTEXT')
  try {
    return await runningControl()
  } catch {
    throw new Error('CONTROL_NOT_CONFIGURED')
  }
}
async function existing(path) {
  try {
    return await lstat(path)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}
async function exactDirectory(path, { gitCommon = false } = {}) {
  if (!safeOwnerPath(path, { gitCommon })) throw new Error('UNSAFE_OWNER_PATH')
  const stat = await lstat(path)
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(await realpath(path), path))
    throw new Error('NONCANONICAL_DIRECTORY')
  return path
}
async function canonicalParents(path) {
  let cursor = dirname(path)
  while (dirname(cursor) !== cursor) {
    const stat = await lstat(cursor)
    if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(await realpath(cursor), cursor))
      throw new Error('MANIFEST_PARENT_LINK')
    cursor = dirname(cursor)
  }
}
async function safeRelative(root, path, { absent = false } = {}) {
  if (!safeRepoPath(path)) throw new Error('UNSAFE_RELATIVE_PATH')
  let cursor = root
  const parts = path.split('/')
  for (const part of parts) {
    cursor = join(cursor, part)
    if (!inPath(root, cursor)) throw new Error('PATH_ESCAPE')
    const stat = await existing(cursor)
    if (stat?.isSymbolicLink()) throw new Error('PATH_LINK')
    if (stat && !samePath(await realpath(cursor), cursor)) throw new Error('PATH_REPARSE')
    if (!stat && !absent) throw new Error('MISSING_PATH')
  }
  return cursor
}
function parseWorktrees(output) {
  return output
    .split(/\r?\n\r?\n/)
    .filter(Boolean)
    .map((block) => {
      const lines = block.split(/\r?\n/)
      return {
        path: lines.find((x) => x.startsWith('worktree '))?.slice(9),
        branch: lines.find((x) => x.startsWith('branch '))?.slice(7),
        head: lines.find((x) => x.startsWith('HEAD '))?.slice(5),
      }
    })
}
function requestShape(r) {
  if (
    !object(r) ||
    r.schemaVersion !== 1 ||
    !safeId(r.id) ||
    Object.keys(r).some(
      (key) =>
        ![
          'schemaVersion',
          'id',
          'title',
          'goal',
          'users',
          'outcomes',
          'constraints',
          'exclusions',
          'sourceRoot',
          'gitCommon',
          'workspaceParent',
          'baseline',
          'policy',
          'publication',
        ].includes(key),
    ) ||
    !['title', 'goal'].every((k) => oneLine(r[k])) ||
    !['users', 'outcomes', 'constraints', 'exclusions'].every(
      (k) => Array.isArray(r[k]) && r[k].every(oneLine),
    ) ||
    !['sourceRoot', 'gitCommon', 'workspaceParent'].every((k) =>
      safeOwnerPath(r[k], { gitCommon: k === 'gitCommon' }),
    ) ||
    !/^[a-f0-9]{40}$/.test(r.baseline ?? '') ||
    !object(r.policy) ||
    !oneLine(r.policy.version) ||
    !/^[a-f0-9]{64}$/.test(r.policy.release ?? '') ||
    !/^[a-f0-9]{64}$/.test(r.policy.sha256 ?? '') ||
    !safeRepoPath(r.policy.artifact) ||
    !object(r.publication) ||
    !oneLine(r.publication.remote) ||
    typeof r.publication.ref !== 'string' ||
    !oneLine(r.publication.authorization)
  )
    return false
  return (
    r.publication.ref === `refs/heads/codex/${r.id}` &&
    !/\s/.test(r.publication.remote) &&
    !r.publication.remote.startsWith('-') &&
    r.publication.remote.length < 512
  )
}
const newRoot = (id) => `docs/engineering/directions/${id}`
const newChange = (id) => `openspec/changes/${id}`
const filesFor = (id) => [
  `${newRoot(id)}/direction.json`,
  `${newRoot(id)}/ROADMAP.md`,
  `${newRoot(id)}/AGENTS.md`,
  `${newRoot(id)}/DIRECTION-STATUS.md`,
  `${newRoot(id)}/INTAKE.md`,
  `${newRoot(id)}/RESEARCH.md`,
  `${newRoot(id)}/REQUIREMENTS.md`,
  `${newRoot(id)}/decisions/REGISTER.md`,
  `${newChange(id)}/proposal.md`,
  `${newChange(id)}/design.md`,
  `${newChange(id)}/tasks.md`,
  `${newChange(id)}/specs/${id}/spec.md`,
  `${newChange(id)}/evidence/shared-policy.md`,
  'AGENTS.md',
]
function directionManifest(r, target) {
  const id = r.id
  return {
    schemaVersion: 2,
    id,
    title: r.title,
    goal: r.goal,
    owner: { branch: `codex/${id}`, worktree: target, gitCommon: r.gitCommon },
    originalBaseline: r.baseline,
    policy: { ...r.policy, artifact: `${newChange(id)}/evidence/shared-policy.md` },
    scope: {
      mode: 'PLANNING',
      allowed: [`${newRoot(id)}/**`, `${newChange(id)}/**`, 'AGENTS.md'],
      planningAllowed: [`${newRoot(id)}/**`, `${newChange(id)}/**`, 'AGENTS.md'],
      frozen: [
        'packages/**',
        'apps/**',
        'pnpm-lock.yaml',
        'vendor/**',
        'docs/routing-v2/**',
        'scripts/routing-v2-architecture-gate.mjs',
        'openspec/changes/archive/**',
      ],
      foreignChanges: 'All other OpenSpec changes and owner process state are excluded',
      closure: {
        enabled: false,
        requires: [
          'humanPolicyDecision',
          'requiredChecksPASS',
          'formalVerifyPASS',
          'currentIndependentPOSTPASS',
        ],
        specDestinations: [`openspec/specs/${id}/spec.md`],
        archiveDestination: `openspec/changes/archive/<actual-archive-date>-${id}/**`,
        archiveOwner: id,
      },
    },
    statusPath: `${newRoot(id)}/DIRECTION-STATUS.md`,
    stages: [
      {
        id: 'S01',
        change: id,
        phase: 'INTAKE',
        health: 'BLOCKED',
        dependencies: [],
        roleAssignments: [],
        taskOverrides: [],
        admission: {},
      },
    ],
    publication: { ...r.publication, state: 'BLOCKED', verifiedRemoteSha: null },
    intake: {
      users: r.users,
      outcomes: r.outcomes,
      constraints: r.constraints,
      exclusions: r.exclusions,
    },
  }
}
async function seed(r, target, policyBytes, rootAgents, baselineCommittedAt) {
  const id = r.id,
    dir = newRoot(id),
    change = newChange(id)
  const manifest = directionManifest(r, target)
  const validity = validateManifest(manifest)
  if (!validity.ok) throw new Error(`MANIFEST: ${validity.issues.map((x) => x.code).join(',')}`)
  const loader = [
    '',
    `## Direction ${id}`,
    '',
    `Read ${dir}/direction.json and ${dir}/AGENTS.md for this branch.`,
    'Root and scoped rules still apply.',
    '',
  ].join('\n')
  const md = (...lines) => Buffer.from(`${lines.join('\n').trimEnd()}\n`)
  const starterStatus = renderStatus(await projectStatus({
    manifest,
    tasksText: '',
    snapshot: { sourceSha256: hash(JSON.stringify(manifest)), configSha256: r.policy.sha256 },
    updatedAt: 'NOT_RUN',
    humanDecision: 'D-001 acceptance; D-002 exact roles; D-003 numeric limits; D-004 publication',
  }))
  const data = {
    [`${dir}/direction.json`]: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
    [`${dir}/ROADMAP.md`]: md(
      `# ${r.title} roadmap`,
      '',
      '| Stage | Goal | Dependencies | Phase | Gates |',
      '|---|---|---|---|---|',
      `| S01 | ${r.goal} | None recorded | INTAKE | PRE/Verify/POST NOT_RUN |`,
      '',
      'Steps: intake → research → requirements → planning.',
      'Dependent implementation is BLOCKED until decisions and independent PRE.',
    ),
    [`${dir}/AGENTS.md`]: md(
      `# ${r.title} local rules`,
      '',
      'Read root and scoped AGENTS.md first. Work only within manifest owned paths.',
      'Preserve product, lockfile, vendor assets and other changes.',
      'Missing role assignments block dispatch. Templates approve no gates or limits.',
    ),
    [`${dir}/DIRECTION-STATUS.md`]: Buffer.from(starterStatus),
    [`${dir}/INTAKE.md`]: md(
      `# Intake — ${r.title}`,
      '',
      `Goal: ${r.goal}`,
      '',
      `Users: ${r.users.join('; ') || 'UNKNOWN'}`,
      '',
      `Expected outcomes: ${r.outcomes.join('; ') || 'UNKNOWN'}`,
      '',
      `Constraints: ${r.constraints.join('; ') || 'UNKNOWN'}`,
      '',
      `Exclusions: ${r.exclusions.join('; ') || 'UNKNOWN'}`,
      '',
      `Original committed baseline: ${r.baseline}`,
      '',
      `Publication destination: ${r.publication.remote} ${r.publication.ref}`,
      '',
      `Publication authorization: ${r.publication.authorization}`,
      '',
      'Product scope, acceptance, visual and publication decisions need authority.',
    ),
    [`${dir}/RESEARCH.md`]: md(
      `# Research — ${r.title}`,
      '',
      `Dated local source: committed baseline ${r.baseline} at ${baselineCommittedAt}.`,
      `Selected policy: ${r.policy.artifact} SHA256 ${r.policy.sha256}.`,
      '',
      'Current behavior: TO_RESEARCH. Reproducible gaps: TO_RESEARCH.',
      '',
      'Alternatives/tradeoffs: TO_RESEARCH. Risks: TO_RESEARCH.',
      '',
      'Unknowns: acceptance, numeric limits, role pairs and publication authority.',
      'Capability limits: model availability and review transport NOT_CONFIRMED.',
      'Safe source research may continue.',
    ),
    [`${dir}/REQUIREMENTS.md`]: md(
      `# Requirements — ${r.title}`,
      '',
      'Status: DRAFT_UNRESOLVED. Stable IDs, compatibility and BDD cases need decisions.',
      'No numerical budget is approved. Dependent implementation is BLOCKED.',
    ),
    [`${dir}/decisions/REGISTER.md`]: md(
      `# Decision register — ${r.title}`,
      '',
      '| ID | Decision | State | Dependent work |',
      '|---|---|---|---|',
      '| D-001 | Confirm users/outcomes and acceptance | OPEN | Requirements |',
      '| D-002 | Approve exact role pairs and source | OPEN | Dispatch |',
      '| D-003 | Approve numeric limits if applicable | OPEN | Measurement |',
      '| D-004 | Confirm publication authority | OPEN | Publication |',
    ),
    [`${change}/proposal.md`]: md(
      `# Proposal: ${r.title}`,
      '',
      '## Why',
      '',
      r.goal,
      '',
      '## What changes',
      '',
      'Research and requirements remain pending.',
      `Preserve ${r.exclusions.join('; ') || 'declared exclusions'}.`,
      '',
      '## Capabilities',
      '',
      '### New Capabilities',
      '',
      `- \`${id}\`: Bounded direction behavior with acceptance pending.`,
      '',
      '### Modified Capabilities',
      '',
      'None.',
      '',
      '## Impact',
      '',
      "Only this direction's approved scope after review.",
    ),
    [`${change}/design.md`]: md(
      `# Design: ${r.title}`,
      '',
      '## Context',
      '',
      `Baseline ${r.baseline}; policy ${r.policy.version} SHA256 ${r.policy.sha256}.`,
      '',
      '## Decisions',
      '',
      'Pending. Proposed approaches are not approved.',
      '',
      '## Risks',
      '',
      'See research and decision register.',
    ),
    [`${change}/tasks.md`]: md(
      `# Tasks: ${r.title}`,
      '',
      '- [ ] S01.1 Complete source-bound research.',
      '- [ ] S01.2 Resolve requirements and acceptance decisions.',
      '- [ ] S01.3 Validate planning and obtain independent PRE.',
      '- [ ] S01.4 Write RED, implement, check, Verify and POST before closure.',
    ),
    [`${change}/specs/${id}/spec.md`]: md(
      `# ${r.title} specification`,
      '',
      '## ADDED Requirements',
      '',
      '### Requirement: DRAFT-001 Resolve direction acceptance',
      '',
      'The direction SHALL record approved users, observable acceptance, compatibility',
      'constraints and applicable numerical limits before dependent implementation.',
      'Unresolved product acceptance SHALL keep implementation BLOCKED.',
      '',
      '#### Scenario: DRAFT-001-S01 Resolve acceptance',
      '',
      '- **WHEN** planning lacks a required acceptance decision',
      '- **THEN** dependent implementation remains BLOCKED while safe research continues.',
    ),
    [`${change}/evidence/shared-policy.md`]: policyBytes,
    'AGENTS.md': Buffer.from(`${rootAgents}${rootAgents.endsWith('\n') ? '' : '\n'}${loader}`),
  }
  return data
}
async function inspect(r, options = {}) {
  if (!requestShape(r))
    return blocked('REQUEST_SHAPE', 'Complete safe request and exact feature ref required')
  const target = forward(join(r.workspaceParent, r.id))
  if (!safeOwnerPath(target)) return blocked('TARGET_PATH', 'Unsafe target')
  try {
    const control = await controlFor(options)
    if (!samePath(control.common, r.gitCommon)) throw new Error('FOREIGN_GIT_COMMON')
    if (
      control.release !== r.policy.release ||
      control.policySha256 !== r.policy.sha256 ||
      control.policyVersion !== r.policy.version
    )
      throw new Error('POLICY_RELEASE_MISMATCH')
    await exactDirectory(r.sourceRoot)
    await exactDirectory(r.gitCommon, { gitCommon: true })
    await exactDirectory(r.workspaceParent)
    if (inPath(r.sourceRoot, r.workspaceParent) || inPath(r.gitCommon, r.workspaceParent))
      throw new Error('WORKSPACE_PARENT_INSIDE_SOURCE')
    if (!samePath(resolve(process.cwd()), r.sourceRoot)) throw new Error('SOURCE_CONTEXT')
    const top = resolve(r.sourceRoot, git(r.sourceRoot, ['rev-parse', '--show-toplevel']))
    const common = resolve(r.sourceRoot, git(r.sourceRoot, ['rev-parse', '--git-common-dir']))
    if (!samePath(top, r.sourceRoot) || !samePath(common, r.gitCommon))
      throw new Error('FOREIGN_GIT_COMMON')
    const worktrees = parseWorktrees(git(r.sourceRoot, ['worktree', 'list', '--porcelain']))
    if (worktrees.filter((w) => samePath(resolve(w.path), r.sourceRoot)).length !== 1)
      throw new Error('UNREGISTERED_SOURCE')
    if (git(r.sourceRoot, ['cat-file', '-t', r.baseline]) !== 'commit')
      throw new Error('BASELINE_NOT_COMMIT')
    const head = git(r.sourceRoot, ['rev-parse', 'HEAD'])
    if (
      spawnSync('git', [...gitOptions, 'merge-base', '--is-ancestor', r.baseline, head], {
        cwd: r.sourceRoot,
        env: gitEnv(),
        encoding: 'utf8',
      }).status !== 0
    )
      throw new Error('BASELINE_ANCESTRY')
    const baselineCommittedAt = git(r.sourceRoot, ['show', '-s', '--format=%cI', r.baseline])
    const policyAtBaseline = git(r.sourceRoot, ['show', `${r.baseline}:${r.policy.artifact}`], {
      buffer: true,
    })
    const policyPath = await safeRelative(r.sourceRoot, r.policy.artifact)
    const policyBytes = await readFile(policyPath)
    if (hash(policyAtBaseline) !== r.policy.sha256 || hash(policyBytes) !== r.policy.sha256)
      throw new Error('POLICY_DRIFT')
    const tree = git(r.sourceRoot, ['ls-tree', '-r', '--name-only', r.baseline]).split(/\r?\n/)
    for (const path of tree.filter(
      (x) => x === '.gitattributes' || x.endsWith('/.gitattributes'),
    )) {
      const attributes = git(r.sourceRoot, ['show', `${r.baseline}:${path}`], { buffer: true })
      if (/(?:^|\s)filter(?:=|\s|$)/m.test(attributes.toString('utf8')))
        throw new Error('UNSAFE_CHECKOUT_FILTER')
    }
    const infoAttributes = join(r.gitCommon, 'info', 'attributes')
    const infoStat = await existing(infoAttributes)
    if (infoStat) {
      if (
        !infoStat.isFile() ||
        infoStat.isSymbolicLink() ||
        !samePath(await realpath(infoAttributes), infoAttributes)
      )
        throw new Error('UNSAFE_INFO_ATTRIBUTES')
      if (/(?:^|\s)filter(?:=|\s|$)/m.test(await readFile(infoAttributes, 'utf8')))
        throw new Error('UNSAFE_CHECKOUT_FILTER')
    }
    const planned = filesFor(r.id)
    for (const path of planned.filter((x) => x !== 'AGENTS.md')) {
      const lower = path.toLowerCase()
      if (tree.some((x) => x.toLowerCase() === lower || lower.startsWith(`${x.toLowerCase()}/`)))
        throw new Error('BASELINE_PATH_COLLISION')
    }
    const agents = tree.includes('AGENTS.md')
      ? git(r.sourceRoot, ['show', `${r.baseline}:AGENTS.md`], { buffer: true }).toString('utf8')
      : ''
    if (agents.includes('## Direction ')) throw new Error('BASELINE_DIRECTION_LOADER')
    const targetStat = await existing(target)
    if (targetStat?.isSymbolicLink()) throw new Error('TARGET_LINK')
    if (targetStat && (!targetStat.isDirectory() || !samePath(await realpath(target), target)))
      throw new Error('TARGET_REPARSE')
    const entries = await readdir(r.workspaceParent)
    if (entries.some((x) => x.toLowerCase() === r.id.toLowerCase() && x !== r.id))
      throw new Error('TARGET_CASE_COLLISION')
    const intentHash = hash(JSON.stringify(r))
    const branch = `codex/${r.id}`
    const refs = git(r.sourceRoot, [
      'for-each-ref',
      '--format=%(refname)',
      'refs/heads/codex/',
    ]).split(/\r?\n/)
    if (
      refs.some(
        (ref) =>
          ref.toLowerCase() === `refs/heads/${branch}`.toLowerCase() &&
          ref !== `refs/heads/${branch}`,
      )
    )
      throw new Error('BRANCH_CASE_COLLISION')
    const branchExists = gitRefExists(r.sourceRoot, `refs/heads/${branch}`)
    return {
      ok: true,
      status: 'PLANNED',
      branch,
      worktree: target,
      baseline: r.baseline,
      gitCommon: r.gitCommon,
      sourceRoot: r.sourceRoot,
      workspaceParent: r.workspaceParent,
      files: planned,
      policy: r.policy,
      publication: r.publication,
      unknowns: [
        ...(!r.users.length ? ['users'] : []),
        ...(!r.outcomes.length ? ['outcomes'] : []),
        'acceptance cases',
        'numeric limits if applicable',
        'exact role assignments',
        ...(r.publication.authorization.toLowerCase().includes('pending')
          ? ['publication authorization']
          : []),
      ],
      intentHash,
      baselineCommittedAt,
      worktrees,
      targetExists: !!targetStat,
      branchExists,
      policyBytes,
      agents,
    }
  } catch (error) {
    return blocked(
      error.message === 'CONTROL_NOT_CONFIGURED' ? 'NOT_CONFIGURED' : 'INSPECTION',
      error.message,
    )
  }
}
async function intentPath(common, id) {
  const control = join(common, 'frade-workflow')
  const stat = await existing(control)
  if (!stat?.isDirectory() || stat.isSymbolicLink() || !samePath(await realpath(control), control))
    throw new Error('CONTROL_PATH')
  const intents = join(control, 'intents')
  const intentsStat = await existing(intents)
  if (
    intentsStat &&
    (!intentsStat.isDirectory() ||
      intentsStat.isSymbolicLink() ||
      !samePath(await realpath(intents), intents))
  )
    throw new Error('INTENTS_PATH')
  return join(intents, `${id}.json`)
}
async function loadIntent(path) {
  const stat = await existing(path)
  if (!stat) return null
  if (!stat.isFile() || stat.isSymbolicLink() || !samePath(await realpath(path), path))
    throw new Error('INTENT_PATH')
  return JSON.parse(await readFile(path, 'utf8'))
}
async function verifyRequestGrant(r, plan, control) {
  const path = join(control.common, 'frade-workflow/bootstrap-authority.json')
  if (!(await existing(path))) throw new Error('REQUEST_GRANT_MISSING')
  try {
    await canonicalControlFile(path)
  } catch {
    throw new Error('REQUEST_GRANT_PATH')
  }
  let grant
  try {
    grant = JSON.parse(await readFile(path, 'utf8'))
  } catch {
    throw new Error('REQUEST_GRANT_INVALID')
  }
  const keys = [
    'schemaVersion',
    'sourceRoot',
    'gitCommon',
    'workspaceParent',
    'baseline',
    'policy',
    'intentHash',
  ]
  if (
    !object(grant) ||
    Object.keys(grant).length !== keys.length ||
    Object.keys(grant).some((key) => !keys.includes(key)) ||
    grant.schemaVersion !== 1 ||
    !samePath(grant.gitCommon, control.common) ||
    !samePath(grant.sourceRoot, r.sourceRoot) ||
    !samePath(grant.workspaceParent, r.workspaceParent) ||
    grant.baseline !== r.baseline ||
    JSON.stringify(grant.policy) !== JSON.stringify(r.policy) ||
    grant.intentHash !== plan.intentHash
  )
    throw new Error('REQUEST_GRANT_MISMATCH')
}
function originRecord(r, plan) {
  return {
    schemaVersion: 2,
    id: r.id,
    hash: plan.intentHash,
    branch: plan.branch,
    worktree: plan.worktree,
    sourceRoot: r.sourceRoot,
    gitCommon: r.gitCommon,
    workspaceParent: r.workspaceParent,
    baseline: r.baseline,
    policy: r.policy,
    request: r,
  }
}
function exactOrigin(record, expected) {
  return (
    object(record) &&
    Object.keys(record).length === Object.keys(expected).length &&
    Object.keys(expected).every(
      (key) =>
        Object.hasOwn(record, key) && JSON.stringify(record[key]) === JSON.stringify(expected[key]),
    )
  )
}
async function checkedOrigin(common, id, owner, manifest, control) {
  const journal = await intentPath(common, id)
  const retained = await loadIntent(journal)
  const completion = await loadIntent(journal.replace(/\.json$/, '.complete.json'))
  if (!retained || !completion) throw new Error('ORIGIN_MISSING_LEGACY_ADOPTION_REQUIRED')
  if (
    retained.baseline !== manifest.originalBaseline ||
    completion.baseline !== manifest.originalBaseline
  )
    throw new Error('ORIGIN_BASELINE_MISMATCH')
  const r = retained.request
  if (
    !requestShape(r) ||
    r.id !== id ||
    !samePath(r.gitCommon, common) ||
    !samePath(r.workspaceParent, dirname(owner)) ||
    r.baseline !== manifest.originalBaseline ||
    r.policy.release !== control.release ||
    r.policy.sha256 !== control.policySha256 ||
    r.policy.version !== control.policyVersion ||
    manifest.policy.artifact !== `${newChange(id)}/evidence/shared-policy.md`
  )
    throw new Error('ORIGIN_MISMATCH')
  const hashValue = hash(JSON.stringify(r))
  if (
    !/^[a-f0-9]{64}$/.test(retained.hash ?? '') ||
    !samePath(owner, join(r.workspaceParent, id)) ||
    !exactOrigin(
      retained,
      originRecord(r, { intentHash: hashValue, branch: `codex/${id}`, worktree: owner }),
    ) ||
    !exactOrigin(completion, retained)
  )
    throw new Error('ORIGIN_MISMATCH')
}
async function verifyOwner(r, plan, { allowProgress = false } = {}) {
  const registered = plan.worktrees.filter((w) => samePath(w.path, plan.worktree))
  if (
    registered.length !== 1 ||
    registered[0].branch !== `refs/heads/${plan.branch}` ||
    !plan.branchExists
  )
    throw new Error('FOREIGN_OWNER')
  const common = resolve(plan.worktree, git(plan.worktree, ['rev-parse', '--git-common-dir']))
  if (!samePath(common, r.gitCommon)) throw new Error('FOREIGN_GIT_COMMON')
  const head = git(plan.worktree, ['rev-parse', 'HEAD'])
  if (head !== r.baseline) {
    if (!allowProgress) throw new Error('BASELINE_MOVED')
    const probe = spawnSync(
      'git',
      [...gitOptions, 'merge-base', '--is-ancestor', r.baseline, head],
      { cwd: plan.worktree, env: gitEnv(), encoding: 'utf8' },
    )
    if (probe.status !== 0) throw new Error('BASELINE_ANCESTRY')
  }
}
async function ensureParents(root, path) {
  let cursor = root
  for (const part of path.split('/').slice(0, -1)) {
    cursor = join(cursor, part)
    const stat = await existing(cursor)
    if (stat) {
      if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(await realpath(cursor), cursor))
        throw new Error('SEED_PARENT_COLLISION')
    } else await mkdir(cursor)
  }
}
async function writeSeed(root, data, baselineAgents) {
  for (const [path, bytes] of Object.entries(data)) {
    await ensureParents(root, path)
    const file = await safeRelative(root, path, { absent: true })
    const stat = await existing(file)
    if (path === 'AGENTS.md' && stat) {
      const current = await readFile(file)
      if (current.equals(bytes)) continue
      if (current.toString('utf8') !== baselineAgents) throw new Error('ROOT_RULE_COLLISION')
      await writeFile(file, bytes)
    } else if (stat) {
      if (!stat.isFile() || !(await readFile(file)).equals(bytes)) throw new Error('SEED_COLLISION')
    } else await writeFile(file, bytes, { flag: 'wx' })
  }
}
export async function planDirection(request, options = {}) {
  request = normalizeRequest(request)
  const plan = await inspect(request, options)
  if (!plan.ok) return plan
  const publicPlan = { ...plan }
  for (const key of ['policyBytes', 'agents', 'worktrees', 'targetExists', 'branchExists'])
    delete publicPlan[key]
  const { worktrees, targetExists, branchExists } = plan
  return {
    ...publicPlan,
    intentPath: forward(join(plan.gitCommon, 'frade-workflow', 'intents', `${request.id}.json`)),
    authorityPath: forward(join(plan.gitCommon, 'frade-workflow', 'bootstrap-authority.json')),
    registeredOwner: worktrees.find((w) => samePath(w.path, plan.worktree)) ?? null,
    collision: branchExists || targetExists,
  }
}
export async function createDirection(request, options = {}) {
  request = normalizeRequest(request)
  const plan = await inspect(request, options)
  if (!plan.ok) return plan
  const r = request
  try {
    await verifyRequestGrant(r, plan, await controlFor(options))
    const journal = await intentPath(r.gitCommon, r.id)
    const retained = await loadIntent(journal)
    const completion = await loadIntent(journal.replace(/\.json$/, '.complete.json'))
    const origin = originRecord(r, plan)
    if (completion && (!retained || !exactOrigin(completion, origin)))
      throw new Error('COMPLETION_COLLISION')
    if (retained && !exactOrigin(retained, origin)) throw new Error('INTENT_COLLISION')
    if (!retained && (plan.branchExists || plan.targetExists)) throw new Error('FOREIGN_COLLISION')
    if (
      retained &&
      plan.targetExists &&
      !plan.worktrees.some((w) => samePath(w.path, plan.worktree))
    )
      throw new Error('UNREGISTERED_TARGET')
    if (
      retained &&
      plan.branchExists &&
      !plan.targetExists &&
      git(r.sourceRoot, ['rev-parse', `refs/heads/${plan.branch}`]) !== r.baseline
    )
      throw new Error('FOREIGN_BRANCH')
    if (completion) {
      await verifyOwner(r, plan, { allowProgress: true })
      return {
        ok: true,
        status: 'CREATED',
        branch: plan.branch,
        worktree: plan.worktree,
        baseline: r.baseline,
        intentHash: plan.intentHash,
        reused: true,
        recovered: false,
        files: filesFor(r.id),
      }
    }
    if (!retained) {
      await mkdir(dirname(journal), { recursive: true })
      await writeFile(journal, `${JSON.stringify(origin)}\n`, { flag: 'wx' })
    }
    if (!plan.targetExists) {
      if (plan.branchExists) git(r.sourceRoot, ['worktree', 'add', plan.worktree, plan.branch])
      else git(r.sourceRoot, ['worktree', 'add', '-b', plan.branch, plan.worktree, r.baseline])
    }
    if (process.env.FRADE_BOOTSTRAP_FAULT === 'after-worktree')
      throw new Error('INJECTED_AFTER_WORKTREE')
    const after = await inspect(r, options)
    if (!after.ok) throw new Error(after.detail)
    await verifyOwner(r, after)
    const data = await seed(r, plan.worktree, plan.policyBytes, plan.agents, plan.baselineCommittedAt)
    await writeSeed(plan.worktree, data, plan.agents)
    if (!completion)
      await writeFile(journal.replace(/\.json$/, '.complete.json'), `${JSON.stringify(origin)}\n`, {
        flag: 'wx',
      })
    return {
      ok: true,
      status: 'CREATED',
      branch: plan.branch,
      worktree: plan.worktree,
      baseline: r.baseline,
      intentHash: plan.intentHash,
      reused: !!completion,
      recovered: !!retained && !completion,
      files: Object.keys(data),
    }
  } catch (error) {
    return blocked('CREATE', error.message)
  }
}
export async function checkDirection(manifestPath, options = {}) {
  if (process.platform === 'win32' && typeof manifestPath === 'string')
    manifestPath = forward(manifestPath)
  if (typeof manifestPath !== 'string' || !isAbsolute(manifestPath) || !safeOwnerPath(manifestPath))
    return blocked('MANIFEST_PATH', 'Absolute manifest path required')
  try {
    const control = await controlFor(options)
    const worktrees = parseWorktrees(git(control.common, ['worktree', 'list', '--porcelain']))
    const owned = worktrees
      .map((w) => {
        if (!safeOwnerPath(w.path)) return null
        const path = forward(relative(w.path, manifestPath))
        const match = /^docs\/engineering\/directions\/([^/]+)\/direction\.json$/.exec(path)
        if (
          !match ||
          !safeId(match[1]) ||
          !samePath(resolve(manifestPath), join(w.path, newRoot(match[1]), 'direction.json')) ||
          w.branch !== `refs/heads/codex/${match[1]}`
        )
          return null
        return { worktree: w.path, id: match[1] }
      })
      .filter(Boolean)
    if (owned.length !== 1) throw new Error('MANIFEST_OWNER_PATH')
    await canonicalParents(manifestPath)
    await exactDirectory(owned[0].worktree)
    await safeRelative(owned[0].worktree, `${newRoot(owned[0].id)}/direction.json`)
    const stat = await lstat(manifestPath)
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('MANIFEST_LINK')
    const m = JSON.parse(await readFile(manifestPath, 'utf8'))
    const validated = validateManifest(m)
    if (!validated.ok) return blocked('MANIFEST_INVALID', validated.issues)
    if (m.id !== owned[0].id || !samePath(m.owner.worktree, owned[0].worktree))
      throw new Error('MANIFEST_OWNER_PATH')
    if (
      !samePath(control.common, m.owner.gitCommon) ||
      control.release !== m.policy.release ||
      control.policySha256 !== m.policy.sha256 ||
      control.policyVersion !== m.policy.version
    )
      throw new Error('CONTROL_MISMATCH')
    const expected = join(m.owner.worktree, newRoot(m.id), 'direction.json')
    if (!samePath(resolve(manifestPath), expected)) throw new Error('MANIFEST_OWNER_PATH')
    await exactDirectory(m.owner.worktree)
    await safeRelative(m.owner.worktree, `${newRoot(m.id)}/direction.json`)
    const common = resolve(
      m.owner.worktree,
      git(m.owner.worktree, ['rev-parse', '--git-common-dir']),
    )
    const registered = parseWorktrees(git(m.owner.worktree, ['worktree', 'list', '--porcelain']))
    if (
      !samePath(common, m.owner.gitCommon) ||
      git(m.owner.worktree, ['branch', '--show-current']) !== m.owner.branch ||
      registered.filter(
        (w) => samePath(w.path, m.owner.worktree) && w.branch === `refs/heads/${m.owner.branch}`,
      ).length !== 1
    )
      throw new Error('OWNER_MISMATCH')
    if (git(m.owner.worktree, ['cat-file', '-t', m.originalBaseline]) !== 'commit')
      throw new Error('BASELINE_NOT_COMMIT')
    const head = git(m.owner.worktree, ['rev-parse', 'HEAD'])
    if (
      spawnSync('git', [...gitOptions, 'merge-base', '--is-ancestor', m.originalBaseline, head], {
        cwd: m.owner.worktree,
        env: gitEnv(),
        encoding: 'utf8',
      }).status !== 0
    )
      throw new Error('BASELINE_ANCESTRY')
    await checkedOrigin(control.common, m.id, owned[0].worktree, m, control)
    const policyBytes = await readFile(await safeRelative(m.owner.worktree, m.policy.artifact))
    if (hash(policyBytes) !== m.policy.sha256) throw new Error('POLICY_DRIFT')
    return { ok: true, status: 'VALID', id: m.id, owner: m.owner, baseline: m.originalBaseline }
  } catch (error) {
    return blocked(
      error.message === 'CONTROL_NOT_CONFIGURED' ? 'NOT_CONFIGURED' : 'CHECK',
      error.message,
    )
  }
}
