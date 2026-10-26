import { inflateSync } from 'node:zlib'
import { test, expect, _electron as electron, type Page } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { createFlowFixture } from '../../../../scripts/flow-fixtures.mjs'


import { readFileSync } from 'node:fs'
const upstreamCss = readFileSync(resolve('vendor/drawio/styles/grapheditor.css'), 'utf8')
function sourceColor(name: string) {
  const value=upstreamCss.split(name+':')[1]?.split(';')[0].trim()
  if(!value || !/^#[a-f0-9]{6}$/i.test(value))throw Error('Missing pinned color '+name)
  const channels=[1,3,5].map(at=>parseInt(value.slice(at,at+2),16))
  return {hex:value.toUpperCase(),rgb:'rgb('+channels.join(', ')+')',channels}
}
const stockUi={base:sourceColor('--field-color'),panel:sourceColor('--ge-panel-color'),dialog:sourceColor('--dialog-color'),workspace:sourceColor('--workspace-color'),strong:sourceColor('--strong-text-color'),buttonHeight:Number(upstreamCss.split('.geBtn {')[1].split('}')[0].split('height:')[1].split('px')[0].trim())}

type Engine = 'native' | 'frame'
async function openEditor(
  engine: Engine,
  density: 'compact' | 'comfortable',
  frameAttributes?: string,
) {
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
  if (frameAttributes) {
    if (engine !== 'frame') throw Error('Page/image fixture is Drawio-only')
    const original = await readFile(file, 'utf8')
    await writeFile(
      file,
      original
        .replace('page="0"', 'page="1"')
        .replace('<mxGraphModel ', '<mxGraphModel ' + frameAttributes + ' '),
    )
  }
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
        density: document.documentElement.dataset.fradeDensity,
        controlHeight: document.querySelector('[aria-label="Поиск объектов"]')!.getBoundingClientRect().height,
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
        expect(before.parent.background).toBe(stockUi.panel.rgb)
        expect(before.parent.panel).toBe(stockUi.panel.rgb)
        expect(before.content.background).toBe(engine === 'native' ? stockUi.base.rgb : stockUi.workspace.rgb)
        expect(before.content.theme).toBe('light')
        expect(before.parent.app.controlHeight).toBeGreaterThanOrEqual(density === 'compact' ? 28 : 36)
        expect(before.parent.density).toBe(density)
        expect(before.parent.app.density).toBe(density)
        expect(before.parent.control.height).toBe(stockUi.buttonHeight)
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
          expect(menu.background).toBe(stockUi.panel.rgb)
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
          .toBe(stockUi.base.hex)
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
    expect(appearance.background).toBe(stockUi.dialog.rgb)
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

function ldeDecodePng(bytes: Buffer) {
  let width = 0,
    height = 0,
    channels = 0
  const blocks: Buffer[] = []
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  for (let at = 8; at < bytes.length;) {
    const size = bytes.readUInt32BE(at),
      type = bytes.toString('ascii', at + 4, at + 8),
      data = bytes.subarray(at + 8, at + 8 + size)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0
      expect(data[8]).toBe(8)
      expect(data[12]).toBe(0)
      expect(channels).toBeGreaterThan(0)
    }
    if (type === 'IDAT') blocks.push(data)
    at += size + 12
  }
  const input = inflateSync(Buffer.concat(blocks)),
    stride = width * channels,
    pixels = Buffer.alloc(stride * height)
  let at = 0
  for (let y = 0; y < height; y++) {
    const filter = input[at++]
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x,
        left = x >= channels ? pixels[i - channels] : 0,
        up = y > 0 ? pixels[i - stride] : 0,
        diagonal = y > 0 && x >= channels ? pixels[i - stride - channels] : 0
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
      } else expect(filter).toBe(0)
      pixels[i] = (input[at++] + predictor) & 255
    }
  }
  expect(at).toBe(input.length)
  return { width, height, channels, pixels }
}

