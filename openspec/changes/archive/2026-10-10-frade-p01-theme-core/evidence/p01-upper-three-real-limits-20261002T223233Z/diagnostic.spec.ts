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



const upperTrusted = [
  { hash: '0a22cca4e14802d225bb7ef9dd30d4a42b157389a1681b84975349fd18a00b3a', key: 'viewPanels', kind: 'menu' },
  { hash: '4dc5547840d699651cf7d3059a91d575cddaf80451ab85a7c41ed1d7c7998b24', key: 'insert', kind: 'menu' },
  { hash: 'e78bd38fea8a799c13ffc0fbbab4d9ca6a1ee0ee57360c68596b58e4fe68da9a', key: 'insertFreehand', kind: 'action' },
] as const
function upperDecodePng(bytes: Buffer) {
  let width = 0, height = 0, channels = 0
  const blocks: Buffer[] = []
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]))
  for (let at = 8; at < bytes.length;) {
    const size = bytes.readUInt32BE(at), type = bytes.toString('ascii', at + 4, at + 8), data = bytes.subarray(at + 8, at + 8 + size)
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0; expect(data[8]).toBe(8); expect(data[12]).toBe(0); expect(channels).toBeGreaterThan(0) }
    if (type === 'IDAT') blocks.push(data)
    at += size + 12
  }
  const input = inflateSync(Buffer.concat(blocks)), stride = width * channels, pixels = Buffer.alloc(stride * height)
  let at = 0
  for (let y = 0; y < height; y++) { const filter = input[at++]; for (let x = 0; x < stride; x++) {
    const i = y * stride + x, left = x >= channels ? pixels[i - channels] : 0, up = y > 0 ? pixels[i - stride] : 0, diagonal = y > 0 && x >= channels ? pixels[i - stride - channels] : 0
    let predictor = 0
    if (filter === 1) predictor = left
    else if (filter === 2) predictor = up
    else if (filter === 3) predictor = Math.floor((left + up) / 2)
    else if (filter === 4) { const p = left + up - diagonal, a = Math.abs(p - left), b = Math.abs(p - up), c = Math.abs(p - diagonal); predictor = a <= b && a <= c ? left : b <= c ? up : diagonal }
    else expect(filter).toBe(0)
    pixels[i] = (input[at++] + predictor) & 255
  } }
  expect(at).toBe(input.length)
  return { width, height, channels, pixels }
}
function upperPixels(screen: ReturnType<typeof upperDecodePng>, x: number, y: number, size = 18) {
  expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true)
  expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0)
  expect(x + size).toBeLessThanOrEqual(screen.width); expect(y + size).toBeLessThanOrEqual(screen.height)
  const result: number[][] = []
  for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) {
    const at = ((y + yy) * screen.width + x + xx) * screen.channels
    if (screen.channels === 4) expect(screen.pixels[at + 3]).toBe(255)
    result.push([...screen.pixels.subarray(at, at + 3)])
  }
  return result
}
const upperEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
function upperContrast(a: number[], b: number[]) {
  const luminance = (rgb: number[]) => rgb.map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4 }).reduce((n, x, i) => n + x * [.2126,.7152,.0722][i], 0)
  const x = luminance(a), y = luminance(b)
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05)
}
async function upperTargets(f: FuiFixture) {
  return f.page.frameLocator('iframe').locator('body').evaluate(async (_, trusted) => {
    const result = [], nodes = Array.from(document.querySelectorAll<HTMLElement>('html[data-frade-frame-runtime="1"] .geToolbarContainer .geToolbar a.geButton'))
    for (const [index, node] of nodes.entries()) {
      const css = getComputedStyle(node), image = css.backgroundImage === 'none' ? css.getPropertyValue('--frade-upper-icon-image').trim() : css.backgroundImage
      const url = image.match(/^url\("(.*)"\)$/)?.[1]
      if (!url?.startsWith('data:image/svg+xml;base64,')) continue
      const bytes = Uint8Array.from(atob(url.split(',')[1]), c => c.charCodeAt(0)), hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(c => c.toString(16).padStart(2, '0')).join('')
      const identity = trusted.find(x => x.hash === hash)
      if (identity) result.push({ ...identity, index, url, bytes: [...bytes] })
    }
    return result
  }, upperTrusted)
}
async function upperObservation(f: FuiFixture, target: Awaited<ReturnType<typeof upperTargets>>[number]) {
  const node = f.page.frameLocator('iframe').locator('.geToolbarContainer .geToolbar a.geButton').nth(target.index)
  const record = await node.evaluate(async (node, identity) => {
    await document.fonts.ready; await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    const rgba = (s: string) => (s.match(/[\d.]+/g) || []).map(Number)
    const style = (n: Element, pseudo?: string) => {
      const s = getComputedStyle(n, pseudo), r = n.getBoundingClientRect()
      return { background: rgba(s.backgroundColor), color: rgba(s.color), opacity: Number(s.opacity), filter: s.filter, transform: s.transform, blend: s.mixBlendMode, backdropFilter: s.backdropFilter, shadow: s.boxShadow, backgroundImage: s.backgroundImage, backgroundSize: s.backgroundSize, backgroundPosition: s.backgroundPosition, backgroundOrigin: s.backgroundOrigin, backgroundRepeat: s.backgroundRepeat, clipPath: s.clipPath, overflowX: s.overflowX, overflowY: s.overflowY, display: s.display, visibility: s.visibility, rect: r.toJSON(), border: [s.borderLeftWidth,s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth].map(parseFloat), content: s.content, position: s.position }
    }
    const s = style(node), p = getComputedStyle(node, '::before'), after = getComputedStyle(node, '::after'), r = node.getBoundingClientRect()
    const x = r.x + s.border[0] + parseFloat(p.left), y = r.y + s.border[1] + parseFloat(p.top)
    const chain = []; for (let n = node.parentElement; n; n = n.parentElement) chain.push(style(n))
    const ancestor = chain.findIndex(n => n.background.length === 3 || n.background[3] === 1)
    const ui = (window as any).__p01Ui, capability = identity.kind === 'menu' ? ui.menus.get(identity.key) : ui.actions.get(identity.key)
    const image = new Image(); image.src = identity.url; await image.decode()
    const raster = (size: number) => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = size; const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0, size, size); return [...ctx.getImageData(0, 0, size, size).data] }
    return { identity, connected: node.isConnected, owned: node.hasAttribute('data-frade-upper-glyph'), dpr: devicePixelRatio, fonts: document.fonts.status, style: s, chain, ancestor, target: s.background, underlying: ancestor >= 0 ? chain[ancestor].background : [], foreground: rgba(p.backgroundColor), canonical: s.color, capability: { exists: !!capability, enabled: identity.kind === 'action' ? capability?.isEnabled() : capability?.enabled }, actualState: { hover: node.matches(':hover'), active: node.matches(':active'), focus: node.matches(':focus') }, media: { forced: matchMedia('(forced-colors:active)').matches, coarse: matchMedia('(pointer:coarse)').matches, reduced: matchMedia('(prefers-reduced-motion:reduce)').matches }, interference: node.children.length > 0 || !['none','normal'].includes(after.content), unobscured: Number.isFinite(x) && Number.isFinite(y) && [[1,1],[16,1],[1,16],[16,16],[9,9]].every(([dx,dy]) => document.elementFromPoint(x+dx,y+dy) === node), pseudo: { x,y,width:parseFloat(p.width),height:parseFloat(p.height),mask:p.maskImage,maskSize:p.maskSize,maskRepeat:p.maskRepeat,maskPosition:p.maskPosition,opacity:Number(p.opacity),filter:p.filter,blend:p.mixBlendMode,transform:p.transform,content:p.content,backgroundImage:p.backgroundImage }, natural: raster(24), alpha: raster(18).filter((_,i) => i%4===3) }
  }, target)
  const frame = await f.page.locator('iframe').boundingBox()
  expect(frame).not.toBeNull()
  return { ...record, frame: frame!, x: frame!.x + record.pseudo.x, y: frame!.y + record.pseudo.y }
}

