import { test, expect, _electron as electron, type Page } from '@playwright/test'
import { mkdtemp, writeFile, readFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createFlowFixture } from '../../../../scripts/flow-fixtures.mjs'
import { contrastRatio } from '../../../../packages/ui-workspace/src/design/theme/contrast'
const id = 'frade.reference/vscode-dark-2026'
async function picker(page: Page) {
  await page.getByRole('button', { name: 'Меню Файл', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Выбрать тему…', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Выбор темы' })).toBeVisible()
}
async function witness(page: Page) {
  return page.evaluate(() => {
    const selectors = [
      '.ka-workbench',
      '.wb-titlebar',
      '.activity-bar',
      '.wb-sidebar',
      '.wb-statusbar',
    ]
    return Object.fromEntries(
      selectors.map((selector) => {
        const e = document.querySelector(selector) as HTMLElement
        const s = getComputedStyle(e),
          r = e.getBoundingClientRect()
        return [
          selector,
          {
            background: s.backgroundColor,
            color: s.color,
            font: s.fontFamily,
            fontSize: s.fontSize,
            width: r.width,
            height: r.height,
          },
        ]
      }),
    )
  })
}
for (const density of ['compact', 'comfortable'] as const) {
  // eslint-disable-next-line no-empty-pattern
  test(`reference ${density}: actual preview cancel commit restart and scoped geometry`, async ({}, info) => {
    const profile = await mkdtemp(join(tmpdir(), 'frade-reference-'))
    const path = join(profile, 'presentation-settings.json')
    const record = {
      version: 1,
      revision: 1,
      generation: 1,
      transactionId: 'reference/fixture',
      selection: {
        mode: 'light',
        density,
        preferred: {
          light: 'frade.builtin/light',
          dark: 'frade.builtin/dark',
          'high-contrast': 'frade.builtin/high-contrast',
        },
      },
    }
    await writeFile(path, JSON.stringify(record))
    const launch = () =>
      electron.launch({
        args: [resolve('out/main/index.cjs')],
        env: { ...process.env, FRADE_USER_DATA: profile },
      })
    let app = await launch()
    try {
      let page = await app.firstWindow()
      await expect(page.locator('.wb-statusbar [role="status"]')).toHaveText('Backend: ready')
      const original = await witness(page),
        originalBytes = await readFile(path, 'utf8')
      await picker(page)
      await expect(
        page.getByRole('listbox', { name: 'Тема интерфейса' }).getByRole('option'),
      ).toHaveCount(5)
      const reference = page.getByRole('option', { name: 'VS Code Dark 2026', exact: true })
      await reference.click()
      await expect(page.locator('html')).toHaveAttribute('data-frade-reference', 'vscode-dark-2026')
      await expect(page.locator('html')).toHaveAttribute('data-frade-density', density)
      const preview = await witness(page)
      expect(preview['.ka-workbench'].background).toBe('rgb(18, 19, 20)')
      expect(preview['.activity-bar'].width).toBe(48)
      const pairs = await page
        .locator(
          '.wb-titlebar, .wb-sidebar, .wb-statusbar, .frade-theme-picker, .frade-theme-picker [role="option"]',
        )
        .evaluateAll((els) =>
          els.map((el) => {
            const s = getComputedStyle(el)
            const hex = (value: string) =>
              '#' +
              (value.match(/[0-9.]+/g) ?? [])
                .slice(0, 3)
                .map((v) => Number(v).toString(16).padStart(2, '0'))
                .join('')
            return {
              surface: el.className || el.getAttribute('role'),
              foreground: hex(s.color),
              background: hex(s.backgroundColor),
            }
          }),
        )
      for (const pair of pairs)
        expect(
          contrastRatio(pair.foreground, pair.background),
          JSON.stringify(pair),
        ).toBeGreaterThanOrEqual(4.5)
      await writeFile(info.outputPath('actual-contrast.json'), JSON.stringify(pairs, null, 2))
      expect(preview['.wb-titlebar'].height).toBeGreaterThanOrEqual(35)
      expect(await readFile(path, 'utf8')).toBe(originalBytes)
      await page.screenshot({ path: info.outputPath(`preview-${density}.png`) })
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog', { name: 'Выбор темы' })).toBeHidden()
      await expect(page.locator('html')).not.toHaveAttribute(
        'data-frade-reference',
        'vscode-dark-2026',
      )
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
      for (const name of [
        'Светлая (Light)',
        'Тёмная (Dark)',
        'Контрастная (HC)',
        'Системная (System)',
      ]) {
        await picker(page)
        await page.getByRole('option', { name, exact: true }).click()
        await page.getByRole('button', { name: 'Сохранить выбор', exact: true }).click()
        await expect(page.getByRole('dialog', { name: 'Выбор темы' })).toBeHidden()
        await expect(page.locator('html')).not.toHaveAttribute(
          'data-frade-reference',
          'vscode-dark-2026',
        )
      }
      await writeFile(
        info.outputPath('observations.json'),
        JSON.stringify({ density, original, preview, committed }, null, 2),
      )
    } finally {
      await app.close()
    }
  })
}

