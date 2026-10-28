import { afterEach, expect, it } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, realpathSync, statSync, rmSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { createDrawingPagesOriginReader, readDrawingPagesOrigin, drawingPagesOriginScope } from './drawing-pages-origin'
import { drawingPagesAdoptionManifestSha256 } from './drawing-pages-adoption-pin'

const repository = fileURLToPath(new URL('../../../../', import.meta.url))
const file = 'packages/ui-workspace/tests/ui-contract/presentation-staging-refusal-adoption.json'
const oldFile = 'packages/ui-workspace/tests/ui-contract/presentation-staging-adoption.json'
const manifestFile = 'openspec/changes/archive/2026-10-27-frade-draw-multipage/evidence/source-adoption-manifest.json'
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
type Entry = { file: string; predecessor: { sha256: string; canonicalSha256: string; form: 'LF' | 'CRLF' | 'RAW_BASE64'; sourceBase64?: string }; adoptedCanonicalSha256: string; hunks: Array<{ before: string; after: string }> }
type Adoption = { authority: { file: string; sha256: string }; previousStaging: { file: string; sha256: string }; entries: Entry[] }
const roots: Array<{ root: string; ino: number; dev: number }> = []
afterEach(() => {
  for (const { root, ino, dev } of roots.splice(0)) {
    const info = statSync(root)
    if (info.ino !== ino || info.dev !== dev || dirname(root) !== realpathSync(tmpdir()) || !basename(root).startsWith('frade-refusal-origin-')) throw Error('UNSAFE_REFUSAL_ORIGIN_CLEANUP')
    rmSync(root, { recursive: true, force: true })
  }
})
function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'frade-refusal-origin-'))), identity = statSync(root)
  roots.push({ root, ino: identity.ino, dev: identity.dev })
  const put = (name: string, bytes: Buffer | string) => { const target = join(root, name); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, bytes) }
  const raw = readFileSync(join(repository, file)), adoption = JSON.parse(raw.toString()) as Adoption
  expect(sha(raw)).toBe('e302b2da3ec9679dc656120958658891dae486a76c90a321e0ab5b2f3e813c6b')
  put(file, raw)
  for (const name of [adoption.authority.file, oldFile, manifestFile]) put(name, readFileSync(join(repository, name)))
  const old = JSON.parse(readFileSync(join(repository, oldFile), 'utf8')) as { entries: Array<{ file: string; predecessor: { sourceBase64: string; sha256: string } }> }
  const ledger = JSON.parse(readFileSync(join(repository, adoption.authority.file), 'utf8')) as { inputs: Array<{ file: string; sha256: string }> }
  const live = (entry: Entry) => readFileSync(join(repository, entry.file)).toString().replaceAll('\r\n', '\n')
  for (const entry of adoption.entries) put(entry.file, live(entry))
  const read = createDrawingPagesOriginReader({ root, owner: 'openspec/changes/archive/2026-10-27-frade-draw-multipage', manifest: readFileSync(join(repository, manifestFile)), expectedSha256: drawingPagesAdoptionManifestSha256 })
  const expected = (entry: Entry) => old.entries.find(candidate => candidate.file === entry.file)?.predecessor.sha256 ?? ledger.inputs.find(candidate => candidate.file === entry.file)!.sha256
  return { root, put, raw, adoption, old, ledger, live, read, expected }
}

