import type { IncomingMessage, ServerResponse } from 'node:http'
import { failure } from '@frade/repository-domain'
import { CancellationSource, type RepositorySession } from '@frade/repository-application'
import { RepositoryApi } from './service'
import { decodeRequest } from './protocol'
import type { CancellationToken } from '@frade/repository-ports'
export interface RepositoryHttpOptions {
  /** Authenticate the request and return a session with that caller's permissions. */
  readonly sessionFor: (
    request: IncomingMessage,
    token?: CancellationToken,
  ) => Promise<RepositorySession | undefined>
  readonly maxBodyBytes?: number
  readonly timeoutMs?: number
}
export function createRepositoryHttpHandler(options: RepositoryHttpOptions) {
  const max = options.maxBodyBytes ?? 1000000,
    timeout = options.timeoutMs ?? 30000
  if (
    !Number.isInteger(max) ||
    max < 1 ||
    max > 16000000 ||
    !Number.isInteger(timeout) ||
    timeout < 1 ||
    timeout > 120000
  )
    throw Error('Invalid HTTP resource limits')
  return async (request: IncomingMessage, response: ServerResponse) => {
    const cancellation = new CancellationSource()
    const send = (status: number, value: unknown) => {
      if (response.writableEnded) return
      response.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      })
      response.end(JSON.stringify(value), () => {
        if (status === 408 || status === 413) request.destroy()
      })
    }
    let writeId: string | undefined
    const timer = setTimeout(() => {
      cancellation.cancel()
      send(408, writeId ? failure('OUTCOME_UNKNOWN', [], writeId) : failure('CANCELLED'))
    }, timeout)
    const aborted = () => cancellation.cancel()
    const disconnected = () => {
      if (!response.writableEnded) cancellation.cancel()
    }
    let stopWaiting: (() => void) | undefined
    const interrupted = new Promise<undefined>((resolve) => {
      stopWaiting = cancellation.subscribe(() => resolve(undefined))
    })
    request.on('aborted', aborted)
    response.on('close', disconnected)
    try {
      if (request.method !== 'POST' || request.url !== '/repository') {
        send(404, failure('UNSUPPORTED_CAPABILITY'))
        return
      }
      if (!request.headers['content-type']?.startsWith('application/json')) {
        send(415, failure('INVALID_INPUT'))
        return
      }
      const session = await Promise.race([options.sessionFor(request, cancellation), interrupted])
      if (cancellation.isCancellationRequested) return
      if (!session) {
        send(403, failure('ACCESS_DENIED'))
        return
      }
      const chunks: Buffer[] = []
      let size = 0
      for await (const chunk of request) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        size += bytes.length
        if (size > max) {
          send(413, failure('RESOURCE_LIMIT'))
          return
        }
        chunks.push(bytes)
      }
      if (cancellation.isCancellationRequested) return
      let input: unknown
      try {
        input = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      } catch {
        send(400, failure('INVALID_INPUT'))
        return
      }
      const decoded = decodeRequest(input)
      if (decoded.ok && decoded.value.operation === 'applyChanges')
        writeId = (decoded.value.payload.changeSet as { idempotencyKey: string }).idempotencyKey
      const result = await Promise.race([
        new RepositoryApi(session).handle(input, cancellation),
        interrupted,
      ])
      if (!result) return
      const status = result.ok
        ? 200
        : result.error.code === 'ACCESS_DENIED'
          ? 403
          : result.error.code === 'REVISION_CONFLICT'
            ? 409
            : result.error.code === 'ENTITY_NOT_FOUND'
              ? 404
              : 400
      send(status, result)
    } catch {
      send(503, failure('REPOSITORY_UNAVAILABLE'))
    } finally {
      clearTimeout(timer)
      request.off('aborted', aborted)
      response.off('close', disconnected)
      stopWaiting?.()
    }
  }
}