for (const density of ['compact', 'comfortable'] as const)
  for (const coarse of [false, true]) {
    // eslint-disable-next-line no-empty-pattern
    test(`LDE geometry native toolbar ${density}/coarse=${coarse} has no vertical clipping`, async ({}, info) => {
      const f = await openEditor('native', density)
      const session = await f.page.context().newCDPSession(f.page)
      try {
        if (coarse) {
          await session.send('Emulation.setTouchEmulationEnabled', {
            enabled: true,
            maxTouchPoints: 1,
          })
          await expect
            .poll(() => f.page.evaluate(() => matchMedia('(pointer: coarse)').matches))
            .toBe(true)
        }
        const metrics = await f.page
          .locator('.frade-canvas > main > header')
          .evaluate((header) => ({
            clientHeight: header.clientHeight,
            scrollHeight: header.scrollHeight,
            height: header.getBoundingClientRect().height,
            padding: getComputedStyle(header).padding,
            coarse: matchMedia('(pointer: coarse)').matches,
            controls: Array.from(header.querySelectorAll('button')).map((button) => ({
              text: button.textContent,
              height: button.getBoundingClientRect().height,
              top: button.getBoundingClientRect().top,
              bottom: button.getBoundingClientRect().bottom,
            })),
          }))
        await writeFile(info.outputPath('toolbar-metrics.json'), JSON.stringify(metrics, null, 2))
        await f.page.screenshot({ path: info.outputPath('toolbar.png') })
        expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight)
        const outer=await f.page.getByLabel('Поиск объектов',{exact:true}).evaluate(node=>({height:node.getBoundingClientRect().height,density:document.documentElement.dataset.fradeDensity}))
        expect(outer.height).toBeGreaterThanOrEqual(coarse ? 44 : density === 'comfortable' ? 36 : 28)
        expect(outer.density).toBe(density)
        for (const control of metrics.controls)
          expect(control.height).toBeGreaterThanOrEqual(coarse ? 44 : stockUi.buttonHeight)
        expect(await readFile(f.file, 'utf8')).toBe(f.bytes)
      } finally {
        await session.detach()
        await f.app.close()
      }
    })
  }
// eslint-disable-next-line no-empty-pattern
test('LDE geometry frame implicit workspace is visibly neutral below authored cells', async ({}, info) => {
  const f = await openEditor('frame', 'compact')
  try {
    const frame = f.page.frameLocator('iframe'),
      container = frame.locator('.geDiagramContainer')
    const layers = await container.evaluate((element) => {
      const ui = (window as any).__ldeUi,
        graph = ui.editor.graph,
        view = graph.view
      const summary = (node: Element | null | undefined) =>
        node
          ? {
              tag: node.tagName,
              class: node.getAttribute('class'),
              style: node.getAttribute('style'),
              fill: node.getAttribute('fill'),
              background: getComputedStyle(node).backgroundColor,
              bounds: node.getBoundingClientRect().toJSON(),
            }
          : null
      return {
        modelHeader: (window as any).mxUtils
          .getXml(ui.editor.getGraphXml())
          .match(/<mxGraphModel[^>]*>/)?.[0],
        graphBackground: graph.background,
        backgroundImage: graph.backgroundImage,
        pageVisible: graph.pageVisible,
        container: summary(element),
        canvas: summary(view.canvas),
        ownerSvg: summary(view.canvas?.ownerSVGElement),
        backgroundPane: summary(view.backgroundPane),
        backgroundChildren: Array.from(view.backgroundPane?.children ?? []).map((node) =>
          summary(node as Element),
        ),
        backgroundPage: summary(view.backgroundPageShape?.node),
        children: Array.from(element.children).map(summary),
        privateGrid: summary(element.querySelector('[data-frade-private-grid]')),
      }
    })
    const bytes = await container.screenshot({ path: info.outputPath('visible-workspace.png') }),
      decoded = ldeDecodePng(bytes)
    let neutral = 0
    for (let y = 32; y < 48; y++)
      for (let x = 32; x < 48; x++) {
        const at = (y * decoded.width + x) * decoded.channels
        if (
          decoded.pixels[at] === stockUi.base.channels[0] &&
          decoded.pixels[at + 1] === stockUi.base.channels[1] &&
          decoded.pixels[at + 2] === stockUi.base.channels[2]
        )
          neutral++
      }
    await writeFile(
      info.outputPath('backing-layers.json'),
      JSON.stringify(
        {
          layers,
          neutralPixelsInBlankPatch: neutral,
          sampledPatch: { x: 32, y: 32, width: 16, height: 16 },
          source: 'Actual PNG decode; no author node lies in the declared blank fixture patch',
        },
        null,
        2,
      ),
    )
    expect(layers.modelHeader).not.toContain('background=')
    expect(neutral).toBeGreaterThan(0)
    expect(await readFile(f.file, 'utf8')).toBe(f.bytes)
  } finally {
    await f.app.close()
  }
})

