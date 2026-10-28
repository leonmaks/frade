import { afterEach, expect, it } from 'vitest'
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  statSync,
  rmSync,
} from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import {
  createDrawingPagesOriginReader,
  readDrawingPagesOrigin,
  drawingPagesOriginScope,
} from './drawing-pages-origin'
import { drawingPagesAdoptionManifestSha256 } from './drawing-pages-adoption-pin'
const repository = fileURLToPath(new URL('../../../../', import.meta.url)),
  supplement = 'packages/ui-workspace/tests/ui-contract/presentation-staging-adoption.json'
const manifestFile =
  'openspec/changes/archive/2026-10-27-frade-draw-multipage/evidence/source-adoption-manifest.json'
const manifest = readFileSync(join(repository, manifestFile))
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const roots: Array<{ root: string; ino: number; dev: number }> = []
afterEach(() => {
  for (const { root, ino, dev } of roots.splice(0)) {
    const info = statSync(root)
    if (
      info.ino !== ino ||
      info.dev !== dev ||
      dirname(root) !== realpathSync(tmpdir()) ||
      !basename(root).startsWith('frade-staging-origin-')
    )
      throw Error('UNSAFE_FIXTURE_CLEANUP')
    rmSync(root, { recursive: true, force: true })
  }
})
type Entry = {
  file: string
  predecessor: { sha256: string; canonicalSha256: string; sourceBase64: string }
  adoptedCanonicalSha256: string
  hunks: Array<{ before: string; after: string }>
}
type Adoption = { authority: { file: string; sha256: string }; entries: Entry[] }
function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'frade-staging-origin-'))),
    info = statSync(root)
  roots.push({ root, ino: info.ino, dev: info.dev })
  const put = (file: string, bytes: Buffer | string) => {
    const target = join(root, file)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, bytes)
  }
  const raw = readFileSync(join(repository, supplement)),
    adoption = JSON.parse(raw.toString()) as Adoption
  put(supplement, raw)
  const refusalSupplement = 'packages/ui-workspace/tests/ui-contract/presentation-staging-refusal-adoption.json'
  put(refusalSupplement, readFileSync(join(repository, refusalSupplement)))
  put(adoption.authority.file, readFileSync(join(repository, adoption.authority.file)))
  put(manifestFile, manifest)
  const live = (entry: Entry) => {
    let text = readFileSync(join(repository, entry.file)).toString().replaceAll('\r\n', '\n')
    if (entry.file === 'apps/desktop/src/main/presentation-settings.ts') {
      const repairRaw = readFileSync(join(repository, 'packages/ui-workspace/tests/ui-contract/presentation-staging-refusal-adoption.json'))
      expect(sha(repairRaw)).toBe('941a3600115482a895c437b0ab0786d4eac60239f46155850910facf33a4d28a')
      const repair = (JSON.parse(repairRaw.toString()) as { entries: Entry[] }).entries.find(candidate => candidate.file === entry.file)!
      expect(sha(Buffer.from(text))).toBe(repair.adoptedCanonicalSha256)
      for (const hunk of [...repair.hunks].reverse()) {
        expect(text.split(hunk.after)).toHaveLength(2)
        text = text.replace(hunk.after, hunk.before)
      }
      expect(sha(Buffer.from(text))).toBe(entry.adoptedCanonicalSha256)
    }
    return text
  }
  for (const entry of adoption.entries) put(entry.file, live(entry))
  const read = createDrawingPagesOriginReader({
    root,
    owner: 'openspec/changes/archive/2026-10-27-frade-draw-multipage',
    manifest,
    expectedSha256: drawingPagesAdoptionManifestSha256,
  })
  return { root, put, adoption, raw, live, read }
}
it('staging origin reverses only the five exact approved file deltas', () => {
  const f = fixture()
  expect(f.adoption.entries).toHaveLength(5)
  for (const entry of f.adoption.entries) {
    const original = Buffer.from(entry.predecessor.sourceBase64, 'base64'),
      live = f.live(entry)
    expect(sha(original)).toBe(entry.predecessor.sha256)
    expect(sha(Buffer.from(original.toString().replaceAll('\r\n', '\n')))).toBe(
      entry.predecessor.canonicalSha256,
    )
    expect(sha(Buffer.from(live))).toBe(entry.adoptedCanonicalSha256)
    for (const form of [live, live.replaceAll('\n', '\r\n')]) {
      f.put(entry.file, form)
      expect(f.read(entry.file, Buffer.from(form))).toEqual(original)
      expect(readDrawingPagesOrigin(f.root, entry.file, Buffer.from(form))).toEqual(original)
    }
  }
})
it('staging origin rejects authority and predecessor substitutions', () => {
  for (const mutate of ['authority', 'supplement', 'predecessor'] as const) {
    const f = fixture(),
      entry = f.adoption.entries[0],
      live = Buffer.from(f.live(entry))
    expect(f.read(entry.file, live)).toEqual(Buffer.from(entry.predecessor.sourceBase64, 'base64'))
    if (mutate === 'authority') f.put(f.adoption.authority.file, '{}')
    if (mutate === 'supplement') f.put(supplement, Buffer.concat([f.raw, Buffer.from(' ')]))
    if (mutate === 'predecessor') {
      f.adoption.entries[0].predecessor.sourceBase64 = Buffer.from('forged').toString('base64')
      f.put(supplement, JSON.stringify(f.adoption))
    }
    expect(() => f.read(entry.file, live)).toThrow(/STAGING_ORIGIN/)
  }
})
it('staging origin rejects partial duplicate extra and mixed-form edits', () => {
  const f = fixture()
  for (const entry of f.adoption.entries) {
    const live = f.live(entry),
      hunk = entry.hunks[0]
    expect(f.read(entry.file, Buffer.from(live))).toEqual(
      Buffer.from(entry.predecessor.sourceBase64, 'base64'),
    )
    for (const changed of [
      live + '!',
      live.replace(hunk.after, hunk.before),
      live + hunk.after,
      live.replace('\n', '\r\n'),
    ]) {
      f.put(entry.file, changed)
      expect(() => f.read(entry.file, Buffer.from(changed))).toThrow(/ADOPTED_SOURCE_HASH/)
    }
  }
})
it('staging dispatch preserves all unowned source and report verification', () => {
  const f = fixture(),
    ledger = JSON.parse(readFileSync(join(repository, f.adoption.authority.file), 'utf8')) as {
      inputs: Array<{ file: string; sha256: string }>
      reports: Record<string, { file: string; sha256: string }>
    }
  expect(drawingPagesOriginScope).toHaveLength(27)
  expect(new Set(drawingPagesOriginScope).size).toBe(27)
  for (const input of [...ledger.inputs, ...Object.values(ledger.reports)].filter(
    (x) => !drawingPagesOriginScope.includes(x.file),
  )) {
    const changed = Buffer.from('unowned live mutation ' + input.file)
    expect(readDrawingPagesOrigin(f.root, input.file, changed)).toBe(changed)
    expect(sha(changed)).not.toBe(input.sha256)
  }
  for (const file of ['../escape', '/absolute', 'C:/absolute', 'back\\slash'])
    expect(() => readDrawingPagesOrigin(f.root, file, Buffer.from('x'))).toThrow('UNSAFE_PATH')
})
