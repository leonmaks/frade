import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { AstBuilder, GherkinClassicTokenMatcher, Parser } from '@cucumber/gherkin'
import { IdGenerator } from '@cucumber/messages'
import type { DiagramDocument } from '../../src/document/schema'

const fixture: DiagramDocument = {
  format: 'frade-draw',
  version: 1,
  metadata: { id: 'document-original', name: 'Architecture' },
  viewport: { zoom: 1.1, pan: { x: 12, y: 18 } },
  graph: {
    nodes: [
      {
        id: 'node-1',
        shape: 'rect',
        x: 80,
        y: 180,
        width: 120,
        height: 70,
        label: 'Source',
        style: { fill: '#ffeecc', stroke: '#112233', strokeWidth: 3 },
        labelStyle: { fill: '#884400', fontSize: 18 },
        ports: [{ id: 'out', x: 120, y: 35 }],
      },
      {
        id: 'target',
        shape: 'rounded-rect',
        x: 420,
        y: 180,
        width: 120,
        height: 70,
        label: 'Target',
      },
      { id: 'ellipse', shape: 'ellipse', x: 80, y: 360, width: 100, height: 60, label: 'Ellipse' },
      { id: 'diamond', shape: 'diamond', x: 240, y: 360, width: 100, height: 60, label: 'Diamond' },
      { id: 'text', shape: 'text', x: 400, y: 360, width: 100, height: 60, label: 'Text' },
    ],
    edges: [
      {
        id: 'edited',
        source: { mode: 'floating', nodeId: 'node-1', offset: { x: 0, y: -35 } },
        target: { mode: 'floating', nodeId: 'target', offset: { x: 0, y: -35 } },
        vertices: [
          { x: 140, y: 110 },
          { x: 480, y: 110 },
        ],
        constraints: [{ axis: 'y', coordinate: 110, order: 0 }],
        router: 'normal',
        style: { stroke: '#bb2233', strokeWidth: 3, strokeDasharray: '5 3' },
        targetMarker: { name: 'classic', size: 10 },
      },
      {
        id: 'fixed',
        source: { mode: 'fixed', nodeId: 'node-1', portId: 'out' },
        target: { mode: 'floating', nodeId: 'target' },
        router: 'manhattan',
        targetMarker: null,
      },
    ],
  },
}
async function openFile(page: Page, document: unknown) {
  await page.getByLabel('Open diagram').setInputFiles({
    name: 'diagram.frade.json',
    mimeType: 'application/json',
    buffer: Buffer.from(typeof document === 'string' ? document : JSON.stringify(document)),
  })
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
}
async function download(page: Page, button = 'Save') {
  const event = page.waitForEvent('download')
  await page.getByRole('button', { name: button, exact: true }).click()
  const result = await event
  const document = JSON.parse(await readFile((await result.path())!, 'utf8')) as DiagramDocument
  return { document, name: result.suggestedFilename() }
}
async function stableFixture(page: Page) {
  await openFile(page, fixture)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.locator('.x6-node')).toHaveCount(5)
}
async function route(page: Page) {
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
  return page.evaluate(() => window.FRADE_VISUAL_TEST!.getRenderSnapshot('edited').path)
}

const feature = new Parser(
  new AstBuilder(IdGenerator.incrementing()),
  new GherkinClassicTokenMatcher(),
).parse(readFileSync(new URL('../features/document-roundtrip.feature', import.meta.url), 'utf8'))

