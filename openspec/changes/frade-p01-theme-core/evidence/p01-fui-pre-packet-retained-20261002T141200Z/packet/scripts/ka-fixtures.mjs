import { readFile, writeFile, mkdir, mkdtemp, readdir, realpath, copyFile } from 'node:fs/promises'
import { resolve, dirname, relative, join, isAbsolute, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const { parseDocument } = createRequire(
  new URL('../packages/adapter-yaml/package.json', import.meta.url),
)('yaml')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
export async function createKaFixture(options = {}) {
  const dataRoot = await realpath(
    options.dataRoot ?? process.env.FRADE_KA_DATA_ROOT ?? 'E:/sber.wsp/ka_dzo/KA',
  )
  const metaRoot = await realpath(
    options.metaRoot ?? process.env.FRADE_KA_META_ROOT ?? 'E:/sber.wsp/ka_dzo/_ecosystems_',
  )
  const destination = options.destination
    ? resolve(options.destination)
    : await mkdtemp(join(tmpdir(), 'frade-sberea-fixture-'))
  const manifest = {
    createdAt: new Date().toISOString(),
    files: [],
    counts: {},
    objects: 0,
    sourceBytes: 0,
  }
  const visited = new Set(),
    active = new Set()
  const copy = async (root, name, area, imports) => {
    const file = await realpath(resolve(root, name)),
      rel = relative(root, file)
    if (rel.startsWith('..' + sep) || rel === '..' || isAbsolute(rel))
      throw Error('Unsafe fixture input')
    const key = area + '/' + rel.replaceAll('\\', '/')
    if (active.has(key)) throw Error('Import cycle')
    if (visited.has(key)) return
    active.add(key)
    const bytes = await readFile(file),
      text = bytes.toString('utf8')
    const doc = imports ? parseDocument(text) : undefined
    if (doc?.errors.length) throw Error('Malformed input: ' + key)
    const value = doc?.toJS({ maxAliasCount: 100 })
    const target = resolve(destination, key)
    if (target === file) throw Error('Fixture destination overlaps source')
    await mkdir(dirname(target), { recursive: true })
    await copyFile(file, target)
    manifest.files.push({ path: key, sha256: hash(bytes), bytes: bytes.length })
    if (area === 'KA') {
      manifest.sourceBytes += bytes.length
      for (const [type, rows] of Object.entries(value ?? {}))
        if (type.startsWith('kadzo.') && rows && typeof rows === 'object') {
          const count = Object.keys(rows).length
          manifest.counts[type] = (manifest.counts[type] ?? 0) + count
          manifest.objects += count
        }
    }
    for (const child of value?.imports ?? [])
      await copy(root, relative(root, resolve(dirname(file), child)), area, true)
    active.delete(key)
    visited.add(key)
  }
  await copy(dataRoot, 'root.yaml', 'KA', true)
  await copy(metaRoot, 'kadzo/v2025/entities/root.yaml', 'metadata', true)
  await copy(metaRoot, 'kadzo/v2023/entities/technical/tech_params.yaml', 'metadata', true)
  for (const item of await readdir(join(metaRoot, 'docs/metamodel')))
    if (item.endsWith('.md')) await copy(metaRoot, 'docs/metamodel/' + item, 'metadata', false)
  manifest.files.sort((a, b) => a.path.localeCompare(b.path))
  await writeFile(join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  return {
    destination,
    dataRoot: join(destination, 'KA'),
    metadataRoot: join(destination, 'metadata'),
    manifest,
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const value = await createKaFixture(process.argv[2] ? { destination: process.argv[2] } : {})
  console.log(
    JSON.stringify({
      destination: value.destination,
      dataFiles: value.manifest.files.filter((f) => f.path.startsWith('KA/')).length,
      objects: value.manifest.objects,
      types: Object.keys(value.manifest.counts).length,
      sourceBytes: value.manifest.sourceBytes,
    }),
  )
}
