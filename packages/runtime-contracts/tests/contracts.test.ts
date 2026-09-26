import { describe, it, expect } from 'vitest'
import {
  healthRequest,
  parseRequest,
  parseBackendMessage,
  parseHealthEvent,
  parseHealth,
  failure,
} from '../src'
describe('runtime validation', () => {
  it('accepts only the named health operation', () =>
    expect(parseRequest(healthRequest('id-1'))).toEqual(healthRequest('id-1')))
  it.each([
    [{ ...healthRequest('a'), protocolVersion: 2 }, 'VERSION_MISMATCH'],
    [{ ...healthRequest('a'), operation: 'fs.read' }, 'UNKNOWN_OPERATION'],
    [{ ...healthRequest('a'), payload: { path: 'secret' } }, 'INVALID_REQUEST'],
    [{ ...healthRequest('a'), requestId: '' }, 'INVALID_REQUEST'],
    [{ ...healthRequest('a'), extra: true }, 'INVALID_REQUEST'],
    [null, 'INVALID_REQUEST'],
  ])('rejects invalid request %j', (v, code) => expect(() => parseRequest(v)).toThrow(String(code)))
  it('validates responses and events', () => {
    expect(parseBackendMessage(failure('a', 'TIMEOUT'))).toMatchObject({ error: 'TIMEOUT' })
    expect(parseBackendMessage({ type: 'ready', protocolVersion: 1 })).toMatchObject({
      type: 'ready',
    })
    expect(() => parseBackendMessage({ type: 'ready', protocolVersion: 2 })).toThrow(
      'PROTOCOL_ERROR',
    )
    expect(() =>
      parseBackendMessage({ ...failure('a', 'TIMEOUT'), error: 'internal secret' }),
    ).toThrow()
    expect(
      parseHealthEvent({
        type: 'health',
        protocolVersion: 1,
        health: { state: 'ready', sequence: 2 },
      }).health.sequence,
    ).toBe(2)
    expect(() =>
      parseHealthEvent({
        type: 'health',
        protocolVersion: 2,
        health: { state: 'ready', sequence: 2 },
      }),
    ).toThrow()
  })
  it.each([
    { state: 'ready', sequence: -1 },
    { state: 'oops', sequence: 0 },
    { state: 'ready', sequence: NaN },
    { state: 'ready', sequence: 0, secret: true },
  ])('rejects invalid health %j', (v) => expect(() => parseHealth(v)).toThrow())
})
