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
const out=path.join(root,'openspec/changes/frade-p01-theme-core/evidence/p01-frame-chrome-observation-'+stamp);
fs.mkdirSync(out,{recursive:false});
const observations=[],violations=[];
for(const mode of ['light','dark','high-contrast'])for(const density of ['compact','comfortable']){
 const f=await diagramFixture('frame',{mode,density});
 try{
  const before=await fsAsync.readFile(f.file,'utf8');
  const actual=await f.page.frameLocator('iframe').locator('body').evaluate((body)=>{
   const root=document.documentElement;
   const reference=document.createElement('span');reference.style.backgroundColor='var(--frade-frame-surface-panel)';reference.style.color='var(--frade-frame-text-primary)';body.append(reference);const expected={background:getComputedStyle(reference).backgroundColor,color:getComputedStyle(reference).color};reference.remove();
   const rows=Array.from(body.querySelectorAll('.geTabContainer,.geTabContainer .geTab,.geTabContainer .geButton,.geTabContainer .geControlTab')).map(node=>{const s=getComputedStyle(node),b=node.getBoundingClientRect();let background='';for(let n=node;n;n=n.parentElement){const bg=getComputedStyle(n).backgroundColor;if(bg!=='rgba(0, 0, 0, 0)'&&bg!=='transparent'){background=bg;break;}}return {tag:node.tagName,class:node.className,label:node.getAttribute('aria-label')??node.getAttribute('title')??node.textContent?.trim(),role:node.getAttribute('role'),background,color:s.color,rect:b.toJSON(),visible:b.width>0&&b.height>0&&s.visibility!=='hidden',selected:node.classList.contains('geActivePage')};});
   return {expected,rows,frameRevision:root.getAttribute('data-frade-frame-revision'),theme:root.getAttribute('data-frade-frame-theme'),density:root.getAttribute('data-frade-frame-density')};
  });
  const screenshot=path.join(out,mode+'-'+density+'.png');await f.page.screenshot({path:screenshot});
  const row=actual.rows.find(r=>r.class.split(' ').includes('geTabContainer')&&r.visible);
  if(!row)violations.push({mode,density,rule:'ACTUAL_BOTTOM_UI_MISSING'});
  else if(row.background!==actual.expected.background)violations.push({mode,density,rule:'FDS-003/FDS-009',consumer:row,expected:actual.expected});
  const unchanged=before===await fsAsync.readFile(f.file,'utf8');if(!unchanged)violations.push({mode,density,rule:'DOCUMENT_BYTES_CHANGED'});
  observations.push({mode,density,actual,screenshot,documentBytesUnchanged:unchanged});
 }finally{await finishDiagramFixture(f.app);}
}
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const result={startedAtUtc:started,finishedAtUtc:new Date().toISOString(),status:violations.length?'FAIL':'PASS',scope:'Read-only actual DOM bottom chrome diagnostic, no production/source changes; test helper reused exactly from approved P01 fixture',helperSource:sourcePath,helperSourceSha256:sha(source),helperSha256:sha(helper),observations,violations,visualApproval:'NOT_APPROVED'};
fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,out,observations:observations.length,violations}));process.exitCode=violations.length?1:0;
