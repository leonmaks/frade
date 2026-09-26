import { test, expect, _electron as electron } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
// Playwright requires a destructured fixture parameter even for an Electron-only test.
// eslint-disable-next-line no-empty-pattern
test('built desktop: isolation, document lifecycle, real backend recovery and shutdown', async ({}) => {
  const app = await electron.launch({
    args: [resolve('out/main/index.cjs')],
    env: { ...process.env, FRADE_USER_DATA: await mkdtemp(join(tmpdir(), 'frade-isolation-')) },
  })
  let backendPid: number | undefined
  try {
    const page = await app.firstWindow()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await expect(page.getByRole('status')).toHaveText('Backend: ready')
    const isolation = await page.evaluate(() => ({
      node: typeof (window as any).require,
      process: typeof (window as any).process,
      api: Object.keys(window.frade),
      runtime: Object.keys(window.frade.runtime),
      ipc: typeof (window.frade as any).ipcRenderer,
    }))
    expect(isolation).toEqual({
      node: 'undefined',
      process: 'undefined',
      api: ['runtime', 'events'],
      runtime: ['getHealth'],
      ipc: 'undefined',
    })
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].webContents.executeJavaScriptInIsolatedWorld(999, [
        { code: 'window.__isolatedProbe = true' },
      ]),
    )
    expect(await page.evaluate(() => typeof (window as any).__isolatedProbe)).toBe('undefined')
    const sandboxed = await app.evaluate(
      ({ app, BrowserWindow }) =>
        app
          .getAppMetrics()
          .find((m) => m.pid === BrowserWindow.getAllWindows()[0].webContents.getOSProcessId())
          ?.sandboxed,
    )
    expect(sandboxed).toBe(true)
    expect(await page.evaluate(() => window.frade.runtime.getHealth())).toMatchObject({
      state: 'ready',
    })
    await page.evaluate(() => window.open('https://example.com'))
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1)
    const csp = await page
      .evaluate(async () => (await fetch(location.href)).headers.get('content-security-policy'))
      .catch(() => null)
    // Fetch itself must be blocked by connect-src none.
    expect(csp).toBeNull()
    const policy = await app.evaluate(async ({ net }) =>
      (await net.fetch('frade://app/index.html')).headers.get('content-security-policy'),
    )
    expect(policy).toContain("connect-src 'none'")
    expect(policy).toContain("script-src 'self'")
    expect(
      await app.evaluate(
        async ({ net }) => (await net.fetch('frade://app/%2e%2e%2fmain/index.cjs')).status,
      ),
    ).toBe(404)
    expect(await page.evaluate(() => Notification.requestPermission())).toBe('denied')
    await expect(page.getByRole('button', { name: 'Draw', exact: true })).toHaveCount(0)
    const before = await page.evaluate(() => window.frade.runtime.getHealth())
    await page.evaluate(() => {
      ;(window as any).healthEvents = []
      ;(window as any).offHealth = window.frade.events.subscribe((value) =>
        (window as any).healthEvents.push(value),
      )
    })
    const oldPid = await app.evaluate(
      ({ app }) =>
        app.getAppMetrics().find((m) => m.type === 'Utility' && m.name === 'Frade Backend')?.pid,
    )
    expect(oldPid).toBeTruthy()
    await app.evaluate((_electron, pid) => process.kill(pid!), oldPid)
    await expect
      .poll(() => page.evaluate(() => (window as any).healthEvents.map((e: any) => e.state)))
      .toEqual(['unavailable', 'starting', 'ready'])
    backendPid = await app.evaluate(
      ({ app }) =>
        app.getAppMetrics().find((m) => m.type === 'Utility' && m.name === 'Frade Backend')?.pid,
    )
    expect(backendPid).toBeTruthy()
    expect(backendPid).not.toBe(oldPid)
    const after = await page.evaluate(() => window.frade.runtime.getHealth())
    expect(after.sequence).toBeGreaterThan(before.sequence)
    await page.evaluate(() => (window as any).offHealth())
    // Electron cancels this navigation, but Playwright's frame auto-wait can remain pending.
    // Assert through both the host and the still-live DOM; no locator auto-wait is needed.
    await page.evaluate(() => {
      location.href = 'https://example.com'
    })
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].webContents.getURL(),
      ),
    ).toBe('frade://app/index.html')
    expect(
      await page.evaluate(() => ({
        url: location.href,
        nodes: document.querySelectorAll('.ka-workbench').length,
      })),
    ).toEqual({ url: 'frade://app/index.html', nodes: 1 })
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
  if (backendPid)
    await expect
      .poll(() => {
        try {
          process.kill(backendPid, 0)
          return true
        } catch {
          return false
        }
      })
      .toBe(false)
})
