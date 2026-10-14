import { test, expect, _electron as electron, type Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createKaFixture } from '../../../../scripts/ka-fixtures.mjs'
async function dragObject(
  page: Page,
  options: { name?: string; repositoryId?: string; sourceId?: string; x?: number; y?: number } = {},
) {
  const name = options.name ?? 'Маркетплейс'
  const readyFrame = page.locator('.diagram-slot iframe')
  if (await readyFrame.count()) {
    await expect(readyFrame).toBeVisible()
    await expect(readyFrame).toHaveAttribute('data-frade-revision', (await page.locator('html').getAttribute('data-frade-revision')) as string)
    await expect(page.locator('.frade-theme-commit-barrier')).toBeHidden()
    await readyFrame.contentFrame().locator('.geDiagramContainer').evaluate(async () => {
      await document.fonts.ready
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    })
    await expect(readyFrame).toHaveAttribute('data-frade-revision', (await page.locator('html').getAttribute('data-frade-revision')) as string)
    await expect(page.locator('.frade-theme-commit-barrier')).toBeHidden()
  }
  await page.getByLabel('Поиск объектов', { exact: true }).fill(name)
  const source = page
    .locator(
      '[role=treeitem][data-object-id]' +
        (options.sourceId
          ? '[data-source-id="' + options.sourceId + '"]'
          : ':not([data-source-id])') +
        (options.repositoryId ? '[data-repository-id="' + options.repositoryId + '"]' : ''),
    )
    .filter({ hasText: name })
    .first()
  const iframe = page.locator('.diagram-slot iframe')
  const target = (await iframe.count())
    ? iframe.contentFrame().locator('.geDiagramContainer')
    : page.locator('.diagram-slot .x6-graph')
  const from = await source.boundingBox(),
    to = await target.boundingBox()
  if (!from || !to) throw Error('Drag surfaces unavailable')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2, { steps: 3 })
  if (await iframe.count())
    await expect(page.locator('.diagram-slot .diagram-drop-target')).toBeVisible()
  const x = to.x + (options.x ?? 220),
    y = to.y + (options.y ?? 180)
  await page.mouse.move(x, y, { steps: 12 })
  await page.mouse.move(x + 1, y)
  await page.mouse.up()
  await page.getByLabel('Поиск объектов', { exact: true }).fill('')
  return { x: x + 1, y }
}
// eslint-disable-next-line no-empty-pattern
test('repository diagram opens in ordinary tabs, edits native XML and saves', async ({}, info) => {
  test.setTimeout(120000)
  const fixture = await createKaFixture()
  const app = await electron.launch({
    args: [resolve('out/main/index.cjs')],
    env: { ...process.env, FRADE_USER_DATA: join(fixture.destination, 'diagram-profile') },
  })
  try {
    const page = await app.firstWindow(),
      errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') console.log('BROWSER', m.text())
    })
    page.on('response', (r) => {
      if (r.status() >= 400) console.log('HTTP', r.status(), r.url())
    })
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
    await expect(page.getByRole('button', { name: 'Draw', exact: true })).toHaveCount(0)
    const service = page.getByRole('treeitem').filter({ hasText: /^_diagrams$/ })
    await expect(service).toBeVisible()
    await service.click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Новая папка…' }).click()
    await page.getByLabel('Имя файла или папки').fill('Проект 2026')
    await page.getByRole('button', { name: 'Применить', exact: true }).click()
    const folder = page.getByRole('treeitem').filter({ hasText: /^Проект 2026$/ })
    await folder.click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Новая диаграмма…' }).click()
    await page.getByLabel('Имя файла или папки').fill('Обзор.drawio')
    await page.getByRole('button', { name: 'Применить', exact: true }).click()
    await expect(page.getByRole('tab', { name: 'Обзор.drawio' })).toBeVisible()
    try {
      await expect(
        page
          .locator('.repository-diagram .editor-actions')
          .getByRole('button', { name: 'Сохранить', exact: true }),
      ).toBeEnabled({ timeout: 20000 })
    } catch (e) {
      console.log(
        'FRAMES',
        page.frames().map((f) => f.url()),
      )
      console.log('TEXT', await page.locator('.repository-diagram').innerText())
      for (const f of page.frames().slice(1))
        console.log('FRAMEBODY', await f.locator('body').innerText())
      throw e
    }
    const frame = page.frameLocator('iframe[title="_diagrams/Проект 2026/Обзор.drawio"]')
    expect(
      await frame.locator('body').evaluate(() => ({
        node: typeof (window as any).require,
        api: typeof (window as any).fradeWorkbench,
      })),
    ).toEqual({ node: 'undefined', api: 'undefined' })
    await dragObject(page)
    await expect(page.locator('.dirty-dot')).toHaveCount(1)
    await page
      .locator('.repository-diagram .editor-actions')
      .getByRole('button', { name: 'Сохранить', exact: true })
      .click()
    await expect(page.locator('.dirty-dot')).toHaveCount(0)
    const path = join(fixture.dataRoot, '_diagrams/Проект 2026/Обзор.drawio'),
      xml = await readFile(path, 'utf8')
    expect(xml).toContain('fradeObjectId')
    expect(xml).toContain('Маркетплейс')
    await page.screenshot({ path: info.outputPath('diagram.png') })
    await dragObject(page)
    await expect(page.locator('.dirty-dot')).toHaveCount(1)
    await page.getByRole('button', { name: 'Закрыть Обзор.drawio' }).click()
    await page
      .getByRole('dialog', { name: 'Несохранённые изменения' })
      .getByRole('button', { name: 'Отмена', exact: true })
      .click()
    await expect(page.getByRole('tab', { name: /Обзор.drawio/ })).toBeVisible()
    await writeFile(path, xml.replace('<mxfile', '<mxfile externalEdit="yes"'))
    await page
      .locator('.repository-diagram .editor-actions')
      .getByRole('button', { name: 'Сохранить', exact: true })
      .click()
    await expect(page.locator('.diagram-error')).toContainText('REVISION_CONFLICT')
    expect(await readFile(path, 'utf8')).toContain('externalEdit="yes"')
    expect(errors).toEqual([])
  } finally {
    await app.evaluate(({ app }) => app.exit(0)).catch(() => {})
    await app.close().catch(() => {})
  }
})