import type { TestInfo } from '@playwright/test'
type UpperObservation = Awaited<ReturnType<typeof upperObservation>>
type UpperAtlas = { back: number[]; underlying: number[]; rows: { c: number; glyph: number[][]; full: number[]; empty: number[][] }[] }
const upperReferenceMain = "const {app,BrowserWindow}=require('electron');if(!process.env.FRADE_UPPER_V6_PROFILE)throw Error('Isolated profile required');app.setPath('userData',process.env.FRADE_UPPER_V6_PROFILE);app.whenReady().then(async()=>{const w=new BrowserWindow({width:1600,height:850,useContentSize:true,show:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});await w.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><html><head><style>html,body{margin:0;padding:0} .target{position:absolute;width:28px;height:28px;border:0;padding:0;box-sizing:border-box}.target::before{content:\"\";position:absolute;left:5px;top:5px;width:18px;height:18px;background-color:var(--ink);mask-image:var(--image);mask-size:contain;mask-position:center;mask-repeat:no-repeat;pointer-events:none;forced-color-adjust:none}.probe::before{mask-image:none}.empty::before{mask-image:url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCI+PHBhdGggZmlsbD0iYmxhY2siIGZpbGwtb3BhY2l0eT0iMCIgZD0iTTAgMGgxOHYxOEgweiIvPjwvc3ZnPg==\")}</style></head><body data-frade-v5-reference=\"1\"></body></html>'));});app.on('window-all-closed',()=>app.quit());"

