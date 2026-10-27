import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, realpathSync, readdirSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import { drawingPagesAdoptionManifestSha256 } from './drawing-pages-adoption-pin'
import { canonicalPublicationBytes } from '../../../../tests/ui-contract/drawing-pages-adoption.mjs'
import {
  readDrawingPagesPublication,
  verifyPublicationInput,
  type PublicationInput,
} from '../../../../tests/ui-contract/drawing-pages-publication.mjs'
const owner = 'openspec/changes/frade-draw-multipage'
const manifestName = '/evidence/source-adoption-manifest.json'
const baseline = 'e54cf0c1e4e70ed833398c673ea3140b6f10469e'
const focusHunk = JSON.parse(
  readFileSync(new URL('./drawing-pages-focus-adoption.json', import.meta.url), 'utf8'),
) as { before: string; after: string }
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
function demand(value: unknown, error: string): asserts value {
  if (!value) throw Error(error)
}
function safeRelative(file: string) {
  demand(
    typeof file === 'string' &&
      !!file &&
      !isAbsolute(file) &&
      !file.includes('\\') &&
      !file.includes(':') &&
      file.split('/').every((part) => !!part && part !== '.' && part !== '..'),
    'UNSAFE_PATH',
  )
}
function safePath(root: string, file: string) {
  safeRelative(file)
  const base = resolve(root)
  demand(!lstatSync(base).isSymbolicLink() && realpathSync(base) === base, 'UNSAFE_ROOT')
  let current = base
  for (const part of file.split('/')) {
    current = resolve(current, part)
    demand(!lstatSync(current).isSymbolicLink(), 'UNSAFE_LINK')
  }
  const child = relative(base, realpathSync(current))
  demand(child && !child.startsWith('..') && !isAbsolute(child), 'UNSAFE_FILE')
  return current
}
function safeRead(root: string, file: string) {
  const target = safePath(root, file)
  demand(lstatSync(target).isFile(), 'UNSAFE_FILE')
  return readFileSync(target)
}
/** Choose by the one manifest, then read every snapshot from that same owner. */
export function locateDrawingPagesOriginOwner(root: string) {
  const candidates = [owner],
    archive = 'openspec/changes/archive'
  if (existsSync(resolve(root, archive))) {
    safePath(root, archive)
    for (const name of readdirSync(resolve(root, archive)))
      if (/^\d{4}-\d{2}-\d{2}-frade-draw-multipage$/.test(name))
        candidates.push(archive + '/' + name)
  }
  const present = candidates.filter((candidate) =>
    existsSync(resolve(root, candidate + manifestName)),
  )
  demand(present.length === 1, 'EVIDENCE_LOCATION')
  safeRead(root, present[0] + manifestName)
  return present[0]
}
type Entry = {
  file: string
  originalFile: string
  originalSha256: string
  adoptedSha256: string
  canonicalSha256?: string
  checkoutSha256?: string
}
type Options = {
  root: string
  owner?: string
  manifest: Buffer
  expectedSha256: string
  publicationInput?: PublicationInput
}
/** Reverse only the reviewed focus hunk, then require the immutable predecessor digest. */
function isFocusAdoption(file: string, live: Buffer, entry: Entry) {
  if (file !== 'packages/ui-workspace/src/DiagramView.tsx') return false
  const canonical = canonicalPublicationBytes(live)
  const checkout = Buffer.from(canonical.toString('latin1').replaceAll('\n', '\r\n'), 'latin1')
  if (!live.equals(canonical) && !live.equals(checkout)) return false
  const text = canonical.toString()
  if (text.split(focusHunk.after).length !== 2) return false
  const predecessor = Buffer.from(text.replace(focusHunk.after, focusHunk.before))
  return sha(predecessor) === (entry.canonicalSha256 ?? entry.adoptedSha256)
}
/** Historical replay only. Current execution evidence is checked separately. */
export function createDrawingPagesOriginReader(options: Options) {
  if (options.publicationInput)
    demand(options.publicationInput.file === 'pnpm-lock.yaml', 'PUBLICATION_LOCK_SCOPE')
  demand(sha(options.manifest) === options.expectedSha256, 'MANIFEST_HASH')
  const value = JSON.parse(options.manifest.toString()) as {
    version?: number
    change?: string
    baseline?: string
    entries?: Entry[]
  }
  demand(
    value.version === 1 &&
      value.change === 'frade-draw-multipage' &&
      value.baseline === baseline &&
      Array.isArray(value.entries) &&
      value.entries.length > 0,
    'MANIFEST_SCHEMA',
  )
  const physicalOwner = options.owner ?? owner
  demand(
    physicalOwner === owner ||
      /^openspec\/changes\/archive\/\d{4}-\d{2}-\d{2}-frade-draw-multipage$/.test(physicalOwner),
    'EVIDENCE_LOCATION',
  )
  const entries = new Map<string, Entry>()
  for (const entry of value.entries) {
    safeRelative(entry.file)
    safeRelative(entry.originalFile)
    demand(
      entry.file === 'pnpm-lock.yaml' ||
        entry.file === 'apps/desktop/src/main/drawio-theme-bridge.ts' ||
        /^(packages\/|scripts\/ui\/|tests\/ui-contract\/)/.test(entry.file),
      'ADOPTION_FILE_SCOPE',
    )
    demand(entry.originalFile === owner + '/evidence/origin/source/' + entry.file, 'ORIGIN_PATH')
    demand(
      /^[a-f0-9]{64}$/.test(entry.originalSha256) && /^[a-f0-9]{64}$/.test(entry.adoptedSha256),
      'MANIFEST_SCHEMA',
    )
    for (const digest of [entry.canonicalSha256, entry.checkoutSha256])
      if (digest !== undefined) demand(/^[a-f0-9]{64}$/.test(digest), 'MANIFEST_SCHEMA')
    demand(!entry.checkoutSha256 || !!entry.canonicalSha256, 'MANIFEST_SCHEMA')
    demand(!entries.has(entry.file), 'DUPLICATE_ENTRY')
    entries.set(entry.file, { ...entry })
  }
  return (file: string, live: Buffer): Buffer => {
    safeRelative(file)
    const entry = entries.get(file)
    if (!entry) return live
    const legacy = [entry.adoptedSha256, entry.canonicalSha256, entry.checkoutSha256].includes(
      sha(live),
    )
    if (!legacy && !isFocusAdoption(file, live, entry)) {
      demand(file === 'pnpm-lock.yaml' && !!options.publicationInput, 'ADOPTED_SOURCE_HASH:' + file)
      verifyPublicationInput(options.publicationInput, live)
    }
    if (legacy && entry.canonicalSha256)
      demand(
        sha(canonicalPublicationBytes(live)) === entry.canonicalSha256,
        'ADOPTED_PUBLICATION_EQUIVALENCE:' + file,
      )
    const original = safeRead(options.root, physicalOwner + entry.originalFile.slice(owner.length))
    demand(sha(original) === entry.originalSha256, 'ORIGIN_SOURCE_HASH:' + file)
    return original
  }
}
export function readDrawingPagesOrigin(root: string, file: string, live: Buffer) {
  const physicalOwner = locateDrawingPagesOriginOwner(root)
  const manifest = safeRead(root, physicalOwner + manifestName)
  return createDrawingPagesOriginReader({
    root,
    owner: physicalOwner,
    manifest,
    expectedSha256: drawingPagesAdoptionManifestSha256,
    publicationInput:
      file === 'pnpm-lock.yaml'
        ? readDrawingPagesPublication(root).manifest.currentInputs.find(
            (input) => input.file === file,
          )
        : undefined,
  })(file, live)
}
