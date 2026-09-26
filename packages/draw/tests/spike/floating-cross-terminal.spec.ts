import { expect, test, type Page } from '@playwright/test'

async function handleCenter(page: Page, vertical: boolean) {
  const boxes = []
  for (const handle of await page.locator('.x6-edge-tool-segment').all()) {
    const box = await handle.boundingBox()
    if (box && (await handle.getAttribute('cursor')) === (vertical ? 'col-resize' : 'row-resize'))
      boxes.push(box)
  }
  boxes.sort((a, b) => a.y - b.y)
  expect(boxes.length).toBeGreaterThan(0)
  return { x: boxes[0].x + boxes[0].width / 2, y: boxes[0].y + boxes[0].height / 2 }
}

for (const releaseY of [null, 270, 280])
  test(`horizontal corridor crosses target height continuously (releaseY=${releaseY})`, async ({
    page,
  }) => {
    await page.goto('/visual.html')
    await page.evaluate(() => {
      window.FRADE_VISUAL_TEST!.loadFixture({
        nodes: [
          { id: 'a', x: 80, y: 80, width: 120, height: 80 },
          { id: 'b', x: 500, y: 280, width: 120, height: 80 },
        ],
        edges: [{ id: 'e', source: 'a', target: 'b' }],
      })
      window.FRADE_VISUAL_TEST!.selectEdge('e')
    })
    const stable = () => page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
    await stable()
    const vertical = await handleCenter(page, true)
    await page.mouse.move(vertical.x, vertical.y)
    await page.mouse.down()
    await page.mouse.move(680, vertical.y, { steps: 6 })
    await page.mouse.up()
    await stable()
    let horizontal = await handleCenter(page, false)
    await page.mouse.move(horizontal.x, horizontal.y)
    await page.mouse.down()
    await page.mouse.move(horizontal.x, releaseY ?? 280, { steps: 10 })
    if (releaseY !== null) {
      await page.mouse.up()
      await page.mouse.click(750, 500)
      await page.evaluate(() => window.FRADE_VISUAL_TEST!.selectEdge('e'))
      await stable()
      horizontal = await handleCenter(page, false)
      await page.mouse.move(horizontal.x, horizontal.y)
      await page.mouse.down()
    }
    for (const y of [290, 300, 310, 320, 330, 340, 350, 360, 370, 390, 350, 320, 290, 370]) {
      await page.mouse.move(horizontal.x, y)
      await stable()
      const segments = await page.evaluate(() => window.FRADE_VISUAL_TEST!.getSegments('e'))
      const last = segments.at(-1)!
      expect(
        segments.some((s) => s.orientation === 'horizontal' && Math.abs(s.start.y - y) < 0.01),
      ).toBe(true)
      if (y <= 360) {
        expect(last.end.x).toBeCloseTo(500)
        expect(last.end.y).toBeCloseTo(y)
        expect(last.start.x).toBeLessThan(500)
      } else {
        expect(last.end.y).toBeCloseTo(360)
        expect(last.start.y).toBeGreaterThan(360)
        expect(last.start.x).toBeCloseTo(last.end.x)
      }
      for (const s of segments) {
        if (s.orientation === 'horizontal' && s.start.y > 280 && s.start.y < 360)
          expect(Math.min(s.start.x, s.end.x) >= 620 || Math.max(s.start.x, s.end.x) <= 500).toBe(
            true,
          )
        if (s.orientation === 'vertical' && s.start.x > 500 && s.start.x < 620)
          expect(Math.min(s.start.y, s.end.y) >= 360 || Math.max(s.start.y, s.end.y) <= 280).toBe(
            true,
          )
      }
      expect(await page.evaluate(() => window.FRADE_VISUAL_TEST!.validateRoute('e').valid)).toBe(
        true,
      )
    }
    const before = await page.evaluate(() => window.FRADE_VISUAL_TEST!.getSegments('e'))
    await page.mouse.up()
    await stable()
    expect(await page.evaluate(() => window.FRADE_VISUAL_TEST!.getSegments('e'))).toEqual(before)
  })
