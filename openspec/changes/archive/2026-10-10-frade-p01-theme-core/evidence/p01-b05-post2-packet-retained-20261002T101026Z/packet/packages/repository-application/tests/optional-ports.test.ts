import { expect, it } from 'vitest'
import { openRepository } from '../src/index'
import { success } from '@frade/repository-domain'
import { memory, context, obj } from './fixtures/memory'

it('RP-1 point-only adapters open without pretending to provide queries or snapshots', async () => {
  const fixture = await memory({ writeMode: 'read-only' })
  fixture.replaceState({ ...fixture.state, objects: [{ ...obj(), revision: 'r1' as any }] })
  const minimal = { ...fixture.session } as any
  delete minimal.query
  delete minimal.snapshot
  minimal.capabilities = {
    ...minimal.capabilities,
    supportedQueryOperators: [],
    supportsServerSideQueries: false,
  }
  const opened = await openRepository({ open: async () => success(minimal) }, context)
  expect(opened.ok).toBe(true)
  if (!opened.ok) return
  try {
    expect(await opened.value.getObject(obj().ref)).toMatchObject({
      ok: true,
      value: { name: 'A' },
    })
    expect(await opened.value.queryObjects()).toMatchObject({
      ok: false,
      error: { code: 'UNSUPPORTED_CAPABILITY' },
    })
    expect(await opened.value.exportSnapshot()).toMatchObject({
      ok: false,
      error: { code: 'UNSUPPORTED_CAPABILITY' },
    })
  } finally {
    await opened.value.close()
  }
  expect(fixture.closes).toBe(1)
})
it('RP-1 missing declared query service is a contract error and releases the session', async () => {
  const fixture = await memory({ writeMode: 'read-only' }),
    broken = { ...fixture.session } as any
  delete broken.query
  broken.capabilities = { ...broken.capabilities, supportsServerSideQueries: true }
  expect(await openRepository({ open: async () => success(broken) }, context)).toMatchObject({
    ok: false,
    error: { code: 'ADAPTER_CONTRACT' },
  })
  expect(fixture.closes).toBe(1)
})
