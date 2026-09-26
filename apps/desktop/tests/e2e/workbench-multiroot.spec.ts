import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test'
import { readFile, cp, mkdir, rename, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createNativeRepository } from '@frade/adapter-yaml'
import { createKaFixture } from '../../../../scripts/ka-fixtures.mjs'
async function selectFolders(app: ElectronApplication, paths: string[]) {
  await app.evaluate(({ dialog }, paths) => {
    let i = 0
    dialog.showOpenDialog = (async () => ({
      canceled: false,
      filePaths: [paths[i++]],
    })) as typeof dialog.showOpenDialog
  }, paths)
}
async function command(page: Page, name: string) {
  await page.keyboard.press('Control+Shift+p')
  await page.getByLabel('Найти команду').fill(name)
  await page.locator('.command-palette').getByRole('button', { name, exact: true }).click()
}
const objectId = 'ecogroup.berezka.systems.berezka'
async function card(page: Page, repositoryId: string, id = objectId) {
  await page.getByLabel('Поиск объектов', { exact: true }).fill(id)
  await page
    .locator(`[role=treeitem][data-repository-id="${repositoryId}"][data-object-id="${id}"]`)
    .click()
  await expect(page.locator('.object-id')).toHaveText(id)
}
const description = (page: Page) => page.locator('.field[data-field-path="description"] textarea')
const rootRows = (page: Page) => page.locator('[role=treeitem][aria-level="1"]')
async function settings(page: Page, id: string) {
  await page
    .locator(`[role=treeitem][aria-level="1"][data-repository-id="${id}"]`)
    .click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Настройки метаописания' }).click()
}

