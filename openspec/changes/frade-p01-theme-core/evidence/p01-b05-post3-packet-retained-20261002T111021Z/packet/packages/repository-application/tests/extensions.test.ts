import { expect, it } from 'vitest'
import * as app from '../src/index'
import { memory, obj, context } from './fixtures/memory'
it('federation preserves repository-qualified resolution and permission failures', async () => {
  const fixture = await memory(),
    opened = await app.openRepository(fixture.adapter, context, { authorize: () => true })
  if (!opened.ok) throw Error('open')
  const registry = new app.RepositoryFederation()
  registry.register('R', opened.value)
  expect(
    await registry.resolveObject(
      { repositoryId: 'missing', objectId: 'A' },
      { ...context, repositoryIds: ['missing'] },
    ),
  ).toMatchObject({ ok: false, error: { code: 'REPOSITORY_UNAVAILABLE' } })
  expect(await registry.resolveObject(obj().ref, { ...context, permissions: [] })).toMatchObject({
    ok: false,
    error: { code: 'ACCESS_DENIED' },
  })
  expect(await registry.resolveObject(obj().ref, context)).toMatchObject({
    ok: false,
    error: { code: 'ENTITY_NOT_FOUND' },
  })
  await opened.value.close()
})
it('batch import validates first and uses explicit repository revision', async () => {
  const fixture = await memory(),
    opened = await app.openRepository(fixture.adapter, context, { authorize: () => true })
  if (!opened.ok) throw Error('open')
  const snapshot = { ...fixture.state, objects: [{ ...obj(), revision: 'external' as any }] }
  expect(
    (
      await app.importSnapshot(opened.value, snapshot, {
        expectedRevision: fixture.state.revision,
        idempotencyKey: 'import',
      })
    ).ok,
  ).toBe(true)
  expect(fixture.state.objects).toHaveLength(1)
  expect(
    await app.importSnapshot(opened.value, snapshot, {
      expectedRevision: 'stale',
      idempotencyKey: 'another',
    }),
  ).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } })
  await opened.value.close()
})
