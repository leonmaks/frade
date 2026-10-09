import { expect, test } from '@playwright/test'
test.beforeEach(async ({ page }) => {
  await page.goto('/visual.html')
  await page.waitForFunction(() => Boolean(window.FRADE_VISUAL_TEST))
})
test('production visual API reads real X6 SVG', async ({ page }) => {
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
  await page.evaluate(() => {
    window.FRADE_VISUAL_TEST!.addRectangle('a', 80, 200)
    window.FRADE_VISUAL_TEST!.addRectangle('b', 500, 200)
    const edge = window.FRADE_VISUAL_TEST!.connect('a', 'b')
    ;(window as any).__edge = edge
  })
  await expect
    .poll(() => page.evaluate(() => window.FRADE_VISUAL_TEST!.getGraphSnapshot()))
    .toEqual({ nodes: 2, edges: 1 })
  const edge = await page.evaluate(() => (window as any).__edge as string)
  expect(await page.evaluate(() => window.FRADE_VISUAL_TEST!.getExportCapabilities())).toEqual({
    svg: true,
    png: true,
  })
  expect(await page.evaluate((id) => window.FRADE_VISUAL_TEST!.validateRoute(id).valid, edge)).toBe(
    true,
  )
  await expect
    .poll(() => page.evaluate((id) => window.FRADE_VISUAL_TEST!.getRenderSnapshot(id).svg, edge))
    .toBe(true)
  expect(
    await page.evaluate((id) => window.FRADE_VISUAL_TEST!.getRenderSnapshot(id).path, edge),
  ).toBeTruthy()
  await page.evaluate((id) => window.FRADE_VISUAL_TEST!.selectEdge(id), edge)
  await expect
    .poll(() => page.evaluate(() => window.FRADE_VISUAL_TEST!.getHandles()))
    .toBeGreaterThan(0)
})

test('selected real edge keeps SVG visible while a segment handle is dragged', async ({ page }) => {
  await page.evaluate(() => {
    window.FRADE_VISUAL_TEST!.addRectangle('a', 80, 200)
    window.FRADE_VISUAL_TEST!.addRectangle('b', 500, 200)
    const edge = window.FRADE_VISUAL_TEST!.connect('a', 'b')
    ;(window as any).__edge = edge
  })
  const edge = await page.evaluate(() => (window as any).__edge as string)
  await page.evaluate((id) => window.FRADE_VISUAL_TEST!.selectEdge(id), edge)
  const handle = page.locator('.x6-edge-tool-segment').first()
  await expect(handle).toBeVisible()
  const before = await page.evaluate(
    (id) => window.FRADE_VISUAL_TEST!.getRenderSnapshot(id).path,
    edge,
  )
  const box = await handle.boundingBox()
  expect(box).toBeTruthy()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 + 40)
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
  const during = await page.evaluate((id) => window.FRADE_VISUAL_TEST!.getRenderSnapshot(id), edge)
  expect(await page.evaluate((id) => window.FRADE_VISUAL_TEST!.validateRoute(id).valid, edge)).toBe(
    true,
  )
  expect(during.svg).toBe(true)
  expect(during.path).toBeTruthy()
  const lineStyle = await page.evaluate((id) => {
    const line = document.querySelector(`[data-cell-id="${id}"] path`)
    return {
      dash: line?.getAttribute('stroke-dasharray') ?? null,
      stroke: line?.getAttribute('stroke') ?? null,
    }
  }, edge)
  expect(lineStyle.dash).toBeNull()
  const segments = await page.evaluate((id) => window.FRADE_VISUAL_TEST!.getSegments(id), edge)
  expect(segments[0].start).toMatchObject({ x: 140, y: 270 })
  expect(segments.at(-1)!.end).toMatchObject({ x: 560, y: 270 })
  expect(segments[0].end.y).toBeGreaterThan(270)
  expect(segments.at(-1)!.start.y).toBeGreaterThan(270)
  await expect
    .soft(page)
    .toHaveScreenshot('SEG-VIS-004-horizontal-drag.png', { fullPage: true, animations: 'disabled' })
  await page.mouse.up()
  await expect
    .poll(() => page.evaluate((id) => window.FRADE_VISUAL_TEST!.getRenderSnapshot(id).path, edge))
    .toBeTruthy()
  await expect
    .soft(page)
    .toHaveScreenshot('SEG-VIS-009-after-drop.png', { fullPage: true, animations: 'disabled' })
  expect(before).toBeTruthy()
})

