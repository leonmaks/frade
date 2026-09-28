// Read-only repair-entry comparison; supplemental evidence, NOT an architecture gate.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
const root = fileURLToPath(new URL('../../../../', import.meta.url))
const snapshotPath = new URL('./planning-repair-entry-snapshot.json', import.meta.url)
const bytes = fs.readFileSync(snapshotPath)
const digest = data => createHash('sha256').update(data).digest('hex')
assert.equal(digest(bytes), '1a306ca7ec1df199e41351e750fd74942cf8c2c98aa1f00de899eb320d1e3a71')
const saved = JSON.parse(bytes.toString('utf8'))
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
assert.equal(git(['rev-parse', 'HEAD']).trim(), saved.head)
const inside = p => saved.metadata.includes(p) || saved.roots.some(r => p.startsWith(r + '/'))
const head = git(['ls-tree', '-rz', '--full-tree', 'HEAD']).split('\0').filter(Boolean).map(row => {
  const i = row.indexOf('\t'), [mode, type, oid] = row.slice(0, i).split(' ')
  return { path: row.slice(i + 1), mode, type, oid }
}).filter(row => inside(row.path))
const index = git(['ls-files', '--stage', '-z']).split('\0').filter(Boolean).map(row => {
  const i = row.indexOf('\t'), [mode, oid, stage] = row.slice(0, i).split(' ')
  return { path: row.slice(i + 1), mode, oid, stage }
}).filter(row => inside(row.path))
assert.deepEqual(head, saved.headEntries)
assert.deepEqual(index, saved.indexEntries)
const worktree = {}
function regularAncestors(relative) {
  const parts = relative.split('/')
  for (let i = 1; i <= parts.length; i++)
    assert.ok(!fs.lstatSync(path.join(root, ...parts.slice(0, i))).isSymbolicLink())
}
function visit(relative) {
  regularAncestors(relative)
  const full = path.join(root, relative), stat = fs.lstatSync(full)
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(full).sort()) visit(relative + '/' + name)
  } else {
    assert.ok(stat.isFile())
    const body = fs.readFileSync(full)
    worktree[relative] = { sha256: digest(body), bytes: body.length }
  }
}
saved.roots.concat(saved.metadata).forEach(visit)
assert.deepEqual(worktree, saved.worktree)
console.log(JSON.stringify({ result: 'PASS', worktreeFiles: Object.keys(worktree).length,
  headEntries: head.length, indexEntries: index.length, snapshotSha256: digest(bytes),
  meaning: 'Exact repair-entry product/test/dependency state retained; no gate approval implied.',
}, null, 2))
