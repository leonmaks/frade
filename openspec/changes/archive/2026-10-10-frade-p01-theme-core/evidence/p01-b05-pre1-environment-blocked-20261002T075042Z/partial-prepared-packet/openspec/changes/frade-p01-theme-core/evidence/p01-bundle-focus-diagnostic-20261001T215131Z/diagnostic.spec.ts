import { test, expect, _electron as electron } from '@playwright/test'
import { join, resolve } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { createFlowFixture } from "../../../../../scripts/flow-fixtures.mjs"
for (const format of ['frade', 'drawio'] as const) {
  // eslint-disable-next-line no-empty-pattern
  test('bundle flow management full lifecycle: ' + format, async ({}, info) => {
    test.setTimeout(240000)
    const f = await createFlowFixture(),
      app = await electron.launch({
        args: [resolve('out/main/index.cjs')],
        env: { ...process.env, FRADE_USER_DATA: join(f.destination, 'profile') },
      })
    const errors: string[] = []
    try {
      const page = await app.firstWindow()
      page.on('pageerror', (e) => errors.push(e.message))
      await page.setViewportSize({ width: 1600, height: 1000 })
      await expect(page.getByRole('status')).toHaveText('Backend: ready')
      await app.evaluate(
        ({ dialog }, paths) => {
          let i = 0
          dialog.showOpenDialog = (async () => ({
            canceled: false,
            filePaths: [paths[i++]],
          })) as typeof dialog.showOpenDialog
        },
        [f.dataRoot, f.metadataRoot],
      )
      await page.getByRole('button', { name: 'Открыть KA', exact: true }).click()
      await expect(page.locator('.status-message')).toContainText('9 объектов', { timeout: 30000 })
      await page
        .getByRole('treeitem')
        .filter({ hasText: /^_diagrams$/ })
        .click()
      await page
        .getByRole('treeitem')
        .filter({ hasText: new RegExp('^Flows[.]' + format + '$') })
        .dblclick()
      const canvas = () =>
        format === 'frade'
          ? page.locator('.diagram-slot .x6-graph')
          : page.locator('.diagram-slot iframe').contentFrame().locator('.geDiagramContainer')
      const label = (id: string) => canvas().getByText(id, { exact: true })
      await expect(label('A')).toBeVisible({ timeout: 20000 })
      if (format === 'drawio')
        await test.step('pointer gestures end across iframe in both directions', async () => {
          const separator = page.getByRole('separator', { name: 'Ширина проводника' }),
            frame = page.locator('.diagram-slot iframe'),
            native = frame.contentFrame().locator('.geHsplit').first()
          const nav = await separator.boundingBox(),
            box = await frame.boundingBox()
          if (!nav || !box) throw Error('Boundary missing')
          await page.mouse.move(nav.x + nav.width / 2, nav.y + 120)
          await page.mouse.down()
          await page.mouse.move(box.x + 350, box.y + 280, { steps: 12 })
          await page.mouse.up()
          const released = await separator.boundingBox()
          await page.mouse.move(80, 350, { steps: 8 })
          expect((await separator.boundingBox())?.x).toBe(released?.x)
          const now = await separator.boundingBox()
          if (!now) throw Error('Separator missing')
          await page.mouse.move(now.x + now.width / 2, now.y + 120)
          await page.mouse.down()
          await page.mouse.move(nav.x + nav.width / 2, nav.y + 120, { steps: 12 })
          await page.mouse.up()
          const split = await native.boundingBox()
          if (!split) throw Error('Native split missing')
          await page.mouse.move(split.x + split.width / 2, split.y + 120)
          await page.mouse.down()
          await page.mouse.move(100, 350, { steps: 15 })
          await page.mouse.up()
          await page.waitForTimeout(100)
          const nativeReleased = await native.boundingBox()
          await page.mouse.move(800, 450, { steps: 15 })
          await page.waitForTimeout(100)
          expect((await native.boundingBox())?.x).toBe(nativeReleased?.x)
          const reset = await native.boundingBox()
          if (!reset) throw Error('Native split missing')
          await page.mouse.move(reset.x + reset.width / 2, reset.y + 120)
          await page.mouse.down()
          await page.mouse.move(split.x + split.width / 2, split.y + 120, { steps: 12 })
          await page.mouse.up()
        })
      const a = await label('A').boundingBox(),
        b = await label('B').boundingBox()
      if (!a || !b) throw Error('Nodes missing')
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
      await page.mouse.move(
        a.x + a.width / 2 + (format === 'frade' ? 82 : 90),
        a.y + a.height / 2,
        { steps: 5 },
      )
      await page.mouse.down()
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 })
      await page.mouse.up()
      await expect(page.getByText(/Найдено 3 потоков между A и B/)).toBeVisible({ timeout: 20000 })
      await page.getByRole('button', { name: 'Выбрать потоки', exact: true }).click()
      const manager = page.getByRole('complementary', { name: 'Интеграционные потоки' })
      await expect(manager.getByRole('checkbox', { name: 'В жгуте: Payload F1' })).toBeVisible()
      await expect(manager.getByRole('checkbox', { name: 'В жгуте: Payload F2' })).toBeVisible()
      await expect(manager.getByRole('checkbox', { name: 'В жгуте: Payload F4' })).toHaveCount(0)
      const openActual = async () => {
        await page.waitForTimeout(250)
        const path = canvas().locator('path[stroke="#404040" i]').first()
        const point = await path.evaluate((node) => {
          const path = node as SVGPathElement,
            p = path.getPointAtLength(path.getTotalLength() / 2),
            q = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!)
          return { x: q.x, y: q.y }
        })
        const box =
          format === 'drawio' ? await page.locator('.diagram-slot iframe').boundingBox() : undefined
        await page.mouse.dblclick(point.x + (box?.x ?? 0), point.y + (box?.y ?? 0))
        await expect(manager).toBeVisible()
      }
      const save = () =>
        page
          .locator('.diagram-slot .editor-actions')
          .getByRole('button', { name: 'Сохранить', exact: true })
      if (format === 'frade')
        await test.step('Workbench uses circular handles and crosses systems outside this bundle', async () => {
          await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
          await page.waitForTimeout(250)
          const handle = canvas()
              .locator('.x6-edge-tool-segment')
              .filter({ visible: true })
              .first(),
            line = canvas().locator('path[stroke="#404040" i]').first()
          const selectionPoint = await line.evaluate((node) => {
            const path = node as SVGPathElement,
              p = path.getPointAtLength(path.getTotalLength() / 2)
            const point = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!)
            return { x: point.x, y: point.y }
          })
          await page.mouse.click(selectionPoint.x, selectionPoint.y)
          await expect(handle.locator('circle[r="5"]')).toHaveAttribute('fill', '#29b6f2')
          await expect(handle).toHaveAttribute('cursor', 'row-resize')
          await expect(canvas().locator('.x6-edge-tool-source-arrowhead')).toHaveAttribute(
            'fill-rule',
            'nonzero',
          )
          const midpointY = () =>
            line.evaluate((node) => {
              const path = node as SVGPathElement
              return path.getPointAtLength(path.getTotalLength() / 2).y
            })
          const original = await line.getAttribute('d'),
            initialY = await midpointY(),
            box = await handle.boundingBox()
          const pointerX = Math.round(box!.x + box!.width / 2),
            pointerY = Math.round(box!.y + box!.height / 2)
          await page.mouse.move(pointerX, pointerY)
          await page.mouse.down()
          for (const offset of [1, 2, 50, 230]) {
            await page.mouse.move(pointerX, pointerY + offset)
            expect(Math.abs((await midpointY()) - initialY - offset)).toBeLessThan(0.05)
          }
          await page.mouse.up()
          await page.keyboard.press('Control+z')
          await expect(line).toHaveAttribute('d', original!)
          await page.keyboard.press('Control+y')
          expect(Math.abs((await midpointY()) - initialY - 230)).toBeLessThan(0.05)
          await page.screenshot({ path: info.outputPath('frade-bundle-routing.png') })
          await page.keyboard.press('Control+z')
          await expect(line).toHaveAttribute('d', original!)
          await openActual()
        })
      await test.step('E2E-01 discover include persist', async () => {
        await manager.getByRole('checkbox', { name: 'В жгуте: Payload F1' }).focus()
        await page.keyboard.press('Space')
        await expect(manager.getByRole('checkbox', { name: 'В жгуте: Payload F1' })).toBeFocused()
        await expect(manager.getByRole('checkbox', { name: 'В жгуте: Payload F1' })).toBeChecked()
        await manager.getByRole('checkbox', { name: 'В жгуте: Payload F2' }).check()
        await expect(canvas().getByText('• Payload F1', { exact: true })).toBeVisible()
        await expect(canvas().getByText('• Payload F2', { exact: true })).toBeVisible()
        await save().click()
        await expect(page.locator('.dirty-dot')).toHaveCount(0)
        const content = await readFile(join(f.dataRoot, '_diagrams/Flows.' + format), 'utf8')
        expect(content).toContain('F1')
        expect(content).toContain('F2')
        expect(content).not.toContain('Payload F1')
      })
      await test.step('E2E-02 exclusion undo redo', async () => {
        await manager.getByRole('checkbox', { name: 'В жгуте: Payload F1' }).uncheck()
        await expect(
          manager.getByRole('checkbox', { name: 'В жгуте: Payload F1' }),
        ).not.toBeChecked()
        await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
        if (format === 'drawio') {
          const hit = await canvas().evaluate((node) => {
            const box = node.getBoundingClientRect(), style = getComputedStyle(node)
            const points = [{x:20,y:20},{x:20,y:80},{x:80,y:200}].map(p => {
              const target = document.elementFromPoint(box.left+p.x,box.top+p.y)
              return {position:p,inside:!!target&&node.contains(target),target:target?.outerHTML.slice(0,1200),toolbar:!!target?.closest('.geToolbarContainer'),menu:!!target?.closest('.mxPopupMenu'),box:{left:box.left,top:box.top,right:box.right,bottom:box.bottom}}
            })
            return {points,canvasStyle:{top:style.top,bottom:style.bottom,height:style.height},fonts:document.fonts.status,frameRevision:document.documentElement.getAttribute('data-frade-frame-revision')}
          })
          await writeFile(info.outputPath('canvas-focus-hit.json'),JSON.stringify(hit,null,2))
          await page.screenshot({path:info.outputPath('before-original-canvas-focus.png')})
        }
        await canvas().click({ position: { x: 20, y: 20 } })
        await page.keyboard.press('Control+z')
        await openActual()
        await expect(manager.getByRole('checkbox', { name: 'В жгуте: Payload F1' })).toBeChecked()
        await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
        if (format === 'drawio') {
          const hit = await canvas().evaluate((node) => {
            const box = node.getBoundingClientRect(), style = getComputedStyle(node)
            const points = [{x:20,y:20},{x:20,y:80},{x:80,y:200}].map(p => {
              const target = document.elementFromPoint(box.left+p.x,box.top+p.y)
              return {position:p,inside:!!target&&node.contains(target),target:target?.outerHTML.slice(0,1200),toolbar:!!target?.closest('.geToolbarContainer'),menu:!!target?.closest('.mxPopupMenu'),box:{left:box.left,top:box.top,right:box.right,bottom:box.bottom}}
            })
            return {points,canvasStyle:{top:style.top,bottom:style.bottom,height:style.height},fonts:document.fonts.status,frameRevision:document.documentElement.getAttribute('data-frade-frame-revision')}
          })
          await writeFile(info.outputPath('canvas-focus-hit.json'),JSON.stringify(hit,null,2))
          await page.screenshot({path:info.outputPath('before-original-canvas-focus.png')})
        }
        await canvas().click({ position: { x: 20, y: 20 } })
        await page.keyboard.press('Control+y')
        await openActual()
        await expect(
          manager.getByRole('checkbox', { name: 'В жгуте: Payload F1' }),
        ).not.toBeChecked()
      })
      await test.step('E2E-03 create via repository and include', async () => {
        await manager.getByRole('button', { name: '+ Новый поток' }).click()
        await manager.getByLabel('ID потока', { exact: true }).fill('F6')
        await manager.getByLabel('description', { exact: true }).fill('New payload F6')
        await manager.getByRole('button', { name: 'Сохранить поток', exact: true }).click()
        await expect(
          manager.getByRole('checkbox', { name: 'В жгуте: New payload F6' }),
        ).toBeChecked({ timeout: 20000 })
        expect((await f.readFlows()).F6.producer).toBe('A')
      })
      const row = (name: string) =>
        manager.getByRole('row', { name: 'Поток: ' + name, exact: true })
      const action = async (name: string, action: string) => {
        await row(name)
          .getByLabel('Действия: ' + name)
          .click()
        await row(name).getByRole('button', { name: action, exact: true }).click()
      }
      await test.step('E2E-04 edit canonical flow', async () => {
        await action('New payload F6', 'Редактировать')
        await manager.getByLabel('description', { exact: true }).fill('Updated payload F6')
        await manager.getByRole('button', { name: 'Сохранить поток', exact: true }).click()
        await expect(
          manager.getByRole('checkbox', { name: 'В жгуте: Updated payload F6' }),
        ).toBeChecked({ timeout: 20000 })
        expect((await f.readFlows()).F6.description).toBe('Updated payload F6')
      })
      await test.step('E2E-05 reverse draft preserves identity', async () => {
        await action('Updated payload F6', 'Поменять направление')
        expect((await f.readFlows()).F6.producer).toBe('A')
        await manager.getByRole('button', { name: 'Сохранить поток', exact: true }).click()
        await expect(row('Updated payload F6')).toContainText('B → A', { timeout: 20000 })
        expect((await f.readFlows()).F6.producer).toBe('B')
      })
      await test.step('E2E-06 extended search cannot include unrelated; clone for bundle', async () => {
        await manager.getByRole('checkbox', { name: 'Искать во всем репозитории' }).check()
        await expect(manager.getByRole('checkbox', { name: 'В жгуте: Payload F5' })).toBeDisabled()
        await action('Payload F5', 'Клонировать для A ↔ B')
        await manager.getByLabel('ID потока', { exact: true }).fill('F7')
        await manager.getByRole('button', { name: 'Сохранить поток', exact: true }).click()
        await expect(manager.getByRole('checkbox', { name: 'В жгуте: Payload F5' })).toHaveCount(
          2,
          { timeout: 20000 },
        )
        const flows = await f.readFlows()
        expect(flows.F7).toMatchObject({
          producer: 'A',
          receiver: 'B',
          data: ['Invoice', 'Order'],
          technology: ['HTTP', 'JSON'],
        })
        expect(flows.F7).not.toHaveProperty('audit')
        expect(flows.F7).not.toHaveProperty('generated')
        await manager.getByRole('checkbox', { name: 'Искать во всем репозитории' }).uncheck()
      })
      await test.step('Filtered bulk include is one native history operation', async () => {
        await manager.getByText('Фильтры', { exact: true }).click()
        await manager.getByLabel('Фильтр: Технологии').fill('HTTP')
        // F6 has no technology; only F1/F2/F3 and cloned F7 match HTTP.
        await expect(manager.getByRole('row', { name: /Поток:/ })).toHaveCount(4)
        await expect(
          manager.getByRole('checkbox', { name: 'В жгуте: Updated payload F6' }),
        ).toHaveCount(0)
        await manager
          .getByRole('checkbox', { name: 'Включить все подходящие потоки из текущей выборки' })
          .check()
        await expect(manager.getByRole('checkbox', { name: 'В жгуте: Payload F1' })).toBeChecked()
        await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
        if (format === 'drawio') {
          const hit = await canvas().evaluate((node) => {
            const box = node.getBoundingClientRect(), style = getComputedStyle(node)
            const points = [{x:20,y:20},{x:20,y:80},{x:80,y:200}].map(p => {
              const target = document.elementFromPoint(box.left+p.x,box.top+p.y)
              return {position:p,inside:!!target&&node.contains(target),target:target?.outerHTML.slice(0,1200),toolbar:!!target?.closest('.geToolbarContainer'),menu:!!target?.closest('.mxPopupMenu'),box:{left:box.left,top:box.top,right:box.right,bottom:box.bottom}}
            })
            return {points,canvasStyle:{top:style.top,bottom:style.bottom,height:style.height},fonts:document.fonts.status,frameRevision:document.documentElement.getAttribute('data-frade-frame-revision')}
          })
          await writeFile(info.outputPath('canvas-focus-hit.json'),JSON.stringify(hit,null,2))
          await page.screenshot({path:info.outputPath('before-original-canvas-focus.png')})
        }
        await canvas().click({ position: { x: 20, y: 20 } })
        await page.keyboard.press('Control+z')
        await openActual()
        await expect(
          manager.getByRole('checkbox', { name: 'В жгуте: Payload F1' }),
        ).not.toBeChecked()
        await expect(
          manager.getByRole('checkbox', { name: 'В жгуте: Payload F3' }),
        ).not.toBeChecked()
        await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
        if (format === 'drawio') {
          const hit = await canvas().evaluate((node) => {
            const box = node.getBoundingClientRect(), style = getComputedStyle(node)
            const points = [{x:20,y:20},{x:20,y:80},{x:80,y:200}].map(p => {
              const target = document.elementFromPoint(box.left+p.x,box.top+p.y)
              return {position:p,inside:!!target&&node.contains(target),target:target?.outerHTML.slice(0,1200),toolbar:!!target?.closest('.geToolbarContainer'),menu:!!target?.closest('.mxPopupMenu'),box:{left:box.left,top:box.top,right:box.right,bottom:box.bottom}}
            })
            return {points,canvasStyle:{top:style.top,bottom:style.bottom,height:style.height},fonts:document.fonts.status,frameRevision:document.documentElement.getAttribute('data-frade-frame-revision')}
          })
          await writeFile(info.outputPath('canvas-focus-hit.json'),JSON.stringify(hit,null,2))
          await page.screenshot({path:info.outputPath('before-original-canvas-focus.png')})
        }
        await canvas().click({ position: { x: 20, y: 20 } })
        await page.keyboard.press('Control+y')
        await openActual()
        await expect(manager.getByRole('checkbox', { name: 'В жгуте: Payload F1' })).toBeChecked()
        await expect(manager.getByRole('checkbox', { name: 'В жгуте: Payload F3' })).toBeChecked()
      })
      await test.step('unselected bundle labels follow repository lifecycle and wrap long names', async () => {
        await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
        const flows = await f.readFlows()
        flows.F1.description =
          'Очень длинное название интеграционного потока для передачи сведений между системами архитектурного репозитория'
        flows.F1.status = 'Дорабатывается'
        flows.F2.status = 'Удаляется'
        flows.F3.status = 'Создается'
        flows.F6.status = 'Используется'
        await writeFile(
          join(f.dataRoot, 'flows.yaml'),
          JSON.stringify({ 'custom.flows': flows }, null, 2),
        )
        await expect(
          canvas().getByText('~ Очень длинное название интеграционного', { exact: true }),
        ).toBeVisible({ timeout: 20000 })
        await expect(canvas().getByText('- Payload F2', { exact: true })).toBeVisible()
        await expect(canvas().getByText('+ Payload F3', { exact: true })).toBeVisible()
        await expect(canvas().getByText('• Updated payload F6', { exact: true })).toBeVisible()
        const text = await canvas().textContent()
        expect(text?.replaceAll('\u00a0', ' ')).toContain('    потока для передачи')
        await openActual()
      })
      let movedLabel: { x: number; y: number } | undefined
      const flowLabel = () =>
        canvas().getByText('~ Очень длинное название интеграционного', { exact: true })
      const relativeLabel = async () => {
        const text = await flowLabel().boundingBox(),
          system = await label('A').boundingBox()
        expect(text).toBeTruthy()
        expect(system).toBeTruthy()
        return { x: text!.x - system!.x, y: text!.y - system!.y }
      }
      await test.step('translucent label drags freely with one-step undo/redo and live persistence', async () => {
        await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
        await expect(canvas().locator('rect[fill="#FFFFFFAA" i]').first()).toBeVisible()
        // Native panel restoration recenters the edge over two animation frames.
        await page.waitForTimeout(250)
        const before = await relativeLabel(),
          box = await flowLabel().boundingBox()
        await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
        await page.mouse.down()
        await page.mouse.move(box!.x + box!.width / 2 + 60, box!.y + box!.height / 2 + 180, {
          steps: 12,
        })
        await page.mouse.up()
        await expect.poll(async () => (await relativeLabel()).y - before.y).toBeGreaterThan(75)
        const after = await relativeLabel()
        expect(after.x - before.x).toBeGreaterThan(45)
        await page.keyboard.press('Control+z')
        await expect
          .poll(async () => Math.abs((await relativeLabel()).y - before.y))
          .toBeLessThan(4)
        await page.keyboard.press('Control+y')
        await expect.poll(async () => Math.abs((await relativeLabel()).y - after.y)).toBeLessThan(4)
        const flows = await f.readFlows()
        flows.F2.status = 'Используется'
        await writeFile(
          join(f.dataRoot, 'flows.yaml'),
          JSON.stringify({ 'custom.flows': flows }, null, 2),
        )
        await expect(canvas().getByText('• Payload F2', { exact: true })).toBeVisible({
          timeout: 20000,
        })
        movedLabel = await relativeLabel()
        expect(Math.abs(movedLabel.x - after.x)).toBeLessThan(4)
        expect(Math.abs(movedLabel.y - after.y)).toBeLessThan(4)
        await openActual()
      })
      await save().click()
      await expect(page.locator('.diagram-slot .editor-actions')).toContainText(
        'Все изменения сохранены',
      )
      expect(await readFile(join(f.dataRoot, '_diagrams/Flows.' + format), 'utf8')).not.toContain(
        'Очень длинное название',
      )
      await page.waitForTimeout(250)
      await page.screenshot({ path: info.outputPath('flow-manager-' + format + '.png') })
      await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
      await page.getByRole('button', { name: 'Закрыть Flows.' + format, exact: true }).click()
      await page
        .getByRole('treeitem')
        .filter({ hasText: new RegExp('^Flows[.]' + format + '$') })
        .dblclick()
      await expect(label('A')).toBeVisible({ timeout: 20000 })
      await expect(
        canvas().getByText('~ Очень длинное название интеграционного', { exact: true }),
      ).toBeVisible()
      await expect
        .poll(async () => Math.abs((await relativeLabel()).x - movedLabel!.x))
        .toBeLessThan(4)
      await expect
        .poll(async () => Math.abs((await relativeLabel()).y - movedLabel!.y))
        .toBeLessThan(4)
      // Manager can be opened by double-clicking the actual bundle path.
      const line = canvas().locator('path[stroke="#404040" i]').first()
      await expect(line).toBeAttached()
      const point = await line.evaluate((node) => {
        const path = node as SVGPathElement,
          p = path.getPointAtLength(path.getTotalLength() / 2),
          m = path.getScreenCTM()!
        const q = new DOMPoint(p.x, p.y).matrixTransform(m)
        return { x: q.x, y: q.y }
      })
      const iframeBox =
        format === 'drawio' ? await page.locator('.diagram-slot iframe').boundingBox() : undefined
      await page.mouse.dblclick(point.x + (iframeBox?.x ?? 0), point.y + (iframeBox?.y ?? 0))
      await expect(manager).toBeVisible()
      await expect(
        manager.getByRole('checkbox', { name: 'В жгуте: Updated payload F6' }),
      ).toBeChecked()

      await test.step('E2E-07 broken canonical reference remains removable', async () => {
        await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
        await save().click()
        await page.getByRole('button', { name: 'Закрыть Flows.' + format, exact: true }).click()
        const file = join(f.dataRoot, '_diagrams/Flows.' + format)
        let content = await readFile(file, 'utf8')
        if (format === 'frade') {
          const document = JSON.parse(content)
          const edge = document.graph.edges[0]
          edge.bundle.integrationFlowRefs.push({
            repositoryId: edge.bundle.integrationFlowRefs[0].repositoryId,
            objectId: 'Missing',
          })
          content = JSON.stringify(document)
        } else {
          content = content.replace(/fradeIntegrationFlowRefs="([^"]*)"/, (_all, encoded) => {
            const refs = JSON.parse(encoded.replaceAll('&quot;', '"').replaceAll('&amp;', '&'))
            refs.push({ repositoryId: refs[0].repositoryId, objectId: 'Missing' })
            return (
              'fradeIntegrationFlowRefs="' +
              JSON.stringify(refs).replaceAll('&', '&amp;').replaceAll('"', '&quot;') +
              '"'
            )
          })
        }
        await writeFile(file, content)
        await page
          .getByRole('treeitem')
          .filter({ hasText: new RegExp('^Flows[.]' + format + '$') })
          .dblclick()
        await expect(label('A')).toBeVisible()
        await expect(save()).toBeEnabled()
        if (format === 'drawio') {
          const frame = page.locator('.diagram-slot iframe'),
            curtain = page.locator('.frade-theme-commit-barrier')
          await expect(frame).toBeVisible()
          await expect(frame).toHaveAttribute('data-frade-revision', (await page.locator('html').getAttribute('data-frade-revision')) as string)
          await expect(curtain).toBeHidden()
          await canvas().evaluate(async () => {
            await document.fonts.ready
            await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
          })
          await expect(frame).toHaveAttribute('data-frade-revision', (await page.locator('html').getAttribute('data-frade-revision')) as string)
          await expect(curtain).toBeHidden()
        }
        const path = canvas().locator('path[stroke="#404040" i]').first()
        const position = await path.evaluate((node) => {
          const path = node as SVGPathElement,
            p = path.getPointAtLength(path.getTotalLength() / 2),
            q = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!)
          return { x: q.x, y: q.y }
        })
        const box =
          format === 'drawio' ? await page.locator('.diagram-slot iframe').boundingBox() : undefined
        await page.mouse.dblclick(position.x + (box?.x ?? 0), position.y + (box?.y ?? 0))
        await expect(manager).toBeVisible()
        await expect(manager.getByText('Недоступный поток: Missing', { exact: true })).toBeVisible()
        await manager.getByRole('button', { name: 'Исключить из жгута', exact: true }).click()
        await expect(manager.getByText('Недоступный поток: Missing', { exact: true })).toHaveCount(
          0,
        )
        expect((await f.readFlows()).F6).toBeTruthy()
      })
      await test.step('E2E-08 reconnect cancel confirm one native undo and redo', async () => {
        await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
        const drag = async () => {
          await page.waitForTimeout(250)
          if (format === 'drawio') {
            await label('B').scrollIntoViewIfNeeded()
            await label('C').scrollIntoViewIfNeeded()
            await expect(label('B')).toBeInViewport()
            await expect(label('C')).toBeInViewport()
          }
          const path = canvas().locator('path[stroke="#404040" i]').first()
          const points = await path.evaluate((node) => {
            const path = node as SVGPathElement,
              m = path.getScreenCTM()!,
              a = path.getPointAtLength(path.getTotalLength() / 2),
              b = path.getPointAtLength(path.getTotalLength())
            const p = new DOMPoint(a.x, a.y).matrixTransform(m),
              q = new DOMPoint(b.x, b.y).matrixTransform(m)
            return { a: { x: p.x, y: p.y }, b: { x: q.x, y: q.y } }
          })
          const box =
              format === 'drawio'
                ? await page.locator('.diagram-slot iframe').boundingBox()
                : undefined,
            ox = box?.x ?? 0,
            oy = box?.y ?? 0
          await page.mouse.click(points.a.x + ox, points.a.y + oy)
          await page.waitForTimeout(100)
          const end = await path.evaluate((node) => {
            const path = node as SVGPathElement,
              p = path.getPointAtLength(path.getTotalLength()),
              q = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!)
            return { x: q.x, y: q.y }
          })
          const c = await label('C').boundingBox()
          if (!c) throw Error('C missing')
          await page.mouse.move(end.x + ox, end.y + oy)
          await page.mouse.down()
          await page.mouse.move(
            c.x + c.width / 2 + (format === 'drawio' ? 65 : 0),
            c.y + c.height / 2,
            { steps: 25 },
          )
          await page.mouse.up()
        }
        await drag()
        const warning = page.getByRole('alertdialog', { name: 'Изменение конца жгута' })
        await expect(warning).toBeVisible()
        await warning.getByRole('button', { name: 'Отмена', exact: true }).click()
        await page.getByRole('button', { name: 'Интеграционные потоки…' }).click()
        await expect(
          manager.getByRole('checkbox', { name: 'В жгуте: Updated payload F6' }),
        ).toBeChecked()
        await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
        await drag()
        await expect(warning).toBeVisible()
        await warning.getByRole('button', { name: 'Изменить конец и исключить потоки' }).click()
        await page.getByRole('button', { name: 'Интеграционные потоки…' }).click()
        await expect(manager.getByRole('checkbox', { name: 'В жгуте: Payload F4' })).toBeVisible()
        await expect(
          manager.getByRole('checkbox', { name: 'В жгуте: Updated payload F6' }),
        ).toHaveCount(0)
        await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
        if (format === 'drawio') {
          const hit = await canvas().evaluate((node) => {
            const box = node.getBoundingClientRect(), style = getComputedStyle(node)
            const points = [{x:20,y:20},{x:20,y:80},{x:80,y:200}].map(p => {
              const target = document.elementFromPoint(box.left+p.x,box.top+p.y)
              return {position:p,inside:!!target&&node.contains(target),target:target?.outerHTML.slice(0,1200),toolbar:!!target?.closest('.geToolbarContainer'),menu:!!target?.closest('.mxPopupMenu'),box:{left:box.left,top:box.top,right:box.right,bottom:box.bottom}}
            })
            return {points,canvasStyle:{top:style.top,bottom:style.bottom,height:style.height},fonts:document.fonts.status,frameRevision:document.documentElement.getAttribute('data-frade-frame-revision')}
          })
          await writeFile(info.outputPath('canvas-focus-hit.json'),JSON.stringify(hit,null,2))
          await page.screenshot({path:info.outputPath('before-original-canvas-focus.png')})
        }
        await canvas().click({ position: { x: 20, y: 20 } })
        await page.keyboard.press('Control+z')
        await openActual()
        await expect(
          manager.getByRole('checkbox', { name: 'В жгуте: Updated payload F6' }),
        ).toBeChecked()
        await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
        if (format === 'drawio') {
          const hit = await canvas().evaluate((node) => {
            const box = node.getBoundingClientRect(), style = getComputedStyle(node)
            const points = [{x:20,y:20},{x:20,y:80},{x:80,y:200}].map(p => {
              const target = document.elementFromPoint(box.left+p.x,box.top+p.y)
              return {position:p,inside:!!target&&node.contains(target),target:target?.outerHTML.slice(0,1200),toolbar:!!target?.closest('.geToolbarContainer'),menu:!!target?.closest('.mxPopupMenu'),box:{left:box.left,top:box.top,right:box.right,bottom:box.bottom}}
            })
            return {points,canvasStyle:{top:style.top,bottom:style.bottom,height:style.height},fonts:document.fonts.status,frameRevision:document.documentElement.getAttribute('data-frade-frame-revision')}
          })
          await writeFile(info.outputPath('canvas-focus-hit.json'),JSON.stringify(hit,null,2))
          await page.screenshot({path:info.outputPath('before-original-canvas-focus.png')})
        }
        await canvas().click({ position: { x: 20, y: 20 } })
        await page.keyboard.press('Control+y')
        await openActual()
        await expect(manager.getByRole('checkbox', { name: 'В жгуте: Payload F4' })).toBeVisible()
        expect((await f.readFlows()).F6).toBeTruthy()
      })
      await test.step('Deleting native bundle never deletes repository flows', async () => {
        await manager.getByRole('button', { name: 'Закрыть менеджер потоков' }).click()
        await page.waitForTimeout(250)
        const path = canvas().locator('path[stroke="#404040" i]').first(),
          point = await path.evaluate((node) => {
            const path = node as SVGPathElement,
              p = path.getPointAtLength(path.getTotalLength() / 5),
              q = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!)
            return { x: q.x, y: q.y }
          }),
          box =
            format === 'drawio'
              ? await page.locator('.diagram-slot iframe').boundingBox()
              : undefined
        await page.mouse.click(point.x + (box?.x ?? 0), point.y + (box?.y ?? 0))
        await page.keyboard.press('Delete')
        await expect(canvas().locator('path[stroke="#404040" i]')).toHaveCount(0)
        const flows = await f.readFlows()
        expect(flows.F1).toBeTruthy()
        expect(flows.F2).toBeTruthy()
        expect(flows.F6).toBeTruthy()
        expect(flows.F7).toBeTruthy()
      })
      expect(errors).toEqual([])
    } finally {
      await app.evaluate(({ app }) => app.exit(0)).catch(() => {})
      await app.close().catch(() => {})
    }
  })
}
