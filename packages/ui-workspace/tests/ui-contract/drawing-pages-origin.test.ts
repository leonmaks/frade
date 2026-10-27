import { afterEach, describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  realpathSync,
  lstatSync,
  renameSync,
  symlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve, sep } from 'node:path'
import {
  createDrawingPagesOriginReader,
  locateDrawingPagesOriginOwner,
} from './drawing-pages-origin'
const prefix = 'openspec/changes/frade-draw-multipage'
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) {
    if (
      realpathSync(root) !== resolve(root) ||
      !lstatSync(root).isDirectory() ||
      !root.startsWith(resolve(tmpdir()) + sep) ||
      !root.includes('frade-draw-pages-origin-')
    )
      throw Error('Unverified test cleanup')
    rmSync(root, { recursive: true, force: true })
  }
})
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'frade-draw-pages-origin-'))
  roots.push(root)
  const file = 'packages/draw/src/example.ts',
    original = Buffer.from('original source\r\n'),
    live = Buffer.from('approved multipage source\n')
  const originalFile = prefix + '/evidence/origin/source/' + file
  const target = join(root, originalFile)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, original)
  const manifest = {
    version: 1,
    change: 'frade-draw-multipage',
    baseline: 'e54cf0c1e4e70ed833398c673ea3140b6f10469e',
    entries: [{ file, originalFile, originalSha256: sha(original), adoptedSha256: sha(live) }],
  }
  const bytes = Buffer.from(JSON.stringify(manifest))
  writeFileSync(join(root, prefix, 'evidence/source-adoption-manifest.json'), bytes)
  return {
    root,
    file,
    original,
    live,
    originalFile,
    target,
    manifest,
    bytes,
    options: { root, manifest: bytes, expectedSha256: sha(bytes) },
  }
}
describe('closed drawing-page adoption preserves historical proof and rejects unknown drift', () => {
  it('returns exact original raw bytes only for the exact adopted file and live hash', () => {
    const f = fixture(),
      read = createDrawingPagesOriginReader(f.options)
    expect(read(f.file, f.live)).toEqual(f.original)
    expect(read(f.file + '.other', f.live)).toEqual(f.live)
  })
  it('rejects a one-byte live edit before exposing the historical origin', () => {
    const f = fixture()
    expect(() =>
      createDrawingPagesOriginReader(f.options)(f.file, Buffer.concat([f.live, Buffer.from('!')])),
    ).toThrow('ADOPTED_SOURCE_HASH')
  })
  it('rejects original byte/EOL mutation, missing originals and does not normalize them', () => {
    const f = fixture(),
      read = createDrawingPagesOriginReader(f.options)
    writeFileSync(f.target, Buffer.from('original source\n'))
    expect(() => read(f.file, f.live)).toThrow('ORIGIN_SOURCE_HASH')
    rmSync(f.target)
    expect(() => read(f.file, f.live)).toThrow()
  })
  it('rejects mutated manifest bytes and unsupported manifest schema', () => {
    const f = fixture()
    expect(() =>
      createDrawingPagesOriginReader({
        ...f.options,
        manifest: Buffer.concat([f.bytes, Buffer.from(' ')]),
      }),
    ).toThrow('MANIFEST_HASH')
    const bytes = Buffer.from(JSON.stringify({ ...f.manifest, version: 2 }))
    expect(() =>
      createDrawingPagesOriginReader({ ...f.options, manifest: bytes, expectedSha256: sha(bytes) }),
    ).toThrow('MANIFEST_SCHEMA')
  })
  it('rejects duplicate entries and snapshot path redirection even in a trusted test manifest', () => {
    const f = fixture()
    for (const manifest of [
      { ...f.manifest, entries: [...f.manifest.entries, ...f.manifest.entries] },
      {
        ...f.manifest,
        entries: [
          { ...f.manifest.entries[0], originalFile: 'openspec/changes/other/evidence/source.ts' },
        ],
      },
    ]) {
      const bytes = Buffer.from(JSON.stringify(manifest))
      expect(() =>
        createDrawingPagesOriginReader({
          ...f.options,
          manifest: bytes,
          expectedSha256: sha(bytes),
        }),
      ).toThrow()
    }
  })
  it.each([
    '../outside',
    'packages//file.ts',
    'C:/outside.ts',
    'packages/../outside.ts',
    'packages\\outside.ts',
  ])('rejects unsafe logical source %s', (file) => {
    const f = fixture()
    expect(() => createDrawingPagesOriginReader(f.options)(file, f.live)).toThrow('UNSAFE_PATH')
  })
  it('keeps undeclared mutations visible to the unchanged downstream original verifier', () => {
    const f = fixture(),
      read = createDrawingPagesOriginReader(f.options)
    const verify = (file: string, live: Buffer) => {
      if (sha(read(file, live)) !== sha(f.original)) throw Error('ORIGINAL_SOURCE_DRIFT')
    }
    expect(() => verify(f.file + '.unknown', f.live)).toThrow('ORIGINAL_SOURCE_DRIFT')
  })
  it('rejects leaf links without reading an outside original', () => {
    const f = fixture()
    const outside = join(f.root, 'outside')
    mkdirSync(outside)
    writeFileSync(join(outside, 'original.ts'), f.original)
    rmSync(f.target)
    symlinkSync(outside, f.target, process.platform === 'win32' ? 'junction' : 'dir')
    expect(() => createDrawingPagesOriginReader(f.options)(f.file, f.live)).toThrow('UNSAFE_LINK')
  })
  it('finds exactly one active or archived owner and rejects ambiguous evidence locations', () => {
    const f = fixture()
    expect(locateDrawingPagesOriginOwner(f.root)).toBe(prefix)
    const archive = 'openspec/changes/archive/2026-10-27-frade-draw-multipage'
    const from = resolve(f.root, prefix),
      to = resolve(f.root, archive)
    if (!from.startsWith(f.root + sep) || !to.startsWith(f.root + sep))
      throw Error('Unverified fixture move')
    mkdirSync(dirname(to), { recursive: true })
    renameSync(from, to)
    expect(locateDrawingPagesOriginOwner(f.root)).toBe(archive)
    expect(
      createDrawingPagesOriginReader({ ...f.options, owner: archive })(f.file, f.live),
    ).toEqual(f.original)
    mkdirSync(join(f.root, prefix, 'evidence'), { recursive: true })
    writeFileSync(
      join(f.root, prefix, 'evidence/source-adoption-manifest.json'),
      readFileSync(join(to, 'evidence/source-adoption-manifest.json')),
    )
    expect(() => locateDrawingPagesOriginOwner(f.root)).toThrow('EVIDENCE_LOCATION')
  })
})
it('accepts only preregistered publication EOL forms with the same canonical bytes', () => {
  const f = fixture(),
    live = Buffer.from('approved\nsecond\n'),
    checkout = Buffer.from('approved\r\nsecond\r\n'),
    mixed = Buffer.from('approved\r\nsecond\n')
  const manifest = {
      ...f.manifest,
      entries: [
        {
          ...f.manifest.entries[0],
          adoptedSha256: sha(live),
          canonicalSha256: sha(live),
          checkoutSha256: sha(checkout),
        },
      ],
    },
    bytes = Buffer.from(JSON.stringify(manifest))
  const read = createDrawingPagesOriginReader({
    ...f.options,
    manifest: bytes,
    expectedSha256: sha(bytes),
  })
  expect(read(f.file, live)).toEqual(f.original)
  expect(read(f.file, checkout)).toEqual(f.original)
  expect(() => read(f.file, mixed)).toThrow('ADOPTED_SOURCE_HASH')
})
it('does not accept semantic edits disguised as an explicitly named checkout form', () => {
  const f = fixture(),
    evil = Buffer.from('different semantic source\r\n'),
    manifest = {
      ...f.manifest,
      entries: [
        { ...f.manifest.entries[0], canonicalSha256: sha(f.live), checkoutSha256: sha(evil) },
      ],
    },
    bytes = Buffer.from(JSON.stringify(manifest))
  expect(() =>
    createDrawingPagesOriginReader({ ...f.options, manifest: bytes, expectedSha256: sha(bytes) })(
      f.file,
      evil,
    ),
  ).toThrow('ADOPTED_PUBLICATION_EQUIVALENCE')
})