// eslint-disable-next-line no-empty-pattern
test('WB-006/007 real KA A+B and native: same IDs, active-card save, Save All, workspace paths and dirty Remove/Cancel', async ({}, info) => {
  test.setTimeout(120000)
  const a = await createKaFixture(),
    b = await createKaFixture(),
    native = join(a.destination, 'Native')
  await createNativeRepository(native, { repositoryId: 'native-source', displayName: 'Native' })
  const app = await electron.launch({
    args: [resolve('out/main/index.cjs')],
    env: { ...process.env, FRADE_USER_DATA: join(a.destination, 'profile') },
  })
  try {
    const page = await app.firstWindow()
    await expect(page.getByRole('status')).toHaveText('Backend: ready')
    await selectFolders(app, [a.dataRoot, a.metadataRoot, b.dataRoot, b.metadataRoot, native])
    await page.getByRole('button', { name: 'Открыть KA', exact: true }).click()
    await expect(page.locator('.status-message')).toContainText('138 объектов')
    await command(page, 'Добавить репозиторий KA')
    await expect(page.locator('.status-message')).toContainText('276 объектов')
    await command(page, 'Добавить native-репозиторий')
    await expect(rootRows(page)).toHaveCount(3)
    const ids = await rootRows(page).evaluateAll((ns) =>
      ns.map((n) => n.getAttribute('data-repository-id')!),
    )
    const [A, B] = ids
    await rootRows(page).nth(0).click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Переименовать корень' }).click()
    await page.getByLabel('Название корня').fill('KA A')
    await page.getByRole('button', { name: 'Переименовать', exact: true }).click()
    await card(page, A)
    await description(page).fill('A isolated description')
    await page.locator(`[role=treeitem][aria-level="1"][data-repository-id="${B}"]`).click()
    await page.keyboard.press('Control+s')
    await expect(page.locator('.editor-actions')).toContainText('Все изменения сохранены')
    expect(await readFile(join(a.dataRoot, 'v2023/application/systems.yaml'), 'utf8')).toContain(
      'A isolated description',
    )
    expect(
      await readFile(join(b.dataRoot, 'v2023/application/systems.yaml'), 'utf8'),
    ).not.toContain('A isolated description')
    await card(page, B)
    await description(page).fill('B draft stays independent')
    await card(page, A)
    await description(page).fill('A Save All')
    await command(page, 'Сохранить все')
    await expect(page.locator('.status-message')).toHaveText('Сохранено: 2. Ошибки: 0.')
    expect(await readFile(join(b.dataRoot, 'v2023/application/systems.yaml'), 'utf8')).toContain(
      'B draft stays independent',
    )
    await card(page, A)
    await description(page).fill('A mixed Save All')
    await card(page, A, 'ecogroup.berezka.systems.berezka.catalog')
    await description(page).fill('Second A object in the same file')
    await card(page, B)
    await description(page).fill('B conflicting Save All draft')
    const bSource = join(b.dataRoot, 'v2023/application/systems.yaml')
    await writeFile(
      bSource,
      (await readFile(bSource, 'utf8')).replace('B draft stays independent', 'B external change'),
    )
    await expect(page.locator('.conflict-review')).toBeVisible()
    await command(page, 'Сохранить все')
    await expect(page.locator('.status-message')).toHaveText('Сохранено: 2. Ошибки: 1.')
    expect(await readFile(join(a.dataRoot, 'v2023/application/systems.yaml'), 'utf8')).toContain(
      'A mixed Save All',
    )
    expect(await readFile(join(a.dataRoot, 'v2023/application/systems.yaml'), 'utf8')).toContain(
      'Second A object in the same file',
    )
    expect(await readFile(bSource, 'utf8')).toContain('B external change')
    expect(await readFile(bSource, 'utf8')).not.toContain('B conflicting Save All draft')
    await expect(description(page)).toHaveValue('B conflicting Save All draft')
    await page.getByRole('button', { name: 'Принять версию с диска', exact: true }).click()
    await description(page).fill('B unsaved removal')
    await page
      .locator(`[role=treeitem][aria-level="1"][data-repository-id="${B}"]`)
      .click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Убрать из workspace' }).click()
    await page
      .getByRole('dialog', { name: 'Несохранённые изменения' })
      .getByRole('button', { name: 'Отмена', exact: true })
      .click()
    await expect(description(page)).toHaveValue('B unsaved removal')
    await expect(rootRows(page)).toHaveCount(2) // Native is filtered by object search.
    await page.getByRole('button', { name: 'Отменить изменения', exact: true }).click()
    await page.getByLabel('Поиск объектов', { exact: true }).fill('')
    for (const row of await rootRows(page).all())
      if ((await row.getAttribute('aria-expanded')) === 'true') await row.click()
    await rootRows(page).nth(1).dragTo(rootRows(page).nth(0))
    await expect(rootRows(page).first()).toHaveAttribute('data-repository-id', B)
    const workspace = join(a.destination, 'workspace.frade-workspace')
    await app.evaluate(({ dialog }, file) => {
      dialog.showSaveDialog = (async () => ({
        canceled: false,
        filePath: file,
      })) as typeof dialog.showSaveDialog
    }, workspace)
    await command(page, 'Сохранить рабочее пространство как…')
    await expect
      .poll(async () => JSON.parse(await readFile(workspace, 'utf8')).roots[0].repositoryId)
      .toBe(B)
    const saved = JSON.parse(await readFile(workspace, 'utf8'))
    expect(saved.roots).toHaveLength(3)
    expect(saved.roots.find((r: any) => r.repositoryId === A).label).toBe('KA A')
    expect(resolve(a.destination, saved.roots[0].dataRoot)).toBe(resolve(b.dataRoot))
    const alternateDirectory = join(a.destination, 'alternate')
    await mkdir(alternateDirectory)
    const alternate = join(alternateDirectory, 'moved.frade-workspace')
    await app.evaluate(({ dialog }, file) => {
      dialog.showSaveDialog = (async () => ({
        canceled: false,
        filePath: file,
      })) as typeof dialog.showSaveDialog
    }, alternate)
    await command(page, 'Сохранить рабочее пространство как…')
    await expect
      .poll(async () => JSON.parse(await readFile(alternate, 'utf8')).roots.length)
      .toBe(3)
    const rebased = JSON.parse(await readFile(alternate, 'utf8'))
    expect(resolve(alternateDirectory, rebased.roots[0].dataRoot)).toBe(resolve(b.dataRoot))
    await selectFolders(app, [alternate])
    await command(page, 'Открыть рабочее пространство')
    await expect(page.locator('.status-message')).toContainText('276 объектов')
    await card(page, A)
    await expect(description(page)).toHaveValue('A mixed Save All')
    await page.screenshot({ path: info.outputPath('multi-root.png') })
  } finally {
    await app.evaluate(({ app }) => app.exit(0)).catch(() => {})
    await app.close().catch(() => {})
  }
})