// eslint-disable-next-line no-empty-pattern
test('Frade native diagram preserves bindings and responds to repository events in NRT', async ({}, info) => {
  test.setTimeout(120000)
  const fixture = await createKaFixture(),
    app = await electron.launch({
      args: [resolve('out/main/index.cjs')],
      env: { ...process.env, FRADE_USER_DATA: join(fixture.destination, 'frade-diagram-profile') },
    })
  try {
    const page = await app.firstWindow(),
      errors: string[] = []
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
    await page
      .getByRole('treeitem')
      .filter({ hasText: /^_diagrams$/ })
      .click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Новая диаграмма…' }).click()
    await page.getByLabel('Формат диаграммы').selectOption('frade')
    await page.getByLabel('Имя файла или папки').fill('Живая схема.frade')
    await page.getByRole('button', { name: 'Применить', exact: true }).click()
    await expect(page.locator('.frade-canvas')).toBeVisible()
    await dragObject(page)
    await expect(page.locator('.x6-node')).toHaveCount(1)
    await expect(page.locator('.dirty-dot')).toHaveCount(1)
    await page
      .locator('.repository-diagram .editor-actions')
      .getByRole('button', { name: 'Сохранить', exact: true })
      .click()
    await expect(page.locator('.dirty-dot')).toHaveCount(0)
    const path = join(fixture.dataRoot, '_diagrams/Живая схема.frade'),
      saved = JSON.parse(await readFile(path, 'utf8')),
      objectId = saved.graph.nodes[0].repositoryRef.objectId
    expect(saved.format).toBe('frade-draw')
    await page.locator('.x6-node').dblclick()
    await expect(page.locator('.object-id')).toHaveText(objectId)
    // The diagram remains mounted while a normal object card is active.
    const state = await page.evaluate(() => window.fradeWorkbench.command({ operation: 'restore' }))
    if (!state.ok) throw Error('workspace status unavailable')
    const root = (state.value as any).roots[0]
    const result = await page.evaluate(
      async ({ scope, objectId }) => {
        const get = await window.fradeWorkbench.request({
          scope,
          request: {
            version: 1,
            operation: 'getObject',
            payload: { ref: { repositoryId: scope.repositoryId, objectId } },
          },
        })
        if (!get.ok) return get
        const object = get.value as any
        return window.fradeWorkbench.request({
          scope,
          request: {
            version: 1,
            operation: 'applyChanges',
            payload: {
              changeSet: {
                repositoryId: scope.repositoryId,
                idempotencyKey: crypto.randomUUID(),
                commands: [
                  {
                    op: 'updateObject',
                    expectedRevision: object.revision,
                    object: {
                      ref: object.ref,
                      typeId: object.typeId,
                      name: 'Маркетплейс NRT',
                      attributes: { ...object.attributes, title: 'Маркетплейс NRT' },
                    },
                  },
                ],
              },
            },
          },
        })
      },
      {
        scope: {
          repositoryId: root.session.repositoryId,
          sessionId: root.session.sessionId,
          generation: root.session.generation,
          modelGeneration: root.session.modelGeneration,
        },
        objectId,
      },
    )
    expect(result.ok).toBe(true)
    await page.getByRole('tab', { name: /Живая схема.frade/ }).click()
    await expect(page.locator('.x6-node')).toContainText('Маркетплейс NRT', { timeout: 15000 })
    await page
      .locator('.repository-diagram .editor-actions')
      .getByRole('button', { name: 'Сохранить', exact: true })
      .click()
    await expect(page.locator('.dirty-dot')).toHaveCount(0)
    const updated = JSON.parse(await readFile(path, 'utf8'))
    expect(updated.graph.nodes[0].repositoryRef.objectId).toBe(objectId)
    expect(updated.graph.nodes[0].label).toBe('Маркетплейс NRT')
    await expect
      .poll(() => page.locator('.frade-canvas .canvas').evaluate((el) => el.clientWidth))
      .toBeGreaterThan(100)
    await expect
      .poll(() => page.locator('.frade-canvas .canvas').evaluate((el) => el.clientHeight))
      .toBeGreaterThan(100)
    await expect(page.locator('.x6-node')).toBeVisible()
    await page.screenshot({ path: info.outputPath('frade-nrt.png') })
    await page.getByRole('button', { name: 'Закрыть Живая схема.frade' }).click()
    await page
      .getByRole('treeitem')
      .filter({ hasText: /^Живая схема.frade$/ })
      .dblclick()
    await expect(page.locator('.x6-node')).toContainText('Маркетплейс NRT')
    updated.graph.nodes.push({
      ...updated.graph.nodes[0],
      id: 'unresolved-cell',
      x: 340,
      label: 'Недоступный объект',
      repositoryRef: { objectId: 'missing-object' },
    })
    await writeFile(path, JSON.stringify(updated))
    await expect(page.locator('.diagram-references summary')).toContainText('Не найдены: 1')
    await page.locator('.diagram-references summary').click()
    await expect(
      page
        .locator('.diagram-references')
        .getByRole('button', { name: /Недоступный объект — не найден/ }),
    ).toBeDisabled({ timeout: 15000 })
    await expect(page.locator('.x6-node')).toHaveCount(2)
    expect(JSON.parse(await readFile(path, 'utf8')).graph.nodes[1].repositoryRef.objectId).toBe(
      'missing-object',
    )
    expect(errors).toEqual([])
  } finally {
    await app.evaluate(({ app }) => app.exit(0)).catch(() => {})
    await app.close().catch(() => {})
  }
})
import { deflateRawSync } from 'node:zlib'
import { mkdir } from 'node:fs/promises'
// eslint-disable-next-line no-empty-pattern
test('native Draw.io compressed pages, layers, groups and custom cell metadata survive an actual editor roundtrip', async ({}, info) => {
  test.setTimeout(120000)
  const fixture = await createKaFixture(),
    folder = join(fixture.dataRoot, '_diagrams')
  await mkdir(folder)
  const model =
    '<mxGraphModel grid="1" page="1"><root><mxCell id="0"/><mxCell id="layer" value="Architecture" parent="0"/><mxCell id="group" value="Group" style="group" vertex="1" parent="layer"><mxGeometry x="100" y="100" width="400" height="200" as="geometry"/></mxCell><UserObject id="node-a" label="&lt;b&gt;Rich label&lt;/b&gt;" domainKey="preserve-me"><mxCell style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;" vertex="1" parent="group"><mxGeometry x="20" y="20" width="120" height="60" as="geometry"/></mxCell></UserObject><mxCell id="node-b" value="Target" style="ellipse;whiteSpace=wrap;html=1;" vertex="1" parent="group"><mxGeometry x="220" y="100" width="100" height="60" as="geometry"/></mxCell><mxCell id="edge" value="Contract" style="edgeStyle=orthogonalEdgeStyle;exitX=1;exitY=0.5;entryX=0;entryY=0.5;" edge="1" parent="group" source="node-a" target="node-b"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="180" y="50"/><mxPoint x="180" y="130"/></Array></mxGeometry></mxCell></root></mxGraphModel>'
  const xml = `<mxfile><diagram id="main" name="Architecture">${deflateRawSync(encodeURIComponent(model)).toString('base64')}</diagram><diagram id="second" name="Second"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`
  const path = join(folder, 'Imported.drawio')
  await writeFile(path, xml)
  const app = await electron.launch({
    args: [resolve('out/main/index.cjs')],
    env: { ...process.env, FRADE_USER_DATA: join(fixture.destination, 'roundtrip-profile') },
  })
  try {
    const page = await app.firstWindow(),
      requests: string[] = []
    page.on('request', (r) => {
      if (/^https?:/.test(r.url())) requests.push(r.url())
    })
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
    await page
      .getByRole('treeitem')
      .filter({ hasText: /^_diagrams$/ })
      .click()
    await page
      .getByRole('treeitem')
      .filter({ hasText: /^Imported.drawio$/ })
      .dblclick()
    const save = page
      .locator('.repository-diagram .editor-actions')
      .getByRole('button', { name: 'Сохранить', exact: true })
    await expect(save).toBeEnabled({ timeout: 30000 })
    await save.click()
    expect(await readFile(path, 'utf8')).toBe(xml)
    await dragObject(page)
    await save.click()
    await expect(page.locator('.dirty-dot')).toHaveCount(0)
    const result = await readFile(path, 'utf8')
    const structure = await page.evaluate((text) => {
      const doc = new DOMParser().parseFromString(text, 'text/xml')
      return {
        pages: Array.from(doc.querySelectorAll('diagram')).map((p) => p.getAttribute('name')),
        custom: doc.querySelector('[domainKey]')?.getAttribute('domainKey'),
        group: doc.querySelector('[id="group"]')?.getAttribute('parent'),
        label: doc.querySelector('[id="node-a"]')?.getAttribute('label'),
        edge: doc.querySelector('[id="edge"]')?.getAttribute('source'),
        points: doc.querySelectorAll('[id="edge"] mxPoint').length,
      }
    }, result)
    expect(structure).toEqual({
      pages: ['Architecture', 'Second'],
      custom: 'preserve-me',
      group: 'layer',
      label: '<b>Rich label</b>',
      edge: 'node-a',
      points: 2,
    })
    expect(requests).toEqual([])
    await page.screenshot({ path: info.outputPath('drawio-roundtrip.png') })
    const canvas = page.locator('iframe').contentFrame().locator('.geDiagramContainer')
    const height = await canvas.evaluate((el) => el.clientHeight)
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 950))
    await expect.poll(() => canvas.evaluate((el) => el.clientHeight)).toBeGreaterThan(height)
    await page.getByRole('button', { name: 'Закрыть Imported.drawio' }).click()
    await expect(page.getByRole('dialog', { name: 'Несохранённые изменения' })).toHaveCount(0)
    await page
      .getByRole('treeitem')
      .filter({ hasText: /^Imported.drawio$/ })
      .dblclick()
    await expect(save).toBeEnabled()
  } finally {
    await app.evaluate(({ app }) => app.exit(0)).catch(() => {})
    await app.close().catch(() => {})
  }
})

