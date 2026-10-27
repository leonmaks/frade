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
// Current root records were explicitly revalidated after POST05; preserve old proof unchanged.
for (const item of json(e + 'post-packet-completeness-02.json').required) requireFile(item.file, 'closure-root')
for (const file of ['manifest-revalidation-02.json', 'repair-runtime-batch-progress.json', 'provisional-capture-rca.md', 'provisional-capture-red-04.json', 'provisional-capture-red-04-execution.json', 'provisional-capture-green-06.json', 'provisional-capture-green-06-execution.json', 'provisional-capture-green05-fixture-assessment.md', 'post05-repair-visual-continuity.json', 'post05-reference-pixel-analysis.json', 'post-validation-02.json', 'verify-repair-apply-stdout.json', 'verify-repair-status-stdout.json', 'revalidate-current-manifest-02.mjs', 'run-repair-runtime-batch.mjs', 'record-repair-root-check.mjs', 'root-check-execution-02.json']) requireFile(e + file, 'repair-current-closure')
const validation = json(e + 'post-validation-02.json')
if (validation.status !== 'PASS' || validation.actualExit !== 0 || !validation.unchanged) throw Error('CURRENT_STRICT_VALIDATION')
for (const artifact of validation.outputs) requireFile(artifact.file, 'current-strict-output', artifact.sha256)
for (const artifact of validation.after) requireFile(artifact.file, 'validated-current-plan', artifact.sha256)
const rootCheck = json(e + 'root-check-execution-02.json')
if (rootCheck.status !== 'PASS' || rootCheck.actualExit !== 0) throw Error('CURRENT_ROOT_FAILURE')
for (const artifact of [rootCheck.stdout, rootCheck.stderr, rootCheck.manifest]) requireFile(artifact.file, 'current-root-bound-artifact', artifact.sha256)
const manifest = json(e + 'source-adoption-manifest.json')
const revalidation = json(e + 'manifest-revalidation-02.json')
if (revalidation.current.sha256 !== sha(fs.readFileSync(e + 'source-adoption-manifest.json')) || revalidation.current.sourceSet !== manifest.sourceSetSha256 || rootCheck.sourceSetBefore !== manifest.sourceSetSha256 || rootCheck.sourceSetAfter !== manifest.sourceSetSha256) throw Error('CURRENT_REVALIDATION_DRIFT')
requireFile('packages/ui-workspace/tests/ui-contract/drawing-pages-adoption-pin.ts', 'trusted-bootstrap')
directory(e + 'candidate-01-before-post05-repair', 'previous-candidate')
for (const input of manifest.currentInputs) requireFile(input.file, 'current-source', input.sha256)
for (const origin of manifest.entries) requireFile(origin.originalFile, 'immutable-origin', origin.originalSha256)
for (const run of json(e + 'execution-selection.json')) directory(run, 'current-execution')
directory(e + 'current-execution/desktop-build-2026-10-27T03-59-48-897Z', 'current-build')
for (const [folder, indexName] of [
  ['current-rendered-closure-20261027', 'index.json'],
  ['current-rendered-20261027', 'artifacts.json'],
  ['current-rendered-final-20261027', 'artifacts.json'],
  ['performance-closure-20261027', 'index.json'],
  ['current-rendered-repair-20261027', 'index.json'],
  ['performance-repair-20261027', 'index.json'],
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
for (const file of ['post04-closure-rca.md', 'prepare-post-packet.mjs', 'prepare-post-packet-06.mjs', 'post-04-20261027T050514Z/receipt.json', 'post-04-20261027T050514Z/result.md', 'post-04-20261027T050514Z/index-lease.json', 'post-05-20261027T051527Z/receipt.json', 'post-05-20261027T051527Z/result.md', 'post-05-20261027T051527Z/index-lease.json']) requireFile(e + file, 'current-repair-lineage')
const plan = e + 'post-packet-plan-06.json', proof = e + 'post-packet-preflight-06.json'
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
if (counts['current-source'] !== 653 || counts['immutable-origin'] !== 14 || counts['rendered-artifact'] !== 60 || counts['required-PRE-approval'] !== 8 || counts['performance-artifact'] !== 12) throw Error('INCOMPLETE_CLASS:' + JSON.stringify(counts))
fs.writeFileSync(plan, JSON.stringify({ currentDispatch: 'POST06', historicalPlansAreNotCurrent: ['post-packet-plan.json', 'post-packet-plan-02.json', 'post-packet-plan-04.json', 'post-packet-plan-05.json'], selected: [...selected].sort(), categories: counts }, null, 2) + '\n')
fs.writeFileSync(proof, JSON.stringify({ status: 'PASS', strategy: 'Explicit normative dependency closure; no recursive prefix inference', files: selected.size, categories: counts, required: [...required.values()], deletionNegatives: negatives }, null, 2) + '\n')
request.paths = [...selected].sort()
request.prompt = `Independent fresh cumulative POST06 and Architecture Gate; exact approved gpt-6-sol/high. Read only confined packet, no modifications/network/apps. Review complete native Draw pages implementation against approved proposal/design/spec/tasks and shared UI/architecture/test-integrity contracts. Any correctness/architecture/incomplete-essential-evidence blocker means FAIL. End exactly one standalone GATE_STATUS: PASS or GATE_STATUS: FAIL.

Start at current evidence/verification-report.md, ui-compliance-report.md, source-adoption-manifest.json, manifest-revalidation-02.json, root-check-execution-02.json, execution-selection.json, post-validation-02.json, post-packet-plan-06.json/preflight06 within openspec/changes/frade-draw-multipage. Current sourceSet ${manifest.sourceSetSha256}, manifest ${revalidation.current.sha256}. All653 current sources unchanged before/after seven fresh executions:237 Draw unit,21 runtime,319 workspace direct,236 complete Draw browser,12 desktop diagrams,47 unchanged approved presentation cases and3 original performance cases =875 actual passing cases, no skips/retries. New desktop build9 outputs bound before/after; full actual pnpm check exit0 after publication on same sourceSet, raw stdout/stderr selected. Current strict openspec.cmd1.14.3 validation exit0 with exact current four artifact hashes. Historical PASS remains historical, never new-candidate evidence.

POST05 actual FAIL established session correctness blocker: capture assigned invalid provisional graph before late validation, allowing page navigation/mutation to lose it. Raw result/receipt retained. Explicit phase change to regression-first repair under SAME already-approved invalid-operation rejection requirement; no spec/scope/permission change. See provisional-capture-rca.md and actual RED04 before production (both cases explicitly show select wrongly accepted). Current capture validates through existing complete parser BEFORE assignment; undo/redo/setName also enter guard. Two new real-X6 provisional source/target tests exercise13 transitions with nonempty past/future, exact page/view/generation/live cell identities/selection/viewport/history preservation; cancellation snapshot byte equality and subsequent Undo/Redo work. Existing7 session cases remain intact; all9 GREEN and full236 browser plus all fresh desktop/root regressions PASS. GREEN05 fixture viewport mismatch preserved; viewport setup moved before historical insertion without weakening any exact assertion, no further production repair. No routing/serializer/domain algorithm/style change.

Explicit revalidation guarded old raw manifest02f73a... preserved in candidate-01-before-post05-repair, exact only-two changed source files, all14 immutable origins and approved adoption entries unchanged, all7 new complete records before updating current manifest and separately reviewed trusted bootstrap pin. Producer/audit/old source2/old manifest/pin/selections/reports and prior proof copies selected. No silent baseline movement or historical assertion/report pin change. Source boundary correction remains exact existing @frade/draw/document for ui-workspace only, not package dependency/private/deeper/escape/privileged grants. Original validated loader/documentRestore and finally-restored history render scheduling remain unchanged by repair.

Complete original scope: pure v1/v2 ordered pages/legacy API, stable X6 chronological graph/page history, complete standalone/runtime/repository Save/Open/Discard/dirty, readonly/generation invalidation, shared source-derived32px footer/menus/Rename/drag/Move/sort/clear/overflow/keyboard, standalone selected-page extraction and bounded one-shot popup, host managed overlays/existing appearance ownership. Pinned unmodified Draw.io31.5.2 local source/fonts/platform/viewport comparison with actual images and DOM data. All60 indexed rendered PNG/JSON children across prior and fresh runs physically selected and hashed; human-presented originals and explicit acceptance selected. Fresh native visuals exact byte-identical; only reference CSS server-port metadata and4 reference pixels outside footer differ, explicit analysis retained. AA deltas options24vs20(+4 active advance), label31vs17 hit area exact glyph, Rename field24vs21/actions+3, close24vs20/source center, contrasting focus/coarse44/text200/system colors accepted/documented. No full-screen/cross-OS raster-equality or manual AT certification claim. External theme/density isolation follows existing approved editor Light presentation contract. Both fresh original20-warmup/100-request workloads p95116.30/83.30ms<=150; all12 prior/fresh performance attachments selected.

Actual required PRE03(product),PRE04c(extraction),PRE07(controls),PRE09(facade) PASS receipt/result8 hashes independently checked, requested sol/high; actual backend/effort NOT_CONFIRMED per shared policy. All previous completed FAIL/preparation BLOCKED preserved as history; earlier dispatch plans/preflights are historical, current06 authoritative. Complete normative graph preflight includes required sources/origins/current runs/build/roots/images/approvals, rejects deletion of every required dependency, all selected paths eligible. No unchecked essential file inferred from dashboard. Two task checkboxes5.3/C4 include this POST and checkpoint itself, deliberately pending until actual receipt/commit; no unimplemented product task. No archive/next change/push/main merge. Index read lease protects exact own index while unchanged immutable runner proves confinement and hashes; lease finally releases. Assess complete implementation cumulatively, not merely repair or machine PASS.\n`
fs.writeFileSync('E:/dev/codex/frade/.worktrees/requests/draw-pages-POST-06.json', JSON.stringify(request, null, 2) + '\n')
console.log(JSON.stringify({ status: 'PASS', files: selected.size, required: required.size, deletionNegatives: negatives.length, categories: counts, bytes: [...selected].reduce((n, p) => n + fs.statSync(p).size, 0) }))
