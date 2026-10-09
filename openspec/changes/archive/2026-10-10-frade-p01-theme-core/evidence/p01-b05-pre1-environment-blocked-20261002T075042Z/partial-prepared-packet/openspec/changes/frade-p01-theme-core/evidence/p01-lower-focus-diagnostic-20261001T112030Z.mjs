import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const root=process.cwd();
const require=createRequire(path.join(root,'apps/desktop/package.json'));
const { _electron: electron, expect }=require('@playwright/test');
const ts=require('typescript');
const fsAsync=await import('node:fs/promises');
const {createKaFixture}=await import(pathToFileURL(path.join(root,'scripts/ka-fixtures.mjs')).href);
const sourcePath=path.join(root,'apps/desktop/tests/e2e/ui-contract-theme.spec.ts');
const source=fs.readFileSync(sourcePath,'utf8');
const start=source.indexOf('async function diagramFixture('),end=source.indexOf('async function previewDark(');
if(start<0||end<=start)throw Error('Helper markers missing');
const helper=source.slice(start,end);
const compiled=ts.transpileModule(helper,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {diagramFixture,finishDiagramFixture}=new Function('electron','expect','createKaFixture','mkdir','writeFile','join','resolve',compiled+';return {diagramFixture,finishDiagramFixture}')(electron,expect,createKaFixture,fsAsync.mkdir,fsAsync.writeFile,path.join,(p)=>path.resolve(root,'apps/desktop',p));

const started=new Date().toISOString(),stamp=started.replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
const out=path.join(root,'openspec/changes/frade-p01-theme-core/evidence/p01-lower-focus-observation-'+stamp);fs.mkdirSync(out,{recursive:false});
const observations=[];
for(const mode of ['light','dark','high-contrast'])for(const density of ['compact','comfortable']){
 const f=await diagramFixture('frame',{mode,density});
 try{
  const diskBefore=await fsAsync.readFile(f.file,'utf8');const frame=f.page.frameLocator('iframe').locator('body');
  const state=()=>frame.evaluate(()=>{const ui=window.__p01Ui,g=ui.editor.graph;return {xml:window.mxUtils.getXml(ui.editor.getGraphXml()),undo:ui.editor.undoManager.history.length,cursor:ui.editor.undoManager.indexOfNextAdd,selection:g.getSelectionCells().map(c=>c.id),scale:g.view.scale,translate:{x:g.view.translate.x,y:g.view.translate.y},preferences:{...localStorage}};});
  const before=await state();
  const actual=await frame.evaluate(body=>{
   const controls=Array.from(body.querySelectorAll('.geTabContainer .geTab,.geTabContainer .geButton'));
   const active=document.activeElement;const rows=controls.map(node=>{const style=getComputedStyle(node),rect=node.getBoundingClientRect();node.focus();const obtained=document.activeElement===node;return {tag:node.tagName,class:node.className,title:node.getAttribute('title'),tabIndex:node.tabIndex,tabindexAttribute:node.getAttribute('tabindex'),role:node.getAttribute('role'),ariaLabel:node.getAttribute('aria-label'),keyboardAttributes:{accesskey:node.getAttribute('accesskey'),onkeydown:node.getAttribute('onkeydown'),onkeyup:node.getAttribute('onkeyup')},directFocusObtained:obtained,focusVisible:obtained&&node.matches(':focus-visible'),outline:{style:style.outlineStyle,width:style.outlineWidth,color:style.outlineColor},backgroundImage:style.backgroundImage,rect:rect.toJSON()};});if(active instanceof HTMLElement)active.focus();
   const ui=window.__p01Ui;return {rows,layout:{container:ui.tabContainer?.getBoundingClientRect().toJSON(),scroller:ui.tabScroller?.getBoundingClientRect().toJSON(),canvas:ui.editor.graph.container.getBoundingClientRect().toJSON()},actions:['insertPage','previousPage','nextPage'].map(name=>{const a=ui.actions.get(name);return {name,present:!!a,label:a?.label,shortcut:a?.shortcut,enabled:a?.isEnabled?.()};})};
  });
  const navigation=[];
  if(mode==='dark'&&density==='comfortable'){
   await frame.evaluate(()=>window.__p01Ui.editor.graph.container.focus());
   for(let index=0;index<30;index++){await f.page.keyboard.press('Tab');navigation.push({index,parent:await f.page.evaluate(()=>({tag:document.activeElement?.tagName,class:document.activeElement?.className,label:document.activeElement?.getAttribute('aria-label')})),frame:await frame.evaluate(()=>{const n=document.activeElement;return {tag:n?.tagName,class:n?.className,label:n?.getAttribute('aria-label')??n?.getAttribute('title'),lower:!!n?.closest('.geTabContainer'),focusVisible:n?.matches(':focus-visible')};})});}
  }
  const after=await state();const fileUnchanged=diskBefore===await fsAsync.readFile(f.file,'utf8');if(JSON.stringify(before)!==JSON.stringify(after)||!fileUnchanged)throw Error('Read-only diagnostic changed document/viewport/undo/selection/preferences');
  await f.page.screenshot({path:path.join(out,mode+'-'+density+'.png')});observations.push({mode,density,actual,navigation,navigationScope:navigation.length?'30 actual Tab inputs, no activation':'attributes and direct focus only; sequential Tab NOT_RUN',before,after,fileUnchanged});
 }finally{await finishDiagramFixture(f.app);}
}
const result={startedAtUtc:started,finishedAtUtc:new Date().toISOString(),status:'OBSERVED',scope:'Read-only actual lower-control focus/attributes/navigation and complete layout context, no source/DOM-semantics changes; helper reused exactly',sourcePath,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),observations,visualApproval:'NOT_APPROVED'};fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,observations:observations.length,focusable:observations.map(o=>({mode:o.mode,density:o.density,rows:o.actual.rows.length,directFocus:o.actual.rows.filter(r=>r.directFocusObtained).length,sequentialLower:o.navigation.filter(r=>r.frame.lower).length}))}));
