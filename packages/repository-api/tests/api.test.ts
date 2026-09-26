import { expect, it } from 'vitest'
import * as api from '../src/index'
it('transport decoder rejects credential and path injection before dispatch', () => {
  for (const payload of [
    { operation: 'fs.read', path: '/secret' },
    {
      version: 1,
      operation: 'getObject',
      payload: { ref: { repositoryId: 'R', objectId: 'A' }, path: '/secret' },
    },
    { version: 1, operation: 'eval', payload: { source: 'process.exit()' } },
  ])
    expect(api.decodeRequest(payload).ok).toBe(false)
})
it('transport requires replay identity for writes and exposes reconciliation', () => {
  expect(
    api.decodeRequest({
      version: 1,
      operation: 'applyChanges',
      payload: { changeSet: { repositoryId: 'R', commands: [] } },
    }).ok,
  ).toBe(false)
  expect(
    api.decodeRequest({ version: 1, operation: 'reconcile', payload: { operationId: 'op' } }).ok,
  ).toBe(true)
})

it('unwired presentation returns an explicit unsupported result instead of undefined', async () => {
  const { openRepository } = await import('@frade/repository-application')
  const { memory, context } = await import('../../repository-application/tests/fixtures/memory')
  const fixture = await memory(),
    opened = await openRepository(fixture.adapter, context)
  if (!opened.ok) throw Error(opened.error.code)
  try {
    expect(
      await new api.RepositoryApi(opened.value).handle({
        version: 1,
        operation: 'presentation',
        payload: {},
      }),
    ).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED_CAPABILITY' } })
  } finally {
    await opened.value.close()
  }
})

it('configured flow API is portable and authenticated even after an index is cached', async () => {
  const { openRepository } = await import('@frade/repository-application'),
    { memory, context, obj } = await import('../../repository-application/tests/fixtures/memory')
  const fixture = await memory()
  fixture.replaceState({
    ...fixture.state,
    objects: [
      {
        ...obj('F1'),
        revision: fixture.state.revision,
        attributes: {
          producer: { repositoryId: 'R', objectId: 'A' },
          consumer: { repositoryId: 'R', objectId: 'B' },
        },
      },
    ],
  })
  const opened = await openRepository(fixture.adapter, context)
  if (!opened.ok) throw Error(opened.error.code)
  const transport = new api.RepositoryApi(opened.value, [
    {
      typeId: obj().typeId,
      source: 'producer',
      consumer: 'consumer',
      search: [],
      columns: [],
      nonCloneable: [],
    },
  ])
  const request = {
    version: 1,
    operation: 'integrationFlows',
    payload: {
      query: {
        endpointA: { repositoryId: 'R', objectId: 'A' },
        endpointB: { repositoryId: 'R', objectId: 'B' },
      },
    },
  }
  expect(await transport.handle(request)).toMatchObject({ ok: true, value: { total: 1 } })
  await opened.value.close()
  expect((await transport.handle(request)).ok).toBe(false)
  transport.dispose()
})
