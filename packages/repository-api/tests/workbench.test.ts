import { expect, it } from 'vitest'
import {
  decodeHostCommand,
  decodeWorkspace,
  decodeScope,
  decodeScopedRequest,
  decodeWorkbenchEvent,
  decodeWorkbenchResult,
  boundedWorkbenchValue,
} from '../src/workbench'
it('DS-002 strictly bounds scopes, host grants, paths and malformed/oversized payloads', () => {
  const scope = { repositoryId: 'A', sessionId: 's', generation: 1, modelGeneration: 1 }
  expect(decodeScope(scope).ok).toBe(true)
  for (const value of [
    { ...scope, generation: 0 },
    { ...scope, permissions: ['write'] },
    { ...scope, modelGeneration: NaN },
  ])
    expect(decodeScope(value).ok).toBe(false)
  expect(
    decodeScopedRequest({
      scope,
      request: {
        version: 1,
        operation: 'getObject',
        payload: { ref: { repositoryId: 'A', objectId: 'x' }, path: 'C:/secret' },
      },
    }).ok,
  ).toBe(false)
  expect(
    decodeHostCommand({ operation: 'add', adapterKind: 'sberea', dataRoot: 'C:/secret' }).ok,
  ).toBe(false)
  expect(
    decodeHostCommand({
      operation: 'stageMetadata',
      repositoryId: 'A',
      metadataSet: {
        id: 'm',
        label: 'M',
        folderPath: './model',
        dialect: 'sberea',
        schemaEntries: ['schema.yaml'],
        documentEntries: [],
      },
    }).ok,
  ).toBe(true)
  expect(decodeHostCommand({ operation: 'reorder', repositoryIds: ['A', 'A'] }).ok).toBe(false)
  expect(decodeWorkspace({ version: 1, roots: Array(65).fill({}) }).ok).toBe(false)
  expect(boundedWorkbenchValue('x'.repeat(8_000_001)).ok).toBe(false)
  const cyclic: any = {}
  cyclic.self = cyclic
  expect(decodeWorkbenchResult(cyclic).ok).toBe(false)
  let invoked = false
  const getter = {
    get ok() {
      invoked = true
      return true
    },
  }
  expect(decodeWorkbenchResult(getter).ok).toBe(false)
  expect(invoked).toBe(false)
})
it('DS-003 rejects events attributed to another repository and invalid order counters', () => {
  const event = {
    version: 1,
    scope: { repositoryId: 'A', sessionId: 's', generation: 1, modelGeneration: 1 },
    event: {
      eventId: 'e',
      repositoryId: 'A',
      sequence: 1,
      type: 'repository.reloaded',
      revision: 'r',
    },
  }
  expect(decodeWorkbenchEvent(event).ok).toBe(true)
  expect(decodeWorkbenchEvent({ ...event, event: { ...event.event, repositoryId: 'B' } }).ok).toBe(
    false,
  )
  expect(decodeWorkbenchEvent({ ...event, event: { ...event.event, sequence: 0 } }).ok).toBe(false)
  expect(decodeWorkbenchEvent({ ...event, event: { ...event.event, type: 'execute' } }).ok).toBe(
    false,
  )
  expect(decodeWorkbenchResult({ ok: true })).toMatchObject({ ok: false })
  expect(decodeWorkbenchResult({ ok: false, error: { code: 'X', issues: [] } })).toMatchObject({
    ok: false,
    error: { code: 'ADAPTER_CONTRACT' },
  })
})
