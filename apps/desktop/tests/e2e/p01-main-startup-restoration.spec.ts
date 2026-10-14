import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createKaFixture } from '../../../../scripts/ka-fixtures.mjs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

type Mode = 'light' | 'dark' | 'high-contrast' | 'system'
type Density = 'compact' | 'comfortable'
const xml =
  '<mxfile><diagram id="main" name="Restored"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="authored" value="Authored" style="rounded=0;" vertex="1" parent="1"><mxGeometry x="140" y="120" width="180" height="80" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>'

async function captureEditor(app: ElectronApplication) {
  await app.context().addInitScript(() => {
    const events: unknown[] = ((window as any).__startupProtocol = [])
    window.addEventListener('message', (event) => {
      let value
      try { value = typeof event.data === 'string' ? JSON.parse(event.data) : undefined }
      catch { return }
      if (value?.action === 'fradePresentation' || value?.event === 'fradePresentation')
        events.push({ at: performance.now(), host: location.host, action: value.action, event: value.event,
          participantId: value.participantId, participantGeneration: value.participantGeneration,
          context: value.context, operation: value.operation, status: value.status, message: value.message })
    })
    for (const query of ['(prefers-color-scheme: dark)', '(prefers-contrast: more)', '(forced-colors: active)']) {
      const media = matchMedia(query)
      events.push({ at: performance.now(), media: query, initial: media.matches })
      media.addEventListener('change', event => events.push({ at: performance.now(), media: query, matches: event.matches }))
    }
    if (location.host !== 'drawio') return
    window.addEventListener('message', (event) => {
      let value
      try {
        value = typeof event.data === 'string' ? JSON.parse(event.data) : undefined
      } catch {
        return
      }
      const Editor = (window as any).EditorUi
      if (value?.action !== 'configure' || !Editor || Editor.prototype.init.__startupCapture) return
      const original = Editor.prototype.init
      const capture = function (this: any, ...args: unknown[]) {
        const result = original.apply(this, args)
        ;(window as any).__startupUi = this
        return result
      }
      capture.__startupCapture = true
      Editor.prototype.init = capture
    })
  })
}

async function revisionReady(page: Page, count: number) {
  await expect(page.locator('iframe')).toHaveCount(count)
  // Retain the meaningful original RED predicate: every required frame paints the current revision.
  await expect
    .poll(
      () =>
        page
          .evaluate(() => ({
            revision: document.documentElement.dataset.fradeRevision,
            frames: [...document.querySelectorAll('iframe')].map((f) => f.dataset.fradeRevision),
          }))
          .then((s) => s.frames.every((r) => r === s.revision)),
      { timeout: 10000 },
    )
    .toBe(true)
  await expect(page.locator('.frade-theme-commit-barrier')).toBeHidden()
}

