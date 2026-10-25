import { test, expect, _electron as electron, type Page } from '@playwright/test'
import { mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
const id = 'frade.reference/vscode-dark-2026'
async function picker(page: Page) {
  await page.getByRole('button', { name: 'Меню Файл', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Выбрать тему…', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Выбор темы' })).toBeVisible()
}
async function witness(page: Page) {
  return page.evaluate(() => {
    const selectors = ['.ka-workbench', '.wb-titlebar', '.activity-bar', '.wb-sidebar', '.wb-statusbar']
    return Object.fromEntries(selectors.map(selector => {
      const e = document.querySelector(selector) as HTMLElement
      const s = getComputedStyle(e), r = e.getBoundingClientRect()
      return [selector, { background: s.backgroundColor, color: s.color, font: s.fontFamily,
        fontSize: s.fontSize, width: r.width, height: r.height }]
    }))
  })
}
for (const density of ['compact', 'comfortable'] as const) {
  // eslint-disable-next-line no-empty-pattern
  test(`reference ${density}: actual preview cancel commit restart and scoped geometry`, async ({}, info) => {
    const profile = await mkdtemp(join(tmpdir(), 'frade-reference-'))
    const path = join(profile, 'presentation-settings.json')
    const record = { version: 1, revision: 1, generation: 1, transactionId: 'reference/fixture',
      selection: { mode: 'light', density, preferred: { light: 'frade.builtin/light',
        dark: 'frade.builtin/dark', 'high-contrast': 'frade.builtin/high-contrast' } } }
    await writeFile(path, JSON.stringify(record))
    const launch = () => electron.launch({ args: [resolve('out/main/index.cjs')],
      env: { ...process.env, FRADE_USER_DATA: profile } })
    let app = await launch()
    try {
      let page = await app.firstWindow()
      await expect(page.locator('.wb-statusbar [role="status"]')).toHaveText('Backend: ready')
      const original = await witness(page), originalBytes = await readFile(path, 'utf8')
      await picker(page)
      await expect(page.getByRole('option')).toHaveCount(5)
      const reference = page.getByRole('option', { name: 'VS Code Dark 2026', exact: true })
      await reference.click()
      await expect(page.locator('html')).toHaveAttribute('data-frade-reference', 'vscode-dark-2026')
      await expect(page.locator('html')).toHaveAttribute('data-frade-density', density)
      const preview = await witness(page)
      expect(preview['.ka-workbench'].background).toBe('rgb(18, 19, 20)')
      expect(preview['.activity-bar'].width).toBe(48)
      expect(preview['.wb-titlebar'].height).toBeGreaterThanOrEqual(35)
      expect(await readFile(path, 'utf8')).toBe(originalBytes)
      await page.screenshot({ path: info.outputPath(`preview-${density}.png`) })
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog', { name: 'Выбор темы' })).toBeHidden()
      await expect(page.locator('html')).not.toHaveAttribute('data-frade-reference', 'vscode-dark-2026')
      expect(await witness(page)).toEqual(original)
      expect(await readFile(path, 'utf8')).toBe(originalBytes)
      await picker(page)
      await reference.click()
      await expect(page.locator('html')).toHaveAttribute('data-frade-reference', 'vscode-dark-2026')
      await page.getByRole('button', { name: 'Сохранить выбор', exact: true }).click()
      await expect(page.getByRole('dialog', { name: 'Выбор темы' })).toBeHidden()
      const committed = JSON.parse(await readFile(path, 'utf8'))
      expect(committed.selection.preferred.dark).toBe(id)
      expect(committed.selection.density).toBe(density)
      await page.screenshot({ path: info.outputPath(`committed-${density}.png`) })
      await app.close()
      app = await launch()
      page = await app.firstWindow()
      await expect(page.locator('.wb-statusbar [role="status"]')).toHaveText('Backend: ready')
      await expect(page.locator('html')).toHaveAttribute('data-frade-reference', 'vscode-dark-2026')
      expect(await witness(page)).toEqual(preview)
      expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(committed)
      await page.screenshot({ path: info.outputPath(`restored-${density}.png`) })
      for (const name of ['Светлая (Light)', 'Тёмная (Dark)', 'Контрастная (HC)', 'Системная (System)']) {
        await picker(page)
        await page.getByRole('option', { name, exact: true }).click()
        await page.getByRole('button', { name: 'Сохранить выбор', exact: true }).click()
        await expect(page.getByRole('dialog', { name: 'Выбор темы' })).toBeHidden()
        await expect(page.locator('html')).not.toHaveAttribute('data-frade-reference', 'vscode-dark-2026')
      }
      await writeFile(info.outputPath('observations.json'), JSON.stringify({ density, original, preview, committed }, null, 2))
    } finally { await app.close() }
  })
}
