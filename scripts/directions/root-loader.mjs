import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathMatches, safeRepoPath, validateManifest } from './contracts.mjs'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const norm = (path) => path.replaceAll('\\', '/')
const equal = (a, b) =>
  process.platform === 'win32' ? norm(a).toLowerCase() === norm(b).toLowerCase() : a === b
const inside = (root, path) =>
  equal(root, path) ||
  (process.platform === 'win32'
    ? norm(path)
        .toLowerCase()
        .startsWith(`${norm(root).toLowerCase()}/`)
    : path.startsWith(`${root}${sep}`))
const fail = (code, detail) => ({ ok: false, status: 'BLOCKED', code, detail })
const W01 = {
  baseline: '98f387f96b51b0ad139e3507c376ff1c3e8dec09',
  checkpoint: '9c974da812e7f120cace9defcdca69dd6154254b',
  release: 'a3ac63b52187e1f45f08b6d0beffcd67425c491d8ae1ac5d0d0efd3832e73fd0',
  policy: '6c6cf78fccfc4dac9e53c859715850db127f897e7eb79aa94957134bd1c1ffeb',
  common: process.platform === 'win32' ? 'E:/dev/codex/frade/.git' : '/mnt/e/dev/codex/frade/.git',
  allowed: new Set([
    'AGENTS.md',
    'package.json',
    '.github/workflows/ci.yml',
    'scripts/directions/**',
    'tests/directions/**',
    'docs/engineering/**',
    'openspec/changes/frade-standard-workflow/**',
  ]),
  frozen: new Set([
    'packages/**',
    'apps/**',
    'pnpm-lock.yaml',
    'scripts/routing-v2-architecture-gate.mjs',
    'docs/routing-v2/**',
    'vendor/**',
    'openspec/changes/bundle-integration-flow-management/**',
    'openspec/changes/frade-draw-document-roundtrip/**',
    'openspec/changes/frade-electron-runtime/**',
    'openspec/changes/frade-ka-workbench-pilot/**',
    'openspec/changes/frade-metamodel-compiler/**',
    'openspec/changes/frade-metamodel-domain/**',
    'openspec/changes/frade-repo-core/**',
    'openspec/changes/frade-repository-diagrams/**',
    'openspec/changes/routing-v2-04-orthogonal-router/**',
  ]),
  roles: new Map([
    ['planning-architecture', 'gpt-6-astra/high'],
    ['tooling-tests', 'gpt-6-sol/high'],
    ['formal-Verify', 'gpt-6-astra/high'],
    ['independent-PRE', 'gpt-6-astra/xhigh'],
    ['independent-POST', 'gpt-6-astra/xhigh'],
  ]),
}
const ROOT17_SHA256 = '5cf0b48fd99285c92da9f550374adbbb1d941531324e0f52357bf384165ef686'
const W01_RULE_SHA256 = '7222f96b4cd184f915339b96e13d58d7a3b042743aebf0dd6fdc6f048ae64536'
const canonicalNewlines = (bytes) => Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'))
const GIT_NO_FSMONITOR = ['-c', 'core.fsmonitor=false', '-c', 'core.useBuiltinFSMonitor=false']

