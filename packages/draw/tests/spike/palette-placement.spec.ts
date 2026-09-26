import { expect, test } from '@playwright/test'

for (const shape of ['rect', 'rounded-rect', 'ellipse', 'diamond', 'text']) {
  test(`${shape} button preserves existing nodes and mouse-created connection`, async ({
    page,
  }) => {
    await page.goto('/editor-visual.html')
    await page.waitForFunction(() => Boolean(window.FRADE_VISUAL_TEST))
    const rect = page.getByRole('button', { name: 'rect', exact: true })
    await rect.click()
    await rect.click()
    const nodes = page.locator('.x6-node')
    await expect(nodes).toHaveCount(2)
    const b = await nodes.nth(1).boundingBox()
    await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2)
    await page.mouse.down()
    await page.mouse.move(b!.x + b!.width / 2 + 400, b!.y + b!.height / 2 + 120, { steps: 8 })
    await page.mouse.up()
    await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
    const aBox = await nodes.nth(0).boundingBox(),
      bBox = await nodes.nth(1).boundingBox()
    await page.mouse.move(aBox!.x + aBox!.width - 10, aBox!.y + aBox!.height / 2)
    await page.mouse.down()
    await page.mouse.move(bBox!.x + bBox!.width / 2, bBox!.y + bBox!.height / 2, { steps: 10 })
    await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
    await page.mouse.up()
    await page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
    const edge = page.locator('.x6-edge')
    await expect(edge).toHaveCount(1)
    const id = (await edge.getAttribute('data-cell-id'))!
    const stable = () => page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
    const snapshot = () =>
      page.evaluate(
        (id) => ({
          segments: window.FRADE_VISUAL_TEST!.getSegments(id),
          render: window.FRADE_VISUAL_TEST!.getRenderSnapshot(id),
        }),
        id,
      )
    await stable()
    const before = await snapshot()
    const originalNodes = [await nodes.nth(0).boundingBox(), await nodes.nth(1).boundingBox()]
    await page.getByRole('button', { name: shape, exact: true }).click()
    await stable()
    expect(await snapshot()).toEqual(before)
    await expect(nodes).toHaveCount(3)
    expect([await nodes.nth(0).boundingBox(), await nodes.nth(1).boundingBox()]).toEqual(
      originalNodes,
    )
  })
}
