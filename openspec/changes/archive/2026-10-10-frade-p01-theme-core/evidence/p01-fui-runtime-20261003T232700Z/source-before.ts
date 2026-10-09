import { inflateSync } from 'node:zlib'
import { test, expect, _electron as electron } from '@playwright/test'
import { mkdtemp, writeFile, readFile, mkdir, rmdir, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createFlowFixture } from '../../../../scripts/flow-fixtures.mjs'
import { createKaFixture } from '../../../../scripts/ka-fixtures.mjs'
import type { Page, ElectronApplication } from '@playwright/test'
import type { PresentationApi } from '@frade/runtime-contracts'
declare global {
  interface Window {
    fradePresentation: PresentationApi
  }
}
// eslint-disable-next-line no-empty-pattern
test('P01 real startup restores validated presentation before the visible window and keeps health API isolated', async ({}, info) => {
  const profile = await mkdtemp(join(tmpdir(), 'frade-p01-boot-'))
  const record = {
    version: 1,
    revision: 7,
    generation: 9,
    transactionId: 'previous/window/choice',
    selection: {
      mode: 'dark',
      density: 'comfortable',
      preferred: {
        light: 'frade.builtin/light',
        dark: 'frade.builtin/dark',
        'high-contrast': 'frade.builtin/high-contrast',
      },
    },
  }
  await writeFile(join(profile, 'presentation-settings.json'), JSON.stringify(record))
  const app = await electron.launch({
    args: [resolve('out/main/index.cjs')],
    env: { ...process.env, FRADE_USER_DATA: profile },
  })
  try {
    const page = await app.firstWindow()
    await page.locator('.ka-workbench').waitFor({ state: 'attached' })
    const state = await page.evaluate(() => ({
      api: Object.keys(window.frade),
      runtime: Object.keys(window.frade.runtime),
      presentation:
        typeof window.fradePresentation === 'undefined'
          ? []
          : Object.keys(window.fradePresentation),
      theme: document.documentElement.dataset.fradeTheme,
      density: document.documentElement.dataset.fradeDensity,
      revision: document.documentElement.dataset.fradeRevision,
      node: typeof (window as unknown as { require?: unknown }).require,
    }))
    expect(state).toEqual({
      api: ['runtime', 'events'],
      runtime: ['getHealth'],
      presentation: ['getBoot', 'announceIntent', 'persist', 'reconcile', 'ready'],
      theme: 'dark',
      density: 'comfortable',
      revision: '7',
      node: 'undefined',
    })
    await expect
      .poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()))
      .toBe(true)
    await expect(
      page.getByRole('status', { name: '', exact: true }).filter({ hasText: 'Backend:' }),
    ).toHaveText('Backend: ready')
    expect(JSON.parse(await readFile(join(profile, 'presentation-settings.json'), 'utf8'))).toEqual(
      record,
    )
    await page.screenshot({ path: info.outputPath('startup-dark-comfortable.png') })
  } finally {
    await app.close()
  }
})

async function diagramFixture(
  kind: 'native' | 'frame',
  presentation?: { mode: 'light' | 'dark' | 'high-contrast'; density: 'compact' | 'comfortable' },
  welcome?: (page: Page) => Promise<void>,
) {
  const fixture = await createKaFixture(),
    folder = join(fixture.dataRoot, '_diagrams')
  await mkdir(folder, { recursive: true })
  const name = kind === 'native' ? 'Workshop.frade' : 'Workshop.drawio'
  const authoredDocument =
    kind === 'native'
      ? JSON.stringify(
          {
            format: 'frade-draw',
            version: 1,
            metadata: { id: 'p01-authored', name: 'Workshop' },
            graph: {
              nodes: [
                {
                  id: 'authored',
                  shape: 'rect',
                  x: 140,
                  y: 120,
                  width: 180,
                  height: 80,
                  label: 'Authored paint',
                  style: { fill: '#77AADD', stroke: '#334455' },
                  labelStyle: { fill: '#112244' },
                },
              ],
              edges: [],
            },
            viewport: { zoom: 1, pan: { x: 0, y: 0 } },
          },
          null,
          2,
        )
      : '<mxfile><diagram id="main" name="Workshop"><mxGraphModel grid="1" gridSize="10" background="#F7E2C2" gridColor="#112233" page="1" pageWidth="700" pageHeight="500"><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="authored" value="Authored paint" style="rounded=0;fillColor=#77AADD;strokeColor=#334455;fontColor=#112244;" vertex="1" parent="1"><mxGeometry x="140" y="120" width="180" height="80" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>'
  const file = join(folder, name)
  await writeFile(file, authoredDocument)
  if (presentation) {
    const profile = join(fixture.destination, 'p01-' + kind + '-profile')
    await mkdir(profile, { recursive: true })
    await writeFile(
      join(profile, 'presentation-settings.json'),
      JSON.stringify({
        version: 1,
        revision: 0,
        generation: 0,
        transactionId: 'matrix/boot',
        selection: {
          ...presentation,
          preferred: {
            light: 'frade.builtin/light',
            dark: 'frade.builtin/dark',
            'high-contrast': 'frade.builtin/high-contrast',
          },
        },
      }),
    )
  }
  const app = await electron.launch({
    args: [resolve('out/main/index.cjs')],
    env: { ...process.env, FRADE_USER_DATA: join(fixture.destination, 'p01-' + kind + '-profile') },
  })
  const page = await app.firstWindow()
  await page.addInitScript(() => {
    const telemetry = ((window as any).__p01Telemetry = {
      messages: [] as unknown[],
      paints: [] as number[],
      visibility: [] as unknown[],
    })
    const tick = (now: number) => {
      if (telemetry.paints.length > 999) telemetry.paints.shift()
      telemetry.paints.push(now)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    document.addEventListener('visibilitychange', () =>
      telemetry.visibility.push({ time: performance.now(), state: document.visibilityState }),
    )
    window.addEventListener('message', (event) => {
      let data
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : undefined
      } catch {
        return
      }
      if (
        data?.action === 'fradePresentation' &&
        data.operation === 'prepare' &&
        data.snapshot?.kind === 'dark' &&
        (window as any).__p01RefuseDark
      ) {
        event.stopImmediatePropagation()
        parent.postMessage(
          JSON.stringify({
            event: 'fradePresentation',
            version: 1,
            participantId: data.participantId,
            participantGeneration: data.participantGeneration,
            context: data.context,
            operation: 'prepare',
            status: 'REFUSED',
            message: 'Controlled current frame refusal',
          }),
          'frade://app',
        )
      }
      if (data?.action === 'fradePresentation' || data?.event === 'fradePresentation')
        telemetry.messages.push({ time: performance.now(), data })
    })
    if (location.host !== 'drawio') return
    window.addEventListener('message', (event) => {
      let value
      try {
        value = typeof event.data === 'string' ? JSON.parse(event.data) : undefined
      } catch {
        return
      }
      const Editor = (window as any).EditorUi
      if (value?.action !== 'configure' || !Editor || Editor.prototype.init.__p01Capture) return
      const original = Editor.prototype.init
      const capture = function (this: any, ...args: unknown[]) {
        const result = original.apply(this, args)
        ;(window as any).__p01Ui = this
        return result
      }
      capture.__p01Capture = true
      Editor.prototype.init = capture
    })
  })
  await expect(page.locator('.wb-statusbar [role="status"]')).toHaveText('Backend: ready')
  if (welcome) await welcome(page)
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
  await expect(page.locator('.status-message')).toContainText('138 объектов', { timeout: 30000 })
  const diagrams = page.getByRole('treeitem').filter({ hasText: /^_diagrams$/ })
  await diagrams.click()
  await page
    .getByRole('treeitem')
    .filter({ hasText: new RegExp('^' + name.replace('.', '\\.') + '$') })
    .dblclick()
  await expect(
    page
      .locator('.repository-diagram .editor-actions')
      .getByRole('button', { name: 'Сохранить', exact: true }),
  ).toBeEnabled({ timeout: 20000 })
  if (kind === 'frame') {
    await expect(page.locator('iframe')).toHaveAttribute(
      'data-frade-revision',
      (await page.locator('html').getAttribute('data-frade-revision')) as string,
    )
    await expect(page.locator('.frade-theme-commit-barrier')).toBeHidden()
    await expect(page.locator('iframe')).toBeVisible()
    await page
      .frameLocator('iframe')
      .locator('body')
      .evaluate(async () => {
        await document.fonts.ready
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        )
      })
    await expect(page.locator('.diagram-error')).toHaveCount(0)
  }
  return { fixture, app, page, file, name }
}
async function finishDiagramFixture(app: ElectronApplication) {
  // A deliberately blocked recovery must not leak this test's isolated Electron process.
  // Explicit window-close/dirty-guard scenarios use the normal close path separately.
  await app.evaluate(({ app }) => {
    setTimeout(() => app.exit(0), 50)
  })
  await app.close()
}
async function previewDark(page: Page) {
  await page.getByRole('button', { name: 'Меню Файл' }).click()
  await page.getByRole('menuitem', { name: 'Выбрать тему…' }).click()
  await page.getByRole('option', { name: /Dark/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Предпросмотр' })).toContainText(
    'Предпросмотр',
  )
}
// eslint-disable-next-line no-empty-pattern
test('P01 native hot preview and commit preserve authored JSON, graph identity, selection and undo history', async ({}, info) => {
  test.setTimeout(90000)
  const f = await diagramFixture('native')
  try {
    const canvas = f.page.locator('.frade-canvas .canvas'),
      node = f.page.locator('.x6-node[data-cell-id="authored"]')
    await expect(node).toBeVisible()
    const box = (await node.boundingBox())!
    await f.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await f.page.mouse.down()
    await f.page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20, { steps: 5 })
    await f.page.mouse.up()
    const moved = await node.getAttribute('transform')
    await expect(f.page.locator('.dirty-dot')).toHaveCount(1)
    const save = f.page
      .locator('.repository-diagram .editor-actions')
      .getByRole('button', { name: 'Сохранить', exact: true })
    await save.click()
    await expect(f.page.locator('.dirty-dot')).toHaveCount(0)
    const before = await readFile(f.file, 'utf8')
    await canvas.evaluate((el) => {
      ;(window as any).__p01NativeCanvas = el
    })
    const selected = await f.page.locator('.frade-canvas .x6-widget-selection-box').count()
    await previewDark(f.page)
    await expect(canvas).toHaveAttribute('data-frade-theme', 'dark')
    expect(await canvas.evaluate((el) => el === (window as any).__p01NativeCanvas)).toBe(true)
    expect(await f.page.locator('.frade-canvas .x6-widget-selection-box').count()).toBe(selected)
    expect(await node.getAttribute('transform')).toBe(moved)
    expect(await node.locator('rect').first().getAttribute('fill')).toBe('#77AADD')
    expect(await readFile(f.file, 'utf8')).toBe(before)
    await f.page.getByRole('button', { name: 'Сохранить выбор' }).click()
    await expect(f.page.getByRole('dialog', { name: 'Выбор темы' })).toHaveCount(0)
    await save.click()
    await expect(f.page.locator('.dirty-dot')).toHaveCount(0)
    expect(await readFile(f.file, 'utf8')).toBe(before)
    await f.page.getByRole('button', { name: 'Undo', exact: true }).click()
    expect(await node.getAttribute('transform')).not.toBe(moved)
    await f.page.getByRole('button', { name: 'Redo', exact: true }).click()
    expect(await node.getAttribute('transform')).toBe(moved)
    await f.page.screenshot({ path: info.outputPath('native-dark-authored.png') })
  } finally {
    await finishDiagramFixture(f.app)
  }
})
// eslint-disable-next-line no-empty-pattern
test('P01 embedded hot preview and cancellation preserve XML, authored paint, preferences, selection and editor identity', async ({}, info) => {
  test.setTimeout(90000)
  const f = await diagramFixture('frame')
  try {
    const frame = f.page.frameLocator('iframe'),
      chrome = frame.locator('html')
    await expect(frame.locator('.geDiagramContainer')).toBeVisible()
    await expect
      .poll(() => frame.locator('body').evaluate(() => !!(window as any).__p01Ui))
      .toBe(true)
    const snapshot = () =>
      frame.locator('body').evaluate(() => {
        const ui = (window as any).__p01Ui,
          graph = ui.editor.graph
        return {
          xml: (window as any).mxUtils.getXml(ui.editor.getGraphXml()),
          selection: graph.getSelectionCells().map((cell: any) => cell.id),
          history: ui.editor.undoManager.history.length,
          cursor: ui.editor.undoManager.indexOfNextAdd,
          background: graph.background,
          gridColor: graph.gridColor,
          gridEnabled: graph.gridEnabled,
          page: ui.currentPage?.id,
          preferences: { ...localStorage },
        }
      })
    await frame.locator('body').evaluate(() => {
      const ui = (window as any).__p01Ui
      ui.editor.graph.setSelectionCell(ui.editor.graph.getModel().getCell('authored'))
      ;(window as any).__p01OriginalUi = ui
      ;(window as any).__p01OriginalGraph = ui.editor.graph
    })
    const before = await snapshot(),
      disk = await readFile(f.file, 'utf8')
    await previewDark(f.page)
    await expect(chrome).toHaveAttribute('data-frade-frame-theme', 'dark')
    expect(await snapshot()).toEqual(before)
    expect(
      await frame
        .locator('body')
        .evaluate(
          () =>
            (window as any).__p01Ui === (window as any).__p01OriginalUi &&
            (window as any).__p01Ui.editor.graph === (window as any).__p01OriginalGraph,
        ),
    ).toBe(true)
    expect(await readFile(f.file, 'utf8')).toBe(disk)
    await f.page.keyboard.press('Escape')
    await expect(f.page.getByRole('dialog', { name: 'Выбор темы' })).toHaveCount(0)
    expect(await snapshot()).toEqual(before)
    expect(await readFile(f.file, 'utf8')).toBe(disk)
    await f.page.screenshot({ path: info.outputPath('frame-canceled-authored.png') })
  } catch (error) {
    const frame = f.page.frameLocator('iframe')
    const diagnostic = {
      parent: await f.page.evaluate(() => ({
        visibility: document.visibilityState,
        telemetry: (window as any).__p01Telemetry,
        root: { ...document.documentElement.dataset },
        status: document.querySelector('.frade-theme-commit-barrier')?.textContent,
      })),
      frame: await frame.locator('body').evaluate(() => ({
        visibility: document.visibilityState,
        telemetry: (window as any).__p01Telemetry,
        root: { ...document.documentElement.dataset },
      })),
    }
    await info.attach('frame-presentation-diagnostic.json', {
      body: JSON.stringify(diagnostic, null, 2),
      contentType: 'application/json',
    })
    throw error
  } finally {
    await finishDiagramFixture(f.app)
  }
})

// eslint-disable-next-line no-empty-pattern
test('P01 parked required frame acknowledges while dirty KA stays active and restores its same editor on return', async ({}, info) => {
  test.setTimeout(90000)
  const f = await diagramFixture('frame')
  try {
    const frame = f.page.frameLocator('iframe'),
      chrome = frame.locator('html')
    await expect(chrome).toHaveAttribute('data-frade-frame-theme', 'light')
    const snapshot = () =>
      frame.locator('body').evaluate(() => {
        const ui = (window as any).__p01Ui
        return {
          xml: (window as any).mxUtils.getXml(ui.editor.getGraphXml()),
          history: ui.editor.undoManager.history.length,
          cursor: ui.editor.undoManager.indexOfNextAdd,
          preferences: { ...localStorage },
        }
      })
    await frame.locator('body').evaluate(() => {
      ;(window as any).__p01OriginalUi = (window as any).__p01Ui
    })
    const before = await snapshot(),
      disk = await readFile(f.file, 'utf8')
    await f.page
      .getByLabel('Поиск объектов', { exact: true })
      .fill('ecogroup.berezka.systems.berezka')
    await f.page.locator('[data-object-id="ecogroup.berezka.systems.berezka"]').dblclick()
    const description = f.page.locator('.field[data-field-path="description"] textarea')
    await description.fill('P01 unsaved KA ownership')
    await expect(f.page.locator('iframe')).toBeHidden()
    await expect(f.page.locator('.dirty-dot')).toHaveCount(1)
    await previewDark(f.page)
    await expect(chrome).toHaveAttribute('data-frade-frame-theme', 'dark')
    await f.page.keyboard.press('Escape')
    await expect(f.page.getByRole('dialog', { name: 'Выбор темы' })).toHaveCount(0)
    await expect(description).toHaveValue('P01 unsaved KA ownership')
    await expect(f.page.locator('.dirty-dot')).toHaveCount(1)
    await expect(f.page.locator('iframe')).toBeHidden()
    await f.page.getByRole('tab', { name: 'Workshop.drawio', exact: true }).click()
    await expect(f.page.locator('iframe')).toBeVisible()
    expect(await snapshot()).toEqual(before)
    expect(
      await frame
        .locator('body')
        .evaluate(() => (window as any).__p01OriginalUi === (window as any).__p01Ui),
    ).toBe(true)
    expect(await readFile(f.file, 'utf8')).toBe(disk)
    await f.page.screenshot({ path: info.outputPath('parked-frame-restored.png') })
  } finally {
    await finishDiagramFixture(f.app)
  }
})

// eslint-disable-next-line no-empty-pattern
test('P01 real frame chord, Settings, System media and preview window-close preserve dirty KA and durable ownership', async ({}, info) => {
  test.setTimeout(120000)
  const f = await diagramFixture('frame'),
    profile = join(f.fixture.destination, 'p01-frame-profile'),
    settings = join(profile, 'presentation-settings.json')
  try {
    const root = f.page.locator('html'),
      frame = f.page.frameLocator('iframe')
    await expect(frame.locator('html')).toHaveAttribute('data-frade-frame-theme', 'light')
    await frame.locator('.geDiagramContainer').click({ position: { x: 30, y: 30 } })
    await f.page.keyboard.press('Control+k')
    await f.page.keyboard.press('Control+t')
    await expect(f.page.getByRole('dialog', { name: 'Выбор темы' })).toBeVisible()
    await f.page.getByRole('option', { name: /Light/ }).focus()
    await f.page.keyboard.press('ArrowDown')
    await expect(root).toHaveAttribute('data-frade-theme', 'dark')
    await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
    await f.page.keyboard.press('Escape')
    await expect(f.page.getByRole('dialog', { name: 'Выбор темы' })).toHaveCount(0)
    await expect(root).toHaveAttribute('data-frade-theme', 'light')
    expect(
      await f.page.evaluate(() => document.activeElement === document.querySelector('iframe')),
    ).toBe(true)
    await f.page.getByRole('button', { name: 'Меню Файл' }).click()
    await f.page.getByRole('menuitem', { name: 'Настройки интерфейса' }).click()
    const dialog = f.page.getByRole('dialog', { name: 'Настройки интерфейса' })
    await dialog.getByRole('radio', { name: 'Комфортная', exact: true }).click()
    await expect(dialog.getByRole('radio', { name: 'Комфортная', exact: true })).toBeChecked()
    await expect(root).toHaveAttribute('data-frade-density', 'comfortable')
    await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
    await dialog.getByRole('radio', { name: /Light/ }).click()
    await expect(dialog.getByRole('radio', { name: /Light/ })).toBeChecked()
    await dialog.getByRole('button', { name: 'Применить', exact: true }).click()
    await expect(dialog.getByRole('status')).toHaveText('Сохранено')
    let durable = await readFile(settings, 'utf8')
    expect(JSON.parse(durable).selection).toMatchObject({ mode: 'light', density: 'comfortable' })
    await f.page.emulateMedia({ colorScheme: 'dark' })
    expect(await f.page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)).toBe(
      true,
    )
    await expect(root).toHaveAttribute('data-frade-theme', 'light')
    expect(await readFile(settings, 'utf8')).toBe(durable)
    await dialog.getByRole('radio', { name: /System/ }).click()
    await expect(dialog.getByRole('radio', { name: /System/ })).toBeChecked()
    await expect(root).toHaveAttribute('data-frade-theme', 'dark')
    await dialog.getByRole('button', { name: 'Применить', exact: true }).click()
    await expect(dialog.getByRole('status')).toHaveText('Сохранено')
    durable = await readFile(settings, 'utf8')
    expect(JSON.parse(durable).selection.mode).toBe('system')
    await f.page.emulateMedia({ colorScheme: 'light' })
    await expect(root).toHaveAttribute('data-frade-theme', 'light')
    await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
    expect(await readFile(settings, 'utf8')).toBe(durable)
    await dialog.getByRole('button', { name: 'Выбрать тему…' }).click()
    await f.page.getByRole('option', { name: /Dark/ }).click()
    await expect(root).toHaveAttribute('data-frade-theme', 'dark')
    await f.page.emulateMedia({
      colorScheme: 'light',
      forcedColors: 'active',
      reducedMotion: 'reduce',
    })
    await expect
      .poll(() =>
        f.page.evaluate(() =>
          getComputedStyle(document.documentElement)
            .getPropertyValue('--frade-text-primary')
            .trim(),
        ),
      )
      .toBe('CanvasText')
    expect(
      await f.page.evaluate(() => ({
        forced: matchMedia('(forced-colors: active)').matches,
        reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      })),
    ).toEqual({ forced: true, reduced: true })
    await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
    await f.page.keyboard.press('Escape')
    await expect(f.page.getByRole('dialog', { name: 'Выбор темы' })).toHaveCount(0)
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Закрыть', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    expect(await readFile(settings, 'utf8')).toBe(durable)
    await f.page.emulateMedia({
      colorScheme: 'light',
      forcedColors: 'none',
      reducedMotion: 'no-preference',
    })
    await expect
      .poll(() =>
        f.page.evaluate(() =>
          getComputedStyle(document.documentElement)
            .getPropertyValue('--frade-text-primary')
            .trim(),
        ),
      )
      .not.toBe('CanvasText')
    await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
    await f.page
      .getByLabel('Поиск объектов', { exact: true })
      .fill('ecogroup.berezka.systems.berezka')
    await f.page.locator('[data-object-id="ecogroup.berezka.systems.berezka"]').dblclick()
    const description = f.page.locator('.field[data-field-path="description"] textarea')
    await description.fill('P01 window-close dirty KA')
    await f.page.keyboard.press('Control+k')
    await f.page.keyboard.press('Control+t')
    await expect(f.page.getByRole('dialog', { name: 'Выбор темы' })).toHaveCount(0)
    await previewDark(f.page)
    await f.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close())
    const guard = f.page.getByRole('dialog', { name: 'Несохранённые изменения' })
    await expect(guard).toBeVisible()
    await expect(root).toHaveAttribute('data-frade-theme', 'light')
    await expect(f.page.getByRole('dialog', { name: 'Выбор темы' })).toHaveCount(0)
    expect(await readFile(settings, 'utf8')).toBe(durable)
    await guard.getByRole('button', { name: 'Отмена', exact: true }).click()
    await expect(description).toHaveValue('P01 window-close dirty KA')
    await expect(f.page.locator('.dirty-dot')).toHaveCount(1)
    await expect
      .poll(() =>
        f.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()),
      )
      .toBe(true)
    await f.page.screenshot({ path: info.outputPath('dirty-ka-close-canceled.png') })
  } finally {
    await finishDiagramFixture(f.app)
  }
})
// eslint-disable-next-line no-empty-pattern
test('P01 actual required frame refusal restores prior presentation and exposes truthful live error without document writes', async ({}, info) => {
  const f = await diagramFixture('frame')
  try {
    const frame = f.page.frameLocator('iframe')
    await expect(frame.locator('html')).toHaveAttribute('data-frade-frame-theme', 'light')
    const before = await readFile(f.file, 'utf8')
    await frame.locator('body').evaluate(() => {
      ;(window as any).__p01RefuseDark = true
    })
    await f.page.getByRole('button', { name: 'Меню Файл' }).click()
    await f.page.getByRole('menuitem', { name: 'Выбрать тему…' }).click()
    await f.page.getByRole('option', { name: /Dark/ }).click()
    await expect(
      f.page.getByRole('dialog', { name: 'Выбор темы' }).getByRole('status'),
    ).toContainText('Controlled current frame refusal')
    await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
    await expect(f.page.locator('html')).toHaveAttribute('data-frade-theme', 'light')
    await expect(frame.locator('html')).toHaveAttribute('data-frade-frame-theme', 'light')
    expect(await readFile(f.file, 'utf8')).toBe(before)
    await f.page.screenshot({ path: info.outputPath('current-frame-refusal.png') })
    await f.page.keyboard.press('Escape')
    await expect(f.page.getByRole('dialog', { name: 'Выбор темы' })).toHaveCount(0)
    await expect(f.page.locator('iframe')).toBeVisible()
  } finally {
    await finishDiagramFixture(f.app)
  }
})

// Actual application snapshots and computed consumers; authored graph paint is excluded from UI contrast.
function uiContrast(foreground: string, background: string): number {
  const luminance = (value: string) => {
    const rgb = value
      .match(/[\d.]+/g)
      ?.slice(0, 3)
      .map(Number)
    if (!rgb || rgb.length !== 3) throw Error('Unresolved runtime color ' + value)
    return rgb
      .map((value) => value / 255)
      .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
  }
  const a = luminance(foreground),
    b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
async function readUiConsumers(body: ReturnType<Page['locator']>, scope: 'root' | 'frame') {
  return body.evaluate((root, scope) => {
    const selectors =
      scope === 'root'
        ? 'button,input,select,textarea,[role="treeitem"],[role="option"],.field-help,.field-error,.wb-dialog p'
        : '.geMenubarContainer a,.geToolbarContainer a,button,input,select,textarea,a.geButton,a.geItem,.geTabContainer [role=button],[data-frade-lower-menu] [role^=menuitem]'
    return Array.from(root.querySelectorAll<HTMLElement>(selectors)).flatMap((node) => {
      const box = node.getBoundingClientRect(),
        style = getComputedStyle(node)
      if (
        !box.width ||
        !box.height ||
        style.visibility === 'hidden' ||
        node.closest('[hidden]') ||
        box.bottom <= 0 ||
        box.top >= innerHeight ||
        box.right <= 0 ||
        box.left >= innerWidth ||
        node.matches(':disabled')
      )
        return []
      let background = ''
      for (let ancestor: HTMLElement | null = node; ancestor; ancestor = ancestor.parentElement) {
        const color = getComputedStyle(ancestor).backgroundColor
        if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
          background = color
          break
        }
      }
      const target = node.matches('input[type=radio],input[type=checkbox]')
        ? (node.closest('label') ?? node)
        : node
      return [
        {
          tag: node.tagName,
          role: node.getAttribute('role'),
          class: node.className,
          label:
            node.getAttribute('aria-label') ??
            node.getAttribute('title') ??
            node.textContent?.trim().slice(0, 100),
          color: style.color,
          background,
          target: target.getBoundingClientRect().toJSON(),
          text:
            !!node.textContent?.trim() && !node.matches('input[type=radio],input[type=checkbox]'),
          exception:
            scope === 'root' &&
            !!node.closest('.wb-titlebar,.wb-statusbar,.editor-tabs,.breadcrumbs'),
          control: node.matches(
            'button,input,select,textarea,a,[role=treeitem],[role=option],[role=button],[role^=menuitem]',
          ),
        },
      ]
    })
  }, scope)
}
for (const mode of ['light', 'dark', 'high-contrast'] as const)
  for (const density of ['compact', 'comfortable'] as const)
    for (const kind of ['native', 'frame'] as const) {
      // eslint-disable-next-line no-empty-pattern
      test('P01-matrix ' + mode + ' ' + density + ' ' + kind, async ({}, info) => {
        test.setTimeout(120000)
        const observations: unknown[] = [],
          violations: unknown[] = []
        const capture = async (page: Page, label: string, scope: 'root' | 'frame' = 'root') => {
          const body =
            scope === 'root' ? page.locator('body') : page.frameLocator('iframe').locator('body')
          await body.evaluate(async () => {
            await document.fonts.ready
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            )
          })
          const consumers = await readUiConsumers(body, scope)
          for (const consumer of consumers) {
            if (
              consumer.text &&
              consumer.background &&
              uiContrast(consumer.color, consumer.background) < 4.5
            )
              violations.push({
                label,
                scope,
                rule: 'A11Y-CONTRAST',
                consumer,
                ratio: uiContrast(consumer.color, consumer.background),
              })
            if (
              consumer.control &&
              !consumer.exception &&
              consumer.target.height < (density === 'compact' ? 28 : 36)
            )
              violations.push({ label, scope, rule: 'FDS-DENSITY', consumer })
            if (consumer.control && !consumer.exception && consumer.target.width < 24)
              violations.push({ label, scope, rule: 'A11Y-004', consumer })
          }
          const environment = await body.evaluate(() => ({
            fonts: document.fonts.status,
            dpr: devicePixelRatio,
            viewport: { width: innerWidth, height: innerHeight },
            forced: matchMedia('(forced-colors: active)').matches,
            coarse: matchMedia('(pointer: coarse)').matches,
            reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
          }))
          observations.push({ label, scope, environment, consumers })
          await page.screenshot({ path: info.outputPath(label + '.png') })
        }
        const f = await diagramFixture(kind, { mode, density }, (page) => capture(page, 'welcome'))
        const before = await readFile(f.file, 'utf8')
        try {
          await expect(f.page.locator('html')).toHaveAttribute('data-frade-theme', mode)
          await expect(f.page.locator('html')).toHaveAttribute('data-frade-density', density)
          expect(await f.page.evaluate(() => devicePixelRatio)).toBe(1)
          await capture(f.page, kind + '-diagram', kind === 'frame' ? 'frame' : 'root')
          await f.page
            .getByLabel('Поиск объектов', { exact: true })
            .fill('ecogroup.berezka.systems.berezka')
          await f.page.locator('[data-object-id="ecogroup.berezka.systems.berezka"]').dblclick()
          const description = f.page.locator('.field[data-field-path="description"] textarea')
          await description.fill('P01 matrix retained dirty draft')
          await capture(f.page, 'dirty-ka')
          await f.page.getByRole('button', { name: 'Меню Файл' }).click()
          await f.page.getByRole('menuitem', { name: 'Настройки интерфейса' }).click()
          const settings = f.page.getByRole('dialog', { name: 'Настройки интерфейса' })
          await settings.getByRole('button', { name: 'Выбрать тему…' }).focus()
          await f.page.keyboard.press('Tab')
          const focus = await f.page.evaluate(() => {
            const node = document.activeElement as HTMLElement,
              style = getComputedStyle(node)
            return {
              label: node.textContent,
              visible: node.matches(':focus-visible'),
              style: style.outlineStyle,
              width: style.outlineWidth,
              color: style.outlineColor,
              inside: !!node.closest('.frade-presentation-settings'),
            }
          })
          expect(focus.inside).toBe(true)
          expect(focus.visible).toBe(true)
          expect(focus.style).not.toBe('none')
          expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(2)
          observations.push({ label: 'settings-keyboard-focus', focus })
          await capture(f.page, 'settings')
          await settings.getByRole('button', { name: 'Выбрать тему…' }).click()
          await capture(f.page, 'picker')
          await f.page.keyboard.press('Escape')
          await expect(f.page.getByRole('dialog', { name: 'Выбор темы' })).toHaveCount(0)
          await settings.getByRole('button', { name: 'Закрыть', exact: true }).click()
          await expect(description).toHaveValue('P01 matrix retained dirty draft')
          await expect(f.page.locator('.dirty-dot')).toHaveCount(1)
          expect(await readFile(f.file, 'utf8')).toBe(before)
          expect(violations).toEqual([])
        } finally {
          await writeFile(
            info.outputPath('matrix-observations.json'),
            JSON.stringify(
              { mode, density, kind, observations, violations, visualApproval: 'NOT_APPROVED' },
              null,
              2,
            ),
          )
          await finishDiagramFixture(f.app)
        }
      })
    }

