import { test, expect, _electron as electron } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createKaFixture } from '../../../../scripts/ka-fixtures.mjs'
// eslint-disable-next-line no-empty-pattern
test('INS-001/004 real KA typed scalar, nested, reference edits; shared groups, external conflict, keyboard cancel and geometry', async ({}, info) => {
  test.setTimeout(120000)
  const f = await createKaFixture()
  const app = await electron.launch({
    args: [resolve('out/main/index.cjs')],
    env: { ...process.env, FRADE_USER_DATA: join(f.destination, 'profile') },
  })
  try {
    const page = await app.firstWindow()
    await expect(page.getByRole('status')).toHaveText('Backend: ready')
    await app.evaluate(
      ({ dialog }, paths) => {
        let n = 0
        dialog.showOpenDialog = (async () => ({
          canceled: false,
          filePaths: [paths[n++]],
        })) as typeof dialog.showOpenDialog
      },
      [f.dataRoot, f.metadataRoot],
    )
    await page.getByRole('button', { name: 'Открыть KA', exact: true }).click()
    await expect(page.locator('.status-message')).toContainText('138 объектов')
    await page
      .getByLabel('Поиск объектов', { exact: true })
      .fill('ecogroup.berezka.systems.berezka')
    await page.locator('[data-object-id="ecogroup.berezka.systems.berezka"]').click()
    const description = page.locator('.field[data-field-path="description"] textarea')
    await description.fill('UI typed properties')
    const numeric = page.locator('.field[data-field-path="rto"] input')
    await numeric.fill('-')
    await expect(
      page.locator('.editor-actions').getByRole('button', { name: 'Сохранить', exact: true }),
    ).toBeDisabled()
    await numeric.fill('48')
    const nested = page.locator('.field[data-field-path="high_availability.capacity_management"]')
    if (await nested.locator('select').count()) {
      const options = await nested
        .locator('option')
        .evaluateAll((ns) => ns.map((n) => (n as HTMLOptionElement).value))
      await nested.locator('select').selectOption(options[1])
    } else await nested.locator('textarea').fill('Частичное')
    const group = page.locator('.field[data-field-path="group"]')
    await group.locator('.reference-value').click()
    const target = await group.getByRole('option').last().locator('small').innerText()
    await group.getByRole('option').last().click()
    await page.keyboard.press('Control+s')
    await expect(page.locator('.editor-actions')).toContainText('Все изменения сохранены')
    const source = join(f.dataRoot, 'v2023/application/systems.yaml')
    let text = await readFile(source, 'utf8')
    expect(text).toContain('UI typed properties')
    expect(text).toContain('rto: 48')
    expect(text).toContain(target)
    await page.getByRole('button', { name: 'Разделить редактор', exact: true }).click()
    await expect(page.locator('.inspector')).toHaveCount(2)
    await page.locator('.editor-group').last().locator('textarea').first().focus()
    await page
      .getByLabel('Поиск объектов', { exact: true })
      .fill('ecogroup.berezka.systems.berezka.catalog')
    await page.locator('[data-object-id="ecogroup.berezka.systems.berezka.catalog"]').dblclick()
    const sourceTab = page
      .locator('.editor-group')
      .last()
      .locator('.editor-tab')
      .filter({
        has: page.locator('[role="tab"][title$=" / ecogroup.berezka.systems.berezka.catalog"]'),
      })
    await sourceTab.dragTo(page.locator('.editor-group').first(), {
      targetPosition: { x: 25, y: 70 },
    })
    await expect(
      page.locator('.editor-group').first().locator('[role="tab"][aria-selected="true"]'),
    ).toHaveAttribute('title', /systems\.berezka\.catalog$/)
    await expect(
      page.locator('.editor-group').last().locator('[role="tab"][aria-selected="true"]'),
    ).toHaveAttribute('title', /systems\.berezka$/)
    await page.locator('.editor-group').first().locator('.editor-tab.active .close-tab').click()
    await expect(page.locator('.inspector')).toHaveCount(2)
    await page
      .locator('.editor-group')
      .last()
      .locator('.field[data-field-path="description"] textarea')
      .fill('Shared group draft')
    await expect(
      page
        .locator('.editor-group')
        .first()
        .locator('.field[data-field-path="description"] textarea'),
    ).toHaveValue('Shared group draft')
    await page.keyboard.press('Control+w')
    await expect(page.getByRole('dialog', { name: 'Несохранённые изменения' })).toHaveCount(0)
    await expect(page.locator('.inspector')).toHaveCount(1)
    await page.locator('.field[data-field-path="description"] textarea').focus()
    await page.keyboard.press('Control+w')
    await page
      .getByRole('dialog', { name: 'Несохранённые изменения' })
      .getByRole('button', { name: 'Отмена', exact: true })
      .click()
    await expect(description).toHaveValue('Shared group draft')
    await page.getByRole('button', { name: 'Отменить изменения', exact: true }).click()
    text = text.replace('UI typed properties', 'External clean refresh')
    await writeFile(source, text)
    await expect(description).toHaveValue('External clean refresh', { timeout: 15000 })
    await description.fill('Local conflicting draft')
    await writeFile(source, text.replace('External clean refresh', 'External conflicting edit'))
    await expect(page.locator('.conflict-review')).toContainText('Local conflicting draft', {
      timeout: 15000,
    })
    await expect(page.locator('.conflict-review')).toContainText('External conflicting edit')
    await expect(
      page.locator('.editor-actions').getByRole('button', { name: 'Сохранить', exact: true }),
    ).toBeDisabled()
    expect(await readFile(source, 'utf8')).toContain('External conflicting edit')
    await page.screenshot({ path: info.outputPath('conflict.png') })
    await page.getByRole('button', { name: 'Принять версию с диска', exact: true }).click()
    await expect(description).toHaveValue('External conflicting edit')
    await description.fill('Draft survives backend crash')
    const pid = await app.evaluate(
      ({ app }) =>
        app.getAppMetrics().find((m) => m.type === 'Utility' && m.name === 'Frade Backend')?.pid,
    )
    expect(pid).toBeTruthy()
    await app.evaluate((_e, pid) => process.kill(pid!), pid)
    await expect(page.locator('.root-error')).toContainText('Backend остановлен')
    await expect(page.getByRole('status')).toHaveText('Backend: ready')
    await expect(description).toHaveValue('Draft survives backend crash')
    await expect(description).toBeDisabled()
    expect(await readFile(source, 'utf8')).not.toContain('Draft survives backend crash')
    await page
      .locator('.root-error')
      .getByRole('button', { name: 'Повторить', exact: true })
      .click()
    await expect(page.locator('.root-error')).toHaveCount(0)
    await expect(description).toBeEnabled()
    await page.keyboard.press('Control+s')
    await expect(page.locator('.editor-actions')).toContainText('Все изменения сохранены')
    await description.fill('Draft survives model reload')
    const schemaFile = join(f.metadataRoot, 'kadzo/v2025/entities/application/systems.yaml'),
      schema = await readFile(schemaFile, 'utf8'),
      changed = schema.replace(
        'title: &entity_title Системы',
        'title: &entity_title Системы новой модели',
      )
    expect(changed).not.toBe(schema)
    await writeFile(schemaFile, changed)
    await expect(page.locator('.conflict-review')).toBeVisible({ timeout: 15000 })
    await expect(description).toHaveValue('Draft survives model reload')
    await expect(page.locator('.editor-error')).toContainText('Изменилась метамодель')
    await page
      .getByRole('button', { name: 'Проверить черновик относительно новой версии', exact: true })
      .click()
    await page.keyboard.press('Control+s')
    await expect(page.locator('.editor-actions')).toContainText('Все изменения сохранены')
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
      await expect(page.locator('.wb-titlebar')).toHaveCSS('height', '35px')
      expect((await page.locator('.wb-titlebar').boundingBox())!.y).toBe(0)
      await expect(page.locator('.activity-bar')).toHaveCSS('width', '48px')
      await expect(page.locator('.wb-statusbar')).toHaveCSS('height', '22px')
      await expect(page.locator('.editor-tabs')).toHaveCSS('height', '35px')
      await expect(page.locator('.breadcrumbs')).toHaveCSS('height', '26px')
      const geometry = await page
        .locator('.wb-sidebar,.wb-main,.wb-titlebar,.wb-statusbar')
        .evaluateAll((ns) =>
          ns.map((n) => ({ className: n.className, rect: n.getBoundingClientRect().toJSON() })),
        )
      expect(
        geometry.every(
          (g) =>
            g.rect.x >= 0 &&
            g.rect.y >= 0 &&
            g.rect.right <= width + 1 &&
            g.rect.bottom <= height + 1,
        ),
      ).toBe(true)
      await page.screenshot({ path: info.outputPath(`workbench-${width}x${height}.png`) })
      await writeFile(info.outputPath(`geometry-${width}.json`), JSON.stringify(geometry, null, 2))
    }
    await page.keyboard.press('Control+b')
    await expect(page.locator('.wb-sidebar')).toHaveCount(0)
    await page.keyboard.press('Control+b')
    await expect(page.locator('.wb-sidebar')).toBeVisible()
    await page.getByRole('button', { name: 'Диагностика', exact: true }).click()
    await expect(page.locator('.diagnostics-panel')).toBeVisible()
    const separator = page.getByRole('separator', { name: 'Ширина проводника' }),
      bounds = (await separator.boundingBox())!
    await page.mouse.move(bounds.x, bounds.y + 30)
    await page.mouse.down()
    await page.mouse.move(bounds.x + 70, bounds.y + 30, { steps: 5 })
    await page.mouse.up()
    await expect(page.locator('.wb-sidebar')).toHaveCSS('width', '370px')
    await description.fill('Quit cancellation keeps this draft')
    await app.evaluate(({ app }) => app.quit())
    await expect(page.getByRole('dialog', { name: 'Несохранённые изменения' })).toBeVisible()
    await page
      .getByRole('dialog', { name: 'Несохранённые изменения' })
      .getByRole('button', { name: 'Отмена', exact: true })
      .click()
    await expect(description).toHaveValue('Quit cancellation keeps this draft')
    await page.getByRole('button', { name: 'Отменить изменения', exact: true }).click()
  } finally {
    await app.evaluate(({ app }) => app.exit(0)).catch(() => {})
    await app.close().catch(() => {})
  }
})
