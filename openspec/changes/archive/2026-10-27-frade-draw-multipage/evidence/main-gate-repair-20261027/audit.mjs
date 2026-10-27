import fs from 'node:fs'
import { currentInputs, sourceSetSha256, sha256 } from '../../../../../tests/ui-contract/drawing-pages-current.mjs'
export const own='openspec/changes/frade-draw-multipage/evidence/main-gate-repair-20261027/'
export const allowed=[
 'packages/draw/src/editor/PageStrip.tsx','packages/draw/src/editor/pages.css',
 'packages/draw/tests/spike/drawing-pages-parity.spec.ts',
 'packages/ui-workspace/tests/ui-contract/drawing-pages-origin.ts',
 'packages/ui-workspace/tests/ui-contract/drawing-pages-origin.test.ts',
 'tests/ui-contract/drawing-pages-current.mjs',
 'tests/ui-contract/drawing-pages-current.test.mjs',
].sort()
export function audit(){
 const baseline=JSON.parse(fs.readFileSync(own+'baseline.json')),inputs=currentInputs(process.cwd()),current=new Map(inputs.map(x=>[x.file,x]))
 const failures=[...baseline.dirty,...baseline.untracked].filter(p=>fs.existsSync(p.file)!==p.exists||(p.exists&&sha256(fs.readFileSync(p.file))!==p.sha256)).map(x=>x.file)
 if(failures.length)throw Error('USER_BYTES_CHANGED:'+JSON.stringify(failures))
 const added=inputs.filter(x=>!baseline.inputs.some(old=>old.file===x.file)).map(x=>x.file)
 if(inputs.length!==baseline.inputs.length+1||JSON.stringify(added)!==JSON.stringify(['packages/ui-workspace/tokens/.gitattributes'])||baseline.inputs.some(x=>!current.has(x.file)))throw Error('UNEXPECTED_INPUT_SET')
 const inventory='packages/ui-workspace/tokens/drawio-editor-source.json',oldInventory=baseline.inputs.find(x=>x.file===inventory),newInventory=current.get(inventory)
 if(newInventory.sha256!==oldInventory.canonicalSha256||newInventory.canonicalSha256!==oldInventory.canonicalSha256)throw Error('UNAPPROVED_GENERATED_PUBLICATION')
 const restoredPublicationForms=[{file:inventory,before:oldInventory.sha256,after:newInventory.sha256,canonical:oldInventory.canonicalSha256}]
 const changed=baseline.inputs.filter(x=>x.file!==inventory&&current.get(x.file).sha256!==x.sha256).map(x=>x.file).sort()
 if(JSON.stringify(changed)!==JSON.stringify(allowed))throw Error('UNAUTHORIZED_SOURCE_DELTA:'+JSON.stringify(changed))
 return {checkedAt:new Date().toISOString(),status:'PASS',dirty:baseline.dirty.length,untracked:baseline.untracked.length,sourceFiles:inputs.length,sourceSet:sourceSetSha256(inputs),changed,added,restoredPublicationForms,inputs}
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/audit.mjs')){
 const result=audit(),target=own+'preservation-'+process.argv[2]+'.json';if(fs.existsSync(target))throw Error('IMMUTABLE_AUDIT_EXISTS')
 fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,inputs:undefined}))
}
