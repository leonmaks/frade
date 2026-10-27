import { test, expect, _electron as electron } from '@playwright/test'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createKaFixture } from '../../../../scripts/ka-fixtures.mjs'

// eslint-disable-next-line no-empty-pattern
test('native drawing retains authored node identity and content while an object tab is edited', async ({}, info) => {
  const fixture = await createKaFixture(),
    folder = join(fixture.dataRoot, '_diagrams')
  await mkdir(folder, { recursive: true })
  const file = join(folder, 'Park.frade')
  await writeFile(
    file,
    JSON.stringify({
      format: 'frade-draw',
      version: 1,
      metadata: { id: 'park', name: 'Park' },
      graph: {
        nodes: [
          {
            id: 'authored',
            shape: 'rect',
            x: 140,
            y: 120,
            width: 180,
            height: 80,
            label: 'Authored',
            style: { fill: '#77AADD', stroke: '#334455' },
            labelStyle: { fill: '#112244' },
          },
        ],
        edges: [],
      },
      viewport: { zoom: 1, pan: { x: 0, y: 0 } },
    }),
  )
  const profile = join(fixture.destination, 'park-profile')
  await mkdir(profile, { recursive: true })
  await writeFile(
    join(profile, 'presentation-settings.json'),
    JSON.stringify({
      version: 1,
      revision: 0,
      generation: 0,
      transactionId: 'matrix/boot',
      selection: {
        mode: 'light',
        density: 'compact',
        preferred: {
          light: 'frade.builtin/light',
          dark: 'frade.builtin/dark',
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
    await expect(page.locator('.status-message')).toContainText('138 объектов')
    await page
      .getByRole('treeitem')
      .filter({ hasText: /^_diagrams$/ })
      .click()
    await page
      .getByRole('treeitem')
      .filter({ hasText: /^Park.frade$/ })
      .dblclick()
    const canvas = page.locator('.frade-canvas .canvas'),
      node = canvas.locator('.x6-node[data-cell-id="authored"]')
    await expect(node).toBeVisible()
    await expect(page.locator('.frade-theme-commit-barrier')).toBeHidden()
    await canvas.evaluate((canvas) => {
      const records: string[] = []
      const observer = new MutationObserver((items) => {
        for (const item of items)
          for (const removed of item.removedNodes)
            if (removed instanceof Element) records.push(removed.outerHTML.slice(0, 150))
      })
      observer.observe(canvas, { childList: true, subtree: true })
      Reflect.set(window, '__parkProbe', {
        canvas,
        node: canvas.querySelector('.x6-node'),
        svg: canvas.querySelector('svg'),
        records,
        observer,
      })
    })
    const box = (await node.boundingBox())!
    const initialTransform = await node.getAttribute('transform')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20, { steps: 5 })
    await page.mouse.up()
    await expect(page.locator('.dirty-dot')).toHaveCount(1)
    await page
      .getByLabel('Поиск объектов', { exact: true })
      .fill('ecogroup.berezka.systems.berezka')
    await page.locator('[data-object-id="ecogroup.berezka.systems.berezka"]').dblclick()
    await page
      .locator('.field[data-field-path="description"] textarea')
      .fill('Park regression unsaved')
    await expect(page.locator('.dirty-dot')).toHaveCount(2)
    await page.evaluate(async () => {
      await new Promise<void>((done) =>
        requestAnimationFrame(() => requestAnimationFrame(() => done())),
      )
    })
    const inspect = () =>
      page.evaluate(() => {
        const probe = Reflect.get(window, '__parkProbe') as {
          canvas: HTMLElement
          node: Element
          svg: Element
          records: string[]
        }
        const current = document.querySelector('.frade-canvas .canvas')
        return {
          canvasRetained: current === probe.canvas,
          canvasConnected: probe.canvas.isConnected,
          nodeConnected: probe.node.isConnected,
          nodeRetained: current?.querySelector('.x6-node[data-cell-id="authored"]') === probe.node,
          svgRetained: current?.querySelector('svg') === probe.svg,
          nodeIds: [...(current?.querySelectorAll('.x6-node') ?? [])].map((el) =>
            el.getAttribute('data-cell-id'),
          ),
          removed: probe.records,
          canvasHtml: current?.outerHTML.slice(0, 1000),
        }
      })
    const parked = await inspect()
    await writeFile(info.outputPath('parked-observations.json'), JSON.stringify(parked, null, 2))
    await page.getByRole('button', { name: 'Меню Файл', exact: true }).focus()
    await page.keyboard.press('F1')
    await page
      .getByRole('dialog', { name: 'Команды' })
      .getByRole('button', { name: 'Настройки интерфейса', exact: true })
      .click()
    const settings = page.getByRole('dialog', { name: 'Настройки интерфейса', exact: true })
    await settings.getByRole('radio', { name: /Dark/ }).click()
    await expect(page.locator('.frade-theme-commit-barrier')).toBeHidden()
    await settings.getByRole('button', { name: 'Применить', exact: true }).click()
    await expect(settings.getByRole('status')).toHaveText('Сохранено')
    await settings.getByRole('button', { name: 'Закрыть', exact: true }).click()
    await page.getByRole('button', { name: 'Меню Файл', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Настройки интерфейса', exact: true }).click()
    await settings.getByRole('button', { name: 'Закрыть', exact: true }).click()
    await page.locator('.editor-tabs').getByRole('tab').filter({ hasText: 'Park.frade' }).click()
    await expect(node).toBeVisible()
    const returned = await inspect()
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    const undone = await inspect()
    await writeFile(
      info.outputPath('undo-observations.json'),
      JSON.stringify({ parked, returned, undone }, null, 2),
    )
    await expect(node).toBeVisible()
    await expect(node).toHaveAttribute('transform', initialTransform!)
    await page.getByRole('button', { name: 'Redo', exact: true }).click()
    await expect(node).toBeVisible()
    await page
      .locator('.diagram-slot .editor-actions')
      .getByRole('button', { name: 'Сохранить', exact: true })
      .click()
    await expect(page.locator('.diagram-slot .editor-actions')).toContainText(
      'Все изменения сохранены',
    )
    const saved = JSON.parse(await readFile(file, 'utf8'))
    await writeFile(
      info.outputPath('parking-observations.json'),
      JSON.stringify({ parked, returned, saved }, null, 2),
    )
    expect(parked.nodeRetained).toBe(true)
    expect(returned.nodeRetained).toBe(true)
    expect(saved.graph.nodes).toHaveLength(1)
    expect(saved.graph.nodes[0].id).toBe('authored')
  } finally {
    await app.evaluate(({ app }) => app.exit(0)).catch(() => {})
    await app.close().catch(() => {})
  }
})
