import { expect, it } from 'vitest'
import { success } from '@frade/repository-domain'
import { openRepository } from '../src/index'
import { memory, context, obj } from './fixtures/memory'
const unwrap = (r: any) => {
  expect(r.ok).toBe(true)
  return r.value
}
it.each(['history', 'writer', 'watch', 'reconciliation', 'query operators'])(
  'RP-1 rejects inconsistent %s services',
  async (defect) => {
    const fixture = await memory()
    if (defect === 'history') Object.assign(fixture.session.capabilities, { supportsHistory: true })
    if (defect === 'writer') Object.assign(fixture.session.writer!, { commit: true })
    if (defect === 'watch') {
      Object.assign(fixture.session.capabilities, { supportsWatch: true })
      Object.assign(fixture.session, { subscribe: true })
    }
    if (defect === 'reconciliation')
      Object.assign(fixture.session.capabilities, { reconciliation: 'forever' })
    if (defect === 'query operators')
      Object.assign(fixture.session.capabilities, { supportedQueryOperators: ['SQL'] })
    const result = await openRepository(fixture.adapter, context)
    expect(result).toMatchObject({ ok: false, error: { code: 'ADAPTER_CONTRACT' } })
    expect(fixture.closes).toBe(1)
  },
)
it.each([
  null,
  { ok: 'yes' },
  {
    ok: false,
    error: { code: 'ENTITY_NOT_FOUND', message: '/private/secret', issues: [], retriable: true },
  },
])('RP-3 sanitizes hostile adapter error envelopes (%j)', async (response) => {
  const fixture = await memory(),
    session = unwrap(await openRepository(fixture.adapter, context))
  fixture.session.read = async () => response as any
  const result = await session.getObject(obj().ref)
  expect(result.ok).toBe(false)
  expect(JSON.stringify(result)).not.toContain('private')
  await session.close()
})
it('RP-3 supported history is paged and validates output while unsupported filters never dispatch', async () => {
  const fixture = await memory()
  let reads = 0
  Object.assign(fixture.session.capabilities, { supportsHistory: true })
  Object.assign(fixture.session, {
    history: {
      read: async (query: any) => {
        reads++
        return success({
          items: [{ revision: 'r1', message: 'first' }],
          revision: 'head',
          ...(query.limit === 1 ? { cursor: 'next' } : {}),
        })
      },
    },
  })
  const session = unwrap(await openRepository(fixture.adapter, context))
  expect(await session.history({ limit: 1 })).toMatchObject({
    ok: true,
    value: { items: [{ revision: 'r1' }], cursor: 'next' },
  })
  expect(await session.history({ limit: 0 })).toMatchObject({
    ok: false,
    error: { code: 'INVALID_INPUT' },
  })
  expect(await session.history({ where: { op: 'sql' } })).toMatchObject({
    ok: false,
    error: { code: 'UNSUPPORTED_CAPABILITY' },
  })
  expect(reads).toBe(1)
  Object.assign(fixture.session, {
    history: { read: async () => success({ items: [{ revision: '' }], revision: 'head' }) },
  })
  expect(await session.history({ limit: 1 })).toMatchObject({
    ok: false,
    error: { code: 'ADAPTER_CONTRACT' },
  })
  await session.close()
})
