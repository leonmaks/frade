import { expect, test } from '@playwright/test'

test('X6 3.1.8 exposes floating boundary edge and native segments in SVG', async ({ page }) => {
  await page.goto('/spike.html')
  await expect.poll(() => page.evaluate(() => window.FRADeSpike)).not.toBeUndefined()
  const spike = await page.evaluate(() => window.FRADeSpike!)
  expect(spike.source).toMatchObject({ cell: 'a' })
  expect(spike.target).toMatchObject({ cell: 'b' })
  expect(spike.svgPath).toBeTruthy()
  expect(spike.handles).toBeGreaterThan(0)
})