for(const mode of ['light','dark','high-contrast'] as const)for(const density of ['compact','comfortable'] as const)test('P01 upper real limits '+mode+' '+density,async({},info)=>{
 const f=await diagramFixture('frame',{mode,density},page=>page.setViewportSize({width:1280,height:850}));const observations:any[]=[];let session:any;
 try{const targets=await upperTargets(f);expect(targets).toHaveLength(3);const frame=f.page.frameLocator('iframe');
 for(const state of ['wide','narrow','text200','forced-coarse-reduced-text200']){
 await f.page.setViewportSize(state==='wide'?{width:1600,height:900}:state==='narrow'?{width:850,height:650}:{width:1280,height:850});
 if(state==='text200'){const sizes=await frame.locator('body').evaluate(()=>{const nodes=[...document.querySelectorAll<HTMLElement>('.geToolbarContainer,.geToolbarContainer *')],before=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));nodes.forEach((n,i)=>n.style.setProperty('font-size',before[i]*2+'px','important'));return nodes.map((n,i)=>({before:before[i],after:parseFloat(getComputedStyle(n).fontSize)}))});expect(sizes.every(s=>s.after===s.before*2)).toBe(true);}
 if(state.startsWith('forced')){await f.page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});session=await f.page.context().newCDPSession(f.page.frames().find(p=>p.url().startsWith('frade://drawio/'))!);await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await expect.poll(()=>frame.locator('html').getAttribute('data-frade-frame-theme')).toBe('high-contrast');await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden();}
 let stable=0,previous='';await expect.poll(async()=>{const current=JSON.stringify({state:await fuiSemantics(f,'frame'),box:await f.page.locator('iframe').boundingBox()});stable=current===previous?stable+1:0;previous=current;return stable},{timeout:5000,intervals:[100]}).toBeGreaterThanOrEqual(5);
 const before={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f)};
 for(const target of targets){const node=frame.locator('.geToolbarContainer .geToolbar a.geButton').nth(target.index);await f.page.mouse.move(1,1);const record=await upperObservation(f,target),focus=await node.evaluate(n=>{const prior=document.activeElement;n.focus();const result={focused:document.activeElement===n,tabIndex:n.tabIndex,tabIndexAttribute:n.getAttribute('tabindex'),href:n.getAttribute('href'),minWidth:n.getAttribute('data-min-width')};if(document.activeElement===n)n.blur();if(prior instanceof HTMLElement)prior.focus();return result});observations.push({state,target:target.key,record,focus});}
 const png=await f.page.screenshot({path:info.outputPath(state+'.png')}),after={semantics:await fuiSemantics(f,'frame'),files:await fuiFiles(f)};await writeFile(info.outputPath(state+'-preservation.json'),JSON.stringify({before,after,screenshotSha256:fuiHash(png)}));expect(after).toEqual(before);
 }
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,density,observations,scope:'Composition and capability observation only; no numerical or visual approval'}));if(session)await session.detach();await finishDiagramFixture(f.app)}
});