for (const child of feature.feature!.children) {
  const scenario = child.scenario!
  test(scenario.tags.map((tag) => tag.name).join(' ') + ' ' + scenario.name, async ({ page }) => {
    await page.goto('/editor-visual.html')
    await page.waitForFunction(() => Boolean(window.FRADE_VISUAL_TEST))
    let before: DiagramDocument
    let beforePath: string | null
    let renamed: Awaited<ReturnType<typeof download>>
    const steps: Record<string, () => Promise<void>> = {
      'a styled diagram with all shapes and an edited route is open': async () => {
        await stableFixture(page)
        before = (await download(page)).document
        beforePath = await route(page)
        expect(beforePath).toBeTruthy()
      },
      'the diagram is downloaded and reopened': async () => {
        await page.getByRole('button', { name: 'New', exact: true }).click()
        await openFile(page, before)
      },
      'its document and rendered route are preserved': async () => {
        const after = (await download(page)).document
        expect(after).toEqual(before)
        expect(after.graph.nodes.map((n) => n.shape)).toEqual([
          'rect',
          'rounded-rect',
          'ellipse',
          'diamond',
          'text',
        ])
        expect(after.graph.nodes[0]).toMatchObject({
          style: fixture.graph.nodes[0].style,
          labelStyle: fixture.graph.nodes[0].labelStyle,
          ports: fixture.graph.nodes[0].ports,
        })
        expect(after.graph.edges[0]).toMatchObject(fixture.graph.edges[0])
        expect(after.viewport).toEqual(fixture.viewport)
        expect(await route(page)).toEqual(beforePath)
        expect(
          await page.evaluate(() => window.FRADE_VISUAL_TEST!.validateRoute('edited').valid),
        ).toBe(true)
      },
      'the reopened diagram remains editable': async () => {
        await page.evaluate(() => window.FRADE_VISUAL_TEST!.selectEdge('edited'))
        const handle = page.locator('.x6-edge-tool-segment').nth(1)
        await expect(handle).toBeVisible()
        const box = (await handle.boundingBox())!
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 30, { steps: 5 })
        await page.mouse.up()
        const edited = (await download(page)).document
        expect(edited.graph.edges[0].vertices).not.toEqual(before.graph.edges[0].vertices)
        const editedPath = await route(page)
        await openFile(page, edited)
        expect(await route(page)).toEqual(editedPath)
        await page.getByRole('button', { name: 'rect', exact: true }).click()
        await expect(page.locator('.x6-node')).toHaveCount(6)
        const ids = (await download(page)).document.graph.nodes.map((n) => n.id)
        expect(new Set(ids).size).toBe(6)
      },
      'an invalid document is selected': async () => {
        await openFile(page, { ...fixture, version: 99 })
      },
      'an error is shown and the existing document is unchanged': async () => {
        await expect(page.getByRole('alert')).toContainText('Unsupported document version')
        expect((await download(page)).document).toEqual(before)
        expect(await route(page)).toEqual(beforePath)
      },
      'Save As is confirmed with a new name': async () => {
        page.once('dialog', (dialog) => dialog.accept('Renamed diagram'))
        renamed = await download(page, 'Save As')
      },
      'subsequent downloads use the new name and original identities': async () => {
        expect(renamed.name).toBe('Renamed diagram.frade.json')
        expect(renamed.document).toEqual({
          ...before,
          metadata: { ...before.metadata, name: 'Renamed diagram' },
        })
        expect(await download(page)).toEqual(renamed)
      },
      'New is followed by Undo': async () => {
        await page.getByRole('button', { name: 'rect', exact: true }).click()
        await page.getByRole('button', { name: 'New', exact: true }).click()
        await page.getByRole('button', { name: 'Undo', exact: true }).click()
      },
      'the document stays empty with fresh identity and default viewport': async () => {
        const result = (await download(page)).document
        expect(result.graph).toEqual({ nodes: [], edges: [] })
        expect(result.metadata.id).not.toBe(before.metadata.id)
        expect(result.viewport).toEqual({ zoom: 1, pan: { x: 0, y: 0 } })
      },
    }
    for (const step of scenario.steps) {
      expect(steps[step.text], 'Unmapped document step: ' + step.text).toBeDefined()
      await test.step(step.text, steps[step.text])
    }
  })
}

test('invalid documents and cancelled Save As preserve the current graph', async ({ page }) => {
  await page.goto('/editor-visual.html')
  await page.waitForFunction(() => Boolean(window.FRADE_VISUAL_TEST))
  await stableFixture(page)
  const before = (await download(page)).document
  const malformed: unknown[] = [
    '{broken',
    {
      ...fixture,
      graph: { ...fixture.graph, nodes: [...fixture.graph.nodes, fixture.graph.nodes[0]] },
    },
    {
      ...fixture,
      graph: {
        ...fixture.graph,
        edges: [{ ...fixture.graph.edges[0], target: { mode: 'floating', nodeId: 'missing' } }],
      },
    },
    { ...fixture, viewport: { zoom: -1, pan: { x: 0, y: 0 } } },
  ]
  for (const value of malformed) {
    await openFile(page, value)
    await expect(page.getByRole('alert')).toBeVisible()
    expect((await download(page)).document).toEqual(before)
  }
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: 'Save As', exact: true }).click()
  expect((await download(page)).document).toEqual(before)
  page.once('dialog', (dialog) => dialog.accept('   '))
  await page.getByRole('button', { name: 'Save As', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('must not be empty')
  expect((await download(page)).document).toEqual(before)
})

test('New invalidates a file read that completes later', async ({ page }) => {
  await page.goto('/editor-visual.html')
  await page.waitForFunction(() => Boolean(window.FRADE_VISUAL_TEST))
  await stableFixture(page)
  await page.evaluate(() => {
    const original = File.prototype.text
    File.prototype.text = async function () {
      const result = await original.call(this)
      await new Promise((resolve) => setTimeout(resolve, 400))
      return result
    }
  })
  await page.getByLabel('Open diagram').setInputFiles({
    name: 'slow.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture)),
  })
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page.waitForTimeout(600)
  expect((await download(page)).document.graph).toEqual({ nodes: [], edges: [] })
})

test('legacy version-one documents remain readable with deterministic routes and ports', async ({
  page,
}) => {
  await page.goto('/editor-visual.html')
  await page.waitForFunction(() => Boolean(window.FRADE_VISUAL_TEST))
  await openFile(page, {
    ...fixture,
    format: 'frade-designer',
    viewport: undefined,
    graph: {
      nodes: fixture.graph.nodes.slice(0, 2).map(({ ports: _ports, ...node }) => node),
      edges: [
        {
          id: 'legacy',
          source: { mode: 'fixed', nodeId: 'node-1', portId: 'out' },
          target: { mode: 'floating', nodeId: 'target' },
          constraints: [
            { axis: 'x', coordinate: 280, order: 0 },
            { axis: 'y', coordinate: 100, order: 1 },
          ],
        },
      ],
    },
  })
  await expect(page.getByRole('alert')).toHaveCount(0)
  const first = (await download(page)).document
  expect(first.format).toBe('frade-draw')
  expect(first.graph.edges[0].source).toMatchObject({ mode: 'fixed', portId: 'out' })
  await openFile(page, first)
  expect((await download(page)).document).toEqual(first)
})
