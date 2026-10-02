import { expect, test, type Page } from '@playwright/test'
import { validateManhattanRoute } from '../../src/geometry/validateManhattanRoute'
import type { Point, Rect } from '../../src/routing/floatingAttachment'
import { symmetries, type Symmetry, transformRect } from './support/symmetry'

test.use({ viewport: { width: 900, height: 900 } })
test.describe.configure({ mode: 'parallel' })
const A = { x: 80, y: 80, width: 120, height: 80 }
const B = { x: 500, y: 280, width: 120, height: 80 }
const inset = (r: Rect) => ({
  x: r.x + 0.01,
  y: r.y + 0.01,
  width: r.width - 0.02,
  height: r.height - 0.02,
})

class Interaction {
  private style?: unknown
  constructor(
    readonly page: Page,
    readonly symmetry: Symmetry,
    readonly reverse: boolean,
    readonly aligned = false,
  ) {}
  get b() {
    return this.aligned ? { ...B, y: 80 } : B
  }
  async stable() {
    await this.page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
  }
  async load() {
    await this.page.goto('/visual.html')
    await this.page.waitForFunction(() => Boolean(window.FRADE_VISUAL_TEST))
    await this.page.evaluate(
      (fixture) => {
        window.FRADE_VISUAL_TEST!.loadFixture(fixture)
        window.FRADE_VISUAL_TEST!.selectEdge('e')
      },
      {
        nodes: [
          { id: 'a', ...transformRect(A, this.symmetry.point) },
          { id: 'b', ...transformRect(this.b, this.symmetry.point) },
        ],
        edges: [{ id: 'e', source: this.reverse ? 'b' : 'a', target: this.reverse ? 'a' : 'b' }],
      },
    )
    await this.stable()
    this.style = await this.lineStyle()
  }
  async lineStyle() {
    return this.page.locator('.x6-edge[data-cell-id="e"]').evaluate((element) => {
      const path = [...element.querySelectorAll('path')].find(
        (p) =>
          p.getAttribute('stroke') !== 'transparent' &&
          p.getAttribute('stroke') !== 'none' &&
          p.getAttribute('stroke'),
      )
      if (!path) throw new Error('Missing semantic SVG edge path')
      return ['stroke', 'stroke-width', 'stroke-dasharray', 'marker-start', 'marker-end'].map(
        (name) => path.getAttribute(name),
      )
    })
  }
  async route() {
    const segments = await this.page.evaluate(() => window.FRADE_VISUAL_TEST!.getSegments('e'))
    let points = [segments[0].start, ...segments.map((s) => s.end)].map(this.symmetry.inverse)
    if (this.reverse) points = points.reverse()
    // Do not normalize away reversals or overlaps before validating.
    return points.filter(
      (p, i) => !i || Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) > 1e-6,
    )
  }
  async check(axis: 'x' | 'y', coordinate: number) {
    const points = await this.route()
    expect(
      validateManhattanRoute(points, 1e-6, [inset(A), inset(this.b)]),
      JSON.stringify(points),
    ).toEqual({ valid: true, issues: [] })
    const normal = (p: Point, outside: Point, r: Rect) => {
      const dx = outside.x - p.x,
        dy = outside.y - p.y,
        e = 1.1
      return (
        (Math.abs(p.x - r.x) < e && dx < 0 && Math.abs(dy) < 0.01) ||
        (Math.abs(p.x - r.x - r.width) < e && dx > 0 && Math.abs(dy) < 0.01) ||
        (Math.abs(p.y - r.y) < e && dy < 0 && Math.abs(dx) < 0.01) ||
        (Math.abs(p.y - r.y - r.height) < e && dy > 0 && Math.abs(dx) < 0.01)
      )
    }
    expect(normal(points[0], points[1], A), 'source outward direction').toBe(true)
    expect(normal(points.at(-1)!, points.at(-2)!, this.b), 'target inward direction').toBe(true)
    expect(
      points
        .slice(1)
        .some(
          (p, i) =>
            Math.abs(p[axis] - coordinate) < 0.01 && Math.abs(points[i][axis] - coordinate) < 0.01,
        ),
      'real corridor follows pointer',
    ).toBe(true)
    expect(
      await this.page.evaluate(() => window.FRADE_VISUAL_TEST!.getRenderSnapshot('e').svg),
    ).toBe(true)
    expect(await this.lineStyle()).toEqual(this.style)
    return points
  }
  async grab(axis: 'x' | 'y', near: Point) {
    const candidates: Point[] = []
    for (const h of await this.page.locator('.x6-edge-tool-segment').all()) {
      const box = await h.boundingBox()
      if (!box) continue
      const p = this.symmetry.inverse({ x: box.x + box.width / 2, y: box.y + box.height / 2 })
      const origin = this.symmetry.point({ x: 0, y: 0 }),
        direction = this.symmetry.point(axis === 'x' ? { x: 1, y: 0 } : { x: 0, y: 1 }),
        cursor =
          Math.abs(direction.x - origin.x) > Math.abs(direction.y - origin.y)
            ? 'col-resize'
            : 'row-resize'
      if ((await h.getAttribute('cursor')) === cursor) candidates.push(p)
    }
    candidates.sort(
      (a, b) => Math.hypot(a.x - near.x, a.y - near.y) - Math.hypot(b.x - near.x, b.y - near.y),
    )
    expect(candidates.length, 'eligible handle').toBeGreaterThan(0)
    const p = this.symmetry.point(candidates[0])
    await this.page.mouse.move(p.x, p.y)
    await this.page.mouse.down()
    return candidates[0]
  }
  async move(pointer: Point, axis: 'x' | 'y', value: number) {
    const p = this.symmetry.point({ ...pointer, [axis]: value })
    await this.page.mouse.move(p.x, p.y)
    await this.stable()
    return this.check(axis, value)
  }
  async drop() {
    const before = await this.route()
    await this.page.mouse.up()
    await this.stable()
    expect(await this.route()).toEqual(before)
  }
  async central(x: number) {
    const p = await this.grab('x', { x: 350, y: 220 })
    await this.move(p, 'x', x)
    await this.drop()
  }
}