function git(cwd, ...args) {
  const run = spawnSync('git', ['-c', 'core.autocrlf=false', ...GIT_NO_FSMONITOR, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  })
  if (run.error || run.signal || run.status !== 0)
    throw new Error(
      `GIT:${args.join(' ')}:status=${run.status}:signal=${run.signal}:error=${run.error?.code ?? 'none'}:${run.stderr?.trim() ?? ''}`,
    )
  return run.stdout.trim()
}
function safeExistingPath(root, path) {
  const parts = relative(root, path).split(sep)
  let current = root
  for (const part of parts) {
    current = join(current, part)
    let stat
    try {
      stat = lstatSync(current)
    } catch (error) {
      if (error.code === 'ENOENT') break
      throw error
    }
    if (stat.isSymbolicLink()) throw new Error('LINK_PATH')
    if (!inside(root, realpathSync(current))) throw new Error('FOREIGN_REALPATH')
  }
}
function gitSuccess(cwd, args) {
  const run = spawnSync('git', [...GIT_NO_FSMONITOR, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  })
  if (run.error || run.signal || run.status !== 0)
    throw new Error(
      `GIT:${args.join(' ')}:status=${run.status}:signal=${run.signal}:error=${run.error?.code ?? 'none'}:${run.stderr?.trim() ?? ''}`,
    )
}
function trackedUnchanged(root, rel) {
  const diff = spawnSync(
    'git',
    [...GIT_NO_FSMONITOR, 'diff', '--no-ext-diff', '--quiet', 'HEAD', '--', rel],
    {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    },
  )
  if (diff.error || diff.signal || ![0, 1].includes(diff.status))
    throw new Error(
      `GIT_RULE_DIFF:${rel}:status=${diff.status}:signal=${diff.signal}:error=${diff.error?.code ?? 'none'}`,
    )
  return diff.status === 0
}
function contract(root, rel, { required = true, pinnedHash } = {}) {
  const path = join(root, rel)
  let stat
  try {
    stat = lstatSync(path)
  } catch (error) {
    if (error.code === 'ENOENT' && !required) return null
    if (error.code === 'ENOENT') throw new Error(`MISSING_CONTRACT:${rel}`)
    throw error
  }
  safeExistingPath(root, path)
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`INVALID_CONTRACT:${rel}`)
  const bytes = readFileSync(path)
  if (pinnedHash && hash(canonicalNewlines(bytes)) !== pinnedHash)
    throw new Error(`RULE_DRIFT:${rel}`)
  const tracked = git(root, 'ls-files', '--', rel).split('\n').includes(rel)
  if (!tracked && !pinnedHash) throw new Error(`UNTRACKED_RULE:${rel}`)
  if (tracked && !pinnedHash && !trackedUnchanged(root, rel)) throw new Error(`RULE_DRIFT:${rel}`)
  return { path: rel, sha256: hash(bytes), text: bytes.toString('utf8') }
}
function rootContract(root) {
  const rel = 'AGENTS.md'
  const path = join(root, rel)
  safeExistingPath(root, path)
  const bytes = readFileSync(path)
  const canonical = canonicalNewlines(bytes)
  const marker = Buffer.from('\n\n## 18. Direction Control')
  const index = canonical.indexOf(marker)
  const original = index < 0 ? canonical : canonical.subarray(0, index + 1)
  if (hash(original) !== ROOT17_SHA256) throw new Error('ROOT17_DRIFT')
  for (let n = 1; n <= 17; n++)
    if (!new RegExp(`^## ${n}\\. `, 'm').test(original.toString('utf8')))
      throw new Error('ROOT17_SECTION')
  return { path: rel, sha256: hash(bytes), text: bytes.toString('utf8') }
}
function owningManifest(root, branch, common) {
  if (!branch.startsWith('codex/')) throw new Error('OWNER_BRANCH')
  const id = branch.slice(6)
  const rel = `docs/engineering/directions/${id}/direction.json`
  const path = join(root, rel)
  if (!existsSync(path)) throw new Error('MISSING_MANIFEST')
  safeExistingPath(root, path)
  if (!lstatSync(path).isFile()) throw new Error('MANIFEST_FILE')
  if (!git(root, 'ls-files', '--', rel).split('\n').includes(rel))
    throw new Error('MANIFEST_UNTRACKED')
  const m = JSON.parse(readFileSync(path, 'utf8'))
  const checked = validateManifest(m)
  if (!checked.ok)
    throw new Error(`MANIFEST_INVALID:${checked.issues.map((x) => x.code).join(',')}`)
  if (
    m.id !== id ||
    m.owner.branch !== branch ||
    !equal(resolve(m.owner.worktree), root) ||
    !equal(resolve(m.owner.gitCommon), common)
  )
    throw new Error('MANIFEST_OWNER')
  if (m.id === 'frade-standard-workflow') {
    if (
      !equal(common, W01.common) ||
      m.originalBaseline !== W01.baseline ||
      m.approvedCheckpoint !== W01.checkpoint ||
      m.policy.release !== W01.release ||
      m.policy.sha256 !== W01.policy ||
      m.policy.artifact !==
        'openspec/changes/frade-standard-workflow/evidence/shared-policy/agent-workflow.md'
    )
      throw new Error('W01_AUTHORITY_DRIFT')
    if (m.scope.allowed.some((x) => !W01.allowed.has(x))) throw new Error('W01_SCOPE_EXPANSION')
    if (m.scope.frozen.length !== W01.frozen.size || m.scope.frozen.some((x) => !W01.frozen.has(x)))
      throw new Error('W01_FROZEN_DRIFT')
    if (
      !['IMPLEMENTATION', 'CLOSURE'].includes(m.scope.mode) ||
      m.scope.planningAllowed.length !== 2 ||
      !m.scope.planningAllowed.includes('openspec/changes/frade-standard-workflow/**') ||
      !m.scope.planningAllowed.includes('docs/engineering/BRANCH-STATUS.md')
    )
      throw new Error('W01_PHASE_SCOPE_DRIFT')
    const stage = m.stages.find((x) => x.id === 'W01')
    if (
      m.stages.length !== 1 ||
      stage?.change !== m.id ||
      stage.roleAssignments?.length !== W01.roles.size ||
      stage.roleAssignments.some((x) => W01.roles.get(x.role) !== `${x.model}/${x.effort}`) ||
      stage.roleAuthority?.hash !==
        '501168ced50a35e128a0fc86e79bab6ac9aa31cd343eca3eedac56f81570978a' ||
      stage.taskOverrides?.length !== 0
    )
      throw new Error('W01_ROLE_DRIFT')
  } else {
    if (!trackedUnchanged(root, rel)) throw new Error('MANIFEST_DRIFT')
  }
  if (git(root, 'cat-file', '-t', m.originalBaseline) !== 'commit')
    throw new Error('BASELINE_NOT_COMMIT')
  gitSuccess(root, ['merge-base', '--is-ancestor', m.originalBaseline, 'HEAD'])
  return { m, rel }
}

