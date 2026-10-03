import { createHash, randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, readFile, realpath, lstat, readdir, writeFile, rm } from 'node:fs/promises'
import { join, resolve, relative, isAbsolute, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { safeRepoPath, pathMatches, validateManifest } from './contracts.mjs'
import { createArtifactReader } from './evidence.mjs'
import { createRoleAuthority, resolveRole } from './roles.mjs'

const exec = promisify(execFile)
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const blocked = (code, detail = '') => ({ ok: false, status: 'BLOCKED', code, detail })
const W01 = 'frade-standard-workflow'
const PRODUCTION_COMMON = 'E:/dev/codex/frade/.git'
const DESIGN = `openspec/changes/${W01}/design.md`
const DECISIONS = `openspec/changes/${W01}/evidence/user-decisions.json`
const D03 = `openspec/changes/${W01}/evidence/policy-acceptance.json`
const POLICY_PATH = `openspec/changes/${W01}/evidence/shared-policy/agent-workflow.md`
const PROPOSAL = `openspec/changes/${W01}/proposal.md`
const TASKS = `openspec/changes/${W01}/tasks.md`
const SPECS = [
  `openspec/changes/${W01}/specs/engineering-direction-lifecycle/spec.md`,
  `openspec/changes/${W01}/specs/engineering-role-dispatch/spec.md`,
  `openspec/changes/${W01}/specs/engineering-progress-publication/spec.md`,
]
const DESIGN_SHA = '501168ced50a35e128a0fc86e79bab6ac9aa31cd343eca3eedac56f81570978a'
const DECISIONS_SHA = '126589d990e2e44b04efe8825b5ec4d90582205ba6c729375528c383ccbaf186'
const D03_SHA = '98511f4a32f358b668809fa2e910d090b56617b5c05da1f332ac3517d2ff3239'
const POLICY_SHA = '6c6cf78fccfc4dac9e53c859715850db127f897e7eb79aa94957134bd1c1ffeb'
const RELEASE = 'a3ac63b52187e1f45f08b6d0beffcd67425c491d8ae1ac5d0d0efd3832e73fd0'
const MAX_PACKET = 16 * 1024 * 1024
const RUNTIME =
  '/mnt/c/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z/linux-runtime'
const W01_ALLOWED = new Set([
  'AGENTS.md',
  'package.json',
  '.github/workflows/**',
  'docs/engineering/**',
  `openspec/changes/${W01}/**`,
  'scripts/directions/**',
  'tests/directions/**',
])
const fixtureTransports = new WeakMap()
const samePath = (a, b) => {
  const x = resolve(a).replaceAll('\\', '/')
  const y = resolve(b).replaceAll('\\', '/')
  return process.platform === 'win32' ? x.toLowerCase() === y.toLowerCase() : x === y
}
async function safeDirectory(path) {
  const stat = await lstat(path)
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(await realpath(path), path))
    throw Error('REVIEW_COMMON_REPARSE')
}
const gitEnv = () => ({
  ...process.env,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
  GIT_OPTIONAL_LOCKS: '0',
})
async function git(root, ...args) {
  const result = await exec(
    'git',
    [
      '-c',
      'core.autocrlf=false',
      '-c',
      'core.fsmonitor=false',
      '-c',
      `core.hooksPath=${process.platform === 'win32' ? 'NUL' : '/dev/null'}`,
      '-c',
      'core.longpaths=true',
      ...args,
    ],
    { cwd: root, env: gitEnv(), encoding: 'buffer', maxBuffer: 32 * 1024 * 1024 },
  )
  return result.stdout
}
const gitText = async (root, ...args) => (await git(root, ...args)).toString('utf8').trim()
const inside = (root, path) => {
  const rel = relative(root, path)
  return (
    rel &&
    rel !== '..' &&
    !rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) &&
    !isAbsolute(rel)
  )
}
async function safeFile(root, path) {
  if (!safeRepoPath(path)) throw Error('REVIEW_SOURCE')
  const target = resolve(root, path)
  if (!inside(root, target)) throw Error('REVIEW_SOURCE')
  let cursor = root
  for (const part of path.split('/')) {
    const names = await readdir(cursor)
    if (
      !names.includes(part) ||
      names.some((x) => x !== part && x.toLowerCase() === part.toLowerCase())
    )
      throw Error('REVIEW_SOURCE_CASE')
    cursor = join(cursor, part)
    const state = await lstat(cursor)
    if (state.isSymbolicLink() || !samePath(await realpath(cursor), cursor))
      throw Error('REVIEW_SOURCE_REPARSE')
  }
  if (!(await lstat(target)).isFile()) throw Error('REVIEW_SOURCE_TYPE')
  return readFile(target)
}
const forbidden = (path) =>
  /(^|\/)(\.env(?:\.[^/]*)?|\.codex|\.aws|\.ssh|\.git|auth\.json|credentials|id_rsa|id_ed25519|[^/]+\.(pem|key))($|\/)/i.test(
    path,
  )
const sensitive = (bytes) =>
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}|\bgh[pousr]_[A-Za-z0-9]{30,}|\bAKIA[A-Z0-9]{16}\b|\b(?:api[_-]?key|password|secret|access[_-]?token|refresh[_-]?token|client[_-]?secret)["']?\s*[:=]\s*["'][A-Za-z0-9_\x2f+.-]{16,}["']/i.test(
    bytes.toString('utf8'),
  )

