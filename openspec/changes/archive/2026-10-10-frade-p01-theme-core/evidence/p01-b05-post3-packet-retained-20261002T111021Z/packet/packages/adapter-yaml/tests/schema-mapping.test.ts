import { expect, it } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as native from '../src/index'
it('partial external mapping discovers explicit identities and diagnoses unmapped records without writes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-mapping-')),
    path = join(root, 'external.json')
  const content = JSON.stringify({
    components: [
      { uid: 'stable-1', category: 'system', title: 'Recognized', props: { status: 'created' } },
      { uid: 'stable-2', category: 'unknown', title: 'Unknown', props: {} },
    ],
  })
  await writeFile(path, content)
  try {
    const result = await native.inspectMappedRepository(root, {
      repositoryId: 'R',
      files: ['external.json'],
      objects: {
        recordsPath: 'components',
        idPath: 'uid',
        typePath: 'category',
        namePath: 'title',
        attributesPath: 'props',
        typeMap: { system: 'sample:ApplicationSystem' },
      },
    })
    expect(result).toMatchObject({
      ok: true,
      value: {
        canWrite: false,
        objects: [{ ref: { repositoryId: 'R', objectId: 'stable-1' }, name: 'Recognized' }],
        diagnostics: [{ code: 'UNSUPPORTED_MAPPING' }],
      },
    })
    expect(await readText(path)).toBe(content)
    expect(
      (
        await native.inspectMappedRepository(root, {
          repositoryId: 'R',
          files: ['../outside.json'],
          objects: {
            recordsPath: 'components',
            idPath: 'uid',
            typePath: 'category',
            namePath: 'title',
            attributesPath: 'props',
            typeMap: {},
          },
        })
      ).ok,
    ).toBe(false)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
async function readText(path: string) {
  return (await import('node:fs/promises')).readFile(path, 'utf8')
}
