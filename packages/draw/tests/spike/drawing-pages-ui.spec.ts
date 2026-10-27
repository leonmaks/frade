import { test, expect, type Page } from '@playwright/test'
test('hosted rename belongs to managed overlays and cannot escape the presentation barrier', async ({
  page,
}) => {
  await page.goto('/pages-visual.html?hosted')
  const tab = page.getByRole('tab', { name: 'Страница-1', exact: true })
  await tab.dblclick()
  const modal = page.getByRole('dialog', { name: 'Переименовать', exact: true })
  await expect(modal).toBeVisible()
  expect(await page.evaluate(() => window.pageFixture.overlayTop())).toBe(true)
  await expect(page.locator('#fixture-overlay-host').getByRole('dialog')).toBeVisible()
  expect(await modal.evaluate((el) => el.matches(':modal'))).toBe(false)
  await modal.locator('input').focus()
  await page.keyboard.press('Shift+Tab')
  await expect(modal.locator('.frade-page-close')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(modal.locator('input')).toBeFocused()
  await page.evaluate(() =>
    document.querySelector('#fixture-overlay-host')!.setAttribute('inert', ''),
  )
  expect(await modal.evaluate((el) => !!el.closest('[inert]'))).toBe(true)
  await modal.locator('input').evaluate((el) => (el as HTMLElement).focus())
  expect(await modal.locator('input').evaluate((el) => el === document.activeElement)).toBe(false)
  await page.evaluate(() =>
    document.querySelector('#fixture-overlay-host')!.removeAttribute('inert'),
  )
  await modal.locator('input').focus()
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(tab).toBeFocused()
  expect(await page.evaluate(() => window.pageFixture.overlayTop())).toBe(false)
})
async function openMenu(page: Page, name: string) {
  await page.getByRole('tab', { name, exact: true }).click({ button: 'right' })
}
test('nested page-list menus report expanded state and readonly modal cancellation restores tab focus', async ({
  page,
}) => {
  await page.goto('/pages-visual.html')
  await page.getByRole('button', { name: 'Страницы', exact: true }).press('Enter')
  const current = page.getByRole('menuitem', {
    name: 'Страница-1',
    exact: true,
  })
  await current.press('ArrowRight')
  await expect(current).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'Страницы', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await page
    .getByRole('menuitem', { name: 'Переименовать Страница...', exact: true })
    .press('Enter')
  await page.getByRole('textbox', { name: 'Имя страницы' }).fill('Discard this name')
  const before = await page.evaluate(() => JSON.stringify(window.pageFixture.session.snapshot()))
  await page.evaluate(() => window.pageFixture.readOnly(true))
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'Страница-1', exact: true })).toBeFocused()
  expect(await page.evaluate(() => JSON.stringify(window.pageFixture.session.snapshot()))).toBe(
    before,
  )
})
test('native page strip edits, reorders, clears and round-trips every page through real files', async ({
  page,
}) => {
  await page.goto('/pages-visual.html')
  await page.getByRole('button', { name: 'rect', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить страницу', exact: true }).click()
  await page.getByRole('button', { name: 'ellipse', exact: true }).click()
  await page.getByRole('tab', { name: 'Страница-2', exact: true }).dblclick()
  const dialog = page.getByRole('dialog', { name: 'Переименовать' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('textbox', { name: 'Имя страницы' }).fill('Детали')
  await dialog.getByRole('button', { name: 'Переименовать', exact: true }).click()
  await openMenu(page, 'Детали')
  await page.getByRole('menuitem', { name: 'Дублировать Страница', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Копия Детали', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.locator('.x6-node')).toHaveCount(1)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Копия Детали', exact: true })).toHaveCount(0)
  await openMenu(page, 'Детали')
  await page.getByRole('menuitem', { name: 'Переместить', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Страница-1', exact: true }).click()
  await expect(page.getByRole('tab').first()).toHaveText('Детали')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  const saved = await download
  const file = await saved.path()
  if (!file) throw Error('Download unavailable')
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await expect(page.getByRole('tab')).toHaveCount(1)
  await page.getByLabel('Open diagram').setInputFiles(file)
  await expect(page.getByRole('tab')).toHaveCount(2)
  await expect(page.locator('.x6-node')).toHaveCount(1)
  await page.getByRole('tab', { name: 'Страница-1', exact: true }).click()
  await expect(page.locator('.x6-node')).toHaveCount(1)
  await page.getByRole('button', { name: 'Страницы', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Удалить всё', exact: true }).click()
  await expect(page.getByRole('tab')).toHaveCount(1)
  await expect(page.locator('.x6-node')).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('tab')).toHaveCount(2)
  expect(await page.evaluate(() => window.pageFixture.session.snapshot())).toMatchObject({
    version: 2,
    pages: [{ name: 'Детали' }, { name: 'Страница-1' }],
  })
})
test('overflow readonly tabs remain keyboard reachable while every mutation is blocked', async ({
  page,
}) => {
  await page.setViewportSize({ width: 600, height: 500 })
  await page.goto('/pages-visual.html?seed&readonly&embed')
  const first = page.getByRole('tab', { name: 'Страница-1', exact: true })
  await first.focus()
  await first.press('End')
  await page.getByRole('tab', { name: 'Страница-20', exact: true }).press('Enter')
  await expect(page.getByRole('tab', { name: 'Страница-20', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByRole('button', { name: 'Добавить страницу', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Страницы', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Удалить всё', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  const before = await page.evaluate(() => JSON.stringify(window.pageFixture.session.snapshot()))
  await page.getByRole('tab', { name: 'Страница-20', exact: true }).press('Delete')
  expect(await page.evaluate(() => JSON.stringify(window.pageFixture.session.snapshot()))).toBe(
    before,
  )
  await expect(page.locator('.frade-page-strip')).toBeVisible()
  await page.evaluate(() => window.pageFixture.readOnly(false))
  await expect(page.getByRole('button', { name: 'Добавить страницу', exact: true })).toBeEnabled()
})
test('standalone opens only the selected page independently and cleans its transfer', async ({
  page,
}) => {
  await page.goto('/pages-visual.html')
  await page.getByRole('button', { name: 'rect', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить страницу', exact: true }).click()
  await page.getByRole('button', { name: 'ellipse', exact: true }).click()
  await openMenu(page, 'Страница-2')
  const popupEvent = page.waitForEvent('popup')
  await page.getByRole('menuitem', { name: 'Открыть в новом окне', exact: true }).click()
  const popup = await popupEvent
  await expect(popup.locator('.x6-node')).toHaveCount(1)
  await expect(popup.getByRole('tab')).toHaveCount(1)
  await expect(popup.getByRole('tab', { name: 'Страница-2', exact: true })).toBeVisible()
  await popup.getByRole('button', { name: 'rect', exact: true }).click()
  await expect(popup.locator('.x6-node')).toHaveCount(2)
  await expect(page.locator('.x6-node')).toHaveCount(1)
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith('frade.page-transfer/')),
    ),
  ).toEqual([])
  await popup.close()
})
test('native pointer reorder, Escape drag cancellation and final-page removal are reversible', async ({
  page,
}) => {
  await page.goto('/pages-visual.html')
  await page.getByRole('button', { name: 'Добавить страницу', exact: true }).click()
  await page.locator('.gePageTab').first().dragTo(page.locator('.gePageTab').nth(1))
  await expect(page.getByRole('tab').first()).toHaveText('Страница-2')
  const before = await page.evaluate(() => JSON.stringify(window.pageFixture.session.snapshot()))
  const drag = await page.evaluateHandle(() => new DataTransfer())
  await page.locator('.gePageTab').first().dispatchEvent('dragstart', { dataTransfer: drag })
  await page.locator('.frade-page-strip').press('Escape')
  await page.locator('.gePageTab').nth(1).dispatchEvent('drop', { dataTransfer: drag })
  expect(await page.evaluate(() => JSON.stringify(window.pageFixture.session.snapshot()))).toBe(
    before,
  )
  await openMenu(page, 'Страница-1')
  await page.getByRole('menuitem', { name: 'Удалить Страница', exact: true }).click()
  await expect(page.getByRole('tab')).toHaveCount(1)
  await openMenu(page, 'Страница-2')
  await page.getByRole('menuitem', { name: 'Удалить Страница', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Страница-1', exact: true })).toHaveCount(1)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Страница-2', exact: true })).toHaveCount(1)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('tab')).toHaveCount(2)
})
test('Save As cancel and invalid inactive-page Open preserve the complete drawing', async ({
  page,
}) => {
  await page.goto('/pages-visual.html')
  await page.getByRole('button', { name: 'rect', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить страницу', exact: true }).click()
  const before = await page.evaluate(() => window.pageFixture.session.snapshot())
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: 'Save As', exact: true }).click()
  expect(await page.evaluate(() => window.pageFixture.session.snapshot())).toEqual(before)
  page.once('dialog', (dialog) => dialog.accept('Independent copy'))
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save As', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('Independent copy.frade.json')
  const saved = await page.evaluate(() => window.pageFixture.session.snapshot())
  expect(saved.metadata.name).toBe('Independent copy')
  if (saved.version !== 2) throw Error('Expected multipage drawing')
  expect(saved.pages).toEqual(before.version === 2 ? before.pages : [])
  await page.getByLabel('Open diagram').setInputFiles({
    name: 'bad.frade.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        ...saved,
        pages: [
          saved.pages[0],
          {
            id: 'invalid',
            name: 'Invalid',
            graph: {
              nodes: [
                {
                  id: 'bad',
                  shape: 'rect',
                  x: 0,
                  y: 0,
                  width: 0,
                  height: 30,
                  label: 'bad',
                },
              ],
              edges: [],
            },
          },
        ],
      }),
    ),
  })
  await expect(page.getByRole('alert')).toContainText('Invalid node')
  expect(await page.evaluate(() => window.pageFixture.session.snapshot())).toEqual(saved)
  await expect(page.getByRole('button', { name: 'Добавить страницу', exact: true })).toBeEnabled()
})