export function loadDirectionRules({ root, target, manifestPath } = {}) {
  try {
    if (!isAbsolute(root ?? '') || !isAbsolute(target ?? ''))
      throw new Error('ABSOLUTE_PATHS_REQUIRED')
    root = resolve(root)
    target = resolve(target)
    if (!inside(root, target) || equal(root, target)) throw new Error('FOREIGN_TARGET')
    if (!equal(git(root, 'rev-parse', '--show-toplevel'), root)) throw new Error('FOREIGN_ROOT')
    const common = resolve(root, git(root, 'rev-parse', '--git-common-dir'))
    const branch = git(root, 'branch', '--show-current')
    const registered = git(root, 'worktree', 'list', '--porcelain')
      .split('\n\n')
      .filter(
        (block) =>
          block
            .split('\n')
            .some((x) => x.startsWith('worktree ') && equal(resolve(x.slice(9)), root)) &&
          block.split('\n').some((x) => x === `branch refs/heads/${branch}`),
      )
    if (registered.length !== 1) throw new Error('UNREGISTERED_OWNER')
    const { m, rel: manifestRel } = owningManifest(root, branch, common)
    const deployment =
      m.id === 'frade-standard-workflow'
        ? m.scope.closure.enabled
          ? 'CLOSURE_ADMISSION_NOT_EVALUATED'
          : 'NOT_DEPLOYED_W01_CLOSURE_PENDING'
        : 'ADOPTION_NOT_CONFIRMED'
    if (manifestPath && !equal(resolve(manifestPath), join(root, manifestRel)))
      throw new Error('FOREIGN_MANIFEST')
    const targetRel = norm(relative(root, target))
    if (!safeRepoPath(targetRel)) throw new Error('UNSAFE_TARGET')
    const lowerTarget = targetRel.toLowerCase()
    if (
      lowerTarget.startsWith('docs/engineering/directions/') &&
      !lowerTarget.startsWith(`docs/engineering/directions/${m.id}/`)
    )
      throw new Error('FOREIGN_DIRECTION')
    if (
      lowerTarget.startsWith('openspec/changes/') &&
      !lowerTarget.startsWith(`openspec/changes/${m.id}/`)
    )
      throw new Error('FOREIGN_DIRECTION')
    safeExistingPath(root, target)
    const contracts = [rootContract(root)]
    const ruleRel = `docs/engineering/directions/${m.id}/AGENTS.md`
    contracts.push(
      contract(root, ruleRel, {
        pinnedHash: m.id === 'frade-standard-workflow' ? W01_RULE_SHA256 : undefined,
      }),
    )
    const parts = targetRel.split('/')
    for (let i = 1; i < parts.length; i++) {
      const rel = `${parts.slice(0, i).join('/')}/AGENTS.md`
      if (rel !== ruleRel) {
        const found = contract(root, rel, { required: false })
        if (found) contracts.push(found)
      }
    }
    if (
      m.scope.frozen.some((p) => pathMatches(p, targetRel)) ||
      !m.scope.allowed.some((p) => pathMatches(p, targetRel))
    )
      return {
        ...fail('RULE_SELECTION', 'OUTSIDE_OWNER_SCOPE'),
        owner: m.id,
        target: targetRel,
        contracts,
        deployment,
        mutationAuthorized: false,
      }
    return {
      ok: true,
      status: 'RULES_SELECTED',
      owner: m.id,
      scope:
        m.scope.mode === 'IMPLEMENTATION' ? 'PATH_IN_IMPLEMENTATION_SCOPE' : 'PATH_IN_OWNER_SCOPE',
      deployment,
      target: targetRel,
      contracts,
      semanticEquivalence: 'NOT_CLAIMED',
      mutationAuthorized: false,
    }
  } catch (error) {
    return fail('RULE_SELECTION', error.message)
  }
}

const invoked = process.argv[1] && equal(resolve(process.argv[1]), fileURLToPath(import.meta.url))
if (invoked) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  let result
  try {
    const common = resolve(root, git(root, 'rev-parse', '--git-common-dir'))
    result = equal(common, W01.common)
      ? loadDirectionRules({ root, target: process.argv[2] })
      : fail('PUBLIC_COMMON', 'FOREIGN_PUBLIC_COMMON')
  } catch (error) {
    result = fail('PUBLIC_COMMON', error.message)
  }
  process.stdout.write(`${JSON.stringify(result)}\n`)
  if (!result.ok) process.exitCode = 2
}
