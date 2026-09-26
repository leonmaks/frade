import { expect, it } from 'vitest'
import { memory, context, obj } from './fixtures/memory'
import { openRepository } from '../src/index'
import { modelFixture } from './bdd/world'
import * as ports from '@frade/repository-ports'
const unwrap = (r: any) => {
  expect(r.ok, JSON.stringify(r.error)).toBe(true)
  return r.value
}
async function fixture(policy: any) {
  const f = await memory({ model: modelFixture() })
  Object.assign(f.session.model, { policy })
  return {
    get state() {
      return f.state
    },
    session: unwrap(await openRepository(f.adapter, context, { authorize: () => true })),
  }
}
const policy = (rule: any) => ({
  schemaVersion: 1,
  objectTypes: { 'sample:ApplicationSystem': rule },
  relationTypes: {},
})
it('CORE-002 validates policy references and rejects executable or cyclic computations', async () => {
  const f = await memory({ model: modelFixture() })
  expect(
    ports.decodeRepositoryPolicy(
      policy({ attributes: { rank: { readOnly: true } } }),
      f.session.model.analysis(),
    ).ok,
  ).toBe(true)
  for (const input of [
    policy({ attributes: { unknown: { readOnly: true } } }),
    policy({ attributes: { rank: { computed: { kind: 'javascript', source: 'danger()' } } } }),
    policy({ attributes: { rank: { computed: { kind: 'attribute', key: 'rank' } } } }),
  ])
    expect(ports.decodeRepositoryPolicy(input, f.session.model.analysis()).ok).toBe(false)
  await f.session.close()
})
it('CORE-002 readonly attributes cannot be replaced and computed fields are deterministic', async () => {
  const f = await fixture(
    policy({
      attributes: {
        rank: { readOnly: true },
        status: { computed: { kind: 'literal', value: 'created' } },
      },
    }),
  )
  const a = { ...obj(), attributes: { rank: 2 } }
  const first = unwrap(
    await f.session.applyChanges({
      repositoryId: 'R',
      commands: [{ op: 'createObject', object: a }],
    }),
  )
  const revision = first.changes[0].entity.revision
  expect(unwrap(await f.session.getObject(a.ref)).attributes).toEqual({
    rank: 2,
    status: 'created',
  })
  const before = f.state
  expect(
    await f.session.applyChanges({
      repositoryId: 'R',
      commands: [
        {
          op: 'updateObject',
          object: { ...a, attributes: { rank: 3 } },
          expectedRevision: revision,
        },
      ],
    }),
  ).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } })
  expect(f.state).toEqual(before)
  expect(
    await f.session.applyChanges({
      repositoryId: 'R',
      commands: [
        {
          op: 'updateObject',
          object: { ...a, attributes: { rank: 2, status: 'used' } },
          expectedRevision: revision,
        },
      ],
    }),
  ).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } })
  await f.session.close()
})
it('CORE-002 creation/deletion and acyclic relation rules reject without mutation', async () => {
  const denied = await fixture(policy({ creation: 'deny' }))
  expect(
    (
      await denied.session.applyChanges({
        repositoryId: 'R',
        commands: [{ op: 'createObject', object: obj() }],
      })
    ).ok,
  ).toBe(false)
  await denied.session.close()
  const f = await fixture({
    schemaVersion: 1,
    objectTypes: { 'sample:ApplicationSystem': { deletion: 'deny' } },
    relationTypes: { 'sample:IntegrationFlow': { acyclic: true } },
  })
  unwrap(
    await f.session.applyChanges({
      repositoryId: 'R',
      commands: ['A', 'B'].map((id) => ({ op: 'createObject', object: obj(id) })),
    }),
  )
  const edge = (id: string, a: string, b: string) => ({
    op: 'createRelation',
    relation: {
      ref: { repositoryId: 'R', relationId: id },
      typeId: 'sample:IntegrationFlow',
      source: obj(a).ref,
      target: obj(b).ref,
      attributes: {},
    },
  })
  unwrap(await f.session.applyChanges({ repositoryId: 'R', commands: [edge('AB', 'A', 'B')] }))
  expect(
    await f.session.applyChanges({ repositoryId: 'R', commands: [edge('BA', 'B', 'A')] }),
  ).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } })
  const a = unwrap(await f.session.getObject(obj('A').ref))
  expect(
    (
      await f.session.applyChanges({
        repositoryId: 'R',
        commands: [
          {
            op: 'deleteObject',
            ref: a.ref,
            expectedRevision: a.revision,
            deletionPolicy: 'CASCADE',
          },
        ],
      })
    ).ok,
  ).toBe(false)
  await f.session.close()
})