for (const kind of ['native', 'frame'] as const) {
  test(
    'P01-responsive-media ' +
      kind +
      ' actual viewports zoom forced coarse reduced across six theme/density states',
    // eslint-disable-next-line no-empty-pattern
    async ({}, info) => {
      test.setTimeout(240000)
      const f = await diagramFixture(kind),
        observations: unknown[] = [],
        violations: unknown[] = []
      const before = await readFile(f.file, 'utf8')
      const capture = async (label: string, coarse = false) => {
        await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
        const bodies = [
          { scope: 'root' as const, body: f.page.locator('body') },
          ...(kind === 'frame'
            ? [{ scope: 'frame' as const, body: f.page.frameLocator('iframe').locator('body') }]
            : []),
        ]
        for (const { scope, body } of bodies) {
          await body.evaluate(async () => {
            await document.fonts.ready
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            )
          })
          const consumers = await readUiConsumers(body, scope),
            environment = await body.evaluate(() => ({
              fonts: document.fonts.status,
              dpr: devicePixelRatio,
              viewport: { width: innerWidth, height: innerHeight },
              forced: matchMedia('(forced-colors: active)').matches,
              coarse: matchMedia('(pointer: coarse)').matches,
              reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
            }))
          if (coarse && (!environment.coarse || !environment.forced || !environment.reduced))
            violations.push({ label, scope, rule: 'ACTUAL_MEDIA', environment })
          for (const consumer of consumers) {
            if (
              consumer.text &&
              consumer.background &&
              uiContrast(consumer.color, consumer.background) < 4.5
            )
              violations.push({
                label,
                scope,
                rule: 'A11Y-001',
                consumer,
                ratio: uiContrast(consumer.color, consumer.background),
              })
            if (
              consumer.control &&
              !consumer.exception &&
              (consumer.target.width < (coarse ? 44 : 24) ||
                consumer.target.height < (coarse ? 44 : 24))
            )
              violations.push({ label, scope, rule: 'A11Y-004', consumer })
          }
          observations.push({ label, scope, environment, consumers })
        }
        observations.push({
          label,
          zoomFactor: await f.app.evaluate(({ BrowserWindow }) =>
            BrowserWindow.getAllWindows()[0].webContents.getZoomFactor(),
          ),
        })
        await f.page.screenshot({ path: info.outputPath(label + '.png') })
      }
      try {
        for (const mode of ['light', 'dark', 'high-contrast'] as const)
          for (const density of ['compact', 'comfortable'] as const) {
            await f.page.getByRole('button', { name: 'Меню Файл' }).click()
            await f.page.getByRole('menuitem', { name: 'Настройки интерфейса' }).click()
            const dialog = f.page.getByRole('dialog', { name: 'Настройки интерфейса' })
            const themeLabel = mode === 'light' ? /Light/ : mode === 'dark' ? /Dark/ : /HC/
            await dialog.getByRole('radio', { name: themeLabel }).click()
            await expect(dialog.getByRole('radio', { name: themeLabel })).toBeChecked()
            const densityLabel = density === 'compact' ? 'Компактная' : 'Комфортная'
            await dialog.getByRole('radio', { name: densityLabel, exact: true }).click()
            await expect(
              dialog.getByRole('radio', { name: densityLabel, exact: true }),
            ).toBeChecked()
            await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
            await dialog.getByRole('button', { name: 'Применить', exact: true }).click()
            await expect(dialog.getByRole('status')).toHaveText('Сохранено')
            await dialog.getByRole('button', { name: 'Закрыть', exact: true }).click()
            const label = mode + '-' + density
            for (const viewport of [
              { width: 1600, height: 900 },
              { width: 850, height: 650 },
            ]) {
              await f.page.setViewportSize(viewport)
              expect(
                await f.page.evaluate(() => ({ width: innerWidth, height: innerHeight })),
              ).toEqual(viewport)
              await capture(label + '-' + viewport.width + 'x' + viewport.height)
            }
            await f.page.setViewportSize({ width: 1280, height: 850 })
            await f.app.evaluate(({ BrowserWindow }) =>
              BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(2),
            )
            await capture(label + '-native-zoom200')
            await f.app.evaluate(({ BrowserWindow }) =>
              BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1),
            )
            await f.page.setViewportSize({ width: 1280, height: 850 })
            // Text-only stress: snapshot each computed UI font once before doubling.
            // Preserve all inline values and leave authored graph/SVG paint untouched.
            const textBodies = [
              f.page.locator('body'),
              ...(kind === 'frame' ? [f.page.frameLocator('iframe').locator('body')] : []),
            ]
            const textStats = []
            for (const body of textBodies)
              textStats.push(
                await body.evaluate((root) => {
                  const nodes = Array.from(
                    root.querySelectorAll<HTMLElement>(
                      'button,input,select,textarea,label,p,h1,h2,h3,span,a,strong,code,[role="treeitem"],[role="option"]',
                    ),
                  ).filter((node) => !node.closest('.x6-graph,svg,.geDiagramContainer'))
                  const values = nodes.map((node) => ({
                    node,
                    size: parseFloat(getComputedStyle(node).fontSize),
                    value: node.style.getPropertyValue('font-size'),
                    priority: node.style.getPropertyPriority('font-size'),
                  }))
                  ;(window as any).__p01TextZoomRestore = values
                  for (const item of values)
                    item.node.style.setProperty('font-size', item.size * 2 + 'px', 'important')
                  return {
                    count: values.length,
                    exact200Percent: values.every(
                      (item) => parseFloat(getComputedStyle(item.node).fontSize) === item.size * 2,
                    ),
                  }
                }),
              )
            expect(textStats.every((item) => item.count > 0 && item.exact200Percent)).toBe(true)
            await capture(label + '-text-only200')
            observations.push({
              label: label + '-text-only200',
              method:
                'Per-element computed font size doubled once in test-only owned inline styles; authored diagram excluded; viewport and Electron zoom remain unchanged.',
              textStats,
            })
            for (const body of textBodies)
              await body.evaluate(() => {
                const values = (window as any).__p01TextZoomRestore
                for (const item of values) {
                  if (item.value)
                    item.node.style.setProperty('font-size', item.value, item.priority)
                  else item.node.style.removeProperty('font-size')
                }
                delete (window as any).__p01TextZoomRestore
              })
            const profile = join(
                f.fixture.destination,
                'p01-' + kind + '-profile',
                'presentation-settings.json',
              ),
              durable = await readFile(profile, 'utf8')
            await f.page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
            const session = await f.page.context().newCDPSession(f.page)
            await session.send('Emulation.setTouchEmulationEnabled', {
              enabled: true,
              maxTouchPoints: 1,
            })
            const child =
              kind === 'frame'
                ? f.page.frames().find((frame) => frame.url().startsWith('frade://drawio'))
                : undefined
            const childSession = child ? await f.page.context().newCDPSession(child) : undefined
            if (childSession)
              await childSession.send('Emulation.setTouchEmulationEnabled', {
                enabled: true,
                maxTouchPoints: 1,
              })
            await expect
              .poll(() =>
                f.page.evaluate(() =>
                  getComputedStyle(document.documentElement)
                    .getPropertyValue('--frade-text-primary')
                    .trim(),
                ),
              )
              .toBe('CanvasText')
            await capture(label + '-forced-coarse-reduced', true)
            await session.send('Emulation.setTouchEmulationEnabled', { enabled: false })
            await session.detach()
            if (childSession) {
              await childSession.send('Emulation.setTouchEmulationEnabled', { enabled: false })
              await childSession.detach()
            }
            await f.page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' })
            await expect
              .poll(() =>
                f.page.evaluate(() =>
                  getComputedStyle(document.documentElement)
                    .getPropertyValue('--frade-text-primary')
                    .trim(),
                ),
              )
              .not.toBe('CanvasText')
            await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
            expect(await readFile(profile, 'utf8')).toBe(durable)
            expect(await readFile(f.file, 'utf8')).toBe(before)
          }
        expect(violations).toEqual([])
      } finally {
        await writeFile(
          info.outputPath('responsive-media-observations.json'),
          JSON.stringify(
            {
              kind,
              observations,
              violations,
              visualApproval: 'NOT_APPROVED',
              zoomMethod:
                'Actual Electron WebContents.setZoomFactor(2); page zoom, not a claimed browser text-only setting.',
            },
            null,
            2,
          ),
        )
        await finishDiagramFixture(f.app)
      }
    },
  )
}

// eslint-disable-next-line no-empty-pattern
test('P01 real staged filesystem obstruction refuses commit and restores before retry and restart', async ({}, info) => {
  test.setTimeout(120000)
  const f = await diagramFixture('native', { mode: 'light', density: 'compact' })
  const profile = join(f.fixture.destination, 'p01-native-profile'),
    settings = join(profile, 'presentation-settings.json'),
    staged = settings + '.staged'
  let originalClosed = false
  const diskBefore = await readFile(settings, 'utf8'),
    authoredBefore = await readFile(f.file, 'utf8')
  try {
    await mkdir(staged)
    await f.page.getByRole('button', { name: 'Меню Файл' }).click()
    await f.page.getByRole('menuitem', { name: 'Настройки интерфейса' }).click()
    const dialog = f.page.getByRole('dialog', { name: 'Настройки интерфейса' })
    await dialog.getByRole('radio', { name: /Dark/ }).click()
    await expect(f.page.locator('html')).toHaveAttribute('data-frade-theme', 'dark')
    await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
    await dialog.getByRole('button', { name: 'Применить', exact: true }).click()
    await expect(dialog.getByRole('status')).not.toHaveText('Сохранено')
    await expect(f.page.locator('html')).toHaveAttribute('data-frade-theme', 'light')
    await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
    await expect(dialog.getByRole('status')).toContainText(/staging|Staging|Unsafe|EEXIST/)
    expect(await readFile(settings, 'utf8')).toBe(diskBefore)
    expect(await readFile(f.file, 'utf8')).toBe(authoredBefore)
    expect(await readdir(staged)).toEqual([])
    await f.page.screenshot({ path: info.outputPath('real-staging-refusal.png') })
    await rmdir(staged)
    await dialog.getByRole('radio', { name: /Light/ }).click()
    await dialog.getByRole('radio', { name: 'Комфортная', exact: true }).click()
    await dialog.getByRole('button', { name: 'Применить', exact: true }).click()
    await expect(dialog.getByRole('status')).toHaveText('Сохранено')
    await dialog.getByRole('button', { name: 'Закрыть', exact: true }).click()
    const committed = await readFile(settings, 'utf8')
    expect(JSON.parse(committed).selection).toMatchObject({ mode: 'light', density: 'comfortable' })
    await finishDiagramFixture(f.app)
    originalClosed = true
    const restarted = await electron.launch({
      args: [resolve('out/main/index.cjs')],
      env: { ...process.env, FRADE_USER_DATA: profile },
    })
    try {
      const page = await restarted.firstWindow()
      await page.locator('.ka-workbench').waitFor({ state: 'attached' })
      await expect(page.locator('html')).toHaveAttribute('data-frade-theme', 'light')
      await expect(page.locator('html')).toHaveAttribute('data-frade-density', 'comfortable')
      await page.emulateMedia({ colorScheme: 'dark' })
      await expect(page.locator('html')).toHaveAttribute('data-frade-theme', 'light')
      expect(await readFile(settings, 'utf8')).toBe(committed)
      expect(await readFile(f.file, 'utf8')).toBe(authoredBefore)
      await page.screenshot({ path: info.outputPath('restart-light-comfortable-os-dark.png') })
    } finally {
      await finishDiagramFixture(restarted)
    }
  } finally {
    if (!originalClosed) await finishDiagramFixture(f.app)
  }
})

async function applyActualPresentation(
  page: Page,
  mode: 'light' | 'dark' | 'high-contrast',
  density: 'compact' | 'comfortable',
) {
  await expect(page.locator('.frade-theme-commit-barrier')).toBeHidden()
  await page.getByRole('button', { name: 'Меню Файл' }).focus()
  await page.keyboard.press('F1')
  await page
    .getByRole('dialog', { name: 'Команды' })
    .getByRole('button', { name: 'Настройки интерфейса', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Настройки интерфейса' })
  await dialog
    .getByRole('radio', { name: mode === 'light' ? /Light/ : mode === 'dark' ? /Dark/ : /HC/ })
    .click()
  await dialog
    .getByRole('radio', { name: density === 'compact' ? 'Компактная' : 'Комфортная', exact: true })
    .click()
  await expect(page.locator('.frade-theme-commit-barrier')).toBeHidden()
  await dialog.getByRole('button', { name: 'Применить', exact: true }).click()
  await expect(dialog.getByRole('status')).toHaveText('Сохранено')
  await dialog.getByRole('button', { name: 'Закрыть', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('data-frade-theme', mode)
  await expect(page.locator('html')).toHaveAttribute('data-frade-density', density)
}
async function installActualRequestGate(app: ElectronApplication) {
  await app.evaluate(({ ipcMain }) => {
    const handlers = (ipcMain as any)._invokeHandlers
    if (!(handlers instanceof Map)) throw Error('Actual IPC handler map unavailable')
    const control = ((globalThis as any).__p01IpcGate = {
      operation: '',
      mode: 'normal',
      pending: 0,
      requests: [] as unknown[],
      originalCallsForHeld: 0,
      release: undefined as (() => void) | undefined,
    })
    for (const channel of ['frade:workbench', 'frade:workbench-request']) {
      const original = handlers.get(channel)
      if (typeof original !== 'function') throw Error('Actual IPC handler missing ' + channel)
      handlers.set(channel, async (event: any, value: any) => {
        const operation = value?.operation ?? value?.request?.operation
        let waited = false
        if (
          operation === control.operation &&
          control.mode === 'hold' &&
          (operation !== 'diagram' ||
            (value?.payload ?? value?.request?.payload)?.action === 'write')
        ) {
          waited = true
          control.pending++
          control.requests.push({ channel, value: JSON.parse(JSON.stringify(value)) })
          await new Promise<void>((resolve) => {
            control.release = resolve
          })
        }
        if (operation === control.operation && control.mode === 'error')
          return {
            ok: false,
            error: {
              code: 'REPOSITORY_UNAVAILABLE',
              message: 'Controlled test-only transport refusal',
              retriable: true,
              issues: [],
            },
          }
        if (waited) control.originalCallsForHeld++
        return original(event, value)
      })
    }
  })
}
async function gateActualRequest(
  app: ElectronApplication,
  operation: string,
  mode: 'normal' | 'hold' | 'error',
) {
  await app.evaluate(
    (_electron, value) => {
      const control = (globalThis as any).__p01IpcGate
      control.operation = value.operation
      control.mode = value.mode
      control.pending = 0
      control.requests = []
      if (value.mode === 'hold') control.originalCallsForHeld = 0
      if (value.mode === 'normal' && control.release) {
        const release = control.release
        control.release = undefined
        release()
      }
    },
    { operation, mode },
  )
}
async function captureB02Matrix(
  page: Page,
  info: any,
  label: string,
  focusSelector: string,
  observations: unknown[],
  violations: unknown[],
  fixed?: { mode: 'light' | 'dark' | 'high-contrast'; density: 'compact' | 'comfortable' },
) {
  const originalViewport =
    page.viewportSize() ?? (await page.evaluate(() => ({ width: innerWidth, height: innerHeight })))
  for (const mode of fixed ? [fixed.mode] : (['light', 'dark', 'high-contrast'] as const))
    for (const density of fixed ? [fixed.density] : (['compact', 'comfortable'] as const)) {
      if (!fixed) await applyActualPresentation(page, mode, density)
      for (const forced of [false, true]) {
        for (const viewport of [
          { width: 1280, height: 850 },
          { width: 1600, height: 900 },
          { width: 850, height: 650 },
        ]) {
          await page.setViewportSize(viewport)
          await page.emulateMedia({ forcedColors: forced ? 'active' : 'none' })
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  document.documentElement.style.getPropertyValue('--frade-text-primary') ===
                  'CanvasText',
              ),
            )
            .toBe(forced)
          await expect(page.locator('.frade-theme-commit-barrier')).toBeHidden()
          await page.evaluate(async () => {
            await document.fonts.ready
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            )
          })
          if (label.startsWith('flow-hover-focus')) {
            const row = page.getByRole('row', { name: 'Поток: Payload F1', exact: true })
            await row.hover()
            expect(await row.evaluate((node) => node.matches(':hover'))).toBe(true)
          }
          const state = await page.locator('body').evaluate((root) => {
            const targets = Array.from(
              root.querySelectorAll<HTMLElement>(
                '.metadata-preview,.metadata-preview p,.field-error,.flow-manager,.flow-manager p,.flow-manager th,.flow-manager td,.flow-manager td small,.flow-manager button,.flow-manager input,.flow-manager label,.flow-warning,.flow-warning span,.bundle-hint,.bundle-reconnect,.bundle-reconnect p,.bundle-reconnect button',
              ),
            )
            return targets
              .filter(
                (node) =>
                  node.getBoundingClientRect().width > 0 &&
                  node.getBoundingClientRect().height > 0 &&
                  getComputedStyle(node).visibility !== 'hidden',
              )
              .map((node) => {
                let background = ''
                for (
                  let ancestor: HTMLElement | null = node;
                  ancestor;
                  ancestor = ancestor.parentElement
                ) {
                  const color = getComputedStyle(ancestor).backgroundColor
                  if (color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') {
                    background = color
                    break
                  }
                }
                const style = getComputedStyle(node)
                const parse = (value: string) => {
                  const values = value.match(/[0-9.]+/g)?.map(Number)
                  return values && values.length >= 3
                    ? [values[0], values[1], values[2], values[3] ?? 1]
                    : [0, 0, 0, 0]
                }
                const mix = (front: number[], back: number[], alpha: number) =>
                  front.slice(0, 3).map((v, i) => v * alpha + back[i] * (1 - alpha))
                const ancestry: HTMLElement[] = []
                for (let n: HTMLElement | null = node; n; n = n.parentElement) ancestry.unshift(n)
                let paint = [255, 255, 255]
                const behind: number[][] = []
                for (const n of ancestry) {
                  behind.push([...paint])
                  const color = parse(getComputedStyle(n).backgroundColor)
                  paint = mix(color, paint, color[3])
                }
                let effectiveBackground = [...paint],
                  effectiveForeground = mix(parse(style.color), paint, parse(style.color)[3])
                for (let i = ancestry.length - 1; i >= 0; i--) {
                  const opacity = Number(getComputedStyle(ancestry[i]).opacity)
                  effectiveForeground = mix(effectiveForeground, behind[i], opacity)
                  effectiveBackground = mix(effectiveBackground, behind[i], opacity)
                }
                const rgb = (values: number[]) => 'rgb(' + values.join(', ') + ')'
                return {
                  effectiveForeground: rgb(effectiveForeground),
                  effectiveBackground: rgb(effectiveBackground),
                  class: node.className,
                  tag: node.tagName,
                  label: node.textContent?.trim().slice(0, 150),
                  color: style.color,
                  background,
                  opacity: style.opacity,
                  disabled: node.matches(':disabled'),
                  rect: node.getBoundingClientRect().toJSON(),
                }
              })
          })
          for (const consumer of state)
            if (
              !consumer.disabled &&
              consumer.background &&
              uiContrast(consumer.effectiveForeground, consumer.effectiveBackground) < 4.5
            )
              violations.push({
                label,
                mode,
                density,
                forced,
                consumer,
                rule: 'A11Y-001',
                ratio: uiContrast(consumer.effectiveForeground, consumer.effectiveBackground),
              })
          const focus = page.locator(focusSelector).filter({ visible: true }).first()
          if (await focus.count()) {
            await page.keyboard.press('Tab')
            await focus.focus()
            const actual = await focus.evaluate((node) => ({
              focused: document.activeElement === node,
              visible: node.matches(':focus-visible'),
              width: parseFloat(getComputedStyle(node).outlineWidth),
              color: getComputedStyle(node).outlineColor,
            }))
            if (!actual.focused || !actual.visible || actual.width < 2)
              violations.push({ label, mode, density, forced, rule: 'A11Y-003', actual })
            observations.push({ label, mode, density, forced, viewport, state, focus: actual })
          } else
            violations.push({
              label,
              mode,
              density,
              forced,
              rule: 'FOCUS_TARGET_UNAVAILABLE',
              focusSelector,
            })
          await page.screenshot({
            path: info.outputPath(
              label +
                '-' +
                mode +
                '-' +
                density +
                (forced ? '-forced' : '') +
                '-' +
                viewport.width +
                'x' +
                viewport.height +
                '.png',
            ),
          })
        }
      }
    }
  await page.setViewportSize(originalViewport)
  await page.emulateMedia({ forcedColors: 'none' })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.style.getPropertyValue('--frade-text-primary') === 'CanvasText',
      ),
    )
    .toBe(false)
  await expect(page.locator('.frade-theme-commit-barrier')).toBeHidden()
}
// eslint-disable-next-line no-empty-pattern
test('P01-B02 actual repository metadata pending error success across six themes and forced colors', async ({}, info) => {
  test.setTimeout(240000)
  for (const mode of ['light', 'dark', 'high-contrast'] as const)
    for (const density of ['compact', 'comfortable'] as const) {
      const f = await diagramFixture('native', { mode, density }),
        observations: unknown[] = [],
        violations: unknown[] = []
      const authoredBefore = await readFile(f.file, 'utf8'),
        fixed = { mode, density }
      try {
        await installActualRequestGate(f.app)
        await f.page.getByRole('button', { name: 'Настройки выбранного корня' }).click()
        const dialog = f.page.getByRole('dialog', { name: 'Метаописание репозитория' })
        await expect(dialog).toBeVisible()
        const folder = await dialog.getByLabel('Папка метаописания').inputValue()
        await gateActualRequest(f.app, 'stageMetadata', 'hold')
        await dialog.getByRole('button', { name: 'Проверить набор', exact: true }).click()
        await expect
          .poll(() => f.app.evaluate(() => (globalThis as any).__p01IpcGate.pending))
          .toBe(1)
        observations.push({
          state: 'metadata-pending',
          actualLoadingIndicator: 'NONE_IN_EXISTING_UI',
          actualBackendRequest: 'held then resumed original handler; no invented preview',
        })
        await captureB02Matrix(
          f.page,
          info,
          'metadata-pending',
          '.wb-dialog .dialog-actions button',
          observations,
          violations,
          fixed,
        )
        await gateActualRequest(f.app, 'stageMetadata', 'normal')
        await expect(dialog.locator('.metadata-preview')).toContainText('Совместимый набор')
        await captureB02Matrix(
          f.page,
          info,
          'metadata-success',
          '.wb-dialog .dialog-actions button',
          observations,
          violations,
          fixed,
        )
        await dialog
          .getByLabel('Папка метаописания')
          .fill(join(f.fixture.destination, 'missing-metadata-folder'))
        await dialog.getByRole('button', { name: 'Проверить набор', exact: true }).click()
        await expect(dialog.locator('.field-error')).toBeVisible()
        await captureB02Matrix(
          f.page,
          info,
          'metadata-error',
          '.wb-dialog .dialog-actions button',
          observations,
          violations,
          fixed,
        )
        await dialog.getByLabel('Папка метаописания').fill(folder)
        await dialog.getByRole('button', { name: 'Отмена', exact: true }).click()
        expect(await readFile(f.file, 'utf8')).toBe(authoredBefore)
        expect(violations).toEqual([])
      } finally {
        await writeFile(
          info.outputPath('b02-metadata-observations-' + mode + '-' + density + '.json'),
          JSON.stringify(
            { mode, density, observations, violations, visualApproval: 'NOT_APPROVED' },
            null,
            2,
          ),
        )
        await finishDiagramFixture(f.app)
      }
    }
})

