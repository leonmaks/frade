import { expect, test } from '@playwright/test'
test('unrelated shapes never change routing; circular handles track every pointer sample and undo atomically', async ({
  page,
}, info) => {
  await page.goto('/visual.html')
  await page.waitForFunction(() => Boolean(window.FRADE_VISUAL_TEST))
  const id = await page.evaluate(() => {
    const api = window.FRADE_VISUAL_TEST!
    api.addRectangle('a', 80, 100)
    api.addRectangle('b', 500, 100)
    return api.connect('a', 'b')
  })
  const path = () => page.evaluate((id) => window.FRADE_VISUAL_TEST!.getRenderSnapshot(id).path, id)
  const initial = await path()
  await page.evaluate(() => {
    const api = window.FRADE_VISUAL_TEST!
    api.addRectangle('unrelated', 290, 100)
    api.resizeNode('unrelated', 180, 320)
    api.moveNode('unrelated', 250, 80)
  })
  expect(await path()).toBe(initial)
  await page.evaluate((id) => window.FRADE_VISUAL_TEST!.selectEdge(id), id)
  const handle = page.locator('.x6-edge-tool-segment').filter({ visible: true }).first()
  await expect(handle).toHaveAttribute('cursor', 'row-resize')
  await expect(handle.locator('circle[r="5"]')).toHaveAttribute('fill', '#29b6f2')
  await expect(page.locator('.frade-edge-selection')).toHaveAttribute('stroke', '#00a8ff')
  for (const terminal of ['source', 'target']) {
    const tool = page.locator('.x6-edge-tool-' + terminal + '-arrowhead')
    await expect(tool).toHaveAttribute('fill', '#29b6f2')
    await expect(tool).toHaveAttribute('fill-rule', 'nonzero')
    await expect(tool).toHaveAttribute('d', / A /)
  }
  const box = await handle.boundingBox(),
    original = await page.evaluate((id) => window.FRADE_VISUAL_TEST!.getSegments(id)[0].start.y, id)
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  for (const coordinate of [
    original + 1,
    original + 2,
    original + 10,
    170,
    200,
    230,
    280,
    350,
    200,
  ]) {
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 + coordinate - original)
    const segments = await page.evaluate((id) => window.FRADE_VISUAL_TEST!.getSegments(id), id)
    expect(
      segments.some(
        (s) => Math.abs(s.start.y - coordinate) < 0.01 && Math.abs(s.end.y - coordinate) < 0.01,
      ),
    ).toBe(true)
  }
  await page.mouse.up()
  const moved = await path()
  expect(moved).not.toBe(initial)
  await page.keyboard.press('Control+z')
  await expect.poll(path).toBe(initial)
  await page.keyboard.press('Control+y')
  await expect.poll(path).toBe(moved)
  await page.evaluate(() => window.FRADE_VISUAL_TEST!.moveNode('unrelated', 200, 150))
  expect(await path()).toBe(moved)
  await page.screenshot({ path: info.outputPath('drawio-handles.png') })
})
