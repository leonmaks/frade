import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createKaFixture } from '../../../../scripts/ka-fixtures.mjs'

async function selectFolders(app: ElectronApplication, paths: string[]) {
  await app.evaluate(({ dialog }, paths) => {
    let index = 0
    dialog.showOpenDialog = (async () => ({
      canceled: false,
      filePaths: [paths[index++]],
    })) as typeof dialog.showOpenDialog
  }, paths)
}

// eslint-disable-next-line no-empty-pattern
test('KA rejects swapped folders before persistence and repairs a restored metadata path through settings', async ({}) => {
  test.setTimeout(120000)
  const fixture = await createKaFixture()
  const userData = join(fixture.destination, 'path-profile')
  const settingsFile = join(userData, 'frade-workspace.json')
  const env = { ...process.env, FRADE_USER_DATA: userData }
  let app = await electron.launch({ args: [resolve('out/main/index.cjs')], env })
  try {
    const page = await app.firstWindow()
    await expect(page.getByRole('status')).toHaveText('Backend: ready')
    await selectFolders(app, [fixture.destination])
    await page.getByRole('button', { name: 'Открыть KA', exact: true }).click()
    await expect(page.locator('.status-message')).toContainText('Папка данных репозитория:')
    await expect(page.locator('.status-message')).toContainText('Не найден файл root.yaml')
    await expect(page.locator('[role=treeitem][aria-level="1"]')).toHaveCount(0)
    await expect(readFile(settingsFile, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })

    await selectFolders(app, [fixture.dataRoot, fixture.dataRoot])
    await page.getByRole('button', { name: 'Открыть KA', exact: true }).click()
    await expect(page.locator('.status-message')).toContainText('Папка метаописания:')
    await expect(page.locator('.status-message')).toContainText('_ecosystems_')
    await expect(page.locator('[role=treeitem][aria-level="1"]')).toHaveCount(0)
    await expect(readFile(settingsFile, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })

    await selectFolders(app, [fixture.dataRoot, fixture.metadataRoot])
    await page.getByRole('button', { name: 'Открыть KA', exact: true }).click()
    await expect(page.locator('.status-message')).toContainText('138 объектов')
    const profile = JSON.parse(await readFile(settingsFile, 'utf8'))
    expect(profile.roots[0].dataRoot).toBe(fixture.dataRoot)
    expect(profile.roots[0].metadataSets[0].folderPath).toBe(fixture.metadataRoot)
    await app.close()

    // Restore the previously accepted bad profile shape reported by the user.
    profile.roots[0].metadataSets[0].folderPath = fixture.dataRoot
    await writeFile(settingsFile, JSON.stringify(profile))
    app = await electron.launch({ args: [resolve('out/main/index.cjs')], env })
    const restored = await app.firstWindow()
    await expect(restored.locator('.root-error')).toContainText('Папка метаописания:')
    await expect(restored.locator('.root-error')).toContainText('kadzo/v2025/entities/root.yaml')
    await restored.getByRole('button', { name: 'Изменить путь метаописания' }).click()
    await expect(restored.getByRole('dialog')).toContainText(fixture.dataRoot)
    await expect(restored.getByLabel('Папка метаописания')).toHaveValue(fixture.dataRoot)
    await restored.getByLabel('Папка метаописания').fill(fixture.metadataRoot)
    await restored.getByRole('button', { name: 'Проверить набор', exact: true }).click()
    await expect(restored.locator('.metadata-preview')).toBeVisible()
    await restored.getByRole('button', { name: 'Применить', exact: true }).click()
    await expect(restored.locator('.root-error')).toHaveCount(0)
    await expect(restored.locator('[role=treeitem][aria-level="1"]')).toHaveCount(1)
    const repaired = JSON.parse(await readFile(settingsFile, 'utf8'))
    expect(repaired.roots[0].dataRoot).toBe(fixture.dataRoot)
    expect(repaired.roots[0].metadataSets[0].folderPath).toBe(fixture.metadataRoot)
    await restored
      .getByLabel('Поиск объектов', { exact: true })
      .fill('ecogroup.berezka.systems.berezka')
    await restored
      .locator('[role=treeitem][data-object-id="ecogroup.berezka.systems.berezka"]')
      .click()
    await expect(restored.locator('.object-id')).toHaveText('ecogroup.berezka.systems.berezka')
  } finally {
    await app.close().catch(() => {})
  }
})
