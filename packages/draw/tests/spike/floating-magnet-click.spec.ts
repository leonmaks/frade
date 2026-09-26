import { expect, test } from '@playwright/test'

for (const state of ['initial', 'moved', 'edited'])
  for (const clicked of ['a', 'b'] as const) {
    test(`magnet click preserves existing edge state=${state} clicked=${clicked}`, async ({
      page,
    }) => {
      const moved = state === 'moved'
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
      if (state === 'edited') {
        await page.evaluate(() => window.FRADE_VISUAL_TEST!.selectEdge('e'))
        await stable()
        const handles = await page.locator('.x6-edge-tool-segment').all()
        let dragged = false
        for (const handle of handles) {
          const box = await handle.boundingBox()
          if (!box || (await handle.getAttribute('cursor')) !== 'col-resize') continue
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
          await page.mouse.down()
          await page.mouse.move(550, box.y + box.height / 2)
          await page.mouse.up()
          dragged = true
          break
        }
        expect(dragged).toBe(true)
        await stable()
      }
      const before = await snapshot()
      // Body away from the label is the connection magnet (crosshair cursor).
      const x = clicked === 'a' ? (moved ? 115 : 95) : 515
      const y = clicked === 'a' ? 95 : 295
      await page.mouse.move(x, y)
      await page.mouse.down()
      await stable()
      expect(await snapshot()).toEqual(before)
      await page.mouse.up()
      await stable()
      expect(await snapshot()).toEqual(before)
      expect(await page.evaluate(() => window.FRADE_VISUAL_TEST!.getGraphSnapshot())).toEqual({
        nodes: 2,
        edges: 1,
      })
      expect(await page.evaluate(() => window.FRADE_VISUAL_TEST!.validateRoute('e').valid)).toBe(
        true,
      )
    })
  }
