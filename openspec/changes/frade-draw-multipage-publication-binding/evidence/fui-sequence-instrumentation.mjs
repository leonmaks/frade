import fs from 'node:fs'
const root = 'E:/dev/codex/frade/.worktrees/multipage-publication-clean-4'
const src = root + '/apps/desktop/tests/e2e/ui-contract-theme.spec.ts'
const dst = root + '/apps/desktop/tests/e2e/ui-contract-theme-pointer-diagnostic.spec.ts'
if (fs.existsSync(dst)) throw Error('DIAGNOSTIC_EXISTS')
let s = fs.readFileSync(src, 'utf8')
s = "import { spawn } from 'node:child_process'\nimport { writeFileSync } from 'node:fs'\nconst fuiObservers = new Map<any, any>()\n" + s
const anchor = '  const page = await app.firstWindow()'
const inject = `
  const fuiIdentity = await app.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; (globalThis as any).__fuiWindowEvents = []; for (const type of ['blur', 'focus']) win.on(type, () => (globalThis as any).__fuiWindowEvents.push({ epoch: Date.now(), type })); return { pid: process.pid, hwnd: win.getNativeWindowHandle().toString('hex') } })
  const fuiRaw = Buffer.from(fuiIdentity.hwnd, 'hex'), fuiHwnd = (fuiRaw.length === 8 ? fuiRaw.readBigUInt64LE() : BigInt(fuiRaw.readUInt32LE())).toString(), fuiOutput = test.info().outputPath('pointer-os.json'), fuiStop = test.info().outputPath('pointer-stop'), fuiReady = test.info().outputPath('pointer-ready.json')
  const fuiObserver = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', 'E:/dev/codex/frade/.worktrees/requests/observe-native-focus.ps1', '-WindowHandle', fuiHwnd, '-ExpectedPid', String(fuiIdentity.pid), '-OutputPath', fuiOutput, '-ReadyPath', fuiReady, '-StopPath', fuiStop], { windowsHide: true, stdio: 'ignore' })
  const fuiObserverDone = new Promise((resolve) => fuiObserver.once('close', resolve)); fuiObservers.set(app, { fuiIdentity, fuiStop, fuiObserverDone })
  await page.addInitScript(() => {
    const w = window as any; w.__fuiPointerEvents = [];
    for (const type of ['focus', 'blur', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel']) document.addEventListener(type, (event: any) => {
      const graph = w.__p01Ui?.editor.graph; if (!graph || w.__fuiPointerEvents.length > 160) return; const h = graph.graphHandler, cell = graph.model.getCell('authored'), g = cell?.geometry;
      w.__fuiPointerEvents.push({ epoch: Date.now(), type, x: event.clientX, y: event.clientY, buttons: event.buttons, ctrl: event.ctrlKey, shift: event.shiftKey, tag: event.target?.tagName, focused: document.hasFocus(), active: document.activeElement?.className, pressed: graph.isMouseDown, enabled: graph.isEnabled(), movable: graph.isCellMovable(cell), editing: graph.isEditing(), handlerEnabled: h.isEnabled(), handler: { cell: h.cell?.id, first: h.first, dx: h.currentDx, dy: h.currentDy }, geometry: g ? { x: g.x, y: g.y } : null, selection: graph.getSelectionCells().map((c: any) => c.id), scroll: { x: graph.container.scrollLeft, y: graph.container.scrollTop }, revision: document.documentElement.dataset.fradeFrameRevision })
    }, true)
  })`
const start = s.indexOf('async function diagramFixture('), at = s.indexOf(anchor, start)
if (at < 0) throw Error('FIXTURE_ANCHOR')
s = s.slice(0, at + anchor.length) + inject + s.slice(at + anchor.length)
const finish = 'async function finishDiagramFixture(app: ElectronApplication) {'
s = s.replace(finish, finish + `
  const obs = fuiObservers.get(app); if (obs) {
    const page = await app.firstWindow(); const pointer = await page.locator('iframe').count() ? await page.frameLocator('iframe').locator('body').evaluate(() => (window as any).__fuiPointerEvents) : []; const windows = await app.evaluate(() => (globalThis as any).__fuiWindowEvents);
    writeFileSync(obs.fuiStop, 'stop'); await obs.fuiObserverDone; await writeFile(test.info().outputPath('pointer-observations.json'), JSON.stringify({ identity: obs.fuiIdentity, pointer, windows, diagnosticOnly: true }, null, 2));
  }`)
fs.writeFileSync(dst, s)
fs.writeFileSync('E:/dev/codex/frade/.worktrees/requests/fui-diagnostic-source.json', JSON.stringify({ original: src, diagnostic: dst, assertionsChanged: 0, onlyObservationsAdded: true }, null, 2) + '\n')
console.log(dst)