for (const host of ['built', 'dev'] as const)
  for (const mode of ['light', 'dark', 'high-contrast', 'system'] as Mode[])
    for (const density of ['compact', 'comfortable'] as Density[])
      for (const active of ['diagram', 'ka'] as const) {
        // eslint-disable-next-line no-empty-pattern
        test(`P01-RESTORE ${host} ${mode} ${density} active-${active}`, async ({}, info) => {
          test.setTimeout(90000)
          const fixture = await createKaFixture(),
            folder = join(fixture.dataRoot, '_diagrams'),
            profile = join(fixture.destination, 'startup-profile')
          await mkdir(folder, { recursive: true })
          await mkdir(profile, { recursive: true })
          const files = ['First.drawio', 'Second.drawio'].map((name) => join(folder, name))
          for (const file of files) await writeFile(file, xml)
          const record = {
            version: 1,
            revision: 7,
            generation: 9,
            transactionId: 'restore/fixture/boot',
            selection: {
              mode,
              density,
              preferred: {
                light: 'frade.builtin/light',
                dark: 'frade.builtin/dark',
                'high-contrast': 'frade.builtin/high-contrast',
              },
            },
          }
          const settings = join(profile, 'presentation-settings.json')
          await writeFile(settings, JSON.stringify(record))
          const server =
            host === 'dev'
              ? await createServer({
                  configFile: false,
                  root: resolve('src/renderer'),
                  plugins: [react()],
                  server: { host: '127.0.0.1', port: 5191, strictPort: false },
                  logLevel: 'warn',
                })
              : undefined
          if (server) await server.listen()
          const address = server?.httpServer?.address()
          const devUrl =
            address && typeof address === 'object' ? `http://127.0.0.1:${address.port}/` : undefined
          const launch = () =>
            electron.launch({
              args: [resolve('out/main/index.cjs')],
              env: {
                ...process.env,
                FRADE_USER_DATA: profile,
                ...(devUrl ? { ELECTRON_RENDERER_URL: devUrl } : {}),
              },
            })
          let app: ElectronApplication | undefined,
            page: Page | undefined,
            phase = 'initial'
          try {
            app = await launch()
            await captureEditor(app)
            page = await app.firstWindow()
            await expect(page.locator('.wb-statusbar [role="status"]')).toHaveText('Backend: ready')
            await app.evaluate(
              ({ dialog }, paths) => {
                let i = 0
                dialog.showOpenDialog = (async () => ({
                  canceled: false,
                  filePaths: [paths[i++]],
                })) as typeof dialog.showOpenDialog
              },
              [fixture.dataRoot, fixture.metadataRoot],
            )
            await page.getByRole('button', { name: 'Открыть KA', exact: true }).click()
            await expect(page.locator('.status-message')).toContainText('138 объектов', {
              timeout: 30000,
            })
            await page
              .getByRole('treeitem')
              .filter({ hasText: /^_diagrams$/ })
              .click()
            for (const name of ['First.drawio', 'Second.drawio']) {
              await page
                .getByRole('treeitem')
                .filter({ hasText: new RegExp('^' + name.replace('.', '\\.') + '$') })
                .dblclick()
              await expect(page.getByRole('tab', { name, exact: true })).toBeVisible()
              await revisionReady(page, name === 'First.drawio' ? 1 : 2)
            }
            if (active === 'ka') {
              await page
                .getByLabel('Поиск объектов', { exact: true })
                .fill('ecogroup.berezka.systems.berezka')
              await page.locator('[data-object-id="ecogroup.berezka.systems.berezka"]').dblclick()
              await expect(
                page.locator('.field[data-field-path="description"] textarea'),
              ).toBeVisible()
              await expect(page.locator('iframe').first()).toBeHidden()
            }
            const editors = await page.evaluate(() => localStorage.getItem('frade.editors'))
            await writeFile(
              info.outputPath('before-restart.json'),
              JSON.stringify({ editors, record }, null, 2),
            )
            await app.close()
            app = undefined
            phase = 'restored'
            app = await launch()
            await captureEditor(app)
            page = await app.firstWindow()
            await expect(page.locator('.wb-statusbar [role="status"]')).toHaveText('Backend: ready')
            await revisionReady(page, 2)
            expect(await page.evaluate(() => localStorage.getItem('frade.editors'))).toBe(editors)
            expect(JSON.parse(await readFile(settings, 'utf8'))).toEqual(record)
            await expect(page.locator('html')).toHaveAttribute('data-frade-density', density)
            const expectedMode =
              mode === 'system'
                ? await page.evaluate(() =>
                    matchMedia('(forced-colors: active)').matches ||
                    matchMedia('(prefers-contrast: more)').matches
                      ? 'high-contrast'
                      : matchMedia('(prefers-color-scheme: dark)').matches
                        ? 'dark'
                        : 'light',
                  )
                : mode
            await expect(page.locator('html')).toHaveAttribute('data-frade-theme', expectedMode)
            if (active === 'diagram') {
              await expect(
                page.getByRole('tab', { name: 'Second.drawio', exact: true }),
              ).toHaveAttribute('aria-selected', 'true')
            } else {
              await expect(
                page.locator('.field[data-field-path="description"] textarea'),
              ).toBeVisible()
              await expect(page.locator('iframe').first()).toBeHidden()
              await expect(page.locator('iframe').last()).toBeHidden()
            }
            await expect(page.locator('iframe[title="_diagrams/First.drawio"]')).toBeHidden()
            for (const file of files) expect(await readFile(file, 'utf8')).toBe(xml)

            // One interaction probe per host/active surface; other matrix cases prove startup coverage.
            if (mode === 'light' && density === 'compact') {
              const frame = page.frameLocator('iframe[title="_diagrams/First.drawio"]')
              await expect
                .poll(() => frame.locator('body').evaluate(() => !!(window as any).__startupUi))
                .toBe(true)
              await frame.locator('body').evaluate(() => {
                const ui = (window as any).__startupUi
                ;(window as any).__startupOriginalUi = ui
                ui.editor.graph
                  .getModel()
                  .setValue(ui.editor.graph.getModel().getCell('authored'), 'Retained dirty')
              })
              const snapshot = () =>
                frame.locator('body').evaluate(() => {
                  const ui = (window as any).__startupUi
                  return {
                    xml: (window as any).mxUtils.getXml(ui.editor.getGraphXml()),
                    history: ui.editor.undoManager.history.length,
                    cursor: ui.editor.undoManager.indexOfNextAdd,
                    preferences: { ...localStorage },
                    selection: ui.editor.graph.getSelectionCells().map((c: any) => c.id),
                    scale: ui.editor.graph.view.scale,
                    translate: { ...ui.editor.graph.view.translate },
                  }
                })
              const before = await snapshot()
              expect(before.history).toBeGreaterThan(0)
              await page.locator('[role="tab"][aria-selected="true"]').focus()
              const focusBefore = await page.evaluate(() => {
                ;(window as any).__startupFocus = document.activeElement
                ;(window as any).__startupFrame = document.querySelector(
                  'iframe[title="_diagrams/First.drawio"]',
                )
                return document.activeElement?.getAttribute('aria-selected')
              })
              expect(focusBefore).toBe('true')
              await page.keyboard.down('Control')
              await page.keyboard.press('k')
              await page.keyboard.press('t')
              await page.keyboard.up('Control')
              const picker = page.getByRole('dialog', { name: 'Выбор темы' })
              await expect(picker).toBeVisible()
              await picker.getByRole('option', { name: /Dark/ }).click()
              await expect(page.locator('html')).toHaveAttribute('data-frade-theme', 'dark')
              await revisionReady(page, 2)
              await page.keyboard.press('Escape')
              await expect(picker).toHaveCount(0)
              await expect(page.locator('html')).toHaveAttribute('data-frade-theme', 'light')
              expect(await snapshot()).toEqual(before)
              expect(JSON.parse(await readFile(settings, 'utf8'))).toEqual(record)
              expect(
                await page.evaluate(
                  () => document.activeElement === (window as any).__startupFocus,
                ),
              ).toBe(true)
              await page.keyboard.down('Control')
              await page.keyboard.press('k')
              await page.keyboard.press('t')
              await page.keyboard.up('Control')
              await picker.getByRole('option', { name: /Dark/ }).click()
              await expect(page.locator('html')).toHaveAttribute('data-frade-theme', 'dark')
              await page.keyboard.press('Enter')
              await expect(picker).toHaveCount(0)
              await revisionReady(page, 2)
              expect(JSON.parse(await readFile(settings, 'utf8')).selection.mode).toBe('dark')
              expect(await snapshot()).toEqual(before)
              expect(
                await frame
                  .locator('body')
                  .evaluate(
                    () => (window as any).__startupOriginalUi === (window as any).__startupUi,
                  ),
              ).toBe(true)
              expect(
                await page.evaluate(
                  () =>
                    document.querySelector('iframe[title="_diagrams/First.drawio"]') ===
                    (window as any).__startupFrame,
                ),
              ).toBe(true)
              await expect(page.locator('iframe[title="_diagrams/First.drawio"]')).toBeHidden()
              await page.locator('[role="tab"][title$=" / _diagrams/First.drawio"]').click()
              await expect(page.locator('iframe[title="_diagrams/First.drawio"]')).toBeVisible()
              expect(await snapshot()).toEqual(before)
              for (const file of files) expect(await readFile(file, 'utf8')).toBe(xml)
              await writeFile(
                info.outputPath('interaction-preservation.json'),
                JSON.stringify({ before, after: await snapshot(), preserved: true }, null, 2),
              )
            }
            if (mode === 'system') {
              await page.emulateMedia({ colorScheme: 'dark' })
              await expect(page.locator('html')).toHaveAttribute('data-frade-theme', 'dark')
              await revisionReady(page, 2)
              expect(JSON.parse(await readFile(settings, 'utf8')).selection.mode).toBe('system')
            }
            await page.screenshot({ path: info.outputPath('restored-startup.png') })
          } finally {
            if (page && !page.isClosed()) {
              const protocol = await Promise.all(page.frames().map(frame => frame.evaluate(() => ({
                url: location.origin, title: window.frameElement?.getAttribute('title'), events: (window as any).__startupProtocol,
              }))))
              await writeFile(info.outputPath('protocol.json'), JSON.stringify(protocol, null, 2))
              await writeFile(
                info.outputPath('observation.json'),
                JSON.stringify(
                  {
                    host,
                    mode,
                    density,
                    active,
                    phase,
                    state: await page.evaluate(() => ({
                      revision: document.documentElement.dataset.fradeRevision,
                      editors: localStorage.getItem('frade.editors'),
                      barrier: document.querySelector('.frade-theme-commit-barrier')?.textContent,
                      frames: [...document.querySelectorAll('iframe')].map((f) => ({
                        title: f.title,
                        revision: f.dataset.fradeRevision,
                        parked: f.closest('[hidden]') !== null,
                        width: f.getBoundingClientRect().width,
                        height: f.getBoundingClientRect().height,
                      })),
                    })),
                  },
                  null,
                  2,
                ),
              )
              await page.screenshot({ path: info.outputPath('last-state.png') })
              if (app) {
                await app.evaluate(({ app }) => {
                  setTimeout(() => app.exit(0), 50)
                })
                await app.close()
              }
            }
            if (server) await server.close()
          }
        })
      }
