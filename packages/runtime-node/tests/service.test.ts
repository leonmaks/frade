import { it, expect } from 'vitest'
import { healthRequest } from '@frade/runtime-contracts'
import { handleRequest } from '../src'
it('returns a validated correlated health response', () =>
  expect(handleRequest(healthRequest('id'))).toEqual({
    type: 'response',
    protocolVersion: 1,
    requestId: 'id',
    ok: true,
    result: { state: 'ready', sequence: 0 },
  }))
it('revalidates every backend request', () => {
  expect(handleRequest({ ...healthRequest('id'), operation: 'run' })).toMatchObject({
    ok: false,
    error: 'UNKNOWN_OPERATION',
  })
  expect(handleRequest({ ...healthRequest('id'), payload: { command: 'run' } })).toMatchObject({
    ok: false,
    error: 'INVALID_REQUEST',
  })
  expect(handleRequest(null)).toBeUndefined()
})