function lockFixture() {
  const f = fixture(),
    file = 'pnpm-lock.yaml',
    originalFile = prefix + '/evidence/origin/source/' + file,
    live = Buffer.from('lockfileVersion: 9\nimporters:\n  packages/draw: {}\n'),
    manifest = {
      ...f.manifest,
      entries: [{ file, originalFile, originalSha256: sha(f.original), adoptedSha256: sha(live) }],
    },
    bytes = Buffer.from(JSON.stringify(manifest))
  writeFileSync(join(f.root, originalFile), f.original)
  return {
    ...f,
    file,
    originalFile,
    live,
    manifest,
    bytes,
    options: { root: f.root, manifest: bytes, expectedSha256: sha(bytes) },
  }
}
it('replays the exact explicitly registered root lockfile and rejects a one-byte live edit', () => {
  const f = lockFixture(),
    read = createDrawingPagesOriginReader(f.options)
  expect(read(f.file, f.live)).toEqual(f.original)
  expect(() => read(f.file, Buffer.concat([f.live, Buffer.from(' ')]))).toThrow(
    'ADOPTED_SOURCE_HASH',
  )
  expect(read(f.file + '.undeclared', f.live)).toEqual(f.live)
})
it('rejects changed root-lock origins and manifest bytes before historical replay', () => {
  const f = lockFixture(),
    read = createDrawingPagesOriginReader(f.options)
  writeFileSync(join(f.root, f.originalFile), Buffer.concat([f.original, Buffer.from('mutation')]))
  expect(() => read(f.file, f.live)).toThrow('ORIGIN_SOURCE_HASH')
  expect(() =>
    createDrawingPagesOriginReader({
      ...f.options,
      manifest: Buffer.concat([f.bytes, Buffer.from(' ')]),
    }),
  ).toThrow('MANIFEST_HASH')
})
it.each([
  'package.json',
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml.backup',
  'pnpm-lock.yaml/child',
  'docs/example.json',
])('does not broaden root-file adoption to %s', (file) => {
  const f = lockFixture(),
    bytes = Buffer.from(
      JSON.stringify({
        ...f.manifest,
        entries: [
          {
            ...f.manifest.entries[0],
            file,
            originalFile: prefix + '/evidence/origin/source/' + file,
          },
        ],
      }),
    )
  expect(() =>
    createDrawingPagesOriginReader({ ...f.options, manifest: bytes, expectedSha256: sha(bytes) }),
  ).toThrow('ADOPTION_FILE_SCOPE')
})
it('admits an individually pinned mixed checkout without accepting any other mixed form', () => {
  const f = fixture(),
    canonical = Buffer.from('one\ntwo\nthree\n'),
    checkout = Buffer.from('one\r\ntwo\r\nthree\r\n'),
    mixed = Buffer.from('one\r\ntwo\nthree\n'),
    otherMixed = Buffer.from('one\ntwo\r\nthree\n'),
    bytes = Buffer.from(
      JSON.stringify({
        ...f.manifest,
        entries: [
          {
            ...f.manifest.entries[0],
            adoptedSha256: sha(mixed),
            canonicalSha256: sha(canonical),
            checkoutSha256: sha(checkout),
          },
        ],
      }),
    ),
    read = createDrawingPagesOriginReader({
      ...f.options,
      manifest: bytes,
      expectedSha256: sha(bytes),
    })
  for (const allowed of [canonical, checkout, mixed])
    expect(read(f.file, allowed)).toEqual(f.original)
  expect(() => read(f.file, otherMixed)).toThrow('ADOPTED_SOURCE_HASH')
  expect(() => read(f.file, Buffer.concat([canonical, Buffer.from('mutation')]))).toThrow(
    'ADOPTED_SOURCE_HASH',
  )
})
