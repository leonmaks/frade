import fs from 'node:fs'
import path from 'node:path'
import {createRequire,stripTypeScriptTypes} from 'node:module'
import {pathToFileURL} from 'node:url'
import {spawn} from 'node:child_process'
import {createHash} from 'node:crypto'
const root=path.resolve('.worktrees/multipage-publication-clean-3'),out=path.resolve('.worktrees/requests/focus-deterministic-' + (process.argv[2] ?? 'old'))
if(fs.existsSync(out))throw Error('IMMUTABLE_DIAGNOSTIC_EXISTS');fs.mkdirSync(out,{recursive:true})
const sha=b=>createHash('sha256').update(b).digest('hex');let observer,observerDone;const observerLogs=[];
const req=createRequire(path.join(root,'apps/desktop/package.json')),{_electron:electron,expect}=req('@playwright/test')
const {createKaFixture}=await import(pathToFileURL(path.join(root,'scripts/ka-fixtures.mjs')))
const source=fs.readFileSync(path.join(root,'apps/desktop/tests/e2e/diagrams.spec.ts'),'utf8')
let fn=source.slice(source.indexOf('async function dragObject('),source.indexOf('// eslint-disable-next-line no-empty-pattern'))
fn=fn.replace("await page.getByLabel('Поиск объектов', { exact: true }).fill('')",'');
const dragObject=new Function('expect','return ('+stripTypeScriptTypes(fn.trim(),{mode:'strip'})+')')(expect)
const fixture=await createKaFixture(),events=[],app=await electron.launch({args:[path.join(root,'apps/desktop/out/main/index.cjs')],env:{...process.env,ELECTRON_OVERRIDE_DIST_PATH:path.join(root,'apps/desktop/node_modules/electron/dist'),FRADE_USER_DATA:path.join(fixture.destination,'publication-native-drop-probe')}})
try{
 const page=await app.firstWindow();
 const identity=await app.evaluate(({BrowserWindow})=>{const win=BrowserWindow.getAllWindows()[0];const events=[];globalThis.__fradePublicationFocus=events;for(const event of ['blur','focus'])win.on(event,()=>events.push({epoch:Date.now(),type:'main-window-'+event}));return {pid:process.pid,hwnd:win.getNativeWindowHandle().toString('hex')}});
 const hwndBytes=Buffer.from(identity.hwnd,'hex'),hwnd=(hwndBytes.length===8?hwndBytes.readBigUInt64LE():BigInt(hwndBytes.readUInt32LE())).toString();
 const ready=path.join(out,'os-ready.json'),stop=path.join(out,'os-stop'),osFile=path.join(out,'os-focus.json');
 observer=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',path.resolve('.worktrees/requests/observe-native-focus.ps1'),'-WindowHandle',hwnd,'-ExpectedPid',String(identity.pid),'-OutputPath',osFile,'-ReadyPath',ready,'-StopPath',stop],{windowsHide:true,stdio:['ignore','pipe','pipe']});
 observer.stdout.on('data',x=>observerLogs.push(x));observer.stderr.on('data',x=>observerLogs.push(x));observerDone=new Promise((yes,no)=>{observer.once('error',no);observer.once('close',yes)});
 const deadline=Date.now()+10000;while(!fs.existsSync(ready)){if(Date.now()>deadline)throw Error('OS_OBSERVER_UNAVAILABLE');await new Promise(r=>setTimeout(r,20))}
 await page.context().addInitScript(()=>{window.__fradePublicationFrame=[];for(const type of ['keydown','keyup','beforeinput'])window.addEventListener(type,event=>{if(type==='beforeinput'||event.key==='Delete'||event.key==='Backspace')window.__fradePublicationFrame.push({epoch:Date.now(),kind:type,key:event.key,inputType:event.inputType,target:event.target?.tagName,classes:String(event.target?.className??'').slice(0,100),text:document.querySelector('.geDiagramContainer')?.textContent,activeTag:document.activeElement?.tagName})},true);window.addEventListener('message',event=>{try{const value=typeof event.data==='string'?JSON.parse(event.data):event.data;if(value&&value.action==='fradeRepositoryInsert'){const el=document.querySelector('.geDiagramContainer');window.__fradePublicationFrame.push({epoch:Date.now(),action:value.action,name:value.object?.name,point:{x:value.clientX,y:value.clientY},rect:el?.getBoundingClientRect().toJSON()})}}catch{}},true)});
 await page.evaluate(()=>{window.__fradePublicationDom=[];for(const type of ['blur','focus','dragstart','dragenter','dragover','drop','dragend','pointercancel','keydown','keyup','beforeinput','input'])window.addEventListener(type,event=>{const rows=window.__fradePublicationDom;if(rows.length<500)rows.push({epoch:Date.now(),type,target:event.target?.tagName,classes:String(event.target?.className??'').slice(0,150),key:event.key,inputType:event.inputType,value:event.target?.value,types:event.dataTransfer?[...event.dataTransfer.types]:undefined})},true)});
 page.on('pageerror',e=>events.push({type:'pageerror',message:e.message}));page.on('console',m=>events.push({type:'console',message:m.text()}))
 await expect(page.getByRole('status')).toHaveText('Backend: ready')
 await app.evaluate(({dialog},paths)=>{let i=0;dialog.showOpenDialog=async()=>({canceled:false,filePaths:[paths[i++]]})},[fixture.dataRoot,fixture.metadataRoot])
 await page.getByRole('button',{name:'Открыть KA',exact:true}).click();await expect(page.locator('.status-message')).toContainText('138 объектов',{timeout:30000})
 await page.getByRole('treeitem').filter({hasText:/^_diagrams$/}).click({button:'right'});await page.getByRole('menuitem',{name:'Новая диаграмма…'}).click();await page.getByLabel('Формат диаграммы').selectOption('drawio');await page.getByLabel('Имя файла или папки').fill('Publication-drop-probe.drawio');await page.getByRole('button',{name:'Применить',exact:true}).click()
 await expect(page.locator('.diagram-slot .editor-actions').getByRole('button',{name:'Сохранить',exact:true})).toBeEnabled({timeout:20000})
 await page.locator('.diagram-slot iframe').contentFrame().locator('body').evaluate(()=>{const p=window.EditorUi.prototype,original=p.updateTypingShim;p.updateTypingShim=function(...args){window.__focusProbeUi=this;return original.apply(this,args)}});
 await dragObject(page,{name:'Маркетплейс',x:80,y:120});
 const canvas=page.locator('.diagram-slot iframe').contentFrame().locator('.geDiagramContainer');await expect(canvas.getByText('Маркетплейс',{exact:true})).toBeVisible();
 const search=page.getByLabel('Поиск объектов',{exact:true});await search.fill('Маркетплейс');
 const before=await search.evaluate(el=>({focused:document.activeElement===el,value:el.value}));
 const frame=await canvas.evaluate(()=>{const ui=window.__focusProbeUi;if(!ui)throw Error('NO_UI');const before={focus:document.hasFocus(),active:document.activeElement?.className};ui.updateTypingShim();return {before,after:{focus:document.hasFocus(),active:document.activeElement?.className}}});
 const after=await search.evaluate(el=>({focused:document.activeElement===el,value:el.value}));fs.writeFileSync(path.join(out,'deterministic.json'),JSON.stringify({before,frame,after},null,2));console.log(JSON.stringify({before,frame,after}));
}finally{if(observer){fs.writeFileSync(path.join(out,'os-stop'),'stop');await observerDone;fs.writeFileSync(path.join(out,'os-observer-logs.txt'),Buffer.concat(observerLogs))};await app.evaluate(({app})=>app.exit(0)).catch(()=>{});await app.close().catch(()=>{})}
