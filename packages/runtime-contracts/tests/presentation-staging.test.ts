import { expect, it } from 'vitest'
import { parsePresentationRequest, parsePresentationResponse } from '../src/presentation'
const context = {
  version: 1,
  sessionId: 'window',
  requestId: 'window/1',
  transactionId: 'window/1',
  generation: 1,
  revision: 1,
  membership: 1,
  phase: 'prepare',
}
const selection = {
  mode: 'dark',
  density: 'compact',
  preferred: {
    light: 'frade.builtin/light',
    dark: 'frade.builtin/dark',
    'high-contrast': 'frade.builtin/high-contrast',
  },
}
const request = {
  version: 1,
  sessionId: 'window',
  requestId: 'window/1',
  operation: 'stage',
  payload: { context, selection, expectedRevision: 0 },
}
it('stage DTO owns bounded prepare choice and rejects foreign phase identities fields and accessors', () => {
  const parsed = parsePresentationRequest(request)
  expect(parsed).toEqual(request)
  expect(Object.isFrozen(parsed.payload)).toBe(true)
  expect(Object.isFrozen(request.payload)).toBe(false)
  for (const patch of [
    { ...request, extra: true },
    { ...request, payload: { ...request.payload, path: 'C:/outside' } },
    { ...request, payload: { ...request.payload, expectedRevision: -1 } },
    ...['apply', 'rollback', 'join'].map((phase) => ({
      ...request,
      payload: { ...request.payload, context: { ...context, phase } },
    })),
    ...['sessionId', 'requestId', 'transactionId'].map((key) => ({
      ...request,
      payload: { ...request.payload, context: { ...context, [key]: 'foreign' } },
    })),
    { ...request, payload: { ...request.payload, context: { ...context, membership: NaN } } },
    { ...request, payload: { ...request.payload, selection: { ...selection, path: 'outside' } } },
    { ...request, requestId: 'x'.repeat(40000) },
  ])
    expect(() => parsePresentationRequest(patch)).toThrow()
  let invoked = false
  const getter = { ...request }
  Object.defineProperty(getter, 'operation', {
    get() {
      invoked = true
      return 'stage'
    },
  })
  expect(() => parsePresentationRequest(getter)).toThrow()
  expect(invoked).toBe(false)
})
it('STAGED is immutable temporary acknowledgement and cannot masquerade as durable ACK', () => {
  const parsed = parsePresentationRequest(request)
  const response = parsePresentationResponse({ status: 'STAGED' }, parsed)
  expect(response).toEqual({ status: 'STAGED' })
  expect(Object.isFrozen(response)).toBe(true)
  for (const bad of [
    { status: 'ACK' },
    { status: 'STAGED', durable: {} },
    { status: 'STAGED', message: 'extra' },
    { status: 'ready' },
    { status: 'UNKNOWN', message: 'x'.repeat(40000) },
    { status: 'REFUSED', message: 'failure', path: 'outside' },
  ])
    expect(() => parsePresentationResponse(bad, parsed)).toThrow()
  for (const status of ['REFUSED', 'UNKNOWN'])
    expect(parsePresentationResponse({ status, message: 'flush failed' }, parsed)).toEqual({
      status,
      message: 'flush failed',
    })
  const apply = parsePresentationRequest({
    ...request,
    operation: 'persist',
    payload: { ...request.payload, context: { ...context, phase: 'apply' } },
  })
  expect(() => parsePresentationResponse({ status: 'STAGED' }, apply)).toThrow()
})
