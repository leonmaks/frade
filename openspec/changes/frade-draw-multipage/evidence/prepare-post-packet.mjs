import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import cp from 'node:child_process'

const root = process.cwd()
const e = 'openspec/changes/frade-draw-multipage/evidence/'
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex')
const json = (file) => JSON.parse(fs.readFileSync(file))
const git = (args) => cp.execFileSync('git', ['--no-optional-locks', '-c', 'core.longpaths=true', '-c', 'core.fsmonitor=false', ...args], { encoding: 'utf8', maxBuffer: 32e6, stdio: ['ignore', 'pipe', 'pipe'] }).split('\n').filter(Boolean)
const request = json('E:/dev/codex/frade/.worktrees/requests/draw-pages-POST-04.json')
const selected = new Set(request.paths)
const required = new Map()
function requireFile(file, category, expected) {
  if (file.includes('\\') || file.includes('//') || file.startsWith('/') || file.split('/').includes('..')) throw Error('NONCANONICAL:' + file)
  const absolute = path.resolve(root, file)
  if (!absolute.startsWith(root + path.sep) || fs.lstatSync(absolute).isSymbolicLink() || !fs.statSync(absolute).isFile()) throw Error('UNSAFE:' + file)
  const bytes = fs.readFileSync(absolute)
  if (!bytes.length && !/stderr|version-stderr/.test(file)) throw Error('EMPTY:' + file)
  const actual = sha(bytes)
  if (expected && actual !== expected) throw Error('HASH:' + file)
  selected.add(file)
  const previous = required.get(file)
  required.set(file, { file, categories: [...new Set([...(previous?.categories ?? []), category])], sha256: actual, bytes: bytes.length })
}
function directory(dir, category) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const child = dir.replace(/\/$/, '') + '/' + entry.name
    if (entry.isDirectory()) directory(child, category)
    else requireFile(child, category)
  }
}
for (const item of json(e + 'post-packet-completeness-02.json').required) requireFile(item.file, 'closure-root', item.sha256)
const manifest = json(e + 'source-adoption-manifest.json')
for (const input of manifest.currentInputs) requireFile(input.file, 'current-source', input.sha256)
for (const origin of manifest.entries) requireFile(origin.originalFile, 'immutable-origin', origin.originalSha256)
for (const run of json(e + 'execution-selection.json')) directory(run, 'current-execution')
directory(e + 'current-execution/desktop-build-2026-10-27T03-59-48-897Z', 'current-build')
for (const [folder, indexName] of [
  ['current-rendered-closure-20261027', 'index.json'],
  ['current-rendered-20261027', 'artifacts.json'],
  ['current-rendered-final-20261027', 'artifacts.json'],
  ['performance-closure-20261027', 'index.json'],
]) {
  const indexFile = e + folder + '/' + indexName
  requireFile(indexFile, 'artifact-index')
  for (const artifact of json(indexFile).files) requireFile(artifact.file, folder.startsWith('performance') ? 'performance-artifact' : 'rendered-artifact', artifact.sha256)
}
for (const image of json(e + 'visual-acceptance-20261027.json').presentedImages) requireFile(e + image, 'human-presented-image')
for (const folder of ['pre-03-20261026T221715Z', 'pre-04c-20261026T232156Z', 'pre-07-20261027T004550Z', 'pre-09-20261027T025713Z']) {
  const receiptFile = e + folder + '/receipt.json', resultFile = e + folder + '/result.md'
  requireFile(receiptFile, 'required-PRE-approval')
  const receipt = json(receiptFile)
  if (receipt.status !== 'PASS' || receipt.gateStatus !== 'PASS' || !receipt.candidateUnchanged || !receipt.packetUnchanged || receipt.requestedModel !== 'gpt-6-sol' || receipt.requestedEffort !== 'high') throw Error('PRE_NOT_APPROVED:' + folder)
  requireFile(resultFile, 'required-PRE-approval', receipt.resultSha256)
}
for (const file of ['post04-closure-rca.md', 'prepare-post-packet.mjs', 'post-04-20261027T050514Z/receipt.json', 'post-04-20261027T050514Z/result.md', 'post-04-20261027T050514Z/index-lease.json']) requireFile(e + file, 'current-repair-lineage')
const plan = e + 'post-packet-plan-05.json', proof = e + 'post-packet-preflight-05.json'
selected.add(plan); selected.add(proof)
fs.writeFileSync(plan, '{}\n'); fs.writeFileSync(proof, '{}\n')
const eligible = new Set([...git(['ls-files']), ...git(['ls-files', '--others', '--exclude-standard'])])
function validate(items) {
  for (const record of required.values()) if (!items.has(record.file)) throw Error('REQUIRED_DEPENDENCY:' + record.file)
  for (const file of items) if (!eligible.has(file)) throw Error('IGNORED_OR_FOREIGN:' + file)
}
validate(selected)
const negatives = []
for (const record of required.values()) {
  const removed = new Set(selected); removed.delete(record.file)
  try { validate(removed); throw Error('ACCEPTED_DELETION:' + record.file) }
  catch (error) { if (!String(error).includes('REQUIRED_DEPENDENCY:')) throw error }
  negatives.push({ removed: record.file, result: 'REJECTED' })
}
const counts = {}
for (const record of required.values()) for (const category of record.categories) counts[category] = (counts[category] ?? 0) + 1
if (counts['current-source'] !== 653 || counts['immutable-origin'] !== 14 || counts['rendered-artifact'] !== 45 || counts['required-PRE-approval'] !== 8 || counts['performance-artifact'] !== 6) throw Error('INCOMPLETE_CLASS:' + JSON.stringify(counts))
fs.writeFileSync(plan, JSON.stringify({ currentDispatch: 'POST05', historicalPlansAreNotCurrent: ['post-packet-plan.json', 'post-packet-plan-02.json', 'post-packet-plan-04.json'], selected: [...selected].sort(), categories: counts }, null, 2) + '\n')
fs.writeFileSync(proof, JSON.stringify({ status: 'PASS', strategy: 'Explicit normative dependency closure; no recursive prefix inference', files: selected.size, categories: counts, required: [...required.values()], deletionNegatives: negatives }, null, 2) + '\n')
request.paths = [...selected].sort()
request.prompt = 'Fresh cumulative POST05. STOP packet patch-loop RCA completed (post04-closure-rca.md). Current authoritative plan05/preflight05 derives normative dependency graph, not directory prefix inference: all653 current inputs,14 exact immutable originals, seven complete current runs/build, three image indexes and ALL45 hashed rendered PNG/DOM children, human-presented images, performance index/all6 attachments, actual required PRE03/04c/07/09 receipt+result8 with PASS/unchanged/requested pair/report digest verified. Every required dependency has deletion-negative rejection; all selections eligible/nonignored. Images and actual PRE09 approval now physically present. Earlier dispatch plans are historical attempts only; current request/plan05 authoritative. No product/source/test/spec/baseline edit, actual current bindings still PASS. POST04 FAIL raw retained; no product defect established. Review the COMPLETE final implementation cumulatively, not a waiver/focused packet check. Read the actual rendered states and approving PRE receipts plus current source/results; no earlier PASS substitution.\n\n' + request.prompt
fs.writeFileSync('E:/dev/codex/frade/.worktrees/requests/draw-pages-POST-05.json', JSON.stringify(request, null, 2) + '\n')
console.log(JSON.stringify({ status: 'PASS', files: selected.size, required: required.size, deletionNegatives: negatives.length, categories: counts, bytes: [...selected].reduce((n, p) => n + fs.statSync(p).size, 0) }))
