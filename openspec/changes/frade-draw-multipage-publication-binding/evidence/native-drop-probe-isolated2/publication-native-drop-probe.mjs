import fs from 'node:fs'
import path from 'node:path'
import {createRequire,stripTypeScriptTypes} from 'node:module'
import {pathToFileURL} from 'node:url'
const root=path.resolve('.worktrees/multipage-publication-clean-3'),out=path.resolve('openspec/changes/frade-draw-multipage-publication-binding/evidence/native-drop-probe-' + (process.argv[2] ?? 'diagnostic'))
fs.mkdirSync(out,{recursive:true})
const req=createRequire(path.join(root,'apps/desktop/package.json')),{_electron:electron,expect}=req('@playwright/test')
const {createKaFixture}=await import(pathToFileURL(path.join(root,'scripts/ka-fixtures.mjs')))
const source=fs.readFileSync(path.join(root,'apps/desktop/tests/e2e/diagrams.spec.ts'),'utf8')
let fn=source.slice(source.indexOf('async function dragObject('),source.indexOf('// eslint-disable-next-line no-empty-pattern'))
fn=fn.replace("if (!from || !to) throw Error('Drag surfaces unavailable')", "if (!from || !to) throw Error('Drag surfaces unavailable'); console.log('DRAG_GEOMETRY',JSON.stringify({name,from,to,options}));")
const dragObject=new Function('expect','return ('+stripTypeScriptTypes(fn.trim(),{mode:'strip'})+')')(expect)
const fixture=await createKaFixture(),events=[],app=await electron.launch({args:[path.join(root,'apps/desktop/out/main/index.cjs')],env:{...process.env,ELECTRON_OVERRIDE_DIST_PATH:path.join(root,'apps/desktop/node_modules/electron/dist'),FRADE_USER_DATA:path.join(fixture.destination,'publication-native-drop-probe')}})
try{
 const page=await app.firstWindow();page.on('pageerror',e=>events.push({type:'pageerror',message:e.message}));page.on('console',m=>events.push({type:'console',message:m.text()}))
 await expect(page.getByRole('status')).toHaveText('Backend: ready')
 await app.evaluate(({dialog},paths)=>{let i=0;dialog.showOpenDialog=async()=>({canceled:false,filePaths:[paths[i++]]})},[fixture.dataRoot,fixture.metadataRoot])
 await page.getByRole('button',{name:'Открыть KA',exact:true}).click();await expect(page.locator('.status-message')).toContainText('138 объектов',{timeout:30000})
 await page.getByRole('treeitem').filter({hasText:/^_diagrams$/}).click({button:'right'});await page.getByRole('menuitem',{name:'Новая диаграмма…'}).click();await page.getByLabel('Формат диаграммы').selectOption('drawio');await page.getByLabel('Имя файла или папки').fill('Publication-drop-probe.drawio');await page.getByRole('button',{name:'Применить',exact:true}).click()
 await expect(page.locator('.diagram-slot .editor-actions').getByRole('button',{name:'Сохранить',exact:true})).toBeEnabled({timeout:20000})
 await dragObject(page,{name:'Маркетплейс',x:80,y:120})
 await dragObject(page,{name:'CRM',x:400,y:300})
 const canvas=page.locator('.diagram-slot iframe').contentFrame().locator('.geDiagramContainer')
 const state=await canvas.evaluate(el=>({text:el.textContent,rect:el.getBoundingClientRect().toJSON(),html:el.innerHTML.slice(0,30000)}))
 const screen=await app.evaluate(({BrowserWindow,screen})=>({windows:BrowserWindow.getAllWindows().map(w=>({bounds:w.getBounds(),contentBounds:w.getContentBounds(),visible:w.isVisible()})),displays:screen.getAllDisplays().map(d=>({bounds:d.bounds,workArea:d.workArea,scaleFactor:d.scaleFactor}))}))
 await page.screenshot({path:path.join(out,'after-two-drops.png')})
 await page.locator('.diagram-slot .editor-actions').getByRole('button',{name:'Сохранить',exact:true}).click()
 await expect(page.locator('.dirty-dot')).toHaveCount(0); const raw=await fs.promises.readFile(path.join(fixture.dataRoot,'_diagrams/Publication-drop-probe.drawio'),'utf8')
 fs.writeFileSync(path.join(out,'state.json'),JSON.stringify({state,screen,events,persisted:raw},null,2)+'\n')
 console.log(JSON.stringify({out,text:state.text,rect:state.rect,screen,persistedContainsCRM:raw.includes('CRM')})); if(!state.text.includes('CRM')||!state.text.includes('Маркетплейс'))throw Error('MISSING_NATIVE_DROPS')
}finally{await app.evaluate(({app})=>app.exit(0)).catch(()=>{});await app.close().catch(()=>{})}
