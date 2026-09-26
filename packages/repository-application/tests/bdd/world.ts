import { expect } from 'vitest'
import { openRepository } from '../../src/index'
import { memory, context, obj } from '../fixtures/memory'
import type { ModelSource } from '@frade/metamodel-compiler'
export const unwrap = (r: any): any => {
  expect(r.ok, JSON.stringify(r.error)).toBe(true)
  return r.value
}
export const object = (id = 'A') => ({ ...obj(id), revision: 'old-' + id })
export const relation = (id = 'edge', source = 'A', target = 'B') => ({
  ref: { repositoryId: 'R', relationId: id },
  typeId: 'sample:IntegrationFlow',
  source: obj(source).ref,
  target: obj(target).ref,
  attributes: {},
  revision: 'old-' + id,
})
export const create = (id = 'A', key = 'op1') => ({
  repositoryId: 'R',
  idempotencyKey: key,
  commands: [{ op: 'createObject', object: obj(id) }],
})
export const body = (entity: any) => {
  const rest = { ...entity }
  delete rest.revision
  return rest
}
export const errorCode = (code: string) =>
  ({
    READ_ONLY: 'REPOSITORY_READ_ONLY',
    UNSUPPORTED: 'UNSUPPORTED_CAPABILITY',
    PERMISSION_DENIED: 'ACCESS_DENIED',
    CONFLICT: 'REVISION_CONFLICT',
  })[code] ?? code
export async function setup(
  w: any,
  options: Parameters<typeof memory>[0] = {},
  policy: any = { authorize: () => true },
) {
  w.fixture = await memory(options)
  w.sessions ??= []
  w.session = unwrap(await openRepository(w.fixture.adapter, context, policy))
  w.sessions.push(w.session)
  w.command = create()
  w.before = w.fixture.state
}
export function seed(w: any, objects: any[] = [object()], relations: any[] = []) {
  w.fixture.replaceState({ ...w.fixture.state, objects, relations })
  w.before = w.fixture.state
}
export function modelFixture(): ModelSource {
  return {
    sourceSchemaVersion: 1,
    definition: {
      schemaVersion: 1,
      id: 'sample:model',
      version: '1.0.0',
      imports: [],
      profiles: [],
      viewpoints: [],
      objectTypes: [
        {
          id: 'sample:Base',
          abstract: true,
          attributes: [{ id: 'rank', schema: { kind: 'integer' }, default: 1 }],
        },
        {
          id: 'sample:ApplicationSystem',
          extends: 'sample:Base',
          attributes: [
            {
              id: 'status',
              schema: { kind: 'enum', values: ['created', 'used'] },
              default: 'created',
            },
            {
              id: 'ref',
              schema: {
                kind: 'reference',
                targets: { typeIds: ['sample:ApplicationSystem'], includeSubtypes: true },
              },
            },
            { id: 'list', schema: { kind: 'list', items: { kind: 'string' } } },
          ],
        },
        { id: 'sample:BusinessProcess', attributes: [] },
      ],
      relationTypes: [
        {
          id: 'sample:IntegrationFlow',
          source: { typeIds: ['sample:ApplicationSystem'], includeSubtypes: true },
          target: { typeIds: ['sample:ApplicationSystem'], includeSubtypes: true },
          attributes: [],
          allowSelfReference: false,
          duplicates: 'forbid-same-type-and-pair',
        },
      ],
    },
  }
}
