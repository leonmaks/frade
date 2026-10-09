import { inflateSync } from 'node:zlib'

import { test, expect, _electron as electron } from "C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/apps/desktop/node_modules/@playwright/test/index.mjs"

import { mkdtemp, writeFile, readFile, mkdir, rmdir, readdir } from 'node:fs/promises'

import { tmpdir } from 'node:os'

import { join, resolve } from 'node:path'

import { createFlowFixture } from "C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/scripts/flow-fixtures.mjs"

import { createKaFixture } from "C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/scripts/ka-fixtures.mjs"

import type { Page, ElectronApplication } from "C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/apps/desktop/node_modules/@playwright/test/index.mjs"

import type { PresentationApi } from '@frade/runtime-contracts'

async function diagramFixture(
  kind: 'native' | 'frame',
  presentation?: { mode: 'light' | 'dark' | 'high-contrast'; density: 'compact' | 'comfortable' },
  welcome?: (page: Page) => Promise<void>,
) {
  const fixture = await createKaFixture(),
    folder = join(fixture.dataRoot, '_diagrams')
  await mkdir(folder, { recursive: true })
  const name = kind === 'native' ? 'Workshop.frade' : 'Workshop.drawio'
  const authoredDocument =
    kind === 'native'
      ? JSON.stringify(
          {
            format: 'frade-draw',
            version: 1,
            metadata: { id: 'p01-authored', name: 'Workshop' },
            graph: {
              nodes: [
                {
                  id: 'authored',
                  shape: 'rect',
                  x: 140,
                  y: 120,
                  width: 180,
                  height: 80,
                  label: 'Authored paint',
                  style: { fill: '#77AADD', stroke: '#334455' },
                  labelStyle: { fill: '#112244' },
                },
              ],
              edges: [],
            },
            viewport: { zoom: 1, pan: { x: 0, y: 0 } },
          },
          null,
          2,
        )
      : '<mxfile><diagram id="main" name="Workshop"><mxGraphModel grid="1" gridSize="10" background="#F7E2C2" gridColor="#112233" page="1" pageWidth="700" pageHeight="500"><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="authored" value="Authored paint" style="rounded=0;fillColor=#77AADD;strokeColor=#334455;fontColor=#112244;" vertex="1" parent="1"><mxGeometry x="140" y="120" width="180" height="80" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>'
  const file = join(folder, name)
  await writeFile(file, authoredDocument)
  if (presentation) {
    const profile = join(fixture.destination, 'p01-' + kind + '-profile')
    await mkdir(profile, { recursive: true })
    await writeFile(
      join(profile, 'presentation-settings.json'),
      JSON.stringify({
        version: 1,
        revision: 0,
        generation: 0,
        transactionId: 'matrix/boot',
        selection: {
          ...presentation,
          preferred: {
            light: 'frade.builtin/light',
            dark: 'frade.builtin/dark',
            'high-contrast': 'frade.builtin/high-contrast',
          },
        },
      }),
    )
  }
  const app = await electron.launch({
    args: [resolve('out/main/index.cjs')],
    env: { ...process.env, FRADE_USER_DATA: join(fixture.destination, 'p01-' + kind + '-profile') },
  })
  const page = await app.firstWindow()
  await page.addInitScript(() => {
    const telemetry = ((window as any).__p01Telemetry = {
      messages: [] as unknown[],
      paints: [] as number[],
      visibility: [] as unknown[],
    })
    const tick = (now: number) => {
      if (telemetry.paints.length > 999) telemetry.paints.shift()
      telemetry.paints.push(now)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    document.addEventListener('visibilitychange', () =>
      telemetry.visibility.push({ time: performance.now(), state: document.visibilityState }),
    )
    window.addEventListener('message', (event) => {
      let data
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : undefined
      } catch {
        return
      }
      if (
        data?.action === 'fradePresentation' &&
        data.operation === 'prepare' &&
        data.snapshot?.kind === 'dark' &&
        (window as any).__p01RefuseDark
      ) {
        event.stopImmediatePropagation()
        parent.postMessage(
          JSON.stringify({
            event: 'fradePresentation',
            version: 1,
            participantId: data.participantId,
            participantGeneration: data.participantGeneration,
            context: data.context,
            operation: 'prepare',
            status: 'REFUSED',
            message: 'Controlled current frame refusal',
          }),
          'frade://app',
        )
      }
      if (data?.action === 'fradePresentation' || data?.event === 'fradePresentation')
        telemetry.messages.push({ time: performance.now(), data })
    })
    if (location.host !== 'drawio') return
    window.addEventListener('message', (event) => {
      let value
      try {
        value = typeof event.data === 'string' ? JSON.parse(event.data) : undefined
      } catch {
        return
      }
      const Editor = (window as any).EditorUi
      if (value?.action !== 'configure' || !Editor || Editor.prototype.init.__p01Capture) return
      const original = Editor.prototype.init
      const capture = function (this: any, ...args: unknown[]) {
        const result = original.apply(this, args)
        ;(window as any).__p01Ui = this
        return result
      }
      capture.__p01Capture = true
      Editor.prototype.init = capture
    })
  })
  await expect(page.locator('.wb-statusbar [role="status"]')).toHaveText('Backend: ready')
  if (welcome) await welcome(page)
  await app.evaluate(
    ({ dialog }, paths) => {
      let index = 0
      dialog.showOpenDialog = (async () => ({
        canceled: false,
        filePaths: [paths[index++]],
      })) as typeof dialog.showOpenDialog
    },
    [fixture.dataRoot, fixture.metadataRoot],
  )
  await page.getByRole('button', { name: 'Открыть KA', exact: true }).click()
  await expect(page.locator('.status-message')).toContainText('138 объектов', { timeout: 30000 })
  const diagrams = page.getByRole('treeitem').filter({ hasText: /^_diagrams$/ })
  await diagrams.click()
  await page
    .getByRole('treeitem')
    .filter({ hasText: new RegExp('^' + name.replace('.', '\\.') + '$') })
    .dblclick()
  await expect(
    page
      .locator('.repository-diagram .editor-actions')
      .getByRole('button', { name: 'Сохранить', exact: true }),
  ).toBeEnabled({ timeout: 20000 })
  if (kind === 'frame') {
    await expect(page.locator('iframe')).toHaveAttribute(
      'data-frade-revision',
      (await page.locator('html').getAttribute('data-frade-revision')) as string,
    )
    await expect(page.locator('.frade-theme-commit-barrier')).toBeHidden()
    await expect(page.locator('iframe')).toBeVisible()
    await page
      .frameLocator('iframe')
      .locator('body')
      .evaluate(async () => {
        await document.fonts.ready
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        )
      })
    await expect(page.locator('.diagram-error')).toHaveCount(0)
  }
  return { fixture, app, page, file, name }
}

