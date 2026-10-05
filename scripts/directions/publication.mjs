#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  lstatSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  realpathSync,
} from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { safeRepoPath, pathMatches, validateManifest } from './contracts.mjs'

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const hash40 = (x) => typeof x === 'string' && /^[a-f0-9]{40}$/.test(x)
const hash64 = (x) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x)
const hasControlCharacter = (value) => {
  for (let i = 0; i < value.length; i++) if (value.charCodeAt(i) <= 31) return true
  return false
}
const forward = (x) => x.replaceAll('\\', '/')
const same = (a, b) =>
  process.platform === 'win32' ? forward(a).toLowerCase() === forward(b).toLowerCase() : a === b
const blocked = (code, detail, more = {}) => ({
  ok: false,
  status: 'BLOCKED',
  code,
  detail,
  ...more,
})
const productionCommon =
  process.platform === 'win32' ? 'E:/dev/codex/frade/.git' : '/mnt/e/dev/codex/frade/.git'
const fixtureContexts = new WeakSet()
export function trustedPublicationFixtureContext(common, controller) {
  if (controller?.brand !== 'FRADE_PUBLICATION_TEST_CONTROLLER_V1' || typeof common !== 'string')
    throw Error('FIXTURE_CONTROLLER_REQUIRED')
  const canonical = resolve(common)
  plainDirectory(canonical)
  const context = Object.freeze({ common: canonical })
  fixtureContexts.add(context)
  return context
}
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')))
env.GIT_CONFIG_NOSYSTEM = '1'
env.GIT_CONFIG_GLOBAL = process.platform === 'win32' ? 'NUL' : '/dev/null'
env.GIT_TERMINAL_PROMPT = '0'
env.GIT_OPTIONAL_LOCKS = '0'
const gitPrefix = [
  '-c',
  'core.autocrlf=false',
  '-c',
  'core.hooksPath=/dev/null',
  '-c',
  'core.fsmonitor=false',
  '-c',
  'core.attributesFile=/dev/null',
  '-c',
  'core.sshCommand=ssh',
  '-c',
  'credential.helper=',
  '-c',
  'protocol.ext.allow=never',
]
export function checkedGitRecord(args, run, commands) {
  const record = {
    args,
    exitCode: run.status,
    status: run.status,
    signal: run.signal ?? null,
    stdout: run.stdout ?? '',
    stderr: run.stderr ?? '',
    error: run.error?.message ?? null,
  }
  commands?.push(record)
  if (record.error || record.signal)
    throw Error('GIT_EXECUTION_ERROR: ' + (record.error ?? record.signal))
  return record
}
function git(cwd, args, commands) {
  const run = spawnSync('git', [...gitPrefix, ...args], {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
  return checkedGitRecord(args, run, commands)
}
function need(cwd, args, commands) {
  const r = git(cwd, args, commands)
  if (r.exitCode !== 0) {
    const diagnostic = [r.stderr, r.stdout].find(
      (value) => typeof value === 'string' && value.trim(),
    )
    throw Error('GIT_' + args[0] + ': ' + (diagnostic?.trim() ?? String(r.exitCode)))
  }
  return r.stdout.trim()
}
function plainFile(path) {
  const stat = lstatSync(path)
  if (!stat.isFile() || stat.isSymbolicLink() || !same(realpathSync(path), path))
    throw Error('UNSAFE_FILE')
  return readFileSync(path)
}
function plainDirectory(path) {
  const stat = lstatSync(path)
  if (!stat.isDirectory() || stat.isSymbolicLink() || !same(realpathSync(path), path))
    throw Error('UNSAFE_DIRECTORY')
}
export function ownedPath(root, candidate, pathApi = { resolve, relative, isAbsolute }) {
  const base = pathApi.resolve(root)
  const target = pathApi.resolve(candidate)
  const offset = pathApi.relative(base, target)
  if (offset === '..' || /^\.\.[\\/]/.test(offset) || pathApi.isAbsolute(offset))
    throw Error('PATH_ESCAPE')
  return target
}
function relativeFile(root, path) {
  if (!safeRepoPath(path)) throw Error('UNSAFE_RELATIVE_PATH')
  const base = resolve(root)
  let cursor = base
  for (const part of path.split('/')) {
    cursor = ownedPath(base, join(cursor, part))
    if (lstatSync(cursor).isSymbolicLink() || !same(realpathSync(cursor), cursor))
      throw Error('PATH_LINK')
  }
  return cursor
}
function readJson(path) {
  return JSON.parse(plainFile(path).toString('utf8'))
}
function writeOnce(path, data) {
  plainDirectory(dirname(path))
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' })
}
function inScope(m, path) {
  return (
    safeRepoPath(path) &&
    m.scope.allowed.some((pattern) => pathMatches(pattern, path)) &&
    !m.scope.frozen.some((pattern) => pathMatches(pattern, path)) &&
    !(
      path.startsWith('docs/engineering/directions/') &&
      !path.startsWith('docs/engineering/directions/' + m.id + '/')
    ) &&
    !(path.startsWith('openspec/specs/') || path.startsWith('openspec/changes/archive/'))
  )
}
function checkAttributes(owner, common, commands) {
  const attrs = need(
    owner,
    ['ls-files', '--', '.gitattributes', ':(glob)**/.gitattributes'],
    commands,
  )
  for (const path of attrs.split('\n').filter(Boolean)) {
    if (/(?:^|\s)filter(?:=|\s|$)/m.test(plainFile(relativeFile(owner, path)).toString('utf8')))
      throw Error('UNSAFE_CHECKOUT_FILTER')
  }
  const info = join(common, 'info/attributes')
  if (existsSync(info) && /(?:^|\s)filter(?:=|\s|$)/m.test(plainFile(info).toString('utf8')))
    throw Error('UNSAFE_CHECKOUT_FILTER')
}
function checkRemoteConfiguration(root, a, branch, commands) {
  const config = need(root, ['config', '--name-only', '--list', '--includes'], commands).split(
    /\r?\n/,
  )
  if (config.some((line) => /^url\..*\.(?:insteadof|pushinsteadof)$/i.test(line)))
    throw Error('URL_REWRITE_CONFIG')
  if (config.some((line) => /^remote\.origin\.pushurl$/i.test(line)))
    throw Error('ORIGIN_PUSHURL_OVERRIDE')
  if (
    config.filter((line) => /^remote\.origin\.url$/i.test(line)).length !== 1 ||
    need(root, ['config', '--get', 'remote.origin.url'], commands) !== a.remote
  )
    throw Error('ORIGIN_URL')
  const urls = need(root, ['remote', 'get-url', '--all', 'origin'], commands).split(/\r?\n/)
  const pushUrls = need(root, ['remote', 'get-url', '--push', '--all', 'origin'], commands).split(
    /\r?\n/,
  )
  if (
    urls.length !== 1 ||
    urls[0] !== a.remote ||
    pushUrls.length !== 1 ||
    pushUrls[0] !== a.remote
  )
    throw Error('ORIGIN_DESTINATION')
  if (
    need(root, ['for-each-ref', '--format=%(upstream:short)', 'refs/heads/' + branch], commands) !==
    'origin/' + branch
  )
    throw Error('FOREIGN_UPSTREAM')
}
function candidateSha256(root, paths) {
  return sha(
    paths
      .slice()
      .sort()
      .map((path) => path + '\0' + sha(plainFile(relativeFile(root, path))) + '\n')
      .join(''),
  )
}
function checkAdmission(
  { m, a, root, control, head, authoritySha256 },
  e,
  eventPath,
  manifestPath,
) {
  if (e.kind !== 'TASK' && e.kind !== 'BLOCKER') return
  if (e.kind === 'TASK' && (e.health === 'FAIL' || e.health === 'BLOCKED'))
    throw Error('TASK_HEALTH_NOT_TESTED')
  const eventSha256 = sha(plainFile(eventPath))
  const path = join(control, 'publication-admission', m.id, eventSha256 + '.json')
  if (!existsSync(path)) throw Error('ADMISSION_MISSING')
  const admission = readJson(path)
  const required = a.requiredChecks
  if (
    !Array.isArray(required) ||
    !required.length ||
    required.some((id) => typeof id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(id)) ||
    new Set(required).size !== required.length
  )
    throw Error('AUTHORITY_REQUIRED_CHECKS')
  if (
    admission.schemaVersion !== 1 ||
    admission.id !== m.id ||
    admission.kind !== e.kind ||
    admission.task !== (e.kind === 'TASK' ? e.task : null) ||
    admission.sourceHead !== head ||
    admission.manifestSha256 !== sha(plainFile(manifestPath)) ||
    admission.authoritySha256 !== authoritySha256 ||
    admission.eventSha256 !== eventSha256 ||
    admission.candidateSha256 !== candidateSha256(root, e.paths)
  )
    throw Error('ADMISSION_BINDING')
  if (
    !Array.isArray(admission.checks) ||
    admission.checks.length !== required.length ||
    new Set(admission.checks.map((x) => x.id)).size !== required.length ||
    admission.checks.some((x) => !required.includes(x.id))
  )
    throw Error('ADMISSION_CHECK_SET')
  let failedCheck = false
  for (const check of admission.checks) {
    if (
      !Array.isArray(check.argv) ||
      !check.argv.length ||
      check.argv.some((arg) => typeof arg !== 'string' || !arg || hasControlCharacter(arg))
    )
      throw Error('ADMISSION_COMMAND')
    if (!check.raw || check.raw.name !== check.id + '.log' || !hash64(check.raw.sha256))
      throw Error('ADMISSION_RAW_BINDING')
    const raw = plainFile(join(control, 'publication-checks', m.id, check.raw.name))
    if (!raw.length || sha(raw) !== check.raw.sha256) throw Error('ADMISSION_RAW_DRIFT')
    if (e.kind === 'TASK' && (check.exitCode !== 0 || check.result !== 'PASS'))
      throw Error('ADMISSION_CHECK_FAILED')
    if (e.kind === 'BLOCKER') {
      if (check.exitCode === 0 && check.result === 'PASS') continue
      if (
        !Number.isInteger(check.exitCode) ||
        check.exitCode === 0 ||
        check.result !== 'FAIL' ||
        !/(FAIL|BLOCKED|error)/i.test(raw.toString('utf8'))
      )
        throw Error('BLOCKER_RAW_FAILURE')
      failedCheck = true
    }
  }
  if (e.kind === 'BLOCKER' && !failedCheck) throw Error('BLOCKER_RAW_FAILURE')
}
function ownerAndAuthority(manifestPath, commands, options = {}) {
  if (!isAbsolute(manifestPath)) throw Error('MANIFEST_PATH')
  const m = readJson(manifestPath)
  const valid = validateManifest(m)
  if (!valid.ok) throw Error('MANIFEST_INVALID: ' + valid.issues.map((x) => x.code).join(','))
  const root = resolve(m.owner.worktree),
    common = resolve(m.owner.gitCommon)
  plainDirectory(root)
  plainDirectory(common)
  if (options.trustedContext && !fixtureContexts.has(options.trustedContext))
    throw Error('UNTRUSTED_CONTEXT')
  const expectedCommon = options.trustedContext?.common ?? productionCommon
  if (!same(common, resolve(expectedCommon))) throw Error('TRUSTED_COMMON_MISMATCH')
  const moduleDir = dirname(fileURLToPath(import.meta.url))
  let trustedRoot, trustedCommon
  try {
    trustedRoot = resolve(need(moduleDir, ['rev-parse', '--show-toplevel'], commands))
    trustedCommon = resolve(
      trustedRoot,
      need(trustedRoot, ['rev-parse', '--git-common-dir'], commands),
    )
  } catch {
    throw Error('TRUSTED_COMMON_UNAVAILABLE')
  }
  if (
    !same(trustedRoot, root) ||
    !same(trustedCommon, common) ||
    !same(realpathSync(trustedCommon), trustedCommon)
  )
    throw Error('TRUSTED_COMMON_MISMATCH')
  if (
    !same(resolve(manifestPath), join(root, 'docs/engineering/directions', m.id, 'direction.json'))
  )
    throw Error('MANIFEST_OWNER_PATH')
  if (!same(resolve(process.cwd()), root)) throw Error('OWNER_CONTEXT')
  if (!same(need(root, ['rev-parse', '--show-toplevel'], commands), root)) throw Error('OWNER_TOP')
  if (!same(resolve(root, need(root, ['rev-parse', '--git-common-dir'], commands)), common))
    throw Error('OWNER_COMMON')
  if (need(root, ['symbolic-ref', '--quiet', '--short', 'HEAD'], commands) !== m.owner.branch)
    throw Error('OWNER_BRANCH')
  const head = need(root, ['rev-parse', 'HEAD'], commands)
  if (
    !hash40(head) ||
    git(root, ['merge-base', '--is-ancestor', m.originalBaseline, head], commands).exitCode !== 0
  )
    throw Error('BASELINE_ANCESTRY')
  const worktrees = need(root, ['worktree', 'list', '--porcelain'], commands)
  const registered = worktrees
    .split(/\r?\n\r?\n/)
    .filter(
      (x) =>
        x
          .split(/\r?\n/)
          .some((line) => line.startsWith('worktree ') && same(line.slice(9), root)) &&
        x.includes('branch refs/heads/' + m.owner.branch),
    )
  if (registered.length !== 1) throw Error('OWNER_REGISTRATION')
  const control = join(common, 'frade-workflow')
  plainDirectory(control)
  const freeze = join(control, 'freeze', m.id + '.json')
  if (existsSync(freeze)) throw Error('REVIEW_FROZEN')
  const authorityPath = join(control, 'publication-authority', m.id + '.json')
  const authorityBytes = plainFile(authorityPath)
  const a = JSON.parse(authorityBytes)
  if (
    a.schemaVersion !== 1 ||
    a.id !== m.id ||
    JSON.stringify(a.owner) !== JSON.stringify(m.owner) ||
    a.originalBaseline !== m.originalBaseline ||
    !hash40(a.approvedSourceCommit) ||
    a.ref !== 'refs/heads/' + m.owner.branch ||
    typeof a.remote !== 'string' ||
    !a.remote ||
    /\s/.test(a.remote) ||
    hasControlCharacter(a.remote) ||
    a.remote.startsWith('-') ||
    !safeRepoPath(a.approval?.path) ||
    !hash64(a.approval?.sha256) ||
    !safeRepoPath(a.plan?.path) ||
    !hash64(a.plan?.sha256)
  )
    throw Error('PUBLICATION_AUTHORITY')
  if (
    git(root, ['merge-base', '--is-ancestor', m.originalBaseline, a.approvedSourceCommit], commands)
      .exitCode !== 0 ||
    git(root, ['merge-base', '--is-ancestor', a.approvedSourceCommit, head], commands).exitCode !==
      0
  )
    throw Error('APPROVED_SOURCE_ANCESTRY')
  for (const source of [a.approval, a.plan]) {
    const raw = git(root, ['show', a.approvedSourceCommit + ':' + source.path], commands)
    if (raw.exitCode !== 0 || sha(raw.stdout) !== source.sha256)
      throw Error('APPROVED_SOURCE_DRIFT')
  }
  const approval = JSON.parse(
    need(root, ['show', a.approvedSourceCommit + ':' + a.approval.path], commands),
  )
  if (
    approval.accepted?.publication?.remote !== a.remote ||
    approval.accepted?.publication?.ref !== a.ref ||
    approval.accepted?.publication?.reply !== 'Разрешаю commit/push в указанную ветку'
  )
    throw Error('RAW_D02_AUTHORIZATION')
  const plan = need(root, ['show', a.approvedSourceCommit + ':' + a.plan.path], commands)
  if (
    !plan.includes(a.remote) ||
    !plan.includes(a.ref) ||
    !/checkpoint|cadence|commit|push/i.test(plan)
  )
    throw Error('APPROVED_PLAN_SOURCE')
  if (
    sha(plainFile(relativeFile(root, a.approval.path))) !== a.approval.sha256 ||
    sha(plainFile(relativeFile(root, a.plan.path))) !== a.plan.sha256
  )
    throw Error('CURRENT_AUTHORITY_SOURCE_DRIFT')
  checkRemoteConfiguration(root, a, m.owner.branch, commands)
  checkAttributes(root, common, commands)
  return { m, a, root, common, control, head, authoritySha256: sha(authorityBytes) }
}
function statusPaths(root, commands) {
  const r = git(root, ['status', '--porcelain=v1', '--untracked-files=all', '-z'], commands)
  if (r.exitCode !== 0) throw Error('GIT_STATUS')
  if (!r.stdout) return []
  const entries = r.stdout.split('\0').filter(Boolean)
  const result = []
  for (const entry of entries) {
    if (
      entry.slice(0, 2).includes('R') ||
      entry.slice(0, 2).includes('C') ||
      entry.slice(0, 2).includes('U')
    )
      throw Error('UNSUPPORTED_INDEX_STATE')
    result.push(entry.slice(3))
  }
  return result
}
function sensitive(bytes, path) {
  const s = bytes.toString('utf8')
  const prohibitedPath = /\.(?:pem|key|p12|pfx)$|(?:^|\/)\.env(?:\.|$)/i.test(path)
  const privateKey = /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/i.test(s)
  const assignments =
    /(?:^|[^\w$])(?:password|secret|api[_-]?key|token)["']?\s*[:=]\s*("[^"\r\n]*"|'[^'\r\n]*'|`[^`\r\n]*`|[^\s"'`;,\r\n]+)/gim
  const credential = [...s.matchAll(assignments)].some((match) => {
    const value = match[1]
    const quoted = /^["'`]/.test(value)
    if (value.length - (quoted ? 2 : 0) < 4) return false
    if (quoted) return true
    if ('{[(/'.includes(value[0])) return false
    return !/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\(/.test(value)
  })
  if (prohibitedPath || privateKey || credential) throw Error('SECRET_CANDIDATE: ' + path)
}
function receiptDir(control, id) {
  const base = join(control, 'publication')
  if (!existsSync(base)) mkdirSync(base)
  plainDirectory(base)
  const dir = join(base, id)
  if (!existsSync(dir)) mkdirSync(dir)
  plainDirectory(dir)
  return dir
}
export function checkpoint(manifestPath, eventPath, options = {}) {
  const commands = []
  try {
    if (!isAbsolute(eventPath)) throw Error('EVENT_PATH')
    const state = ownerAndAuthority(manifestPath, commands, options)
    const { m, a, root, control, head, authoritySha256 } = state
    const e = readJson(eventPath)
    if (
      !['TASK', 'PLANNING', 'GATE', 'STAGE', 'BLOCKER'].includes(e.kind) ||
      !['RUNNING', 'PASS', 'FAIL', 'BLOCKED'].includes(e.health) ||
      (e.kind === 'BLOCKER' && !['FAIL', 'BLOCKED'].includes(e.health)) ||
      (e.kind !== 'BLOCKER' && e.health === 'PASS' && e.kind !== 'TASK') ||
      typeof e.message !== 'string' ||
      !e.message.trim() ||
      e.message.length > 180 ||
      !Array.isArray(e.paths) ||
      !e.paths.includes(m.statusPath) ||
      !Array.isArray(e.evidence) ||
      !e.evidence.length ||
      Object.keys(e).some(
        (k) =>
          ![
            'kind',
            'task',
            'health',
            'message',
            'paths',
            'evidence',
            'previousPublicationReceipt',
          ].includes(k),
      )
    )
      throw Error('EVENT_SHAPE')
    if (e.kind === 'TASK' && !/^\d+(?:\.\d+)+$/.test(e.task ?? '')) throw Error('TASK_ID')
    const paths = new Set(e.paths)
    if (paths.size !== e.paths.length || [...paths].some((p) => !inScope(m, p)))
      throw Error('EVENT_SCOPE')
    const changed = statusPaths(root, commands)
    if (changed.some((p) => !paths.has(p)) || !changed.includes(m.statusPath))
      throw Error('UNEXPECTED_WORKTREE_PATH')
    const staged = need(root, ['diff', '--cached', '--name-only'], commands)
      .split('\n')
      .filter(Boolean)
    if (staged.length) throw Error('UNEXPECTED_STAGED_PATH')
    let fresh = false
    for (const proof of e.evidence) {
      if (!paths.has(proof.path) || !hash64(proof.sha256)) throw Error('EVIDENCE_SCOPE')
      const bytes = plainFile(relativeFile(root, proof.path))
      if (sha(bytes) !== proof.sha256) throw Error('EVIDENCE_DRIFT')
      sensitive(bytes, proof.path)
      const prior = git(root, ['show', head + ':' + proof.path], commands)
      if (prior.exitCode !== 0 || sha(prior.stdout) !== proof.sha256) fresh = true
      if (
        e.kind === 'BLOCKER' &&
        !/(?:FAIL|BLOCKED|exitCode[^0-9]*[1-9])/i.test(bytes.toString('utf8'))
      )
        throw Error('BLOCKER_RAW_FAILURE')
    }
    if (!fresh) throw Error('NO_NEW_EVIDENCE')
    for (const path of paths) sensitive(plainFile(relativeFile(root, path)), path)
    checkAdmission(state, e, eventPath, manifestPath)
    const status = plainFile(relativeFile(root, m.statusPath)).toString('utf8')
    if (e.kind === 'BLOCKER' && !/FAIL|BLOCKED/.test(status)) throw Error('STATUS_NOT_BLOCKED')
    if (
      e.kind !== 'BLOCKER' &&
      /READY_FOR_(?:VERIFY|CLOSURE|ARCHIVE): YES/.test(status) &&
      !['STAGE', 'GATE'].includes(e.kind)
    )
      throw Error('UNSUPPORTED_CLOSURE_CLAIM')
    if (e.previousPublicationReceipt) {
      if (!hash40(e.previousPublicationReceipt)) throw Error('PREVIOUS_RECEIPT')
      const prior = join(receiptDir(control, m.id), e.previousPublicationReceipt + '.publish.json')
      if (
        readJson(prior).status !== 'PUBLISHED' ||
        !e.evidence.some((proof) =>
          plainFile(relativeFile(root, proof.path)).equals(plainFile(prior)),
        )
      )
        throw Error('PREVIOUS_RECEIPT_NOT_COPIED')
      const priorReceipt = readJson(prior)
      const statusText = plainFile(relativeFile(root, m.statusPath)).toString('utf8')
      if (
        !statusText.includes(priorReceipt.sourceSha) ||
        !statusText.includes(priorReceipt.verifiedRemoteSha)
      )
        throw Error('PREVIOUS_PUBLICATION_STATUS')
    }
    need(root, ['add', '--', ...e.paths], commands)
    const actual = need(root, ['diff', '--cached', '--name-only'], commands)
      .split('\n')
      .filter(Boolean)
    if (!actual.length || actual.some((p) => !paths.has(p))) throw Error('STAGING_MISMATCH')
    need(root, ['diff', '--cached', '--check'], commands)
    need(root, ['commit', '-m', e.message], commands)
    const checkpointSha = need(root, ['rev-parse', 'HEAD'], commands)
    const receiptPath = join(receiptDir(control, m.id), checkpointSha + '.checkpoint.json')
    const receipt = {
      schemaVersion: 1,
      status: 'CHECKPOINTED',
      id: m.id,
      sourceSha: head,
      checkpointSha,
      baseline: m.originalBaseline,
      authoritySha256,
      remote: a.remote,
      ref: a.ref,
      event: e,
      eventSha256: sha(plainFile(eventPath)),
      commands,
      atUtc: new Date().toISOString(),
    }
    writeOnce(receiptPath, receipt)
    return {
      ok: true,
      status: 'CHECKPOINTED',
      checkpointSha,
      receiptPath,
      publication: 'NOT_PUBLISHED',
    }
  } catch (error) {
    return blocked('CHECKPOINT', error.message, { commands })
  }
}
function exactRemoteSha(record, ref) {
  if (record.exitCode !== 0) throw Error('REMOTE_UNAVAILABLE')
  const rows = record.stdout.trim().split(/\r?\n/).filter(Boolean)
  if (rows.length !== 1) throw Error('REMOTE_REF_MISSING_OR_AMBIGUOUS')
  const parts = rows[0].split('\t')
  if (parts.length !== 2 || parts[1] !== ref || !hash40(parts[0]))
    throw Error('REMOTE_REF_MISMATCH')
  return parts[0]
}
export function publish(checkpointPath, options = {}) {
  const commands = []
  let target, receipt
  try {
    if (!isAbsolute(checkpointPath)) throw Error('CHECKPOINT_PATH')
    receipt = readJson(checkpointPath)
    if (
      receipt.schemaVersion !== 1 ||
      receipt.status !== 'CHECKPOINTED' ||
      !hash40(receipt.checkpointSha)
    )
      throw Error('CHECKPOINT_RECEIPT')
    const root = process.cwd(),
      manifestPath = join(root, 'docs/engineering/directions', receipt.id, 'direction.json')
    const state = ownerAndAuthority(manifestPath, commands, options)
    if (
      !same(
        checkpointPath,
        join(state.control, 'publication', state.m.id, receipt.checkpointSha + '.checkpoint.json'),
      ) ||
      receipt.id !== state.m.id ||
      receipt.baseline !== state.m.originalBaseline ||
      receipt.authoritySha256 !== state.authoritySha256 ||
      receipt.remote !== state.a.remote ||
      receipt.ref !== state.a.ref ||
      state.head !== receipt.checkpointSha
    )
      throw Error('CHECKPOINT_BINDING')
    target = join(receiptDir(state.control, state.m.id), receipt.checkpointSha + '.publish.json')
    if (existsSync(target)) throw Error('ALREADY_ATTEMPTED')
    if (statusPaths(root, commands).length) throw Error('WORKTREE_CHANGED')
    const remote = exactRemoteSha(
      git(root, ['ls-remote', state.a.remote, state.a.ref], commands),
      state.a.ref,
    )
    if (
      git(root, ['merge-base', '--is-ancestor', remote, receipt.checkpointSha], commands)
        .exitCode !== 0
    )
      throw Error('REMOTE_DIVERGED')
    const push = git(
      root,
      ['push', state.a.remote, receipt.checkpointSha + ':' + state.a.ref],
      commands,
    )
    if (push.exitCode !== 0) throw Error('PUSH_FAILED')
    const verifiedRemoteSha = exactRemoteSha(
      git(root, ['ls-remote', state.a.remote, state.a.ref], commands),
      state.a.ref,
    )
    if (verifiedRemoteSha !== receipt.checkpointSha) throw Error('REMOTE_SHA_MISMATCH')
    const output = {
      schemaVersion: 1,
      status: 'PUBLISHED',
      id: state.m.id,
      sourceSha: receipt.checkpointSha,
      baseline: state.m.originalBaseline,
      authoritySha256: state.authoritySha256,
      remote: state.a.remote,
      ref: state.a.ref,
      previousRemoteSha: remote,
      verifiedRemoteSha,
      commands,
      atUtc: new Date().toISOString(),
    }
    writeOnce(target, output)
    return {
      ok: true,
      status: 'PUBLISHED',
      checkpointSha: receipt.checkpointSha,
      verifiedRemoteSha,
      publicationReceiptPath: target,
    }
  } catch (error) {
    const output = blocked('PUBLISH', error.message, {
      sourceSha: receipt?.checkpointSha ?? null,
      commands,
      atUtc: new Date().toISOString(),
    })
    if (target && !existsSync(target)) {
      try {
        writeOnce(target, output)
      } catch {
        /* return raw result when storage failed */
      }
    }
    return output
  }
}
const direct = process.argv[1] && same(resolve(process.argv[1]), fileURLToPath(import.meta.url))
if (direct) {
  const [command, first, second, ...extra] = process.argv.slice(2)
  const result = extra.length
    ? blocked('ARGUMENTS', 'Unexpected arguments')
    : command === 'checkpoint' && first && second
      ? checkpoint(first, second)
      : command === 'publish' && first && !second
        ? publish(first)
        : blocked(
            'ARGUMENTS',
            'Use checkpoint <absolute-manifest> <absolute-event> or publish <absolute-checkpoint-receipt>',
          )
  process.stdout.write(JSON.stringify(result) + '\n')
  process.exitCode = result.ok ? 0 : 2
}