for (const format of ['frade', 'drawio'] as const) {
  test(
    'P01-B02 actual flow manager states ' + format + ' across six themes and forced colors',
    // eslint-disable-next-line no-empty-pattern
    async ({}, info) => {
      test.setTimeout(360000)
      const fixture = await createFlowFixture(),
        profile = join(fixture.destination, 'p01-profile')
      let app = await electron.launch({
        args: [resolve('out/main/index.cjs')],
        env: { ...process.env, FRADE_USER_DATA: profile },
      })
      const observations: unknown[] = [],
        violations: unknown[] = []
      let activePage: Page | undefined
      const file = join(fixture.dataRoot, '_diagrams/Flows.' + format),
        diskBefore = await readFile(file, 'utf8'),
        repoBefore = await readFile(join(fixture.dataRoot, 'flows.yaml'), 'utf8')
      try {
        const page = await app.firstWindow()
        activePage = page
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
            if (data?.action !== 'configure' || !Editor || Editor.prototype.init.__p01FlowCapture)
              return
            const original = Editor.prototype.init
            const capture = function (this: any, ...args: unknown[]) {
              const result = original.apply(this, args)
              ;(window as any).__p01FlowUi = this
              return result
            }
            capture.__p01FlowCapture = true
            Editor.prototype.init = capture
          })
        })
        page.on('pageerror', (error) =>
          observations.push({
            state: 'actual-pageerror',
            message: error.message,
            stack: error.stack,
          }),
        )
        await page.setViewportSize({ width: 1600, height: 900 })
        await expect(page.getByRole('status')).toHaveText('Backend: ready')
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
        await expect(page.locator('.status-message')).toContainText('9 объектов', {
          timeout: 30000,
        })
        await page
          .getByRole('treeitem')
          .filter({ hasText: /^_diagrams$/ })
          .click()
        await page
          .getByRole('treeitem')
          .filter({ hasText: new RegExp('^Flows[.]' + format + '$') })
          .dblclick()
        const canvas = () =>
          format === 'frade'
            ? page.locator('.diagram-slot .x6-graph')
            : page.locator('.diagram-slot iframe').contentFrame().locator('.geDiagramContainer')
        const node = (id: string) => canvas().getByText(id, { exact: true })
        await expect(node('A')).toBeVisible({ timeout: 20000 })
        const a = await node('A').boundingBox(),
          b = await node('B').boundingBox()
        if (!a || !b) throw Error('Actual system nodes unavailable')
        await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
        await page.mouse.move(
          a.x + a.width / 2 + (format === 'frade' ? 82 : 90),
          a.y + a.height / 2,
          { steps: 5 },
        )
        await page.mouse.down()
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 })
        await page.mouse.up()
        await expect(page.locator('.bundle-hint')).toContainText(/Найдено 3 потоков между A и B/)
        await captureB02Matrix(
          page,
          info,
          'bundle-hint-' + format,
          '.bundle-hint button',
          observations,
          violations,
        )
        await installActualRequestGate(app)
        await gateActualRequest(app, 'integrationFlows', 'hold')
        await page.getByRole('button', { name: 'Выбрать потоки', exact: true }).click()
        const manager = page.getByRole('complementary', { name: 'Интеграционные потоки' })
        await expect(manager.getByText('Загрузка потоков…', { exact: true })).toBeVisible()
        await captureB02Matrix(
          page,
          info,
          'flow-loading-' + format,
          '.flow-manager input[aria-label="Поиск потоков"]',
          observations,
          violations,
        )
        await gateActualRequest(app, 'integrationFlows', 'normal')
        await expect(manager.getByRole('checkbox', { name: 'В жгуте: Payload F1' })).toBeVisible()
        await captureB02Matrix(
          page,
          info,
          'flow-populated-' + format,
          '.flow-manager tr[tabindex]',
          observations,
          violations,
        )
        await manager.getByRole('checkbox', { name: 'В жгуте: Payload F1' }).check()
        await expect(manager.getByRole('checkbox', { name: 'В жгуте: Payload F1' })).toBeChecked()
        const dirty = await page.locator('.dirty-dot').count()
        expect(dirty).toBe(1)
        await captureB02Matrix(
          page,
          info,
          'flow-dirty-' + format,
          '.flow-manager tr[tabindex]',
          observations,
          violations,
        )
        expect(await page.locator('.dirty-dot').count()).toBe(dirty)
        await manager.getByLabel('Поиск потоков', { exact: true }).fill('p01 no matching flow')
        await expect(
          manager.getByText('По заданным условиям потоки не найдены.', { exact: true }),
        ).toBeVisible()
        await captureB02Matrix(
          page,
          info,
          'flow-empty-' + format,
          '.flow-manager input[aria-label="Поиск потоков"]',
          observations,
          violations,
        )
        await gateActualRequest(app, 'integrationFlows', 'error')
        await manager.getByLabel('Поиск потоков', { exact: true }).fill('')
        await expect(manager.getByRole('alert')).toContainText('REPOSITORY_UNAVAILABLE')
        observations.push({
          state: 'flow-error',
          fixture:
            'Declared test-only IPC transport refusal; normal path calls original backend with actual data.',
        })
        await captureB02Matrix(
          page,
          info,
          'flow-error-' + format,
          '.flow-manager button',
          observations,
          violations,
        )
        await gateActualRequest(app, 'integrationFlows', 'normal')
        await manager.getByRole('button', { name: 'Повторить запрос', exact: true }).click()
        await expect(manager.getByRole('checkbox', { name: 'В жгуте: Payload F1' })).toBeChecked()
        await manager.getByRole('row', { name: 'Поток: Payload F1', exact: true }).hover()
        await captureB02Matrix(
          page,
          info,
          'flow-hover-focus-' + format,
          '.flow-manager tr[tabindex]',
          observations,
          violations,
        )
        await manager.getByRole('button', { name: '+ Новый поток', exact: true }).click()
        await manager.getByLabel('ID потока', { exact: true }).fill('F99')
        await manager.getByLabel('description', { exact: true }).fill('Unsaved P01 flow draft')
        await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
        await expect(manager.locator('.flow-warning')).toContainText(
          'Есть несохранённые изменения формы.',
        )
        await captureB02Matrix(
          page,
          info,
          'flow-unsaved-warning-' + format,
          '.flow-warning button',
          observations,
          violations,
        )
        await manager
          .getByRole('button', { name: 'Продолжить редактирование', exact: true })
          .click()
        expect(await manager.getByLabel('description', { exact: true }).inputValue()).toBe(
          'Unsaved P01 flow draft',
        )
        expect(await readFile(file, 'utf8')).toBe(diskBefore)
        expect(await readFile(join(fixture.dataRoot, 'flows.yaml'), 'utf8')).toBe(repoBefore)
        // Finish the real unsaved form guard before inspecting existing native overlays.
        await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
        await manager
          .getByRole('button', { name: 'Продолжить без сохранения', exact: true })
          .click()
        await expect(manager).toBeHidden()
        await canvas().evaluate(async () => {
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            ),
          )
        })
        if (format === 'drawio') {
          await node('B').scrollIntoViewIfNeeded()
          await node('C').scrollIntoViewIfNeeded()
          await expect(node('B')).toBeInViewport()
          await expect(node('C')).toBeInViewport()
        }
        await expect(canvas().locator('path[stroke="#404040" i]')).toHaveCount(1)
        const line = canvas().locator('path[stroke="#404040" i]').first()
        const point = async (fraction: number) => {
          const local = await line.evaluate((node, fraction) => {
            const path = node as SVGPathElement,
              p = path.getPointAtLength(path.getTotalLength() * fraction),
              q = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!)
            return { x: q.x, y: q.y }
          }, fraction)
          const box =
            format === 'drawio'
              ? await page.locator('.diagram-slot iframe').boundingBox()
              : undefined
          return { x: local.x + (box?.x ?? 0), y: local.y + (box?.y ?? 0) }
        }
        const openActual = async () => {
          if (format === 'drawio') {
            await expect(page.locator('.diagram-slot iframe')).toHaveAttribute(
              'data-frade-revision',
              (await page.locator('html').getAttribute('data-frade-revision')) as string,
            )
            await expect(page.locator('.frade-theme-commit-barrier')).toBeHidden()
            await expect(
              page
                .locator('.diagram-slot .editor-actions')
                .getByRole('button', { name: 'Сохранить', exact: true }),
            ).toBeEnabled()
            await canvas().evaluate(async () => {
              await document.fonts.ready
              await new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
              )
            })
            await line.evaluate((node) =>
              node.scrollIntoView({ block: 'nearest', inline: 'nearest' }),
            )
            await canvas().evaluate(async () => {
              await new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
              )
            })
          }
          const p = await point(0.5)
          const surface = await canvas().boundingBox()
          if (!surface) throw Error('Actual bundle inspection surface unavailable')
          expect(p.x).toBeGreaterThanOrEqual(surface.x)
          expect(p.x).toBeLessThanOrEqual(surface.x + surface.width)
          expect(p.y).toBeGreaterThanOrEqual(surface.y)
          expect(p.y).toBeLessThanOrEqual(surface.y + surface.height)
          await page.mouse.dblclick(p.x, p.y)
          await expect(manager).toBeVisible()
        }
        if (format === 'frade') {
          const p = await point(0.5)
          await page.mouse.click(p.x, p.y, { button: 'right' })
          await expect(page.locator('.bundle-reconnect[role="menu"]')).toBeVisible()
          await captureB02Matrix(
            page,
            info,
            'bundle-context-menu-' + format,
            '.bundle-reconnect button',
            observations,
            violations,
          )
          await page.getByRole('button', { name: 'Закрыть меню', exact: true }).click()
        }
        const p = await point(0.5)
        await page.mouse.click(p.x, p.y)
        await page.waitForTimeout(100)
        const frameSemantic = async () =>
          canvas().evaluate(() => {
            const globals = window as any,
              ui = globals.__p01FlowUi,
              graph = ui.editor.graph
            return {
              modelXml: globals.mxUtils.getXml(new globals.mxCodec().encode(graph.getModel())),
              selection: graph.getSelectionCells().map((cell: any) => cell.id),
              undo: ui.editor.undoManager.history.length,
              cursor: ui.editor.undoManager.indexOfNextAdd,
            }
          })
        const beforeSemantic = format === 'drawio' ? await frameSemantic() : undefined
        const beforePath = await line.getAttribute('d'),
          end = await point(1),
          c = await node('C').boundingBox()
        if (!c) throw Error('Actual C target missing')
        await page.mouse.move(end.x, end.y)
        await page.mouse.down()
        await page.mouse.move(
          c.x + c.width / 2 + (format === 'drawio' ? 65 : 0),
          c.y + c.height / 2,
          { steps: 25 },
        )
        await page.mouse.up()
        const warning = page.getByRole('alertdialog', { name: 'Изменение конца жгута' })
        await expect(warning).toBeVisible()
        await captureB02Matrix(
          page,
          info,
          'bundle-reconnect-warning-' + format,
          '.bundle-reconnect button',
          observations,
          violations,
        )
        await warning.getByRole('button', { name: 'Отмена', exact: true }).click()
        await expect(warning).toBeHidden()
        if (format === 'drawio') {
          expect(await frameSemantic()).toEqual(beforeSemantic)
          observations.push({
            state: 'frame-reconnect-cancel-domain-preserved',
            beforeSemantic,
            projectedBefore: beforePath,
            projectedAfter: await line.getAttribute('d'),
            note: 'Viewport/scroll projection may move; exact model/selection/undo cannot.',
          })
        } else await expect(line).toHaveAttribute('d', beforePath!)
        await openActual()
        await expect(manager.getByRole('checkbox', { name: 'В жгуте: Payload F1' })).toBeChecked()
        await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
        await page
          .locator('.diagram-slot .editor-actions')
          .getByRole('button', { name: 'Сохранить', exact: true })
          .click()
        await expect(page.locator('.diagram-slot .editor-actions')).toContainText(
          'Все изменения сохранены',
        )
        await page.getByRole('button', { name: 'Закрыть Flows.' + format, exact: true }).click()
        // Explicit temporary data fixture: broken and no-longer-eligible references.
        const saved = await readFile(file, 'utf8')
        let modified = saved
        if (format === 'frade') {
          const document = JSON.parse(saved),
            refs = document.graph.edges[0].bundle.integrationFlowRefs
          refs.push({ repositoryId: refs[0].repositoryId, objectId: 'Missing' })
          modified = JSON.stringify(document)
        } else
          modified = saved.replace(/fradeIntegrationFlowRefs="([^"\n]*)"/, (_all, encoded) => {
            const refs = JSON.parse(encoded.replaceAll('&quot;', '"').replaceAll('&amp;', '&'))
            refs.push({ repositoryId: refs[0].repositoryId, objectId: 'Missing' })
            return (
              'fradeIntegrationFlowRefs="' +
              JSON.stringify(refs).replaceAll('&', '&amp;').replaceAll('"', '&quot;') +
              '"'
            )
          })
        expect(modified).not.toBe(saved)
        await writeFile(file, modified)
        const flows = await fixture.readFlows()
        flows.F1.producer = 'C'
        const modifiedRepo = JSON.stringify({ 'custom.flows': flows }, null, 2)
        await writeFile(join(fixture.dataRoot, 'flows.yaml'), modifiedRepo)
        await page
          .getByRole('textbox', { name: 'Поиск объектов', exact: true })
          .fill('Flows.' + format)
        await page
          .getByRole('treeitem')
          .filter({ hasText: new RegExp('^Flows[.]' + format + '$') })
          .dblclick()
        await expect(node('A')).toBeVisible({ timeout: 20000 })
        await openActual()
        await expect(manager.getByText('Недоступный поток: Missing', { exact: true })).toBeVisible()
        await expect(
          manager.getByText('Поток больше не связывает системы жгута: F1', { exact: true }),
        ).toBeVisible()
        await captureB02Matrix(
          page,
          info,
          'flow-invalid-members-warning-' + format,
          '.flow-warning button',
          observations,
          violations,
        )
        expect(await readFile(file, 'utf8')).toBe(modified)
        expect(await readFile(join(fixture.dataRoot, 'flows.yaml'), 'utf8')).toBe(modifiedRepo)
        observations.push({
          temporaryFixture: true,
          file,
          kind: 'actual saved bundle references and actual repository endpoints',
          savedBytes: saved,
          modifiedBytes: modified,
          originalRepository: repoBefore,
          modifiedRepository: modifiedRepo,
        })
        if (format === 'drawio') {
          await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
          await page.getByRole('button', { name: 'Закрыть Flows.' + format, exact: true }).click()
          const invalid = modified.replace(
            /fradeIntegrationFlowRefs="[^"]*"/,
            'fradeIntegrationFlowRefs="not-json"',
          )
          expect(invalid).not.toBe(modified)
          await writeFile(file, invalid)
          await page
            .getByRole('treeitem')
            .filter({ hasText: /^Flows[.]drawio$/ })
            .dblclick()
          await expect(node('A')).toBeVisible({ timeout: 20000 })
          await openActual()
          await expect(manager.getByRole('alert')).toContainText('Состав жгута повреждён')
          await expect(
            manager.getByRole('checkbox', {
              name: 'Включить все подходящие потоки из текущей выборки',
            }),
          ).toBeDisabled()
          await captureB02Matrix(
            page,
            info,
            'flow-corrupt-members-warning-' + format,
            '.flow-warning button',
            observations,
            violations,
          )
          expect(await readFile(file, 'utf8')).toBe(invalid)
          await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
          await page.getByRole('button', { name: 'Закрыть Flows.' + format, exact: true }).click()
          await writeFile(file, modified)
        }
        // P01-RT-READONLY-001: real already-open manager, actual diagram write/DTO.
        if (format === 'drawio') {
          await page
            .getByRole('treeitem')
            .filter({ hasText: /^Flows[.]drawio$/ })
            .dblclick()
          await expect(node('A')).toBeVisible({ timeout: 20000 })
          await openActual()
        }
        await expect(manager).toBeVisible()
        const addedMember = manager.getByRole('checkbox', {
          name: 'В жгуте: Payload F2',
          exact: true,
        })
        await addedMember.check()
        await expect(addedMember).toBeChecked()
        const readonlyDiskBefore = await readFile(file, 'utf8')
        const readonlyRepoBefore = await readFile(join(fixture.dataRoot, 'flows.yaml'), 'utf8')
        const readonlyFrameBeforeSave = format === 'drawio' ? await frameSemantic() : undefined
        await page.locator('.diagram-slot iframe,.diagram-slot .x6-graph').evaluate((node) => {
          ;(window as any).__p01ReadonlyCanvas = node
        })
        await manager.evaluate((node) => {
          ;(window as any).__p01ReadonlyManager = node
        })
        await gateActualRequest(app, 'diagram', 'hold')
        await page
          .locator('.diagram-slot .editor-actions')
          .getByRole('button', { name: 'Сохранить', exact: true })
          .click()
        await expect
          .poll(() => app.evaluate(() => (globalThis as any).__p01IpcGate.pending))
          .toBe(1)
        const held = await app.evaluate(() => (globalThis as any).__p01IpcGate.requests[0])
        const actualRequest = held.value.request ?? held.value
        expect(actualRequest.operation).toBe('diagram')
        expect(actualRequest.payload.action).toBe('write')
        expect(actualRequest.payload.path).toBe('_diagrams/Flows.' + format)
        expect(typeof actualRequest.payload.xml).toBe('string')
        await expect(addedMember).toBeChecked()
        await expect(addedMember).toBeDisabled()
        // Capture after the actual Save/readOnly transition; theme changes must preserve this state.
        const readonlyFrameBefore = format === 'drawio' ? await frameSemantic() : undefined
        if (format === 'drawio') {
          expect(readonlyFrameBefore?.modelXml).toBe(readonlyFrameBeforeSave?.modelXml)
          expect(readonlyFrameBefore?.undo).toBe(readonlyFrameBeforeSave?.undo)
          expect(readonlyFrameBefore?.cursor).toBe(readonlyFrameBeforeSave?.cursor)
          observations.push({
            state: 'actual-Save-readonly-transition',
            before: readonlyFrameBeforeSave,
            after: readonlyFrameBefore,
            note: 'The existing editor can clear selection when Save enters readOnly. Full semantic equality remains required across the following theme transactions.',
          })
        }
        await expect(
          manager.getByRole('button', { name: '+ Новый поток', exact: true }),
        ).toBeEnabled()
        await captureB02Matrix(
          page,
          info,
          'flow-read-only-pending-' + format,
          '.flow-manager input[aria-label="Поиск потоков"]',
          observations,
          violations,
        )
        await expect(manager).toBeVisible()
        await expect(addedMember).toBeChecked()
        await expect(addedMember).toBeDisabled()
        expect(await readFile(file, 'utf8')).toBe(readonlyDiskBefore)
        expect(await readFile(join(fixture.dataRoot, 'flows.yaml'), 'utf8')).toBe(
          readonlyRepoBefore,
        )
        expect(await app.evaluate(() => (globalThis as any).__p01IpcGate.requests[0])).toEqual(held)
        await manager.getByRole('button', { name: '+ Новый поток', exact: true }).click()
        await manager.getByLabel('ID потока', { exact: true }).fill('F99')
        await manager
          .getByLabel('description', { exact: true })
          .fill('Actual readonly diagram retains repository form draft')
        const readonlyDraft = await manager.getByLabel('description', { exact: true }).inputValue()
        await captureB02Matrix(
          page,
          info,
          'flow-read-only-draft-' + format,
          '.flow-manager input',
          observations,
          violations,
        )
        expect(await manager.getByLabel('ID потока', { exact: true }).inputValue()).toBe('F99')
        expect(await manager.getByLabel('description', { exact: true }).inputValue()).toBe(
          readonlyDraft,
        )
        expect(await readFile(file, 'utf8')).toBe(readonlyDiskBefore)
        expect(await readFile(join(fixture.dataRoot, 'flows.yaml'), 'utf8')).toBe(
          readonlyRepoBefore,
        )
        if (format === 'drawio') expect(await frameSemantic()).toEqual(readonlyFrameBefore)
        expect(
          await page
            .locator('.diagram-slot iframe,.diagram-slot .x6-graph')
            .evaluate((node) => node === (window as any).__p01ReadonlyCanvas),
        ).toBe(true)
        expect(
          await manager.evaluate((node) => node === (window as any).__p01ReadonlyManager),
        ).toBe(true)
        await expect(
          page
            .locator('.diagram-slot .editor-actions')
            .getByRole('button', { name: 'Сохранить', exact: true }),
        ).toBeDisabled()
        observations.push({
          state: 'actual-diagram-readonly-pending-or-unknown',
          heldOriginalRequest: held,
          membership: 'F2 checked and disabled; repository New Flow remains enabled',
          readonlyDraft,
          readonlyDiskBefore,
          readonlyRepoBefore,
          frameSemantic: readonlyFrameBefore,
          originalHandlerStatus: 'HELD_NOT_CALLED',
          note: 'Disk/model unchanged during theme transactions; one original Save write is allowed only after gate release.',
        })
        expect(
          await app.evaluate(() => (globalThis as any).__p01IpcGate.originalCallsForHeld),
        ).toBe(0)
        await gateActualRequest(app, 'diagram', 'normal')
        await expect
          .poll(() => readFile(file, 'utf8'), { timeout: 20000 })
          .toBe(actualRequest.payload.xml)
        expect(
          await app.evaluate(() => (globalThis as any).__p01IpcGate.originalCallsForHeld),
        ).toBe(1)
        observations.push({
          state: 'original-held-save-completed-once',
          originalCalls: 1,
          actualSavedXml: actualRequest.payload.xml,
        })
        expect(await readFile(join(fixture.dataRoot, 'flows.yaml'), 'utf8')).toBe(
          readonlyRepoBefore,
        )
        // P01-RT-RESTORED-002 remains a separate real workspace permission test.
        await finishDiagramFixture(app)
        // Explicit temporary data fixture restoration after the one resumed original Save.
        await writeFile(file, modified)
        const profileFile = join(profile, 'frade-workspace.json'),
          workspace = JSON.parse(await readFile(profileFile, 'utf8'))
        expect(workspace.roots.length).toBe(1)
        workspace.roots[0].readOnly = true
        await writeFile(profileFile, JSON.stringify(workspace))
        app = await electron.launch({
          args: [resolve('out/main/index.cjs')],
          env: { ...process.env, FRADE_USER_DATA: profile },
        })
        const roPage = await app.firstWindow()
        activePage = roPage
        await roPage.setViewportSize({ width: 1600, height: 900 })
        await expect(roPage.getByRole('status')).toHaveText('Backend: ready')
        await expect(roPage.locator('.tree-row').filter({ hasText: 'data' }).first()).toBeVisible({
          timeout: 30000,
        })
        await roPage
          .getByRole('textbox', { name: 'Поиск объектов', exact: true })
          .fill('Flows.' + format)
        await roPage
          .getByRole('treeitem')
          .filter({ hasText: new RegExp('^Flows[.]' + format + '$') })
          .dblclick()
        const roCanvas =
          format === 'frade'
            ? roPage.locator('.diagram-slot .x6-graph')
            : roPage.locator('.diagram-slot iframe').contentFrame().locator('.geDiagramContainer')
        await expect(roCanvas.getByText('A', { exact: true })).toBeVisible({ timeout: 20000 })
        await expect(
          roPage
            .locator('.diagram-slot .editor-actions')
            .getByRole('button', { name: 'Сохранить', exact: true }),
        ).toBeDisabled()
        const roPath = roCanvas.locator('path[stroke="#404040" i]').first(),
          pos = await roPath.evaluate((node) => {
            const path = node as SVGPathElement,
              p = path.getPointAtLength(path.getTotalLength() / 2),
              q = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!)
            return { x: q.x, y: q.y }
          }),
          box =
            format === 'drawio'
              ? await roPage.locator('.diagram-slot iframe').boundingBox()
              : undefined
        await roPage.mouse.dblclick(pos.x + (box?.x ?? 0), pos.y + (box?.y ?? 0))
        // The unavailable restored-workspace inspector entry is preserved as historical raw evidence.
        // Actual blocked input and original Save/byte/dirty protections remain mandatory.
        await expect(roPage.locator('.diagram-readonly').filter({ visible: true })).toBeVisible()
        const roA = await roCanvas.getByText('A', { exact: true }).boundingBox()
        if (!roA) throw Error('Actual readonly A input target unavailable')
        await roPage.mouse.move(roA.x + roA.width / 2, roA.y + roA.height / 2)
        await roPage.mouse.down()
        await roPage.mouse.move(roA.x + roA.width / 2 + 50, roA.y + roA.height / 2 + 30, {
          steps: 12,
        })
        await roPage.mouse.up()
        expect(await readFile(file, 'utf8')).toBe(modified)
        expect(await readFile(join(fixture.dataRoot, 'flows.yaml'), 'utf8')).toBe(modifiedRepo)
        await expect(roPage.locator('.dirty-dot')).toHaveCount(0)
        expect(violations).toEqual([])
      } catch (error) {
        observations.push({ state: 'actual-failure', message: String(error) })
        if (activePage)
          await activePage.screenshot({ path: info.outputPath('actual-live-failure.png') })
        throw error
      } finally {
        await writeFile(
          info.outputPath('b02-flow-observations.json'),
          JSON.stringify(
            { format, observations, violations, visualApproval: 'NOT_APPROVED' },
            null,
            2,
          ),
        )
        await finishDiagramFixture(app)
      }
    },
  )
}

// eslint-disable-next-line no-empty-pattern
test('P01 actual forced primary text retains system background behind glyphs rather than unreadable UA backplate', async ({}, info) => {
  const f = await diagramFixture('native')
  try {
    await f.page.getByRole('button', { name: 'Меню Файл' }).click()
    await f.page.getByRole('menuitem', { name: 'Настройки интерфейса' }).click()
    await f.page.emulateMedia({ forcedColors: 'active' })
    await expect
      .poll(() =>
        f.page.evaluate(() =>
          document.documentElement.style.getPropertyValue('--frade-text-primary'),
        ),
      )
      .toBe('CanvasText')
    await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
    const button = f.page
      .getByRole('dialog', { name: 'Настройки интерфейса' })
      .getByRole('button', { name: 'Применить', exact: true })
    const target = await button.evaluate((node) => {
      const range = document.createRange()
      range.selectNodeContents(node)
      const box = node.getBoundingClientRect(),
        text = range.getBoundingClientRect(),
        style = getComputedStyle(node)
      return {
        background: style.backgroundColor,
        color: style.color,
        rect: { x: text.x - box.x, y: text.y - box.y, width: text.width, height: text.height },
      }
    })
    const png = await button.screenshot({ path: info.outputPath('forced-primary-glyphs.png') })
    const pixels = await f.app.evaluate(
      ({ nativeImage }, data) => {
        const image = nativeImage.createFromBuffer(Buffer.from(data.base64, 'base64')),
          bitmap = image.toBitmap(),
          size = image.getSize(),
          rgb = data.target.background
            .match(/[0-9.]+/g)!
            .slice(0, 3)
            .map(Number),
          rect = data.target.rect
        let matched = 0,
          total = 0
        for (let y = Math.ceil(rect.y); y < Math.floor(rect.y + rect.height); y++)
          for (let x = Math.ceil(rect.x); x < Math.floor(rect.x + rect.width); x++) {
            const i = (y * size.width + x) * 4
            total++
            if (bitmap[i] === rgb[2] && bitmap[i + 1] === rgb[1] && bitmap[i + 2] === rgb[0])
              matched++
          }
        return { matched, total, backgroundFraction: matched / total, size }
      },
      { base64: png.toString('base64'), target },
    )
    await writeFile(
      info.outputPath('forced-primary-pixels.json'),
      JSON.stringify({ target, pixels, actualMedia: true }, null, 2),
    )
    expect(pixels.total).toBeGreaterThan(50)
    expect(pixels.backgroundFraction).toBeGreaterThan(0.15)
  } finally {
    await finishDiagramFixture(f.app)
  }
})

// eslint-disable-next-line no-empty-pattern
test('P01 actual frame close and reopen disposes removed participants without renderer errors or document writes', async ({}, info) => {
  const f = await diagramFixture('frame'),
    errors: string[] = []
  f.page.on('pageerror', (error) => errors.push(error.message))
  const model = () =>
    f.page
      .frameLocator('iframe')
      .locator('body')
      .evaluate(() => {
        const w = window as any
        return w.mxUtils.getXml(new w.mxCodec().encode(w.__p01Ui.editor.graph.getModel()))
      })
  try {
    const before = await model(),
      disk = await readFile(f.file, 'utf8')
    await previewDark(f.page)
    await f.page.keyboard.press('Escape')
    await expect(f.page.getByRole('dialog', { name: 'Выбор темы' })).toHaveCount(0)
    await f.page.getByRole('button', { name: 'Закрыть ' + f.name, exact: true }).click()
    await expect(f.page.locator('.diagram-slot iframe')).toHaveCount(0)
    await expect(f.page.locator('.ka-workbench')).toBeVisible()
    expect(errors).toEqual([])
    await f.page
      .getByRole('treeitem')
      .filter({ hasText: /^Workshop[.]drawio$/ })
      .dblclick()
    await expect(f.page.locator('iframe')).toBeVisible({ timeout: 20000 })
    await expect(f.page.frameLocator('iframe').locator('html')).toHaveAttribute(
      'data-frade-frame-theme',
      'light',
    )
    await expect(f.page.locator('iframe')).toHaveAttribute(
      'data-frade-revision',
      (await f.page.locator('html').getAttribute('data-frade-revision'))!,
    )
    expect(await model()).toBe(before)
    expect(await readFile(f.file, 'utf8')).toBe(disk)
    expect(errors).toEqual([])
    await f.page.screenshot({ path: info.outputPath('frame-close-reopened.png') })
  } finally {
    await writeFile(
      info.outputPath('close-reopen-errors.json'),
      JSON.stringify({ errors }, null, 2),
    )
    await finishDiagramFixture(f.app)
  }
})

// eslint-disable-next-line no-empty-pattern
test('P01 actual root rename retains repository identities and searchable cards through managed overlays', async ({}, info) => {
  test.setTimeout(120000)
  const a = await createKaFixture(),
    b = await createKaFixture(),
    native = join(a.destination, 'Native')
  const { createNativeRepository } = await import('@frade/adapter-yaml')
  await createNativeRepository(native, { repositoryId: 'native-source', displayName: 'Native' })
  const app = await electron.launch({
    args: [resolve('out/main/index.cjs')],
    env: { ...process.env, FRADE_USER_DATA: join(a.destination, 'p01-multiroot-profile') },
  })
  let page: Page | undefined
  try {
    page = await app.firstWindow()
    await expect(page.getByRole('status')).toHaveText('Backend: ready')
    await app.evaluate(
      ({ dialog }, paths) => {
        let i = 0
        dialog.showOpenDialog = (async () => ({
          canceled: false,
          filePaths: [paths[i++]],
        })) as typeof dialog.showOpenDialog
      },
      [a.dataRoot, a.metadataRoot, b.dataRoot, b.metadataRoot, native],
    )
    const command = async (name: string) => {
      await page!.keyboard.press('Control+Shift+p')
      await page!.getByLabel('Найти команду').fill(name)
      await page!.locator('.command-palette').getByRole('button', { name, exact: true }).click()
    }
    await page.getByRole('button', { name: 'Открыть KA', exact: true }).click()
    await expect(page.locator('.status-message')).toContainText('138 объектов')
    await command('Добавить репозиторий KA')
    await expect(page.locator('.status-message')).toContainText('276 объектов')
    await command('Добавить native-репозиторий')
    const rows = page.locator('[role=treeitem][aria-level="1"]')
    await expect(rows).toHaveCount(3)
    const ids = await rows.evaluateAll((ns) => ns.map((n) => n.getAttribute('data-repository-id')!))
    await rows.nth(0).click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Переименовать корень' }).click()
    await page.getByLabel('Название корня').fill('KA A')
    await page.getByRole('button', { name: 'Переименовать', exact: true }).click()
    await expect(page.getByLabel('Название корня')).toHaveCount(0)
    const after = await rows.evaluateAll((ns) =>
      ns.map((n) => ({ id: n.getAttribute('data-repository-id'), text: n.textContent })),
    )
    await writeFile(
      info.outputPath('root-identities-after-rename.json'),
      JSON.stringify({ ids, after }, null, 2),
    )
    expect(after.map((n) => n.id)).toEqual(ids)
    const id = 'ecogroup.berezka.systems.berezka'
    await page.getByLabel('Поиск объектов', { exact: true }).fill(id)
    const card = page.locator(
      '[role=treeitem][data-repository-id="' + ids[0] + '"][data-object-id="' + id + '"]',
    )
    await expect(card).toBeVisible()
    await card.click()
    await expect(page.locator('.object-id')).toHaveText(id)
  } finally {
    if (page && !page.isClosed()) {
      await writeFile(info.outputPath('navigator-final.html'), await page.content())
      await page.screenshot({ path: info.outputPath('navigator-final.png') })
    }
    await finishDiagramFixture(app)
  }
})

// eslint-disable-next-line no-empty-pattern
test('P01 actual restored readonly frame refuses navigator drop after exact presentation readiness without document writes', async ({}, info) => {
  test.setTimeout(120000)
  const f = await diagramFixture('frame'),
    saved = await readFile(f.file, 'utf8'),
    profile = join(f.fixture.destination, 'p01-frame-profile')
  await finishDiagramFixture(f.app)
  const workspacePath = join(profile, 'frade-workspace.json'),
    stored = JSON.parse(await readFile(workspacePath, 'utf8'))
  stored.roots[0].readOnly = true
  await writeFile(workspacePath, JSON.stringify(stored))
  const app = await electron.launch({
    args: [resolve('out/main/index.cjs')],
    env: { ...process.env, FRADE_USER_DATA: profile },
  })
  try {
    const page = await app.firstWindow()
    await expect(page.locator('.status-message')).toContainText('138 объектов')
    await expect(
      page
        .locator('.diagram-slot .editor-actions')
        .getByRole('button', { name: 'Сохранить', exact: true }),
    ).toBeDisabled()
    const frame = page.locator('.diagram-slot iframe')
    await expect(frame).toHaveAttribute(
      'data-frade-revision',
      (await page.locator('html').getAttribute('data-frade-revision')) as string,
    )
    await expect(page.locator('.frade-theme-commit-barrier')).toBeHidden()
    await page.getByLabel('Поиск объектов', { exact: true }).fill('Маркетплейс')
    const source = page
        .locator('[role=treeitem][data-object-id]')
        .filter({ hasText: 'Маркетплейс' })
        .first(),
      canvas = frame.contentFrame().locator('.geDiagramContainer'),
      from = await source.boundingBox(),
      to = await canvas.boundingBox()
    if (!from || !to) throw Error('Actual readonly drop surfaces unavailable')
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2, { steps: 3 })
    await expect(page.locator('.diagram-slot .diagram-drop-target')).toBeVisible()
    await page.mouse.move(to.x + 220, to.y + 180, { steps: 12 })
    await page.mouse.up()
    await expect(page.locator('.dirty-dot')).toHaveCount(0)
    expect(await readFile(f.file, 'utf8')).toBe(saved)
    await expect(canvas.getByText('Маркетплейс', { exact: true })).toHaveCount(0)
    await page.screenshot({ path: info.outputPath('readonly-restored-drop.png') })
  } finally {
    await finishDiagramFixture(app)
  }
})

// eslint-disable-next-line no-empty-pattern
test('P01-LOWER actual canvas F6 entry preserves document, selection, undo and viewport', async ({}, info) => {
  test.setTimeout(120000)
  const f = await diagramFixture('frame', { mode: 'dark', density: 'comfortable' })
  try {
    const frame = f.page.frameLocator('iframe')
    await expect
      .poll(() => frame.locator('body').evaluate(() => !!(window as any).__p01Ui))
      .toBe(true)
    const layout = await frame.locator('body').evaluate(() => {
      const canvas = document.querySelector('.geDiagramContainer')!.getBoundingClientRect()
      const toolbar = document.querySelector('.geToolbarContainer')!.getBoundingClientRect()
      const strip = document.querySelector('.geTabContainer')!.getBoundingClientRect()
      return {
        canvasTop: canvas.top,
        toolbarBottom: toolbar.bottom,
        canvasBottom: canvas.bottom,
        stripTop: strip.top,
      }
    })
    await info.attach('original-grid-layout', {
      body: JSON.stringify(layout),
      contentType: 'application/json',
    })
    expect(layout.canvasTop).toBeGreaterThanOrEqual(layout.toolbarBottom)
    expect(layout.canvasBottom).toBeLessThanOrEqual(layout.stripTop)
    const original = await readFile(f.file, 'utf8')
    const observe = () =>
      frame.locator('body').evaluate(() => {
        const ui = (window as any).__p01Ui,
          g = ui.editor.graph
        const globals = window as any
        return {
          xml: globals.mxUtils.getXml(new globals.mxCodec().encode(g.getModel())),
          selection: g.getSelectionCells().map((c: any) => c.id),
          undo: ui.editor.undoManager.indexOfNextAdd,
          scale: g.view.scale,
          translate: { x: g.view.translate.x, y: g.view.translate.y },
          prefs: localStorage.getItem('mxGraph'),
        }
      })
    await frame.locator('.geDiagramContainer').click({ position: { x: 80, y: 200 } })
    const before = await observe()
    await f.page.keyboard.press('F6')
    await expect
      .poll(() =>
        frame.locator('body').evaluate(() => {
          const active = document.activeElement
          return (
            !!active &&
            !!active.closest('.geTabContainer') &&
            active.getAttribute('role') === 'button'
          )
        }),
      )
      .toBe(true)
    await f.page.keyboard.press('End')
    await f.page.keyboard.press('Home')
    expect(await observe()).toEqual(before)
    expect(await readFile(f.file, 'utf8')).toBe(original)
    await f.page.screenshot({ path: info.outputPath('lower-f6-focus.png') })
    await f.page.keyboard.press('Escape')
    await expect
      .poll(() =>
        frame.locator('body').evaluate(() => {
          const ui = (window as any).__p01Ui
          return (
            document.activeElement === ui.typingShim ||
            document.activeElement === ui.editor.graph.container
          )
        }),
      )
      .toBe(true)
    expect(await observe()).toEqual(before)
    expect(await readFile(f.file, 'utf8')).toBe(original)
  } finally {
    await finishDiagramFixture(f.app)
  }
})