export async function ownerIdentity(root) {
  const actualRoot = await realpath(root)
  const top = await realpath(await gitText(actualRoot, 'rev-parse', '--show-toplevel'))
  const common = await realpath(
    await gitText(actualRoot, 'rev-parse', '--path-format=absolute', '--git-common-dir'),
  )
  const branch = await gitText(actualRoot, 'branch', '--show-current')
  const head = await gitText(actualRoot, 'rev-parse', 'HEAD')
  const lines = (await gitText(actualRoot, 'worktree', 'list', '--porcelain')).split(/\r?\n/)
  const registered = lines.filter((x) => x.startsWith('worktree ')).map((x) => x.slice(9))
  if (!samePath(top, actualRoot) || !registered.some((p) => samePath(p, actualRoot)) || !branch)
    throw Error('OWNER_REGISTRATION')
  return { root: actualRoot, common, branch, head, registered }
}

export async function snapshotCandidate(root) {
  const owner = await ownerIdentity(root)
  const tracked = (await git(root, 'ls-files', '-z')).toString('utf8').split('\0').filter(Boolean)
  const untracked = (await git(root, 'ls-files', '--others', '--exclude-standard', '-z'))
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
  const status = await git(root, 'status', '--porcelain=v1', '-z', '--untracked-files=all')
  const indexPath = await gitText(
    root,
    'rev-parse',
    '--path-format=absolute',
    '--git-path',
    'index',
  )
  const headPath = await gitText(root, 'rev-parse', '--path-format=absolute', '--git-path', 'HEAD')
  const artifacts = []
  for (const path of [...new Set([...tracked, ...untracked])].sort()) {
    const bytes = await safeFile(owner.root, path)
    artifacts.push({ path, bytes: bytes.length, sha256: sha(bytes) })
  }
  const state = {
    identity: { root: owner.root, common: owner.common, branch: owner.branch, head: owner.head },
    statusSha256: sha(status),
    indexSha256: sha(await readFile(indexPath)),
    headFileSha256: sha(await readFile(headPath)),
    artifacts,
  }
  return { ...state, digest: sha(JSON.stringify(state)) }
}

const reviewAdmissions = new WeakMap()

export function createReviewAdmission({
  authority,
  policySha256,
  allowedPaths,
  requiredPaths,
  verifyPlan,
} = {}) {
  if (
    !authority ||
    !Array.isArray(allowedPaths) ||
    !allowedPaths.length ||
    allowedPaths.some((path) => !safeRepoPath(path, { glob: true })) ||
    !Array.isArray(requiredPaths) ||
    !requiredPaths.length ||
    requiredPaths.some((path) => !safeRepoPath(path)) ||
    typeof policySha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(policySha256) ||
    typeof verifyPlan !== 'function'
  )
    throw new TypeError(
      'Trusted review admission needs role authority, policy, paths and plan verifier',
    )
  const admission = Object.freeze({})
  reviewAdmissions.set(admission, {
    authority,
    policySha256,
    allowedPaths: [...new Set(allowedPaths)],
    requiredPaths: [...new Set(requiredPaths)],
    verifyPlan,
  })
  return admission
}

function checkRequestSource(request, manifest, admission) {
  const w01 = manifest?.id === W01
  const stage = manifest?.stages?.filter((row) => row?.id === request?.stage)
  const trusted = reviewAdmissions.get(admission)
  if (
    !manifest ||
    !request ||
    !Array.isArray(stage) ||
    stage.length !== 1 ||
    request.change !== stage[0].change ||
    (w01 ? request.stage !== 'W01' : !trusted) ||
    !['PRE', 'POST'].includes(request.phase) ||
    request.role !== `independent-${request.phase}` ||
    request.taskType !== request.role ||
    !/^\d+(?:\.\d+)+$/.test(request.task ?? '') ||
    typeof request.scope !== 'string' ||
    !request.scope.trim() ||
    typeof request.prompt !== 'string' ||
    !request.prompt.trim() ||
    !Array.isArray(request.paths) ||
    !request.paths.length ||
    Object.hasOwn(request, 'approved') ||
    Object.hasOwn(request, 'approval') ||
    Object.hasOwn(request, 'authority') ||
    Object.hasOwn(request, 'roleAuthority') ||
    Object.hasOwn(request, 'reviewPolicy') ||
    Object.hasOwn(request, 'model') ||
    Object.hasOwn(request, 'effort')
  )
    throw Error('REVIEW_SOURCE')
  if (new Set(request.paths).size !== request.paths.length) throw Error('REVIEW_SOURCE')
  if (
    !Array.isArray(manifest.scope?.allowed) ||
    (w01 && manifest.scope.allowed.some((p) => !W01_ALLOWED.has(p))) ||
    (!w01 && manifest.scope.allowed.some((p) => !trusted.allowedPaths.includes(p)))
  )
    throw Error('REVIEW_SOURCE')
  for (const path of request.paths) {
    if (!safeRepoPath(path) || forbidden(path)) throw Error('REVIEW_SOURCE')
    if (
      (w01 && ![...W01_ALLOWED].some((p) => pathMatches(p, path))) ||
      (!w01 && !trusted.allowedPaths.some((p) => pathMatches(p, path))) ||
      (path !== 'AGENTS.md' &&
        !manifest.scope.allowed.some(
          (p) => safeRepoPath(p, { glob: true }) && pathMatches(p, path),
        ))
    )
      throw Error('REVIEW_SOURCE')
    if (manifest.scope.frozen.some((p) => safeRepoPath(p, { glob: true }) && pathMatches(p, path)))
      throw Error('REVIEW_SOURCE')
  }
  const required = w01
    ? [
        PROPOSAL,
        DESIGN,
        TASKS,
        ...SPECS,
        DECISIONS,
        D03,
        manifest.policy.artifact,
        manifest.statusPath,
      ]
    : [...trusted.requiredPaths, manifest.policy.artifact, manifest.statusPath]
  for (const path of required) if (!request.paths.includes(path)) throw Error('REVIEW_SOURCE')
}

