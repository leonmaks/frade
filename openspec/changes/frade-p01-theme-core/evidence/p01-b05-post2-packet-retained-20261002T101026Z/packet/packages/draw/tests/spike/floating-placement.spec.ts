import { expect, test } from '@playwright/test'

for (const moved of [false, true])
  for (const placement of ['near', 'over'] as const) {
    test(`unrelated figure placement preserves edge moved=${moved} placement=${placement}`, async ({
      page,
    }) => {
      await page.goto('/visual.html')
      await page.waitForFunction(() => Boolean(window.FRADE_VISUAL_TEST))
      await page.evaluate((moved) => {
        const api = window.FRADE_VISUAL_TEST!
        api.loadFixture({
          nodes: [
            { id: 'a', x: 80, y: 80, width: 120, height: 80 },
            { id: 'b', x: 500, y: 280, width: 120, height: 80 },
          ],
          edges: [{ id: 'e', source: 'a', target: 'b' }],
        })
        if (moved) api.moveNode('a', 100, 80)
      }, moved)
      const stable = () => page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
      const snapshot = () =>
        page.evaluate(() => ({
          segments: window.FRADE_VISUAL_TEST!.getSegments('e'),
          render: window.FRADE_VISUAL_TEST!.getRenderSnapshot('e'),
        }))
      await stable()
      const before = await snapshot()
      const segment = before.segments.find((s) => s.length > 50)!
      const x = (segment.start.x + segment.end.x) / 2 - 60
      const y = (segment.start.y + segment.end.y) / 2 - (placement === 'over' ? 35 : 100)
      await page.evaluate(({ x, y }) => window.FRADE_VISUAL_TEST!.addRectangle('c', x, y), { x, y })
      await stable()
      expect(await snapshot()).toEqual(before)
      // Placement includes dragging and resizing a new, unrelated figure.
      await page.mouse.move(x + 60, y + 35)
      await page.mouse.down()
      await page.mouse.move(x + 90, y + 65, { steps: 3 })
      await stable()
      expect(await snapshot()).toEqual(before)
      await page.mouse.up()
      await page.evaluate(() => window.FRADE_VISUAL_TEST!.resizeNode('c', 180, 100))
      await stable()
      expect(await snapshot()).toEqual(before)
    })
  }
