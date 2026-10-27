import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {rebaseLegacyColors,verifyLegacyColorRebase} from '../../../../tests/ui-contract/drawing-pages-adoption.mjs'
const prefix='openspec/changes/frade-draw-multipage/evidence/'
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const seed=JSON.parse(readFileSync(prefix+'origin-plan-index.json'))
const originalRaw=readFileSync(seed.colorInventoryOrigin.originalFile)
if(hash(originalRaw)!==seed.colorInventoryOrigin.originalSha256)throw Error('ORIGINAL_INVENTORY_HASH')
const original=JSON.parse(originalRaw),currentRaw=readFileSync(seed.colorInventoryOrigin.file)
const previousProofRaw=readFileSync(prefix+'legacy-coordinate-rebase-proof.json')
const previousProof=JSON.parse(previousProofRaw)
if(JSON.stringify(JSON.parse(currentRaw))!==JSON.stringify(original)&&hash(currentRaw)!==previousProof.inventory.adoptedSha256)throw Error('INVENTORY_CHANGED_BEFORE_REBASE')
const sources={},inputs=[]
for(const file of ['packages/ui-workspace/src/FradeDiagramView.tsx','packages/ui-workspace/src/styles.css','packages/draw/src/style.css']){
 const entry=seed.entries.find(x=>x.file===file)
 if(!entry)throw Error('MISSING_ORIGIN:'+file)
 const before=readFileSync(entry.originalFile),after=readFileSync(file)
 if(hash(before)!==entry.originalSha256)throw Error('ORIGINAL_SOURCE_HASH:'+file)
 sources[file]={before:before.toString(),after:after.toString()}
 inputs.push({file,originalFile:entry.originalFile,originalSha256:hash(before),adoptedSha256:hash(after)})
}
const result=rebaseLegacyColors(original,sources)
verifyLegacyColorRebase(original,result.inventory,sources)
if(result.proof.count!==124||result.proof.changed!==19)throw Error('UNEXPECTED_REBASE_SCOPE')
const adoptedRaw=Buffer.from(JSON.stringify(result.inventory,null,2)+'\n')
const proof={...result.proof,baseline:seed.baseline,previousProof:{file:prefix+'legacy-coordinate-rebase-proof.json',sha256:hash(previousProofRaw)},inventory:{file:seed.colorInventoryOrigin.file,originalFile:seed.colorInventoryOrigin.originalFile,originalSha256:hash(originalRaw),previousCheckoutSha256:hash(currentRaw),adoptedSha256:hash(adoptedRaw)},inputs}
writeFileSync(prefix+'legacy-coordinate-rebase-proof-02.json',JSON.stringify(proof,null,2)+'\n')
if(process.argv.includes('--apply')){if(hash(readFileSync(seed.colorInventoryOrigin.file))!==hash(currentRaw))throw Error('INVENTORY_CONCURRENTLY_CHANGED');writeFileSync(seed.colorInventoryOrigin.file,adoptedRaw)}
console.log(JSON.stringify({status:'PASS',mode:process.argv.includes('--apply')?'APPLIED_EXACT_COORDINATES':'DRY_RUN',count:result.proof.count,moved:result.proof.changed,valuesContextsSelectorsClassificationsUnchanged:true}))