async function approvedW01(root, manifest, request) {
  const reader = createArtifactReader(root)
  const [design, decisions, approval, policy] = await Promise.all([
    reader.read(DESIGN),
    reader.read(DECISIONS),
    reader.read(D03),
    reader.read(manifest.policy.artifact),
  ])
  if (
    design.sha256 !== DESIGN_SHA ||
    decisions.sha256 !== DECISIONS_SHA ||
    approval.sha256 !== D03_SHA ||
    policy.sha256 !== POLICY_SHA ||
    manifest.policy.sha256 !== POLICY_SHA ||
    manifest.policy.release !== RELEASE ||
    manifest.policy.artifact !== POLICY_PATH
  )
    throw Error('REVIEW_PLAN_DRIFT')
  const d03 = JSON.parse(approval.bytes)
  const human = JSON.parse(decisions.bytes)
  for (const path of [PROPOSAL, DESIGN, ...SPECS]) {
    const bytes = await reader.read(path)
    if (!d03.approvedArtifacts.some((x) => x.path === path && x.sha256 === bytes.sha256))
      throw Error('REVIEW_PLAN_DRIFT')
  }
  if (
    !(await reader.read(TASKS)).bytes.toString('utf8').includes('2.5 Add RED review-wrapper tests')
  )
    throw Error('REVIEW_TASK_PLAN')
  if (
    d03.id !== 'D03' ||
    d03.reply !== 'Принято. Продолжай.' ||
    !d03.approvedArtifacts.some((x) => x.path === DESIGN && x.sha256 === DESIGN_SHA) ||
    human.accepted?.models?.independentPRE?.model !== 'gpt-6-astra' ||
    human.accepted?.models?.independentPRE?.effort !== 'xhigh' ||
    human.accepted?.models?.independentPOST?.model !== 'gpt-6-astra' ||
    human.accepted?.models?.independentPOST?.effort !== 'xhigh'
  )
    throw Error('REVIEW_APPROVAL')
  const authority = createRoleAuthority({
    bindings: [
      { path: DESIGN, sha256: DESIGN_SHA, revision: 'D03' },
      { path: D03, sha256: D03_SHA, revision: 'D03' },
    ],
    verifyApproval: async ({ assignment, rawDecision }) => {
      const approved = JSON.parse(rawDecision.bytes)
      return (
        approved.id === 'D03' &&
        approved.approvedArtifacts.some((x) => x.path === DESIGN && x.sha256 === DESIGN_SHA) &&
        assignment.model === 'gpt-6-astra' &&
        assignment.effort === 'xhigh'
      )
    },
  })
  const result = await resolveRole({
    manifest,
    stageId: request.stage,
    taskId: request.task,
    taskType: request.taskType,
    role: request.role,
    reader,
    authority,
  })
  if (!result.ok) throw Error(`REVIEW_ROLE_${result.issues[0]?.code}`)
  return result.assignment
}

export async function prepareReview(options = {}) {
  const { manifest, request } = options
  try {
    checkRequestSource(request, manifest, options.admission)
    const validation = validateManifest(manifest)
    if (validation.issues.length)
      throw Error(`REVIEW_MANIFEST:${validation.issues.map((x) => x.code).join(',')}`)
    const owner = await ownerIdentity(options.root ?? manifest.owner.worktree)
    let requestFileSha256
    if (options.requestPath) {
      const source = resolve(options.requestPath)
      if (
        inside(owner.root, source) ||
        !samePath(await realpath(source), source) ||
        !(await lstat(source)).isFile()
      )
        throw Error('REVIEW_REQUEST_PATH')
      const bytes = await readFile(source)
      requestFileSha256 = sha(bytes)
      if (JSON.stringify(JSON.parse(bytes)) !== JSON.stringify(request))
        throw Error('REVIEW_REQUEST_DRIFT')
    }
    if (
      !samePath(owner.root, manifest.owner.worktree) ||
      !samePath(owner.common, manifest.owner.gitCommon) ||
      owner.branch !== manifest.owner.branch ||
      (options.expectedCommon && !samePath(owner.common, options.expectedCommon))
    )
      throw Error('REVIEW_OWNER')
    let assignment
    if (manifest.id === W01) assignment = await approvedW01(owner.root, manifest, request)
    else {
      const admitted = reviewAdmissions.get(options.admission)
      if (!admitted) throw Error('REVIEW_OWNER_APPROVAL')
      const reader = createArtifactReader(owner.root)
      const policy = await reader.read(manifest.policy.artifact)
      if (
        policy.sha256 !== admitted.policySha256 ||
        manifest.policy.sha256 !== admitted.policySha256 ||
        manifest.policy.release !== RELEASE
      )
        throw Error('REVIEW_POLICY_APPROVAL')
      if ((await admitted.verifyPlan({ reader, owner, manifest, request })) !== true)
        throw Error('REVIEW_PLAN_APPROVAL')
      const result = await resolveRole({
        manifest,
        stageId: request.stage,
        taskId: request.task,
        taskType: request.taskType,
        role: request.role,
        reader,
        authority: admitted.authority,
      })
      if (!result.ok) throw Error(`REVIEW_ROLE_${result.issues[0]?.code}`)
      assignment = result.assignment
    }
    const files = []
    let total = 0
    for (const path of request.paths) {
      const bytes = await safeFile(owner.root, path)
      if (sensitive(bytes)) throw Error('REVIEW_CREDENTIAL')
      total += bytes.length
      if (total > (options.maxPacketBytes ?? MAX_PACKET)) throw Error('REVIEW_PACKET_LIMIT')
      files.push({ path, bytes: bytes.length, sha256: sha(bytes) })
    }
    const snapshot = await snapshotCandidate(owner.root)
    const staged = await gitText(owner.root, 'diff', '--cached', '--name-only')
    if (staged) throw Error('REVIEW_STAGED_INDEX')
    return {
      ok: true,
      status: 'READY',
      owner,
      assignment,
      snapshot,
      files,
      packetBytes: total,
      requestFileSha256,
    }
  } catch (error) {
    return blocked(error.message || 'REVIEW_PREPARE')
  }
}