// eslint-disable-next-line no-empty-pattern
test('P01-LOWER original keyboard page menu duplicate rename move remove, submenu and cancellation', async ({}, info) => {
  test.setTimeout(180000)
  const f = await diagramFixture('frame', { mode: 'dark', density: 'comfortable' })
  try {
    const frame = f.page.frameLocator('iframe')
    await expect
      .poll(() => frame.locator('body').evaluate(() => !!(window as any).__p01Ui))
      .toBe(true)
    const labels = await frame.locator('body').evaluate(() => {
      const r = (window as any).mxResources
      return {
        duplicate: (window as any).__p01Ui.actions.get('duplicatePage').label,
        rename: (window as any).__p01Ui.actions.get('renamePage').label,
        move: r.get('move'),
        remove: (window as any).__p01Ui.actions.get('removePage').label,
        pages: r.get('pages'),
      }
    })
    const state = () =>
      frame.locator('body').evaluate(() => {
        const ui = (window as any).__p01Ui
        return {
          pages: ui.pages.map((p: any) => ({
            id: String(p.getId()),
            name: String(p.getName()),
          })) as { id: string; name: string }[],
          current: ui.currentPage.getId(),
          selection: ui.editor.graph.getSelectionCells().map((c: any) => c.id),
          undo: ui.editor.undoManager.indexOfNextAdd,
          history: ui.editor.undoManager.history.length,
          scale: ui.editor.graph.view.scale,
          translate: { x: ui.editor.graph.view.translate.x, y: ui.editor.graph.view.translate.y },
        }
      })
    const openPageMenu = async () => {
      await frame.locator('.geDiagramContainer').click({ position: { x: 80, y: 200 } })
      await f.page.keyboard.press('F6')
      await f.page.keyboard.press('End')
      await f.page.keyboard.press('Enter')
      await expect(frame.locator('[data-frade-lower-menu][role="menu"]').first()).toBeVisible()
      await info.attach('menu-entry-diagnostic', {
        body: JSON.stringify(
          await frame.locator('body').evaluate(() => ({
            active: document.activeElement?.outerHTML,
            pointer: (window as any).mxClient.IS_POINTER,
            rows: Array.from(document.querySelectorAll('[data-frade-lower-menu] tr')).map(
              (r: any) => ({
                html: r.outerHTML,
                listeners: r.mxListenerList?.map((x: any) => ({
                  name: x.name,
                  function: typeof x.f,
                })),
                visible: getComputedStyle(r).display,
              }),
            ),
          })),
          null,
          2,
        ),
        contentType: 'application/json',
      })
      await expect
        .poll(() =>
          frame.locator('body').evaluate(() => document.activeElement?.getAttribute('role')),
        )
        .toBe('menuitem')
    }
    const select = async (name: string, enter = true) => {
      const menu = frame.locator('[data-frade-lower-menu][role="menu"]:visible').last()
      const names = await menu
        .locator('[role="menuitem"][aria-disabled="false"]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')))
      const index = names.indexOf(name)
      expect(index, 'actual original localized menu item: ' + name).toBeGreaterThanOrEqual(0)
      await f.page.keyboard.press('Home')
      for (let i = 0; i < index; i++) await f.page.keyboard.press('ArrowDown')
      await expect
        .poll(() =>
          frame.locator('body').evaluate(() => document.activeElement?.getAttribute('aria-label')),
        )
        .toBe(name)
      if (enter) await f.page.keyboard.press('Enter')
    }
    const original = await readFile(f.file, 'utf8'),
      initial = await state()
    await openPageMenu()
    await f.page.keyboard.press('ArrowDown')
    await f.page.keyboard.press('Home')
    await f.page.keyboard.press('Escape')
    expect(await state()).toEqual(initial)
    await expect(frame.locator('[data-frade-lower-menu]')).toHaveCount(0)
    await expect
      .poll(() =>
        frame.locator('body').evaluate(() => !!document.activeElement?.closest('.geTabContainer')),
      )
      .toBe(true)
    await f.page.keyboard.press('Enter')
    await f.page.keyboard.press('Tab')
    await expect(frame.locator('[data-frade-lower-menu]')).toHaveCount(0)
    expect(await state()).toEqual(initial)
    await openPageMenu()
    await select(labels.duplicate)
    await expect.poll(async () => (await state()).pages.length).toBe(2)
    await expect
      .poll(() =>
        frame.locator('body').evaluate(() => !!document.activeElement?.closest('.geTabContainer')),
      )
      .toBe(true)
    await openPageMenu()
    await select(labels.rename)
    await expect(frame.locator('.geDialog input').first()).toBeFocused()
    await f.page.keyboard.press('Control+A')
    await f.page.keyboard.type('Keyboard renamed')
    await f.page.keyboard.press('Enter')
    await expect
      .poll(async () => (await state()).pages.some((p) => p.name === 'Keyboard renamed'))
      .toBe(true)
    await openPageMenu()
    await select(labels.move, false)
    await f.page.keyboard.press('ArrowRight')
    await expect(frame.locator('[data-frade-lower-menu][role="menu"]')).toHaveCount(2)
    await expect
      .poll(() =>
        frame.locator('body').evaluate(() => document.activeElement?.getAttribute('role')),
      )
      .toBe('menuitem')
    await f.page.keyboard.press('ArrowLeft')
    await expect(frame.locator('[data-frade-lower-menu][role="menu"]')).toHaveCount(1)
    await f.page.keyboard.press('ArrowRight')
    const beforeMove = await state()
    await f.page.keyboard.press('Enter')
    await expect
      .poll(async () => (await state()).pages.map((p) => p.id).join(','))
      .toBe(
        beforeMove.pages
          .map((p) => p.id)
          .reverse()
          .join(','),
      )
    await openPageMenu()
    await select(labels.remove)
    await expect.poll(async () => (await state()).pages.length).toBe(1)
    expect(await readFile(f.file, 'utf8')).toBe(original)
    await frame
      .locator('.geTabContainer')
      .getByRole('button', { name: labels.pages, exact: true })
      .focus()
    await f.page.keyboard.press('Enter')
    await expect(frame.getByRole('menuitemcheckbox')).toHaveAttribute('aria-checked', 'true')
    await frame.locator('body').evaluate(async () => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      )
    })
    const mark = frame.locator('[data-frade-lower-menu] td.mxPopupMenuItem > div').first()
    const ink = await mark.evaluate((node) => getComputedStyle(node).color)
    expect(
      pngColorCount(await mark.screenshot(), ink),
      'Original checkmark has actual canonical foreground ink',
    ).toBeGreaterThan(0)
    const menuBox = await frame.locator('[data-frade-lower-menu][role="menu"]').boundingBox()
    const frameBox = await f.page.locator('iframe').boundingBox()
    expect(
      menuBox!.x - frameBox!.x,
      'Original lower click coordinates anchor Pages menu',
    ).toBeGreaterThan(0)
    await f.page.keyboard.press('Home')
    await f.page.keyboard.press('ArrowDown')
    await f.page.keyboard.press('ArrowRight')
    await expect(frame.locator('[data-frade-lower-menu][role="menu"]')).toHaveCount(2)
    await f.page.keyboard.press('ArrowLeft')
    await f.page.keyboard.press('Escape')
    await expect(frame.locator('[data-frade-lower-menu]')).toHaveCount(0)
    await frame.locator('.geMenubarContainer a').first().click()
    await expect(frame.locator('div.mxPopupMenu:visible').first()).toBeVisible()
    await expect(frame.locator('[data-frade-lower-menu]')).toHaveCount(0)
    await frame.locator('.geDiagramContainer').click({ position: { x: 80, y: 200 } })
    expect(await readFile(f.file, 'utf8')).toBe(original)
    await f.page.screenshot({ path: info.outputPath('lower-original-page-actions.png') })
    await info.attach('original-page-workload', {
      body: JSON.stringify({ labels, initial, final: await state() }, null, 2),
      contentType: 'application/json',
    })
  } finally {
    await finishDiagramFixture(f.app)
  }
})

// eslint-disable-next-line no-empty-pattern
test('P01-POST-B03 actual many-page overflow reveals focused target and outline without changing semantic viewport', async ({}, info) => {
  test.setTimeout(180000)
  const f = await diagramFixture('frame', { mode: 'dark', density: 'comfortable' })
  try {
    const frame = f.page.frameLocator('iframe')
    await expect
      .poll(() => frame.locator('body').evaluate(() => !!(window as any).__p01Ui))
      .toBe(true)
    const insert = await frame
      .locator('body')
      .evaluate(() => (window as any).mxResources.get('insertPage'))
    const original = await readFile(f.file, 'utf8')
    for (let i = 0; i < 20; i++) {
      await frame
        .locator('.geTabContainer')
        .getByRole('button', { name: insert, exact: true })
        .click()
      await expect(frame.locator('.gePageTab')).toHaveCount(i + 2)
    }
    await frame.locator('.geTabScroller').evaluate((node) => {
      node.scrollLeft = 0
    })
    await frame.locator('.geDiagramContainer').click({ position: { x: 80, y: 200 } })
    await frame.locator('body').evaluate(async () => {
      for (let i = 0; i < 8; i++)
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    })
    const state = () =>
      frame.locator('body').evaluate(() => {
        const ui = (window as any).__p01Ui,
          g = ui.editor.graph
        return {
          xml: (window as any).mxUtils.getXml(ui.editor.getGraphXml()),
          pages: ui.pages.map((p: any) => ({ id: p.getId(), name: p.getName() })),
          current: ui.currentPage.getId(),
          selection: g.getSelectionCells().map((c: any) => c.id),
          undo: ui.editor.undoManager.indexOfNextAdd,
          history: ui.editor.undoManager.history.length,
          scale: g.view.scale,
          translate: { x: g.view.translate.x, y: g.view.translate.y },
          preferences: { ...localStorage },
        }
      })
    const before = await state()
    await f.page.keyboard.press('F6')
    await f.page.keyboard.press('End')
    await f.page.keyboard.press('ArrowLeft')
    const bounds = await frame.locator('body').evaluate(() => {
      const active = document.activeElement as HTMLElement,
        scroller = document.querySelector('.geTabScroller') as HTMLElement,
        box = active.getBoundingClientRect(),
        clip = scroller.getBoundingClientRect(),
        css = getComputedStyle(active)
      return {
        focused:
          active.closest('.gePageTab') ===
          Array.from(document.querySelectorAll('.gePageTab')).at(-1),
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        clip: clip.toJSON(),
        scroll: scroller.scrollLeft,
        overflow: scroller.scrollWidth > scroller.clientWidth,
        focusVisible: active.matches(':focus-visible'),
        outline: parseFloat(css.outlineWidth),
      }
    })
    await writeFile(
      info.outputPath('overflow-observation.json'),
      JSON.stringify({ before, bounds }, null, 2),
    )
    await f.page.screenshot({ path: info.outputPath('overflow-end-focus.png') })
    expect(bounds.overflow).toBe(true)
    expect(bounds.focused).toBe(true)
    expect(bounds.scroll).toBeGreaterThan(0)
    expect(bounds.left - 4).toBeGreaterThanOrEqual(bounds.clip.left)
    expect(bounds.right + 4).toBeLessThanOrEqual(bounds.clip.right)
    expect(bounds.top - 4).toBeGreaterThanOrEqual(bounds.clip.top)
    expect(bounds.bottom + 4).toBeLessThanOrEqual(bounds.clip.bottom)
    expect(bounds.focusVisible).toBe(true)
    expect(bounds.outline).toBeGreaterThanOrEqual(2)
    await f.page.keyboard.press('ArrowLeft')
    await f.page.keyboard.press('Home')
    await f.page.keyboard.press('Escape')
    expect(await state()).toEqual(before)
    expect(await readFile(f.file, 'utf8')).toBe(original)
  } finally {
    await finishDiagramFixture(f.app)
  }
})

for (const mode of ['light', 'dark', 'high-contrast'] as const)
  for (const density of ['compact', 'comfortable'] as const) {
    test(
      'P01-LOWER-matrix ' +
        mode +
        ' ' +
        density +
        ' actual lower and popup target focus contrast bounds',
      // Playwright requires destructuring its unused fixture parameter.
      // eslint-disable-next-line no-empty-pattern
      async ({}, info) => {
        test.setTimeout(180000)
        const f = await diagramFixture('frame', { mode, density }),
          observations: unknown[] = [],
          violations: unknown[] = []
        let popupFontSize = 0
        try {
          const frame = f.page.frameLocator('iframe')
          await expect
            .poll(() => frame.locator('body').evaluate(() => !!(window as any).__p01Ui))
            .toBe(true)
          const original = await readFile(f.file, 'utf8')
          const semantics = () =>
            frame.locator('body').evaluate(() => {
              const ui = (window as any).__p01Ui,
                g = ui.editor.graph
              return {
                xml: (window as any).mxUtils.getXml(ui.editor.getGraphXml()),
                selection: g.getSelectionCells().map((c: any) => c.id),
                undo: ui.editor.undoManager.indexOfNextAdd,
                history: ui.editor.undoManager.history.length,
                scale: g.view.scale,
                translate: { x: g.view.translate.x, y: g.view.translate.y },
                preferences: { ...localStorage },
              }
            })
          const capture = async (label: string) => {
            await p01WaitNativeResizeSettlement(f.page, info, label)
            await frame.locator('body').evaluate(async () => {
              await document.fonts.ready
              await new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
              )
            })
            await frame.locator('body').evaluate(async () => {
              const signature = () => {
                const g = (window as any).__p01Ui.editor.graph,
                  b = g.container.getBoundingClientRect()
                return JSON.stringify([
                  g.view.scale,
                  g.view.translate.x,
                  g.view.translate.y,
                  b.x,
                  b.y,
                  b.width,
                  b.height,
                ])
              }
              let previous = signature(),
                stable = 0
              for (let frame = 0; frame < 120 && stable < 6; frame++) {
                await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
                const next = signature()
                stable = previous === next ? stable + 1 : 0
                previous = next
              }
              if (stable < 6) throw Error('Actual original resize/view geometry did not settle')
            })
            await frame.locator('.geDiagramContainer').click({ position: { x: 80, y: 200 } })
            const before = await semantics()
            await f.page.keyboard.press('F6')
            await f.page.keyboard.press('End')
            const inspect = () =>
              frame.locator('body').evaluate(() => {
                const bg = (node: HTMLElement) => {
                  for (let p: HTMLElement | null = node; p; p = p.parentElement) {
                    const color = getComputedStyle(p).backgroundColor
                    if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color
                  }
                  return ''
                }
                const controls = Array.from(
                  document.querySelectorAll<HTMLElement>(
                    '.geTabContainer [role="button"],[data-frade-lower-menu] [role^="menuitem"]',
                  ),
                ).filter((node) => {
                  const b = node.getBoundingClientRect()
                  return (
                    b.width > 0 &&
                    b.height > 0 &&
                    getComputedStyle(node).visibility !== 'hidden' &&
                    !node.closest('[hidden]')
                  )
                })
                return {
                  media: {
                    forced: matchMedia('(forced-colors: active)').matches,
                    coarse: matchMedia('(pointer:coarse)').matches,
                    reduced: matchMedia('(prefers-reduced-motion:reduce)').matches,
                  },
                  viewport: { width: innerWidth, height: innerHeight },
                  controls: controls.map((node) => {
                    const b = node.getBoundingClientRect(),
                      css = getComputedStyle(node),
                      focus = node === document.activeElement
                    const hit = document.elementFromPoint(
                      b.left + b.width / 2,
                      b.top + b.height / 2,
                    )
                    const clips: string[] = []
                    for (
                      let a = node.parentElement;
                      a && a !== document.body;
                      a = a.parentElement
                    ) {
                      const style = getComputedStyle(a),
                        box = a.getBoundingClientRect()
                      if (
                        ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX) &&
                        (b.left - (focus ? 4 : 0) < box.left ||
                          b.right + (focus ? 4 : 0) > box.right)
                      )
                        clips.push(a.className + ' horizontal')
                      if (
                        ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY) &&
                        (b.top - (focus ? 4 : 0) < box.top ||
                          b.bottom + (focus ? 4 : 0) > box.bottom)
                      )
                        clips.push(a.className + ' vertical')
                    }
                    return {
                      label: node.getAttribute('aria-label'),
                      role: node.getAttribute('role'),
                      layer: node.closest('[data-frade-lower-menu]') ? 'popup' : 'lower',
                      disabled: node.getAttribute('aria-disabled'),
                      box: b.toJSON(),
                      color: css.color,
                      background: bg(node),
                      focused: focus,
                      focusVisible: node.matches(':focus-visible'),
                      outlineWidth: css.outlineWidth,
                      outlineColor: css.outlineColor,
                      parentBackground: bg(node.parentElement!),
                      focusBackplate: css.boxShadow,
                      adjacentBackground:
                        focus && css.boxShadow !== 'none'
                          ? css.boxShadow.match(/rgba?\([^)]+\)/)?.[0] || bg(node.parentElement!)
                          : bg(node.parentElement!),
                      hovered: node.matches(':hover'),
                      mask: css.maskImage,
                      hit: !!hit && (hit === node || node.contains(hit)),
                      clips,
                    }
                  }),
                }
              })
            const checkState = async (state: string, popupLayer = false) => {
              await frame.locator('body').evaluate(async () => {
                await new Promise<void>((resolve) =>
                  requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
                )
              })
              const record = await inspect()
              observations.push({ label: label + '-' + state, ...record })
              for (const control of record.controls) {
                if (control.disabled === 'true' || (popupLayer && control.layer === 'lower'))
                  continue
                const minimum = record.media.coarse ? 44 : density === 'compact' ? 28 : 36
                if (
                  control.box.height < minimum ||
                  control.box.width < (record.media.coarse ? 44 : 24)
                )
                  violations.push({ label, state, rule: 'A11Y-004/FDS-DENSITY', control })
                if (
                  !control.hit ||
                  control.clips.length ||
                  control.box.left < 0 ||
                  control.box.right > record.viewport.width ||
                  control.box.top < 0 ||
                  control.box.bottom > record.viewport.height
                )
                  violations.push({ label, state, rule: 'VISIBLE_UNOCCLUDED_TARGET', control })
                if (uiContrast(control.color, control.background) < 4.5)
                  violations.push({ label, state, rule: 'A11Y-001_TEXT', control })
                if (
                  control.focused &&
                  (!control.focusVisible ||
                    parseFloat(control.outlineWidth) < 2 ||
                    control.mask !== 'none' ||
                    uiContrast(control.outlineColor, control.adjacentBackground) < 3)
                )
                  violations.push({ label, state, rule: 'A11Y-003_FOCUS_CONTRAST_BOUNDS', control })
              }
              const glyphs = frame.locator(
                popupLayer
                  ? '[data-frade-lower-menu] td.mxPopupMenuIcon:has(img),[data-frade-lower-menu] td.mxPopupMenuItem>div'
                  : '.geTabContainer .geButton',
              )
              const paint: unknown[] = []
              for (let i = 0; i < (await glyphs.count()); i++) {
                const glyph = glyphs.nth(i)
                if (!(await glyph.isVisible())) continue
                const values = await glyph.evaluate((node, lower) => {
                  const css = getComputedStyle(node, lower ? '::before' : null)
                  let background = ''
                  for (
                    let p: Element | null = lower ? node : node.parentElement;
                    p;
                    p = p.parentElement
                  ) {
                    const color = getComputedStyle(p).backgroundColor
                    if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
                      background = color
                      break
                    }
                  }
                  return {
                    image: css.maskImage,
                    ink: css.backgroundColor,
                    background,
                    color: css.color,
                  }
                }, !popupLayer)
                expect(values.image, state + ' original glyph mask').not.toBe('none')
                const png = await glyph.screenshot({
                  path: info.outputPath(label + '-' + state + '-glyph-' + i + '.png'),
                })
                const pixels = pngColorCount(png, values.ink)
                observations.push({
                  label: label + '-' + state + '-glyph-' + i,
                  ...values,
                  pixels,
                  projection: await glyph.evaluate((node) => {
                    const values = []
                    for (let p: Element | null = node; p; p = p.parentElement) {
                      const css = getComputedStyle(p)
                      values.push({
                        className: p.className,
                        opacity: css.opacity,
                        filter: css.filter,
                      })
                    }
                    return values
                  }),
                })
                const effectivePixels = pngCanonicalContrastPixels(
                  png,
                  values.ink,
                  values.background,
                )
                expect(
                  effectivePixels,
                  state + ' actual canonical glyph paint at contrast >=3',
                ).toBeGreaterThan(0)
                expect(
                  uiContrast(values.ink, values.background),
                  state + ' actual icon contrast',
                ).toBeGreaterThanOrEqual(3)
                paint.push({ ...values, pixels, effectivePixels })
              }
              if (state.startsWith('page-popup'))
                expect(paint.length, 'Original duplicate/remove/rename rows have no icon').toBe(0)
              else expect(paint.length, state + ' actual glyph coverage').toBeGreaterThan(0)
              observations.push({ label: label + '-' + state + '-actual-glyph-paint', paint })
              await f.page.screenshot({ path: info.outputPath(label + '-' + state + '.png') })
            }
            const lower = await inspect()
            observations.push({ label: label + '-lower', ...lower })
            await f.page.screenshot({ path: info.outputPath(label + '-lower-focus.png') })
            await checkState('lower-focus')
            await frame
              .locator('.geTabContainer [role="button"][aria-disabled="false"]:visible')
              .last()
              .hover()
            await checkState('lower-hover-focus')
            await f.page.keyboard.press('Enter')
            await expect(frame.locator('[data-frade-lower-menu][role="menu"]')).toHaveCount(1)
            await f.page.keyboard.press('End')
            await f.page.keyboard.press('Home')
            await frame.locator('body').evaluate(async () => {
              await new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
              )
            })
            if (!popupFontSize)
              popupFontSize = await frame
                .locator('[data-frade-lower-menu] td.mxPopupMenuItem')
                .first()
                .evaluate((node) => parseFloat(getComputedStyle(node).fontSize))
            const actualFont = await frame
              .locator('[data-frade-lower-menu] td.mxPopupMenuItem')
              .first()
              .evaluate((node) => parseFloat(getComputedStyle(node).fontSize))
            if (label.includes('text200')) expect(actualFont).toBe(popupFontSize * 2)
            observations.push({
              label: label + '-actual-popup-font',
              actualFont,
              originalFont: popupFontSize,
            })
            const popup = await inspect()
            observations.push({ label: label + '-popup', ...popup })
            for (const record of [lower, popup]) {
              expect(record.controls.length).toBeGreaterThan(0)
              for (const control of record.controls) {
                if (control.disabled === 'true' || (record === popup && control.layer === 'lower'))
                  continue
                if (
                  control.box.height <
                    (record.media.coarse ? 44 : density === 'compact' ? 28 : 36) ||
                  control.box.width < (record.media.coarse ? 44 : 24)
                )
                  violations.push({ label, rule: 'A11Y-004/FDS-DENSITY', control })
                if (
                  !control.hit ||
                  control.clips.length ||
                  control.box.left < 0 ||
                  control.box.right > record.viewport.width ||
                  control.box.top < 0 ||
                  control.box.bottom > record.viewport.height
                )
                  violations.push({ label, rule: 'VISIBLE_UNOCCLUDED_TARGET', control })
                if (uiContrast(control.color, control.background) < 4.5)
                  violations.push({ label, rule: 'A11Y-001', control })
                if (
                  control.focused &&
                  (!control.focusVisible ||
                    parseFloat(control.outlineWidth) < 2 ||
                    control.mask !== 'none' ||
                    uiContrast(control.outlineColor, control.adjacentBackground) < 3)
                )
                  violations.push({ label, rule: 'A11Y-003_UNCLIPPED_FOCUS', control })
              }
            }
            await f.page.screenshot({ path: info.outputPath(label + '-popup-focus.png') })
            await checkState('page-popup-focus', true)
            await frame.locator('[data-frade-lower-menu] [role="menuitem"]').first().hover()
            await checkState('page-popup-hover-focus', true)
            await f.page.keyboard.press('Escape')
            await expect(frame.locator('[data-frade-lower-menu]')).toHaveCount(0)
            await frame.locator('.geTabContainer .geControlTab[aria-haspopup="menu"]').focus()
            await f.page.keyboard.press('Enter')
            await expect(frame.locator('[data-frade-lower-menu][role="menu"]')).toHaveCount(1)
            await expect(frame.getByRole('menuitemcheckbox')).toHaveAttribute(
              'aria-checked',
              'true',
            )
            await f.page.keyboard.press('Home')
            await checkState('pages-root-focus', true)
            const checked = frame.locator('[data-frade-lower-menu] [role="menuitemcheckbox"]')
            const checkedBox = await checked.boundingBox()
            expect(checkedBox).not.toBeNull()
            // The submenu can reflow this row after mouseenter. Let Playwright
            // compute the current target center instead of freezing its old width.
            await checked.hover()
            await checkState('pages-root-hover-focus', true)
            const parent = frame
              .locator(
                '[data-frade-lower-menu] [role^="menuitem"][aria-haspopup="menu"][aria-disabled="false"]',
              )
              .first()
            await parent.focus()
            await f.page.keyboard.press('ArrowRight')
            await expect(frame.locator('[data-frade-lower-menu][role="menu"]')).toHaveCount(2)
            await f.page.keyboard.press('End')
            await f.page.keyboard.press('Home')
            await checkState('pages-submenu-focus', true)
            await frame
              .locator('[data-frade-lower-menu][role="menu"]')
              .last()
              .locator('[role^="menuitem"][aria-disabled="false"]')
              .first()
              .hover()
            await checkState('pages-submenu-hover-focus', true)
            await f.page.keyboard.press('ArrowLeft')
            await expect(frame.locator('[data-frade-lower-menu][role="menu"]')).toHaveCount(1)
            await f.page.keyboard.press('Escape')
            await expect(frame.locator('[data-frade-lower-menu]')).toHaveCount(0)
            expect(await semantics()).toEqual(before)
            expect(await readFile(f.file, 'utf8')).toBe(original)
          }
          for (const viewport of [
            { width: 1280, height: 850 },
            { width: 1600, height: 900 },
            { width: 850, height: 650 },
          ]) {
            await f.page.setViewportSize(viewport)
            await capture(viewport.width + 'x' + viewport.height)
          }
          await f.page.setViewportSize({ width: 1280, height: 850 })
          await frame.locator('body').evaluate(() => {
            const sizes = Array.from(
              document.querySelectorAll<HTMLElement>('.geTabContainer,.geTabContainer *'),
            ).map((node) => ({ node, size: parseFloat(getComputedStyle(node).fontSize) }))
            for (const { node, size } of sizes)
              node.style.setProperty('font-size', size * 2 + 'px', 'important')
          })
          await frame.locator('body').evaluate((_body, size: number) => {
            const style = document.createElement('style')
            style.setAttribute('data-p01-text-zoom', 'owned-popup')
            style.textContent =
              '[data-frade-lower-menu],[data-frade-lower-menu] table,[data-frade-lower-menu] tr,[data-frade-lower-menu] td{font-size:' +
              size * 2 +
              'px!important;line-height:normal!important;}'
            document.head.append(style)
          }, popupFontSize)
          await capture('text200')
          await f.page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
          const child = f.page.frames().find((value) => value.url().startsWith('frade://drawio/'))!
          const session = await f.page.context().newCDPSession(child)
          await session.send('Emulation.setTouchEmulationEnabled', {
            enabled: true,
            maxTouchPoints: 1,
          })
          await capture('forced-coarse-reduced-text200')
          const actual = await frame.locator('body').evaluate(() => ({
            forced: matchMedia('(forced-colors:active)').matches,
            coarse: matchMedia('(pointer:coarse)').matches,
            reduced: matchMedia('(prefers-reduced-motion:reduce)').matches,
          }))
          expect(actual).toEqual({ forced: true, coarse: true, reduced: true })
          await session.send('Emulation.setTouchEmulationEnabled', { enabled: false })
          await session.detach()
          expect(violations).toEqual([])
        } finally {
          await writeFile(
            info.outputPath('lower-matrix-observations.json'),
            JSON.stringify(
              { mode, density, observations, violations, visualApproval: 'NOT_APPROVED' },
              null,
              2,
            ),
          )
          await finishDiagramFixture(f.app)
        }
      },
    )
  }

function pngCanonicalContrastPixels(bytes: Buffer, css: string, background: string): number {
  const expected = css
    .match(/[0-9.]+/g)
    ?.slice(0, 3)
    .map(Number)
  if (!expected || expected.length !== 3) throw Error('Unresolved glyph foreground ' + css)
  let width = 0,
    height = 0,
    channels = 0
  const blocks: Buffer[] = []
  for (let at = 8; at < bytes.length;) {
    const size = bytes.readUInt32BE(at),
      type = bytes.toString('ascii', at + 4, at + 8),
      data = bytes.subarray(at + 8, at + 8 + size)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0
      if (data[8] !== 8 || data[12] !== 0 || !channels)
        throw Error('Unsupported screenshot PNG layout')
    }
    if (type === 'IDAT') blocks.push(data)
    at += size + 12
  }
  const raw = inflateSync(Buffer.concat(blocks)),
    stride = width * channels,
    image = Buffer.alloc(stride * height)
  let input = 0,
    count = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[input++]
    for (let x = 0; x < stride; x++) {
      const index = y * stride + x,
        left = x >= channels ? image[index - channels] : 0,
        up = y > 0 ? image[index - stride] : 0,
        diagonal = y > 0 && x >= channels ? image[index - stride - channels] : 0
      let predictor = 0
      if (filter === 1) predictor = left
      else if (filter === 2) predictor = up
      else if (filter === 3) predictor = Math.floor((left + up) / 2)
      else if (filter === 4) {
        const p = left + up - diagonal,
          a = Math.abs(p - left),
          b = Math.abs(p - up),
          c = Math.abs(p - diagonal)
        predictor = a <= b && a <= c ? left : b <= c ? up : diagonal
      } else if (filter !== 0) throw Error('Unsupported screenshot PNG filter')
      image[index] = (raw[input++] + predictor) & 255
    }
  }
  const back = background
    .match(/[0-9.]+/g)
    ?.slice(0, 3)
    .map(Number)
  if (!back || back.length !== 3) throw Error('Unresolved glyph backplate ' + background)
  const delta = expected.map((value, i) => value - back[i]),
    norm = delta.reduce((sum, value) => sum + value * value, 0)
  if (!norm) return 0
  for (let i = 0; i < image.length; i += channels) {
    if (channels === 4 && image[i + 3] < 200) continue
    const rgb = Array.from(image.subarray(i, i + 3)),
      alpha = rgb.reduce((sum, value, j) => sum + (value - back[j]) * delta[j], 0) / norm
    if (alpha <= 0 || alpha > 1) continue
    if (
      rgb.every((value, j) => Math.abs(value - (back[j] + alpha * delta[j])) <= 2) &&
      uiContrast('rgb(' + rgb.join(',') + ')', background) >= 3
    )
      count++
  }
  return count
}

function pngColorCount(bytes: Buffer, css: string): number {
  const expected = css
    .match(/[0-9.]+/g)
    ?.slice(0, 3)
    .map(Number)
  if (!expected || expected.length !== 3) throw Error('Unresolved glyph foreground ' + css)
  let width = 0,
    height = 0,
    channels = 0
  const blocks: Buffer[] = []
  for (let at = 8; at < bytes.length;) {
    const size = bytes.readUInt32BE(at),
      type = bytes.toString('ascii', at + 4, at + 8),
      data = bytes.subarray(at + 8, at + 8 + size)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0
      if (data[8] !== 8 || data[12] !== 0 || !channels)
        throw Error('Unsupported screenshot PNG layout')
    }
    if (type === 'IDAT') blocks.push(data)
    at += size + 12
  }
  const raw = inflateSync(Buffer.concat(blocks)),
    stride = width * channels,
    image = Buffer.alloc(stride * height)
  let input = 0,
    count = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[input++]
    for (let x = 0; x < stride; x++) {
      const index = y * stride + x,
        left = x >= channels ? image[index - channels] : 0,
        up = y > 0 ? image[index - stride] : 0,
        diagonal = y > 0 && x >= channels ? image[index - stride - channels] : 0
      let predictor = 0
      if (filter === 1) predictor = left
      else if (filter === 2) predictor = up
      else if (filter === 3) predictor = Math.floor((left + up) / 2)
      else if (filter === 4) {
        const p = left + up - diagonal,
          a = Math.abs(p - left),
          b = Math.abs(p - up),
          c = Math.abs(p - diagonal)
        predictor = a <= b && a <= c ? left : b <= c ? up : diagonal
      } else if (filter !== 0) throw Error('Unsupported screenshot PNG filter')
      image[index] = (raw[input++] + predictor) & 255
    }
  }
  for (let i = 0; i < image.length; i += channels)
    if (
      (channels === 3 || image[i + 3] >= 200) &&
      expected.every((value, channel) => Math.abs(image[i + channel] - value) <= 2)
    )
      count++
  return count
}

