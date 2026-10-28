import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createRequire,stripTypeScriptTypes} from 'node:module'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
const owner=fs.realpathSync('.'),runtimeRoot=owner,e='openspec/changes/frade-draw-multipage-publication-binding/evidence/',out=e+'native-readiness-portable-regression'
if(fs.existsSync(out))throw Error('IMMUTABLE_REGRESSION')
fs.mkdirSync(out,{recursive:true})
const req=createRequire(path.join(owner,'apps/desktop/package.json')),{_electron:electron,expect:baseExpect}=req('@playwright/test'),expect=baseExpect.configure({timeout:10000})
const {mkdir,writeFile}=await import('node:fs/promises'),{createKaFixture}=await import(pathToFileURL(path.join(owner,'scripts/ka-fixtures.mjs')))
const source=fs.readFileSync('apps/desktop/tests/e2e/ui-contract-theme.spec.ts','utf8'),legacy=Buffer.from(JSON.parse(fs.readFileSync('packages/ui-workspace/tests/ui-contract/presentation-staging-refusal-adoption.json')).entries.find(x=>x.file==='apps/desktop/tests/e2e/ui-contract-theme.spec.ts').predecessor.sourceBase64,'base64').toString()
const sha=s=>createHash('sha256').update(s).digest('hex')
const extract=(s,a,b)=>stripTypeScriptTypes(s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a))).trim(),{mode:'strip'})
const fixtureText=extract(source,'async function diagramFixture(','async function finishDiagramFixture('),oldFixture=extract(legacy,'async function diagramFixture(','async function finishDiagramFixture('),moveText=extract(source,'async function fuiMove(','async function fuiDirtyObject('),semanticsText=extract(source,'async function fuiSemantics(','async function fuiMove(')
assert.equal(sha(moveText),'b8769434c93055d942c0479d02b9c674f0e90fdf710489174182ae3cea709426')
const start=fixtureText.indexOf("  if (kind === 'native') {",fixtureText.indexOf('toBeEnabled')),end=fixtureText.indexOf("  if (kind === 'frame') {",start)
assert.ok(start>=0&&end>start);assert.equal(fixtureText.slice(0,start)+fixtureText.slice(end),oldFixture)
const fixtureFor=control=>new Function('electron','expect','createKaFixture','mkdir','join','writeFile','resolve','return ('+(control?oldFixture:fixtureText)+')')(electron,expect,createKaFixture,mkdir,path.join,writeFile,(...a)=>path.resolve(runtimeRoot,'apps/desktop',...a))
const semantics=new Function('return ('+semanticsText+')')(),move=new Function('expect','fuiSemantics','return ('+moveText+')')(expect,semantics),results=[]
for(const control of [true,false]){
 const mode=control?'exact-c8-unready-control':'actual-pre26-ready-fixture'
 let f,page,resolvePage,fixtureResolved=false,fixturePromise
 const pageAvailable=new Promise(resolve=>resolvePage=resolve)
 try{
  fixturePromise=fixtureFor(control)('native',{mode:'light',density:'compact'},async p=>{
   page=p
   await p.evaluate(()=>{
    const w=window,raf=requestAnimationFrame,gate=w.__nativeJoinGate={blocked:false,released:false,held:[],events:[],releasedAt:null}
    const sample=e=>{const b=document.querySelector('.frade-theme-commit-barrier'),c=document.querySelector('.frade-canvas .canvas');gate.events.push({time:performance.now(),type:e.type,x:e.clientX,y:e.clientY,target:e.target?.outerHTML?.slice(0,230),barrierHidden:b?.hidden,canvasVisible:c?getComputedStyle(c).visibility:null,focused:document.hasFocus()})}
    w.__releaseNativeJoin=()=>{if(gate.released)return;gate.released=true;gate.releasedAt=performance.now();const held=gate.held.splice(0);for(const cb of held)cb()}
    for(const t of ['pointerdown','pointerup','mousedown','mouseup'])document.addEventListener(t,e=>{sample(e);if(e.type==='mouseup'&&e.clientX===724&&e.clientY===403)w.__releaseNativeJoin()},true)
    w.requestAnimationFrame=cb=>raf.call(w,t=>{const b=document.querySelector('.frade-theme-commit-barrier'),c=document.querySelector('.frade-canvas .canvas');if(!gate.released&&c&&getComputedStyle(c).visibility==='visible'&&b&&!b.hidden){gate.blocked=true;gate.held.push(()=>cb(t))}else cb(t)})
   })
   resolvePage()
  }).then(x=>{fixtureResolved=true;f=x;return x})
  // Observe rejection immediately; there is no unhandled asynchronous fixture failure.
  const observed=fixturePromise.then(value=>({value}),error=>({error}))
  await pageAvailable
  await page.waitForFunction(()=>window.__nativeJoinGate.blocked,null,{polling:10,timeout:1500})
  const gated=await page.evaluate(()=>({time:performance.now(),barrierHidden:document.querySelector('.frade-theme-commit-barrier')?.hidden,held:window.__nativeJoinGate.held.length,nativeRevision:document.querySelector('.frade-canvas .canvas')?.getAttribute('data-frade-revision'),rootRevision:document.documentElement.dataset.fradeRevision}))
  assert.equal(gated.barrierHidden,false);assert.ok(gated.held>0);assert.equal(gated.nativeRevision,gated.rootRevision)
  if(control){const settled=await observed;if(settled.error)throw settled.error;assert.equal(fixtureResolved,true)}
  else{
   assert.equal(fixtureResolved,false,'repaired fixture must not return while native join paint is held')
   await page.evaluate(()=>new Promise(resolve=>setTimeout(()=>{window.__releaseNativeJoin();resolve()},100)))
   const settled=await observed;if(settled.error)throw settled.error
  }
  let movement,error
  try{movement=await move(f,'native')}catch(x){error=String(x)}
  const observations=await page.evaluate(()=>{const g=window.__nativeJoinGate;return{blocked:g.blocked,released:g.released,releasedAt:g.releasedAt,events:g.events}}),state=await semantics(f,'native')
  const result={mode,diagnosticOnly:true,fixtureResolvedWhenHeld:control,gated,movement,error,observations,state}
  fs.writeFileSync(out+'/'+mode+'.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'})
  await page.screenshot({path:out+'/'+mode+'.png'})
  results.push(result)
  console.log(JSON.stringify({mode,movement,error,down:observations.events.filter(x=>x.type==='pointerdown'&&x.x===694).map(x=>({target:x.target,barrierHidden:x.barrierHidden,focused:x.focused}))}))
 }finally{
  if(page)await page.evaluate(()=>window.__releaseNativeJoin?.()).catch(()=>{})
  if(!f&&fixturePromise)f=await fixturePromise.catch(()=>undefined)
  if(f){await f.app.evaluate(({app})=>app.exit(0)).catch(()=>{});await f.app.close().catch(()=>{})}
 }
}
const [control,actual]=results
assert.ok(control.error?.includes('Timeout 10000ms'));assert.equal(control.movement,undefined)
assert.ok(control.observations.events.some(x=>x.type==='pointerdown'&&x.x===694&&!x.barrierHidden&&x.target.includes('frade-theme-commit-barrier')))
assert.equal(actual.error,undefined);assert.equal(actual.movement.moved,'translate(170,140)')
assert.ok(actual.observations.events.some(x=>x.type==='pointerdown'&&x.x===694&&x.barrierHidden&&x.target.includes('Authored')))
fs.writeFileSync(out+'/summary.json',JSON.stringify({at:new Date().toISOString(),status:'PASS',method:'event-gated native join paint; old control releases on original mouseup, repaired fixture remains pending until explicit100ms release',originalMovementBodySha256:sha(moveText),sourceSha256:sha(source),runtimeRoot,controlExactlyC8Fixture:true,actualFixturePendingWhileCovered:true,originalMoveAssertionsAnd10000msDeadlineUnchanged:true,noProductionChanges:true,currentProfileProofClaim:false,results},null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify({regression:'PASS',oldControlFailsOriginalGeometry:true,actualFixturePendingUntilReady:true,actualOriginalMovementPass:true}))
