import { it, expect } from 'vitest'
import { IntegrationFlowService } from '../src/integration-flows'
import { success, type RepositoryObject, type Revision } from '@frade/repository-domain'
const ref = (objectId: string) => ({ repositoryId: 'r', objectId })
const config = {
  typeId: 'custom:Flow',
  source: 'producer',
  consumer: 'recipient',
  search: ['description', 'tech', 'status'],
  columns: [
    { field: 'tech', label: 'Technology' },
    { field: 'status', label: 'Status' },
  ],
  nonCloneable: [],
}
const obj = (id: string, a = 'A', b = 'B') =>
  ({
    ref: ref(id),
    typeId: 'custom:Flow',
    name: id,
    revision: 'v1' as Revision,
    attributes: {
      producer: ref(a),
      recipient: ref(b),
      description: 'Payload ' + id,
      tech: ['HTTP'],
      status: 'Active',
    },
  }) as RepositoryObject
it('indexes both directions; pair/full text filters paging sorting and events', async () => {
  const listeners: any[] = []
  let reads = 0
  let objects = [obj('F1'), obj('F2', 'B', 'A'), obj('F3', 'C', 'D')]
  const core = {
    repositoryId: 'r',
    subscribe: (fn: any) => {
      listeners.push(fn)
      return () => {}
    },
    exportSnapshot: async () => {
      reads++
      return success({ objects })
    },
  }
  const service = new IntegrationFlowService(core as any, [config])
  const q = { endpointA: ref('A'), endpointB: ref('B'), members: [ref('F2')], limit: 1 }
  const one = await service.search(q)
  expect(one.ok && one.value.totalEligible).toBe(2)
  expect(one.ok && one.value.items[0].flow.ref.objectId).toBe('F2')
  const two = await service.search({ ...q, offset: 1 })
  expect(two.ok && two.value.items[0].flow.ref.objectId).toBe('F1')
  expect(reads).toBe(1)
  const all = await service.search({ ...q, scope: 'ALL', limit: 50 })
  expect(all.ok && all.value.items.map((x) => x.eligible)).toEqual([true, true, false])
  const filter = await service.search({
    ...q,
    text: 'F3',
    scope: 'ALL',
    filters: { status: 'Active' },
    limit: 50,
  })
  expect(filter.ok && filter.value.items.map((x) => x.flow.ref.objectId)).toEqual(['F3'])
  objects = [...objects, obj('F4')]
  listeners[0]({ type: 'object.created' })
  expect((await service.search(q)).ok).toBe(true)
  expect(reads).toBe(2)
  service.dispose()
})
it('reports errors separately from empty and limits 100000-flow pages', async () => {
  const many = Array.from({ length: 100000 }, (_, i) =>
    obj('F' + i, i % 2 ? 'A' : 'C', i % 2 ? 'B' : 'D'),
  )
  const core = {
    repositoryId: 'r',
    subscribe: () => () => {},
    exportSnapshot: async () => success({ objects: many }),
  }
  const service = new IntegrationFlowService(core as any, [config])
  const result = await service.search({ endpointA: ref('A'), endpointB: ref('B'), limit: 50 })
  expect(result.ok && result.value.totalEligible).toBe(50000)
  expect(result.ok && result.value.items).toHaveLength(50)
  expect(
    await service.search({ endpointA: ref('A'), endpointB: ref('B'), limit: 10000 }),
  ).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } })
  service.dispose()
})