for (const paint of ['white-page', 'colored-page', 'image-background'] as const) {
  test(
    'LDE author backing ' + paint + ' stays content-owned across forced colors',
    // eslint-disable-next-line no-empty-pattern
    async ({}, info) => {
      const image = {
          src:
            'data:image/svg+xml,' +
            encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#C83717"/></svg>',
            ),
          width: 40,
          height: 40,
        },
        attributes =
          paint === 'image-background'
            ? 'backgroundImage="' +
              JSON.stringify(image).replaceAll('&', '&amp;').replaceAll('"', '&quot;') +
              '"'
            : 'background="' + (paint === 'white-page' ? '#FFFFFF' : '#213752') + '"',
        f = await openEditor('frame', 'comfortable', attributes)
      try {
        const container = f.page.frameLocator('iframe').locator('.geDiagramContainer')
        const sample = () =>
          container.evaluate(() => {
            const ui = (window as any).__ldeUi,
              graph = ui.editor.graph,
              svg = graph.view.canvas.ownerSVGElement
            return {
              xml: (window as any).mxUtils.getXml(ui.editor.getGraphXml()),
              background: graph.background,
              image: graph.getBackgroundImageObject(graph.backgroundImage),
              backing: svg.getAttribute('data-frade-presentation-workspace-backing'),
              page: graph.pageVisible,
              outerStyle: svg.getAttribute('style'),
              authored: Array.from(graph.view.drawPane.querySelectorAll('[fill],[stroke]')).map(
                (node: any) => ({
                  fill: node.getAttribute('fill'),
                  stroke: node.getAttribute('stroke'),
                }),
              ),
            }
          })
        const before = await sample()
        expect(before.backing).toBeNull()
        expect(before.page).toBe(true)
        if (paint === 'image-background') expect(before.image).toMatchObject(image)
        else expect(before.background).toBe(paint === 'white-page' ? '#FFFFFF' : '#213752')
        await container.screenshot({ path: info.outputPath('authored-backing.png') })
        await f.page.emulateMedia({ forcedColors: 'active' })
        await expect
          .poll(() => f.page.evaluate(() => matchMedia('(forced-colors: active)').matches))
          .toBe(true)
        await expect
          .poll(() =>
            f.page
              .locator('.repository-diagram')
              .evaluate((root) =>
                getComputedStyle(root).getPropertyValue('--frade-diagram-canvas').trim(),
              ),
          )
          .toBe('Canvas')
        const forced = await sample()
        await f.page.emulateMedia({ forcedColors: 'none' })
        await expect
          .poll(() =>
            f.page
              .locator('.repository-diagram')
              .evaluate((root) =>
                getComputedStyle(root).getPropertyValue('--frade-diagram-canvas').trim(),
              ),
          )
          .toBe(stockUi.base.hex)
        const after = await sample()
        for (const observed of [forced, after]) {
          expect(observed.xml).toBe(before.xml)
          expect(observed.background).toBe(before.background)
          expect(observed.image).toEqual(before.image)
          expect(observed.authored).toEqual(before.authored)
          expect(observed.backing).toBeNull()
        }
        expect(await readFile(f.file, 'utf8')).toBe(f.bytes)
        expect(await readFile(f.settings, 'utf8')).toBe(f.settingsBefore)
        await writeFile(
          info.outputPath('author-preservation.json'),
          JSON.stringify(
            { before, forced, after, nativeCapability: 'UNSUPPORTED page/image fields' },
            null,
            2,
          ),
        )
      } finally {
        await f.app.close()
      }
    },
  )
}
// eslint-disable-next-line no-empty-pattern
test('LDE surface frame dialog tooltip and panels use owned Light chrome', async ({}, info) => {
  const f = await openEditor('frame', 'compact')
  const frame = f.page.frameLocator('iframe'),
    body = frame.locator('body')
  const observations: unknown[] = []
  try {
    const before = await body.evaluate(() => {
      const ui = (window as any).__ldeUi
      return (window as any).mxUtils.getXml(ui.editor.getGraphXml())
    })
    observations.push(
      await body.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            '.geMenubarContainer,.geToolbarContainer,.geSidebarContainer,.geSidebar,.geFormatContainer,.geFooterContainer,.geTabContainer',
          ),
        ).map((node) => ({
          class: node.className,
          background: getComputedStyle(node).backgroundColor,
          color: getComputedStyle(node).color,
          bounds: node.getBoundingClientRect().toJSON(),
        })),
      ),
    )
    await body.evaluate(() => (window as any).__ldeUi.actions.get('editDiagram').funct())
    const dialog = frame.locator('.geDialog:visible')
    await expect(dialog).toBeVisible()
    const dialogStyle = await dialog.evaluate((node) => ({
      background: getComputedStyle(node).backgroundColor,
      color: getComputedStyle(node).color,
      controls: Array.from(node.querySelectorAll('button,input,textarea')).map((el) => ({
        tag: el.tagName,
        text: el.textContent?.slice(0, 50),
        height: el.getBoundingClientRect().height,
      })),
    }))
    observations.push({ phase: 'actual-editDiagram-command', dialogStyle })
    await f.page.screenshot({ path: info.outputPath('frame-dialog.png') })
    expect(dialogStyle.background).toBe(stockUi.dialog.rgb)
    await dialog
      .locator('button')
      .filter({ hasText: /^(Cancel|Отмена)$/ })
      .click()
    await expect(dialog).toBeHidden()
    await body.evaluate(() =>
      (window as any).__ldeUi.editor.graph.tooltipHandler.show('LDE fixture tooltip', 40, 100),
    )
    const tooltip = frame.locator('.mxTooltip:visible')
    await expect(tooltip).toBeVisible()
    const tooltipStyle = await tooltip.evaluate((node) => ({
      background: getComputedStyle(node).backgroundColor,
      color: getComputedStyle(node).color,
      border: getComputedStyle(node).borderColor,
    }))
    observations.push({ phase: 'existing-mxTooltip-widget-fixture', tooltipStyle })
    await f.page.screenshot({ path: info.outputPath('frame-tooltip.png') })
    await writeFile(info.outputPath('surfaces.json'), JSON.stringify(observations, null, 2))
    expect(tooltipStyle.background).toBe(stockUi.panel.rgb)
    await body.evaluate(() => (window as any).__ldeUi.editor.graph.tooltipHandler.hide())
    const after = await body.evaluate(() => {
      const ui = (window as any).__ldeUi
      return (window as any).mxUtils.getXml(ui.editor.getGraphXml())
    })
    expect(after).toBe(before)
    expect(await readFile(f.file, 'utf8')).toBe(f.bytes)
    expect(await readFile(f.settings, 'utf8')).toBe(f.settingsBefore)
  } finally {
    await writeFile(info.outputPath('surfaces-final.json'), JSON.stringify(observations, null, 2))
    await f.app.close()
  }
})

