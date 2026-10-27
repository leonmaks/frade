import fs from 'node:fs'
import path from 'node:path'
import cp from 'node:child_process'
import { currentInputs, sourceSetSha256, sha256 } from '../../../../../tests/ui-contract/drawing-pages-current.mjs'
const root=process.cwd(), own='openspec/changes/frade-draw-multipage/evidence/main-gate-repair-20261027/'
const git=(...args)=>cp.execFileSync('git',['--no-optional-locks','-c','core.longpaths=true','-c','core.fsmonitor=false',...args],{stdio:['ignore','pipe','pipe'],maxBuffer:64e6})
const json=file=>JSON.parse(fs.readFileSync(file))
if(fs.existsSync(own+'baseline.json'))throw Error('IMMUTABLE_BASELINE_EXISTS')
const head=git('rev-parse','HEAD').toString().trim(),branch=git('branch','--show-current').toString().trim()
if(head!=='f76a590ae1c32f3db5bd6594e1ef5fc962217fc2'||branch!=='main'||git('diff','--cached','--name-only').length)throw Error('OWNER_BASELINE')
const snapshot=file=>{const exists=fs.existsSync(file);return {file,exists,...(exists?{sha256:sha256(fs.readFileSync(file)),bytes:fs.statSync(file).size}:{})}}
const dirty=git('diff','--name-only','-z').toString().split('\0').filter(Boolean).map(snapshot)
const untracked=git('ls-files','--others','--exclude-standard','-z').toString().split('\0').filter(Boolean).filter(f=>!f.startsWith(own)).map(snapshot)
for(const file of ['source-adoption-manifest.json','execution-selection.json','build-selection.json']){
 const from='openspec/changes/frade-draw-multipage/evidence/'+file,to=own+'prior-candidate/'+from
 fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to)
}
for(const file of ['packages/ui-workspace/tests/ui-contract/drawing-pages-adoption-pin.ts','docs/engineering/BRANCH-STATUS.md']){
 const to=own+'prior-candidate/'+file;fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(file,to)
}
const parent=json(own+'prior-candidate/openspec/changes/frade-draw-multipage/evidence/source-adoption-manifest.json')
const archive='openspec/changes/archive/'+fs.readdirSync('openspec/changes/archive').find(n=>n.endsWith('-frade-light-diagram-editor'))
const historical=json(archive+'/evidence/upstream-bdd-bindings-20261026/bindings-manifest-portability.json')
const origins=[]
for(const file of ['pnpm-lock.yaml','packages/draw/src/routing/perimeter/ellipse.ts','packages/ui-workspace/src/DiagramView.tsx']){
 const pin=historical.inputs.find(p=>p.file===file);if(!pin)throw Error('NO_HISTORICAL_PIN:'+file)
 const blob=git('show',parent.baseline+':'+file),canonical=Buffer.from(blob.toString('latin1').replaceAll('\r\n','\n'),'latin1'),checkout=Buffer.from(canonical.toString('latin1').replaceAll('\n','\r\n'),'latin1')
 const original=[blob,canonical,checkout].find(b=>sha256(b)===pin.sha256)
 if(!original)throw Error('NO_EXACT_RECONSTRUCTED_ORIGIN:'+file)
 const target=own+'proposed-origins/'+file;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,original)
 origins.push({file,sourceRevision:parent.baseline,sourceBlob:git('rev-parse',parent.baseline+':'+file).toString().trim(),gitBlobSha256:sha256(blob),derivation:sha256(blob)===sha256(original)?'exact Git blob':'CRLF publication of canonical Git blob; hash equals pre-existing historical raw pin',originalSha256:sha256(original),publishedSha256:pin.publishedSha256,proposedSnapshot:target,live:snapshot(file)})
}
const inputs=currentInputs(root),baseline={createdAt:new Date().toISOString(),root,branch,head,common:git('rev-parse','--path-format=absolute','--git-common-dir').toString().trim(),dirty,untracked,inputs,sourceSet:sourceSetSha256(inputs),parentManifestSha256:sha256(fs.readFileSync('openspec/changes/frade-draw-multipage/evidence/source-adoption-manifest.json')),origins}
fs.writeFileSync(own+'baseline.json',JSON.stringify(baseline,null,2)+'\n')
console.log(JSON.stringify({status:'EXACT_ORIGINS_PROVED',head,dirty:dirty.length,preservedUntracked:untracked.length,sourceFiles:inputs.length,origins:origins.map(o=>({file:o.file,sha256:o.originalSha256,derivation:o.derivation}))},null,2))
