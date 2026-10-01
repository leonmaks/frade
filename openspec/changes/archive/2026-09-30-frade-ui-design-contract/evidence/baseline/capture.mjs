// Read-only product audit. All mutable settings/data belong to an isolated copy.
import { createRequire } from 'node:module'
import { resolve, join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { createFlowFixture } from '../../../../../scripts/flow-fixtures.mjs'
const require = createRequire(resolve('apps/desktop/package.json'))
const { _electron: electron, expect } = require('@playwright/test')
const destination = resolve('openspec/changes/frade-ui-design-contract/evidence/baseline')
const report = { started: new Date().toISOString(), screenshots: [], pageErrors: [], steps: [] }
let app
try {
  const fixture = await createFlowFixture()
  report.fixture = { destination: fixture.destination, source: 'synthetic scripts/flow-fixtures.mjs; no external KA reads' }
  await mkdir(destination, { recursive: true })
  app = await electron.launch({
    args: [resolve('apps/desktop/out/main/index.cjs')],
    env: { ...process.env, FRADE_USER_DATA: join(fixture.destination, 'ui-audit-profile') },
    timeout: 30000,
  })
  const page = await app.firstWindow()
  page.on('pageerror', e => report.pageErrors.push(e.message))
  await page.setViewportSize({ width: 1280, height: 850 })
  await expect(page.getByRole('status')).toHaveText('Backend: ready', { timeout: 30000 })
  report.runtime = await page.evaluate(() => ({
    url: location.href, viewport: { width: innerWidth, height: innerHeight },
    dpr: devicePixelRatio, font: getComputedStyle(document.querySelector('.ka-workbench')).font,
    userAgent: navigator.userAgent,
  }))
  const capture = async name => {
    await page.screenshot({ path: join(destination, name + '.png') })
    report.screenshots.push(name + '.png')
  }
  await capture('welcome')
  await page.keyboard.press('Control+Shift+p')
  await expect(page.getByRole('dialog', { name: 'Команды', exact: true })).toBeVisible()
  await capture('commands')
  await page.keyboard.press('Escape')
  await app.evaluate(({ dialog }, paths) => {
    let i = 0
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [paths[i++]] })
  }, [fixture.dataRoot, fixture.metadataRoot])
  await page.getByRole('button', { name: 'Открыть KA', exact: true }).click()
  await expect(page.locator('.status-message')).toContainText('объектов', { timeout: 30000 })
  await page.getByLabel('Поиск объектов', { exact: true }).fill('Payload F1')
  const row = page.locator('[role=treeitem][data-object-id]:not([data-source-id])').first()
  await expect(row).toBeVisible()
  await row.click()
  await expect(page.locator('.inspector')).toBeVisible()
  await capture('repository-card')
  await page.getByRole('button', { name: 'Настройки репозитория', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Метаописание репозитория' })).toBeVisible()
  await capture('repository-settings')
  await page.keyboard.press('Escape')
  await page.getByLabel('Поиск объектов', { exact: true }).fill('')
  const diagrams = page.getByRole('treeitem').filter({ hasText: /^_diagrams$/ })
  await diagrams.click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Новая диаграмма…' }).click()
  await page.getByLabel('Имя файла или папки').fill('UI audit.drawio')
  await page.getByRole('button', { name: 'Применить', exact: true }).click()
  await expect(page.locator('.diagram-slot iframe')).toBeVisible({ timeout: 20000 })
  await expect(page.locator('.diagram-slot iframe').contentFrame().locator('.geDiagramContainer')).toBeVisible({ timeout: 20000 })
  await capture('embedded-drawio')
  report.geometry = await page.evaluate(() => Object.fromEntries(
    ['.wb-titlebar', '.activity-bar', '.wb-sidebar', '.editor-tabs', '.wb-status', '.breadcrumbs']
      .map(selector => {
        const element = document.querySelector(selector)
        const rect = element?.getBoundingClientRect()
        return [selector, element ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          background: getComputedStyle(element).backgroundColor } : null]
      }),
  ))
  report.status = report.pageErrors.length ? 'FAIL' : 'PASS'
} catch (error) {
  report.status = 'BLOCKED'
  report.error = { name: error.name, message: error.message, stack: error.stack }
} finally {
  if (app) await app.close()
  report.finished = new Date().toISOString()
  await writeFile(join(destination, 'capture-result.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report))
  process.exitCode = report.status === 'PASS' ? 0 : 1
}
