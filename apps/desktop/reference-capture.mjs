import { _electron } from '@playwright/test'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
const temp = await mkdtemp(join(tmpdir(), 'frade-code-reference-'))
await mkdir(join(temp, 'User'), { recursive: true })
await writeFile(
  join(temp, 'User', 'settings.json'),
  JSON.stringify({
    'workbench.colorTheme': 'Default Dark Modern',
    'window.zoomLevel': 0,
    'workbench.startupEditor': 'none',
    'window.titleBarStyle': 'custom',
    'workbench.activityBar.location': 'default',
    'workbench.statusBar.visible': true,
    'window.menuBarVisibility': 'compact',
    'security.workspace.trust.enabled': false,
    'telemetry.telemetryLevel': 'off',
    'update.mode': 'none',
  }),
)
const workspace = join(temp, 'Reference')
await mkdir(workspace)
await writeFile(
  join(workspace, 'Architecture.yaml'),
  'systems:\n  example:\n    title: Architecture reference\n',
)
const out = resolve('../../docs/ka-workbench/evidence/reference')
await mkdir(out, { recursive: true })
const app = await _electron.launch({
  executablePath: 'E:/Program Files/Microsoft VS Code/Code.exe',
  args: [
    '--user-data-dir',
    temp,
    '--extensions-dir',
    join(temp, 'extensions'),
    '--skip-welcome',
    '--skip-release-notes',
    '--disable-updates',
    '--disable-extensions',
    workspace,
  ],
  timeout: 30000,
})
try {
  const page = await app.firstWindow()
  await page.waitForSelector('.monaco-workbench', { timeout: 30000 })
  await page.waitForTimeout(2000)
  if (
    (await page.locator('.part.auxiliarybar').evaluate((n) => n.getBoundingClientRect().width)) > 0
  )
    await page.keyboard.press('Control+Alt+b')
  await page.keyboard.press('Control+Shift+e')
  await page.getByRole('treeitem').filter({ hasText: 'Architecture.yaml' }).first().dblclick()
  await page.waitForTimeout(500)
  const metrics = []
  for (const [width, height] of [
    [1280, 850],
    [1600, 900],
    [850, 650],
  ]) {
    await app.evaluate(
      ({ BrowserWindow }, size) =>
        BrowserWindow.getAllWindows()[0].setContentSize(size[0], size[1]),
      [width, height],
    )
    await page.waitForTimeout(500)
    await page.screenshot({ path: join(out, `${width}x${height}.png`) })
    metrics.push({
      width,
      height,
      parts: await page.locator('.monaco-workbench .part').evaluateAll((nodes) =>
        nodes.map((n) => ({
          className: n.className,
          rect: n.getBoundingClientRect().toJSON(),
          background: getComputedStyle(n).backgroundColor,
          font: getComputedStyle(n).fontFamily,
        })),
      ),
    })
  }
  await writeFile(join(out, 'geometry.json'), JSON.stringify(metrics, null, 2))
} finally {
  await app.close()
}