it('staging refusal origin composes the exact repair with both immutable historical authorities', () => {
  const f = fixture()
  expect(f.adoption.entries.map(entry => entry.file)).toEqual(['apps/desktop/src/main/presentation-settings.ts', 'apps/desktop/tests/e2e/ui-contract-theme.spec.ts', 'packages/ui-workspace/tests/ui-contract/vscode-dark-2026-origin.ts'])
  expect(drawingPagesOriginScope).toHaveLength(27)
  expect(new Set(drawingPagesOriginScope).size).toBe(27)
  for (const entry of f.adoption.entries) {
    const live = f.live(entry)
    expect(sha(Buffer.from(live))).toBe(entry.adoptedCanonicalSha256)
    for (const form of [live, live.replaceAll('\n', '\r\n')]) {
      f.put(entry.file, form)
      const restored = f.read(entry.file, Buffer.from(form))
      expect(sha(restored)).toBe(f.expected(entry))
      assert.deepStrictEqual(readDrawingPagesOrigin(f.root, entry.file, Buffer.from(form)), restored)
      const old = f.old.entries.find(candidate => candidate.file === entry.file)
      if (old) assert.deepStrictEqual(restored, Buffer.from(old.predecessor.sourceBase64, 'base64'))
    }
    if (entry.file === 'apps/desktop/tests/e2e/ui-contract-theme.spec.ts') {
      expect(entry.predecessor.form).toBe('RAW_BASE64')
      const source = entry.predecessor.sourceBase64
      expect(source).toBeTypeOf('string')
      if (!source) throw Error('Missing exact historical raw predecessor')
      const predecessor = Buffer.from(source, 'base64'), normalized = Buffer.from(predecessor.toString().replaceAll('\r\n', '\n'))
      expect(sha(predecessor)).toBe(f.expected(entry))
      expect(predecessor.equals(normalized)).toBe(false)
      expect(predecessor.equals(Buffer.from(normalized.toString().replaceAll('\n', '\r\n')))).toBe(false)
      for (const form of [predecessor, normalized, Buffer.from(normalized.toString().replaceAll('\n', '\r\n'))]) {
        f.put(entry.file, form)
        assert.deepStrictEqual(f.read(entry.file, form), predecessor)
      }
    }
  }
})

it('staging refusal origin rejects partial duplicate extra and mixed-form edits', () => {
  const f = fixture()
  for (const entry of f.adoption.entries) {
    const live = f.live(entry), hunk = entry.hunks[0]
    expect(sha(f.read(entry.file, Buffer.from(live)))).toBe(f.expected(entry))
    for (const changed of [live + '!', live.replace(hunk.after, hunk.before), live + hunk.after, live.replace('\n', '\r\n')]) {
      f.put(entry.file, changed)
      expect(() => f.read(entry.file, Buffer.from(changed))).toThrow(/ADOPTED_SOURCE_HASH|REFUSAL_ORIGIN/)
    }
    f.put(entry.file, live)
  }
})

it('staging refusal origin rejects prior authority and predecessor substitutions', () => {
  for (const mutation of ['supplement', 'legacy', 'staging', 'predecessor'] as const) {
    const f = fixture()
    for (const entry of f.adoption.entries) expect(sha(f.read(entry.file, Buffer.from(f.live(entry))))).toBe(f.expected(entry))
    if (mutation === 'supplement') f.put(file, Buffer.concat([f.raw, Buffer.from(' ')]))
    if (mutation === 'legacy') f.put(f.adoption.authority.file, '{}')
    if (mutation === 'staging') f.put(oldFile, '{}')
    if (mutation === 'predecessor') { f.adoption.entries[0].predecessor.canonicalSha256 = '0'.repeat(64); f.put(file, JSON.stringify(f.adoption)) }
    for (const entry of f.adoption.entries) expect(() => f.read(entry.file, Buffer.from(f.live(entry)))).toThrow(/REFUSAL_ORIGIN|STAGING_ORIGIN/)
  }
})

it('staging refusal origin binds the full live source before restoring historical bytes', () => {
  const f = fixture()
  for (const entry of f.adoption.entries) {
    const live = Buffer.from(f.live(entry))
    expect(sha(f.read(entry.file, live))).toBe(f.expected(entry))
    f.put(entry.file, Buffer.concat([live, Buffer.from('!')]))
    expect(() => f.read(entry.file, live)).toThrow(/ADOPTED_SOURCE_HASH|REFUSAL_ORIGIN/)
    f.put(entry.file, live)
    const sibling = 'unowned/' + entry.file, bytes = Buffer.from('unowned live bytes')
    expect(readDrawingPagesOrigin(f.root, sibling, bytes)).toBe(bytes)
    for (const unsafe of ['../escape', '/absolute', 'C:/absolute', 'back\\slash']) expect(() => readDrawingPagesOrigin(f.root, unsafe, live)).toThrow('UNSAFE_PATH')
  }
})