for (const kind of ['native', 'frame'] as const) {
  // eslint-disable-next-line no-empty-pattern
  test(`reference ${kind}: authored document selection undo identity and dirty state survive preview`, async ({}, info) => {
    const f = await createFlowFixture()
    const name = kind === 'native' ? 'Flows.frade' : 'Flows.drawio'
    const file = join(f.dataRoot, '_diagrams', name),
      before = await readFile(file, 'utf8')
    const app = await electron.launch({
      args: [resolve('out/main/index.cjs')],
      env: { ...process.env, FRADE_USER_DATA: join(f.destination, 'profile') },
    })
    try {
      const page = await app.firstWindow()
      await page.addInitScript(() => {
        if (location.host !== 'drawio') return
        window.addEventListener('message', (event) => {
          let value
          try {
            value = typeof event.data === 'string' ? JSON.parse(event.data) : undefined
          } catch {
            return
          }
          const Editor = (window as any).EditorUi
          if (value?.action !== 'configure' || !Editor || Editor.prototype.init.__referenceCapture)
            return
          const original = Editor.prototype.init
          const capture = function (this: any, ...args: unknown[]) {
            const result = original.apply(this, args)
            ;(window as any).__referenceUi = this
            return result
          }
          capture.__referenceCapture = true
          Editor.prototype.init = capture
        })
      })
      await expect(page.locator('.wb-statusbar [role="status"]')).toHaveText('Backend: ready')
      await app.evaluate(
        ({ dialog }, paths) => {
          let index = 0
          dialog.showOpenDialog = (async () => ({
            canceled: false,
            filePaths: [paths[index++]],
          })) as typeof dialog.showOpenDialog
        },
        [f.dataRoot, f.metadataRoot],
      )
      await page.getByRole('button', { name: 'Открыть KA', exact: true }).click()
      await expect(page.locator('.status-message')).toContainText('9 объектов')
      await page
        .getByRole('treeitem')
        .filter({ hasText: /^_diagrams$/ })
        .click()
      await page
        .getByRole('treeitem')
        .filter({ hasText: new RegExp('^' + name.replace('.', '\\.') + '$') })
        .dblclick()
      const node = page.locator('.x6-node[data-cell-id="node-A"]')
      const frame = page.frameLocator('iframe')
      const geometry = async () => ({
        parent: await witness(page),
        frame: await frame.locator('body').evaluate(() => {
          const ui = (window as any).__referenceUi,
            g = ui.editor.graph,
            r = g.container.getBoundingClientRect()
          return {
            container: { width: r.width, height: r.height },
            scale: g.view.scale,
            translate: { x: g.view.translate.x, y: g.view.translate.y },
            root: { ...document.documentElement.dataset },
          }
        }),
      })
      let beforeGeometry: unknown
      let semanticBefore: unknown,
        transform: string | null = null
      const frameState = () =>
        frame.locator('body').evaluate(() => {
          const ui = (window as any).__referenceUi,
            graph = ui.editor.graph
          return {
            xml: (window as any).mxUtils.getXml(ui.editor.getGraphXml()),
            selection: graph.getSelectionCells().map((c: any) => c.id),
            history: ui.editor.undoManager.history.length,
            cursor: ui.editor.undoManager.indexOfNextAdd,
            preferences: { ...localStorage },
            same: ui === (window as any).__referenceOriginal,
          }
        })
      if (kind === 'native') {
        await expect(node).toBeVisible()
        const box = (await node.boundingBox())!
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20, { steps: 5 })
        await page.mouse.up()
        await expect(page.locator('.dirty-dot')).toHaveCount(1)
        transform = await node.getAttribute('transform')
        await node.evaluate((el) => {
          ;(window as any).__referenceNode = el
        })
        semanticBefore = await page.locator('.frade-canvas .x6-widget-selection-box').count()
      } else {
        await expect(frame.locator('.geDiagramContainer')).toBeVisible()
        await expect
          .poll(() => frame.locator('body').evaluate(() => !!(window as any).__referenceUi))
          .toBe(true)
        await frame.locator('body').evaluate(() => {
          const ui = (window as any).__referenceUi,
            graph = ui.editor.graph
          graph.setSelectionCell(graph.getModel().getCell('node-A'))
          graph.moveCells(graph.getSelectionCells(), 30, 20)
          ;(window as any).__referenceOriginal = ui
        })
        await expect(page.locator('.dirty-dot')).toHaveCount(1)
        await frame
          .locator('body')
          .evaluate(
            () =>
              new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
              ),
          )
        semanticBefore = await frameState()
        beforeGeometry = await geometry()
      }
      await picker(page)
      await page.getByRole('option', { name: 'VS Code Dark 2026', exact: true }).click()
      await expect(page.locator('html')).toHaveAttribute('data-frade-reference', 'vscode-dark-2026')
      expect(await readFile(file, 'utf8')).toBe(before)
      await page.screenshot({ path: info.outputPath(`${kind}-preview.png`) })
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog', { name: 'Выбор темы' })).toBeHidden()
      await expect(page.locator('.dirty-dot')).toHaveCount(1)
      if (kind === 'native') {
        expect(await node.getAttribute('transform')).toBe(transform)
        expect(await node.evaluate((el) => el === (window as any).__referenceNode)).toBe(true)
        expect(await page.locator('.frade-canvas .x6-widget-selection-box').count()).toBe(
          semanticBefore,
        )
        await page.getByRole('button', { name: 'Undo', exact: true }).click()
        expect(await node.getAttribute('transform')).not.toBe(transform)
        await page.getByRole('button', { name: 'Redo', exact: true }).click()
        expect(await node.getAttribute('transform')).toBe(transform)
      } else {
        const immediate = { state: await frameState(), geometry: await geometry() }
        await expect.poll(frameState).toEqual(semanticBefore)
        const settled = { state: await frameState(), geometry: await geometry() }
        await writeFile(
          info.outputPath('frame-diagnostic.json'),
          JSON.stringify({ before: semanticBefore, beforeGeometry, immediate, settled }, null, 2),
        )
        expect(settled.state).toEqual(semanticBefore)
      }
      expect(await readFile(file, 'utf8')).toBe(before)
      await picker(page)
      await page.getByRole('option', { name: 'VS Code Dark 2026', exact: true }).click()
      await page.getByRole('button', { name: 'Сохранить выбор', exact: true }).click()
      await expect(page.getByRole('dialog', { name: 'Выбор темы' })).toBeHidden()
      await expect(page.locator('.dirty-dot')).toHaveCount(1)
      expect(await readFile(file, 'utf8')).toBe(before)
      await page.screenshot({ path: info.outputPath(kind + '-reference-dirty.png') })
      await writeFile(
        info.outputPath('semantics.json'),
        JSON.stringify({ kind, semanticBefore, transform }, null, 2),
      )
    } finally {
      await app.evaluate(({ app }) => {
        setTimeout(() => app.exit(0), 50)
      })
      await app.close()
    }
  })
}
// eslint-disable-next-line no-empty-pattern
test('reference accessibility: keyboard focus media coarse targets and text reflow', async ({}, info) => {
  const profile = await mkdtemp(join(tmpdir(), 'frade-reference-media-'))
  await mkdir(profile, { recursive: true })
  await writeFile(
    join(profile, 'presentation-settings.json'),
    JSON.stringify({
      version: 1,
      revision: 1,
      generation: 1,
      transactionId: 'reference/media',
      selection: {
        mode: 'dark',
        density: 'comfortable',
        preferred: {
          light: 'frade.builtin/light',
          dark: id,
          'high-contrast': 'frade.builtin/high-contrast',
        },
      },
    }),
  )
  const app = await electron.launch({
    args: [resolve('out/main/index.cjs')],
    env: { ...process.env, FRADE_USER_DATA: profile },
  })
  try {
    const page = await app.firstWindow()
    await expect(page.locator('.wb-statusbar [role="status"]')).toHaveText('Backend: ready')
    await picker(page)
    const reference = page.getByRole('option', { name: 'VS Code Dark 2026', exact: true })
    await page.keyboard.press('Tab')
    await reference.focus()
    await expect(reference).toBeFocused()
    const focus = await reference.evaluate((el) => {
      const s = getComputedStyle(el)
      return { width: s.outlineWidth, style: s.outlineStyle }
    })
    expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(2)
    expect(focus.style).not.toBe('none')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Выбор темы' })).toBeHidden()
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
    await expect
      .poll(() => page.evaluate(() => matchMedia('(forced-colors: active)').matches))
      .toBe(true)
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-frade-reference',
      'vscode-dark-2026',
    )
    await page.screenshot({ path: info.outputPath('forced-colors.png') })
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' })
    await expect(page.locator('html')).toHaveAttribute('data-frade-reference', 'vscode-dark-2026')
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
    await expect.poll(() => page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
    const targets = await page.locator('.activity-bar button').evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect()
        return { width: r.width, height: r.height }
      }),
    )
    for (const r of targets) {
      expect(r.width).toBeGreaterThanOrEqual(44)
      expect(r.height).toBeGreaterThanOrEqual(44)
    }
    await page.screenshot({ path: info.outputPath('coarse.png') })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(850, 650))
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    const reflow = await witness(page)
    expect(reflow['.wb-titlebar'].height).toBeGreaterThanOrEqual(35)
    await picker(page)
    await expect(reference).toBeVisible()
    await page.screenshot({ path: info.outputPath('text-200-narrow-picker.png') })
    await page.keyboard.press('Escape')
    await writeFile(
      info.outputPath('accessibility.json'),
      JSON.stringify({ focus, targets, reflow }, null, 2),
    )
  } finally {
    await app.close()
  }
})
// eslint-disable-next-line no-empty-pattern
test('reference p95: real root native frame 20 warmups and 100 durable alternating requests <=150ms', async ({}, info) => {
  test.setTimeout(180000)
  const f = await createFlowFixture(),
    profile = join(f.destination, 'profile')
  const app = await electron.launch({
    args: [resolve('out/main/index.cjs')],
    env: { ...process.env, FRADE_USER_DATA: profile },
  })
  try {
    const page = await app.firstWindow()
    await expect(page.locator('.wb-statusbar [role="status"]')).toHaveText('Backend: ready')
    await app.evaluate(
      ({ dialog }, paths) => {
        let i = 0
        dialog.showOpenDialog = (async () => ({
          canceled: false,
          filePaths: [paths[i++]],
        })) as typeof dialog.showOpenDialog
      },
      [f.dataRoot, f.metadataRoot],
    )
    await page.getByRole('button', { name: 'Открыть KA', exact: true }).click()
    await expect(page.locator('.status-message')).toContainText('9 объектов')
    await page
      .getByRole('treeitem')
      .filter({ hasText: /^_diagrams$/ })
      .click()
    await page
      .getByRole('treeitem')
      .filter({ hasText: /^Flows[.]frade$/ })
      .dblclick()
    await expect(page.locator('.x6-node[data-cell-id="node-A"]')).toBeVisible()
    await page
      .getByRole('treeitem')
      .filter({ hasText: /^Flows[.]drawio$/ })
      .dblclick()
    await expect(page.frameLocator('iframe').locator('.geDiagramContainer')).toBeVisible()
    await expect(page.locator('.frade-theme-commit-barrier')).toBeHidden()
    const files = await Promise.all(
      ['Flows.frade', 'Flows.drawio'].map((n) =>
        readFile(join(f.dataRoot, '_diagrams', n), 'utf8'),
      ),
    )
    const samples: number[] = [],
      observations = []
    for (let i = 0; i < 120; i++) {
      const reference = i % 2 === 0
      await picker(page)
      const option = page.getByRole('option', {
        name: reference ? 'VS Code Dark 2026' : 'Светлая (Light)',
        exact: true,
      })
      await option.focus()
      const ms = await option.evaluate(
        (button) =>
          new Promise<number>((resolve, reject) => {
            const timer = setTimeout(() => {
              observer.disconnect()
              reject(Error('Durable root/native/frame publication missing'))
            }, 5000)
            const observer = new MutationObserver(() => {
              const root = document.documentElement,
                curtain = document.querySelector<HTMLElement>('.frade-theme-commit-barrier'),
                native = document.querySelector<HTMLElement>('.frade-canvas .canvas'),
                frame = document.querySelector<HTMLIFrameElement>('iframe')
              if (
                !document.querySelector('[aria-label="Выбор темы"]') &&
                curtain?.hidden &&
                native?.dataset.fradeRevision === root.dataset.fradeRevision &&
                frame?.dataset.fradeRevision === root.dataset.fradeRevision
              ) {
                clearTimeout(timer)
                observer.disconnect()
                resolve(performance.now() - start)
              }
            })
            observer.observe(document.body, {
              subtree: true,
              attributes: true,
              childList: true,
              characterData: true,
            })
            const start = performance.now()
            button.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
            )
          }),
      )
      const record = JSON.parse(await readFile(join(profile, 'presentation-settings.json'), 'utf8'))
      expect(record.selection.mode).toBe(reference ? 'dark' : 'light')
      if (reference) {
        expect(record.selection.preferred.dark).toBe(id)
        await expect(page.locator('html')).toHaveAttribute(
          'data-frade-reference',
          'vscode-dark-2026',
        )
      } else
        await expect(page.locator('html')).not.toHaveAttribute(
          'data-frade-reference',
          'vscode-dark-2026',
        )
      observations.push({
        index: i,
        warmup: i < 20,
        reference,
        milliseconds: ms,
        revision: record.revision,
      })
      if (i >= 20) samples.push(ms)
    }
    expect(samples).toHaveLength(100)
    const sorted = [...samples].sort((a, b) => a - b),
      p95 = sorted[94]
    expect(
      await Promise.all(
        ['Flows.frade', 'Flows.drawio'].map((n) =>
          readFile(join(f.dataRoot, '_diagrams', n), 'utf8'),
        ),
      ),
    ).toEqual(files)
    await writeFile(
      info.outputPath('reference-performance.json'),
      JSON.stringify(
        {
          syntheticObjects: 9,
          source: 'current built first-party reference',
          warmups: 20,
          samples: 100,
          observations,
          p95,
          budget: 150,
          status: p95 <= 150 ? 'PASS' : 'FAIL',
        },
        null,
        2,
      ),
    )
    expect(p95).toBeLessThanOrEqual(150)
  } finally {
    await app.evaluate(({ app }) => {
      setTimeout(() => app.exit(0), 50)
    })
    await app.close()
  }
})
