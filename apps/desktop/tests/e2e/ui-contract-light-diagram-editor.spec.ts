import { test, expect, _electron as electron, type Page } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { createFlowFixture } from '../../../../scripts/flow-fixtures.mjs'

type Engine = 'native' | 'frame'
async function openEditor(engine: Engine, density: 'compact' | 'comfortable') {
  const fixture = await createFlowFixture(),
    profile = join(fixture.destination, 'lde-profile')
  await mkdir(profile)
  const settings = join(profile, 'presentation-settings.json')
  await writeFile(
    settings,
    JSON.stringify({
      version: 1,
      revision: 0,
      generation: 0,
      transactionId: 'lde/boot',
      selection: {
        mode: 'dark',
        density,
        preferred: {
          light: 'frade.builtin/light',
          dark: 'frade.builtin/dark',
          'high-contrast': 'frade.builtin/high-contrast',
        },
      },
    }),
  )
  const file = join(
    fixture.dataRoot,
    '_diagrams',
    engine === 'native' ? 'Flows.frade' : 'Flows.drawio',
  )
  const bytes = await readFile(file, 'utf8'),
    settingsBefore = await readFile(settings, 'utf8')
  const app = await electron.launch({
    args: [resolve('out/main/index.cjs')],
    env: { ...process.env, FRADE_USER_DATA: profile },
  })
  const page = await app.firstWindow()
  await page.addInitScript(() => {
    if (location.host !== 'drawio') return
    window.addEventListener('message', (event) => {
      let data
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : undefined
      } catch {
        return
      }
      const Editor = (window as any).EditorUi
      if (data?.action !== 'configure' || !Editor || Editor.prototype.init.__ldeCapture) return
      const original = Editor.prototype.init
      const capture = function (this: any, ...args: unknown[]) {
        const result = original.apply(this, args)
        ;(window as any).__ldeUi = this
        return result
      }
      capture.__ldeCapture = true
      Editor.prototype.init = capture
    })
  })
  try {
    await expect(page.locator('.wb-statusbar [role="status"]')).toHaveText('Backend: ready')
    await app.evaluate(
      ({ dialog }, paths) => {
        let index = 0
        dialog.showOpenDialog = (async () => ({
          canceled: false,
          filePaths: [paths[index++]],
        })) as typeof dialog.showOpenDialog
      },
      [fixture.dataRoot, fixture.metadataRoot],
    )
    await page.getByRole('button', { name: 'Открыть KA', exact: true }).click()
    await expect(page.locator('.status-message')).toContainText('9 объектов')
    await page
      .getByRole('treeitem')
      .filter({ hasText: /^_diagrams$/ })
      .click()
    await page
      .getByRole('treeitem')
      .filter({ hasText: engine === 'native' ? /^Flows\.frade$/ : /^Flows\.drawio$/ })
      .dblclick()
    await expect(page.locator('.repository-diagram')).toBeVisible()
    await expect(page.locator('.repository-diagram')).toHaveAttribute('data-frade-theme', 'light')
    await expect(page.locator('.frade-theme-commit-barrier')).toBeHidden()
    if (engine === 'native')
      await expect(page.locator('.x6-node[data-cell-id="node-A"]')).toBeVisible()
    else {
      await expect(page.frameLocator('iframe').locator('.geDiagramContainer')).toBeVisible()
      await expect
        .poll(() =>
          page
            .frameLocator('iframe')
            .locator('body')
            .evaluate(() => !!(window as any).__ldeUi),
        )
        .toBe(true)
    }
    return { app, page, file, bytes, settings, settingsBefore }
  } catch (error) {
    await app.close()
    throw error
  }
}
async function witness(page: Page, engine: Engine) {
  const parent = await page.locator('.repository-diagram').evaluate((root) => {
    const style = getComputedStyle(root),
      control = root.querySelector<HTMLButtonElement>('.editor-actions button')!,
      css = getComputedStyle(control)
    return {
      theme: (root as HTMLElement).dataset.fradeTheme,
      revision: (root as HTMLElement).dataset.fradeRevision,
      density: (root as HTMLElement).dataset.fradeDensity,
      background: style.backgroundColor,
      color: style.color,
      panel: getComputedStyle(root.querySelector('.editor-actions')!).backgroundColor,
      control: {
        height: control.getBoundingClientRect().height,
        color: css.color,
        background: css.backgroundColor,
      },
      dirty: document.querySelectorAll('.dirty-dot').length,
      forcedColors: matchMedia('(forced-colors: active)').matches,
      app: {
        theme: document.documentElement.dataset.fradeTheme,
        surface: getComputedStyle(document.querySelector('.ka-workbench')!).backgroundColor,
      },
    }
  })
  const content =
    engine === 'native'
      ? await page.locator('.frade-canvas .canvas').evaluate((canvas) => ({
          background: getComputedStyle(canvas.querySelector('.x6-graph-background')!)
            .backgroundColor,
          theme: (canvas as HTMLElement).dataset.fradeTheme,
          author: Array.from(canvas.querySelectorAll('.x6-node')).map((node) => ({
            transform: node.getAttribute('transform'),
            rects: Array.from(node.querySelectorAll('rect')).map((rect) => ({
              fill: rect.getAttribute('fill'),
              stroke: rect.getAttribute('stroke'),
            })),
            texts: Array.from(node.querySelectorAll('text')).map((text) => ({
              fill: text.getAttribute('fill'),
              text: text.textContent,
            })),
          })),
        }))
      : await page
          .frameLocator('iframe')
          .locator('body')
          .evaluate(() => {
            const ui = (window as any).__ldeUi
            return {
              background: getComputedStyle(document.querySelector('.geDiagramContainer')!)
                .backgroundColor,
              theme: document.documentElement.dataset.fradeFrameTheme,
              author: (window as any).mxUtils.getXml(ui.editor.getGraphXml()),
              history: ui.editor.undoManager.history.length,
              cursor: ui.editor.undoManager.indexOfNextAdd,
              gridSize: ui.editor.graph.gridSize,
              dotRadius: document
                .querySelector('[data-frade-private-grid] circle')
                ?.getAttribute('r'),
            }
          })
  return { parent, content }
}
for (const engine of ['native', 'frame'] as const)
  for (const density of ['compact', 'comfortable'] as const) {
    // eslint-disable-next-line no-empty-pattern
    test(`LDE initial ${engine}/${density}: actual Light surface and forced-colors round trip preserve content`, async ({}, info) => {
      test.setTimeout(90000)
      const f = await openEditor(engine, density)
      const observations: unknown[] = []
      try {
        const before = await witness(f.page, engine)
        observations.push({ phase: 'light-under-dark', ...before })
        expect(before.parent.theme).toBe('light')
        expect(before.parent.app.theme).toBe('dark')
        expect(before.parent.app.surface).not.toBe(before.parent.background)
        expect(before.parent.background).toBe('rgb(249, 250, 252)')
        expect(before.parent.panel).toBe('rgb(245, 246, 248)')
        expect(before.content.background).toBe('rgb(249, 250, 252)')
        expect(before.content.theme).toBe('light')
        expect(before.parent.control.height).toBeGreaterThanOrEqual(density === 'compact' ? 28 : 36)
        await f.page.screenshot({ path: info.outputPath('light-under-dark.png') })
        if (engine === 'frame') {
          const frame = f.page.frameLocator('iframe')
          await frame.locator('.geMenubarContainer a').first().click()
          const popup = frame.locator('div.mxPopupMenu:visible').first()
          await expect(popup).toBeVisible()
          const menu = await popup.evaluate((node) => ({
            color: getComputedStyle(node).color,
            background: getComputedStyle(node).backgroundColor,
          }))
          observations.push({ phase: 'real-frame-menu', menu })
          expect(menu.background).toBe('rgb(245, 246, 248)')
          await f.page.screenshot({ path: info.outputPath('frame-light-menu.png') })
          await frame.locator('.geDiagramContainer').click({ position: { x: 80, y: 200 } })
        }
        await f.page.emulateMedia({ forcedColors: 'active' })
        await expect
          .poll(() =>
            f.page
              .locator('.repository-diagram')
              .evaluate((root) =>
                (root as HTMLElement).style.getPropertyValue('--frade-diagram-canvas'),
              ),
          )
          .toBe('Canvas')
        await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
        const forced = await witness(f.page, engine)
        observations.push({ phase: 'forced-colors', ...forced })
        expect(forced.parent.forcedColors).toBe(true)
        expect(forced.content.author).toEqual(before.content.author)
        await f.page.screenshot({ path: info.outputPath('forced-colors.png') })
        await f.page.emulateMedia({ forcedColors: 'none' })
        await expect
          .poll(() =>
            f.page
              .locator('.repository-diagram')
              .evaluate((root) =>
                (root as HTMLElement).style.getPropertyValue('--frade-diagram-canvas'),
              ),
          )
          .toBe('#F9FAFC')
        await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
        const restored = await witness(f.page, engine)
        observations.push({ phase: 'restored-light', ...restored })
        expect(restored.parent.forcedColors).toBe(false)
        expect(restored.content.background).toBe(before.content.background)
        expect(restored.content.author).toEqual(before.content.author)
        expect(await readFile(f.file, 'utf8')).toBe(f.bytes)
        expect(await readFile(f.settings, 'utf8')).toBe(f.settingsBefore)
        expect(restored.parent.dirty).toBe(before.parent.dirty)
        await f.page.screenshot({ path: info.outputPath('restored-light.png') })
      } finally {
        await writeFile(
          info.outputPath('lde-observations.json'),
          JSON.stringify(
            {
              engine,
              density,
              observations,
              visualApproval: 'NOT_APPROVED',
              coverage: 'BOUNDED_INITIAL_PROBE_NOT_FULL_MATRIX',
            },
            null,
            2,
          ),
        )
        await f.app.close()
      }
    })
  }

