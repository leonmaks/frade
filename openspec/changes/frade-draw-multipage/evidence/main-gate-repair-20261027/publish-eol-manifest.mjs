import fs from 'node:fs'
import path from 'node:path'
import { sha256, currentInputs, sourceSetSha256, verifyDrawingPagesCurrent, verifyInputBytes, bootstrapPin } from '../../../../../tests/ui-contract/drawing-pages-current.mjs'
import { audit, own } from './audit.mjs'
const e='openspec/changes/frade-draw-multipage/evidence/',target=e+'source-adoption-manifest.json',parentFile=own+'candidate-before-eol/'+target,parentRaw=fs.readFileSync(parentFile),parent=JSON.parse(parentRaw),parentHash='4a398fd66b362cdd850fbbd2e03af661079b73cc8b69c6749e389004ba538fb8'
if(fs.existsSync(own+'eol-manifest-publication.json'))throw Error('IMMUTABLE_PUBLICATION_EXISTS')
if(sha256(parentRaw)!==parentHash||!fs.readFileSync(target).equals(parentRaw))throw Error('PARENT_DRIFT')
const preservation=audit(),inputs=currentInputs(process.cwd()),progress=JSON.parse(fs.readFileSync(own+'runtime-progress-eol.json'))
if(progress.status!=='PASS'||progress.sourceSet!==sourceSetSha256(inputs)||progress.completed.length!==8||progress.selection.length!==7)throw Error('FRESH_COMPLETE_EOL_RUNTIME_REQUIRED')
for(const entry of parent.entries)if(sha256(fs.readFileSync(entry.originalFile))!==entry.originalSha256)throw Error('HISTORICAL_ORIGIN_DRIFT')
const manifest={...parent,meaning:parent.meaning+' Permanent one-file generated inventory LF checkout control, explicitly source-bound and freshly executed; previous17-origin main proof preserved.',currentInputs:inputs,sourceSetSha256:sourceSetSha256(inputs),executions:progress.selection.map(run=>JSON.parse(fs.readFileSync(run+'/execution.json'))),desktopBuild:JSON.parse(fs.readFileSync(e+'build-selection.json')),checkoutRepair:{parent:{file:parentFile,sha256:parentHash},control:'packages/ui-workspace/tokens/.gitattributes',allHistoricalEntriesUnchanged:true,sourceAudit:{file:own+'preservation-before-eol-runtime.json',sha256:sha256(fs.readFileSync(own+'preservation-before-eol-runtime.json'))}}}
const caseKey=x=>path.basename(x.file.replaceAll('\\','/'))+'\0'+x.title,caseInventory=[]
for(const previous of parent.executions){const current=manifest.executions.find(x=>x.role===previous.role),keys=new Set(current.cases.map(caseKey));if(current.cases.length!==previous.cases.length||previous.cases.some(x=>!keys.has(caseKey(x))))throw Error('CASE_INVENTORY_DRIFT:'+previous.role);caseInventory.push({role:previous.role,previous:previous.cases.length,current:current.cases.length,allPreviousRetained:true})}
if(JSON.stringify(parent.entries)!==JSON.stringify(manifest.entries)||manifest.entries.length!==17)throw Error('HISTORICAL_ENTRY_DRIFT')
const verified=verifyDrawingPagesCurrent(process.cwd(),manifest),negativeInputs=[]
for(const input of inputs){try{verifyInputBytes(input,Buffer.concat([fs.readFileSync(input.file),Buffer.from('mutation')]));throw Error('MUTATION_ACCEPTED')}catch(error){if(!String(error).includes('CURRENT_SOURCE_HASH:'))throw error;negativeInputs.push(input.file)}}
const raw=Buffer.from(JSON.stringify(manifest,null,2)+'\n'),pinBefore=sha256(fs.readFileSync(bootstrapPin))
fs.writeFileSync(target,raw);fs.writeFileSync(bootstrapPin,"// Trusted bootstrap pin: reviewed separately; not included in its own source digest.\nexport const drawingPagesAdoptionManifestSha256 = '"+sha256(raw)+"'\n")
if(sourceSetSha256(currentInputs(process.cwd()))!==manifest.sourceSetSha256)throw Error('PUBLICATION_CHANGED_SOURCE')
const record={status:'PASS',publishedAt:new Date().toISOString(),parent:{file:parentFile,sha256:parentHash},manifest:{file:target,sha256:sha256(raw)},sourceSet:manifest.sourceSetSha256,pin:{file:bootstrapPin,before:pinBefore,after:sha256(fs.readFileSync(bootstrapPin)),excludedFromSelfDigest:true,independentPOSTRequired:true},entriesUnchanged:17,caseInventory,mutationInputsRejected:negativeInputs.length,verified,preservation}
fs.writeFileSync(own+'eol-manifest-publication.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({...record,preservation:undefined}))
