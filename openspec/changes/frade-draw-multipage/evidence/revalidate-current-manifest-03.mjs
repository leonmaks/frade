import fs from 'node:fs'
import { currentInputs, sourceSetSha256, sha256, verifyDrawingPagesCurrent, evidenceOwner as e, bootstrapPin, safeBytes } from '../../../../tests/ui-contract/drawing-pages-current.mjs'
import { publicationByteForms } from '../../../../tests/ui-contract/drawing-pages-adoption.mjs'

const root = process.cwd(), target = e + 'source-adoption-manifest.json'
const previousFile = e + 'candidate-02-before-feedback-repair/' + target
const previousRaw = fs.readFileSync(previousFile), previousSha = '4478e1269b21dc0f5bf21e72051d09f69293fa0c2a6aa4ed4e2f3621c0b9c059'
if (sha256(previousRaw) !== previousSha || sha256(fs.readFileSync(target)) !== previousSha) throw Error('PREVIOUS_MANIFEST_CHANGED_OR_ALREADY_REVALIDATED')
if (fs.existsSync(e + 'manifest-revalidation-03.json')) throw Error('IMMUTABLE_REVALIDATION_EXISTS')
const previous = JSON.parse(previousRaw), inputs = currentInputs(root)
const allowed = ['packages/draw/src/editor/drawingSession.ts', 'packages/draw/tests/spike/drawing-session.spec.ts']
const changed = inputs.filter(input => previous.currentInputs.find(old => old.file === input.file)?.sha256 !== input.sha256).map(input => input.file).sort()
if (inputs.length !== previous.currentInputs.length || JSON.stringify(changed) !== JSON.stringify(allowed.sort())) throw Error('UNAUTHORIZED_SOURCE_DELTA')
for (const entry of previous.entries) {
  if (sha256(safeBytes(root, entry.originalFile)) !== entry.originalSha256) throw Error('ORIGIN_DRIFT')
  if (publicationByteForms(safeBytes(root, entry.file)).sha256 !== entry.adoptedSha256) throw Error('HISTORICAL_ADOPTION_CHANGED')
}
const progress = JSON.parse(fs.readFileSync(e + 'feedback-runtime-batch-progress.json'))
if (progress.status !== 'PASS' || progress.sourceSet !== sourceSetSha256(inputs) || progress.completed.length !== 8) throw Error('FRESH_COMPLETE_RUNTIME_REQUIRED')
const selection = JSON.parse(fs.readFileSync(e + 'execution-selection.json'))
if (selection.length !== 7 || JSON.stringify(selection) !== JSON.stringify(progress.selection)) throw Error('EXECUTION_SELECTION_DRIFT')
const manifest = {
  ...previous,
  meaning: previous.meaning + ' Explicit Native history feedback boundary repair revalidation; previous candidate preserved under candidate-02-before-feedback-repair.',
  currentInputs: inputs,
  sourceSetSha256: sourceSetSha256(inputs),
  executions: selection.map(run => JSON.parse(fs.readFileSync(run + '/execution.json'))),
  desktopBuild: JSON.parse(fs.readFileSync(e + 'build-selection.json')),
}
const result = verifyDrawingPagesCurrent(root, manifest)
const raw = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
const pinBefore = sha256(fs.readFileSync(bootstrapPin))
fs.writeFileSync(target, raw)
fs.writeFileSync(bootstrapPin, "// Trusted bootstrap pin: reviewed separately; not included in its own source digest.\nexport const drawingPagesAdoptionManifestSha256 = '" + sha256(raw) + "'\n")
if (sourceSetSha256(currentInputs(root)) !== manifest.sourceSetSha256) throw Error('SOURCE_CHANGED_DURING_PUBLICATION')
fs.writeFileSync(e + 'manifest-revalidation-03.json', JSON.stringify({ status: 'PASS', reason: 'Native history feedback completion within approved session contract', previous: { file: previousFile, sha256: previousSha }, current: { file: target, sha256: sha256(raw), sourceSet: manifest.sourceSetSha256 }, changedSourceFiles: changed, unchangedHistoricalOrigins: previous.entries.length, pin: { file: bootstrapPin, before: pinBefore, after: sha256(fs.readFileSync(bootstrapPin)), excludedFromSelfDigest: true, independentPOSTRequired: true }, result }, null, 2) + '\n')
console.log(JSON.stringify({ status: 'REVALIDATED', ...result, sha256: sha256(raw), sourceSet: manifest.sourceSetSha256 }))
