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
if (!['plan', 'create', 'check', 'status'].includes(command)) {
  result = {
    ok: false,
    status: 'NOT_IMPLEMENTED',
    code: 'COMMAND_NOT_IMPLEMENTED',
    detail: 'Supported: plan, create, check, status. Other workflow commands require later tasks.',
  }
} else if (!path || (command === 'status' ? extra.length > 1 || (extra.length === 1 && extra[0] !== '--write') : extra.length) || !isAbsolute(path)) {
  result = blocked('ARGUMENTS', 'One absolute JSON request or manifest path required')
} else {
  try {
    if (command === 'check') result = await checkDirection(path)
    else if (command === 'status') {
      const checked = await checkDirection(path)
      if (!checked.ok) result = checked
      else {
        const bytes = await readFile(path)
        const manifest = JSON.parse(bytes)
        const root = manifest.owner.worktree
        const tracked = spawnSync('git', [
          '-c', 'core.autocrlf=false', '-c', 'core.longpaths=true',
          'ls-files', '--error-unmatch', '--', relative(root, path),
        ], { cwd: root, encoding: 'utf8' })
        if (tracked.status !== 0) throw new Error('MANIFEST_NOT_TRACKED')
        const reader = createArtifactReader(root)
        const change = manifest.stages.find((s) => s.phase !== 'CLOSED')?.change ?? manifest.stages.at(-1).change
        let tasksText = '', trace
        const sourceIssues = []
        try { tasksText = (await reader.read(`openspec/changes/${change}/tasks.md`)).bytes.toString('utf8') } catch { sourceIssues.push({ code: 'TASK_SOURCE_UNAVAILABLE', path: `openspec/changes/${change}/tasks.md` }) }
        try { trace = JSON.parse((await reader.read(`openspec/changes/${change}/traceability.json`)).bytes) } catch { sourceIssues.push({ code: 'TRACE_SOURCE_UNAVAILABLE', path: `openspec/changes/${change}/traceability.json` }) }
        const snapshot = { sourceSha256: createHash('sha256').update(bytes).digest('hex'), configSha256: manifest.policy.sha256 }
        result = await refreshStatus({ manifest, ownerRoot: root, tasksText, trace, sourceIssues, snapshot, updatedAt: new Date().toISOString(), write: extra[0] === '--write' })
      }
    }
    else {
      const request = JSON.parse(await readFile(path, 'utf8'))
      result = command === 'plan' ? await planDirection(request) : await createDirection(request)
    }
  } catch (error) {
    result = blocked('INPUT', error.message)
  }
}
process.stdout.write(`${JSON.stringify(result)}\n`)
process.exitCode = result.ok ? 0 : 2
