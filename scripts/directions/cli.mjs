#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import { checkDirection, createDirection, planDirection } from './bootstrap.mjs'
import { refreshStatus } from './status.mjs'
import { createArtifactReader } from './evidence.mjs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { relative } from 'node:path'

const blocked = (code, detail) => ({ ok: false, status: 'BLOCKED', code, detail })
const [command, path, ...extra] = process.argv.slice(2)
let result
if (
  ![
    'plan',
    'create',
    'check',
    'status',
    'review/prepare',
    'review',
    'checkpoint',
    'publish',
  ].includes(command)
) {
  result = {
    ok: false,
    status: 'NOT_IMPLEMENTED',
    code: 'COMMAND_NOT_IMPLEMENTED',
    detail:
      'Supported: plan, create, check, status, review/prepare, review, checkpoint, publish. Other workflow commands require later tasks.',
  }
} else if (
  !path ||
  (command === 'status'
    ? extra.length > 1 || (extra.length === 1 && extra[0] !== '--write')
    : ['review/prepare', 'review'].includes(command)
      ? extra.length !== 2 || !['PRE', 'POST'].includes(extra[0]) || !isAbsolute(extra[1])
      : command === 'checkpoint'
        ? extra.length !== 1 || !isAbsolute(extra[0])
        : extra.length) ||
  !isAbsolute(path)
) {
  result = blocked('ARGUMENTS', 'One absolute JSON request or manifest path required')
} else {
  try {
    if (command === 'checkpoint' || command === 'publish') {
      const { checkpoint, publish } = await import('./publication.mjs')
      result = command === 'checkpoint' ? checkpoint(path, extra[0]) : publish(path)
    } else if (['review/prepare', 'review'].includes(command)) {
      const { prepareReview, runProductionReview } = await import('./review.mjs')
      const manifest = JSON.parse(await readFile(path, 'utf8'))
      const request = JSON.parse(await readFile(extra[1], 'utf8'))
      if (request.phase !== extra[0])
        result = blocked('PHASE_MISMATCH', 'Explicit physical PRE/POST must match request')
      else {
        const options = {
          manifest,
          request,
          root: manifest.owner?.worktree,
          expectedCommon: 'E:/dev/codex/frade/.git',
          requestPath: extra[1],
        }
        result =
          command === 'review/prepare'
            ? await prepareReview(options)
            : await runProductionReview(options)
      }
    } else if (command === 'check') result = await checkDirection(path)
    else if (command === 'status') {
      const checked = await checkDirection(path)
      if (!checked.ok) result = checked
      else {
        const bytes = await readFile(path)
        const manifest = JSON.parse(bytes)
        const root = manifest.owner.worktree
        const tracked = spawnSync(
          'git',
          [
            '-c',
            'core.autocrlf=false',
            '-c',
            'core.longpaths=true',
            'ls-files',
            '--error-unmatch',
            '--',
            relative(root, path),
          ],
          { cwd: root, encoding: 'utf8' },
        )
        if (tracked.status !== 0) throw new Error('MANIFEST_NOT_TRACKED')
        const reader = createArtifactReader(root)
        const change =
          manifest.stages.find((s) => s.phase !== 'CLOSED')?.change ?? manifest.stages.at(-1).change
        let tasksText = '',
          trace
        const sourceIssues = []
        try {
          tasksText = (await reader.read(`openspec/changes/${change}/tasks.md`)).bytes.toString(
            'utf8',
          )
        } catch {
          sourceIssues.push({
            code: 'TASK_SOURCE_UNAVAILABLE',
            path: `openspec/changes/${change}/tasks.md`,
          })
        }
        try {
          trace = JSON.parse(
            (await reader.read(`openspec/changes/${change}/traceability.json`)).bytes,
          )
        } catch {
          sourceIssues.push({
            code: 'TRACE_SOURCE_UNAVAILABLE',
            path: `openspec/changes/${change}/traceability.json`,
          })
        }
        const snapshot = {
          sourceSha256: createHash('sha256').update(bytes).digest('hex'),
          configSha256: manifest.policy.sha256,
        }
        result = await refreshStatus({
          manifest,
          ownerRoot: root,
          tasksText,
          trace,
          sourceIssues,
          snapshot,
          updatedAt: new Date().toISOString(),
          write: extra[0] === '--write',
        })
      }
    } else {
      const request = JSON.parse(await readFile(path, 'utf8'))
      result = command === 'plan' ? await planDirection(request) : await createDirection(request)
    }
  } catch (error) {
    result = blocked('INPUT', error.message)
  }
}
process.stdout.write(`${JSON.stringify(result)}\n`)
process.exitCode = result.status === 'FAIL' ? 1 : result.ok ? 0 : 2
