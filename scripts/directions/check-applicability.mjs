#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { safeId } from './contracts.mjs'

const protectedPaths = [
  'packages',
  'apps',
  'pnpm-lock.yaml',
  'docs/routing-v2',
  'vendor',
  'scripts/routing-v2-architecture-gate.mjs',
]
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const blocked = (detail) => ({
  ok: false,
  status: 'BLOCKED',
  code: 'APPLICABILITY',
  detail,
  productChecks: 'NOT_RUN',
})
function git(root, ...args) {
  const run = spawnSync(
    'git',
    ['-c', 'core.fsmonitor=false', '-c', 'core.useBuiltinFSMonitor=false', ...args],
    { cwd: root, encoding: 'utf8' },
  )
  if (run.error || run.signal || run.status !== 0)
    throw new Error(
      `git ${args.join(' ')}: status=${run.status} signal=${run.signal} error=${run.error?.code ?? 'none'} stderr=${run.stderr?.trim() ?? ''}`,
    )
  return run.stdout.trim()
}

export function checkApplicability({ root } = {}) {
  try {
    root = resolve(root)
    const planBytes = readFileSync(resolve(root, 'docs/engineering/check-applicability.json'))
    const plan = JSON.parse(planBytes)
    if (
      plan.version !== 1 ||
      !safeId(plan.owner) ||
      plan.decidedBeforeExecution !== true ||
      !/^[a-f0-9]{40}$/.test(plan.baseline)
    )
      throw new Error('INVALID_APPLICABILITY_PLAN')
    if (
      !Array.isArray(plan.required) ||
      !plan.required.includes('direction-controls') ||
      !Array.isArray(plan.notApplicable) ||
      plan.notApplicable.some((x) => !x.family || !x.reason)
    )
      throw new Error('INCOMPLETE_APPLICABILITY_PLAN')
    const manifest = JSON.parse(
      readFileSync(
        resolve(root, `docs/engineering/directions/${plan.owner}/direction.json`),
        'utf8',
      ),
    )
    if (manifest.id !== plan.owner || manifest.originalBaseline !== plan.baseline)
      throw new Error('BASELINE_MISMATCH')
    if (
      plan.owner === 'frade-standard-workflow' &&
      plan.baseline !== '98f387f96b51b0ad139e3507c376ff1c3e8dec09'
    )
      throw new Error('W01_BASELINE_DRIFT')
    git(root, 'cat-file', '-e', `${plan.baseline}^{commit}`)
    const committed = git(
      root,
      'diff',
      '--name-only',
      plan.baseline,
      'HEAD',
      '--',
      ...protectedPaths,
    )
    const working = git(
      root,
      'status',
      '--porcelain=v1',
      '--untracked-files=all',
      '--',
      ...protectedPaths,
    )
    if (committed || working)
      throw new Error(`PROTECTED_TREE_CHANGED committed=${committed} working=${working}`)
    const tree = git(root, 'ls-tree', '-r', 'HEAD', '--', ...protectedPaths)
    return {
      ok: true,
      status: 'APPLICABILITY_PROVEN',
      baseline: plan.baseline,
      sourceHead: git(root, 'rev-parse', 'HEAD'),
      planSha256: sha256(planBytes),
      protectedTreeSha256: sha256(tree),
      protectedPaths,
      notApplicable: plan.notApplicable.map((x) => x.family),
      productChecks: 'NOT_RUN',
    }
  } catch (error) {
    return blocked(error.message)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
  const result = checkApplicability({ root })
  process.stdout.write(`${JSON.stringify(result)}\n`)
  if (!result.ok) process.exitCode = 2
}
