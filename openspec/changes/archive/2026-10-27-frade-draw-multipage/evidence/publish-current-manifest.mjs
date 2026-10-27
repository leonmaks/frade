import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { currentInputs, sourceSetSha256, sha256, verifyDrawingPagesCurrent, evidenceOwner, bootstrapPin, safeBytes } from '../../../../tests/ui-contract/drawing-pages-current.mjs'
import { publicationByteForms } from '../../../../tests/ui-contract/drawing-pages-adoption.mjs'
const root = process.cwd(), seed = JSON.parse(readFileSync(evidenceOwner + 'origin-plan-index.json'))
const selection = JSON.parse(readFileSync(evidenceOwner + 'execution-selection.json'))
const target = evidenceOwner + 'source-adoption-manifest.json'
if (existsSync(target)) throw Error('EXISTING_CLOSED_MANIFEST_REQUIRES_EXPLICIT_REVALIDATION')
const entries = seed.entries.map(entry => {
  if (sha256(safeBytes(root, entry.originalFile)) !== entry.originalSha256) throw Error('ORIGIN_SOURCE_HASH:' + entry.file)
  const forms = publicationByteForms(safeBytes(root, entry.file))
  return { file: entry.file, originalFile: entry.originalFile, originalSha256: entry.originalSha256, adoptedSha256: forms.sha256, canonicalSha256: forms.canonicalSha256, checkoutSha256: forms.checkoutSha256 }
})
const inputs = currentInputs(root)
const desktopBuild = JSON.parse(readFileSync(evidenceOwner + 'build-selection.json'))
const manifest = { version: 1, change: 'frade-draw-multipage', baseline: seed.baseline, meaning: 'Historical origin replay guarded by exact adopted bytes; current runtime evidence is independently bound below. Future publication byte forms are not claimed as executed.', trustedBootstrap: { excludedFromSelfDigest: bootstrapPin, independentReviewRequired: true }, entries, currentInputs: inputs, sourceSetSha256: sourceSetSha256(inputs), executions: selection.map(run => {
  if (!run.startsWith(evidenceOwner + 'current-execution/')) throw Error('FOREIGN_EXECUTION_PATH')
  return JSON.parse(readFileSync(run + '/execution.json'))
}) }
manifest.desktopBuild = desktopBuild
console.log(JSON.stringify(verifyDrawingPagesCurrent(root, manifest)))
const raw = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
writeFileSync(target, raw)
writeFileSync(bootstrapPin, "// Trusted bootstrap pin: reviewed separately; not included in its own source digest.\nexport const drawingPagesAdoptionManifestSha256 = '" + sha256(raw) + "'\n")
console.log(JSON.stringify({ status: 'PUBLISHED', file: target, sha256: sha256(raw), sourceSet: manifest.sourceSetSha256, origins: entries.length }))