it('guards cached queries, cancellation, malformed refs, and missing/incompatible members', async () => {
  let allowed = true
  const core = {
    repositoryId: 'r',
    checkReadAccess: () =>
      allowed ? success(undefined) : { ok: false, error: { code: 'ACCESS_DENIED' } },
    subscribe: () => () => {},
    exportSnapshot: async () => success({ objects: [obj('F1'), obj('F2', 'C', 'D')] }),
  }
  const service = new IntegrationFlowService(core as any, [config]),
    q = {
      endpointA: ref('A'),
      endpointB: ref('B'),
      members: [ref('F1'), ref('F2'), ref('Missing')],
    }
  expect(await service.search(q)).toMatchObject({
    ok: true,
    value: { members: [{ state: 'valid' }, { state: 'incompatible' }, { state: 'missing' }] },
  })
  expect(await service.search(q, { isCancellationRequested: true } as any)).toMatchObject({
    ok: false,
    error: { code: 'CANCELLED' },
  })
  expect(
    await service.search({ ...q, endpointA: { ...ref('A'), repositoryId: 'other' } }),
  ).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } })
  allowed = false
  expect(await service.search(q)).toMatchObject({ ok: false, error: { code: 'ACCESS_DENIED' } })
  service.dispose()
})
it('portable paged reader pins revision and performs no per-object label reads', async () => {
  let reads = 0,
    revision = 'v1'
  const core = {
    repositoryId: 'r',
    subscribe: () => () => {},
    exportSnapshot: async () => ({ ok: false, error: { code: 'UNSUPPORTED_CAPABILITY' } }),
    queryObjects: async (q: any) => {
      reads++
      return success({
        revision,
        items: q.projection ? [] : q.cursor ? [obj('F2', 'B', 'A')] : [obj('F1')],
        ...(!q.cursor && !q.projection ? { cursor: 'next' } : {}),
      })
    },
  }
  const service = new IntegrationFlowService(core as any, [config])
  expect(await service.search({ endpointA: ref('A'), endpointB: ref('B') })).toMatchObject({
    ok: true,
    value: { total: 2 },
  })
  expect(reads).toBe(3)
  expect((await service.search({ endpointA: ref('A'), endpointB: ref('B'), text: 'F2' })).ok).toBe(
    true,
  )
  expect(reads).toBe(3)
  revision = 'v2'
  service.dispose()
})

it('100000-flow fixture crosses real authenticated Core pages without snapshot or label N+1', async () => {
  const { memory, context, obj } = await import('./fixtures/memory'),
    { openRepository } = await import('../src/session')
  const fixture = await memory(),
    many = Array.from({ length: 100000 }, (_, i) => ({
      ...obj('F' + i),
      revision: 'v1' as Revision,
      attributes: {
        producer: { repositoryId: 'R', objectId: i % 2 ? 'A' : 'C' },
        recipient: { repositoryId: 'R', objectId: i % 2 ? 'B' : 'D' },
        description: 'Payload ' + i,
        tech: ['HTTP'],
        status: 'Active',
      },
    }))
  let pages = 0,
    reads = 0
  fixture.session.query = async (_kind, q) => {
    pages++
    const offset = Number(q.cursor ?? 0),
      items = many.slice(offset, offset + (q.limit ?? 100))
    return success({
      items,
      revision: 'v1',
      ...(offset + items.length < many.length ? { cursor: String(offset + items.length) } : {}),
    })
  }
  fixture.session.read = async () => {
    reads++
    throw Error('unexpected N+1')
  }
  fixture.session.snapshot = async () => {
    throw Error('no unbounded snapshot')
  }
  const opened = await openRepository(fixture.adapter, context)
  if (!opened.ok) throw Error(opened.error.code)
  const service = new IntegrationFlowService(opened.value, [{ ...config, typeId: obj().typeId }]),
    query = {
      endpointA: { repositoryId: 'R', objectId: 'A' },
      endpointB: { repositoryId: 'R', objectId: 'B' },
      limit: 50,
    }
  try {
    const result = await service.search(query)
    expect(result.ok && result.value.totalEligible).toBe(50000)
    expect(result.ok && result.value.items).toHaveLength(50)
    expect(pages).toBe(101)
    expect(reads).toBe(0)
    expect((await service.search({ ...query, text: 'HTTP' })).ok).toBe(true)
    expect(pages).toBe(101)
  } finally {
    service.dispose()
    await opened.value.close()
  }
}, 20000)

it('configured column sorting and full-scope relevance are bounded and stable', async () => {
  const objects = [
    { ...obj('F1'), attributes: { ...obj('F1').attributes, status: 'Z' } },
    { ...obj('F2'), attributes: { ...obj('F2').attributes, status: 'A' } },
    { ...obj('Else', 'C', 'D'), name: 'contains Exact' },
    { ...obj('Exact', 'C', 'D'), name: 'zzz' },
  ]
  const service = new IntegrationFlowService(
      {
        repositoryId: 'r',
        subscribe: () => () => {},
        exportSnapshot: async () => success({ objects }),
      } as any,
      [config],
    ),
    q = { endpointA: ref('A'), endpointB: ref('B') }
  const ordered = await service.search({ ...q, sort: 'status' })
  expect(ordered.ok && ordered.value.items.map((r) => r.flow.ref.objectId)).toEqual(['F2', 'F1'])
  const ranked = await service.search({ ...q, scope: 'ALL', text: 'Exact' })
  expect(ranked.ok && ranked.value.items[0].flow.ref.objectId).toBe('Exact')
  expect(await service.search({ ...q, sort: 'unconfigured' })).toMatchObject({
    ok: false,
    error: { code: 'INVALID_INPUT' },
  })
  service.dispose()
})
