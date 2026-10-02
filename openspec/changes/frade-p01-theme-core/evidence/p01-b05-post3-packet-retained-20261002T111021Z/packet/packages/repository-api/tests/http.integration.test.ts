import { expect, it } from 'vitest'
import { createServer, request } from 'node:http'
import type { AddressInfo } from 'node:net'
import { openRepository } from '@frade/repository-application'
import { memory, context } from '../../repository-application/tests/fixtures/memory'
import * as transport from '../src/http'
it('HTTP authenticates each caller and serves typed API without filesystem authority', async () => {
  const fixture = await memory(),
    opened = await openRepository(fixture.adapter, context, { authorize: () => true })
  if (!opened.ok) throw Error('open')
  const handler = transport.createRepositoryHttpHandler({
    sessionFor: async (req) =>
      req.headers.authorization === 'Bearer fixture' ? opened.value : undefined,
  })
  const server = createServer(handler)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as AddressInfo).port
  const send = (payload: unknown, authorized = true) =>
    new Promise<{ status: number; body: any }>((resolve, reject) => {
      const req = request(
        {
          host: '127.0.0.1',
          port,
          path: '/repository',
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(authorized ? { authorization: 'Bearer fixture' } : {}),
          },
        },
        (res) => {
          let text = ''
          res.on('data', (chunk) => (text += chunk))
          res.on('end', () => resolve({ status: res.statusCode!, body: JSON.parse(text) }))
        },
      )
      req.on('error', reject)
      req.end(JSON.stringify(payload))
    })
  try {
    const payload = { version: 1, operation: 'capabilities', payload: {} }
    expect(await send(payload, false)).toMatchObject({
      status: 403,
      body: { ok: false, error: { code: 'ACCESS_DENIED' } },
    })
    expect(await send(payload)).toMatchObject({
      status: 200,
      body: { ok: true, value: { canRead: true } },
    })
    expect((await send({ operation: 'fs.read', path: '/secret' })).body.ok).toBe(false)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await opened.value.close()
  }
})