// eslint-disable-next-line no-empty-pattern
test('P01-REFLOW actual open chain reconciles resize and media without observer churn or semantic actions', async ({}, info) => {
  test.setTimeout(120000)
  const f = await diagramFixture('frame', { mode: 'dark', density: 'comfortable' })
  const observations: unknown[] = []
  try {
    const frame = f.page.frameLocator('iframe')
    await expect.poll(() => frame.locator('body').evaluate(() => !!(window as any).__p01Ui)).toBe(true)
    const fileBefore = await readFile(f.file, 'utf8')
    const semantics = () => frame.locator('body').evaluate(() => {
      const ui = (window as any).__p01Ui, g = ui.editor.graph
      return { xml: (window as any).mxUtils.getXml(new (window as any).mxCodec().encode(g.getModel())), background:g.background,gridSize:g.gridSize,gridEnabled:g.isGridEnabled(),selection: g.getSelectionCells().map((c: any) => c.id),
        undo: ui.editor.undoManager.indexOfNextAdd, history: ui.editor.undoManager.history.length, preferences: { ...localStorage } }
    })
    await frame.locator('.geDiagramContainer').click({ position: { x: 80, y: 200 } })
    const before = await semantics()
    await f.page.keyboard.press('F6')
    await frame.locator('.geTabContainer .geControlTab[aria-haspopup="menu"]').focus()
    await f.page.keyboard.press('Enter')
    await frame.locator('[data-frade-lower-menu] [aria-haspopup="menu"][aria-disabled="false"]').first().focus()
    await f.page.keyboard.press('ArrowRight')
    await expect(frame.locator('[data-frade-lower-menu][role="menu"]')).toHaveCount(2)
    await frame.locator('body').evaluate(() => {
      const ui = (window as any).__p01Ui
      ;(window as any).__p01ReflowReferences = { ui, graph: ui.editor.graph, menu: ui.currentMenu,
        nodes: Array.from(document.querySelectorAll('[data-frade-lower-menu][role="menu"]')), viewEvents: [] }
      const references = (window as any).__p01ReflowReferences
      references.viewListener = () => references.viewEvents.push({ at:performance.now(),scale:ui.editor.graph.view.scale,translate:{...ui.editor.graph.view.translate},stack:new Error('original view event').stack })
      for (const event of ['scale','translate','scaleAndTranslate']) ui.editor.graph.view.addListener(event,references.viewListener)
    })
    const inspect = async (label: string) => {
      await p01WaitNativeResizeSettlement(f.page, info, label)
      await frame.locator('body').evaluate(async () => {
        await document.fonts.ready
        const g = (window as any).__p01Ui.editor.graph
        const signature = () => { const b=g.container.getBoundingClientRect();return JSON.stringify([g.view.scale,g.view.translate.x,g.view.translate.y,b.x,b.y,b.width,b.height]) }
        let previous=signature(),stable=0
        for (let n=0;n<120 && stable<6;n++) { await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));const next=signature();stable=previous===next?stable+1:0;previous=next }
        if(stable<6)throw Error('Original resize/view geometry did not settle')
      })
      const record = await frame.locator('body').evaluate(async () => {
        const refs = (window as any).__p01ReflowReferences, ui = (window as any).__p01Ui, g = ui.editor.graph
        const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-frade-lower-menu][role="menu"]'))
        const dimensions = (b: DOMRect) => ({ left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height })
        const targets = nodes.map(node => Array.from(node.querySelectorAll<HTMLElement>('[role^="menuitem"]')).filter(row => getComputedStyle(row).display !== 'none').map(row => {
          const b = row.getBoundingClientRect(), hit = document.elementFromPoint(b.left+b.width/2,b.top+b.height/2)
          return { label: row.getAttribute('aria-label'), box: dimensions(b), hit: hit === row || !!hit && row.contains(hit) }
        }))
        const projected = nodes.flatMap(node => [node,...node.querySelectorAll<HTMLElement>('table,td')])
        const styles = projected.map(node => node.getAttribute('style'))
        const view = JSON.stringify([g.view.scale,g.view.translate.x,g.view.translate.y])
        const viewportXml = (window as any).mxUtils.getXml(ui.editor.getGraphXml())
        let writes = 0
        const observer = new MutationObserver(records => { writes += records.length })
        for (const node of nodes) observer.observe(node, { attributes:true,subtree:true,attributeFilter:['style'] })
        for (let n = 0; n < 6; n++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
        observer.disconnect()
        return { viewport: { width:innerWidth,height:innerHeight }, panels:nodes.map(node=>dimensions(node.getBoundingClientRect())),targets,
          sameNodes:nodes.length===refs.nodes.length && nodes.every((node,n)=>node===refs.nodes[n]),sameIdentity:ui===refs.ui && g===refs.graph && ui.currentMenu===refs.menu,
          exactStyles:JSON.stringify(styles)===JSON.stringify(projected.map(node=>node.getAttribute('style'))),writes,
          viewportXmlPreserved:(window as any).mxUtils.getXml(ui.editor.getGraphXml())===viewportXml,
          viewBefore:view,viewAfter:JSON.stringify([g.view.scale,g.view.translate.x,g.view.translate.y]),viewEvents:[...refs.viewEvents],
          viewPreserved:JSON.stringify([g.view.scale,g.view.translate.x,g.view.translate.y])===view,
          media:{ forced:matchMedia('(forced-colors:active)').matches,coarse:matchMedia('(pointer:coarse)').matches,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches } }
      })
      observations.push({label,...record})
      expect(record.sameIdentity).toBe(true);expect(record.sameNodes).toBe(true)
      expect(record.writes).toBe(0);expect(record.exactStyles).toBe(true);expect(record.viewPreserved).toBe(true);expect(record.viewportXmlPreserved).toBe(true)
      for (const panel of record.panels) { expect(panel.left).toBeGreaterThanOrEqual(0);expect(panel.top).toBeGreaterThanOrEqual(0)
        expect(panel.right).toBeLessThanOrEqual(record.viewport.width);expect(panel.bottom).toBeLessThanOrEqual(record.viewport.height) }
      for (const group of record.targets) for (const target of group) { const b=target.box
        expect(target.hit).toBe(true);expect(target.label).toBeTruthy();expect(b.left-4).toBeGreaterThanOrEqual(0);expect(b.top-4).toBeGreaterThanOrEqual(0)
        expect(b.right+4).toBeLessThanOrEqual(record.viewport.width);expect(b.bottom+4).toBeLessThanOrEqual(record.viewport.height)
        expect(b.height).toBeGreaterThanOrEqual(record.media.coarse?44:36);expect(b.width).toBeGreaterThanOrEqual(record.media.coarse?44:24) }
      for (const a of record.targets[0]) for (const b of record.targets[1])
        expect(a.box.right+8<=b.box.left || b.box.right+8<=a.box.left || a.box.bottom+8<=b.box.top || b.box.bottom+8<=a.box.top).toBe(true)
      expect(await semantics()).toEqual(before);expect(await readFile(f.file,'utf8')).toBe(fileBefore)
      await f.page.screenshot({path:info.outputPath(label+'.png')})
      return record
    }
    await inspect('open-chain-1280')
    const originalResize = async (width:number,height:number) => {
      const events = await frame.locator('body').evaluate(() => (window as any).__p01ReflowReferences.viewEvents.length)
      await f.page.setViewportSize({width,height})
      // Original windowResized queues sizeDidChange in a timer; a stable RAF
      // signature can precede that callback. Wait for its observed real event.
      await expect.poll(() => frame.locator('body').evaluate(() => (window as any).__p01ReflowReferences.viewEvents.length)).toBeGreaterThan(events)
    }
    await originalResize(850,650);await inspect('open-chain-850')
    await originalResize(1280,850);await inspect('open-chain-restored-1280')
    await f.page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'})
    const child=f.page.frames().find(value=>value.url().startsWith('frade://drawio/'))!
    const session=await f.page.context().newCDPSession(child)
    await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
    const coarse = await inspect('open-chain-coarse-reduced')
    expect(coarse.media).toEqual({forced:false,coarse:true,reduced:true})
    const changeForced = async (forcedColors:'active'|'none') => {
      const revision = await frame.locator('html').getAttribute('data-frade-frame-revision')
      await f.page.emulateMedia({forcedColors,reducedMotion:'reduce'})
      // Forced colors creates a new authoritative presentation generation.
      // Its approved apply lifecycle cancels the old owned menu; retain that guard.
      await expect.poll(() => frame.locator('html').getAttribute('data-frade-frame-revision')).not.toBe(revision)
      await expect(frame.locator('[data-frade-lower-menu]')).toHaveCount(0)
      const canceled = await frame.locator('body').evaluate(() => {
        const refs=(window as any).__p01ReflowReferences,ui=(window as any).__p01Ui
        refs.graph.view.removeListener(refs.viewListener)
        return { sameUi:ui===refs.ui,sameGraph:ui.editor.graph===refs.graph,
          nodesRestored:refs.nodes.every((node:HTMLElement)=>!node.isConnected && !node.hasAttribute('data-frade-lower-menu') && !node.hasAttribute('role')),
          layoutRestored:refs.nodes.every((node:HTMLElement)=>[node,...node.querySelectorAll<HTMLElement>('table,td')].every(n=>['width','max-width','white-space','overflow-wrap'].every(name=>n.style.getPropertyPriority(name)!=='important'))) }
      })
      observations.push({label:'forced-generation-cancel-'+forcedColors,canceled})
      expect(canceled.sameUi).toBe(true);expect(canceled.sameGraph).toBe(true);expect(canceled.nodesRestored).toBe(true);expect(canceled.layoutRestored).toBe(true)
      expect(await semantics()).toEqual(before);expect(await readFile(f.file,'utf8')).toBe(fileBefore)
      await frame.locator('.geTabContainer .geControlTab[aria-haspopup="menu"]').focus();await f.page.keyboard.press('Enter')
      await frame.locator('[data-frade-lower-menu] [aria-haspopup="menu"][aria-disabled="false"]').first().focus();await f.page.keyboard.press('ArrowRight')
      await expect(frame.locator('[data-frade-lower-menu][role="menu"]')).toHaveCount(2)
      await frame.locator('body').evaluate(() => { const refs=(window as any).__p01ReflowReferences,ui=(window as any).__p01Ui
        refs.menu=ui.currentMenu;refs.nodes=Array.from(document.querySelectorAll('[data-frade-lower-menu][role="menu"]'));refs.graph.view.addListener('translate',refs.viewListener) })
    }
    await changeForced('active')
    const actual=await inspect('open-chain-forced-coarse-reduced')
    expect(actual.media).toEqual({forced:true,coarse:true,reduced:true})
    await session.send('Emulation.setTouchEmulationEnabled',{enabled:false});await session.detach()
    await changeForced('none')
    await f.page.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'})
    await inspect('open-chain-media-restored')
    await frame.locator('body').evaluate(() => { const refs=(window as any).__p01ReflowReferences;refs.graph.view.removeListener(refs.viewListener) })
    await f.page.keyboard.press('ArrowLeft');await expect(frame.locator('[data-frade-lower-menu]')).toHaveCount(1)
    await f.page.keyboard.press('Escape');await expect(frame.locator('[data-frade-lower-menu]')).toHaveCount(0)
    expect(await semantics()).toEqual(before);expect(await readFile(f.file,'utf8')).toBe(fileBefore)
  } finally {
    await writeFile(info.outputPath('open-chain-observations.json'),JSON.stringify({observations,visualApproval:'NOT_APPROVED'},null,2))
    await finishDiagramFixture(f.app)
  }
})

// eslint-disable-next-line no-empty-pattern
test('P01-B05 actual settled lower refusal stays live through failed publication, preserves semantics and permits original feasible retry', async ({}, info) => {
  test.setTimeout(120000)
  const f=await diagramFixture('frame',{mode:'light',density:'comfortable'}),observations:unknown[]=[]
  try {
    const frame=f.page.frameLocator('iframe'),host=f.page.locator('iframe'),fileBefore=await readFile(f.file,'utf8')
    const settingsPath=join(f.fixture.destination,'p01-frame-profile','presentation-settings.json'),settingsBefore=await readFile(settingsPath,'utf8')
    await expect.poll(()=>frame.locator('body').evaluate(()=>!!(window as any).__p01Ui)).toBe(true)
    const semantics=()=>frame.locator('body').evaluate(()=>{const ui=(window as any).__p01Ui,g=ui.editor.graph
      return {xml:(window as any).mxUtils.getXml(new (window as any).mxCodec().encode(g.getModel())),undo:ui.editor.undoManager.indexOfNextAdd,history:ui.editor.undoManager.history.length,selection:g.getSelectionCells().map((c:any)=>c.id),background:g.background,grid:g.gridSize,preferences:{...localStorage}}})
    const before=await semantics(),revision=await host.getAttribute('data-frade-revision')
    await f.page.evaluate(()=>{const frame=document.querySelector('iframe')!,records=((window as any).__p01B05Replies=[] as Record<string,unknown>[])
      window.addEventListener('message',event=>{if(event.source!==frame.contentWindow||event.origin!=='frade://drawio'||typeof event.data!=='string')return
        const data=JSON.parse(event.data);if(data.event==='fradePresentation'&&data.status==='REFUSED')records.push(data)
      })
    })
    await frame.locator('body').evaluate(()=>{const ui=(window as any).__p01Ui
      const refs=((window as any).__p01B05={ui,graph:ui.editor.graph,roots:[] as HTMLElement[],prior:new Map<Element,Map<string,string|null>>(),observer:undefined as MutationObserver|undefined})
      refs.observer=new MutationObserver((records)=>{for(const record of records){const node=record.target as HTMLElement,name=record.attributeName!
        if(name==='data-frade-lower-menu' && node.hasAttribute(name) && !refs.roots.includes(node))refs.roots.push(node)
        if(!refs.roots.some((root:HTMLElement)=>root===node||root.contains(node)))continue
        const attrs=refs.prior.get(node)??new Map<string,string|null>();if(!attrs.has(name))attrs.set(name,record.oldValue);refs.prior.set(node,attrs)
      }})
      refs.observer.observe(document.body,{subtree:true,attributes:true,attributeOldValue:true,attributeFilter:['style','role','aria-label','aria-disabled','tabindex','aria-haspopup','aria-expanded','aria-checked','aria-hidden','data-frade-lower-menu']})
    })
    const opener=frame.locator('.geTabContainer .geControlTab[aria-haspopup="menu"]')
    await opener.focus();await f.page.keyboard.press('Enter')
    await frame.locator('[data-frade-lower-menu] [aria-haspopup="menu"][aria-disabled="false"]').first().focus();await f.page.keyboard.press('ArrowRight')
    await expect(frame.locator('[data-frade-lower-menu][role="menu"]')).toHaveCount(2)
    await frame.locator('body').evaluate(()=>{const refs=(window as any).__p01B05;refs.classes=refs.roots.flatMap((root:HTMLElement)=>[root,...root.querySelectorAll('*')]).map((node:Element)=>({node,value:node.getAttribute('class')}))})
    // Genuine iframe capacity, no forged reply or production test API.
    const originalStyle=await host.getAttribute('style')
    await host.evaluate(node=>node.style.width='88px')
    await expect.poll(()=>frame.locator('body').evaluate(()=>innerWidth)).toBe(88)
    const live=f.page.getByRole('status').filter({hasText:'Меню страниц не помещается'})
    await expect(live).toBeVisible();await expect(live).toHaveAttribute('aria-live','polite')
    await expect(host).toBeVisible();await expect(frame.locator('[data-frade-lower-menu]')).toHaveCount(0)
    await expect(opener).toHaveAttribute('aria-expanded','false')
    const restored=await frame.locator('body').evaluate(async()=>{const refs=(window as any).__p01B05;await new Promise<void>(r=>requestAnimationFrame(()=>r()))
      refs.observer.disconnect()
      return {sameIdentity:refs.ui===(window as any).__p01Ui&&refs.graph===(window as any).__p01Ui.editor.graph,menuGone:!(window as any).__p01Ui.currentMenu,
        restored:refs.roots.every((root:HTMLElement)=>!root.isConnected)&&Array.from(refs.prior as Map<Element,Map<string,string|null>>).every(([node,attrs])=>Array.from(attrs).every(([name,value])=>node.getAttribute(name)===value)),
        vendorClassesPreserved:refs.classes.every(({node,value}:{node:Element;value:string|null})=>node.getAttribute('class')===value),
        mismatches:Array.from(refs.prior as Map<Element,Map<string,string|null>>).flatMap(([node,attrs])=>Array.from(attrs).filter(([name,value])=>node.getAttribute(name)!==value).map(([name,value])=>({node:node.tagName,class:node.className,name,before:value,after:node.getAttribute(name)}))),
        roots:refs.roots.length,focus:document.activeElement?.getAttribute('aria-label')}
    })
    observations.push({label:'actual-refusal',restored});expect(restored.sameIdentity).toBe(true);expect(restored.menuGone).toBe(true);expect(restored.restored).toBe(true);expect(restored.vendorClassesPreserved).toBe(true);expect(restored.roots).toBe(2);expect(await f.page.evaluate(()=>(window as any).__p01B05Replies.filter((r:any)=>r.message?.startsWith('LOWER_MENU_REFLOW_UNAVAILABLE')).length)).toBe(1)
    expect(await semantics()).toEqual(before);expect(await host.getAttribute('data-frade-revision')).toBe(revision)
    expect(await readFile(f.file,'utf8')).toBe(fileBefore);expect(await readFile(settingsPath,'utf8')).toBe(settingsBefore)
    await f.page.screenshot({path:info.outputPath('b05-live-refusal.png')})
    await host.evaluate((node,style)=>{if(style===null)node.removeAttribute('style');else node.setAttribute('style',style)},originalStyle)
    await expect.poll(()=>frame.locator('body').evaluate(()=>innerWidth)).toBeGreaterThan(88)
    await opener.focus();await f.page.keyboard.press('Enter')
    await expect(frame.locator('[data-frade-lower-menu][role="menu"]')).toHaveCount(1)
    await expect(live).toBeVisible() // feasible reopen is not an unauthenticated parent recovery ACK
    await f.page.keyboard.press('Escape');await expect(frame.locator('[data-frade-lower-menu]')).toHaveCount(0)
    await frame.locator('body').evaluate(()=>{(window as any).__p01RefuseDark=true})
    await f.page.getByRole('button',{name:'Меню Файл'}).click();await f.page.getByRole('menuitem',{name:'Выбрать тему…'}).click();await f.page.getByRole('option',{name:/Dark/}).click()
    await expect(f.page.getByRole('status').filter({hasText:'Controlled current frame refusal'})).toBeVisible()
    await expect(live).toBeVisible();await expect(host).toBeVisible()
    expect(await host.getAttribute('data-frade-revision')).toBe(revision)
    observations.push({label:'failed-same-revision-publication',revision,liveRetained:true})
    await f.page.keyboard.press('Escape');await expect(f.page.getByRole('dialog',{name:'Выбор темы'})).toHaveCount(0)
    await expect.poll(()=>host.getAttribute('data-frade-revision')).not.toBe(revision)
    await expect(host).toHaveAttribute('data-frade-revision',(await f.page.locator('html').getAttribute('data-frade-revision'))!)
    await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
    await expect(live).toHaveCount(0)
    observations.push({label:'successful-authoritative-cancel-boundary',revision:await host.getAttribute('data-frade-revision'),oldDiagnosticCleared:true})
    await frame.locator('body').evaluate(()=>{(window as any).__p01RefuseDark=false})
    await previewDark(f.page);await expect(host).toHaveAttribute('data-frade-revision',(await f.page.locator('html').getAttribute('data-frade-revision'))!)
    await expect(live).toHaveCount(0)
    await f.page.keyboard.press('Escape');await expect(f.page.getByRole('dialog',{name:'Выбор темы'})).toHaveCount(0)
    expect(await semantics()).toEqual(before);expect(await readFile(f.file,'utf8')).toBe(fileBefore);expect(await readFile(settingsPath,'utf8')).toBe(settingsBefore)
    await f.page.screenshot({path:info.outputPath('b05-feasible-retry.png')})
    observations.push({label:'feasible-retry-and-authoritative-owner-boundary',semanticPreservation:true,durablePreservation:true})
  } finally {await writeFile(info.outputPath('b05-observations.json'),JSON.stringify({observations,visualApproval:'NOT_APPROVED'},null,2));await finishDiagramFixture(f.app)}
})


// P01 FUI coverage: original callsites above remain exact historical assertions.
import { createHash } from 'node:crypto'
import { builtinTokens } from '@frade/ui-workspace/design/tokens'
type FuiFixture = Awaited<ReturnType<typeof diagramFixture>>
type FuiKind = 'native' | 'frame'
const fuiHash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex')
const fuiSettings = (f: FuiFixture, kind: FuiKind) =>
  join(f.fixture.destination, 'p01-' + kind + '-profile', 'presentation-settings.json')
async function fuiFiles(f: FuiFixture) {
  const records: Record<string, string> = {}
  for (const file of f.fixture.manifest.files.filter((file: { path: string }) => file.path.startsWith('KA/')))
    records[file.path] = fuiHash(await readFile(join(f.fixture.destination, file.path)))
  records.diagram = fuiHash(await readFile(f.file))
  expect(Object.keys(records).length).toBeGreaterThan(1)
  return records
}
async function fuiSemantics(f: FuiFixture, kind: FuiKind) {
  if (kind === 'native')
    return f.page.locator('.frade-canvas .canvas').evaluate((canvas) => {
      const node = canvas.querySelector<SVGGElement>('.x6-node[data-cell-id="authored"]')!
      const rect = node.querySelector('rect')!
      return {
        geometry: node.getAttribute('transform'),
        fill: rect.getAttribute('fill'), stroke: rect.getAttribute('stroke'),
        selection: canvas.querySelectorAll('.x6-widget-selection-box').length,
        canvasIdentity: canvas === (window as any).__fuiCanvas,
        nodeIdentity: node === (window as any).__fuiNode,
      }
    })
  return f.page.frameLocator('iframe').locator('body').evaluate(() => {
    const ui = (window as any).__p01Ui, graph = ui.editor.graph,
      geometry = graph.getModel().getCell('authored').geometry,
      container = graph.container
    return {
      geometry: { x: geometry.x, y: geometry.y, width: geometry.width, height: geometry.height },
      xml: (window as any).mxUtils.getXml(ui.editor.getGraphXml()),
      selection: graph.getSelectionCells().map((cell: any) => cell.id),
      history: ui.editor.undoManager.history.length, cursor: ui.editor.undoManager.indexOfNextAdd,
      preferences: { ...localStorage }, page: ui.currentPage.id,
      background: graph.background, gridColor: graph.gridColor, gridEnabled: graph.gridEnabled,
      scale: graph.view.scale, translate: { x: graph.view.translate.x, y: graph.view.translate.y },
      scroll: { left: container.scrollLeft, top: container.scrollTop },
      uiIdentity: ui === (window as any).__fuiUi, graphIdentity: graph === (window as any).__fuiGraph,
    }
  })
}
async function fuiMove(f: FuiFixture, kind: FuiKind) {
  let box: { x: number; y: number; width: number; height: number }
  if (kind === 'native') {
    const canvas = f.page.locator('.frade-canvas .canvas'), node = canvas.locator('.x6-node[data-cell-id="authored"]')
    await expect(node).toBeVisible()
    await canvas.evaluate((canvas) => {
      ;(window as any).__fuiCanvas = canvas
      ;(window as any).__fuiNode = canvas.querySelector('.x6-node[data-cell-id="authored"]')
    })
    box = (await node.boundingBox())!
  } else {
    const body = f.page.frameLocator('iframe').locator('body')
    await expect.poll(() => body.evaluate(() => !!(window as any).__p01Ui)).toBe(true)
    const inner = await body.evaluate(() => {
      const ui = (window as any).__p01Ui, graph = ui.editor.graph
      ;(window as any).__fuiUi = ui
      ;(window as any).__fuiGraph = graph
      return graph.view.getState(graph.getModel().getCell('authored')).shape.node.getBoundingClientRect().toJSON()
    })
    const outer = (await f.page.locator('iframe').boundingBox())!
    box = { ...inner, x: outer.x + inner.x, y: outer.y + inner.y }
  }
  const before = (await fuiSemantics(f, kind)).geometry
  expect(box.width).toBeGreaterThan(0); expect(box.height).toBeGreaterThan(0)
  await f.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await f.page.mouse.down()
  await f.page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20, { steps: 5 })
  await f.page.mouse.up()
  await expect.poll(async () => (await fuiSemantics(f, kind)).geometry).not.toEqual(before)
  await expect(f.page.locator('.dirty-dot')).toHaveCount(1)
  const after = await fuiSemantics(f, kind)
  if (kind === 'frame') expect((after as any).history).toBeGreaterThan(0)
  return { before, moved: after.geometry }
}
async function fuiDirtyObject(f: FuiFixture, text: string) {
  await f.page.getByLabel('Поиск объектов', { exact: true }).fill('ecogroup.berezka.systems.berezka')
  await f.page.locator('[data-object-id="ecogroup.berezka.systems.berezka"]').dblclick()
  const editor = f.page.locator('.field[data-field-path="description"] textarea')
  await editor.fill(text)
  await editor.evaluate((node) => { (window as any).__fuiDirtyEditor = node })
  await expect(f.page.locator('.dirty-dot')).toHaveCount(2)
  await f.page.evaluate(async () => { await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))) })
  return editor
}
async function fuiRevisionAndPalette(f: FuiFixture, kind: FuiKind, mode: 'light' | 'dark' | 'high-contrast') {
  const root = f.page.locator('html'), revision = (await root.getAttribute('data-frade-revision'))!
  await expect(root).toHaveAttribute('data-frade-theme', mode)
  await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
  const participant = kind === 'native' ? f.page.locator('.frade-canvas .canvas') : f.page.locator('iframe')
  await expect(participant).toHaveAttribute('data-frade-revision', revision)
  const roles = Object.entries(builtinTokens.themes[mode])
  const projected = await f.page.getByRole('dialog', { name: 'Настройки интерфейса' }).evaluate((dialog, roles) => {
    const root = getComputedStyle(document.documentElement), portal = getComputedStyle(dialog)
    return { managed: !!dialog.closest('#frade-overlay-host'), roles: roles.map(([role, color]) => {
      const variable = '--frade-' + role.replaceAll('.', '-')
      return { role, wanted: color, root: root.getPropertyValue(variable).trim(), portal: portal.getPropertyValue(variable).trim() }
    }) }
  }, roles)
  expect(projected.managed).toBe(true)
  expect(projected.roles).toHaveLength(31)
  for (const role of projected.roles) { expect(role.root.toUpperCase()).toBe(role.wanted); expect(role.portal.toUpperCase()).toBe(role.wanted) }
  const requiredRoot = kind === 'native' ? participant : f.page.frameLocator('iframe').locator('html')
  await expect(requiredRoot).toHaveAttribute(kind === 'native' ? 'data-frade-theme' : 'data-frade-frame-theme', mode)
  await expect(requiredRoot).toHaveAttribute(kind === 'native' ? 'data-frade-revision' : 'data-frade-frame-revision', revision)
  const required = await requiredRoot.evaluate((node, input) => {
    const style = getComputedStyle(node), prefix = input.kind === 'native' ? '--frade-' : '--frade-frame-'
    return input.roles.map(([role, wanted]) => ({ role, wanted, actual: style.getPropertyValue(prefix + role.replaceAll('.', '-')).trim() }))
  }, { kind, roles })
  expect(required).toHaveLength(31)
  for (const role of required) expect(role.actual.toUpperCase()).toBe(role.wanted)
  return { revision, projected, required }
}
async function fuiUndoRedo(f: FuiFixture, kind: FuiKind, movement: Awaited<ReturnType<typeof fuiMove>>) {
  const diagramTab = f.page.getByRole('tab').filter({ hasText: f.name })
  await expect(diagramTab).toHaveCount(1)
  await diagramTab.click()
  if (kind === 'native') await f.page.getByRole('button', { name: 'Undo', exact: true }).click()
  else {
    await f.page.frameLocator('iframe').locator('.geDiagramContainer').click({ position: { x: 30, y: 30 } })
    await f.page.keyboard.press('Control+z')
  }
  await expect.poll(async () => (await fuiSemantics(f, kind)).geometry).toEqual(movement.before)
  if (kind === 'native') await f.page.getByRole('button', { name: 'Redo', exact: true }).click()
  else await f.page.keyboard.press('Control+y')
  await expect.poll(async () => (await fuiSemantics(f, kind)).geometry).toEqual(movement.moved)
}
for (const mode of ['light', 'dark', 'high-contrast'] as const)
  for (const kind of ['native', 'frame'] as const) {
    // eslint-disable-next-line no-empty-pattern
    test('P01-FUI005 ' + mode + ' ' + kind, async ({}, info) => {
      test.setTimeout(120000)
      const f = await diagramFixture(kind, { mode: mode === 'light' ? 'dark' : 'light', density: 'compact' })
      try {
        const movement = await fuiMove(f, kind), activeSetup = await fuiSemantics(f, kind), files = await fuiFiles(f),
          editor = await fuiDirtyObject(f, 'FUI005 unsaved ' + mode + ' ' + kind), before = await fuiSemantics(f, kind)
        expect(before.geometry).toEqual(activeSetup.geometry)
        expect(before.selection).toEqual(activeSetup.selection)
        await applyActualPresentation(f.page, mode, 'compact')
        // Keep an actual managed portal open while checking inherited complete snapshot.
        await f.page.getByRole('button', { name: 'Меню Файл' }).click()
        await f.page.getByRole('menuitem', { name: 'Настройки интерфейса' }).click()
        const projection = await fuiRevisionAndPalette(f, kind, mode)
        expect(JSON.parse(await readFile(fuiSettings(f, kind), 'utf8')).selection.mode).toBe(mode)
        expect(await fuiSemantics(f, kind)).toEqual(before)
        expect(await fuiFiles(f)).toEqual(files)
        await expect(editor).toHaveValue('FUI005 unsaved ' + mode + ' ' + kind)
        expect(await editor.evaluate((node) => node === (window as any).__fuiDirtyEditor)).toBe(true)
        await expect(f.page.locator('.dirty-dot')).toHaveCount(2)
        await f.page.getByRole('button', { name: 'Закрыть', exact: true }).click()
        await fuiUndoRedo(f, kind, movement)
        expect(await fuiFiles(f)).toEqual(files)
        await writeFile(info.outputPath('fui-observations.json'), JSON.stringify({ id: 'FUI-005/' + mode, kind, projection, meaningfulUndoRedo: true, noThemeSetup: { active: activeSetup, parked: before }, retained: before, fileHashes: files, visualApproval: 'NOT_APPROVED' }, null, 2))
        await f.page.screenshot({ path: info.outputPath('fui005-' + mode + '-' + kind + '.png') })
      } finally { await finishDiagramFixture(f.app) }
    })
  }
