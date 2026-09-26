import { expect, it } from 'vitest'
import { writeFile, readFile, mkdir, rename, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { fixture, unwrap } from './fixtures/synthetic'
import type { SbereaSession } from '../src'

it('KA-001/002 accounts duplicate imports, unknown sections and stable identity after rename/relocation', async () => {
  const f = await fixture()
  let session: SbereaSession | undefined
  try {
    await writeFile(
      join(f.dataRoot, 'root.yaml'),
      'imports: [objects.yaml, ./objects.yaml]\nsber: {keep: true}\nunknown: {retain: 0}\n',
    )
    session = unwrap(await f.adapter().open())
    const before = unwrap(await session.snapshot()),
      report = session.inspect()
    expect(before.objects).toHaveLength(2)
    expect(report.accounting.files).toHaveLength(2)
    expect(report.accounting.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'sber', kind: 'configuration', value: { keep: true } }),
        expect.objectContaining({ key: 'unknown', kind: 'unknown', value: { retain: 0 } }),
      ]),
    )
    const page = unwrap(await session.query('object', { limit: 1 }))
    expect(page.cursor).toBeDefined()
    await mkdir(join(f.dataRoot, 'moved'))
    await rename(join(f.dataRoot, 'objects.yaml'), join(f.dataRoot, 'moved/objects.yaml'))
    const text = await readFile(join(f.dataRoot, 'moved/objects.yaml'), 'utf8')
    await writeFile(
      join(f.dataRoot, 'moved/objects.yaml'),
      text.replace('title: A', 'title: Renamed'),
    )
    await writeFile(join(f.dataRoot, 'root.yaml'), 'imports: [moved/objects.yaml]\n')
    unwrap(await session.reload!())
    const after = unwrap(await session.snapshot())
    expect(after.objects.map((o) => o.ref)).toEqual(before.objects.map((o) => o.ref))
    expect(after.objects[0].name).toBe('Renamed')
    expect(after.relations.map((r) => r.ref)).toEqual(before.relations.map((r) => r.ref))
    expect(session.inspect().locators[0].entry).toBe('moved/objects.yaml')
    expect(await session.query('object', { limit: 1, cursor: page.cursor })).toMatchObject({
      ok: false,
      error: { code: 'STALE_CURSOR' },
    })
  } finally {
    await session?.close()
    await f.cleanup()
  }
})

it.each([
  ['cycle', 'imports: [root.yaml]\n', 'INVALID_INPUT'],
  ['missing', 'imports: [missing.yaml]\n', 'REPOSITORY_UNAVAILABLE'],
  ['escape', 'imports: [../metadata/schema.yaml]\n', 'REPOSITORY_UNAVAILABLE'],
  ['malformed', 'imports: [\n', 'INVALID_INPUT'],
  ['invalid imports', 'imports: [42]\n', 'INVALID_INPUT'],
  ['oversized', 'text: ' + 'x'.repeat(2_000_001), 'RESOURCE_LIMIT'],
  [
    'duplicate IDs',
    'imports: [objects.yaml]\nsystems:\n  a: {title: Duplicate}\n',
    'INVALID_INPUT',
  ],
] as const)('KA-001 refuses %s without writes or hidden truncation', async (_name, text, code) => {
  const f = await fixture()
  try {
    const path = join(f.dataRoot, 'root.yaml')
    await writeFile(path, text)
    expect(await f.adapter().open()).toMatchObject({ ok: false, error: { code } })
    expect(await readFile(path, 'utf8')).toBe(text)
  } finally {
    await f.cleanup()
  }
})

it('KA-001 refuses symlink/junction imports outside the granted root', async () => {
  const f = await fixture()
  try {
    await symlink(f.metadataRoot, join(f.dataRoot, 'escape'), 'junction')
    await writeFile(join(f.dataRoot, 'root.yaml'), 'imports: [escape/schema.yaml]\n')
    expect(await f.adapter().open()).toMatchObject({ ok: false, error: { code: 'ACCESS_DENIED' } })
  } finally {
    await f.cleanup()
  }
})

it('KA-001 refuses excessive import depth explicitly', async () => {
  const f = await fixture()
  try {
    for (let i = 0; i < 66; i++)
      await writeFile(join(f.dataRoot, `${i}.yaml`), i < 65 ? `imports: [${i + 1}.yaml]\n` : '{}\n')
    await writeFile(join(f.dataRoot, 'root.yaml'), 'imports: [0.yaml]\n')
    expect(await f.adapter().open()).toMatchObject({ ok: false, error: { code: 'RESOURCE_LIMIT' } })
  } finally {
    await f.cleanup()
  }
})
