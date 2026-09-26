import { expect, it } from 'vitest'
import { success, type RepositoryObject } from '@frade/repository-domain'
import { RepositoryBridge } from '../src/index'
const entity = (revision = 'r1', status = 'created'): RepositoryObject => ({
  ref: { repositoryId: 'R', objectId: 'A' },
  typeId: 'sample:ApplicationSystem',
  name: 'A',
  attributes: { status },
  revision: revision as any,
})
it('CORE-005 bridge refuses a mismatched entity returned for the requested reference', async () => {
  const b = new RepositoryBridge({
    getObject: async () => success({ ...entity(), ref: { repositoryId: 'R', objectId: 'B' } }),
    getRelation: async () => {
      throw Error()
    },
    subscribe: () => () => {},
  })
  expect(await b.bindObject('node', entity().ref)).toMatchObject({
    ok: false,
    error: { code: 'ADAPTER_CONTRACT' },
  })
})
it('CORE-014 bound controllers refresh status styles, preserve visuals and remain detached until explicit reconnect', async () => {
  let value = entity(),
    reads = 0
  const listeners = new Set<(event: any) => void>(),
    updates: any[] = []
  const b = new RepositoryBridge({
    getObject: async () => {
      reads++
      return success(value)
    },
    getRelation: async () => {
      throw Error()
    },
    subscribe: (fn) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
  })
  const bound = await b.bindObject('node', value.ref)
  if (!bound.ok) throw Error(bound.error.code)
  const controller = (b as any).watchBinding(
    { ...bound.value, geometry: { x: 20 }, overrides: { fill: 'blue' } },
    { stroke: { attribute: 'status', values: { created: 'gray', used: 'green' } } },
    (v: any) => updates.push(v),
  )
  value = entity('r2', 'used')
  for (const fn of listeners) fn({ repositoryId: 'R', type: 'object.updated', ref: value.ref })
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(controller.current()).toMatchObject({
    binding: {
      state: 'BOUND',
      snapshot: { revision: 'r2' },
      geometry: { x: 20 },
      overrides: { fill: 'blue' },
    },
    style: { stroke: 'green', fill: 'blue' },
  })
  controller.detach()
  const before = reads
  value = entity('r3', 'created')
  for (const fn of listeners) fn({ repositoryId: 'R', type: 'object.updated', ref: value.ref })
  await Promise.resolve()
  expect(reads).toBe(before)
  await controller.reconnect()
  expect(controller.current().binding.state).toBe('STALE')
  expect(controller.current().binding.snapshot.revision).toBe('r2')
  await controller.reconcile()
  expect(controller.current().binding.snapshot.revision).toBe('r3')
  controller.unbind()
  expect(controller.current().binding.state).toBe('UNBOUND')
  const count = updates.length
  controller.close()
  expect(listeners.size).toBe(0)
  await controller.reconcile()
  expect(updates).toHaveLength(count)
})
