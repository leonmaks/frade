import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
const prefix='openspec/changes/frade-draw-multipage/evidence/'
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const required=[
  'P01 real staged filesystem obstruction refuses commit and restores before retry and restart',
  'P01-responsive-media native actual viewports zoom forced coarse reduced across six theme/density states',
  'P01-responsive-media frame actual viewports zoom forced coarse reduced across six theme/density states',
]
const core=['P01 real startup','P01 native hot preview','P01 embedded hot preview','P01 parked required frame','P01 real frame chord','P01 actual required frame refusal','P01 real staged filesystem obstruction','P01 actual frame close and reopen','P01 actual restored readonly frame','P01-LOWER actual canvas F6 entry']
const demand=(value,error)=>{if(!value)throw Error(error)}
const key=value=>value.file+'\0'+value.title
function validate(plan){
  demand(plan.collection===prefix+'desktop-matrix-list.json','COLLECTION_PATH')
  const raw=readFileSync(resolve(plan.collection))
  demand(hash(raw)===plan.collectionSha256,'COLLECTION_HASH')
  const collection=JSON.parse(raw.toString().replace(/^\uFEFF/,'')),all=[]
  const walk=(suite,file)=>{for(const spec of suite.specs??[])all.push({file,title:spec.title});for(const child of suite.suites??[])walk(child,file??child.file??child.title)}
  for(const suite of collection.suites)walk(suite,suite.file??suite.title)
  demand(!(collection.errors??[]).length,'COLLECTION_ERRORS')
  demand(all.length===125&&plan.collected===125,'DECLARED_CASE_COUNT')
  const declared=new Set(all.map(key)),selected=new Set(plan.cases.map(key))
  demand(selected.size===plan.cases.length&&plan.selected===selected.size,'DUPLICATE_OR_COUNT')
  for(const item of selected)demand(declared.has(item),'UNDECLARED_CASE')
  for(const title of required){const matches=all.filter(x=>x.title===title);demand(matches.length===1&&selected.has(key(matches[0])),'MISSING_REQUIRED_UNIQUE_CASE:'+title)}
  for(const start of core){const matches=all.filter(x=>x.title.startsWith(start));demand(matches.length===1&&selected.has(key(matches[0])),'MISSING_CORE_CASE:'+start)}
  const groups={lde:all.filter(x=>x.file==='ui-contract-light-diagram-editor.spec.ts'),performance:all.filter(x=>x.file==='ui-contract-theme-performance.spec.ts'),p95:all.filter(x=>x.title.includes('p95')),fui:all.filter(x=>x.title.includes('P01-FUI'))}
  demand(groups.lde.length===23&&groups.performance.length===2&&groups.p95.length===2&&groups.fui.length>0,'SOURCE_CASE_GROUPS')
  for(const [name,items]of Object.entries(groups))for(const item of items)demand(selected.has(key(item)),'MISSING_GROUP_CASE:'+name+':'+item.title)
  demand(Object.keys(plan.sourceHashes).length===4,'SOURCE_FILE_SET')
  for(const [file,digest]of Object.entries(plan.sourceHashes)){demand(/^apps\/desktop\/tests\/e2e\/ui-contract-(light-diagram-editor|theme|vscode-dark-2026|theme-performance)\.spec\.ts$/.test(file),'SOURCE_PATH');demand(hash(readFileSync(resolve(file)))===digest,'SOURCE_HASH')}
  return {collected:all.length,selected:selected.size,uniqueRequired:required.length,core:core.length,groups:Object.fromEntries(Object.entries(groups).map(([name,items])=>[name,items.length]))}
}
const plan=JSON.parse(readFileSync(prefix+'presentation-execution-plan.json','utf8'))
const positive=validate(plan),negatives=[]
for(const title of required){const mutant=structuredClone(plan);mutant.cases=mutant.cases.filter(x=>x.title!==title);mutant.selected=mutant.cases.length;let error;try{validate(mutant)}catch(caught){error=caught.message}demand(error?.startsWith('MISSING_REQUIRED_UNIQUE_CASE:'),'NEGATIVE_DID_NOT_FAIL_REQUIRED_PATH');negatives.push({removed:title,result:'REJECTED',error})}
console.log(JSON.stringify({status:'PASS',meaning:'PLAN INTEGRITY ONLY; NO RUNTIME EXECUTION CLAIM',positive,negatives},null,2))
