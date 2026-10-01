// Additional real runtime screenshots; reuse only the synthetic audit profile.
import { createRequire } from 'node:module'
import { resolve, join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
const { _electron: electron, expect } = createRequire(resolve('apps/desktop/package.json'))('@playwright/test')
const root = resolve('openspec/changes/frade-ui-design-contract/evidence/baseline')
const prior = JSON.parse(await readFile(join(root, 'capture-result.json'), 'utf8'))
if (!prior.fixture.source.startsWith('synthetic')) throw Error('Only synthetic fixture allowed')
const report = { started: new Date().toISOString(), source: prior.fixture.source, screenshots: [], errors: [] }
let app
try {
  app = await electron.launch({ args: [resolve('apps/desktop/out/main/index.cjs')],
    env: { ...process.env, FRADE_USER_DATA: join(prior.fixture.destination, 'ui-audit-profile') } })
  const page = await app.firstWindow()
  page.on('pageerror', e => report.errors.push(e.message))
  await page.setViewportSize({ width: 1280, height: 850 })
  await expect(page.locator('.status-message')).toContainText('9 объектов', { timeout: 30000 })
  await page.getByLabel('Поиск объектов', { exact: true }).fill('')
  const diagrams = page.getByRole('treeitem').filter({ hasText: /^_diagrams$/ })
  if (await diagrams.getAttribute('aria-expanded') !== 'true') await diagrams.click()
  await page.getByRole('treeitem').filter({ hasText: /^Flows.frade$/ }).dblclick()
  await expect(page.locator('.diagram-slot .x6-graph')).toBeVisible({ timeout: 20000 })
  await page.screenshot({ path: join(root, 'native-draw.png') })
  report.screenshots.push('native-draw.png')
  await page.getByRole('treeitem').filter({ hasText: /^Flows.drawio$/ }).dblclick()
  await expect(page.locator('.diagram-slot iframe').contentFrame().locator('.geDiagramContainer')).toBeVisible({ timeout: 20000 })
  await page.screenshot({ path: join(root, 'drawio-synthetic-objects.png') })
  report.screenshots.push('drawio-synthetic-objects.png')
  report.status = report.errors.length ? 'FAIL' : 'PASS'
} catch (e) { report.status = 'BLOCKED'; report.error = e.message }
finally {
  if (app) await app.close()
  report.finished = new Date().toISOString()
  await writeFile(join(root, 'capture-native-result.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report))
  process.exitCode = report.status === 'PASS' ? 0 : 1
}
