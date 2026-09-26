import { test, expect, _electron as electron } from '@playwright/test'
import { resolveConfig } from 'electron-vite'
import { createServer } from 'vite'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'

// Exercise the actual renderer dev configuration and Electron network stack.
// eslint-disable-next-line no-empty-pattern
test('development desktop loads the local Vite renderer and connects to the backend', async ({}) => {
  const config = await resolveConfig({}, 'serve', 'development')
  if (!config.config?.renderer) throw new Error('Missing renderer configuration')
  const server = await createServer({
    ...config.config.renderer,
    server: { ...config.config.renderer.server, port: 0 },
  })
  let app: Awaited<ReturnType<typeof electron.launch>> | undefined
  try {
    await server.listen()
    const url = server.resolvedUrls?.local[0]
    if (!url) throw new Error('Missing local development URL')
    app = await electron.launch({
      args: [resolve('out/main/index.cjs')],
      env: {
        ...process.env,
        ELECTRON_RENDERER_URL: url,
        FRADE_USER_DATA: await mkdtemp(join(tmpdir(), 'frade-development-')),
      },
    })
    const page = await app.firstWindow()
    await expect(page).toHaveURL(url)
    await expect(page.getByRole('status')).toHaveText('Backend: ready')
    expect(await page.evaluate(() => window.frade.runtime.getHealth())).toMatchObject({
      state: 'ready',
    })
    expect(await page.evaluate(async () => (await fetch('/@vite/client')).status)).toBe(200)
    expect(await page.evaluate(() => typeof (window as any).require)).toBe('undefined')
  } finally {
    await app?.close()
    await server.close()
  }
})
