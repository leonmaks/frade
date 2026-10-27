import fs from 'node:fs'
import {currentInputs,sourceSetSha256,sha256} from '../../../../../tests/ui-contract/drawing-pages-current.mjs'
export const own='openspec/changes/frade-draw-multipage/evidence/performance-repair-20261027/'
export const changed=['apps/desktop/src/main/drawio-theme-bridge.ts','packages/ui-workspace/src/design/theme/rootParticipant.ts','packages/ui-workspace/tests/ui-contract/drawing-pages-origin.ts','packages/ui-workspace/tests/ui-contract/drawing-pages-origin.test.ts'].sort()
export const added=['apps/desktop/tests/unit/drawio-theme-idempotence.test.ts','packages/ui-workspace/tests/ui-contract/presentation-idempotence.test.ts'].sort()
export function audit(){
 const user=JSON.parse(fs.readFileSync('openspec/changes/frade-draw-multipage/evidence/main-gate-repair-20261027/baseline.json')),baseline=JSON.parse(fs.readFileSync(own+'baseline.json')).preservation.inputs,inputs=currentInputs(process.cwd()),map=new Map(inputs.map(x=>[x.file,x]))
 const bad=[...user.dirty,...user.untracked].filter(p=>fs.existsSync(p.file)!==p.exists||(p.exists&&sha256(fs.readFileSync(p.file))!==p.sha256)).map(x=>x.file);if(bad.length)throw Error('USER_BYTES_CHANGED:'+JSON.stringify(bad))
 const actualAdded=inputs.filter(x=>!baseline.some(b=>b.file===x.file)).map(x=>x.file).sort(),actualChanged=baseline.filter(x=>map.get(x.file)?.sha256!==x.sha256).map(x=>x.file).sort()
 if(inputs.length!==baseline.length+added.length||baseline.some(x=>!map.has(x.file))||JSON.stringify(actualAdded)!==JSON.stringify(added)||JSON.stringify(actualChanged)!==JSON.stringify(changed))throw Error('UNAUTHORISED_SOURCE_DELTA:'+JSON.stringify({actualAdded,actualChanged}))
 return {at:new Date().toISOString(),status:'PASS',userDirty:user.dirty.length,userUntracked:user.untracked.length,sourceFiles:inputs.length,sourceSet:sourceSetSha256(inputs),changed:actualChanged,added:actualAdded,inputs}
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/audit.mjs')){const r=audit(),to=own+'preservation-'+process.argv[2]+'.json';if(fs.existsSync(to))throw Error('IMMUTABLE_AUDIT_EXISTS');fs.writeFileSync(to,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({...r,inputs:undefined}))}
