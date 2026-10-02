import { expect, it } from 'vitest'
import { createServer, request, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { openRepository } from '@frade/repository-application'
import { memory, context, obj, deferred } from '../../repository-application/tests/fixtures/memory'
import { createRepositoryHttpHandler, type RepositoryHttpOptions } from '../src/http'

async function host(options: RepositoryHttpOptions) {
  let settled = 0
  const handler = createRepositoryHttpHandler(options),
    server = createServer((req, res) => {
      void handler(req, res).finally(() => {
        settled++
      })
    })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    server,
    get settled() {
      return settled
    },
  }
}
function send(server: Server, payload: unknown, unfinished = false) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port: (server.address() as AddressInfo).port,
        path: '/repository',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(unfinished ? { 'content-length': '100' } : {}),
        },
      },
      (res) => {
        let text = ''
        res.on('data', (chunk) => {
          text += chunk
        })
        res.on('end', () => resolve({ status: res.statusCode!, body: JSON.parse(text) }))
      },
    )
    req.on('error', reject)
    if (unfinished) req.write('{')
    else req.end(JSON.stringify(payload))
  })
}
async function close(server: Server) {
  server.closeAllConnections()
  await new Promise<void>((resolve) => server.close(() => resolve()))
}

it('HTTP deadline releases handler even when authentication never settles', async () => {
  const running = await host({ sessionFor: () => new Promise(() => {}), timeoutMs: 30 })
  try {
    expect(await send(running.server, {})).toMatchObject({
      status: 408,
      body: { error: { code: 'CANCELLED' } },
    })
    await delay(30)
    expect(running.settled).toBe(1)
  } finally {
    await close(running.server)
  }
})
it('HTTP deadline releases an incomplete body and enforces byte limits', async () => {
  const fixture = await memory(),
    opened = await openRepository(fixture.adapter, context)
  if (!opened.ok) throw Error('open')
  const running = await host({
    sessionFor: async () => opened.value,
    timeoutMs: 40,
    maxBodyBytes: 64,
  })
  try {
    expect(await send(running.server, {}, true)).toMatchObject({ status: 408 })
    await delay(30)
    expect(running.settled).toBe(1)
    expect(await send(running.server, { oversized: 'x'.repeat(100) })).toMatchObject({
      status: 413,
      body: { error: { code: 'RESOURCE_LIMIT' } },
    })
    expect(fixture.writes).toBe(0)
  } finally {
    await close(running.server)
    await opened.value.close()
  }
})
it('HTTP late write acknowledgement reports uncertainty and reconciles without replay', async () => {
  const fixture = await memory(),
    gate = deferred<void>(),
    commit = fixture.session.writer!.commit
  fixture.session.writer!.commit = async (request) => {
    const result = await commit(request)
    await gate.promise
    return result
  }
  const opened = await openRepository(fixture.adapter, context, { authorize: () => true })
  if (!opened.ok) throw Error('open')
  const running = await host({ sessionFor: async () => opened.value, timeoutMs: 80 })
  try {
    expect(
      await send(running.server, {
        version: 1,
        operation: 'applyChanges',
        payload: {
          changeSet: {
            repositoryId: 'R',
            idempotencyKey: 'late',
            commands: [{ op: 'createObject', object: obj() }],
          },
        },
      }),
    ).toMatchObject({
      status: 408,
      body: { error: { code: 'OUTCOME_UNKNOWN', operationId: 'late' } },
    })
    gate.resolve()
    expect(await opened.value.reconcile('late')).toMatchObject({
      ok: true,
      value: { status: 'committed' },
    })
    expect(fixture.writes).toBe(1)
  } finally {
    gate.resolve()
    await close(running.server)
    await opened.value.close()
  }
})