export function createFixtureTransport(raw) {
  if (
    !raw ||
    typeof raw.events !== 'string' ||
    typeof raw.report !== 'string' ||
    typeof raw.stderr !== 'string' ||
    !Number.isInteger(raw.exit)
  )
    throw new TypeError('Complete raw fixture fields required')
  const transport = Object.freeze({})
  const copy = structuredClone(raw)
  fixtureTransports.set(transport, { raw: copy, sha256: sha(JSON.stringify(copy)) })
  return transport
}

function finalAgentMessage(events) {
  const messages = events.filter(
    (e) => e.type === 'item.completed' && e.item?.type === 'agent_message',
  )
  return messages.at(-1)?.item?.text
}
export function verifyRawReview({ events, report, exit, timedOut = false }) {
  try {
    if (timedOut || (exit !== 0 && exit !== 1)) throw Error('REVIEW_TRANSPORT')
    const parsed = events
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line))
    if (
      parsed[0]?.type !== 'thread.started' ||
      !parsed[0].thread_id ||
      parsed.filter((e) => e.type === 'thread.started').length !== 1 ||
      parsed.filter((e) => e.type === 'turn.started').length !== 1 ||
      parsed.findIndex((e) => e.type === 'turn.started') >
        parsed.findIndex((e) => e.type === 'turn.completed') ||
      parsed.at(-1)?.type !== 'turn.completed' ||
      parsed.some((e) => ['error', 'turn.failed'].includes(e.type)) ||
      parsed.filter((e) => e.type === 'turn.completed').length !== 1
    )
      throw Error('REVIEW_EVENTS')
    const lines = report.replace(/\\+_/g, '_').split(/\r?\n/)
    const markers = lines.filter((line) => line.includes('GATE_STATUS:'))
    const match =
      markers.length === 1 && /^[ \t]*GATE_STATUS:[ \t]*(PASS|FAIL)[ \t]*$/.exec(markers[0])
    if (!match || (match[1] === 'PASS' ? exit !== 0 : exit !== 1)) throw Error('REVIEW_VERDICT')
    if (finalAgentMessage(parsed)?.trimEnd() !== report.trimEnd())
      throw Error('REVIEW_FINAL_REPORT')
    return { ok: true, status: match[1], gateStatus: match[1], threadId: parsed[0].thread_id }
  } catch (error) {
    return blocked(error.message || 'REVIEW_RAW')
  }
}

async function retainRaw(run, raw) {
  const files = {
    events: ['events.jsonl', Buffer.from(raw.events)],
    report: ['result.md', Buffer.from(raw.report)],
    stderr: ['stderr.txt', Buffer.from(raw.stderr)],
    exit: [
      'exit.json',
      Buffer.from(JSON.stringify({ exit: raw.exit, timedOut: raw.timedOut === true }) + '\n'),
    ],
  }
  const descriptors = {}
  for (const [key, [name, bytes]] of Object.entries(files)) {
    const path = join(run, name)
    await writeFile(path, bytes, { flag: 'wx' })
    if (sha(await readFile(path)) !== sha(bytes)) throw Error('REVIEW_RAW_DRIFT')
    descriptors[key] = { path, bytes: bytes.length, sha256: sha(bytes) }
  }
  return descriptors
}

