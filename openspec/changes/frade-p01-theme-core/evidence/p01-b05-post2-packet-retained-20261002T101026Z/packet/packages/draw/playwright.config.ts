import { defineConfig } from '@playwright/test'

const port = Number(process.env.FRADE_DRAW_E2E_PORT ?? 5173)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Invalid draw E2E port')
const url = 'http://127.0.0.1:' + port
export default defineConfig({
  testDir: 'tests/spike',
  workers: 4,
  use: {
    browserName: 'chromium',
    baseURL: url,
    viewport: { width: 900, height: 600 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port ' + port + ' --strictPort',
    url,
    reuseExistingServer: !process.env.FRADE_DRAW_E2E_PORT,
  },
})