// eslint-disable-next-line no-empty-pattern
test('mixed diagram tabs share Save All, keep live editor state, reorder, discard and restore', async ({}, info) => {
  test.setTimeout(120000)
  const fixture = await createKaFixture(),
    folder = join(fixture.dataRoot, '_diagrams'),
    profile = join(fixture.destination, 'mixed-diagrams-profile')
  await mkdir(folder)
  await writeFile(
    join(folder, 'One.drawio'),
    '<mxfile><diagram id="page" name="Main"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>',
  )
  await writeFile(
    join(folder, 'Two.frade'),
    JSON.stringify({
      format: 'frade-draw',
      version: 1,
      metadata: { id: 'two', name: 'Two' },
      graph: { nodes: [], edges: [] },
    }),
  )
  const env = { ...process.env, FRADE_USER_DATA: profile }
  let app = await electron.launch({ args: [resolve('out/main/index.cjs')], env })
  try {
    let page = await app.firstWindow()
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
    await page
      .getByRole('treeitem')
      .filter({ hasText: /^_diagrams$/ })
      .click()
    await page
      .getByRole('treeitem')
      .filter({ hasText: /^One.drawio$/ })
      .dblclick()
    await expect(
      page
        .locator('.repository-diagram .editor-actions')
        .getByRole('button', { name: 'Сохранить', exact: true }),
    ).toBeEnabled()
    const frame = page.frameLocator('iframe')
    await frame.locator('body').evaluate(() => {
      ;(window as any).__fradeStateMarker = 'retained'
    })
    await dragObject(page)
    await expect(page.locator('.dirty-dot')).toHaveCount(1)
    await page
      .getByRole('treeitem')
      .filter({ hasText: /^Two.frade$/ })
      .dblclick()
    await expect(page.getByRole('tab', { name: 'Two.frade', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page.locator('.diagram-slot .frade-canvas')).toBeVisible()
    await dragObject(page)
    await expect(page.locator('.dirty-dot')).toHaveCount(2)
    await page.keyboard.press('Control+Shift+s')
    await expect(page.locator('.dirty-dot')).toHaveCount(0)
    const saved = await readFile(join(folder, 'One.drawio'), 'utf8')
    expect(saved).toContain('fradeObjectId')
    expect(
      JSON.parse(await readFile(join(folder, 'Two.frade'), 'utf8')).graph.nodes[0].repositoryRef
        .objectId,
    ).toBeTruthy()
    const second = page.locator('.editor-tab').nth(1),
      first = page.locator('.editor-tab').nth(0)
    await second.dragTo(first)
    await expect(page.getByRole('tab').first()).toHaveText('Two.frade')
    await page.getByRole('tab', { name: 'One.drawio', exact: true }).click()
    expect(await frame.locator('body').evaluate(() => (window as any).__fradeStateMarker)).toBe(
      'retained',
    )
    await dragObject(page)
    await expect(page.locator('.dirty-dot')).toHaveCount(1)
    await page
      .locator('.diagram-slot')
      .getByRole('button', { name: 'Отменить изменения', exact: true })
      .click()
    await expect(page.locator('.dirty-dot')).toHaveCount(0)
    expect(await readFile(join(folder, 'One.drawio'), 'utf8')).toBe(saved)
    await page.screenshot({ path: info.outputPath('mixed-tabs.png') })
    await app.close()
    app = await electron.launch({ args: [resolve('out/main/index.cjs')], env })
    page = await app.firstWindow()
    await expect(page.getByRole('status')).toHaveText('Backend: ready')
    await expect(page.getByRole('tab')).toHaveCount(2)
    await expect(page.getByRole('tab').first()).toHaveText('Two.frade')
    await expect(page.getByRole('tab', { name: 'One.drawio', exact: true })).toBeVisible()
  } finally {
    await app.evaluate(({ app }) => app.exit(0)).catch(() => {})
    await app.close().catch(() => {})
  }
})

for (const format of ['drawio', 'frade']) {
  // eslint-disable-next-line no-empty-pattern
  test(`${format} navigator drop: catalogs, owning root, undo, transformed coordinates and read-only`, async ({}, info) => {
    test.setTimeout(120000)
    const a = await createKaFixture(),
      b = await createKaFixture()
    const profileFolder = join(a.destination, 'drag-profile'),
      folder = join(a.dataRoot, '_diagrams')
    await mkdir(profileFolder)
    await mkdir(folder)
    const file = join(folder, 'Drag.' + format)
    await writeFile(
      file,
      format === 'drawio'
        ? '<mxfile><diagram id="page" name="Main"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>'
        : JSON.stringify({
            format: 'frade-draw',
            version: 1,
            metadata: { id: 'drag', name: 'Drag' },
            graph: { nodes: [], edges: [] },
          }),
    )
    const profile = {
      version: 1,
      roots: [a, b].map((f, i) => ({
        repositoryId: i ? 'B' : 'A',
        label: i ? 'KA B' : 'KA A',
        adapterKind: 'sberea',
        dataRoot: f.dataRoot,
        entry: 'root.yaml',
        readOnly: false,
        activeMetadataSet: 'v2025',
        metadataSets: [
          {
            id: 'v2025',
            label: 'KA',
            dialect: 'sberea',
            folderPath: f.metadataRoot,
            schemaEntries: [
              'kadzo/v2025/entities/root.yaml',
              'kadzo/v2023/entities/technical/tech_params.yaml',
            ],
            documentEntries: [],
          },
        ],
      })),
    }
    const profilePath = join(profileFolder, 'frade-workspace.json')
    await writeFile(profilePath, JSON.stringify(profile))
    const env = { ...process.env, FRADE_USER_DATA: profileFolder }
    let app = await electron.launch({ args: [resolve('out/main/index.cjs')], env })
    try {
      let page = await app.firstWindow()
      await expect(page.locator('.status-message')).toContainText('276 объектов')
      await page.locator('[role=treeitem][aria-level="1"][data-repository-id="A"]').click()
      await page
        .locator('[data-repository-id="A"]')
        .filter({ hasText: /^_diagrams$/ })
        .click()
      await page
        .getByRole('treeitem')
        .filter({ hasText: new RegExp('^Drag\\.' + format + '$') })
        .dblclick()
      const save = () =>
        page.locator('.diagram-slot').getByRole('button', { name: 'Сохранить', exact: true })
      await expect(save()).toBeEnabled()
      await expect(page.locator('.diagram-objects')).toHaveCount(0)
      await dragObject(page, { repositoryId: 'B' })
      await expect(page.locator('.diagram-error')).toContainText('другому репозиторию')
      await expect(page.locator('.dirty-dot')).toHaveCount(0)
      const catalogPath = join(a.destination, 'services.json')
      await writeFile(
        catalogPath,
        JSON.stringify({
          version: 1,
          id: 'services',
          label: 'Общие сервисы',
          objects: [{ id: 'api', name: 'External service' }],
        }),
      )
      await app.evaluate(({ dialog }, path) => {
        dialog.showOpenDialog = (async () => ({
          canceled: false,
          filePaths: [path],
        })) as typeof dialog.showOpenDialog
      }, catalogPath)
      await page
        .locator('[role=treeitem][aria-level="1"][data-repository-id="A"]')
        .click({ button: 'right' })
      await page.getByRole('menuitem', { name: 'Подключить внешний каталог…' }).click()
      await dragObject(page, { repositoryId: 'A', sourceId: 'services', name: 'External service' })
      await expect(page.locator('.diagram-references summary')).toContainText('(1)')
      await save().click()
      await expect(page.locator('.dirty-dot')).toHaveCount(0)
      const action = async (name: string) => {
        if (format === 'frade')
          await page.locator('.diagram-slot').getByRole('button', { name, exact: true }).click()
        else
          await page.locator('iframe').evaluate(
            (element, actionName) => {
              ;(element as HTMLIFrameElement).contentWindow!.postMessage(
                JSON.stringify({ action: 'invokeAction', actionName }),
                'frade://drawio',
              )
            },
            name === 'Zoom +' ? 'zoomIn' : name.toLowerCase(),
          )
      }
      await action('Undo')
      await expect(page.locator('.diagram-references')).toHaveCount(0)
      await action('Redo')
      await expect(page.locator('.diagram-references summary')).toContainText('(1)')
      await action('Zoom +')
      await action('Zoom +')
      if (format === 'drawio')
        await page
          .locator('iframe')
          .contentFrame()
          .locator('.geDiagramContainer')
          .evaluate((el) => {
            el.scrollLeft += 80
            el.scrollTop += 100
          })
      const point = await dragObject(page, { repositoryId: 'A' })
      await expect(page.locator('.diagram-references summary')).toContainText('(2)')
      const label =
        format === 'frade'
          ? page.locator('.x6-node').filter({ hasText: 'Маркетплейс' })
          : page
              .locator('iframe')
              .contentFrame()
              .locator('.geDiagramContainer')
              .getByText('Маркетплейс', { exact: true })
      await expect(label).toBeVisible()
      const box = await label.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(point.x - 6)
      expect(box!.x).toBeLessThan(point.x + 360)
      expect(box!.y).toBeGreaterThanOrEqual(point.y - 6)
      expect(box!.y).toBeLessThan(point.y + 160)
      await save().click()
      await expect(page.locator('.dirty-dot')).toHaveCount(0)
      const saved = await readFile(file, 'utf8')
      expect(saved).toContain('services')
      expect(saved).toContain('Маркетплейс')
      await page.screenshot({ path: info.outputPath('navigator-drop-' + format + '.png') })
      await app.close()
      const stored = JSON.parse(await readFile(profilePath, 'utf8'))
      stored.roots[0].readOnly = true
      await writeFile(profilePath, JSON.stringify(stored))
      app = await electron.launch({ args: [resolve('out/main/index.cjs')], env })
      page = await app.firstWindow()
      await expect(page.locator('.status-message')).toContainText('276 объектов')
      await expect(page.locator('.diagram-references summary')).toContainText('(2)')
      await expect(save()).toBeDisabled()
      await dragObject(page, { repositoryId: 'A' })
      await expect(page.locator('.diagram-references summary')).toContainText('(2)')
      await expect(page.locator('.dirty-dot')).toHaveCount(0)
      expect(await readFile(file, 'utf8')).toBe(saved)
    } finally {
      await app.close().catch(() => {})
    }
  })
}

for (const format of ['frade', 'drawio'] as const) {
  // eslint-disable-next-line no-empty-pattern
  test('system notation, card NRT and persisted settings: ' + format, async ({}, info) => {
    test.setTimeout(120000)
    const fixture = await createKaFixture()
    const profile = join(fixture.destination, 'appearance-' + format)
    const launch = () =>
      electron.launch({
        args: [resolve('out/main/index.cjs')],
        env: { ...process.env, FRADE_USER_DATA: profile },
      })
    let app = await launch()
    try {
      let page = await app.firstWindow()
      const errors: string[] = []
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
      await expect(page.locator('.status-message')).toContainText('138 объектов', {
        timeout: 30000,
      })
      await page
        .getByRole('treeitem')
        .filter({ hasText: /^_diagrams$/ })
        .click({ button: 'right' })
      await page.getByRole('menuitem', { name: 'Новая диаграмма…' }).click()
      await page.getByLabel('Формат диаграммы').selectOption(format)
      await page.getByLabel('Имя файла или папки').fill('Системы.' + format)
      await page.getByRole('button', { name: 'Применить', exact: true }).click()
      const save = () =>
        page
          .locator('.diagram-slot .editor-actions')
          .getByRole('button', { name: 'Сохранить', exact: true })
      await expect(save()).toBeEnabled({ timeout: 20000 })
      await dragObject(page)
      const canvas = () =>
        format === 'frade'
          ? page.locator('.diagram-slot .x6-graph')
          : page.locator('.diagram-slot iframe').contentFrame().locator('.geDiagramContainer')
      const rect = (fill: string) =>
        canvas()
          .locator('rect[fill="' + fill + '" i]')
          .first()
      await expect(rect('#D5E8D4')).toHaveAttribute('stroke', /#ff00ff/i)
      await expect(rect('#D5E8D4')).toHaveCSS('stroke-width', '1px')
      const shadow = () => canvas().locator('[style*="drop-shadow"]')
      await expect(shadow().first()).toBeAttached()
      await expect(page.locator('.diagram-error')).toHaveCount(0)
      await page.screenshot({ path: info.outputPath('system-shadow-' + format + '.png') })
      await save().click()
      await expect(page.locator('.dirty-dot')).toHaveCount(0)
      const file = join(fixture.dataRoot, '_diagrams/Системы.' + format)
      const initial = await readFile(file, 'utf8')
      expect(initial).toContain(format === 'frade' ? '"shadow"' : 'shadow=1')
      const openCard = async () => {
        await page.getByLabel('Поиск объектов', { exact: true }).fill('Маркетплейс')
        await page.locator('[data-object-id="ecogroup.berezka.systems.berezka"]').dblclick()
        await page.getByLabel('Поиск объектов', { exact: true }).fill('')
      }
      const diagram = async () => page.getByRole('tab', { name: /Системы[.]/ }).click()
      await openCard()
      await page
        .locator('.field[data-field-path="target-status"] select')
        .selectOption({ label: 'Не целевая' })
      await page
        .locator('.field[data-field-path="change-type"] select')
        .selectOption({ label: 'Планируется' })
      await diagram()
      // Even before saving the card, the open diagram reflects its valid field values.
      await expect(rect('#E1D5E7')).toHaveAttribute('stroke', /#ff00ff/i)
      await expect(rect('#E1D5E7')).toHaveAttribute('stroke-width', '2')
      await openCard()
      await page
        .locator('.field[data-field-path="location"] select')
        .selectOption({ label: 'Внешняя' })
      const parent = page.locator('.field[data-field-path="parent"]')
      if (await parent.getByRole('button', { name: 'Добавить значение', exact: true }).count())
        await parent.getByRole('button', { name: 'Добавить значение', exact: true }).click()
      if (await parent.locator('.reference-value').count()) {
        await parent.locator('.reference-value').click()
        await parent.getByRole('option').last().click()
      } else {
        await parent.locator('input, textarea').fill('ecogroup.berezka.systems.berezka.catalog')
      }
      await page.keyboard.press('Control+s')
      await expect(page.locator('.inspector')).toBeVisible()
      await diagram()
      await expect(rect('#DAE8FC')).toHaveAttribute('stroke', /#6c8ebf/i)
      await expect(rect('#DAE8FC')).toHaveCSS('stroke-width', '1px')
      await expect(shadow()).toHaveCount(0)
      await page.getByRole('button', { name: 'Настройки репозитория', exact: true }).click()
      const settings = page.getByRole('dialog', { name: 'Метаописание репозитория', exact: true })
      await settings
        .locator('summary')
        .filter({ hasText: /^Отображение элементов$/ })
        .click()
      await page.screenshot({ path: info.outputPath('element-appearance-settings.png') })
      await settings.getByLabel('Внешняя: фон', { exact: true }).fill('#123456')
      await settings.getByLabel('Внешняя: толщина', { exact: true }).fill('3')
      await settings.getByRole('button', { name: 'Применить отображение', exact: true }).click()
      await settings.getByRole('button', { name: 'Отмена', exact: true }).click()
      await expect(rect('#123456')).toHaveAttribute('stroke-width', '3')
      await save().click()
      await expect(page.locator('.dirty-dot')).toHaveCount(0)
      const saved = await readFile(file, 'utf8')
      expect(saved).toContain('#123456')
      if (format === 'frade') {
        const before = JSON.parse(initial).graph.nodes[0],
          after = JSON.parse(saved).graph.nodes[0]
        expect(after).toMatchObject({
          shape: 'rect',
          x: before.x,
          y: before.y,
          width: before.width,
          height: before.height,
        })
        expect(after.shadow).toBeUndefined()
      } else expect(saved).toContain('shadow=0')
      await page.screenshot({ path: info.outputPath('system-appearance-' + format + '.png') })
      await app.evaluate(({ app }) => app.exit(0))
      await app.close().catch(() => {})
      app = await launch()
      page = await app.firstWindow()
      await expect(page.getByRole('status')).toHaveText('Backend: ready')
      await expect(rect('#123456')).toHaveAttribute('stroke-width', '3', { timeout: 30000 })
      await page.getByRole('button', { name: 'Настройки репозитория', exact: true }).click()
      const restored = page.getByRole('dialog', { name: 'Метаописание репозитория', exact: true })
      await restored
        .locator('summary')
        .filter({ hasText: /^Отображение элементов$/ })
        .click()
      await expect(restored.getByLabel('Внешняя: фон', { exact: true })).toHaveValue('#123456')
      if (format === 'drawio') {
        await restored
          .getByRole('checkbox', { name: 'Обновлять оформление из карточек в Draw.io' })
          .uncheck()
        await restored.getByRole('button', { name: 'Применить отображение', exact: true }).click()
      }
      await restored.getByRole('button', { name: 'Отмена', exact: true }).click()
      if (format === 'drawio') {
        await openCard()
        await page
          .locator('.field[data-field-path="location"] select')
          .selectOption({ label: 'Внутренняя' })
        await diagram()
        await expect(rect('#123456')).toHaveAttribute('stroke-width', '3')
        await expect(rect('#E1D5E7')).toHaveCount(0)
      }
      await expect(page.locator('.diagram-error')).toHaveCount(0)
      expect(errors).toEqual([])
    } finally {
      await app.evaluate(({ app }) => app.exit(0)).catch(() => {})
      await app.close().catch(() => {})
    }
  })
}

for (const format of ['frade', 'drawio'] as const) {
  // eslint-disable-next-line no-empty-pattern
  test('empty bundle native gesture, undo and persistence: ' + format, async ({}, info) => {
    test.setTimeout(120000)
    const fixture = await createKaFixture(),
      app = await electron.launch({
        args: [resolve('out/main/index.cjs')],
        env: { ...process.env, FRADE_USER_DATA: join(fixture.destination, 'bundles-' + format) },
      })
    try {
      const page = await app.firstWindow(),
        errors: string[] = []
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
      await expect(page.locator('.status-message')).toContainText('138 объектов', {
        timeout: 30000,
      })
      await page
        .getByRole('treeitem')
        .filter({ hasText: /^_diagrams$/ })
        .click({ button: 'right' })
      await page.getByRole('menuitem', { name: 'Новая диаграмма…' }).click()
      await page.getByLabel('Формат диаграммы').selectOption(format)
      await page.getByLabel('Имя файла или папки').fill('Жгуты.' + format)
      await page.getByRole('button', { name: 'Применить', exact: true }).click()
      const save = () =>
        page
          .locator('.diagram-slot .editor-actions')
          .getByRole('button', { name: 'Сохранить', exact: true })
      await expect(save()).toBeEnabled({ timeout: 20000 })
      await dragObject(page, { name: 'Маркетплейс', x: 80, y: 120 })
      await dragObject(page, { name: 'CRM', x: 400, y: 300 })
      const canvas = () =>
        format === 'frade'
          ? page.locator('.diagram-slot .x6-graph')
          : page.locator('.diagram-slot iframe').contentFrame().locator('.geDiagramContainer')
      const label = (name: string) => canvas().getByText(name, { exact: true })
      const a = await label('Маркетплейс').boundingBox(),
        b = await label('CRM').boundingBox()
      if (!a || !b) throw Error('System labels unavailable')
      const source = { x: a.x + a.width / 2, y: a.y + a.height / 2 },
        target = { x: b.x + b.width / 2, y: b.y + b.height / 2 }
      await page.mouse.move(source.x, source.y)
      await page.mouse.move(source.x + (format === 'frade' ? 82 : 90), source.y, { steps: 5 })
      await page.mouse.down()
      await page.mouse.move(target.x, target.y, { steps: 25 })
      await page.mouse.up()
      const line = (stroke = '#404040') =>
        canvas()
          .locator('path[stroke="' + stroke + '" i]')
          .first()
      await expect(line()).toBeAttached()
      await expect(line()).toHaveCSS('stroke-width', '1px')
      await page.keyboard.press('Control+z')
      await expect(line()).toHaveCount(0)
      await page.keyboard.press('Control+y')
      await expect(line()).toBeAttached()
      // Move the target by its label; the attached bundle follows it.
      const before = await line().getAttribute('d'),
        current = await label('CRM').boundingBox()
      await page.mouse.move(current!.x + current!.width / 2, current!.y + current!.height / 2)
      await page.mouse.down()
      await page.mouse.move(target.x - 40, target.y + 65, { steps: 12 })
      await page.mouse.up()
      await expect.poll(() => line().getAttribute('d')).not.toBe(before)
      await save().click()
      await expect(page.locator('.dirty-dot')).toHaveCount(0)
      const file = join(fixture.dataRoot, '_diagrams/Жгуты.' + format),
        initial = await readFile(file, 'utf8')
      if (format === 'frade')
        expect(JSON.parse(initial).graph.edges).toMatchObject([
          {
            bundle: { kind: 'empty' },
            targetMarker: null,
            style: { stroke: '#404040', strokeWidth: 1 },
          },
        ])
      else {
        expect(initial).toContain('fradeBundle="empty"')
        expect(initial).toContain('startArrow=none')
        expect(initial).toContain('endArrow=none')
      }
      await page.screenshot({ path: info.outputPath('empty-bundle-' + format + '.png') })
      await page.getByRole('button', { name: 'Настройки репозитория', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: 'Метаописание репозитория', exact: true })
      await dialog
        .locator('summary')
        .filter({ hasText: /^Отображение элементов$/ })
        .click()
      await expect(dialog.getByLabel('Пустой жгут: цвет')).toHaveValue('#404040')
      await dialog.getByLabel('Пустой жгут: цвет').fill('#556677')
      await dialog.getByLabel('Пустой жгут: толщина').fill('2')
      await dialog.getByRole('button', { name: 'Применить отображение', exact: true }).click()
      await dialog.getByRole('button', { name: 'Отмена', exact: true }).click()
      await expect(line('#556677')).toHaveCSS('stroke-width', '2px')
      await save().click()
      await expect(page.locator('.dirty-dot')).toHaveCount(0)
      await page.getByRole('button', { name: 'Закрыть Жгуты.' + format, exact: true }).click()
      await page
        .getByRole('treeitem')
        .filter({ hasText: new RegExp('^Жгуты[.]' + format + '$') })
        .dblclick()
      await expect(line('#556677')).toHaveCSS('stroke-width', '2px', { timeout: 20000 })
      await expect(page.locator('.diagram-error')).toHaveCount(0)
      expect(errors).toEqual([])
    } finally {
      await app.evaluate(({ app }) => app.exit(0)).catch(() => {})
      await app.close().catch(() => {})
    }
  })
}
