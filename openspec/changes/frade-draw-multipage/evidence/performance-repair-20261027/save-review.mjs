import fs from 'node:fs'
import path from 'node:path'
import { sha256 } from '../../../../../tests/ui-contract/drawing-pages-current.mjs'
const run=process.argv[2],label=process.argv[3],own=import.meta.dirname,target=path.join(own,label)
if(!run?.startsWith('E:/dev/codex/frade/.git/frade-workflow/runs/')||!/^(pre|post)-\d{2}-\d{8}T\d{6}Z$/.test(label))throw Error('UNSAFE_REVIEW')
fs.mkdirSync(target,{recursive:true});const files=[]
function put(to,raw){fs.mkdirSync(path.dirname(to),{recursive:true});if(fs.existsSync(to)){if(!fs.readFileSync(to).equals(raw))throw Error('IMMUTABLE_REVIEW_DRIFT:'+to)}else fs.writeFileSync(to,raw)}
for(const file of ['receipt.json','input.json','request.json','prompt.md','instance-provenance.json','prepare-execution.json','invoke-execution.json',...fs.readdirSync(run+'/output').map(x=>'output/'+x)]){
 const raw=fs.readFileSync(run+'/'+file),to=path.join(target,file);put(to,raw);files.push({file,sha256:sha256(raw),bytes:raw.length})
}
const receipt=JSON.parse(fs.readFileSync(target+'/receipt.json'))
for(const file of [receipt.reviewPolicy.source.path,'openspec/changes/frade-draw-multipage/design.md','openspec/changes/frade-draw-multipage/specs/diagram-pages/spec.md','openspec/changes/frade-draw-multipage/tasks.md','docs/engineering/BRANCH-STATUS.md']){
 const to=path.join(target,'reviewed-files',file);put(to,fs.readFileSync(run+'/prepared/packet/'+file))
}
for(const file of ['main-gate-review.ps1','main-gate-repair-'+receipt.phase+'-index-lease.json'])put(path.join(target,file),fs.readFileSync('.worktrees/requests/'+file))
put(target+'/raw-index.json',Buffer.from(JSON.stringify({run,files},null,2)+'\n'))
if(sha256(fs.readFileSync(target+'/output/result.md'))!==receipt.resultSha256)throw Error('RECEIPT_RESULT_HASH')
console.log(JSON.stringify({saved:target,status:receipt.status,gateStatus:receipt.gateStatus,candidateUnchanged:receipt.candidateUnchanged,packetUnchanged:receipt.packetUnchanged}))
