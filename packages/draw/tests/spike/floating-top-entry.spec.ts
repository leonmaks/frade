import { expect, test } from '@playwright/test'

for (const direction of ['left', 'right'] as const)
  test(`drag vertical corridor ${direction} switches floating sides without reversal`, async ({
    page,
  }) => {
    await page.goto('/visual.html')
    await page.evaluate(() => {
      const api = window.FRADE_VISUAL_TEST!
      api.loadFixture({
        nodes: [
          { id: 'a', x: 80, y: 80, width: 120, height: 80 },
          { id: 'b', x: 500, y: 280, width: 120, height: 80 },
        ],
        edges: [{ id: 'e', source: 'a', target: 'b' }],
      })
      api.selectEdge('e')
    })
    await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
    const segments = await page.evaluate(() => window.FRADE_VISUAL_TEST!.getSegments('e'))
    const vertical = segments.find((s) => s.orientation === 'vertical' && s.length > 30)!
    expect(vertical).toBeTruthy()
    const handles = page.locator('.x6-edge-tool-segment')
    let selected: { x: number; y: number } | undefined
    for (const handle of await handles.all()) {
      const box = await handle.boundingBox()
      if (box && (await handle.getAttribute('cursor')) === 'col-resize') {
        selected = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
        break
      }
    }
    expect(selected).toBeTruthy()
    await page.mouse.move(selected!.x, selected!.y)
    await page.mouse.down()
    for (const x of direction === 'left'
      ? [210, 190, 160, 100, 160, 210]
      : [520, 550, 580, 650, 700, 650, 550]) {
      await page.mouse.move(x, selected!.y, { steps: 3 })
      await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
      const route = await page.evaluate(() => window.FRADE_VISUAL_TEST!.getSegments('e'))
      const last = route.at(-1)!
      if (direction === 'left') {
        const first = route[0]
        if (x < 200) {
          expect(first.start.x).toBeCloseTo(x)
          expect(first.start.y).toBeCloseTo(160)
          expect(first.end.x).toBeCloseTo(x)
          expect(first.end.y).toBeGreaterThan(first.start.y)
        } else {
          expect(first.start.x).toBeCloseTo(200)
          expect(first.end.x).toBeGreaterThan(first.start.x)
        }
      } else if (x > 620) {
        expect(last.end.x).toBeCloseTo(620)
        expect(last.end.y).toBeCloseTo(320)
        expect(last.start.y).toBeCloseTo(last.end.y)
        expect(last.start.x).toBeGreaterThan(last.end.x)
      } else {
        expect(last.end.x).toBeCloseTo(x)
        expect(last.end.y).toBeCloseTo(280)
        expect(last.end.x).toBeGreaterThanOrEqual(500)
        expect(last.end.x).toBeLessThanOrEqual(620)
        expect(last.start.x).toBeCloseTo(last.end.x)
        expect(last.start.y).toBeLessThan(last.end.y)
      }
      expect(await page.evaluate(() => window.FRADE_VISUAL_TEST!.validateRoute('e').valid)).toBe(
        true,
      )
    }
    const before = await page.evaluate(() => window.FRADE_VISUAL_TEST!.getSegments('e'))
    await page.mouse.up()
    await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
    expect(await page.evaluate(() => window.FRADE_VISUAL_TEST!.getSegments('e'))).toEqual(before)
  })