// eslint-disable-next-line no-empty-pattern
test('LDE owned dirty guard uses the originating editor Light scope', async ({}, info) => {
  const f = await openEditor('native', 'compact')
  const dialog = f.page.getByRole('dialog', { name: 'Несохранённые изменения', exact: true })
  try {
    const node = f.page.locator('.x6-node[data-cell-id="node-A"]'),
      box = (await node.boundingBox())!
    await f.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await f.page.mouse.down()
    await f.page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 10, { steps: 3 })
    await f.page.mouse.up()
    await expect(f.page.locator('.dirty-dot')).toHaveCount(1)
    const editedTransform = await node.getAttribute('transform')
    await f.page.locator('.editor-tab .close-tab').click()
    await expect(dialog).toBeVisible()
    const appearance = await dialog.evaluate((root) => ({
      background: getComputedStyle(root).backgroundColor,
      color: getComputedStyle(root).color,
      editorTheme: (root as HTMLElement).dataset.fradeTheme ?? null,
      label: root.textContent,
      appTheme: document.documentElement.dataset.fradeTheme,
    }))
    await writeFile(
      info.outputPath('owned-guard.json'),
      JSON.stringify(
        {
          appearance,
          expectedScope: 'SINGLE_NATIVE_EDITOR_LIGHT',
          fixture: 'Synthetic; actual user node drag before close, no save/discard action',
        },
        null,
        2,
      ),
    )
    await f.page.screenshot({ path: info.outputPath('owned-guard.png') })
    expect(appearance.appTheme).toBe('dark')
    expect(appearance.background).toBe('rgb(255, 255, 255)')
    expect(await readFile(f.file, 'utf8')).toBe(f.bytes)
    expect(await readFile(f.settings, 'utf8')).toBe(f.settingsBefore)
    await dialog.getByRole('button', { name: 'Отмена', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(node).toHaveAttribute('transform', editedTransform!)
    await expect(f.page.locator('.dirty-dot')).toHaveCount(1)
    await f.page.getByRole('button', { name: 'Меню Файл', exact: true }).click()
    await f.page.getByRole('menuitem', { name: 'Выбрать тему…', exact: true }).click()
    const globalPicker = f.page.getByRole('dialog', { name: 'Выбор темы', exact: true })
    await expect(globalPicker).toBeVisible()
    const globalAppearance = await globalPicker.evaluate((root) => ({
      background: getComputedStyle(root).backgroundColor,
      editor: (root as HTMLElement).dataset.fradeEditor ?? null,
    }))
    expect(globalAppearance.background).toBe('rgb(39, 43, 51)')
    expect(globalAppearance.editor).toBeNull()
    await writeFile(
      info.outputPath('global-picker-isolation.json'),
      JSON.stringify(globalAppearance, null, 2),
    )
    await f.page.keyboard.press('Escape')
    await expect(globalPicker).toBeHidden()
    expect(await readFile(f.file, 'utf8')).toBe(f.bytes)
    expect(await readFile(f.settings, 'utf8')).toBe(f.settingsBefore)
  } finally {
    if (await dialog.isVisible())
      await dialog.getByRole('button', { name: 'Отмена', exact: true }).click()
    await f.app.close()
  }
})