test('production route remains rendered after node move and resize', async ({ page }) => {
  await page.evaluate(() => {
    window.FRADE_VISUAL_TEST!.addRectangle('a', 80, 200)
    window.FRADE_VISUAL_TEST!.addRectangle('b', 500, 200)
    ;(window as any).__edge = window.FRADE_VISUAL_TEST!.connect('a', 'b')
  })
  const edge = await page.evaluate(() => (window as any).__edge as string)
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.moveNode('b', 500, 350))
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.resizeNode('a', 180, 90))
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
  expect(
    await page.evaluate((id) => window.FRADE_VISUAL_TEST!.getRenderSnapshot(id).svg, edge),
  ).toBe(true)
  expect(await page.evaluate((id) => window.FRADE_VISUAL_TEST!.validateRoute(id).valid, edge)).toBe(
    true,
  )
})

test('fixture loading is deterministic and exposes logical segments', async ({ page }) => {
  const fixture = {
    nodes: [
      { id: 'source', x: 80, y: 220 },
      { id: 'target', x: 520, y: 220 },
    ],
    edges: [{ id: 'edge', source: 'source', target: 'target' }],
  }
  await page.evaluate((value) => window.FRADE_VISUAL_TEST!.loadFixture(value), fixture)
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
  const first = await page.evaluate(() => ({
    route: window.FRADE_VISUAL_TEST!.getRoute('edge'),
    segments: window.FRADE_VISUAL_TEST!.getSegments('edge'),
  }))
  await page.evaluate((value) => window.FRADE_VISUAL_TEST!.loadFixture(value), fixture)
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
  const second = await page.evaluate(() => ({
    route: window.FRADE_VISUAL_TEST!.getRoute('edge'),
    segments: window.FRADE_VISUAL_TEST!.getSegments('edge'),
  }))
  expect(second).toEqual(first)
  expect(first.segments.length).toBeGreaterThan(0)
  expect(await page.evaluate(() => window.FRADE_VISUAL_TEST!.validateRoute('edge').valid)).toBe(
    true,
  )
})

test('floating attachments cross unrelated figures and survive move, resize, and reconnect', async ({
  page,
}) => {
  await page.evaluate(() =>
    window.FRADE_VISUAL_TEST!.loadFixture({
      nodes: [
        { id: 'source', x: 80, y: 220 },
        { id: 'obstacle', x: 330, y: 180, width: 120, height: 150 },
        { id: 'target', x: 620, y: 220 },
        { id: 'replacement', x: 620, y: 430 },
      ],
      edges: [{ id: 'edge', source: 'source', target: 'target' }],
    }),
  )
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
  const before = await page.evaluate(() => window.FRADE_VISUAL_TEST!.getAttachments('edge') as any)
  expect(before.valid).toBe(true)
  expect(before.points).toEqual([
    { x: 200, y: 255 },
    { x: 620, y: 255 },
  ])
  await page.evaluate(() => {
    window.FRADE_VISUAL_TEST!.moveNode('source', 80, 340)
    window.FRADE_VISUAL_TEST!.resizeNode('target', 150, 90)
    window.FRADE_VISUAL_TEST!.reconnectTarget('edge', 'replacement')
  })
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
  const after = await page.evaluate(() => window.FRADE_VISUAL_TEST!.getAttachments('edge') as any)
  expect(after.valid).toBe(true)
  expect(after.points).not.toEqual(before.points)
  expect(await page.evaluate(() => window.FRADE_VISUAL_TEST!.getRenderSnapshot('edge').svg)).toBe(
    true,
  )
})

