import { expect, it } from 'vitest'
import { mkdtemp, readFile, writeFile, rename, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NativeAdapter, createNativeRepository } from '../src/index'
it('CORE-003 rejects duplicate canonical IDs without merging or altering the source', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-duplicate-'))
  try {
    await createNativeRepository(root, { repositoryId: 'R', displayName: 'IDs', format: 'json' })
    const path = join(root, 'repository.json'),
      source = JSON.parse(await readFile(path, 'utf8')),
      object = {
        ref: { repositoryId: 'R', objectId: 'A' },
        typeId: 'sample:ApplicationSystem',
        name: 'A',
        attributes: { status: 'created' },
        revision: 'r1',
      }
    source.objects = [object, { ...object, name: 'Different record' }]
    const text = JSON.stringify(source)
    await writeFile(path, text)
    expect((await new NativeAdapter(root).open()).ok).toBe(false)
    expect(await readFile(path, 'utf8')).toBe(text)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
it('CORE-003 physical source relocation preserves stable qualified identity and stored entity revision', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-relocation-'))
  try {
    await createNativeRepository(root, { repositoryId: 'R', displayName: 'IDs', format: 'json' })
    const path = join(root, 'repository.json'),
      source = JSON.parse(await readFile(path, 'utf8')),
      object = {
        ref: { repositoryId: 'R', objectId: 'A' },
        typeId: 'sample:ApplicationSystem',
        name: 'A',
        attributes: { status: 'created' },
        revision: 'r1',
      }
    source.objects = [object]
    await writeFile(path, JSON.stringify(source))
    const first = await new NativeAdapter(root).open()
    if (!first.ok) throw Error(first.error.code)
    const before = await first.value.read('object', object.ref)
    await first.value.close()
    await mkdir(join(root, 'moved'))
    await rename(path, join(root, 'moved', 'source.json'))
    const profilePath = join(root, 'profile.json'),
      profile = JSON.parse(await readFile(profilePath, 'utf8'))
    profile.mapping.sourceFile = 'moved/source.json'
    await writeFile(profilePath, JSON.stringify(profile))
    const second = await new NativeAdapter(root).open()
    if (!second.ok) throw Error(second.error.code)
    try {
      expect(await second.value.read('object', object.ref)).toEqual(before)
    } finally {
      await second.value.close()
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