for (const engine of ['native', 'frame'] as const) {
  test(
    'LDE upstream contract ' + engine + ' matches pinned Light panels and button geometry',
    // eslint-disable-next-line no-empty-pattern
    async ({}, info) => {
      const css = await readFile(resolve('vendor/drawio/styles/grapheditor.css'), 'utf8'),
        hex = css.match(/--ge-panel-color:\s*#([0-9a-f]{6});/i)![1],
        panel =
          'rgb(' + [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16)).join(', ') + ')',
        buttonHeight = Number(
          css.match(/\.geBtn \{([\s\S]*?)\}/)![1].match(/height:\s*(\d+)px/)![1],
        ),
        f = await openEditor(engine, 'compact')
      try {
        const before = await witness(f.page, engine)
        await writeFile(
          info.outputPath('upstream-observation.json'),
          JSON.stringify(
            {
              engine,
              expected: { panel, buttonHeight },
              actual: before,
              source: 'Pinned unmodified grapheditor.css; application preference Dark',
            },
            null,
            2,
          ),
        )
        await f.page.screenshot({ path: info.outputPath('upstream-integration.png') })
        expect(await readFile(f.file, 'utf8')).toBe(f.bytes)
        expect(await readFile(f.settings, 'utf8')).toBe(f.settingsBefore)
        expect(before.parent.panel).toBe(panel)
      expect(before.parent.background).toBe(panel)
        expect(before.parent.control.height).toBe(buttonHeight)
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
        expect(forced.content.author).toEqual(before.content.author)
        await f.page.emulateMedia({ forcedColors: 'none' })
        await expect
          .poll(() =>
            f.page
              .locator('.repository-diagram')
              .evaluate((root) =>
                (root as HTMLElement).style.getPropertyValue('--frade-diagram-canvas'),
              ),
          )
          .toBe('#FFFFFF')
        await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
        const restored = await witness(f.page, engine)
        expect(restored.parent.panel).toBe(panel)
        expect(restored.parent.control.height).toBe(buttonHeight)
        expect(restored.content.author).toEqual(before.content.author)
        expect(restored.parent.dirty).toBe(before.parent.dirty)
        expect(await readFile(f.file, 'utf8')).toBe(f.bytes)
        expect(await readFile(f.settings, 'utf8')).toBe(f.settingsBefore)
        await writeFile(
          info.outputPath('upstream-system-roundtrip.json'),
          JSON.stringify({ before, forced, restored, sourceUnchanged: true }, null, 2),
        )
      } finally {
        await f.app.close()
      }
    },
  )
}
// eslint-disable-next-line no-empty-pattern
test('LDE upstream source witness records pinned unoverridden Light', async ({}, info) => {
  const f = await openEditor('frame', 'compact'),
    body = f.page.frameLocator('iframe').locator('body')
  try {
    const observed = await body.evaluate(() => {
      document.querySelector('style[data-frade-private-theme]')?.remove()
      const grid = document.querySelector<SVGSVGElement>('[data-frade-private-grid]')
      if (grid) grid.style.display = 'none'
      document.body.style.colorScheme = 'light'
      const ui = (window as any).__ldeUi,
        graph = ui.editor.graph,
        view = graph.view,
        style = (node: Element | null) => {
          if (!node) return null
          const s = getComputedStyle(node)
          return {
            class: node.className,
            background: s.backgroundColor,
            color: s.color,
            border: s.borderColor,
            font: s.font,
            fontSize: s.fontSize,
            height: s.height,
            bounds: node.getBoundingClientRect().toJSON(),
            backgroundImage: s.backgroundImage,
          }
        }
      const panelNode = document.querySelector('.geSidebarContainer')
      let panelBacking: Element | null = panelNode
      while (panelBacking && getComputedStyle(panelBacking).backgroundColor === 'rgba(0, 0, 0, 0)')
        panelBacking = panelBacking.parentElement
      return {
        effectivePanel: panelBacking ? getComputedStyle(panelBacking).backgroundColor : null,
        bodyClass: document.body.className,
        body: style(document.body),
        container: style(graph.container),
        svg: style(view.canvas.ownerSVGElement),
        graphBackground: graph.background,
        gridColor: graph.gridColor,
        defaultGridColor: graph.defaultGridColor,
        gridSize: graph.gridSize,
        gridSteps: graph.gridSteps,
        gridEnabled: graph.gridEnabled,
        pageVisible: graph.pageVisible,
        panel: style(document.querySelector('.geSidebarContainer')),
        toolbar: style(document.querySelector('.geToolbarContainer')),
        media: {
          dark: matchMedia('(prefers-color-scheme:dark)').matches,
          forced: matchMedia('(forced-colors:active)').matches,
        },
      }
    })
    await body.evaluate(() => (window as any).__ldeUi.actions.get('editDiagram').funct())
    const dialog = f.page.frameLocator('iframe').locator('.geDialog:visible')
    await expect(dialog).toBeVisible()
    const controls = await dialog.evaluate((node) => {
      const css = getComputedStyle(node)
      return {
        background: css.backgroundColor,
        color: css.color,
        buttons: Array.from(node.querySelectorAll('button')).map((button) => {
          const c = getComputedStyle(button)
          return {
            text: button.textContent,
            height: button.getBoundingClientRect().height,
            background: c.backgroundColor,
            color: c.color,
            fontSize: c.fontSize,
            border: c.border,
            radius: c.borderRadius,
            padding: c.padding,
          }
        }),
      }
    })
    await writeFile(
      info.outputPath('upstream-stock.json'),
      JSON.stringify(
        {
          kind: 'TEST_ONLY_STYLESHEET_REMOVAL_SOURCE_WITNESS',
          observed,
          controls,
          version: '31.5.2',
          notProductionOrFullParityProof: true,
        },
        null,
        2,
      ),
    )
    await f.page.screenshot({ path: info.outputPath('upstream-stock.png') })
    expect(observed.effectivePanel).toBe('rgb(241, 243, 244)')
    expect(controls.buttons.every((button) => button.height === 30)).toBe(true)
    await dialog
      .locator('button')
      .filter({ hasText: /^(Cancel|Отмена)$/ })
      .click()
    expect(await readFile(f.file, 'utf8')).toBe(f.bytes)
    expect(await readFile(f.settings, 'utf8')).toBe(f.settingsBefore)
  } finally {
    await f.app.close()
  }
})
for (const engine of ['native', 'frame'] as const) {
  // eslint-disable-next-line no-empty-pattern
  test('LDE upstream isolation '+engine+' keeps fixed metrics across reference System and outer density', async ({}, info) => {
    const f=await openEditor(engine,'comfortable'), observations: unknown[]=[]
    try {
      const before=await witness(f.page,engine)
      await f.page.getByRole('button',{name:'Меню Файл',exact:true}).click()
      await f.page.getByRole('menuitem',{name:'Выбрать тему…',exact:true}).click()
      const picker=f.page.getByRole('dialog',{name:'Выбор темы',exact:true})
      for(const [label,kind] of [['VS Code Dark 2026','dark'],['Светлая (Light)','light'],['Контрастная (HC)','high-contrast'],['Системная (System)','light'],['Тёмная (Dark)','dark']]) {
        if(label==='Системная (System)')await f.page.emulateMedia({colorScheme:'light'})
        await picker.getByRole('option',{name:label,exact:true}).click()
        await expect(f.page.locator('html')).toHaveAttribute('data-frade-theme',kind)
        await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
        const state=await witness(f.page,engine)
        observations.push({phase:label,state})
        await writeFile(info.outputPath('isolation-observations.json'),JSON.stringify(observations,null,2))
        expect(state.parent.control.height).toBe(stockUi.buttonHeight)
        expect(state.parent.panel).toBe(stockUi.panel.rgb)
        expect(state.parent.app.density).toBe('comfortable')
        expect(state.parent.app.controlHeight).toBeGreaterThanOrEqual(36)
        expect(await readFile(f.file,'utf8')).toBe(f.bytes)
        expect(await readFile(f.settings,'utf8')).toBe(f.settingsBefore)
        if(label==='Системная (System)') {
          await f.page.emulateMedia({colorScheme:'dark'})
          await expect(f.page.locator('html')).toHaveAttribute('data-frade-theme','dark')
          const dark=await witness(f.page,engine)
          observations.push({phase:'System OS Dark',state:dark})
          expect(dark.parent.control.height).toBe(stockUi.buttonHeight)
          expect(dark.parent.panel).toBe(stockUi.panel.rgb)
        }
      }
      await f.page.keyboard.press('Escape')
      await expect(picker).toBeHidden()
      await f.page.getByRole('button',{name:'Меню Файл',exact:true}).click()
      await f.page.getByRole('menuitem',{name:'Настройки интерфейса',exact:true}).click()
      const settings=f.page.getByRole('dialog',{name:'Настройки интерфейса',exact:true})
      for(const [label,density,minimum] of [['Компактная','compact',28],['Комфортная','comfortable',36]] as const){
        await settings.getByRole('radio',{name:label,exact:true}).click()
        await expect(f.page.locator('html')).toHaveAttribute('data-frade-density',density)
        await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
        const state=await witness(f.page,engine)
        observations.push({phase:'Outer density '+density,state})
        expect(state.parent.density).toBe(density)
        expect(state.parent.app.controlHeight).toBeGreaterThanOrEqual(minimum)
        expect(state.parent.control.height).toBe(stockUi.buttonHeight)
        expect(await readFile(f.settings,'utf8')).toBe(f.settingsBefore)
      }
      await settings.getByRole('button',{name:'Закрыть',exact:true}).click()
      await expect(settings).toBeHidden()
      const after=await witness(f.page,engine)
      expect(after.content.author).toEqual(before.content.author)
      expect(after.parent.dirty).toBe(before.parent.dirty)
      expect(await readFile(f.file,'utf8')).toBe(f.bytes)
      expect(await readFile(f.settings,'utf8')).toBe(f.settingsBefore)
      await f.page.screenshot({path:info.outputPath('fixed-editor-after-roundtrip.png')})
      await writeFile(info.outputPath('isolation-observations.json'),JSON.stringify({observations,before,after},null,2))
    }finally{await f.app.close()}
  })
}
for(const engine of ['native','frame'] as const){
  // eslint-disable-next-line no-empty-pattern
  test('LDE system '+engine+' respects dark forced colors on reachable controls',async({},info)=>{
    const f=await openEditor(engine,'compact')
    try{
      const before=await witness(f.page,engine)
      if(engine==='frame')await f.page.frameLocator('iframe').locator('body').evaluate(()=>(window as any).__ldeUi.actions.get('editDiagram').funct())
      const target=engine==='native'?f.page.locator('.editor-actions > button').nth(1):f.page.frameLocator('iframe').locator('.geDialog:visible').getByRole('button',{name:'Отмена',exact:true})
      await f.page.emulateMedia({forcedColors:'active',colorScheme:'dark'})
      await expect.poll(()=>f.page.locator('.repository-diagram').evaluate(root=>(root as HTMLElement).style.getPropertyValue('--frade-diagram-canvas'))).toBe('Canvas')
      await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
      const system=await target.evaluate(node=>{
        const probe=document.createElement('span')
        probe.style.cssText='color:CanvasText;background-color:Canvas;forced-color-adjust:none;color-scheme:light dark;position:fixed;left:-10000px;'
        document.body.append(probe)
        try{
          const expected=getComputedStyle(probe),actual=getComputedStyle(node)
          let ancestor:Element|null=node
          while(ancestor&&getComputedStyle(ancestor).backgroundColor==='rgba(0, 0, 0, 0)')ancestor=ancestor.parentElement
          return {forced:matchMedia('(forced-colors:active)').matches,dark:matchMedia('(prefers-color-scheme:dark)').matches,expected:{color:expected.color,background:expected.backgroundColor},actual:{color:actual.color,background:ancestor?getComputedStyle(ancestor).backgroundColor:null,border:actual.borderColor,scheme:actual.colorScheme,adjust:actual.forcedColorAdjust}}
        }finally{probe.remove()}
      })
      await writeFile(info.outputPath('actual-system-colors.json'),JSON.stringify(system,null,2))
      await f.page.screenshot({path:info.outputPath('dark-forced-control.png')})
      expect(system.forced).toBe(true)
      expect(system.dark).toBe(true)
      expect(system.actual.color).toBe(system.expected.color)
      expect(system.actual.background).toBe(system.expected.background)
      expect(system.actual.border).toBe(system.expected.color)
      if(engine==='frame')await target.click()
      await f.page.emulateMedia({forcedColors:'none',colorScheme:'light'})
      await expect.poll(()=>f.page.locator('.repository-diagram').evaluate(root=>(root as HTMLElement).style.getPropertyValue('--frade-diagram-canvas'))).toBe(stockUi.base.hex)
      const after=await witness(f.page,engine)
      expect(after.content.author).toEqual(before.content.author)
      expect(after.parent.dirty).toBe(before.parent.dirty)
      expect(await readFile(f.file,'utf8')).toBe(f.bytes)
      expect(await readFile(f.settings,'utf8')).toBe(f.settingsBefore)
    }finally{await f.app.close()}
  })
}

