import {
  parseRequest,
  RuntimeError,
  failure,
  validId,
  record,
  type Response,
} from '@frade/runtime-contracts'
// The service has no Electron or renderer dependency.
export function handleRequest(value: unknown): Response | undefined {
  try {
    const request = parseRequest(value)
    return {
      type: 'response',
      protocolVersion: 1,
      requestId: request.requestId,
      ok: true,
      result: { state: 'ready', sequence: 0 },
    }
  } catch (error) {
    // Uncorrelatable input never becomes an executable operation.
    if (!record(value) || !validId(value.requestId)) return undefined
    return failure(value.requestId, error instanceof RuntimeError ? error.code : 'INVALID_REQUEST')
  }
}

export * from './adapters'

export * from './repositories'
