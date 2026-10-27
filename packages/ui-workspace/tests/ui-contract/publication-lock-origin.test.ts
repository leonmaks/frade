import { afterEach, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { createDrawingPagesOriginReader } from './drawing-pages-origin'
import { publicationByteForms } from '../../../../tests/ui-contract/drawing-pages-adoption.mjs'

const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const roots: Array<{ root: string; ino: number; dev: number }> = []
afterEach(() => {
  for (const { root, ino, dev } of roots.splice(0)) {
    const current = statSync(root)
    if (
      realpathSync(root) !== root ||
      !root.startsWith(resolve(tmpdir()) + sep) ||
      !root.includes('frade-publication-origin-') ||
      current.ino !== ino ||
      current.dev !== dev
    )
      throw Error('UNVERIFIED_PUBLICATION_FIXTURE_CLEANUP')
    rmSync(root, { recursive: true, force: true })
  }
})
function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'frade-publication-origin-')))
  const identity = statSync(root)
  roots.push({ root, ino: identity.ino, dev: identity.dev })
  const file = 'pnpm-lock.yaml',
    original = Buffer.from('historical importer\r\n')
  const adopted = Buffer.from('working importer with fast-check\n')
  const clean = Buffer.from('committed importer without user dependency\n')
  const originalFile = 'openspec/changes/frade-draw-multipage/evidence/origin/source/' + file
  const target = join(root, originalFile)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, original)
  const manifest = Buffer.from(
    JSON.stringify({
      version: 1,
      change: 'frade-draw-multipage',
      baseline: 'e54cf0c1e4e70ed833398c673ea3140b6f10469e',
      entries: [{ file, originalFile, originalSha256: sha(original), adoptedSha256: sha(adopted) }],
    }),
  )
  const publicationInput = { file, ...publicationByteForms(clean) }
  return {
    file,
    original,
    adopted,
    clean,
    target,
    publicationInput,
    options: { root, manifest, expectedSha256: sha(manifest), publicationInput },
  }
}
it('publication clean lock form returns the same exact immutable historical bytes', () => {
  const f = fixture()
  expect(createDrawingPagesOriginReader(f.options)(f.file, f.clean)).toEqual(f.original)
})
it('publication compatibility retains exact LF and CRLF forms and rejects mixed or semantic edits', () => {
  const f = fixture(),
    read = createDrawingPagesOriginReader(f.options)
  expect(read(f.file, Buffer.from(f.clean.toString().replaceAll('\n', '\r\n')))).toEqual(f.original)
  for (const bytes of [
    Buffer.concat([f.clean, Buffer.from('!')]),
    Buffer.from('committed importer\r\nother\n'),
  ])
    expect(() => read(f.file, bytes)).toThrow('CURRENT_SOURCE_HASH')
})
it('publication clean lock remains rejected without an explicitly verified input', () => {
  const f = fixture(),
    options = {
      root: f.options.root,
      manifest: f.options.manifest,
      expectedSha256: f.options.expectedSha256,
    }
  expect(() => createDrawingPagesOriginReader(options)(f.file, f.clean)).toThrow(
    'ADOPTED_SOURCE_HASH',
  )
})
it('publication origin option cannot register a sibling or arbitrary source exemption', () => {
  const f = fixture()
  for (const file of [
    'pnpm-lock.yaml.backup',
    'pnpm-lock.yaml/child',
    'packages/draw/package.json',
  ])
    expect(() =>
      createDrawingPagesOriginReader({
        ...f.options,
        publicationInput: { ...f.publicationInput, file },
      }),
    ).toThrow('PUBLICATION_LOCK_SCOPE')
})
it('publication clean form cannot conceal changed historical bytes', () => {
  const f = fixture(),
    read = createDrawingPagesOriginReader(f.options)
  writeFileSync(f.target, Buffer.from('changed original'))
  expect(() => read(f.file, f.clean)).toThrow('ORIGIN_SOURCE_HASH')
})
it('publication compatibility keeps legacy adopted bytes and leaves unknown files live', () => {
  const f = fixture(),
    read = createDrawingPagesOriginReader(f.options)
  expect(read(f.file, f.adopted)).toEqual(f.original)
  expect(read('packages/draw/src/unknown.ts', f.clean)).toEqual(f.clean)
})
