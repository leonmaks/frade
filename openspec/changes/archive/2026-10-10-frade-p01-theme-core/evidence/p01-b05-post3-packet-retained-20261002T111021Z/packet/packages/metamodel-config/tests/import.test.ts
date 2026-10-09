import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { importMetamodel, mapAttributeReferences, resolveEntry, type MetadataSet } from '../src'
const hash = async (s: string) => createHash('sha256').update(s).digest('hex')
const dialect = {
  id: 'example',
  mapping: (id: string) => ({
    externalId: id,
    typeId: 'example:' + id,
    nameFields: ['title'],
    section: 'objects',
  }),
}
const set: MetadataSet = {
  id: 'a',
  label: 'A',
  folderPath: '/first',
  schemaEntries: ['root.yaml'],
  documentEntries: [],
  dialect: 'example',
}
const documents: Record<string, any> = {
  'root.yaml': { imports: ['types.yaml', 'types.yaml'] },
  'types.yaml': {
    entities: {
      shared: {
        schema: {
          $defs: {
            common: {
              type: 'object',
              properties: { title: { type: 'string', title: 'Название' } },
            },
          },
        },
      },
      systems: {
        title: 'Системы',
        objects: { systems: { route: '/' } },
        schema: {
          patternProperties: {
            '.*': {
              allOf: [{ $ref: '#/$defs/common' }],
              properties: { parent: { $ref: '#/$rels/systems.systems' } },
            },
          },
        },
      },
    },
  },
}
const load = (entry: string) => Promise.resolve(structuredClone(documents[entry]))
describe('metadata documents and explicit dialect', () => {
  it('resolves shared definitions, routes, reversible reference leaves and stable relocated content', async () => {
    const a = await importMetamodel(set, { load }, dialect, hash)
    const b = await importMetamodel(
      { ...set, id: 'other', folderPath: '/moved' },
      { load },
      dialect,
      hash,
    )
    expect(a.fingerprint).toBe(b.fingerprint)
    expect(a.types).toHaveLength(1)
    expect(a.types[0].fields.map((f) => f.label)).toContain('Название')
    const original = { title: 'A', parent: 'sys.id', unknown: 0 }
    const canonical = mapAttributeReferences(original, a.types[0].rule, (v) => ({
      repositoryId: 'repo',
      objectId: v,
    }))
    expect(canonical).toEqual({ ...original, parent: { repositoryId: 'repo', objectId: 'sys.id' } })
    expect(mapAttributeReferences(canonical, a.types[0].rule, (v) => (v as any).objectId)).toEqual(
      original,
    )
    const changed = await importMetamodel(
      set,
      {
        load: async (e) =>
          e === 'types.yaml'
            ? JSON.parse(JSON.stringify(documents[e]).replace('Название', 'Имя'))
            : load(e),
      },
      dialect,
      hash,
    )
    expect(changed.fingerprint).not.toBe(a.fingerprint)
  })
  it('rejects missing definitions, cycles, unsupported keywords and escaping entries', async () => {
    for (const schema of [
      { $ref: '#/$defs/absent' },
      { format: 'executable' },
      { $ref: '#/$defs/loop', $defs: {} },
    ]) {
      await expect(
        importMetamodel(
          set,
          {
            load: async () => ({
              entities: {
                x: {
                  schema: {
                    $defs: { loop: { $ref: '#/$defs/loop' } },
                    patternProperties: { '.*': schema },
                  },
                },
              },
            }),
          },
          dialect,
          hash,
        ),
      ).rejects.toThrow()
    }
    await expect(
      importMetamodel(set, { load: async () => ({ imports: ['root.yaml'] }) }, dialect, hash),
    ).rejects.toThrow('cycle')
    expect(() => resolveEntry('../../escape', 'root.yaml')).toThrow()
  })
})

it('KM-001/003 documentation fills absent labels and descriptions but never overrides schemas or executes markup', async () => {
  const configured = { ...set, documentEntries: ['docs.md'] }
  const text =
    '## Системы (`systems`)\nОписание типа\n\n| Ключ | Название | Описание |\n| `title` | Документ | <script>alert(1)</script> |\n| `parent` | Родитель из docs | Ссылка на родителя |'
  const imported = await importMetamodel(
    configured,
    { load, text: async () => text },
    dialect,
    hash,
  )
  expect(imported.types[0].fields.find((f) => f.key === 'title')).toMatchObject({
    label: 'Название',
    description: '<script>alert(1)</script>',
  })
  expect(imported.types[0].fields.find((f) => f.key === 'parent')).toMatchObject({
    label: 'Родитель из docs',
    description: 'Ссылка на родителя',
  })
  expect(imported.types[0].description).toBe('Описание типа')
  const changed = await importMetamodel(
    configured,
    { load, text: async () => text.replace('родителя', 'цель') },
    dialect,
    hash,
  )
  expect(changed.fingerprint).not.toBe(imported.fingerprint)
})

it('imports flow capability only with two valid reference roles and well-formed patterns', async () => {
  const docs = structuredClone(documents),
    schema = docs['types.yaml'].entities.systems.schema.patternProperties['.*']
  schema.properties.receiver = { $ref: '#/$rels/systems.systems' }
  const capability = {
    source: 'parent',
    consumer: 'receiver',
    search: ['title'],
    columns: [{ field: 'title', label: 'Payload' }],
    nonCloneable: [],
    idPatterns: ['^F[0-9]+$'],
  }
  docs['types.yaml'].entities.systems.integrationFlow = capability
  const loader = { load: async (entry: string) => structuredClone(docs[entry]) },
    good = await importMetamodel(set, loader, dialect, hash)
  expect(good.types[0].integrationFlow).toEqual(capability)
  for (const patch of [
    { consumer: 'title' },
    { source: 'missing' },
    { idPatterns: ['['] },
    { source: 'receiver' },
  ]) {
    docs['types.yaml'].entities.systems.integrationFlow = { ...capability, ...patch }
    await expect(importMetamodel(set, loader, dialect, hash)).rejects.toMatchObject({
      code: 'INVALID_SCHEMA',
    })
  }
})