// eslint-disable-next-line no-empty-pattern
test('KM-006 real KA metadata relocation, dirty cancel, incompatible/missing candidates, preview cancellation and restart', async ({}, info) => {
  test.setTimeout(120000)
  const a = await createKaFixture(),
    b = await createKaFixture(),
    moved = join(a.destination, 'relocated-metadata')
  await cp(a.metadataRoot, moved, { recursive: true })
  const env = { ...process.env, FRADE_USER_DATA: join(a.destination, 'profile') }
  let app = await electron.launch({ args: [resolve('out/main/index.cjs')], env })
  try {
    const page = await app.firstWindow()
    await expect(page.getByRole('status')).toHaveText('Backend: ready')
    await selectFolders(app, [a.dataRoot, a.metadataRoot, b.dataRoot, b.metadataRoot])
    await page.getByRole('button', { name: 'Открыть KA', exact: true }).click()
    await expect(page.locator('.status-message')).toContainText('138 объектов')
    await command(page, 'Добавить репозиторий KA')
    await expect(page.locator('.status-message')).toContainText('276 объектов')
    const [A, B] = await rootRows(page).evaluateAll((ns) =>
      ns.map((n) => n.getAttribute('data-repository-id')!),
    )
    await card(page, B)
    await description(page).fill('B retained draft')
    await card(page, A)
    await description(page).fill('A retained draft')
    await settings(page, A)
    await page.getByLabel('Папка метаописания').fill(moved)
    await page.getByRole('button', { name: 'Проверить набор', exact: true }).click()
    await page
      .getByRole('dialog', { name: 'Несохранённые изменения' })
      .getByRole('button', { name: 'Отмена', exact: true })
      .click()
    await expect(page.locator('.metadata-preview')).toHaveCount(0)
    await page
      .getByRole('dialog', { name: 'Метаописание репозитория' })
      .getByRole('button', { name: 'Отмена', exact: true })
      .click()
    await expect(description(page)).toHaveValue('A retained draft')
    await page.getByRole('button', { name: 'Отменить изменения', exact: true }).click()
    await settings(page, A)
    await page.getByRole('button', { name: 'Добавить набор', exact: true }).click()
    await page.getByLabel('Название набора').fill('Перенесённый набор')
    await page.getByLabel('Папка метаописания').fill(moved)
    await page.getByRole('button', { name: 'Проверить набор', exact: true }).click()
    await expect(page.locator('.metadata-preview')).toContainText('Совместимый набор')
    const fingerprint = await page.locator('.metadata-preview code').innerText()
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/)
    await page.getByRole('button', { name: 'Применить', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const modelFile = join(moved, 'kadzo/v2025/entities/application/systems.yaml')
    const modelText = await readFile(modelFile, 'utf8')
    await writeFile(
      modelFile,
      modelText.replace('title: &entity_title Системы', 'title: &entity_title Системы модели A'),
    )
    await card(page, A)
    await expect(page.locator('.breadcrumbs')).toContainText('Системы модели A', { timeout: 15000 })
    await card(page, B)
    await expect(page.locator('.breadcrumbs')).not.toContainText('Системы модели A')
    // An unrelated host command must not restore the cached older model generation for A.
    await page
      .locator(`[role=treeitem][aria-level="1"][data-repository-id="${B}"]`)
      .click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Переименовать корень' }).click()
    await page.getByLabel('Название корня').fill('KA B unchanged model')
    await page.getByRole('button', { name: 'Переименовать', exact: true }).click()
    await expect(page.locator('.root-error')).toHaveCount(0)
    await expect(page.locator('.conflict-review')).toHaveCount(0)
    await expect(description(page)).toHaveValue('B retained draft')
    await settings(page, A)
    await page.getByLabel('Папка метаописания').fill(join(a.destination, 'missing'))
    await page.getByRole('button', { name: 'Проверить набор', exact: true }).click()
    await expect(page.locator('.settings-dialog .field-error')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Применить', exact: true })).toBeDisabled()
    await page.getByLabel('Папка метаописания').fill(moved)
    await page.getByLabel('Файлы схем').fill('kadzo/v2023/entities/technical/tech_params.yaml')
    await page.getByRole('button', { name: 'Проверить набор', exact: true }).click()
    await expect(page.locator('.settings-dialog .field-error')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Применить', exact: true })).toBeDisabled()
    await page
      .getByRole('dialog', { name: 'Метаописание репозитория' })
      .getByRole('button', { name: 'Отмена', exact: true })
      .click()
    await card(page, A)
    await description(page).fill('Save after rejected model')
    await page.keyboard.press('Control+s')
    await expect(page.locator('.editor-actions')).toContainText('Все изменения сохранены')
    await card(page, B)
    await expect(description(page)).toHaveValue('B retained draft')
    await page.getByRole('button', { name: 'Отменить изменения', exact: true }).click()
    await page.screenshot({ path: info.outputPath('metadata-independent.png') })
    await app.close()
    const unavailable = join(b.destination, 'metadata-moved-away')
    await rename(b.metadataRoot, unavailable)
    app = await electron.launch({ args: [resolve('out/main/index.cjs')], env })
    const restored = await app.firstWindow()
    await expect(restored.locator('.status-message')).toContainText('138 объектов')
    await expect(restored.locator('.root-error')).toHaveCount(1)
    await settings(restored, B)
    await restored.getByLabel('Папка метаописания').fill(unavailable)
    await restored.getByRole('button', { name: 'Проверить набор', exact: true }).click()
    await expect(restored.locator('.metadata-preview')).toBeVisible()
    await restored.getByRole('button', { name: 'Применить', exact: true }).click()
    await expect(restored.locator('.root-error')).toHaveCount(0)
    await settings(restored, A)
    await expect(restored.getByLabel('Папка метаописания')).toHaveValue(moved)
    await expect(restored.getByLabel('Название набора')).toHaveValue('Перенесённый набор')
  } finally {
    await app.evaluate(({ app }) => app.exit(0)).catch(() => {})
    await app.close().catch(() => {})
  }
})