test('approved visual baseline matrix covers selection, hover, drag, obstacle, and legacy edge', async ({
  page,
}) => {
  await page.evaluate(() =>
    window.FRADE_VISUAL_TEST!.loadFixture({
      nodes: [
        { id: 'source', x: 80, y: 220 },
        { id: 'target', x: 520, y: 220 },
      ],
      edges: [{ id: 'edge', source: 'source', target: 'target' }],
    }),
  )
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.selectEdge('edge'))
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
  await expect(page).toHaveScreenshot('SEG-VIS-001-selected-edge.png', {
    fullPage: true,
    animations: 'disabled',
  })
  const handle = page.locator('.x6-edge-tool-segment').first()
  const handleBox = await handle.boundingBox()
  expect(handleBox).toBeTruthy()
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2)
  await expect(page).toHaveScreenshot('SEG-VIS-002-horizontal-hover.png', {
    fullPage: true,
    animations: 'disabled',
  })
  await page.evaluate(() =>
    window.FRADE_VISUAL_TEST!.loadFixture({
      nodes: [
        { id: 'source', x: 280, y: 60 },
        { id: 'target', x: 280, y: 440 },
      ],
      edges: [{ id: 'vertical', source: 'source', target: 'target' }],
    }),
  )
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.selectEdge('vertical'))
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
  await expect(page).toHaveScreenshot('SEG-VIS-003-vertical-hover.png', {
    fullPage: true,
    animations: 'disabled',
  })
  const verticalHandle = page.locator('.x6-edge-tool-segment').first()
  const verticalBox = await verticalHandle.boundingBox()
  expect(verticalBox).toBeTruthy()
  await page.mouse.move(
    verticalBox!.x + verticalBox!.width / 2,
    verticalBox!.y + verticalBox!.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    verticalBox!.x + verticalBox!.width / 2 + 35,
    verticalBox!.y + verticalBox!.height / 2,
  )
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
  expect(await page.evaluate(() => window.FRADE_VISUAL_TEST!.validateRoute('vertical').valid)).toBe(
    true,
  )
  await expect
    .soft(page)
    .toHaveScreenshot('SEG-VIS-005-vertical-drag.png', { fullPage: true, animations: 'disabled' })
  await page.mouse.up()
  await page.evaluate(() =>
    window.FRADE_VISUAL_TEST!.loadFixture({
      nodes: [
        { id: 'source', x: 80, y: 220 },
        { id: 'obstacle', x: 330, y: 180, width: 120, height: 150 },
        { id: 'target', x: 620, y: 220 },
      ],
      edges: [{ id: 'obstacle-edge', source: 'source', target: 'target' }],
    }),
  )
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
  await expect(page).toHaveScreenshot('SEG-VIS-008-obstacle.png', {
    fullPage: true,
    animations: 'disabled',
  })
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.selectEdge('obstacle-edge'))
  await expect(page).toHaveScreenshot('SEG-VIS-006-straight-to-detour.png', {
    fullPage: true,
    animations: 'disabled',
  })
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.moveNode('source', 250, 60))
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
  expect(
    await page.evaluate(() => window.FRADE_VISUAL_TEST!.validateRoute('obstacle-edge').valid),
  ).toBe(true)
  const movedSegments = await page.evaluate(() =>
    window.FRADE_VISUAL_TEST!.getSegments('obstacle-edge'),
  )
  expect(movedSegments[0].start).toMatchObject({ x: 370, y: 95 })
  expect(movedSegments.at(-1)!.end).toMatchObject({ x: 620, y: 255 })
  expect(movedSegments.at(-1)!.start.x).toBeLessThan(620)
  await expect(page).toHaveScreenshot('SEG-VIS-007-near-source.png', {
    fullPage: true,
    animations: 'disabled',
  })
  await page.evaluate(() =>
    window.FRADE_VISUAL_TEST!.loadFixture({
      nodes: [
        { id: 'source', x: 80, y: 220 },
        { id: 'target', x: 520, y: 220 },
      ],
      edges: [
        {
          id: 'legacy',
          source: 'source',
          target: 'target',
          vertices: [
            { x: 300, y: 160 },
            { x: 430, y: 160 },
          ],
        },
      ],
    }),
  )
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.selectEdge('legacy'))
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
  await expect(page).toHaveScreenshot('SEG-VIS-010-legacy-edge.png', {
    fullPage: true,
    animations: 'disabled',
  })
})
