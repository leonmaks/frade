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

for (const mode of ['light', 'dark', 'high-contrast'] as const)
  for (const density of ['compact', 'comfortable'] as const) {
    // eslint-disable-next-line no-empty-pattern
    test(
      'P01-LOWER-matrix ' +
        mode +
        ' ' +
        density +
        ' actual lower and popup target focus contrast bounds',
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
                      mask: css.maskImage,
                      hit: !!hit && (hit === node || node.contains(hit)),
                      clips,
                    }
                  }),
                }
              })
            const lower = await inspect()
            observations.push({ label: label + '-lower', ...lower })
            await f.page.screenshot({ path: info.outputPath(label + '-lower-focus.png') })
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
                    control.mask !== 'none')
                )
                  violations.push({ label, rule: 'A11Y-003_UNCLIPPED_FOCUS', control })
              }
            }
            await f.page.screenshot({ path: info.outputPath(label + '-popup-focus.png') })
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
