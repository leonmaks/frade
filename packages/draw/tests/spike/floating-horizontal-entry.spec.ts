import { expect, test } from '@playwright/test'

for (const terminal of ['source', 'target'] as const) {
  for (const side of ['top', 'bottom'] as const) {
    test(`horizontal ${terminal} segment switches to ${side}`, async ({ page }) => {
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
      const stable = () => page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
      await stable()
      const handles = page.locator('.x6-edge-tool-segment')
      for (const handle of await handles.all()) {
        const box = await handle.boundingBox()
        if (box && (await handle.getAttribute('cursor')) === 'col-resize') {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
          await page.mouse.down()
          await page.mouse.move(300, box.y + box.height / 2)
          await page.mouse.up()
          break
        }
      }
      await stable()
      const horizontal = []
      for (const handle of await handles.all()) {
        const box = await handle.boundingBox()
        if (box && (await handle.getAttribute('cursor')) === 'row-resize') horizontal.push(box)
      }
      horizontal.sort((a, b) => a.x - b.x)
      expect(horizontal.length).toBe(2)
      const box = terminal === 'source' ? horizontal[0] : horizontal[1]
      const x = box.x + box.width / 2
      const boundary = (terminal === 'source' ? 80 : 280) + (side === 'bottom' ? 80 : 0)
      const sign = side === 'top' ? -1 : 1
      await page.mouse.move(x, box.y + box.height / 2)
      await page.mouse.down()
      for (const distance of [20, 50, 20]) {
        const y = boundary + sign * distance
        await page.mouse.move(x, y, { steps: 4 })
        await stable()
        const segments = await page.evaluate(() => window.FRADE_VISUAL_TEST!.getSegments('e'))
        const segment = terminal === 'source' ? segments[0] : segments.at(-1)!
        const endpoint = terminal === 'source' ? segment.start : segment.end
        const outside = terminal === 'source' ? segment.end : segment.start
        expect(endpoint.y).toBeCloseTo(boundary)
        expect(endpoint.x).toBeCloseTo(terminal === 'source' ? 140 : 560)
        expect(outside.x).toBeCloseTo(endpoint.x)
        expect((outside.y - endpoint.y) * sign).toBeGreaterThan(0)
        expect(
          segments.some((s) => s.orientation === 'horizontal' && Math.abs(s.start.y - y) < 0.01),
        ).toBe(true)
        expect(await page.evaluate(() => window.FRADE_VISUAL_TEST!.validateRoute('e').valid)).toBe(
          true,
        )
      }
      const before = await page.evaluate(() => window.FRADE_VISUAL_TEST!.getSegments('e'))
      await page.mouse.up()
      await stable()
      expect(await page.evaluate(() => window.FRADE_VISUAL_TEST!.getSegments('e'))).toEqual(before)
    })
  }
}
