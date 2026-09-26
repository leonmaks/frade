import { test, expect, _electron as electron } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
// Shared real-data fixture generator.
import { createKaFixture } from '../../../../scripts/ka-fixtures.mjs'

// eslint-disable-next-line no-empty-pattern
test('KA opens through UI, edits a card, saves original YAML and restores workspace', async ({}, info) => {
  test.setTimeout(120000)
  const fixture = await createKaFixture()
  const userData = join(fixture.destination, 'desktop-profile')
  const env = { ...process.env, FRADE_USER_DATA: userData }
  let app = await electron.launch({ args: [resolve('out/main/index.cjs')], env })
  const errors: string[] = []
  try {
    const page = await app.firstWindow()
    page.on('pageerror', (e) => errors.push(e.message))
    await expect(page.getByRole('status')).toHaveText('Backend: ready')
    await app.evaluate(
      ({ dialog }, paths) => {
        let i = 0
        dialog.showOpenDialog = (async () => ({
          canceled: false,
          filePaths: [paths[i++]],
        })) as typeof dialog.showOpenDialog
      },
      [fixture.dataRoot, fixture.metadataRoot],
    )
    await page.getByRole('button', { name: 'Открыть KA', exact: true }).click()
    await expect(page.locator('.status-message')).toContainText('138 объектов', { timeout: 30000 })
    await page.getByLabel('Поиск объектов', { exact: true }).fill('')
    for (let n = 0; n < 200; n++) {
      const collapsed = page.locator('[role=treeitem][aria-expanded="false"]')
      if (!(await collapsed.count())) break
      await collapsed.first().locator('.tree-chevron').click()
    }
    await expect(page.locator('[role=treeitem][data-object-id]')).toHaveCount(138)
    const samples = await page.locator('[role=treeitem][aria-level="3"]').evaluateAll((nodes) =>
      nodes
        .map((n) => {
          let next = n.nextElementSibling
          while (
            next &&
            !next.getAttribute('data-object-id') &&
            Number(next.getAttribute('aria-level')) > 3
          )
            next = next.nextElementSibling
          return next?.getAttribute('data-object-id')
        })
        .filter(Boolean),
    )
    expect(samples).toHaveLength(19)
    for (const id of samples) {
      await page.locator(`[role=treeitem][data-object-id="${id}"]`).click()
      await expect(page.locator('.object-id')).toHaveText(id!)
    }
    await page.screenshot({ path: info.outputPath('ka-explorer.png') })
    const tree = page.getByRole('tree')
    await tree.getByRole('treeitem').first().focus()
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Home')
    const rows = page.locator('[role=treeitem][data-object-id]')
    if ((await rows.count()) === 0) {
      await tree.getByRole('treeitem').nth(2).click()
    }
    await rows.first().click()
    await expect(page.locator('.inspector')).toBeVisible()
    const objectId = await page.locator('.object-id').innerText()
    const attributes = await page
      .locator('.field[data-field-path]')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-field-path')))
    await writeFile(
      info.outputPath('fields.json'),
      JSON.stringify({ objectId, attributes }, null, 2),
    )
    const field = page.locator('.field[data-field-path="comments"]')
    if (!(await field.locator('textarea').count()))
      await field.getByRole('button', { name: 'Добавить значение', exact: true }).click()
    if (!(await field.locator('textarea').count()))
      await field.getByRole('button', { name: /^Добавить элемент:/ }).click()
    const description = 'Проверка редактирования KA через готовый интерфейс.'
    await field.locator('textarea').fill(description)
    await expect(page.locator('.dirty-dot')).toHaveCount(1)
    await page.screenshot({ path: info.outputPath('ka-card-dirty.png') })
    await page.keyboard.press('Control+s')
    await expect(page.locator('.editor-actions')).toContainText('Все изменения сохранены', {
      timeout: 20000,
    })
    const changed: string[] = []
    for (const file of fixture.manifest.files) {
      const bytes = await readFile(join(fixture.destination, file.path))
      const hash = createHash('sha256').update(bytes).digest('hex')
      if (hash !== file.sha256) changed.push(file.path)
    }
    expect(changed).toHaveLength(1)
    expect(changed[0]).toMatch(/^KA\//)
    expect(await readFile(join(fixture.destination, changed[0]), 'utf8')).toContain(description)
    await page.screenshot({ path: info.outputPath('ka-card-saved.png') })
    expect(errors).toEqual([])
    await page.getByRole('separator', { name: 'Ширина проводника' }).focus()
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight')
    await expect(page.locator('.wb-sidebar')).toHaveCSS('width', '370px')
    await page.getByLabel('Поиск объектов', { exact: true }).fill('')
    const rootRow = page.locator('[role=treeitem][aria-level="1"]')
    if ((await rootRow.getAttribute('aria-expanded')) === 'true') await rootRow.click()
    await expect(rootRow).toHaveAttribute('aria-expanded', 'false')
    await app.close()
    app = await electron.launch({ args: [resolve('out/main/index.cjs')], env })
    const restored = await app.firstWindow()
    await expect(restored.locator('.status-message')).toContainText('138 объектов', {
      timeout: 30000,
    })
    await expect(restored.locator('.wb-sidebar')).toHaveCSS('width', '370px')
    await expect(restored.locator('[role=treeitem][aria-level="1"]')).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    await expect(restored.locator('.inspector')).toBeVisible()
    await restored.getByLabel('Поиск объектов', { exact: true }).fill(objectId)
    await restored.locator('[role=treeitem][data-object-id]').first().click()
    await expect(restored.locator('.field[data-field-path="comments"] textarea')).toHaveValue(
      description,
    )
    for (const file of fixture.manifest.files) {
      const metadata = file.path.startsWith('metadata/')
      const originalRoot = metadata
        ? (process.env.FRADE_KA_META_ROOT ?? 'E:/sber.wsp/ka_dzo/_ecosystems_')
        : (process.env.FRADE_KA_DATA_ROOT ?? 'E:/sber.wsp/ka_dzo/KA')
      const original = join(originalRoot, file.path.slice(file.path.indexOf('/') + 1))
      expect(
        createHash('sha256')
          .update(await readFile(original))
          .digest('hex'),
      ).toBe(file.sha256)
    }
    await writeFile(info.outputPath('manifest.json'), JSON.stringify(fixture.manifest, null, 2))
    await writeFile(
      info.outputPath('preservation.json'),
      JSON.stringify(
        {
          objects: fixture.manifest.objects,
          changed,
          untouched: fixture.manifest.files.length - 1,
          originalsUnchanged: fixture.manifest.files.length,
          destination: fixture.destination,
        },
        null,
        2,
      ),
    )
  } finally {
    await app.close()
  }
})
