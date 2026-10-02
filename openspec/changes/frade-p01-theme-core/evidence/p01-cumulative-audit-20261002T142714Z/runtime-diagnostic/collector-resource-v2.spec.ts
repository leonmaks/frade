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


for (const mode of ['light','dark','high-contrast'] as const) for (const density of ['compact','comfortable'] as const) test('P01 isolated upper glyph diagnostic '+mode+' '+density,async ({},info)=>{
  test.setTimeout(120000);const f=await diagramFixture('frame',{mode,density},p=>p.setViewportSize({width:1280,height:850}));
  try{
    const body=f.page.frameLocator('iframe').locator('body'),before={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f)},handle=await body.evaluateHandle(()=>{const ui=(window as any).__p01Ui;return {ui,graph:ui.editor.graph,toolbar:document.querySelector('.geToolbarContainer')};});
    const frame=await f.page.locator('iframe').boundingBox();const observations=await body.evaluate(async()=>{
      function dataUriBytes(url) {const comma=url.indexOf(',');if(!url.startsWith('data:')||comma<0)throw Error('INVALID_DATA_URI');const header=url.slice(5,comma),payload=url.slice(comma+1);if(/;base64$/i.test(header))return Uint8Array.from(atob(payload),c=>c.charCodeAt(0));return new TextEncoder().encode(decodeURIComponent(payload));}
      const ui=(window as any).__p01Ui,actions=[['zoomIn','zoomInImage'],['zoomOut','zoomOutImage'],['undo','undoImage'],['redo','redoImage'],['delete','trashImage'],['toFront','toFrontImage'],['toBack','toBackImage'],['fillColor','fillColorImage'],['strokeColor','strokeColorImage'],['shadow','shadowImage'],['insertFreehand','freehandImage'],['generate','sparklesImage']],menus=[['viewPanels','dockRightImage'],['insert','plusImage'],['layout','layoutImage']];const Editor=(window as any).Editor;
      const style=(el:Element,pseudo?:string)=>{const s=getComputedStyle(el,pseudo);return {backgroundImage:s.backgroundImage,backgroundColor:s.backgroundColor,backgroundSize:s.backgroundSize,backgroundPosition:s.backgroundPosition,backgroundOrigin:s.backgroundOrigin,backgroundClip:s.backgroundClip,backgroundRepeat:s.backgroundRepeat,opacity:s.opacity,filter:s.filter,transform:s.transform,mixBlendMode:s.mixBlendMode,backdropFilter:s.backdropFilter,maskImage:s.maskImage,boxShadow:s.boxShadow,padding:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft],border:[s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth],display:s.display,visibility:s.visibility,color:s.color};};
      const records=[];let index=0;for(const el of document.querySelectorAll<HTMLElement>('.geToolbarContainer a.geButton,.geToolbarContainer button,.geToolbarContainer input')){
        const s=style(el),r=el.getBoundingClientRect(),title=el.getAttribute('title'),url=/^url\(["']?(.*?)["']?\)$/.exec(s.backgroundImage)?.[1];const found=actions.filter(([key,image])=>{const action=ui.actions.get(key);return action&&url===Editor[image]&&title===action.getTitle()+(action.shortcut?' ('+action.shortcut+')':'');});let capability:any={status:'UNKNOWN',enabled:null};
        if(found.length===1){const action=ui.actions.get(found[0][0]),disabled=el.getAttribute('disabled')==='disabled';capability={kind:'action',key:found[0][0],enabled:action.enabled,methodIsEnabled:action.isEnabled(),disabled,agrees:disabled===!action.enabled};if(!capability.agrees)capability.enabled=null;}
        else {const candidates=menus.filter(([key,image])=>url===Editor[image]);if(candidates.length===1){const menu=ui.menus.get(candidates[0][0]),own=(el as any).enabled,guardEnabled=own==null||own===true;capability={kind:'menu',key:candidates[0][0],enabled:guardEnabled&&menu.enabled===true,ownEnabled:own??null,menuEnabled:menu.enabled,mxDisabled:el.classList.contains('mxDisabled'),agrees:guardEnabled===menu.enabled&&!el.classList.contains('mxDisabled')};if(!capability.agrees)capability.enabled=null;}}
        let resource:any=null;if(url){try{let bytes:Uint8Array,status:number;if(url.startsWith("data:")){bytes=dataUriBytes(url);status=200;}else{const response=await fetch(url);bytes=new Uint8Array(await response.arrayBuffer());status=response.status;}const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);resource={url,bytes:Array.from(bytes),width:c.width,height:c.height,rgba:Array.from(ctx.getImageData(0,0,c.width,c.height).data),status};}catch(error){resource={url,error:String(error)};}}
        const chain=[];for(let p:Element|null=el;p;p=p.parentElement)chain.push({tag:p.tagName,classes:p.className,style:style(p)});
        records.push({index:index++,tag:el.tagName,classes:el.className,title,ariaDisabled:el.getAttribute('aria-disabled'),disabled:el.getAttribute('disabled'),ownEnabled:(el as any).enabled??null,connected:el.isConnected,visible:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden',rect:{x:r.x,y:r.y,width:r.width,height:r.height},style:s,pseudos:{before:style(el,'::before'),after:style(el,'::after')},descendants:Array.from(el.querySelectorAll('img,svg,[style]')).map(c=>({tag:c.tagName,src:c.getAttribute('src'),style:style(c)})),chain,capability,resource});
      }return {records,dpr:devicePixelRatio,viewport:{width:innerWidth,height:innerHeight},frameTheme:document.documentElement.dataset.fradeFrameTheme,fonts:document.fonts.status};
    });
    const screenshot=info.outputPath('upper-toolbar-'+mode+'-'+density+'.png');await f.page.screenshot({path:screenshot});const after={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f)};expect(after).toEqual(before);const identities=await body.evaluate((_,original:any)=>{const ui=(window as any).__p01Ui;return {ui:ui===original.ui,graph:ui.editor.graph===original.graph,toolbar:document.querySelector('.geToolbarContainer')===original.toolbar};},handle);expect(identities).toEqual({ui:true,graph:true,toolbar:true});
    await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,density,frame,screenshot,before,after,identities,observations},null,2));await handle.dispose();
  }finally{await finishDiagramFixture(f.app);}
});
