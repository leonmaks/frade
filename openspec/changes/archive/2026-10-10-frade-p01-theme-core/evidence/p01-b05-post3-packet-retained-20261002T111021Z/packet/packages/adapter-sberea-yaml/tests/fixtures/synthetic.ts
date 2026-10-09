import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, relative, isAbsolute } from 'node:path'
import { createSbereaYamlAdapter, type SbereaOptions } from '../../src'
import type { Result, RepositoryObject, JsonValue } from '@frade/repository-domain'

export function unwrap<T>(value: Result<T>): T {
  if (!value.ok) throw Error(JSON.stringify(value.error))
  return value.value
}
export const schema = {
  entities: {
    systems: {
      title: 'Системы',
      objects: { systems: { route: '/' } },
      schema: {
        patternProperties: {
          '.*': {
            type: 'object',
            required: ['title'],
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              status: { enum: ['active', 'retired'] },
              parent: { $ref: '#/$rels/systems.systems' },
              links: { type: 'array', items: { $ref: '#/$rels/systems.systems' } },
              count: { type: 'number', minimum: 0 },
              enabled: { type: 'boolean' },
              optional: { type: ['string', 'null'] },
              nested: { type: 'object', properties: { value: { type: 'number' } } },
            },
          },
        },
      },
    },
  },
}
export async function fixture(
  data = 'systems:\n  a:\n    title: A\n    status: invalid\n    parent: missing\n    optional: null\n    mystery: {keep: false}\n  b:\n    title: B\n',
) {
  const destination = await mkdtemp(join(tmpdir(), 'frade-sberea-contract-'))
  const dataRoot = join(destination, 'data'),
    metadataRoot = join(destination, 'metadata')
  await mkdir(dataRoot)
  await mkdir(metadataRoot)
  await writeFile(
    join(dataRoot, 'root.yaml'),
    'imports: [objects.yaml]\nsber: {keep: true}\nunknown: {retain: 0}\n',
  )
  await writeFile(join(dataRoot, 'objects.yaml'), data)
  await writeFile(join(metadataRoot, 'schema.yaml'), JSON.stringify(schema))
  const options: SbereaOptions = {
    dataRoot,
    repositoryId: 'test',
    metadataSet: {
      id: 'test',
      label: 'Test',
      folderPath: metadataRoot,
      dialect: 'sberea',
      schemaEntries: ['schema.yaml'],
      documentEntries: [],
    },
  }
  return {
    destination,
    dataRoot,
    metadataRoot,
    options,
    adapter: (overrides: Partial<SbereaOptions> = {}) =>
      createSbereaYamlAdapter({ ...options, ...overrides }),
    async cleanup() {
      const target = resolve(destination),
        rel = relative(resolve(tmpdir()), target)
      if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw Error('Unsafe fixture cleanup')
      await rm(target, { recursive: true, force: true })
    },
  }
}
export function update(object: RepositoryObject, attributes: Readonly<Record<string, JsonValue>>) {
  return {
    op: 'updateObject' as const,
    expectedRevision: object.revision,
    object: {
      ref: object.ref,
      typeId: object.typeId,
      name: typeof attributes.title === 'string' ? attributes.title : object.name,
      attributes,
    },
  }
}