const strictCommands = (change) => [
  ['validate', change, '--strict', '--json'],
  ['validate', '--all', '--strict', '--json'],
]
const publicOpenSpecVersion = '1.14.0'
async function publicOpenSpecToolchain(root) {
  const pathEntries = (process.env.PATH ?? '')
    .split(process.platform === 'win32' ? ';' : ':')
    .filter(Boolean)
  const candidates = [
    { path: join(root, 'node_modules', '@fission-ai', 'openspec'), source: 'OWNER_LOCAL' },
  ]
  for (const directory of pathEntries) {
    if (!isAbsolute(directory)) continue
    const shim = join(directory, process.platform === 'win32' ? 'openspec.cmd' : 'openspec')
    try {
      const state = await lstat(shim)
      if (!state.isFile() && !state.isSymbolicLink()) continue
      const path = state.isSymbolicLink()
        ? dirname(dirname(await realpath(shim)))
        : join(directory, 'node_modules', '@fission-ai', 'openspec')
      candidates.push({ path, source: 'PATH_SHIM', shim })
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  const found = new Map()
  for (const candidate of candidates) {
    let packageRoot
    try {
      packageRoot = await realpath(candidate.path)
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
    if (!samePath(packageRoot, candidate.path)) throw Error('REVIEW_TOOLCHAIN_REPARSE')
    const packagePath = join(packageRoot, 'package.json')
    const entry = join(packageRoot, 'bin', 'openspec.js')
    for (const path of [packagePath, entry]) {
      if (!(await lstat(path)).isFile() || !samePath(await realpath(path), path))
        throw Error('REVIEW_TOOLCHAIN_REPARSE')
    }
    const packageBytes = await readFile(packagePath)
    let metadata
    try {
      metadata = JSON.parse(packageBytes)
    } catch {
      throw Error('REVIEW_TOOLCHAIN_PACKAGE')
    }
    if (
      metadata.name !== '@fission-ai/openspec' ||
      metadata.version !== publicOpenSpecVersion ||
      metadata.bin?.openspec !== './bin/openspec.js'
    )
      throw Error('REVIEW_TOOLCHAIN_PACKAGE')
    const node = await realpath(process.execPath)
    const toolchain = {
      node,
      nodeSha256: sha(await readFile(node)),
      packageRoot,
      packageSha256: sha(packageBytes),
      entry,
      entrySha256: sha(await readFile(entry)),
      packageName: metadata.name,
      version: metadata.version,
      discovery:
        candidate.source === 'PATH_SHIM'
          ? {
              source: candidate.source,
              shim: candidate.shim,
              shimSha256: sha(await readFile(candidate.shim)),
            }
          : { source: candidate.source },
    }
    found.set(process.platform === 'win32' ? packageRoot.toLowerCase() : packageRoot, toolchain)
  }
  if (found.size !== 1)
    throw Error(found.size ? 'REVIEW_TOOLCHAIN_AMBIGUOUS' : 'REVIEW_TOOLCHAIN_UNKNOWN')
  return [...found.values()][0]
}

export async function strictToolchainUnchanged(root, records) {
  if (!Array.isArray(records) || !records.length) return false
  try {
    const current = await publicOpenSpecToolchain(root)
    return records.every((record) => JSON.stringify(record.toolchain) === JSON.stringify(current))
  } catch {
    return false
  }
}

async function strictReceiptsUnchanged(run, records) {
  for (const [index, record] of records.entries()) {
    const expected = JSON.stringify(record, null, 2) + '\n'
    if (sha(await readFile(join(run, `strict-${index + 1}.json`))) !== sha(expected)) return false
  }
  return true
}

function validStrictOutput(stdout, change, all) {
  let output
  try {
    output = JSON.parse(stdout)
  } catch {
    return false
  }
  const items = output?.items
  const totals = output?.summary?.totals
  if (
    output.version !== '1.0' ||
    !Array.isArray(items) ||
    !items.length ||
    items.some(
      (item) =>
        !item ||
        typeof item !== 'object' ||
        !Array.isArray(item.issues) ||
        item.issues.some((issue) => !issue || typeof issue !== 'object'),
    ) ||
    new Set(items.map((item) => `${item.type}:${item.id}`)).size !== items.length ||
    items.some(
      (item) =>
        typeof item.id !== 'string' ||
        !item.id ||
        !['change', 'spec'].includes(item.type) ||
        item.valid !== true ||
        item.issues.some((issue) => issue.level === 'ERROR'),
    ) ||
    totals?.items !== items.length ||
    totals.passed !== items.length ||
    totals.failed !== 0
  )
    return false
  const selected = items.filter((item) => item.id === change && item.type === 'change')
  return selected.length === 1 && (all || items.length === 1)
}

export function verifyStrictValidation(records, snapshotSha256, change = W01) {
  const strict = strictCommands(change)
  if (!Array.isArray(records) || records.length !== strict.length) return false
  return records.every(
    (record, index) =>
      record.snapshotSha256 === snapshotSha256 &&
      record.command === 'openspec' &&
      JSON.stringify(record.args) === JSON.stringify(strict[index]) &&
      record.launcher === record.toolchain?.node &&
      JSON.stringify(record.launchArgs) ===
        JSON.stringify([record.toolchain?.entry, ...strict[index]]) &&
      record.toolchain?.packageName === '@fission-ai/openspec' &&
      record.toolchain?.version === publicOpenSpecVersion &&
      ['OWNER_LOCAL', 'PATH_SHIM'].includes(record.toolchain?.discovery?.source) &&
      (record.toolchain.discovery.source !== 'PATH_SHIM' ||
        (/^[a-f0-9]{64}$/.test(record.toolchain.discovery.shimSha256 ?? '') &&
          typeof record.toolchain.discovery.shim === 'string')) &&
      [
        record.toolchain?.nodeSha256,
        record.toolchain?.packageSha256,
        record.toolchain?.entrySha256,
      ].every((value) => /^[a-f0-9]{64}$/.test(value ?? '')) &&
      record.exit === 0 &&
      !record.timedOut &&
      record.failure == null &&
      typeof record.stdout === 'string' &&
      typeof record.stderr === 'string' &&
      record.stdoutSha256 === sha(record.stdout) &&
      record.stderrSha256 === sha(record.stderr) &&
      validStrictOutput(record.stdout, change, index === 1),
  )
}
export async function runStrictValidation(root, run, snapshotSha256, change) {
  const toolchain = await publicOpenSpecToolchain(root)
  const records = []
  for (const [index, args] of strictCommands(change).entries()) {
    if (JSON.stringify(await publicOpenSpecToolchain(root)) !== JSON.stringify(toolchain))
      throw Error('REVIEW_TOOLCHAIN_DRIFT')
    let stdout = '',
      stderr = '',
      exit = 0,
      timedOut = false,
      failure = null
    try {
      const result = await exec(toolchain.node, [toolchain.entry, ...args], {
        cwd: root,
        env: gitEnv(),
        encoding: 'utf8',
        timeout: 120000,
        maxBuffer: 32 * 1024 * 1024,
      })
      stdout = result.stdout
      stderr = result.stderr
    } catch (error) {
      stdout = String(error.stdout ?? '')
      stderr = String(error.stderr ?? error.message)
      exit = Number.isInteger(error.code) ? error.code : 2
      timedOut = error.killed === true
      failure = { code: String(error.code ?? 'UNKNOWN'), message: String(error.message) }
    }
    const record = {
      command: 'openspec',
      args,
      launcher: toolchain.node,
      launchArgs: [toolchain.entry, ...args],
      toolchain,
      snapshotSha256,
      exit,
      timedOut,
      failure,
      stdout,
      stderr,
      stdoutSha256: sha(stdout),
      stderrSha256: sha(stderr),
    }
    const path = join(run, `strict-${index + 1}.json`)
    await writeFile(path, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' })
    if (sha(await readFile(path)) !== sha(JSON.stringify(record, null, 2) + '\n'))
      throw Error('REVIEW_VALIDATION_RAW_DRIFT')
    records.push(record)
  }
  if (JSON.stringify(await publicOpenSpecToolchain(root)) !== JSON.stringify(toolchain))
    throw Error('REVIEW_TOOLCHAIN_DRIFT')
  if (!verifyStrictValidation(records, snapshotSha256, change))
    throw Error('REVIEW_STRICT_VALIDATION')
  return records
}

async function freeze(owner, prepared, request, requestPath) {
  const requestBytes = requestPath ? await readFile(requestPath) : null
  if (requestBytes && sha(requestBytes) !== prepared.requestFileSha256)
    throw Error('REVIEW_REQUEST_DRIFT')
  const base = join(owner.common, 'frade-workflow')
  const freezes = join(base, 'freeze')
  const runs = join(base, 'runs')
  await mkdir(freezes, { recursive: true })
  await mkdir(runs, { recursive: true })
  for (const path of [owner.common, base, freezes, runs]) await safeDirectory(path)
  const run = join(runs, `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`)
  await mkdir(run)
  await safeDirectory(run)
  const lock = join(freezes, `${request.change}.json`)
  const record = {
    owner: owner.root,
    common: owner.common,
    branch: owner.branch,
    requestSha256: sha(JSON.stringify(request)),
    requestFileSha256: prepared.requestFileSha256,
    snapshotSha256: prepared.snapshot.digest,
    assignment: prepared.assignment,
    run,
  }
  await writeFile(lock, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' })
  await writeFile(join(run, 'freeze.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' })
  await writeFile(
    join(run, 'candidate-before.json'),
    JSON.stringify(prepared.snapshot, null, 2) + '\n',
    { flag: 'wx' },
  )
  await writeFile(join(run, 'request.json'), JSON.stringify(request, null, 2) + '\n', {
    flag: 'wx',
  })
  if (requestBytes) {
    const copy = join(run, 'external-request.raw.json')
    await writeFile(copy, requestBytes, { flag: 'wx' })
    if (sha(await readFile(copy)) !== prepared.requestFileSha256)
      throw Error('REVIEW_REQUEST_RAW_DRIFT')
  }
  return { run, lock, record }
}

async function materializePacket(owner, prepared, run) {
  const packet = join(run, 'packet')
  await mkdir(packet)
  for (const file of prepared.files) {
    const bytes = await safeFile(owner.root, file.path)
    if (sha(bytes) !== file.sha256 || bytes.length !== file.bytes)
      throw Error('REVIEW_SOURCE_DRIFT')
    const dest = join(packet, file.path)
    await mkdir(dirname(dest), { recursive: true })
    await writeFile(dest, bytes, { flag: 'wx' })
  }
  await writeFile(join(run, 'packet-files.json'), JSON.stringify(prepared.files, null, 2) + '\n', {
    flag: 'wx',
  })
  return packet
}

async function verifyPacket(packet, files) {
  for (const file of files) {
    const bytes = await safeFile(packet, file.path)
    if (bytes.length !== file.bytes || sha(bytes) !== file.sha256)
      throw Error('REVIEW_PACKET_DRIFT')
  }
  return sha(JSON.stringify(files))
}

async function captureSharedRaw(common, sharedRun, run) {
  const root = join(common, 'frade-workflow', 'runs')
  if (!inside(root, sharedRun) || !samePath(await realpath(sharedRun), sharedRun))
    throw Error('REVIEW_SHARED_RUN_PATH')
  const target = join(run, 'shared-raw')
  await mkdir(target)
  const artifacts = []
  const walk = async (relativePath = '') => {
    const current = join(sharedRun, relativePath)
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const child = relativePath ? `${relativePath}/${entry.name}` : entry.name
      const origin = join(sharedRun, child)
      if (entry.isSymbolicLink()) throw Error('REVIEW_SHARED_RUN_LINK')
      if (entry.isDirectory()) {
        await mkdir(join(target, child))
        await walk(child)
      } else if (entry.isFile()) {
        const bytes = await readFile(origin)
        const copy = join(target, child)
        await writeFile(copy, bytes, { flag: 'wx' })
        if (sha(await readFile(copy)) !== sha(bytes) || sha(await readFile(origin)) !== sha(bytes))
          throw Error('REVIEW_SHARED_RAW_DRIFT')
        artifacts.push({ path: child, bytes: bytes.length, sha256: sha(bytes) })
      } else throw Error('REVIEW_SHARED_RUN_TYPE')
    }
  }
  await walk()
  artifacts.sort((a, b) => a.path.localeCompare(b.path))
  await writeFile(join(run, 'shared-raw-index.json'), JSON.stringify(artifacts, null, 2) + '\n', {
    flag: 'wx',
  })
  return { root: target, artifacts, digest: sha(JSON.stringify(artifacts)) }
}

export async function runFixtureReview(options = {}) {
  const sealed = fixtureTransports.get(options.fixtureTransport)
  if (!sealed || sealed.sha256 !== sha(JSON.stringify(sealed.raw)))
    return blocked('FIXTURE_TRANSPORT')
  const prepared = await prepareReview(options)
  if (!prepared.ok) return prepared
  let locked, raw
  try {
    locked = await freeze(prepared.owner, prepared, options.request, options.requestPath)
    const packet = await materializePacket(prepared.owner, prepared, locked.run)
    const packetSha256 = await verifyPacket(packet, prepared.files)
    raw = await retainRaw(locked.run, sealed.raw)
    const fixture = sealed.raw
    if (fixture.mutateCandidate === 'status')
      await writeFile(
        join(prepared.owner.root, options.manifest.statusPath),
        '# fixture mutation\n',
      )
    if (fixture.mutateRequestFile === true && options.requestPath)
      await writeFile(options.requestPath, `${await readFile(options.requestPath, 'utf8')} `)
    const after = await snapshotCandidate(prepared.owner.root)
    const ownerAfter = await ownerIdentity(prepared.owner.root)
    const unchanged =
      after.digest === prepared.snapshot.digest &&
      samePath(ownerAfter.common, prepared.owner.common) &&
      ownerAfter.branch === prepared.owner.branch
    const verified = verifyRawReview(fixture)
    const valid =
      unchanged &&
      packetSha256 === (await verifyPacket(packet, prepared.files)) &&
      sha(JSON.stringify(options.request)) === locked.record.requestSha256 &&
      (!options.requestPath ||
        sha(await readFile(options.requestPath)) === prepared.requestFileSha256) &&
      fixture.canary === 'PASS' &&
      fixture.runtime === RUNTIME &&
      fixture.version === '0.159.3' &&
      !fixture.policyDrift &&
      !fixture.controlDrift &&
      !fixture.requestDrift &&
      !fixture.candidateDrift &&
      !fixture.packetDrift &&
      verified.ok
    const result = {
      ok: valid,
      status: valid ? verified.status : 'BLOCKED',
      gateStatus: valid ? verified.gateStatus : null,
      code: valid ? undefined : (verified.code ?? 'REVIEW_INTEGRITY'),
      run: locked.run,
      raw,
      assignment: prepared.assignment,
      requestedModel: prepared.assignment.model,
      requestedEffort: prepared.assignment.effort,
      actualBackend: 'NOT_CONFIRMED',
      actualEffort: 'NOT_CONFIRMED',
      closureAuthorized: false,
      scope: options.request.scope,
      focused: options.request.focused === true,
      snapshotSha256: prepared.snapshot.digest,
      packetSha256,
    }
    await writeFile(
      join(locked.run, 'wrapper-result.json'),
      JSON.stringify(result, null, 2) + '\n',
      { flag: 'wx' },
    )
    await writeFile(
      join(locked.run, 'review-event.json'),
      JSON.stringify(
        {
          kind: 'REVIEW_RECEIVED',
          phase: options.request.phase,
          focused: options.request.focused === true,
          status: result.status,
          run: locked.run,
          sourceSnapshotSha256: prepared.snapshot.digest,
        },
        null,
        2,
      ) + '\n',
      { flag: 'wx' },
    )
    if (!unchanged) return { ...result, status: 'BLOCKED', code: 'REVIEW_MUTATION' }
    await rm(locked.lock)
    return result
  } catch (error) {
    return { ...blocked(error.message || 'REVIEW_RUNTIME'), run: locked?.run, raw }
  }
}

// The public path always resolves the currently installed common release and invokes its CLI.
// No test fixture transport is accepted here.
export async function runProductionReview(options = {}) {
  if (options.manifest?.id !== W01 && !reviewAdmissions.has(options.admission))
    return blocked('REVIEW_OWNER_APPROVAL')
  const prepared = await prepareReview({
    ...options,
    admission: options.manifest?.id === W01 ? undefined : options.admission,
    expectedCommon: PRODUCTION_COMMON,
  })
  if (!prepared.ok) return prepared
  let locked, captured
  try {
    const pointerPath = join(prepared.owner.common, 'frade-workflow', 'current.json')
    if (!samePath(await realpath(pointerPath), pointerPath) || !(await lstat(pointerPath)).isFile())
      throw Error('REVIEW_RELEASE_POINTER')
    const pointerBytes = await readFile(pointerPath)
    const pointerSha256 = sha(pointerBytes)
    const pointer = JSON.parse(pointerBytes)
    if (
      pointer.version !== 1 ||
      pointer.release !== RELEASE ||
      !samePath(pointer.common, prepared.owner.common) ||
      pointer.policySha256 !== POLICY_SHA
    )
      throw Error('REVIEW_RELEASE')
    const releaseRoot = join(prepared.owner.common, 'frade-workflow', 'releases', pointer.release)
    await safeDirectory(releaseRoot)
    const core = await import(pathToFileURL(join(releaseRoot, 'scripts/agent-review/core.mjs')))
    const release = await core.bundle(releaseRoot)
    if (release.digest !== pointer.release) throw Error('REVIEW_BUNDLE')
    const discovered = await core.discover(prepared.owner.root, prepared.owner.common)
    if (
      !samePath(discovered.root, prepared.owner.root) ||
      discovered.branch !== prepared.owner.branch
    )
      throw Error('REVIEW_OWNER')
    locked = await freeze(prepared.owner, prepared, options.request, options.requestPath)
    const packet = await materializePacket(prepared.owner, prepared, locked.run)
    const packetSha256 = await verifyPacket(packet, prepared.files)
    const strictValidation = await runStrictValidation(
      prepared.owner.root,
      locked.run,
      prepared.snapshot.digest,
      options.request.change,
    )
    if ((await snapshotCandidate(prepared.owner.root)).digest !== prepared.snapshot.digest)
      throw Error('REVIEW_VALIDATION_SOURCE_DRIFT')
    if (
      !(await strictToolchainUnchanged(prepared.owner.root, strictValidation)) ||
      !(await strictReceiptsUnchanged(locked.run, strictValidation))
    )
      throw Error('REVIEW_TOOLCHAIN_DRIFT')
    if (
      sha(await readFile(pointerPath)) !== pointerSha256 ||
      (await core.bundle(releaseRoot)).digest !== release.digest
    )
      throw Error('REVIEW_CONTROL_DRIFT')
    const selected = prepared.assignment
    const request = {
      phase: options.request.phase,
      change: options.request.change,
      scope: options.request.scope,
      reviewPolicy: {
        stage: selected.stage,
        phase: options.request.phase,
        model: selected.model,
        reasoningEffort: selected.effort,
        source: {
          path: selected.source.path,
          sha256: selected.source.sha256,
          excerpt: selected.source.excerpt,
        },
      },
      policyArtifact: options.manifest.policy.artifact,
      paths: options.request.paths,
      prompt: options.request.prompt,
    }
    const receipt = await core.review(release, discovered, request)
    const rawRun = receipt.run
    captured = await captureSharedRaw(prepared.owner.common, rawRun, locked.run)
    const output = join(captured.root, 'output')
    const raw = {
      events: await readFile(join(output, 'events.jsonl'), 'utf8'),
      report: await readFile(join(output, 'result.md'), 'utf8'),
      stderr: await readFile(join(output, 'stderr.txt'), 'utf8'),
      exit: JSON.parse(await readFile(join(output, 'record.json'), 'utf8')).exitCode,
    }
    if (
      !(await strictToolchainUnchanged(prepared.owner.root, strictValidation)) ||
      !(await strictReceiptsUnchanged(locked.run, strictValidation)) ||
      !verifyStrictValidation(strictValidation, prepared.snapshot.digest, options.request.change)
    )
      throw Error('REVIEW_TOOLCHAIN_DRIFT')
    if (sha(await readFile(pointerPath)) !== pointerSha256) throw Error('REVIEW_CONTROL_DRIFT')
    const descriptors = await retainRaw(locked.run, raw)
    const inner = await readFile(join(output, 'record.json'))
    const innerHash = sha(inner)
    const innerRecord = JSON.parse(inner)
    core.verifyRequestedPolicy(innerRecord, request.reviewPolicy)
    const probeBytes = await readFile(join(captured.root, 'instance', 'offline-probe-b.json'))
    const probeRecord = JSON.parse(probeBytes)
    const confinement =
      innerRecord.readConfinementProbeSha256 === sha(probeBytes) &&
      probeRecord.version?.exit === 0 &&
      probeRecord.version?.out?.trim() === 'codex-cli 0.159.3' &&
      innerRecord.cli?.version === '0.159.3' &&
      innerRecord.candidateUnchanged === true &&
      innerRecord.packetUnchanged === true &&
      innerRecord.timedOut !== true &&
      !innerRecord.error
    const result = verifyRawReview(raw)
    const after = await snapshotCandidate(prepared.owner.root)
    const unchanged =
      after.digest === prepared.snapshot.digest &&
      (await ownerIdentity(prepared.owner.root)).branch === prepared.owner.branch
    const valid =
      result.ok &&
      confinement &&
      receipt.status === result.status &&
      receipt.requestedModel === selected.model &&
      receipt.requestedEffort === selected.effort &&
      packetSha256 === (await verifyPacket(packet, prepared.files)) &&
      unchanged &&
      sha(JSON.stringify(options.request)) === locked.record.requestSha256 &&
      (!options.requestPath ||
        sha(await readFile(options.requestPath)) === prepared.requestFileSha256) &&
      (await core.bundle(releaseRoot)).digest === release.digest
    const wrapper = {
      ok: valid,
      status: valid ? result.status : 'BLOCKED',
      gateStatus: valid ? result.gateStatus : null,
      code: valid ? undefined : 'REVIEW_INTEGRITY',
      run: locked.run,
      sharedRun: rawRun,
      sharedReceipt: receipt,
      sharedRecordSha256: innerHash,
      raw: descriptors,
      sharedRawIndexSha256: captured.digest,
      assignment: selected,
      requestedModel: selected.model,
      requestedEffort: selected.effort,
      actualBackend: 'NOT_CONFIRMED',
      actualEffort: 'NOT_CONFIRMED',
      closureAuthorized: false,
      focused: options.request.focused === true,
      snapshotSha256: prepared.snapshot.digest,
      packetSha256,
      strictValidation,
    }
    await writeFile(
      join(locked.run, 'wrapper-result.json'),
      JSON.stringify(wrapper, null, 2) + '\n',
      { flag: 'wx' },
    )
    await writeFile(
      join(locked.run, 'review-event.json'),
      JSON.stringify(
        {
          kind: 'REVIEW_RECEIVED',
          phase: options.request.phase,
          focused: options.request.focused === true,
          status: wrapper.status,
          run: locked.run,
          sourceSnapshotSha256: prepared.snapshot.digest,
        },
        null,
        2,
      ) + '\n',
      { flag: 'wx' },
    )
    if (unchanged) await rm(locked.lock)
    return wrapper
  } catch (error) {
    const result = {
      ...blocked(error.message || 'REVIEW_RUNTIME'),
      run: locked?.run,
      sharedRawIndexSha256: captured?.digest,
    }
    if (locked) {
      try {
        await writeFile(
          join(locked.run, 'wrapper-error.json'),
          JSON.stringify(
            {
              error: String(error),
              atUtc: new Date().toISOString(),
            },
            null,
            2,
          ) + '\n',
          { flag: 'wx' },
        )
        const unchanged =
          (await snapshotCandidate(prepared.owner.root)).digest === prepared.snapshot.digest &&
          (await ownerIdentity(prepared.owner.root)).branch === prepared.owner.branch
        if (unchanged) await rm(locked.lock)
      } catch {
        /* retain freeze on unavailable owner or failed raw retention */
      }
    }
    return result
  }
}