for (const kind of ['native', 'frame'] as const) {
  // eslint-disable-next-line no-empty-pattern
  test('P01-FUI006 ' + kind, async ({}, info) => {
    test.setTimeout(120000)
    const f = await diagramFixture(kind, { mode: 'light', density: 'compact' })
    try {
      await fuiMove(f, kind)
      const activeSetup = await fuiSemantics(f, kind), files = await fuiFiles(f), durable = await readFile(fuiSettings(f, kind), 'utf8'),
        editor = await fuiDirtyObject(f, 'FUI006 retained dirty ' + kind), before = await fuiSemantics(f, kind)
      expect(before.geometry).toEqual(activeSetup.geometry)
      expect(before.selection).toEqual(activeSetup.selection)
      await previewDark(f.page)
      await expect(f.page.locator('html')).toHaveAttribute('data-frade-theme', 'dark')
      await expect(kind === 'native' ? f.page.locator('.frade-canvas .canvas') : f.page.frameLocator('iframe').locator('html')).toHaveAttribute(kind === 'native' ? 'data-frade-theme' : 'data-frade-frame-theme', 'dark')
      expect(await readFile(fuiSettings(f, kind), 'utf8')).toBe(durable)
      await f.page.keyboard.press('Escape')
      await expect(f.page.getByRole('dialog', { name: 'Выбор темы' })).toHaveCount(0)
      await expect(f.page.locator('html')).toHaveAttribute('data-frade-theme', 'light')
      await expect(kind === 'native' ? f.page.locator('.frade-canvas .canvas') : f.page.frameLocator('iframe').locator('html')).toHaveAttribute(kind === 'native' ? 'data-frade-theme' : 'data-frade-frame-theme', 'light')
      expect(await readFile(fuiSettings(f, kind), 'utf8')).toBe(durable)
      expect(await fuiSemantics(f, kind)).toEqual(before); expect(await fuiFiles(f)).toEqual(files)
      await expect(editor).toHaveValue('FUI006 retained dirty ' + kind)
      expect(await editor.evaluate((node) => node === (window as any).__fuiDirtyEditor)).toBe(true)
      await expect(f.page.locator('.dirty-dot')).toHaveCount(2)
      await writeFile(info.outputPath('fui-observations.json'), JSON.stringify({ id: 'FUI-006', kind, durableSha256: fuiHash(durable), noThemeSetup: { active: activeSetup, parked: before }, retained: before, fileHashes: files, visualApproval: 'NOT_APPROVED' }, null, 2))
    } finally { await finishDiagramFixture(f.app) }
  })
}
// eslint-disable-next-line no-empty-pattern
 test('P01-FUI007 required frame preparation refuses direct durable commit', async ({}, info) => {
  test.setTimeout(120000)
  const f = await diagramFixture('frame', { mode: 'light', density: 'compact' })
  try {
    await fuiMove(f, 'frame')
    const before = await fuiSemantics(f, 'frame'), files = await fuiFiles(f), durable = await readFile(fuiSettings(f, 'frame'), 'utf8')
    await f.page.frameLocator('iframe').locator('body').evaluate(() => { (window as any).__p01RefuseDark = true })
    await f.page.getByRole('button', { name: 'Меню Файл' }).click()
    await f.page.getByRole('menuitem', { name: 'Выбрать тему…' }).click()
    await f.page.getByRole('option', { name: /Dark/ }).focus()
    await f.page.keyboard.press('Enter')
    const dialog = f.page.getByRole('dialog', { name: 'Выбор темы' })
    await expect(dialog.getByRole('status')).toContainText('Controlled current frame refusal')
    await expect(dialog.getByRole('status')).not.toContainText('Сохранено')
    await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
    await expect(f.page.locator('html')).toHaveAttribute('data-frade-theme', 'light')
    await expect(f.page.frameLocator('iframe').locator('html')).toHaveAttribute('data-frade-frame-theme', 'light')
    expect(await readFile(fuiSettings(f, 'frame'), 'utf8')).toBe(durable)
    expect(await fuiSemantics(f, 'frame')).toEqual(before); expect(await fuiFiles(f)).toEqual(files)
    await writeFile(info.outputPath('fui-observations.json'), JSON.stringify({ id: 'FUI-007', durableSha256: fuiHash(durable), retained: before, fileHashes: files, visualApproval: 'NOT_APPROVED' }, null, 2))
  } finally { await finishDiagramFixture(f.app) }
})
async function fuiComfortableControls(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Настройки интерфейса' })
  const controls = await dialog.evaluate(async (dialog) => {
    await document.fonts.ready
    const rect = dialog.getBoundingClientRect()
    return { dialog: rect.toJSON(), width: innerWidth, height: innerHeight, controls: Array.from(dialog.querySelectorAll<HTMLElement>('input[type=radio],button')).map((node) => {
      const target = node.matches('input') ? node.closest('label')! : node, box = target.getBoundingClientRect(), style = getComputedStyle(target)
      return { label: target.textContent?.trim(), box: box.toJSON(), visibility: style.visibility, display: style.display }
    }) }
  })
  // Six named radio labels and three real action buttons; no visibility/clipping filter.
  expect(controls.controls).toHaveLength(9)
  expect(controls.dialog.width).toBeGreaterThan(0)
  for (const target of controls.controls) {
    expect(target.label).toBeTruthy(); expect(target.visibility).toBe('visible'); expect(target.display).not.toBe('none')
    expect(target.box.height).toBeGreaterThanOrEqual(36); expect(target.box.width).toBeGreaterThanOrEqual(24)
    expect(target.box.left).toBeGreaterThanOrEqual(0); expect(target.box.top).toBeGreaterThanOrEqual(0)
    expect(target.box.right).toBeLessThanOrEqual(controls.width); expect(target.box.bottom).toBeLessThanOrEqual(controls.height)
    expect(target.box.left).toBeGreaterThanOrEqual(controls.dialog.left); expect(target.box.right).toBeLessThanOrEqual(controls.dialog.right)
    expect(target.box.top).toBeGreaterThanOrEqual(controls.dialog.top); expect(target.box.bottom).toBeLessThanOrEqual(controls.dialog.bottom)
  }
  return controls
}
for (const kind of ['native', 'frame'] as const) {
  // eslint-disable-next-line no-empty-pattern
  test('P01-FUI009 dark comfortable selected and restored ' + kind, async ({}, info) => {
    test.setTimeout(120000)
    const f = await diagramFixture(kind, { mode: 'dark', density: 'compact' }), profile = join(f.fixture.destination, 'p01-' + kind + '-profile')
    let closed = false
    try {
      await expect(f.page.locator('html')).toHaveAttribute('data-frade-theme', 'dark')
      await expect(f.page.locator('html')).toHaveAttribute('data-frade-density', 'compact')
      await f.page.getByRole('button', { name: 'Меню Файл' }).click()
      await f.page.getByRole('menuitem', { name: 'Настройки интерфейса' }).click()
      const dialog = f.page.getByRole('dialog', { name: 'Настройки интерфейса' })
      await dialog.getByRole('radio', { name: 'Комфортная', exact: true }).click()
      await dialog.getByRole('button', { name: 'Применить', exact: true }).click()
      await expect(dialog.getByRole('status')).toHaveText('Сохранено')
      await expect(f.page.locator('html')).toHaveAttribute('data-frade-theme', 'dark')
      await expect(f.page.locator('html')).toHaveAttribute('data-frade-density', 'comfortable')
      const selected = await fuiComfortableControls(f.page), durable = await readFile(fuiSettings(f, kind), 'utf8')
      expect(JSON.parse(durable).selection).toMatchObject({ mode: 'dark', density: 'comfortable' })
      await finishDiagramFixture(f.app); closed = true
      const restarted = await electron.launch({ args: [resolve('out/main/index.cjs')], env: { ...process.env, FRADE_USER_DATA: profile } })
      try {
        const page = await restarted.firstWindow()
        await page.locator('.ka-workbench').waitFor({ state: 'attached' })
        await expect(page.locator('html')).toHaveAttribute('data-frade-theme', 'dark')
        await expect(page.locator('html')).toHaveAttribute('data-frade-density', 'comfortable')
        expect(await readFile(fuiSettings(f, kind), 'utf8')).toBe(durable)
        await page.getByRole('button', { name: 'Меню Файл' }).click()
        await page.getByRole('menuitem', { name: 'Настройки интерфейса' }).click()
        await expect(page.getByRole('radio', { name: 'Комфортная', exact: true })).toBeChecked()
        await expect(page.getByRole('radio', { name: /Dark/ })).toBeChecked()
        const restored = await fuiComfortableControls(page)
        await writeFile(info.outputPath('fui-observations.json'), JSON.stringify({ id: 'FUI-009', kind, selected, restored, durableSha256: fuiHash(durable), visualApproval: 'NOT_APPROVED' }, null, 2))
        await page.screenshot({ path: info.outputPath('fui009-dark-comfortable-restarted-' + kind + '.png') })
      } finally { await finishDiagramFixture(restarted) }
    } finally { if (!closed) await finishDiagramFixture(f.app) }
  })
}

// P01-UPPER-THREE V6: exact all-pixel calibration. Historical PNG helpers stay unchanged.
const upperTrusted = [
  { hash: '0a22cca4e14802d225bb7ef9dd30d4a42b157389a1681b84975349fd18a00b3a', key: 'viewPanels', kind: 'menu' },
  { hash: '4dc5547840d699651cf7d3059a91d575cddaf80451ab85a7c41ed1d7c7998b24', key: 'insert', kind: 'menu' },
  { hash: 'e78bd38fea8a799c13ffc0fbbab4d9ca6a1ee0ee57360c68596b58e4fe68da9a', key: 'insertFreehand', kind: 'action' },
] as const
function upperDecodePng(bytes: Buffer) {
  let width = 0, height = 0, channels = 0
  const blocks: Buffer[] = []
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]))
  for (let at = 8; at < bytes.length;) {
    const size = bytes.readUInt32BE(at), type = bytes.toString('ascii', at + 4, at + 8), data = bytes.subarray(at + 8, at + 8 + size)
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0; expect(data[8]).toBe(8); expect(data[12]).toBe(0); expect(channels).toBeGreaterThan(0) }
    if (type === 'IDAT') blocks.push(data)
    at += size + 12
  }
  const input = inflateSync(Buffer.concat(blocks)), stride = width * channels, pixels = Buffer.alloc(stride * height)
  let at = 0
  for (let y = 0; y < height; y++) { const filter = input[at++]; for (let x = 0; x < stride; x++) {
    const i = y * stride + x, left = x >= channels ? pixels[i - channels] : 0, up = y > 0 ? pixels[i - stride] : 0, diagonal = y > 0 && x >= channels ? pixels[i - stride - channels] : 0
    let predictor = 0
    if (filter === 1) predictor = left
    else if (filter === 2) predictor = up
    else if (filter === 3) predictor = Math.floor((left + up) / 2)
    else if (filter === 4) { const p = left + up - diagonal, a = Math.abs(p - left), b = Math.abs(p - up), c = Math.abs(p - diagonal); predictor = a <= b && a <= c ? left : b <= c ? up : diagonal }
    else expect(filter).toBe(0)
    pixels[i] = (input[at++] + predictor) & 255
  } }
  expect(at).toBe(input.length)
  return { width, height, channels, pixels }
}
function upperPixels(screen: ReturnType<typeof upperDecodePng>, x: number, y: number, size = 18) {
  expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true)
  expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0)
  expect(x + size).toBeLessThanOrEqual(screen.width); expect(y + size).toBeLessThanOrEqual(screen.height)
  const result: number[][] = []
  for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) {
    const at = ((y + yy) * screen.width + x + xx) * screen.channels
    if (screen.channels === 4) expect(screen.pixels[at + 3]).toBe(255)
    result.push([...screen.pixels.subarray(at, at + 3)])
  }
  return result
}
const upperEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
function upperContrast(a: number[], b: number[]) {
  const luminance = (rgb: number[]) => rgb.map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4 }).reduce((n, x, i) => n + x * [.2126,.7152,.0722][i], 0)
  const x = luminance(a), y = luminance(b)
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05)
}
async function upperTargets(f: FuiFixture) {
  return f.page.frameLocator('iframe').locator('body').evaluate(async (_, trusted) => {
    const result = [], nodes = Array.from(document.querySelectorAll<HTMLElement>('html[data-frade-frame-runtime="1"] .geToolbarContainer .geToolbar a.geButton'))
    for (const [index, node] of nodes.entries()) {
      const css = getComputedStyle(node), image = css.backgroundImage === 'none' ? css.getPropertyValue('--frade-upper-icon-image').trim() : css.backgroundImage
      const url = image.match(/^url\("(.*)"\)$/)?.[1]
      if (!url?.startsWith('data:image/svg+xml;base64,')) continue
      const bytes = Uint8Array.from(atob(url.split(',')[1]), c => c.charCodeAt(0)), hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(c => c.toString(16).padStart(2, '0')).join('')
      const identity = trusted.find(x => x.hash === hash)
      if (identity) result.push({ ...identity, index, url, bytes: [...bytes] })
    }
    return result
  }, upperTrusted)
}
async function upperObservation(f: FuiFixture, target: Awaited<ReturnType<typeof upperTargets>>[number]) {
  const node = f.page.frameLocator('iframe').locator('.geToolbarContainer .geToolbar a.geButton').nth(target.index)
  const record = await node.evaluate(async (node, identity) => {
    await document.fonts.ready; await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    const rgba = (s: string) => (s.match(/[\d.]+/g) || []).map(Number)
    const style = (n: Element, pseudo?: string) => {
      const s = getComputedStyle(n, pseudo), r = n.getBoundingClientRect()
      return { background: rgba(s.backgroundColor), color: rgba(s.color), opacity: Number(s.opacity), filter: s.filter, transform: s.transform, blend: s.mixBlendMode, backdropFilter: s.backdropFilter, shadow: s.boxShadow, backgroundImage: s.backgroundImage, backgroundSize: s.backgroundSize, backgroundPosition: s.backgroundPosition, backgroundOrigin: s.backgroundOrigin, backgroundRepeat: s.backgroundRepeat, clipPath: s.clipPath, overflowX: s.overflowX, overflowY: s.overflowY, display: s.display, visibility: s.visibility, rect: r.toJSON(), border: [s.borderLeftWidth,s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth].map(parseFloat), content: s.content, position: s.position }
    }
    const s = style(node), p = getComputedStyle(node, '::before'), after = getComputedStyle(node, '::after'), r = node.getBoundingClientRect()
    const x = r.x + s.border[0] + parseFloat(p.left), y = r.y + s.border[1] + parseFloat(p.top)
    const chain = []; for (let n = node.parentElement; n; n = n.parentElement) chain.push(style(n))
    const ancestor = chain.findIndex(n => n.background.length === 3 || n.background[3] === 1)
    const ui = (window as any).__p01Ui, capability = identity.kind === 'menu' ? ui.menus.get(identity.key) : ui.actions.get(identity.key)
    const image = new Image(); image.src = identity.url; await image.decode()
    const raster = (size: number) => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = size; const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0, size, size); return [...ctx.getImageData(0, 0, size, size).data] }
    return { identity, connected: node.isConnected, owned: node.hasAttribute('data-frade-upper-glyph'), dpr: devicePixelRatio, fonts: document.fonts.status, style: s, chain, ancestor, target: s.background, underlying: ancestor >= 0 ? chain[ancestor].background : [], foreground: rgba(p.backgroundColor), canonical: s.color, capability: { exists: !!capability, enabled: identity.kind === 'action' ? capability?.isEnabled() : capability?.enabled }, actualState: { hover: node.matches(':hover'), active: node.matches(':active'), focus: node.matches(':focus') }, media: { forced: matchMedia('(forced-colors:active)').matches, coarse: matchMedia('(pointer:coarse)').matches, reduced: matchMedia('(prefers-reduced-motion:reduce)').matches }, interference: node.children.length > 0 || !['none','normal'].includes(after.content), unobscured: Number.isFinite(x) && Number.isFinite(y) && [[1,1],[16,1],[1,16],[16,16],[9,9]].every(([dx,dy]) => document.elementFromPoint(x+dx,y+dy) === node), pseudo: { x,y,width:parseFloat(p.width),height:parseFloat(p.height),mask:p.maskImage,maskSize:p.maskSize,maskRepeat:p.maskRepeat,maskPosition:p.maskPosition,opacity:Number(p.opacity),filter:p.filter,blend:p.mixBlendMode,transform:p.transform,content:p.content,backgroundImage:p.backgroundImage }, natural: raster(24), alpha: raster(18).filter((_,i) => i%4===3) }
  }, target)
  const frame = await f.page.locator('iframe').boundingBox()
  expect(frame).not.toBeNull()
  return { ...record, frame: frame!, x: frame!.x + record.pseudo.x, y: frame!.y + record.pseudo.y }
}

import type { TestInfo } from '@playwright/test'
type UpperObservation = Awaited<ReturnType<typeof upperObservation>>
type UpperAtlas = { back: number[]; underlying: number[]; rows: { c: number; glyph: number[][]; full: number[]; empty: number[][] }[] }
const upperReferenceMain = "const {app,BrowserWindow}=require('electron');if(!process.env.FRADE_UPPER_V6_PROFILE)throw Error('Isolated profile required');app.setPath('userData',process.env.FRADE_UPPER_V6_PROFILE);app.whenReady().then(async()=>{const w=new BrowserWindow({width:1600,height:850,useContentSize:true,show:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});await w.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><html><head><style>html,body{margin:0;padding:0} .target{position:absolute;width:28px;height:28px;border:0;padding:0;box-sizing:border-box}.target::before{content:\"\";position:absolute;left:5px;top:5px;width:18px;height:18px;background-color:var(--ink);mask-image:var(--image);mask-size:contain;mask-position:center;mask-repeat:no-repeat;pointer-events:none;forced-color-adjust:none}.probe::before{mask-image:none}.empty::before{mask-image:url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCI+PHBhdGggZmlsbD0iYmxhY2siIGZpbGwtb3BhY2l0eT0iMCIgZD0iTTAgMGgxOHYxOEgweiIvPjwvc3ZnPg==\")}</style></head><body data-frade-v5-reference=\"1\"></body></html>'));});app.on('window-all-closed',()=>app.quit());"
async function upperReferenceHost() {
  const profile = await mkdtemp(join(tmpdir(), 'frade-upper-v6-permanent-')), main = join(profile, 'reference.cjs')
  await writeFile(main, upperReferenceMain)
  const app = await electron.launch({ args: [main], env: { ...process.env, FRADE_UPPER_V6_PROFILE: profile } })
  try {
    expect(await app.evaluate(() => process.versions.electron)).toBe('44.4.5')
    const page = await app.firstWindow(); await page.locator('body[data-frade-v5-reference="1"]').waitFor({ state: 'attached' })
    return { app, page }
  } catch (error) { await app.close(); throw error }
}
function upperBounds(screen: ReturnType<typeof upperDecodePng>, x: number, y: number, alpha: number[], atlas: UpperAtlas, foreground: number[]) {
  const actual = upperPixels(screen, x, y), holes = actual.filter((_, i) => alpha[i] === 0)
  if (!holes.length || !holes.every(p => upperEqual(p, atlas.back))) return { status: 'NOT_MEASURED', reason: 'NONUNIFORM_OBSERVED_BACKDROP', actual }
  const candidates = [0,1,2].map(channel => atlas.rows.filter(row => row.glyph.every((p,i) => p[channel] === actual[i][channel])).map(row => row.c))
  if (candidates.some(c => !c.length || c.length === 256)) return { status: 'NOT_MEASURED', reason: 'EMPTY_OR_UNINFORMATIVE_COMPATIBLE_SET', actual, candidates }
  const possibilities: { source: number[]; effective: number[]; ratio: number }[] = []
  for (const r of candidates[0]) for (const g of candidates[1]) for (const b of candidates[2]) {
    const effective = [atlas.rows[r].full[0],atlas.rows[g].full[1],atlas.rows[b].full[2]]
    possibilities.push({ source: [r,g,b], effective, ratio: upperContrast(effective,atlas.back) })
  }
  const min = Math.min(...possibilities.map(p => p.ratio)), max = Math.max(...possibilities.map(p => p.ratio)), canonicalMember = foreground.length === 3 && foreground.every((c,i) => candidates[i].includes(c))
  return { status: max < 3 ? 'FAIL' : min >= 3 && canonicalMember ? 'PASS' : 'NOT_MEASURED', min,max,canonicalMember,candidates,possibilities,actual,background:atlas.back,threshold:3 }
}
async function upperCalibrate(page: Page, record: UpperObservation, info: TestInfo, name: string) {
  const width = record.style.rect.width, height = record.style.rect.height, strideX = Math.ceil(width) + 4, strideY = Math.ceil(height) + 4
  await page.setViewportSize({ width: strideX * 48 + 40, height: strideY * 16 + 30 })
  await page.emulateMedia({ forcedColors: record.media.forced ? 'active' : 'none', reducedMotion: record.media.reduced ? 'reduce' : 'no-preference' })
  const mediaSession = await page.context().newCDPSession(page)
  await mediaSession.send('Emulation.setTouchEmulationEnabled', { enabled: record.media.coarse, maxTouchPoints: 1 })
  expect(await page.evaluate(() => matchMedia('(pointer:coarse)').matches)).toBe(record.media.coarse)
  await mediaSession.detach()
  const observation = await page.evaluate(async ({ record, width, height, strideX, strideY }) => {
    const rgb = (v: number[]) => 'rgb(' + v.join(',') + ')'
    document.body.replaceChildren(); document.body.style.cssText = 'margin:0;padding:0;forced-color-adjust:none;background-color:' + rgb(record.underlying)
    document.documentElement.style.cssText = 'forced-color-adjust:none;background-color:' + rgb(record.underlying)
    const style = document.createElement('style'); style.textContent = '.target{forced-color-adjust:none}.target::before{left:var(--gx);top:var(--gy)}'; document.body.append(style)
    const gx = record.pseudo.x - record.style.rect.x, gy = record.pseudo.y - record.style.rect.y, tiles = []
    for (let c = 0; c < 256; c++) {
      const x = (c % 16) * strideX * 3, y = Math.floor(c/16) * strideY
      const add = (kind: string, dx: number) => { const node = document.createElement('div'); node.className = 'target ' + kind; node.style.cssText = 'left:'+(x+dx)+'px;top:'+y+'px;width:'+width+'px;height:'+height+'px;--gx:'+gx+'px;--gy:'+gy+'px;background-color:'+rgb(record.target)+';opacity:'+record.style.opacity+';--ink:'+rgb([c,c,c])+';--image:url("'+record.identity.url+'")'; document.body.append(node); return node }
      add('',0); add('probe',strideX); add('empty',2*strideX)
      tiles.push({ c, glyph:{x:x+gx,y:y+gy}, probe:{x:x+strideX+gx,y:y+gy}, empty:{x:x+2*strideX+gx,y:y+gy} })
    }
    const image = new Image(); image.src = record.identity.url; await image.decode(); await document.fonts.ready; await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    return { tiles, under:{x:strideX*48+5,y:5}, fonts:document.fonts.status,dpr:devicePixelRatio,forced:matchMedia('(forced-colors:active)').matches,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,html:document.documentElement.outerHTML }
  }, { record, width,height,strideX,strideY })
  expect(observation.dpr).toBe(1); expect(observation.fonts).toBe('loaded'); expect(observation.forced).toBe(record.media.forced); expect(observation.reduced).toBe(record.media.reduced)
  const raw = await page.screenshot({ path: info.outputPath(name+'-atlas.png') }), screen = upperDecodePng(raw), underlying = upperPixels(screen,observation.under.x,observation.under.y)
  expect(underlying.every(p => upperEqual(p,record.underlying))).toBe(true)
  const rows = observation.tiles.map(t => {
    const glyph = upperPixels(screen,t.glyph.x,t.glyph.y), probe = upperPixels(screen,t.probe.x,t.probe.y), empty = upperPixels(screen,t.empty.x,t.empty.y)
    expect(probe.every(p => upperEqual(p,probe[0]))).toBe(true); expect(empty.every(p => upperEqual(p,empty[0]))).toBe(true)
    return { c:t.c,glyph,full:probe[0],empty }
  })
  const atlas: UpperAtlas = { back:rows[0].empty[0],underlying:record.underlying,rows }
  expect(rows.every(r => upperEqual(r.empty[0],atlas.back))).toBe(true)
  expect(upperEqual(rows[0].glyph,rows[255].glyph)).toBe(false)
  await writeFile(info.outputPath(name+'-atlas.json'),JSON.stringify({ screenshotSha256:fuiHash(raw),record,observation,atlas }))
  const controls = []
  for (const [index, color] of [record.foreground,[0,0,0],[255,255,255],[21,187,93],[207,39,168]].entries()) {
    await page.evaluate(async ({ color,record,strideX }) => {
      const nodes = [...document.querySelectorAll<HTMLElement>('.target')]; nodes.slice(3).forEach(n=>n.remove()); for(const n of nodes.slice(0,3)) n.style.setProperty('--ink','rgb('+color.join(',')+')')
      const image = new Image(); image.src=record.identity.url; await image.decode(); await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())))
      return strideX
    },{color,record,strideX})
    const png = await page.screenshot({path:info.outputPath(name+'-mixed-'+index+'.png')}), pixels=upperDecodePng(png),t=observation.tiles[0],full=upperPixels(pixels,t.probe.x,t.probe.y),empty=upperPixels(pixels,t.empty.x,t.empty.y),bound=upperBounds(pixels,t.glyph.x,t.glyph.y,record.alpha,atlas,color)
    expect(full.every(p=>upperEqual(p,full[0]))).toBe(true); expect(empty.every(p=>upperEqual(p,atlas.back))).toBe(true)
    expect(bound.canonicalMember).toBe(true); expect(bound.possibilities?.some(p=>upperEqual(p.effective,full[0]))).toBe(true)
    const ratio=upperContrast(full[0],atlas.back);expect(bound.min).toBeLessThanOrEqual(ratio);expect(bound.max).toBeGreaterThanOrEqual(ratio)
    if(bound.status==='NOT_MEASURED'){expect(bound.min).toBeLessThan(3);expect(bound.max).toBeGreaterThanOrEqual(3)} else expect(bound.status).toBe(ratio>=3?'PASS':'FAIL')
    controls.push({ color,bound,actualFull:full[0],actualRatio:ratio,screenshotSha256:fuiHash(png) })
  }
  await writeFile(info.outputPath(name+'-mixed-controls.json'),JSON.stringify({controls}))
  return atlas
}
function upperAssertComposition(record: UpperObservation) {
  expect(record.connected).toBe(true); expect(record.owned).toBe(true); expect(record.capability.exists).toBe(true); expect(typeof record.capability.enabled).toBe('boolean')
  expect(record.dpr).toBe(1); expect(record.fonts).toBe('loaded'); expect(record.style.backgroundImage).toBe('none')
  expect(record.pseudo.mask).toBe('url("'+record.identity.url+'")'); expect(record.pseudo.width).toBe(18);expect(record.pseudo.height).toBe(18)
  expect(record.pseudo.opacity).toBe(1);expect(record.pseudo.maskSize).toBe('contain');expect(record.pseudo.maskRepeat).toBe('no-repeat');expect(record.pseudo.maskPosition).toBe('50% 50%')
  expect(record.foreground).toEqual(record.canonical);expect(record.foreground).toHaveLength(3);expect(record.target).toHaveLength(3);expect(record.underlying).toHaveLength(3)
  expect([1,.65,.75]).toContain(record.style.opacity);expect(record.interference).toBe(false);expect(record.unobscured).toBe(true)
  for(const style of [record.style,record.pseudo,...record.chain]) { expect(style.filter).toBe('none');expect(style.transform).toBe('none');expect(style.blend).toBe('normal');expect(style.backgroundImage).toBe('none') }
  expect(record.style.clipPath).toBe('none');expect(record.style.shadow).toBe('none');expect(record.style.backdropFilter).toBe('none')
  expect(record.ancestor).toBeGreaterThanOrEqual(0)
  for(const [index,ancestor] of record.chain.entries()) {
    expect(ancestor.opacity).toBe(1);expect(ancestor.shadow).toBe('none');expect(ancestor.backdropFilter).toBe('none');expect(ancestor.clipPath).toBe('none')
    if(index<record.ancestor)expect(ancestor.background).toEqual([0,0,0,0])
    if(index===record.ancestor||ancestor.overflowX!=='visible'||ancestor.overflowY!=='visible') {expect(record.pseudo.x).toBeGreaterThanOrEqual(ancestor.rect.x);expect(record.pseudo.y).toBeGreaterThanOrEqual(ancestor.rect.y);expect(record.pseudo.x+18).toBeLessThanOrEqual(ancestor.rect.right);expect(record.pseudo.y+18).toBeLessThanOrEqual(ancestor.rect.bottom)}
  }
  expect(record.alpha.some(a=>a>0)).toBe(true);expect(record.alpha.some(a=>a===0)).toBe(true);expect(record.natural.filter((_,i)=>i%4===3)).toContain(255)
}
for(const mode of ['light','dark','high-contrast'] as const)for(const density of ['compact','comfortable'] as const){
  // eslint-disable-next-line no-empty-pattern
  test('P01-UPPER-017 actual canonical original glyph raster '+mode+' '+density,async({},info)=>{
    test.setTimeout(300000)
    const f=await diagramFixture('frame',{mode,density},page=>page.setViewportSize({width:1280,height:850}))
    const samples: { name:string;record:UpperObservation;raw:Buffer }[]=[]
    try {
      const before={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f)},targets=await upperTargets(f)
      expect(targets.map(t=>t.hash).sort()).toEqual(upperTrusted.map(t=>t.hash).sort())
      for(const target of targets){
        const node=f.page.frameLocator('iframe').locator('.geToolbarContainer .geToolbar a.geButton').nth(target.index)
        for(const state of ['default','hover','pressed'] as const){
          if(state==='default')await f.page.mouse.move(1,1)
          if(state==='hover')await node.hover()
          if(state==='pressed')await f.page.mouse.down()
          const record=await upperObservation(f,target),name=target.key+'-'+state,raw=await f.page.screenshot({path:info.outputPath(name+'.png')})
          await writeFile(info.outputPath(name+'.json'),JSON.stringify({record,screenshotSha256:fuiHash(raw),visualApproval:'NOT_APPROVED'}))
          if(state==='pressed')expect(record.actualState.active).toBe(true)
          upperAssertComposition(record);samples.push({name,record,raw})
        }
        await f.page.mouse.move(1,1);await f.page.mouse.up();await f.page.keyboard.press('Escape')
      }
      const after={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f)}
      await writeFile(info.outputPath('preservation.json'),JSON.stringify({before,after}));expect(after).toEqual(before)
    } finally {await finishDiagramFixture(f.app)}
    const reference=await upperReferenceHost()
    try {for(const sample of samples){
      const atlas=await upperCalibrate(reference.page,sample.record,info,sample.name),bound=upperBounds(upperDecodePng(sample.raw),sample.record.x,sample.record.y,sample.record.alpha,atlas,sample.record.foreground)
      await writeFile(info.outputPath(sample.name+'-proof.json'),JSON.stringify({actualScreenshotSha256:fuiHash(sample.raw),bound,measure:'effective full-coverage paint bound, not antialias pixel minimum'}))
      expect(sample.record.capability.enabled).toBe(true);expect(bound.status).toBe('PASS');expect(bound.canonicalMember).toBe(true);expect(bound.min).toBeGreaterThanOrEqual(3)
    }}finally{await reference.app.close()}
  })
}


