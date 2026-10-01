// Supplemental process integrity evidence, not independent PRE or a routing gate.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const source = 'E:/dev/codex/frade'
const expectedRoot = 'C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade'
assert.equal(path.resolve(root).toLowerCase(), path.resolve(expectedRoot).toLowerCase())
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const canonical = (bytes) => bytes.toString('utf8').replaceAll('\r\n', '\n')
const git = (args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
const base = '98f387f96b51b0ad139e3507c376ff1c3e8dec09'
assert.equal(git(['rev-parse', 'HEAD']).trim(), base)
assert.equal(git(['branch', '--show-current']).trim(), 'codex/frade-ui-design-contract')
const entryFile = path.join(
  source,
  'openspec/changes/frade-routing-ui-planning-coexistence/evidence/entry-2026-09-30.json',
)
const entryBytes = fs.readFileSync(entryFile)
assert.equal(digest(entryBytes), '6e0818b00342bd7705324445b2bbce9bda9638e66e89167aa518d4fab10365da')
const entry = JSON.parse(entryBytes.toString('utf8'))
let preserved = 0
for (const [relative, expected] of Object.entries(entry.worktree)) {
  if (
    relative.startsWith('openspec/changes/frade-') ||
    relative === 'AGENTS.md' ||
    relative === 'openspec/changes/routing-v2-04-orthogonal-router/tasks.md'
  )
    continue
  const bytes = fs.readFileSync(path.join(source, relative))
  assert.equal(digest(bytes), expected.sha256, 'Source changed: ' + relative)
  preserved++
}
const before = JSON.parse(
  fs.readFileSync(
    path.join(
      source,
      'openspec/changes/frade-ui-design-contract/evidence/parallel-process-before-2026-09-30.json',
    ),
    'utf8',
  ),
)
const oldRoot = Buffer.from(before.files.find((file) => file.path === 'AGENTS.md').base64, 'base64')
for (const workspace of [source, root]) {
  const text = canonical(fs.readFileSync(path.join(workspace, 'AGENTS.md')))
  assert.ok(text.startsWith(canonical(oldRoot).trimEnd() + '\n'), 'Prior rules changed')
  assert.equal(
    text.indexOf('## 18. Independent Feature Ownership'),
    text.lastIndexOf('## 18. Independent Feature Ownership'),
  )
  assert.ok(text.includes('## 18. Independent Feature Ownership'))
}
const oldTasks = canonical(
  Buffer.from(
    before.files.find((file) => file.path.endsWith('routing-v2-04-orthogonal-router/tasks.md'))
      .base64,
    'base64',
  ),
).match(/^- \[[ x]\] .+$/gm)
const newTasks = canonical(
  fs.readFileSync(path.join(source, 'openspec/changes/routing-v2-04-orthogonal-router/tasks.md')),
).match(/^- \[[ x]\] .+$/gm)
assert.deepEqual(newTasks.slice(0, oldTasks.length), oldTasks)
const excludedRoots = [
  'packages/draw/src/routing/orthogonal/router',
  'packages/draw/src/routing/normalization',
  'packages/draw/src/routing/validation',
  'packages/draw/tests/routing-v2/orthogonal',
]
for (const relative of excludedRoots)
  assert.ok(!fs.existsSync(path.join(root, relative)), 'Foreign R04 tree copied')
const unchanged = [
  'docs/routing-v2/CURRENT_CHANGE.md',
  'packages/draw/package.json',
  'pnpm-lock.yaml',
  'scripts/routing-v2-architecture-gate.mjs',
]
assert.equal(git(['diff', '--name-only', '--', ...unchanged]).trim(), '')
for (const name of ['draw', 'ui-workspace']) {
  const resolved = fs.realpathSync(path.join(root, 'apps/desktop/node_modules/@frade', name))
  assert.ok(
    resolved.toLowerCase().startsWith(path.resolve(root).toLowerCase() + path.sep),
    'Foreign workspace module: ' + name,
  )
}
const transfer = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      'openspec/changes/frade-ui-design-contract/evidence/ui-workspace-transfer-2026-09-30.json',
    ),
    'utf8',
  ),
)
for (const file of transfer.files) {
  // Current planning/process may evolve after transfer; input and historical evidence may not.
  if (
    file.path.startsWith(' _input/') ||
    (file.path.includes('/evidence/') &&
      !file.path.endsWith('parallel-process-before-2026-09-30.json'))
  ) {
    assert.equal(
      digest(fs.readFileSync(path.join(root, file.path))),
      file.sha256,
      'Transferred historical evidence changed',
    )
  }
}
console.log(
  JSON.stringify(
    {
      result: 'PASS',
      workspace: root,
      branch: 'codex/frade-ui-design-contract',
      base,
      sourceProtectedFilesPreserved: preserved,
      originalRoutingTaskAssertionsPreserved: oldTasks.length,
      foreignR04TreesAbsent: excludedRoots.length,
      routingControlMetadataAtBase: unchanged,
      existingEngineeringRulesPreserved: '1–17',
      workspaceImportsLocal: true,
      meaning: 'Feature isolation and historical integrity, not UI implementation/PRE acceptance.',
    },
    null,
    2,
  ),
)
