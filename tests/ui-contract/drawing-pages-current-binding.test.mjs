import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readdirSync } from 'node:fs'
import { readDrawingPagesPublication } from './drawing-pages-publication.mjs'
import {
  evidenceOwner,
  safeBytes,
  sha256,
  verifyDrawingPagesCurrent,
} from './drawing-pages-current.mjs'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
function fixture() {
  const logical = evidenceOwner.slice(0, -'/evidence/'.length)
  const owners = [
    logical,
    ...readdirSync(resolve(root, 'openspec/changes/archive'))
      .filter((name) => /^\d{4}-\d{2}-\d{2}-frade-draw-multipage$/.test(name))
      .map((name) => 'openspec/changes/archive/' + name),
  ].filter((name) => existsSync(resolve(root, name + '/evidence/source-adoption-manifest.json')))
  assert.equal(owners.length, 1, 'one unambiguous evidence owner required')
  const read = (file) =>
    safeBytes(root, file.startsWith(logical + '/') ? owners[0] + file.slice(logical.length) : file)
  const raw = read(evidenceOwner + 'source-adoption-manifest.json')
  const pin = read('packages/ui-workspace/tests/ui-contract/drawing-pages-adoption-pin.ts')
    .toString()
    .match(/drawingPagesAdoptionManifestSha256\s*=\s*'([a-f0-9]{64})'/)?.[1]
  assert.equal(sha256(raw), pin, 'closed adoption manifest hash')
  const publication = readDrawingPagesPublication(root)
  return { manifest: publication.manifest, read: publication.read }
}
test('current multipage runtime reports bind the exact adopted closure and all 50 presentation cases', () => {
  const { manifest, read } = fixture()
  const result = verifyDrawingPagesCurrent(root, manifest, read)
  assert.equal(result.status, 'PASS')
  assert.equal(result.presentationCases, 50)
})
test('current multipage binding rejects live-source and report tamper without changing old proof', () => {
  const { manifest, read } = fixture(),
    source = manifest.currentInputs.find(
      (x) => x.file === 'packages/draw/src/editor/PageStrip.tsx',
    ).file
  assert.throws(
    () =>
      verifyDrawingPagesCurrent(root, manifest, (file) =>
        file === source ? Buffer.concat([read(file), Buffer.from('!')]) : read(file),
      ),
    /CURRENT_SOURCE_HASH/,
  )
  const report = manifest.executions[0].report.file
  assert.throws(
    () =>
      verifyDrawingPagesCurrent(root, manifest, (file) =>
        file === report ? Buffer.concat([read(file), Buffer.from(' ')]) : read(file),
      ),
    /CURRENT_REPORT_HASH/,
  )
  const build = manifest.desktopBuild.record.file
  assert.throws(
    () =>
      verifyDrawingPagesCurrent(root, manifest, (file) =>
        file === build ? Buffer.concat([read(file), Buffer.from(' ')]) : read(file),
      ),
    /CURRENT_BUILD_HASH/,
  )
})