async function upperPinIdentity(f: FuiFixture, targets: Awaited<ReturnType<typeof upperTargets>>) {
  await f.page.locator('iframe').evaluate(node => { (window as any).__upperFrame = node })
  await f.page.frameLocator('iframe').locator('body').evaluate((_, targets) => {
    const ui = (window as any).__p01Ui
    ;(window as any).__fuiUi = ui; (window as any).__fuiGraph = ui.editor.graph
    const nodes = document.querySelectorAll('.geToolbarContainer .geToolbar a.geButton')
    ;(window as any).__upperIdentity = { ui, graph: ui.editor.graph, toolbar: document.querySelector('.geToolbarContainer'),
      targets: targets.map(t => { const node = nodes[t.index], capability = t.kind === 'menu' ? ui.menus.get(t.key) : ui.actions.get(t.key); return { node, capability, funct: capability.funct, key: t.key, kind: t.kind, title: node.getAttribute('title'), tabIndex: (node as HTMLElement).tabIndex, aria: [...node.attributes].filter(a => a.name.startsWith('aria-')).map(a => [a.name,a.value]) } }) }
  }, targets)
}
async function upperCheckIdentity(f: FuiFixture) {
  expect(await f.page.locator('iframe').evaluate(node => node === (window as any).__upperFrame)).toBe(true)
  const result = await f.page.frameLocator('iframe').locator('body').evaluate(() => {
    const saved = (window as any).__upperIdentity, ui = (window as any).__p01Ui
    const controlled = new Set(['aria-label','aria-disabled','aria-haspopup','aria-expanded','aria-pressed'])
    return { ui: ui === saved.ui, graph: ui.editor.graph === saved.graph, toolbar: document.querySelector('.geToolbarContainer') === saved.toolbar,
      targets: saved.targets.map((t: any) => {
        const c = t.kind === 'menu' ? ui.menus.get(t.key) : ui.actions.get(t.key), n=t.node as HTMLElement, css=getComputedStyle(n), box=n.getBoundingClientRect()
        const rendered=css.display!=='none'&&css.visibility!=='hidden'&&box.width>0&&box.height>0, enabled=c.isEnabled()
        const unrelated=[...n.attributes].filter(a=>a.name.startsWith('aria-')&&!controlled.has(a.name)).map(a=>[a.name,a.value])
        const priorUnrelated=t.aria.filter((a:string[])=>!controlled.has(a[0]))
        const aria=rendered
          ? n.getAttribute('aria-label')===n.title && n.getAttribute('aria-disabled')===String(!enabled) &&
            (t.kind==='menu' ? n.getAttribute('aria-haspopup')==='menu' && n.getAttribute('aria-expanded')===String(ui.currentMenuElt===n&&!!ui.currentMenu?.div?.isConnected) && !n.hasAttribute('aria-pressed')
              : n.getAttribute('aria-pressed')===String(ui.editor.graph.freehand.isDrawing()) && !n.hasAttribute('aria-haspopup') && !n.hasAttribute('aria-expanded'))
          : [...controlled].every(name=>!n.hasAttribute(name))
        return { connected:n.isConnected,originalParent:saved.toolbar.contains(n),capability:c===t.capability,handler:c.funct===t.funct,title:n.getAttribute('title')===t.title,
          tabIndex:rendered?n.getAttribute('tabindex')===(enabled?'0':'-1'):n.getAttribute('tabindex')===null&&n.tabIndex===0&&n.getAttribute('href')===null,
          aria:aria&&JSON.stringify(unrelated)===JSON.stringify(priorUnrelated),role:rendered?n.getAttribute('role')==='button':!n.hasAttribute('role'),keyboardOwnership:rendered?n.getAttribute('data-frade-upper-control')==='1':!n.hasAttribute('data-frade-upper-control') }
      }) }
  })
  expect(result.ui).toBe(true); expect(result.graph).toBe(true); expect(result.toolbar).toBe(true)
  for (const target of result.targets) for (const preserved of Object.values(target)) expect(preserved,JSON.stringify(result)).toBe(true)
  return result
}
for (const mode of ['light','dark','high-contrast'] as const) for (const density of ['compact','comfortable'] as const) {
  // eslint-disable-next-line no-empty-pattern
  test('P01-UPPER-017 expanded real viewport text and media raster ' + mode + ' ' + density, async ({}, info) => {
    test.setTimeout(600000)
    const f = await diagramFixture('frame',{mode,density},page=>page.setViewportSize({width:1280,height:850}))
    const samples: {name:string;record:UpperObservation;raw:Buffer}[] = [], limitations: unknown[] = [], preservation: unknown[] = []
    const narrowAbsent = new Set<string>()
    let mediaSession: Awaited<ReturnType<ReturnType<Page['context']>['newCDPSession']>> | undefined
    try {
      const targets = await upperTargets(f); expect(targets).toHaveLength(3); await upperPinIdentity(f,targets)
      const frame = f.page.frameLocator('iframe')
      for (const scenario of ['wide','narrow','restored','text200','forced-coarse-reduced-text200']) {
        await f.page.setViewportSize(scenario==='wide'?{width:1600,height:900}:scenario==='narrow'?{width:850,height:650}:{width:1280,height:850})
        if (scenario==='text200') {
          const fonts = await frame.locator('body').evaluate(() => {
            const nodes = [...document.querySelectorAll<HTMLElement>('.geToolbarContainer,.geToolbarContainer *')]
            const before = nodes.map(node=>parseFloat(getComputedStyle(node).fontSize))
            nodes.forEach((node,i)=>node.style.setProperty('font-size',before[i]*2+'px','important'))
            return nodes.map((node,i)=>({before:before[i],after:parseFloat(getComputedStyle(node).fontSize)}))
          })
          expect(fonts.length).toBeGreaterThan(3); for(const font of fonts) expect(font.after).toBe(font.before*2)
          await writeFile(info.outputPath('actual-text200.json'),JSON.stringify(fonts))
        }
        if (scenario.startsWith('forced')) {
          const previousRevision = await frame.locator('html').getAttribute('data-frade-frame-revision')
          await f.page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'})
          mediaSession = await f.page.context().newCDPSession(f.page.frames().find(frame=>frame.url().startsWith('frade://drawio/'))!)
          await mediaSession.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
          await expect.poll(()=>frame.locator('html').evaluate(node=>({forced:matchMedia('(forced-colors:active)').matches,coarse:matchMedia('(pointer:coarse)').matches,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,theme:node.getAttribute('data-frade-frame-theme')}))).toEqual({forced:true,coarse:true,reduced:true,theme:mode})
          await expect.poll(()=>frame.locator('html').getAttribute('data-frade-frame-revision')).not.toBe(previousRevision)
          await expect.poll(()=>frame.locator('html').evaluate(node=>getComputedStyle(node).getPropertyValue('--frade-frame-text-primary').trim())).toBe('CanvasText')
          await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
        }
        // Native responsive layout settles asynchronously after resize; preserve the full settled state.
        const readiness: { at:number; state:unknown; frame:unknown }[]=[]
        let stable=0, previous=''
        await expect.poll(async()=>{
          const state=await fuiSemantics(f,'frame'),box=await f.page.locator('iframe').boundingBox(),current=JSON.stringify({state,box})
          readiness.push({at:Date.now(),state,frame:box});stable=current===previous?stable+1:0;previous=current;return stable
        },{timeout:5000,intervals:[100]}).toBeGreaterThanOrEqual(5)
        await writeFile(info.outputPath(scenario+'-readiness.json'),JSON.stringify(readiness))
        const before={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f),identity:await upperCheckIdentity(f)}
        expect((before.semantics as any).uiIdentity).toBe(true);expect((before.semantics as any).graphIdentity).toBe(true)
        expect(await upperTargets(f)).toEqual(targets)
        if(scenario==='restored')expect([...narrowAbsent].sort()).toEqual(['insert','insertFreehand'])
        for(const target of targets) {
          const node=frame.locator('.geToolbarContainer .geToolbar a.geButton').nth(target.index)
          if(scenario==='narrow' && (target.key==='insert'||target.key==='insertFreehand')) {
            const original = await node.evaluate(node => {
              const css=getComputedStyle(node),rect=node.getBoundingClientRect()
              return {connected:node.isConnected,display:css.display,rect:rect.toJSON(),minWidth:node.getAttribute('data-min-width'),owned:node.hasAttribute('data-frade-upper-glyph'),inlineProjection:node.style.getPropertyValue('--frade-upper-icon-image'),computedProjection:css.getPropertyValue('--frade-upper-icon-image').trim(),backgroundImage:css.backgroundImage,mask:getComputedStyle(node,'::before').maskImage}
            })
            expect(original.connected).toBe(true);expect(original.display).toBe('none')
            expect(original.rect.width).toBe(0);expect(original.rect.height).toBe(0)
            expect(original.minWidth).toBe(target.key==='insert'?'630':'930')
            expect(original.owned).toBe(false);expect(original.inlineProjection).toBe('');expect(original.computedProjection).toBe('')
            expect(original.mask).toBe('none');expect(original.backgroundImage).toBe('url("'+target.url+'")')
            expect(await node.isVisible()).toBe(false)
            expect(await node.evaluate(node=>{node.focus();return document.activeElement===node}), 'Original responsive-hidden anchor must remain unfocusable').toBe(false)
            const raw=await f.page.screenshot({path:info.outputPath(scenario+'-'+target.key+'-original-hidden.png')})
            const classification={scenario,key:target.key,resourceSha256:target.hash,status:'NOT_RENDERED_ORIGINAL_RESPONSIVE',original,identity:await upperCheckIdentity(f),screenshotSha256:fuiHash(raw),numericalContrast:'NOT_APPLICABLE_NO_RENDERED_GLYPH',visualApproval:'NOT_APPROVED'}
            await writeFile(info.outputPath(scenario+'-'+target.key+'-original-hidden.json'),JSON.stringify(classification))
            limitations.push(classification);narrowAbsent.add(target.key)
            continue
          }
          await expect(node).toBeVisible()
          if(scenario==='restored') {
            await expect(node).toHaveAttribute('data-frade-upper-glyph','1')
            const restored=await upperObservation(f,target);upperAssertComposition(restored)
            await writeFile(info.outputPath('restored-'+target.key+'-identity.json'),JSON.stringify({identity:await upperCheckIdentity(f),resource:target,record:restored,restoredFromOriginalResponsiveAbsence:narrowAbsent.has(target.key)}))
          }
          for(const state of ['default','hover','pressed'] as const) {
            if(state==='default')await f.page.mouse.move(1,1)
            if(state==='hover')await node.hover()
            if(state==='pressed')await f.page.mouse.down()
            const record=await upperObservation(f,target),name=scenario+'-'+target.key+'-'+state,raw=await f.page.screenshot({path:info.outputPath(name+'.png')})
            await writeFile(info.outputPath(name+'.json'),JSON.stringify({record,screenshotSha256:fuiHash(raw),visualApproval:'NOT_APPROVED'}))
            if(state==='pressed')expect(record.actualState.active).toBe(true)
            samples.push({name,record,raw})
          }
          await f.page.mouse.move(1,1);await f.page.mouse.up();await f.page.keyboard.press('Escape')
          const focus=await node.evaluate(node=>{node.focus();return{focused:document.activeElement===node,tabIndex:node.tabIndex,tabIndexAttribute:node.getAttribute('tabindex'),href:node.getAttribute('href')}})
          expect(focus.focused, 'Accepted upper keyboard scope requires every rendered enabled anchor to focus').toBe(true)
          if(!focus.focused) {
            expect(focus.tabIndexAttribute).toBeNull();expect(focus.href).toBeNull()
            limitations.push({scenario,key:target.key,resourceSha256:target.hash,state:'focus',status:'BLOCKED_ORIGINAL_FOCUS_UNAVAILABLE',actual:focus,identity:await upperCheckIdentity(f),owner:'P01-UPPER-KEYBOARD-ACCESSIBILITY',cumulativeClosure:'BLOCKED'})
          }
          else {
            const record=await upperObservation(f,target),name=scenario+'-'+target.key+'-focus',raw=await f.page.screenshot({path:info.outputPath(name+'.png')})
            await writeFile(info.outputPath(name+'.json'),JSON.stringify({record,screenshotSha256:fuiHash(raw),visualApproval:'NOT_APPROVED'}));samples.push({name,record,raw})
            await node.evaluate(node=>node.blur())
          }
          limitations.push({scenario,key:target.key,state:'disabled',status:'NOT_RUN_NO_ORIGINAL_DISABLED_TRIGGER_YET'})
        }
        if(scenario==='narrow')expect([...narrowAbsent].sort()).toEqual(['insert','insertFreehand'])
        const after={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f),identity:await upperCheckIdentity(f)}
        preservation.push({scenario,before,after});expect(after).toEqual(before)
      }
    } finally {
      await writeFile(info.outputPath('expanded-preservation.json'),JSON.stringify(preservation))
      await writeFile(info.outputPath('capability-limitations.json'),JSON.stringify(limitations))
      if(mediaSession)await mediaSession.detach()
      await finishDiagramFixture(f.app)
    }
    for(const sample of samples)upperAssertComposition(sample.record)
    const reference=await upperReferenceHost(),cache=new Map<string,{atlas:UpperAtlas;name:string}>()
    try {for(const sample of samples) {
      const r=sample.record
      const key=JSON.stringify({identity:r.identity,dimensions:[r.style.rect.width,r.style.rect.height],glyph:[r.pseudo.width,r.pseudo.height,r.pseudo.x-r.style.rect.x,r.pseudo.y-r.style.rect.y],target:r.target,underlying:r.underlying,opacity:r.style.opacity,foreground:r.foreground,media:r.media,dpr:r.dpr,fonts:r.fonts,alpha:r.alpha})
      let calibration=cache.get(key)
      if(!calibration){calibration={atlas:await upperCalibrate(reference.page,r,info,sample.name),name:sample.name};cache.set(key,calibration)}
      const bound=upperBounds(upperDecodePng(sample.raw),r.x,r.y,r.alpha,calibration.atlas,r.foreground)
      await writeFile(info.outputPath(sample.name+'-proof.json'),JSON.stringify({actualScreenshotSha256:fuiHash(sample.raw),bound,calibration:calibration.name,exactCalibrationKeySha256:fuiHash(key)}))
      expect(r.capability.enabled).toBe(true);expect(bound.status).toBe('PASS');expect(bound.canonicalMember).toBe(true);expect(bound.min).toBeGreaterThanOrEqual(3)
    }}finally{await reference.app.close()}
  })
}


for (const mode of ['light','dark','high-contrast'] as const) for (const density of ['compact','comfortable'] as const) {
  // eslint-disable-next-line no-empty-pattern
  test('P01-UPPER-018 original actions and presentation ownership ' + mode + ' ' + density, async ({}, info) => {
    test.setTimeout(120000)
    const f=await diagramFixture('frame',{mode,density},page=>page.setViewportSize({width:1280,height:850}))
    const observations: unknown[]=[]
    try {
      const frame=f.page.frameLocator('iframe'),targets=await upperTargets(f)
      expect(targets.map(t=>t.hash).sort()).toEqual(upperTrusted.map(t=>t.hash).sort())
      await upperPinIdentity(f,targets)
      const locate=(key:string)=>frame.locator('.geToolbarContainer .geToolbar a.geButton').nth(targets.find(t=>t.key===key)!.index)
      // Exercise original menu keyboard cancellation with actual canvas keyboard focus.
      await frame.locator('.geDiagramContainer').click({position:{x:30,y:30}})
      const canvasFocus=await frame.locator('body').evaluate(()=>{const graph=(window as any).__p01Ui.editor.graph;return {focused:document.hasFocus(),activeIsCanvas:document.activeElement===graph.container,activeTag:document.activeElement?.tagName,activeClass:document.activeElement?.className}})
      await writeFile(info.outputPath('actual-canvas-focus.json'),JSON.stringify(canvasFocus))
      expect(canvasFocus.focused).toBe(true);expect(canvasFocus.activeIsCanvas).toBe(true)
      // Original user actions are exercised separately from presentation preservation.
      for(const key of ['viewPanels','insert']) {
        const before={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f),identity:await upperCheckIdentity(f)}
        await frame.locator('body').evaluate(()=>{const w=window as any;w.__upperTiming=[];w.__upperTimingListener=(event:MouseEvent)=>{const n=(event.target as Element)?.closest('.geToolbarContainer .geToolbar a.geButton');if(!n)return;const read=(phase:string)=>w.__upperTiming.push({phase,trusted:event.isTrusted,menu:!!w.__p01Ui.currentMenu,sameOpener:w.__p01Ui.currentMenuElt===n,connected:!!w.__p01Ui.currentMenu?.div?.isConnected,control:n.getAttribute('data-frade-upper-control')});read('capture');queueMicrotask(()=>read('microtask'));setTimeout(()=>read('task'),0)};document.addEventListener('click',w.__upperTimingListener,true)})
        await locate(key).click()
        await writeFile(info.outputPath('original-'+key+'-ownership.json'),JSON.stringify(await frame.locator('body').evaluate(()=>{const ui=(window as any).__p01Ui,g=ui.editor.graph,m=ui.currentMenu;return {timing:(window as any).__upperTiming,root:[...document.documentElement.attributes].map(a=>[a.name,a.value]),active:{editing:g.isEditing(),mouseDown:g.isMouseDown,enabled:g.isEnabled(),dialog:!!ui.dialog,dialogs:ui.dialogs?.length},currentMenu:{present:!!m,opener:ui.currentMenuElt?.outerHTML,div:m?.div?.outerHTML.slice(0,300),tbodyTag:m?.tbody?.tagName,contains:m?.div?.contains(m.tbody),hide:typeof m?.hideMenu,hideSubmenu:typeof m?.hideSubmenu},anchors:[...document.querySelectorAll<HTMLElement>('.geToolbarContainer .geToolbar a.geButton')].map((n:any)=>({html:n.outerHTML,enabled:n.enabled,enabledType:typeof n.enabled,handlers:n.mxListenerList?.map((l:any)=>({name:l.name,type:typeof l.f})),display:getComputedStyle(n).display,rect:{width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height}}))}})))
        const popup=frame.locator('div.mxPopupMenu:visible')
        await expect(popup).toHaveCount(1)
        const labels=await popup.locator('td.mxPopupMenuItem').allTextContents()
        expect(labels.length).toBeGreaterThan(0)
        await f.page.screenshot({path:info.outputPath('original-'+key+'-open.png')})
        const focusBeforeEscape={parent:await f.page.evaluate(()=>({activeTag:document.activeElement?.tagName,activeClass:document.activeElement?.className})),frame:await frame.locator('body').evaluate(()=>({activeTag:document.activeElement?.tagName,activeClass:document.activeElement?.className,focused:document.hasFocus()}))}
        await frame.locator('body').evaluate(()=>{const w=window as any;w.__upperEscapeEvents=[];w.__upperEscapeCapture=(event:KeyboardEvent)=>{if(event.key==='Escape')queueMicrotask(()=>w.__upperEscapeEvents.push({key:event.key,target:(event.target as Element)?.tagName,targetClass:(event.target as Element)?.className,defaultPrevented:event.defaultPrevented,cancelBubble:event.cancelBubble}))};document.addEventListener('keydown',w.__upperEscapeCapture,true)})
        await f.page.keyboard.press('Escape')
        const escapeObservation=await frame.locator('body').evaluate(async()=>{await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));const w=window as any;document.removeEventListener('keydown',w.__upperEscapeCapture,true);return {events:w.__upperEscapeEvents,activeTag:document.activeElement?.tagName,activeClass:document.activeElement?.className,menus:[...document.querySelectorAll<HTMLElement>('div.mxPopupMenu')].map(menu=>({visible:menu.getBoundingClientRect().height>0,html:menu.outerHTML}))}})
        await writeFile(info.outputPath('original-'+key+'-escape-diagnostic.json'),JSON.stringify({focusBeforeEscape,escapeObservation}))
        await expect(popup).toHaveCount(0)
        const after={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f),identity:await upperCheckIdentity(f)}
        expect(after).toEqual(before);observations.push({action:key,labels,before,after})
      }
      const drawing=()=>frame.locator('body').evaluate(()=>{const ui=(window as any).__p01Ui;return {drawing:ui.editor.graph.freehand.isDrawing(),visible:ui.freehandWindow?.window.isVisible()??false}})
      const originalFreehandBefore={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f)}
      for(const warmup of [true,false]) {
        const before={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f),identity:await upperCheckIdentity(f)}
        await expect.poll(drawing).toEqual({drawing:false,visible:false})
        await locate('insertFreehand').click();await expect.poll(drawing).toEqual({drawing:true,visible:true})
        await f.page.screenshot({path:info.outputPath('original-freehand-'+(warmup?'first':'repeat')+'-active.png')})
        await locate('insertFreehand').click();await expect.poll(drawing).toEqual({drawing:false,visible:false})
        const after={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f),identity:await upperCheckIdentity(f)}
        // First original action may create its own window preference; record that effect exactly.
        expect(after.files).toEqual(before.files)
        const {preferences:beforePreferences,...beforeDocument}=before.semantics as any
        const {preferences:afterPreferences,...afterDocument}=after.semantics as any
        expect(afterDocument).toEqual(beforeDocument)
        if(!warmup)expect(after).toEqual(before)
        observations.push({action:'insertFreehand',warmup,before,after,originalPreferenceEffect:{before:beforePreferences,after:afterPreferences}})
      }
      observations.push({originalFreehandBefore,originalFreehandAfter:{semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f)}})
      await f.page.mouse.move(1,1)
      const before={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f),identity:await upperCheckIdentity(f)},durable=await readFile(fuiSettings(f,'frame'),'utf8')
      const next=mode==='dark'?'light':'dark',label=next==='light'?'Светлая (Light)':'Тёмная (Dark)'
      const open=async()=>{await f.page.getByRole('button',{name:'Меню Файл'}).click();await f.page.getByRole('menuitem',{name:'Настройки интерфейса'}).click();return f.page.getByRole('dialog',{name:'Настройки интерфейса'})}
      const capture=async(name:string,wanted:typeof mode)=>{
        await expect(f.page.locator('html')).toHaveAttribute('data-frade-theme',wanted)
        await expect(frame.locator('html')).toHaveAttribute('data-frade-frame-theme',wanted)
        await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
        expect(await upperTargets(f)).toEqual(targets)
        const glyphs=[]
        for(const target of targets){const record=await upperObservation(f,target);expect(record.connected).toBe(true);expect(record.owned).toBe(true);expect(record.foreground).toEqual(record.canonical);expect(record.pseudo.mask).toBe('url("'+target.url+'")');expect(record.pseudo.width).toBe(18);expect(record.pseudo.height).toBe(18);glyphs.push(record)}
        const outer=await f.page.evaluate(points=>points.map(point=>({x:point.x,y:point.y,hitTag:document.elementFromPoint(point.x+9,point.y+9)?.tagName,hitClass:document.elementFromPoint(point.x+9,point.y+9)?.className})),glyphs.map(g=>({x:g.x,y:g.y})))
        const raw=await f.page.screenshot({path:info.outputPath(name+'.png')})
        const after={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f),identity:await upperCheckIdentity(f)}
        expect(after).toEqual(before)
        observations.push({phase:name,glyphs,outer,before,after,screenshotSha256:fuiHash(raw),numericalContrast:'NOT_MEASURED_IN_THIS_IDENTITY_AND_SEMANTICS_TEST',visualApproval:'NOT_APPROVED'})
      }
      let dialog=await open();await dialog.getByRole('radio',{name:label,exact:true}).click()
      await capture('preview',next);expect(await readFile(fuiSettings(f,'frame'),'utf8')).toBe(durable)
      await dialog.getByRole('button',{name:'Закрыть',exact:true}).click();await expect(dialog).toBeHidden()
      await capture('cancel-restored',mode);expect(await readFile(fuiSettings(f,'frame'),'utf8')).toBe(durable)
      dialog=await open();await dialog.getByRole('radio',{name:label,exact:true}).click()
      await capture('preview-for-commit',next);expect(await readFile(fuiSettings(f,'frame'),'utf8')).toBe(durable)
      await dialog.getByRole('button',{name:'Применить',exact:true}).click();await expect(dialog.getByRole('status')).toHaveText('Сохранено')
      await dialog.getByRole('button',{name:'Закрыть',exact:true}).click();await expect(dialog).toBeHidden()
      await capture('committed-release-retains',next)
      expect(JSON.parse(await readFile(fuiSettings(f,'frame'),'utf8')).selection).toMatchObject({mode:next,density})
    } finally {await writeFile(info.outputPath('original-actions-and-lifecycle.json'),JSON.stringify({observations,scope:'Original actions, actual presentation identity/semantics and canonical DOM projection only. No numerical contrast or cumulative closure claim.'}));await finishDiagramFixture(f.app)}
  })
}


for (const mode of ['light','dark','high-contrast'] as const) for (const density of ['compact','comfortable'] as const) {
  // eslint-disable-next-line no-empty-pattern
  test('P01-UPPER-023 actual keyboard anchors and owned popup paths ' + mode + ' ' + density, async ({}, info) => {
    test.setTimeout(120000)
    const f=await diagramFixture('frame',{mode,density},page=>page.setViewportSize({width:1280,height:850})), observations: unknown[]=[]
    try {
      const frame=f.page.frameLocator('iframe'),targets=await upperTargets(f)
      expect(targets.map(t=>t.hash).sort()).toEqual(upperTrusted.map(t=>t.hash).sort());await upperPinIdentity(f,targets)
      const locate=(key:string)=>frame.locator('.geToolbarContainer .geToolbar a.geButton').nth(targets.find(t=>t.key===key)!.index)
      for(const target of targets){const node=locate(target.key);await expect(node).toHaveAttribute('role','button');await expect(node).toHaveAttribute('tabindex','0');await expect(node).toHaveAttribute('aria-disabled','false');expect(await node.getAttribute('aria-label')).toBe(await node.getAttribute('title'))}
      // Warm the original Freehand window outside the navigation/presentation invariant.
      const drawing=()=>frame.locator('body').evaluate(()=>{const ui=(window as any).__p01Ui;return {drawing:ui.editor.graph.freehand.isDrawing(),visible:ui.freehandWindow?.window.isVisible()??false}})
      await locate('insertFreehand').click();await expect.poll(drawing).toEqual({drawing:true,visible:true});await locate('insertFreehand').click();await expect.poll(drawing).toEqual({drawing:false,visible:false})
      const before={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f),identity:await upperCheckIdentity(f)}
      await locate('viewPanels').focus();await f.page.keyboard.press('Tab');await expect(locate('insert')).toBeFocused();await f.page.keyboard.press('Tab');await expect(locate('insertFreehand')).toBeFocused();await f.page.keyboard.press('Shift+Tab');await expect(locate('insert')).toBeFocused();await f.page.keyboard.press('Shift+Tab');await expect(locate('viewPanels')).toBeFocused()
      for(const key of ['viewPanels','insert']) {
        const opener=locate(key);await opener.focus()
        const ring=await opener.evaluate(node=>{const c=getComputedStyle(node);return {focused:document.activeElement===node,focusVisible:node.matches(':focus-visible'),width:c.outlineWidth,style:c.outlineStyle,color:c.outlineColor,opacity:c.opacity,rect:{width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height}}})
        expect(ring.focused).toBe(true);expect(ring.focusVisible).toBe(true);expect(parseFloat(ring.width)).toBeGreaterThanOrEqual(2);expect(ring.style).toBe('solid');expect(ring.rect).toEqual({width:28,height:density==='compact'?28:36})
        await f.page.screenshot({path:info.outputPath(key+'-keyboard-focus.png')})
        await f.page.keyboard.press('ArrowDown')
        const roots=frame.locator('div[data-frade-upper-menu="1"]');await expect(roots).toHaveCount(1)
        const root=roots.first(),items=root.locator('tr[data-frade-upper-row="1"][aria-disabled="false"]');expect(await items.count()).toBeGreaterThan(1);await expect(items.first()).toBeFocused();await expect(opener).toHaveAttribute('aria-expanded','true')
        await f.page.keyboard.press('End');await expect(items.last()).toBeFocused();await f.page.keyboard.press('Home');await expect(items.first()).toBeFocused();await f.page.keyboard.press('ArrowDown');await expect(items.nth(1)).toBeFocused();await f.page.keyboard.press('ArrowUp');await expect(items.first()).toBeFocused()
        const rows=await root.locator('tr[data-frade-upper-row="1"]').evaluateAll(nodes=>nodes.map(node=>({label:node.getAttribute('aria-label'),role:node.getAttribute('role'),disabled:node.getAttribute('aria-disabled'),checked:node.getAttribute('aria-checked'),tabindex:node.getAttribute('tabindex')})))
        for(const row of rows){expect(row.label?.trim()).toBeTruthy();expect(['menuitem','menuitemcheckbox']).toContain(row.role);expect(['true','false']).toContain(row.disabled);expect(row.tabindex).toBe('-1');if(row.role==='menuitemcheckbox')expect(row.checked).toBe('true')}
        if(key==='insert') {
          const parent=root.locator('tr[data-frade-upper-row="1"][aria-haspopup="menu"][aria-disabled="false"]').first();await expect(parent).toBeVisible();await parent.focus();await f.page.keyboard.press('ArrowRight');await expect(roots).toHaveCount(2);await expect(parent).toHaveAttribute('aria-expanded','true')
          await expect(roots.nth(1).locator('tr[data-frade-upper-row="1"][aria-disabled="false"]').first()).toBeFocused();await f.page.screenshot({path:info.outputPath('insert-keyboard-submenu.png')})
          await f.page.keyboard.press('Escape');await expect(roots).toHaveCount(1);await expect(parent).toBeFocused();await expect(parent).toHaveAttribute('aria-expanded','false')
        }
        await f.page.keyboard.press('Escape');await expect(roots).toHaveCount(0);await expect(opener).toBeFocused();await expect(opener).toHaveAttribute('aria-expanded','false')
        await f.page.keyboard.press('Enter');await expect(roots).toHaveCount(1);await f.page.keyboard.press('Tab');await expect(roots).toHaveCount(0)
        await expect(locate(key==='viewPanels'?'insert':'insertFreehand')).toBeFocused()
        observations.push({key,ring,rows,numericalFocusContrast:'NOT_MEASURED_BY_THIS_INTERACTION_TEST'})
      }
      await locate('insertFreehand').focus();await f.page.keyboard.press('Enter');await expect.poll(drawing).toEqual({drawing:true,visible:true});await expect(locate('insertFreehand')).toHaveAttribute('aria-pressed','true')
      await locate('insertFreehand').focus();await f.page.keyboard.press('Space');await expect.poll(drawing).toEqual({drawing:false,visible:false});await expect(locate('insertFreehand')).toHaveAttribute('aria-pressed','false')
      const after={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f),identity:await upperCheckIdentity(f)};expect(after).toEqual(before)
      observations.push({before,after,visualApproval:'NOT_APPROVED'})
    } finally {await writeFile(info.outputPath('keyboard-observations.json'),JSON.stringify({observations,scope:'Actual original keyboard navigation/action/focus semantics and exact preservation, not numerical contrast or cumulative closure'}));await finishDiagramFixture(f.app)}
  })
}


