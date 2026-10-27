import fs from 'node:fs'
import path from 'node:path'
import { sha256, currentInputs, sourceSetSha256, verifyDrawingPagesCurrent, verifyInputBytes, bootstrapPin } from '../../../../../tests/ui-contract/drawing-pages-current.mjs'
import { publicationByteForms, canonicalPublicationBytes } from '../../../../../tests/ui-contract/drawing-pages-adoption.mjs'
import { audit, own } from './audit.mjs'
const e='openspec/changes/frade-draw-multipage/evidence/',target=e+'source-adoption-manifest.json',parentFile=own+'prior-candidate/'+target,parentRaw=fs.readFileSync(parentFile),parent=JSON.parse(parentRaw),baseline=JSON.parse(fs.readFileSync(own+'baseline.json'))
if(fs.existsSync(own+'manifest-publication.json'))throw Error('IMMUTABLE_PUBLICATION_EXISTS')
if(sha256(parentRaw)!==baseline.parentManifestSha256||!fs.readFileSync(target).equals(parentRaw))throw Error('PARENT_MANIFEST_DRIFT')
const protection=audit(),progress=JSON.parse(fs.readFileSync(own+'runtime-progress.json')),inputs=currentInputs(process.cwd())
if(progress.status!=='PASS'||progress.completed.length!==8||progress.selection.length!==7||progress.sourceSet!==sourceSetSha256(inputs))throw Error('FRESH_COMPLETE_MAIN_RUNTIME_REQUIRED')
for(const entry of parent.entries){
 if(sha256(fs.readFileSync(entry.originalFile))!==entry.originalSha256)throw Error('OLD_ORIGIN_DRIFT')
 const live=fs.readFileSync(entry.file)
 if(![entry.adoptedSha256,entry.canonicalSha256,entry.checkoutSha256].includes(sha256(live)))throw Error('OLD_ADOPTED_DRIFT:'+entry.file)
 if(entry.canonicalSha256&&sha256(canonicalPublicationBytes(live))!==entry.canonicalSha256)throw Error('OLD_CANONICAL_DRIFT')
}
const added=baseline.origins.map(origin=>{
 const raw=fs.readFileSync(origin.proposedSnapshot)
 if(sha256(raw)!==origin.originalSha256)throw Error('PROPOSED_ORIGIN_DRIFT')
 const originalFile=e+'origin/source/'+origin.file
 if(fs.existsSync(originalFile))throw Error('ORIGIN_ALREADY_EXISTS')
 fs.mkdirSync(path.dirname(originalFile),{recursive:true});fs.writeFileSync(originalFile,raw)
 const forms=publicationByteForms(fs.readFileSync(origin.file))
 return {file:origin.file,originalFile,originalSha256:origin.originalSha256,adoptedSha256:forms.sha256,canonicalSha256:forms.canonicalSha256,checkoutSha256:forms.checkoutSha256}
})
const manifest={...parent,meaning:parent.meaning+' Main repair: exact3 additional historical origins, preserved dirty dependency/untracked source inputs, branding removal; parent remains immutable. Historical replay is not current runtime evidence.',entries:[...parent.entries,...added].sort((a,b)=>a.file.localeCompare(b.file,'en')),currentInputs:inputs,sourceSetSha256:sourceSetSha256(inputs),executions:progress.selection.map(run=>JSON.parse(fs.readFileSync(run+'/execution.json'))),desktopBuild:JSON.parse(fs.readFileSync(e+'build-selection.json')),mainRepair:{parent:{file:parentFile,sha256:sha256(parentRaw)},baseline:{file:own+'baseline.json',sha256:sha256(fs.readFileSync(own+'baseline.json'))},unchangedHistoricalOrigins:parent.entries.length,additionalOrigins:baseline.origins}}
const caseKey=x=>path.basename(x.file.replaceAll('\\','/'))+'\0'+x.title,caseInventory=[]
for(const previous of parent.executions){
 const current=manifest.executions.find(x=>x.role===previous.role),keys=new Set(current.cases.map(caseKey)),addedCount=previous.role==='workspace-direct'?8:previous.role==='draw-visual'?1:0
 if(previous.cases.some(x=>!keys.has(caseKey(x)))||current.cases.length!==previous.cases.length+addedCount)throw Error('LOST_OR_UNPLANNED_CASES:'+previous.role)
 caseInventory.push({role:previous.role,previous:previous.cases.length,current:current.cases.length,allPreviousRetained:true})
}
const verified=verifyDrawingPagesCurrent(process.cwd(),manifest)
const negatives=[]
for(const entry of inputs){try{verifyInputBytes(entry,Buffer.concat([fs.readFileSync(entry.file),Buffer.from('mutation')]));throw Error('LIVE_MUTATION_ACCEPTED:'+entry.file)}catch(error){if(!String(error).includes('CURRENT_SOURCE_HASH:'))throw error;negatives.push(entry.file)}}
const raw=Buffer.from(JSON.stringify(manifest,null,2)+'\n'),pinBefore=sha256(fs.readFileSync(bootstrapPin))
fs.writeFileSync(target,raw);fs.writeFileSync(bootstrapPin,"// Trusted bootstrap pin: reviewed separately; not included in its own source digest.\nexport const drawingPagesAdoptionManifestSha256 = '"+sha256(raw)+"'\n")
if(sourceSetSha256(currentInputs(process.cwd()))!==manifest.sourceSetSha256)throw Error('PUBLICATION_CHANGED_SOURCE')
const record={status:'PASS',publishedAt:new Date().toISOString(),parent:{file:parentFile,sha256:sha256(parentRaw)},manifest:{file:target,sha256:sha256(raw)},pin:{file:bootstrapPin,before:pinBefore,after:sha256(fs.readFileSync(bootstrapPin)),excludedFromSelfDigest:true,independentPOSTRequired:true},sourceSet:manifest.sourceSetSha256,oldOriginsUnchanged:parent.entries.length,addedOrigins:added,caseInventory,mutationNegativesRejected:negatives.length,verified,preservation:protection}
fs.writeFileSync(own+'manifest-publication.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({...record,preservation:undefined,addedOrigins:added.map(x=>x.file)}))