async function finishDiagramFixture(app: ElectronApplication) {
  // A deliberately blocked recovery must not leak this test's isolated Electron process.
  // Explicit window-close/dirty-guard scenarios use the normal close path separately.
  await app.evaluate(({ app }) => {
    setTimeout(() => app.exit(0), 50)
  })
  await app.close()
}

import { createHash } from 'node:crypto'

import { builtinTokens } from '@frade/ui-workspace/design/tokens'

type FuiFixture = Awaited<ReturnType<typeof diagramFixture>>

type FuiKind = 'native' | 'frame'

const fuiHash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex')

async function fuiFiles(f: FuiFixture) {
  const records: Record<string, string> = {}
  for (const file of f.fixture.manifest.files.filter((file: { path: string }) => file.path.startsWith('KA/')))
    records[file.path] = fuiHash(await readFile(join(f.fixture.destination, file.path)))
  records.diagram = fuiHash(await readFile(f.file))
  expect(Object.keys(records).length).toBeGreaterThan(1)
  return records
}

async function fuiSemantics(f: FuiFixture, kind: FuiKind) {
  if (kind === 'native')
    return f.page.locator('.frade-canvas .canvas').evaluate((canvas) => {
      const node = canvas.querySelector<SVGGElement>('.x6-node[data-cell-id="authored"]')!
      const rect = node.querySelector('rect')!
      return {
        geometry: node.getAttribute('transform'),
        fill: rect.getAttribute('fill'), stroke: rect.getAttribute('stroke'),
        selection: canvas.querySelectorAll('.x6-widget-selection-box').length,
        canvasIdentity: canvas === (window as any).__fuiCanvas,
        nodeIdentity: node === (window as any).__fuiNode,
      }
    })
  return f.page.frameLocator('iframe').locator('body').evaluate(() => {
    const ui = (window as any).__p01Ui, graph = ui.editor.graph,
      geometry = graph.getModel().getCell('authored').geometry,
      container = graph.container
    return {
      geometry: { x: geometry.x, y: geometry.y, width: geometry.width, height: geometry.height },
      xml: (window as any).mxUtils.getXml(ui.editor.getGraphXml()),
      selection: graph.getSelectionCells().map((cell: any) => cell.id),
      history: ui.editor.undoManager.history.length, cursor: ui.editor.undoManager.indexOfNextAdd,
      preferences: { ...localStorage }, page: ui.currentPage.id,
      background: graph.background, gridColor: graph.gridColor, gridEnabled: graph.gridEnabled,
      scale: graph.view.scale, translate: { x: graph.view.translate.x, y: graph.view.translate.y },
      scroll: { left: container.scrollLeft, top: container.scrollTop },
      uiIdentity: ui === (window as any).__fuiUi, graphIdentity: graph === (window as any).__fuiGraph,
    }
  })
}



test('P01 upper resize readiness diagnosis without any UI input',async({},info)=>{
const f=await diagramFixture('frame',{mode:'light',density:'compact'},page=>page.setViewportSize({width:1280,height:850}));try{
const records=[];const sample=async(label:string)=>{records.push({label,at:Date.now(),state:await fuiSemantics(f,'frame'),frame:await f.page.locator('iframe').boundingBox()})};
await sample('before-resize');await f.page.setViewportSize({width:1600,height:900});await sample('immediate');
await f.page.frameLocator('iframe').locator('body').evaluate(async()=>{await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))) });await sample('two-frames');
for(let n=0;n<10;n++){await new Promise(r=>setTimeout(r,100));await sample('settling-'+n)}
await writeFile(info.outputPath('resize-without-input.json'),JSON.stringify(records,null,2));await f.page.screenshot({path:info.outputPath('settled.png')});expect(records.at(-1)!.state).toEqual(records.at(-2)!.state);
}finally{await finishDiagramFixture(f.app)}});