// P01-UPPER-028: actual native popup text and unedited focus/indicator raster evidence.
for (const mode of ['light','dark','high-contrast'] as const) for (const density of ['compact','comfortable'] as const) {
  // eslint-disable-next-line no-empty-pattern
  test('P01-UPPER-028 actual owned popup foreground contrast and focus raster ' + mode + ' ' + density, async ({}, info) => {
    test.setTimeout(120000)
    const f=await diagramFixture('frame',{mode,density},page=>page.setViewportSize({width:1280,height:850})), observations: unknown[]=[]
    try {
      const frame=f.page.frameLocator('iframe'),targets=await upperTargets(f);await upperPinIdentity(f,targets)
      const before={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f),identity:await upperCheckIdentity(f)}
      const frameRect=await f.page.locator('iframe').boundingBox();expect(frameRect).not.toBeNull()
      const locate=(key:string)=>frame.locator('.geToolbarContainer .geToolbar a.geButton').nth(targets.find(t=>t.key===key)!.index)
      for(const target of targets) {
        const opener=locate(target.key);await opener.focus();await expect(opener).toBeFocused()
        const ring=await opener.evaluate(node=>{
          const rect=(n:Element)=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}},style=(n:Element)=>{const c=getComputedStyle(n);return {tag:n.tagName,classes:n.className,rect:rect(n),color:c.color,backgroundColor:c.backgroundColor,backgroundImage:c.backgroundImage,opacity:c.opacity,filter:c.filter,backdropFilter:c.backdropFilter,mixBlendMode:c.mixBlendMode,transform:c.transform,boxShadow:c.boxShadow,outlineWidth:c.outlineWidth,outlineOffset:c.outlineOffset,outlineStyle:c.outlineStyle,outlineColor:c.outlineColor,borderRadius:c.borderRadius,overflow:c.overflow}}
          const chain=[];for(let n:Element|null=node;n;n=n.parentElement)chain.push(style(n))
          return {focused:document.activeElement===node,focusVisible:node.matches(':focus-visible'),dpr:devicePixelRatio,chain}
        })
        expect(ring.focusVisible).toBe(true);expect(ring.dpr).toBe(1)
        const raw=await f.page.screenshot({path:info.outputPath(target.key+'-focus.png')})
        const screen=upperDecodePng(raw),r=ring.chain[0].rect,c=ring.chain[0],x=frameRect!.x+r.x,y=frameRect!.y+r.y,width=parseFloat(c.outlineWidth),offset=parseFloat(c.outlineOffset),inset=parseFloat(c.borderRadius)+width+offset
        expect(width).toBe(2);expect(offset).toBe(2)
        const bands: {side:string;x:number;y:number;ink:number[];inner:number[];outer:number[];ratio:number}[]=[]
        const sample=(side:string,xx:number,yy:number,ix:number,iy:number,ox:number,oy:number)=>{const ink=upperPixels(screen,xx,yy,1)[0],inner=upperPixels(screen,ix,iy,1)[0],outer=upperPixels(screen,ox,oy,1)[0];bands.push({side,x:xx,y:yy,ink,inner,outer,ratio:Math.min(upperContrast(ink,inner),upperContrast(ink,outer))})}
        for(let xx=x+inset;xx<x+r.width-inset;xx++)for(let t=0;t<width;t++){sample('top',xx,y-offset-width+t,xx,y-offset,xx,y-offset-width-1);sample('bottom',xx,y+r.height+offset+t,xx,y+r.height+offset-1,xx,y+r.height+offset+width)}
        for(let yy=y+inset;yy<y+r.height-inset;yy++)for(let t=0;t<width;t++){sample('left',x-offset-width+t,yy,x-offset,yy,x-offset-width-1,yy);sample('right',x+r.width+offset+t,yy,x+r.width+offset-1,yy,x+r.width+offset+width,yy)}
        expect(new Set(bands.map(b=>b.side)).size).toBe(4)
        observations.push({kind:'anchor-focus',key:target.key,frameRect,ring,screenshotSha256:fuiHash(raw),bands,method:'Every pixel of both 2px straight contour bands on all four sides, excluding original rounded corners by radius+offset+width; compare both adjacent bands. This does not certify unmeasured rounded corners or whole P01.'})
        expect.soft(Math.min(...bands.map(b=>b.ratio)),target.key+' actual focus contour contrast').toBeGreaterThanOrEqual(3)
        if(target.kind!=='menu')continue
        await f.page.keyboard.press('ArrowDown')
        const menus=frame.locator('div[data-frade-upper-menu="1"]');await expect(menus).toHaveCount(1)
        for(const depth of [0,1]) {
          if(depth===1){const parent=menus.first().locator('tr[data-frade-upper-row="1"][aria-haspopup="menu"][aria-disabled="false"]').first();if(await parent.count()===0)break;await parent.focus();await f.page.keyboard.press('ArrowRight');await expect(menus).toHaveCount(2)}
          const popup=menus.nth(depth),rows=await popup.locator('tr[data-frade-upper-row="1"]').evaluateAll(nodes=>nodes.map(node=>{
            const c=getComputedStyle(node),rect=(n:Element)=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}},read=(n:Element)=>{const s=getComputedStyle(n);return {tag:n.tagName,text:n.textContent,rect:rect(n),color:s.color,backgroundColor:s.backgroundColor,backgroundImage:s.backgroundImage,maskImage:s.maskImage,opacity:s.opacity,filter:s.filter,mixBlendMode:s.mixBlendMode,inline:n.getAttribute('style')}}
            const chain=[];for(let n:Element|null=node;n;n=n.parentElement){const s=getComputedStyle(n);chain.push({tag:n.tagName,opacity:s.opacity,filter:s.filter,backdropFilter:s.backdropFilter,mixBlendMode:s.mixBlendMode,backgroundImage:s.backgroundImage,backgroundColor:s.backgroundColor})}
            return {label:node.getAttribute('aria-label'),disabled:node.getAttribute('aria-disabled'),focused:document.activeElement===node,rect:rect(node),color:c.color,backgroundColor:c.backgroundColor,chain,texts:Array.from(node.querySelectorAll('td,span')).filter(n=>n.textContent?.trim()&&n.children.length===0).map(read),icons:Array.from(node.querySelectorAll('img,div')).map(n=>({...read(n),src:n instanceof HTMLImageElement?n.src:null}))}
          }))
          const raw=await f.page.screenshot({path:info.outputPath(target.key+'-popup-'+depth+'.png')});observations.push({kind:'owned-popup',key:target.key,depth,frameRect,rows,screenshotSha256:fuiHash(raw)})
          for(const row of rows.filter(row=>row.disabled==='false')) {
            expect(row.chain.every(c=>c.opacity==='1'&&c.filter==='none'&&c.backdropFilter==='none'&&c.mixBlendMode==='normal'&&c.backgroundImage==='none')).toBe(true)
            for(const text of row.texts) {
              expect(text.opacity).toBe('1');expect(text.filter).toBe('none');expect(text.mixBlendMode).toBe('normal')
              const rgb=(value:string)=>{expect(value).toMatch(/^rgb\(\d+, \d+, \d+\)$/);return value.match(/\d+/g)!.map(Number)}
              expect.soft(upperContrast(rgb(text.color),rgb(row.backgroundColor)),target.key+' '+row.label+' '+text.text).toBeGreaterThanOrEqual(4.5)
            }
          }
        }
        while(await menus.count())await f.page.keyboard.press('Escape')
        await expect(opener).toBeFocused()
      }
      const after={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f),identity:await upperCheckIdentity(f)};expect(after).toEqual(before);observations.push({before,after,visualApproval:'NOT_APPROVED'})
    } finally {await writeFile(info.outputPath('popup-focus-observations.json'),JSON.stringify({observations,scope:'Actual enabled opaque popup text contrast; raw focus ring and original indicator screenshots. No numerical focus/indicator PASS inferred.'}));await finishDiagramFixture(f.app)}
  })
}


// P01-UPPER-031: complete bounded decoration and real environment captures, without changing V6.
for (const mode of ['light','dark','high-contrast'] as const) for (const density of ['compact','comfortable'] as const) {
  // eslint-disable-next-line no-empty-pattern
  test('P01-UPPER-031 actual body focus bounds media neighbors and modal ' + mode + ' ' + density, async ({}, info) => {
    test.setTimeout(240000)
    const f=await diagramFixture('frame',{mode,density},page=>page.setViewportSize({width:1280,height:850})), observations: unknown[]=[], contourSamples: UpperFocusContourSample[]=[]
    let mediaSession: Awaited<ReturnType<ReturnType<Page['context']>['newCDPSession']>> | undefined
    try {
      const frame=f.page.frameLocator('iframe'),targets=await upperTargets(f);await upperPinIdentity(f,targets)
      const locate=(target:typeof targets[number])=>frame.locator('.geToolbarContainer .geToolbar a.geButton').nth(target.index)
      const absent=new Set<string>()
      for(const scenario of ['baseline','wide','narrow','restored','text200','forced-coarse-reduced-text200']) {
        await f.page.setViewportSize(scenario==='wide'?{width:1600,height:900}:scenario==='narrow'?{width:850,height:650}:{width:1280,height:850})
        if(scenario==='text200') {
          const fonts=await frame.locator('body').evaluate(()=>{const nodes=[...document.querySelectorAll<HTMLElement>('.geToolbarContainer,.geToolbarContainer *')],before=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));nodes.forEach((n,i)=>n.style.setProperty('font-size',before[i]*2+'px','important'));return nodes.map((n,i)=>({before:before[i],after:parseFloat(getComputedStyle(n).fontSize)}))})
          for(const font of fonts)expect(font.after).toBe(font.before*2)
          observations.push({scenario,fonts})
        }
        if(scenario.startsWith('forced')) {
          const previous=await frame.locator('html').getAttribute('data-frade-frame-revision')
          await f.page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'})
          mediaSession=await f.page.context().newCDPSession(f.page.frames().find(frame=>frame.url().startsWith('frade://drawio/'))!)
          await mediaSession.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
          await expect.poll(()=>frame.locator('html').evaluate(()=>({forced:matchMedia('(forced-colors:active)').matches,coarse:matchMedia('(pointer:coarse)').matches,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches}))).toEqual({forced:true,coarse:true,reduced:true})
          await expect.poll(()=>frame.locator('html').getAttribute('data-frade-frame-revision')).not.toBe(previous)
          await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
        }
        let stable=0,previous=''
        await expect.poll(async()=>{const current=JSON.stringify({state:await fuiSemantics(f,'frame'),box:await f.page.locator('iframe').boundingBox()});stable=current===previous?stable+1:0;previous=current;return stable},{timeout:5000,intervals:[100]}).toBeGreaterThanOrEqual(5)
        const before={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f),identity:await upperCheckIdentity(f)}
        for(const target of targets) {
          const node=locate(target)
          if(scenario==='narrow'&&target.key!=='viewPanels') {
            await expect(node).toBeHidden();expect(await node.evaluate(n=>{n.focus();return document.activeElement===n})).toBe(false);absent.add(target.key);observations.push({scenario,key:target.key,status:'NOT_RENDERED_ORIGINAL_RESPONSIVE'});continue
          }
          await expect(node).toBeVisible();await node.focus();await expect(node).toBeFocused()
          const ring=frame.locator('body>[data-frade-upper-focus-ring="1"]');await expect(ring).toHaveCount(1)
          const record=await node.evaluate(n=>{
            const rect=(e:Element)=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}},read=(e:Element)=>{const c=getComputedStyle(e);return {rect:rect(e),position:c.position,opacity:c.opacity,background:c.backgroundColor,border:c.borderColor,borderWidth:c.borderWidth,borderRadius:c.borderRadius,outline:c.outlineColor,outlineWidth:c.outlineWidth,outlineOffset:c.outlineOffset,filter:c.filter,backdropFilter:c.backdropFilter,transform:c.transform,mixBlendMode:c.mixBlendMode,clipPath:c.clipPath,overflow:c.overflow,z:c.zIndex,pointerEvents:c.pointerEvents,forcedColorAdjust:c.forcedColorAdjust}}
            const ring=document.querySelector<HTMLElement>('body>[data-frade-upper-focus-ring="1"]')!,contour=ring.firstElementChild!,chain=[]
            for(let e:Element|null=ring;e;e=e.parentElement)chain.push(read(e))
            return {anchor:read(n),decoration:read(ring),contour:read(contour),chain,html:ring.outerHTML,focusVisible:n.matches(':focus-visible'),documentFocused:document.hasFocus(),dpr:devicePixelRatio,viewport:{width:innerWidth,height:innerHeight},media:{forced:matchMedia('(forced-colors:active)').matches,coarse:matchMedia('(pointer:coarse)').matches,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches},neighbors:[...document.querySelectorAll<HTMLElement>('.geToolbarContainer a,.geToolbarContainer button,.geToolbarContainer input,.geToolbarContainer select')].filter(e=>e!==n&&e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0).map(e=>({tag:e.tagName,title:e.title,text:e.textContent,rect:rect(e)}))}
          })
          const frameRect=(await f.page.locator('iframe').boundingBox())!,name=scenario+'-'+target.key,raw=await f.page.screenshot({path:info.outputPath(name+'.png')}),a=record.anchor.rect,d=record.decoration.rect
          const painted={x:d.x+1,y:d.y,width:d.width-2,height:d.height},neighbors=record.neighbors.map(n=>({...n,boxOverlap:Math.max(0,Math.min(d.x+d.width,n.rect.x+n.rect.width)-Math.max(d.x,n.rect.x))*Math.max(0,Math.min(d.y+d.height,n.rect.y+n.rect.height)-Math.max(d.y,n.rect.y)),overlap:Math.max(0,Math.min(painted.x+painted.width,n.rect.x+n.rect.width)-Math.max(painted.x,n.rect.x))*Math.max(0,Math.min(painted.y+painted.height,n.rect.y+n.rect.height)-Math.max(painted.y,n.rect.y))}))
          const screen=upperDecodePng(raw),bands:unknown[]=[],ratios:number[]=[],x=frameRect.x+a.x,y=frameRect.y+a.y,inset=parseFloat(record.anchor.borderRadius)+4
          const sample=(side:string,xx:number,yy:number,ix:number,iy:number,ox:number,oy:number)=>{const ink=upperPixels(screen,xx,yy,1)[0],inner=upperPixels(screen,ix,iy,1)[0],outer=upperPixels(screen,ox,oy,1)[0],ratio=Math.min(upperContrast(ink,inner),upperContrast(ink,outer));ratios.push(ratio);bands.push({side,x:xx,y:yy,ink,inner,outer,ratio})}
          for(let xx=x+inset;xx<x+a.width-inset;xx++)for(let t=0;t<2;t++){sample('top',xx,y-4+t,xx,y-2,xx,y-5);sample('bottom',xx,y+a.height+2+t,xx,y+a.height+1,xx,y+a.height+4)}
          for(let yy=y+inset;yy<y+a.height-inset;yy++)for(let t=0;t<2;t++){sample('left',x-4+t,yy,x-2,yy,x-5,yy);sample('right',x+a.width+2+t,yy,x+a.width+1,yy,x+a.width+4,yy)}
          const capture={scenario,key:target.key,record,frameRect,screenshotSha256:fuiHash(raw),painted,neighbors,bands,minimum:Math.min(...ratios),roundedContour:'RAW_COMPLETE_PNG_RETAINED_NUMERICAL_PROOF_PENDING',visualApproval:'NOT_APPROVED'}
          observations.push(capture);contourSamples.push({name,raw,frameRect,record,mode});await writeFile(info.outputPath(name+'.json'),JSON.stringify(capture))
          expect(record.dpr).toBe(1);expect(record.focusVisible).toBe(true);expect(record.documentFocused).toBe(true);expect(a.width).toBe(record.media.coarse?44:28);expect(a.height).toBe(record.media.coarse?44:density==='compact'?28:36)
          expect(d).toEqual({x:a.x-5,y:a.y-5,width:a.width+10,height:a.height+10});expect(record.contour.rect).toEqual(a);expect(record.contour.outlineWidth).toBe('2px');expect(record.contour.outlineOffset).toBe('2px');expect(record.contour.borderRadius).toBe(record.anchor.borderRadius)
          expect(record.decoration.position).toBe('fixed');expect(record.decoration.z).toBe('4');expect(record.decoration.pointerEvents).toBe('none');expect(record.decoration.clipPath).toBe('inset(0px 1px)');expect(record.contour.clipPath).toBe('none');expect(record.chain.every((c,i)=>c.opacity==='1'&&c.filter==='none'&&c.backdropFilter==='none'&&c.transform==='none'&&c.mixBlendMode==='normal'&&c.clipPath===(i===0?'inset(0px 1px)':'none'))).toBe(true)
          expect.soft(neighbors.filter(n=>n.overlap>0),name+' must not obscure another target').toEqual([])
          expect(d.x).toBeGreaterThanOrEqual(0);expect(d.y).toBeGreaterThanOrEqual(0);expect(d.x+d.width).toBeLessThanOrEqual(record.viewport.width);expect(d.y+d.height).toBeLessThanOrEqual(record.viewport.height)
          expect.soft(Math.min(...ratios),name+' all actual straight ring bands').toBeGreaterThanOrEqual(3)
          await node.evaluate(n=>n.blur());await expect(ring).toHaveCount(0)
        }
        const after={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f),identity:await upperCheckIdentity(f)};expect(after).toEqual(before);observations.push({scenario,before,after})
        if(scenario==='restored')expect([...absent].sort()).toEqual(['insert','insertFreehand'])
      }
      const original=locate(targets[0]);await original.focus();await expect(frame.locator('[data-frade-upper-focus-ring]')).toHaveCount(1)
      await f.page.getByRole('button',{name:'Меню Файл'}).click();await expect(frame.locator('[data-frade-upper-focus-ring]')).toHaveCount(0)
      await f.page.getByRole('menuitem',{name:'Настройки интерфейса'}).click();const dialog=f.page.getByRole('dialog',{name:'Настройки интерфейса'});await expect(dialog).toBeVisible();await expect(frame.locator('[data-frade-upper-focus-ring]')).toHaveCount(0)
      const modal=await f.page.screenshot({path:info.outputPath('parent-modal.png')});observations.push({parentModal:'REAL_VISIBLE',decorationCount:0,screenshotSha256:fuiHash(modal)})
      await dialog.getByRole('button',{name:'Закрыть',exact:true}).click();await expect(dialog).toBeHidden();await original.focus();await expect(frame.locator('[data-frade-upper-focus-ring]')).toHaveCount(1)
    } finally {await writeFile(info.outputPath('body-focus-expanded.json'),JSON.stringify(observations));if(mediaSession)await mediaSession.detach();await finishDiagramFixture(f.app)}
    await upperFocusContourProof(contourSamples,info)
  })
}


type UpperFocusContourSample = {
  name: string; raw: Buffer; frameRect: {x:number;y:number}; mode:'light'|'dark'|'high-contrast'
  record: {anchor:{rect:{width:number;height:number};borderRadius:string};decoration:{rect:{x:number;y:number}};media:{forced:boolean}}
}
// Every rendered contour pixel is checked, including antialiasing and all rounded corners.
// Unknown underlay values use the complete measured 8-bit set, never a color tolerance.
async function upperFocusContourProof(samples:UpperFocusContourSample[],info:Parameters<typeof upperCalibrate>[2]) {
  const {builtinTokens}=await import('@frade/ui-workspace/design/tokens'),reference=await upperReferenceHost()
  const cache=new Map<string,{id:string;width:number;height:number;allowed:Set<number>[][];inkPixels:number[];panelPixels:number[];corners:{name:string;pixels:number}[]}>(),results:unknown[]=[]
  const pixel=(screen:ReturnType<typeof upperDecodePng>,x:number,y:number)=>{
    if(!(Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<screen.width&&y<screen.height))throw Error('Focus pixel bounds')
    const at=(y*screen.width+x)*screen.channels;if(screen.channels===4&&screen.pixels[at+3]!==255)throw Error('Focus pixel alpha')
    return [...screen.pixels.subarray(at,at+3)]
  }
  const crop=(screen:ReturnType<typeof upperDecodePng>,x:number,y:number,w:number,h:number)=>Array.from({length:w*h},(_,i)=>pixel(screen,x+i%w,y+Math.floor(i/w)))
  const check=(actual:number[][],allowed:Set<number>[][])=>{
    const failures:{pixel:number;channel:number;actual:number;allowed:number[]}[]=[]
    for(let i=0;i<actual.length;i++)for(let c=0;c<3;c++)if(!allowed[i][c].has(actual[i][c]))failures.push({pixel:i,channel:c,actual:actual[i][c],allowed:[...allowed[i][c]]})
    return {pixels:actual.length,channels:actual.length*3,failures,status:failures.length?'FAIL':'PASS'}
  }
  try {
    const page=reference.page;await page.setViewportSize({width:1400,height:1400})
    for(const sample of samples) {
      const r=sample.record,w=r.anchor.rect.width,h=r.anchor.rect.height,radius=parseFloat(r.anchor.borderRadius),forced=r.media.forced
      const colors=forced?{ink:'Highlight',panel:'Canvas'}:{ink:builtinTokens.themes[sample.mode]['focus.ring'],panel:builtinTokens.themes[sample.mode]['surface.panel']},key=JSON.stringify({w,h,radius,forced,colors})
      let atlas=cache.get(key)
      if(!atlas) {
        const id='focus-contour-atlas-'+cache.size;await page.emulateMedia({forcedColors:forced?'active':'none',reducedMotion:'reduce'})
        const layout=await page.evaluate(({w,h,radius,colors})=>{
          document.head.innerHTML='<style>html,body{margin:0;padding:0;color-scheme:normal}*{forced-color-adjust:none}</style>';document.body.innerHTML=''
          const tiles:{c:number;x:number;y:number}[]=[],rgb=(value:string)=>{const e=document.createElement('i');e.style.color=value;document.body.append(e);const color=getComputedStyle(e).color;e.remove();return color.match(/\d+/g)!.map(Number)},ink=rgb(colors.ink),panel=rgb(colors.panel)
          for(let c=0;c<256;c++) {
            const x=8+(c%16)*80,y=8+Math.floor(c/16)*80,base=document.createElement('div')
            base.style.cssText='position:absolute;left:'+x+'px;top:'+y+'px;width:'+(w+10)+'px;height:'+(h+10)+'px;background:rgb('+c+','+c+','+c+');'
            const backing=document.createElement('div');backing.style.cssText='position:absolute;inset:0;border:4px solid '+colors.panel+';border-radius:'+(radius+5)+'px;box-sizing:border-box;clip-path:inset(0px 1px);'
            const ring=document.createElement('div');ring.style.cssText='position:absolute;left:1px;top:1px;width:'+w+'px;height:'+h+'px;border-radius:'+radius+'px;outline:2px solid '+colors.ink+';outline-offset:2px;'
            backing.append(ring);base.append(backing);document.body.append(base);tiles.push({c,x,y})
          }
          return {tiles,ink,panel,dpr:devicePixelRatio}
        },{w,h,radius,colors})
        expect(layout.dpr).toBe(1)
        const raw=await page.screenshot({path:info.outputPath(id+'.png')}),screen=upperFocusDecodePng(raw),width=w+10,height=h+10,rows=layout.tiles.map(t=>crop(screen,t.x,t.y,width,height))
        const allowed=Array.from({length:width*height},(_,i)=>[0,1,2].map(c=>new Set(rows.map(row=>row[i][c])))),same=(a:number[],b:number[])=>a.every((v,i)=>v===b[i]),opaque=rows[0].map((p,i)=>rows.every(row=>same(row[i],p))?p:null)
        const inkPixels=opaque.map((p,i)=>p&&same(p,layout.ink)?i:-1).filter(i=>i>=0),panelPixels=opaque.map((p,i)=>p&&same(p,layout.panel)?i:-1).filter(i=>i>=0)
        expect(inkPixels.length).toBeGreaterThan(0);expect(panelPixels.length).toBeGreaterThan(0)
        const corners=['top-left','top-right','bottom-left','bottom-right'].map((name,j)=>({name,pixels:inkPixels.filter(i=>{const x=i%width,y=Math.floor(i/width);return(j%2===0?x<radius+5:x>=width-radius-5)&&(j<2?y<radius+5:y>=height-radius-5)}).length}))
        for(const corner of corners)expect(corner.pixels).toBeGreaterThan(0)
        const positive=check(rows[0],allowed);expect(positive.status).toBe('PASS')
        const negative:unknown[]=[]
        for(const mutation of ['missing-stroke','clipped-top','one-rounded-corner-pixel']) {
          await page.evaluate(({mutation,index,width,ink})=>{
            const base=document.body.children[0] as HTMLElement,backing=base.firstElementChild as HTMLElement,ring=backing.firstElementChild as HTMLElement
            ring.style.outlineStyle='solid';backing.style.clipPath='inset(0px 1px)';document.querySelector('[data-negative]')?.remove()
            if(mutation==='missing-stroke')ring.style.outlineStyle='none'
            if(mutation==='clipped-top')backing.style.clipPath='inset(8px 1px 0px)'
            if(mutation==='one-rounded-corner-pixel'){const p=document.createElement('div');p.dataset.negative='1';p.style.cssText='position:absolute;z-index:100;left:'+(8+index%width)+'px;top:'+(8+Math.floor(index/width))+'px;width:1px;height:1px;background:rgb('+ink.map(c=>255-c).join(',')+');';document.body.append(p)}
          },{mutation,index:inkPixels.find(i=>i%width<radius+5&&Math.floor(i/width)<radius+5)!,width,ink:layout.ink})
          const png=await page.screenshot({path:info.outputPath(id+'-'+mutation+'.png')}),proof=check(crop(upperFocusDecodePng(png),layout.tiles[0].x,layout.tiles[0].y,width,height),allowed)
          negative.push({mutation,pngSha256:fuiHash(png),status:proof.status,failedChannels:proof.failures.length});expect(proof.status,mutation+' must be rejected').toBe('FAIL')
        }
        await writeFile(info.outputPath(id+'.json'),JSON.stringify({key,layout,width,height,pngSha256:fuiHash(raw),inkPixels,panelPixels,corners,contrast:upperContrast(layout.ink,layout.panel),positive:{status:positive.status,pixels:positive.pixels},negative}))
        atlas={id,width,height,allowed,inkPixels,panelPixels,corners};cache.set(key,atlas)
      }
      const x=sample.frameRect.x+r.decoration.rect.x,y=sample.frameRect.y+r.decoration.rect.y,actual=crop(upperFocusDecodePng(sample.raw),x,y,atlas.width,atlas.height),proof=check(actual,atlas.allowed)
      const minimum=Math.min(...atlas.inkPixels.map(i=>Math.min(...atlas.panelPixels.map(j=>upperContrast(actual[i],actual[j])))))
      const result={name:sample.name,actualPngSha256:fuiHash(sample.raw),atlas:atlas.id,...proof,minimum,corners:atlas.corners,scope:'Complete declared contour raster under recorded supported composition; every pixel/channel tested against all256 rendered background values. All opaque canonical ring pixels contrasted against all opaque backing pixels. Separate actual adjacent-band/neighbor/modal guards remain mandatory; no cumulative/visual approval.'}
      await writeFile(info.outputPath(sample.name+'-contour-proof.json'),JSON.stringify(result));results.push({name:sample.name,status:proof.status,minimum})
      expect(proof.failures,sample.name+' complete rounded contour').toEqual([]);expect(minimum).toBeGreaterThanOrEqual(3)
    }
  } finally {await writeFile(info.outputPath('complete-contour-results.json'),JSON.stringify(results));await reference.app.close()}
}

// Focus-only decoder retains every original PNG guard without per-byte reporter events. V6 remains unchanged.
function upperFocusDecodePng(bytes: Buffer) {
  let width = 0, height = 0, channels = 0
  const blocks: Buffer[] = []
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]))
  for (let at = 8; at < bytes.length;) {
    const size = bytes.readUInt32BE(at), type = bytes.toString('ascii', at + 4, at + 8), data = bytes.subarray(at + 8, at + 8 + size)
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0; expect(data[8]).toBe(8); expect(data[12]).toBe(0); expect(channels).toBeGreaterThan(0) }
    if (type === 'IDAT') blocks.push(data)
    at += size + 12
  }
  const input = inflateSync(Buffer.concat(blocks)), stride = width * channels, pixels = Buffer.alloc(stride * height)
  let at = 0
  for (let y = 0; y < height; y++) { const filter = input[at++]; for (let x = 0; x < stride; x++) {
    const i = y * stride + x, left = x >= channels ? pixels[i - channels] : 0, up = y > 0 ? pixels[i - stride] : 0, diagonal = y > 0 && x >= channels ? pixels[i - stride - channels] : 0
    let predictor = 0
    if (filter === 1) predictor = left
    else if (filter === 2) predictor = up
    else if (filter === 3) predictor = Math.floor((left + up) / 2)
    else if (filter === 4) { const p = left + up - diagonal, a = Math.abs(p - left), b = Math.abs(p - up), c = Math.abs(p - diagonal); predictor = a <= b && a <= c ? left : b <= c ? up : diagonal }
    else if(filter!==0)throw Error('Unsupported focus PNG filter')
    pixels[i] = (input[at++] + predictor) & 255
  } }
  expect(at).toBe(input.length)
  return { width, height, channels, pixels }
}


// P01-NATIVE-RESIZE-SETTLEMENT-FIXTURE-01: observe native readiness only.
// Both native panel completion timers can outlive an early quiet RAF interval.
async function p01WaitNativeResizeSettlement(page: Page, info: TestInfo, label: string) {
  const result = await page.frameLocator('iframe').locator('body').evaluate(async () => {
    const ui = (window as any).__p01Ui, graph = ui.editor.graph
    const sidebar = ui.sidebarContainer as HTMLElement, format = ui.formatContainer as HTMLElement
    const samples: unknown[] = [], events: unknown[] = [], pending = new Set<string>()
    let stable = 0, previous = '', raf = 0, deadline = 0, finished = false
    const box = (node: HTMLElement) => { const b = node.getBoundingClientRect(); return [b.x, b.y, b.width, b.height] }
    const panel = (node: HTMLElement) => {
      const css = getComputedStyle(node)
      return { box: box(node), transition: node.style.transition, transform: node.style.transform,
        computedTransform: css.transform, computedTransition: css.transition,
        animating: node.getAnimations().some(animation => animation.pending || animation.playState === 'running') }
    }
    const snapshot = () => ({ viewport: [innerWidth, innerHeight], lastWindowWidth: ui.lastWindowWidth,
      view: [graph.view.scale, graph.view.translate.x, graph.view.translate.y], graph: box(graph.container),
      hsplit: ui.hsplitPosition, formatWidth: ui.formatWidth, sidebar: panel(sidebar), format: panel(format) })
    const viewListener = () => { events.push({ kind: 'view', at: performance.now(), state: snapshot(), stack: new Error('Native readiness view event').stack }); stable = 0 }
    const shapesListener = () => { pending.delete('shapesPanelChanged'); events.push({ kind: 'shapesPanelChanged', at: performance.now(), state: snapshot() }); stable = 0 }
    const formatListener = () => { pending.delete('formatWidthChanged'); events.push({ kind: 'formatWidthChanged', at: performance.now(), state: snapshot() }); stable = 0 }
    const resizeListener = () => { events.push({ kind: 'resize', at: performance.now(), state: snapshot() }); stable = 0 }
    for (const name of ['scale', 'translate', 'scaleAndTranslate']) graph.view.addListener(name, viewListener)
    ui.addListener('shapesPanelChanged', shapesListener); ui.addListener('formatWidthChanged', formatListener)
    window.addEventListener('resize', resizeListener)
    let outcome: { settled: boolean; reason: string } | undefined
    try {
      outcome = await new Promise<{ settled: boolean; reason: string }>(resolve => {
        const finish = (settled: boolean, reason: string) => { if (!finished) { finished = true; resolve({ settled, reason }) } }
        // This deadline bounds a stalled/background RAF; it never grants readiness.
        deadline = window.setTimeout(() => finish(false, 'Native settlement deadline exceeded'), 5000)
        const observe = () => {
          if (finished) return
          const state = snapshot()
          if (state.sidebar.transition || state.sidebar.transform) pending.add('shapesPanelChanged')
          if (state.format.transition) pending.add('formatWidthChanged')
          const clear = state.lastWindowWidth === innerWidth && pending.size === 0 &&
            !state.sidebar.transition && !state.sidebar.transform && !state.sidebar.animating &&
            !state.format.transition && !state.format.animating
          const signature = JSON.stringify(state)
          stable = clear && previous === signature ? stable + 1 : 0
          previous = signature
          samples.push({ at: performance.now(), state, pending: [...pending], clear, stable })
          if (stable >= 6) finish(true, 'Native transitions complete and geometry stable')
          else if (samples.length >= 120 || events.length >= 256) finish(false, 'Native settlement observation bound exceeded')
          else raf = requestAnimationFrame(observe)
        }
        observe()
      })
    } finally {
      finished = true; cancelAnimationFrame(raf); clearTimeout(deadline)
      graph.view.removeListener(viewListener); ui.removeListener(shapesListener); ui.removeListener(formatListener)
      window.removeEventListener('resize', resizeListener)
    }
    return { ...outcome, samples, events, cleanup: true }
  })
  await writeFile(info.outputPath('native-settlement-' + label + '.json'), JSON.stringify(result, null, 2))
  if (!result.settled) throw Error(result.reason)
}
