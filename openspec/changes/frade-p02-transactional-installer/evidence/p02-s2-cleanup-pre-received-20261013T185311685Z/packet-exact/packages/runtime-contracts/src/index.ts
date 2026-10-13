export const PROTOCOL_VERSION = 1 as const
export const REQUEST_CHANNEL = 'frade:health'
export const EVENT_CHANNEL = 'frade:health-event'
export type HealthState = 'starting' | 'ready' | 'unavailable' | 'stopping'
export type Health = { state: HealthState; sequence: number }
export const errorCodes = [
  'INVALID_REQUEST',
  'VERSION_MISMATCH',
  'UNKNOWN_OPERATION',
  'UNAUTHORIZED',
  'UNAVAILABLE',
  'TIMEOUT',
  'CANCELLED',
  'PROTOCOL_ERROR',
  'SHUTTING_DOWN',
] as const
export type ErrorCode = (typeof errorCodes)[number]
export class RuntimeError extends Error {
  constructor(public readonly code: ErrorCode) {
    super(code)
    this.name = 'RuntimeError'
  }
}
export type Request = {
  type: 'request'
  protocolVersion: 1
  requestId: string
  operation: 'health.get'
  payload: Record<string, never>
}
export type Response = { type: 'response'; protocolVersion: 1; requestId: string } & (
  { ok: true; result: Health } | { ok: false; error: ErrorCode }
)
export type ClientMessage = Request | { type: 'cancel'; requestId: string } | { type: 'shutdown' }
export type BackendMessage = Response | { type: 'ready'; protocolVersion: 1 }
export type HealthEvent = { type: 'health'; protocolVersion: 1; health: Health }
export interface DesktopApi {
  runtime: { getHealth(): Promise<Health> }
  events: { subscribe(listener: (health: Health) => void): () => void }
}
export const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)
const keys = (v: Record<string, unknown>, expected: string[]) =>
  Object.keys(v).length === expected.length && expected.every((k) => Object.hasOwn(v, k))
export const validId = (v: unknown): v is string =>
  typeof v === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(v)
export function parseRequest(v: unknown): Request {
  if (!record(v)) throw new RuntimeError('INVALID_REQUEST')
  if (v.protocolVersion !== 1) throw new RuntimeError('VERSION_MISMATCH')
  if (v.operation !== 'health.get') throw new RuntimeError('UNKNOWN_OPERATION')
  if (
    !keys(v, ['type', 'protocolVersion', 'requestId', 'operation', 'payload']) ||
    v.type !== 'request' ||
    !validId(v.requestId) ||
    !record(v.payload) ||
    Object.keys(v.payload).length
  )
    throw new RuntimeError('INVALID_REQUEST')
  return v as Request
}
export function parseHealth(v: unknown): Health {
  if (
    !record(v) ||
    !keys(v, ['state', 'sequence']) ||
    !['starting', 'ready', 'unavailable', 'stopping'].includes(String(v.state)) ||
    !Number.isSafeInteger(v.sequence) ||
    (v.sequence as number) < 0
  )
    throw new RuntimeError('PROTOCOL_ERROR')
  return v as Health
}
export function parseBackendMessage(v: unknown): BackendMessage {
  if (!record(v) || v.protocolVersion !== 1) throw new RuntimeError('PROTOCOL_ERROR')
  if (v.type === 'ready' && keys(v, ['type', 'protocolVersion'])) return v as BackendMessage
  if (v.type !== 'response' || !validId(v.requestId)) throw new RuntimeError('PROTOCOL_ERROR')
  if (v.ok === true && keys(v, ['type', 'protocolVersion', 'requestId', 'ok', 'result'])) {
    parseHealth(v.result)
    return v as Response
  }
  if (
    v.ok === false &&
    keys(v, ['type', 'protocolVersion', 'requestId', 'ok', 'error']) &&
    errorCodes.includes(v.error as ErrorCode)
  )
    return v as Response
  throw new RuntimeError('PROTOCOL_ERROR')
}
export function parseHealthEvent(v: unknown): HealthEvent {
  if (
    !record(v) ||
    !keys(v, ['type', 'protocolVersion', 'health']) ||
    v.type !== 'health' ||
    v.protocolVersion !== 1
  )
    throw new RuntimeError('PROTOCOL_ERROR')
  parseHealth(v.health)
  return v as HealthEvent
}
export function failure(requestId: string, error: ErrorCode): Response {
  return { type: 'response', protocolVersion: 1, requestId, ok: false, error }
}
export function healthRequest(requestId: string): Request {
  return { type: 'request', protocolVersion: 1, requestId, operation: 'health.get', payload: {} }
}

export * from './presentation'