for (const engine of ['frame'] as const) {
  // eslint-disable-next-line no-empty-pattern
  test('LDE author gradient alpha and inherited paint survive actual preview cancel commit and forced colors', async ({}, info) => {
    const f = await openEditor(engine, 'compact')
    const body = f.page.frameLocator('iframe').locator('body')
    const probes: unknown[] = []
    try {
      await body.evaluate(() => {
        const ui = (window as any).__ldeUi, graph = ui.editor.graph, model = graph.getModel()
        const a = model.getCell('node-A'), b = model.getCell('node-B')
        if (!a || !b) throw Error('Missing synthetic authored cells')
        ;(window as any).__ldeAuthorGraph = graph
        model.beginUpdate()
        try {
          model.setStyle(a, model.getStyle(a) + ';fillColor=#77AADD;gradientColor=#CC6688;gradientDirection=east;opacity=65;fillOpacity=60;strokeOpacity=80;textOpacity=70;')
          model.setStyle(b, model.getStyle(b) + ';fillColor=inherit;strokeColor=inherit;fontColor=inherit;')
        } finally { model.endUpdate() }
      })
      const sample = async () => { const measured = await body.evaluate(() => {
        const ui = (window as any).__ldeUi, graph = ui.editor.graph, model = graph.getModel()
        const svg = graph.view.canvas.ownerSVGElement
        const exported = ui.editor.getGraphXml()
        const value = {
          xml: (window as any).mxUtils.getXml(new (window as any).mxCodec().encode(model)),
          exportAttributes: [...exported.attributes].filter((attr: Attr) => !['dx', 'dy'].includes(attr.name)).map((attr: Attr) => [attr.name, attr.value]),
          projection: { scale: graph.view.scale, x: graph.view.translate.x - graph.container.scrollLeft / graph.view.scale, y: graph.view.translate.y - graph.container.scrollTop / graph.view.scale },
          exportProjection: { scale: graph.view.scale, x: Number(exported.getAttribute('dx') || 0) - graph.container.scrollLeft / graph.view.scale, y: Number(exported.getAttribute('dy') || 0) - graph.container.scrollTop / graph.view.scale },
          identity: graph === (window as any).__ldeAuthorGraph,
          styles: ['node-A', 'node-B'].map(id => {
            const cell = model.getCell(id), state = graph.view.getState(cell), node = state.shape.node
            return { model: model.getStyle(cell), resolved: graph.getCellStyle(cell), render: { bounds: node.getBoundingClientRect().toJSON(), paint: [node, ...node.querySelectorAll('*')].map((element: Element) => ({ tag: element.tagName, attributes: [...element.attributes].filter(attr => !['x', 'y'].includes(attr.name)).map(attr => [attr.name, attr.value]) })) } }
          }),
          gradients: [...svg.querySelectorAll('linearGradient')].map((node: Element) => ({ markup: node.outerHTML, stops: [...node.querySelectorAll('stop')].map(stop => ({ color: getComputedStyle(stop).stopColor, opacity: getComputedStyle(stop).stopOpacity })) })),
        }
        return { value, diagnostic: { exportXml: (window as any).mxUtils.getXml(exported), rawRender: ['node-A', 'node-B'].map(id => graph.view.getState(model.getCell(id)).shape.node.outerHTML), modelXml: (window as any).mxUtils.getXml(new (window as any).mxCodec().encode(model)), scale: graph.view.scale, translate: { ...graph.view.translate }, scroll: { left: graph.container.scrollLeft, top: graph.container.scrollTop }, container: graph.container.getBoundingClientRect().toJSON(), cells: ['node-A', 'node-B'].map(id => ({ geometry: model.getGeometry(model.getCell(id)), rect: graph.view.getState(model.getCell(id)).shape.node.getBoundingClientRect().toJSON() })) } }
      }); probes.push({ ...measured, host: await f.page.locator('iframe').boundingBox() }); return measured.value }

      await body.evaluate(async () => { await document.fonts.ready; await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))) })
      const before = await sample(), dirty = await f.page.locator('.dirty-dot').count()
      expect(before.xml).toContain('gradientColor=#CC6688')
      expect(before.xml).toContain('opacity=65')
      expect(before.styles[1].model).toContain('fillColor=inherit')
      expect(before.gradients.length).toBeGreaterThan(0)
      await f.page.getByRole('button', { name: 'Меню Файл', exact: true }).click()
      await f.page.getByRole('menuitem', { name: 'Выбрать тему…', exact: true }).click()
      await f.page.getByRole('option', { name: 'VS Code Dark 2026', exact: true }).click()
      await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
      expect(await sample()).toEqual(before)
      await f.page.keyboard.press('Escape')
      await expect(f.page.getByRole('dialog', { name: 'Выбор темы' })).toBeHidden()
      await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
      expect(await sample()).toEqual(before)
      for (const forcedColors of ['active', 'none'] as const) {
        await f.page.emulateMedia({ forcedColors })
        await expect.poll(() => f.page.locator('.repository-diagram').evaluate(node => (node as HTMLElement).style.getPropertyValue('--frade-diagram-canvas'))).toBe(forcedColors === 'active' ? 'Canvas' : stockUi.base.hex)
        await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
        expect(await sample()).toEqual(before)
      }
      await f.page.getByRole('button', { name: 'Меню Файл', exact: true }).click()
      await f.page.getByRole('menuitem', { name: 'Выбрать тему…', exact: true }).click()
      await f.page.getByRole('option', { name: 'Светлая (Light)', exact: true }).click()
      await f.page.getByRole('button', { name: 'Сохранить выбор', exact: true }).click()
      await expect(f.page.getByRole('dialog', { name: 'Выбор темы' })).toBeHidden()
      expect(await sample()).toEqual(before)
      expect(await f.page.locator('.dirty-dot').count()).toBe(dirty)
      expect(await readFile(f.file, 'utf8')).toBe(f.bytes)
      expect(JSON.parse(await readFile(f.settings, 'utf8')).selection.mode).toBe('light')
      await writeFile(info.outputPath('author-gradient-alpha.json'), JSON.stringify({ before, after: await sample(), source: 'Synthetic author styles applied through existing model API before baseline; no theme setter/setup inside measured transitions', nativeGradient: 'UNSUPPORTED' }, null, 2))
      await f.page.screenshot({ path: info.outputPath('author-gradient-alpha.png') })
    } finally { try { await writeFile(info.outputPath('author-probes.json'), JSON.stringify(probes, null, 2)) } finally { await f.app.close() } }
  })
}