for (const symmetry of symmetries)
  for (const reverse of [false, true]) {
    const id = `${symmetry.id}-${reverse ? 'B-A' : 'A-B'}`
    for (const direction of [-1, 1])
      test(`MATRIX-${id}-central-${direction}`, async ({ page }) => {
        const ui = new Interaction(page, symmetry, reverse)
        await ui.load()
        const p = await ui.grab('x', { x: 350, y: 220 })
        const positions =
          direction < 0
            ? [300, 210, 200, 190, 140, 90, 80, 70, 40, 140, 300]
            : [400, 490, 500, 510, 560, 610, 620, 630, 680, 560, 300]
        for (const x of positions) {
          const points = await ui.move(p, 'x', x)
          if (x > 80 && x < 200) {
            expect(points[0].x).toBeCloseTo(x)
            expect(points[0].y).toBeCloseTo(160)
          }
          if (x > 500 && x < 620) {
            expect(points.at(-1)!.x).toBeCloseTo(x)
            expect(points.at(-1)!.y).toBeCloseTo(280)
          }
          if (x > 620) expect(points.at(-1)!.x).toBeCloseTo(620)
          if (x < 80) expect(points[0].x).toBeCloseTo(80)
        }
        await ui.drop()
      })
    for (const node of ['a', 'b'] as const)
      for (const direction of [-1, 1])
        test(`MATRIX-${id}-terminal-${node}-${direction}`, async ({ page }) => {
          const ui = new Interaction(page, symmetry, reverse)
          await ui.load()
          await ui.central(300)
          const r = node === 'a' ? A : B
          const p = await ui.grab('y', { x: node === 'a' ? 250 : 400, y: r.y + 40 })
          const boundary = r.y + (direction > 0 ? 80 : 0)
          for (const y of [
            r.y + 30,
            boundary + direction * 10,
            boundary + direction * 40,
            boundary + direction * 10,
            r.y + 40,
          ]) {
            const route = await ui.move(p, 'y', y)
            const endpoint = node === 'a' ? route[0] : route.at(-1)!
            expect(endpoint.y).toBeCloseTo(Math.max(r.y, Math.min(r.y + r.height, y)))
          }
          await ui.drop()
        })
    for (const reselect of [false, true])
      test(`MATRIX-${id}-cross-reselect-${reselect}`, async ({ page }) => {
        const ui = new Interaction(page, symmetry, reverse)
        await ui.load()
        await ui.central(680)
        let p = await ui.grab('y', { x: 400, y: 120 })
        await ui.move(p, 'y', 280)
        if (reselect) {
          await ui.drop()
          await page.mouse.click(850, 850)
          await page.evaluate(() => window.FRADE_VISUAL_TEST!.selectEdge('e'))
          await ui.stable()
          p = await ui.grab('y', { x: 320, y: 280 })
        }
        for (const y of [290, 310, 320, 350, 360, 370, 400, 350, 290]) {
          const route = await ui.move(p, 'y', y)
          if (y <= 360) {
            expect(route.at(-1)!.x, JSON.stringify({ y, route })).toBeCloseTo(500)
            expect(route.at(-1)!.y).toBeCloseTo(y)
          } else expect(route.at(-1)!.y).toBeCloseTo(360)
        }
        await ui.drop()
      })
    for (const direction of [-1, 1])
      test(`MATRIX-${id}-aligned-${direction}`, async ({ page }) => {
        const ui = new Interaction(page, symmetry, reverse, true)
        await ui.load()
        const p = await ui.grab('y', { x: 350, y: 120 })
        for (const y of [
          120 + direction * 20,
          120 + direction * 70,
          120 + direction * 100,
          120 + direction * 20,
          120,
        ]) {
          const route = await ui.move(p, 'y', y)
          if (y > 80 && y < 160) expect(route.length).toBe(2)
        }
        await ui.drop()
      })
  }
