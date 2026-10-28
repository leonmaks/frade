import fs from 'node:fs'
import path from 'node:path'
import {createRequire,stripTypeScriptTypes} from 'node:module'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
const root=fs.realpathSync('.worktrees/multipage-publication-clean-4'),e='openspec/changes/frade-draw-multipage-publication-binding/evidence/'
const out=e+'c8-native-first-drag-probe'
if(fs.existsSync(out))throw Error('IMMUTABLE_PROBE')
fs.mkdirSync(out,{recursive:true})
const source=fs.readFileSync(path.join(root,'apps/desktop/tests/e2e/ui-contract-theme.spec.ts'),'utf8')
const req=createRequire(path.join(root,'apps/desktop/package.json')),{_electron:electron,expect:baseExpect}=req('@playwright/test'),expect=baseExpect.configure({timeout:10000})
const {mkdir,writeFile}=await import('node:fs/promises'),{createKaFixture}=await import(pathToFileURL(path.join(root,'scripts/ka-fixtures.mjs')))
const extract=(a,b)=>stripTypeScriptTypes(source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a))).trim(),{mode:'strip'})
const fixtureText=extract('async function diagramFixture(','async function finishDiagramFixture('),semanticsText=extract('async function fuiSemantics(','async function fuiMove('),moveText=extract('async function fuiMove(','async function fuiDirtyObject(')
const fixture=new Function('electron','expect','createKaFixture','mkdir','join','writeFile','resolve','return ('+fixtureText+')')(electron,expect,createKaFixture,mkdir,path.join,writeFile,(...a)=>path.resolve(root,'apps/desktop',...a))
const semantics=new Function('return ('+semanticsText+')')(),move=new Function('expect','fuiSemantics','return ('+moveText+')')(expect,semantics)
const results=[]
for(const mode of ['natural-1','natural-2','join-paint-delay','join-paint-delay-ready']){
 let f
 try{
  f=await fixture('native',{mode:'light',density:'compact'},async page=>{
   await page.evaluate(({delayed})=>{
    const w=window;w.__dragProbe=[]
    const snap=(type,e)=>{const barrier=document.querySelector('.frade-theme-commit-barrier'),canvas=document.querySelector('.frade-canvas .canvas');w.__dragProbe.push({time:performance.now(),type,barrierHidden:barrier?.hidden,barrierDisplay:barrier?getComputedStyle(barrier).display:null,canvasVisibility:canvas?getComputedStyle(canvas).visibility:null,rootRevision:document.documentElement.dataset.fradeRevision,nativeRevision:canvas?.getAttribute('data-frade-revision'),target:e?.target?.outerHTML?.slice(0,220),x:e?.clientX,y:e?.clientY,buttons:e?.buttons,focused:document.hasFocus()})}
    for(const t of ['pointerdown','pointerup','pointercancel','mousedown','mouseup'])document.addEventListener(t,e=>snap(t,e),true)
    const obs=new MutationObserver(ms=>{if(ms.some(m=>m.target?.classList?.contains('frade-theme-commit-barrier')||m.target?.classList?.contains('canvas')))snap('mutation')});obs.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['hidden','style','data-frade-revision']})
    if(delayed){const original=requestAnimationFrame;w.requestAnimationFrame=cb=>original.call(w,t=>{const c=document.querySelector('.frade-canvas .canvas'),b=document.querySelector('.frade-theme-commit-barrier');if(c&&b&&!b.hidden)setTimeout(()=>cb(t),100);else cb(t)})}
   },{delayed:mode.startsWith('join-paint-delay')})
  })
  if(mode.endsWith('-ready')){
   await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
   await expect(f.page.locator('.frade-canvas .canvas')).toHaveAttribute('data-frade-revision',(await f.page.locator('html').getAttribute('data-frade-revision')))
  }
  const start=await f.page.evaluate(()=>({time:performance.now(),barrierHidden:document.querySelector('.frade-theme-commit-barrier')?.hidden}))
  let movement,error
  try{movement=await move(f,'native')}catch(x){error=String(x)}
  const observations=await f.page.evaluate(()=>window.__dragProbe),state=await semantics(f,'native')
  const result={mode,diagnosticOnly:true,start,movement,error,observations,state}
  fs.writeFileSync(out+'/'+mode+'.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'})
  await f.page.screenshot({path:out+'/'+mode+'.png'})
  results.push({mode,movement,error,down:observations.filter(x=>x.type==='pointerdown'||x.type==='mousedown')})
  console.log(JSON.stringify(results.at(-1)))
 }finally{if(f){await f.app.evaluate(({app})=>app.exit(0)).catch(()=>{});await f.app.close().catch(()=>{})}}
}
fs.writeFileSync(out+'/summary.json',JSON.stringify({at:new Date().toISOString(),sourceSha256:createHash('sha256').update(source).digest('hex'),originalMovementBodySha256:createHash('sha256').update(moveText).digest('hex'),productionSourceChanged:false,originalAssertionBodyUnchanged:true,diagnosticOnly:true,results},null,2)+'\n',{flag:'wx'})
