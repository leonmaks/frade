import { expect, test } from '@playwright/test'
import { validateManhattanRoute } from '../../src/geometry/validateManhattanRoute'

test.use({ viewport: { width: 900, height: 900 } })
test.describe.configure({ mode: 'parallel' })
for (const moving of ['a', 'b'] as const)
  for (const direction of [-1, 1])
    for (const reverse of [false, true])
      for (const edited of [false, true]) {
        test(`ORBIT-${moving}-${direction}-${reverse ? 'B-A' : 'A-B'}-edited=${edited}`, async ({
          page,
        }) => {
          const nodes = {
            a: { id: 'a', x: 380, y: 380, width: 120, height: 80 },
            b: { id: 'b', x: 640, y: 380, width: 120, height: 80 },
          }
          const fixed = moving === 'a' ? 'b' : 'a'
          nodes[fixed].x = 380
          nodes[moving].x = 640
          await page.goto('/visual.html')
          await page.evaluate(
            ({ nodes, reverse }) => {
              const api = window.FRADE_VISUAL_TEST!
              api.loadFixture({
                nodes: Object.values(nodes),
                edges: [{ id: 'e', source: reverse ? 'b' : 'a', target: reverse ? 'a' : 'b' }],
              })
              api.selectEdge('e')
            },
            { nodes, reverse },
          )
          const stable = () => page.evaluate(() => window.FRADE_VISUAL_TEST!.waitForStable())
          await stable()
          if (edited) {
            const box = await page.locator('.x6-edge-tool-segment').first().boundingBox()
            expect(box).toBeTruthy()
            await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
            await page.mouse.down()
            await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 - 100)
            await page.mouse.up()
            await stable()
          }
          const snapshots = new Map<number, unknown>()
          // Grab the node label (not a connection magnet) and keep the pointer held
          // for the full orbit, exercising the actual X6 node-drag lifecycle.
          await page.mouse.move(nodes[moving].x + 60, nodes[moving].y + 40)
          await page.mouse.down()
          // Complete circle and reverse traversal: same positions must not retain
          // stale anchors/bends from the preceding side or the manual segment edit.
          for (const step of [
            ...Array.from({ length: 24 }, (_, i) => i + 1),
            ...Array.from({ length: 24 }, (_, i) => 23 - i),
          ]) {
            const angle = (direction * step * Math.PI) / 12
            nodes[moving].x = Math.round((380 + 260 * Math.cos(angle)) / 10) * 10
            nodes[moving].y = Math.round((380 + 260 * Math.sin(angle)) / 10) * 10
            // Keep the closing event distinct from mousedown in client coordinates:
            // X6 ignores exact mousedown-coordinate moves; grid position is unchanged.
            await page.mouse.move(nodes[moving].x + 61, nodes[moving].y + 41)
            await stable()
            const segments = await page.evaluate(() => window.FRADE_VISUAL_TEST!.getSegments('e'))
            const points = [segments[0].start, ...segments.map((s) => s.end)].filter(
              (p, i, all) => !i || p.x !== all[i - 1].x || p.y !== all[i - 1].y,
            )
            const obstacles = Object.values(nodes).map((r) => ({
              ...r,
              x: r.x + 0.01,
              y: r.y + 0.01,
              width: r.width - 0.02,
              height: r.height - 0.02,
            }))
            expect(
              validateManhattanRoute(points, 1e-6, obstacles),
              JSON.stringify({ step, points }),
            ).toEqual({ valid: true, issues: [] })
            for (const [id, p, outside] of [
              [reverse ? 'b' : 'a', points[0], points[1]],
              [reverse ? 'a' : 'b', points.at(-1)!, points.at(-2)!],
            ] as const) {
              const r = nodes[id],
                dx = outside.x - p.x,
                dy = outside.y - p.y,
                e = 0.01
              expect(
                p.x >= r.x - e &&
                  p.x <= r.x + r.width + e &&
                  p.y >= r.y - e &&
                  p.y <= r.y + r.height + e,
                JSON.stringify({ step, id, p, r }),
              ).toBe(true)
              expect(
                (Math.abs(p.x - r.x) < e && dx < 0 && dy === 0) ||
                  (Math.abs(p.x - r.x - r.width) < e && dx > 0 && dy === 0) ||
                  (Math.abs(p.y - r.y) < e && dy < 0 && dx === 0) ||
                  (Math.abs(p.y - r.y - r.height) < e && dy > 0 && dx === 0),
                `outward terminal at step ${step}`,
              ).toBe(true)
            }
            const render = await page.evaluate(() =>
              window.FRADE_VISUAL_TEST!.getRenderSnapshot('e'),
            )
            expect(render.svg).toBe(true)
            if (points.length > 2) expect(render.path).toMatch(/[QC]/i)
            if (step % 6 === 0) expect(points).toHaveLength(2)
            if (snapshots.has(step)) expect(points).toEqual(snapshots.get(step))
            snapshots.set(step, points)
          }
          const beforeDrop = await page.evaluate(() => window.FRADE_VISUAL_TEST!.getSegments('e'))
          await page.mouse.up()
          await stable()
          expect(await page.evaluate(() => window.FRADE_VISUAL_TEST!.getSegments('e'))).toEqual(
            beforeDrop,
          )
        })
      }
