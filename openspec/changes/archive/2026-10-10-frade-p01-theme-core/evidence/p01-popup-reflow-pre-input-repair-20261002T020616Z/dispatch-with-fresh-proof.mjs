import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const releaseRoot='E:/dev/codex/frade/.git/frade-workflow/releases/a3ac63b52187e1f45f08b6d0beffcd67425c491d8ae1ac5d0d0efd3832e73fd0'
const core=await import(pathToFileURL(path.join(releaseRoot,'scripts/agent-review/core.mjs')))
const {bundle,discover,selectReviewPolicy,newRun,instance,probe,execute,sha,verifyPlanSource,verifyRequestedPolicy,strictReceipt}=core
const originalInput=JSON.parse(await fs.readFile(process.argv[2],'utf8'))
const input=structuredClone(originalInput)
const release=await bundle(releaseRoot),owner=await discover(process.cwd(),release.manifest.common)
if(owner.branch!=='codex/frade-ui-design-contract')throw Error('WRONG_OWNER')
if(!['PRE','POST'].includes(input.phase)||!input.change||!input.scope||!input.prompt||!input.paths.includes(input.policyArtifact))throw Error('INVALID_INPUT')
const selection=await selectReviewPolicy(release,owner,input)
const integrity=await import(pathToFileURL(path.join(releaseRoot,'scripts/agent-review/transport/integrity.mjs')))
const policyBytes=await integrity.rawFile(owner.root,input.policyArtifact)
if(sha(policyBytes)!==release.manifest.policySha256)throw Error('POLICY_ADOPTION_DRIFT')
const run=await newRun(owner),directory=await instance(release,owner,run,input.policyArtifact,selection)
let receipt
try {
  const measured=await probe(release,owner,run,directory)
  const raw=await fs.readFile(path.join(directory,'offline-probe-b.json'))
  if(measured.status!=='PASS'||sha(raw)!==measured.probeSha256)throw Error('FRESH_PROBE_DRIFT')
  const rawRecord=JSON.parse(raw)
  if(rawRecord.exit!==0||rawRecord.version.exit!==0||rawRecord.version.out.trim()!=='codex-cli 0.159.3')throw Error('INVALID_FRESH_VERSION_EXIT')
  // Public evidence only. No auth/config contents are read or copied by this owner.
  // Materialize BEFORE prepare captures candidate, then freeze through invoke/receipt.
  const publicDir='openspec/changes/frade-p01-theme-core/evidence/p01-reflow-review-canary-'+path.basename(run)
  await fs.mkdir(path.join(owner.root,publicDir))
  const publicRaw=publicDir+'/fresh-confinement-version-raw.json',binding=publicDir+'/invocation-binding.json'
  await fs.writeFile(path.join(owner.root,publicRaw),raw,{flag:'wx'})
  const bindingBytes=JSON.stringify({atUtc:new Date().toISOString(),run,phase:input.phase,change:input.change,scope:input.scope,release:release.digest,policySha256:sha(policyBytes),reviewPolicy:selection,probe:measured,raw:{path:publicRaw,sha256:sha(raw),bytes:raw.length},orchestrator:{path:process.argv[1],sha256:sha(await fs.readFile(process.argv[1]))},order:'same-run shared instance -> fresh shared probe -> public raw/binding -> final request -> prepare freeze -> shared invoke -> strict unchanged verification',actualBackend:'NOT_CONFIRMED',actualEffort:'NOT_CONFIRMED'},null,2)+'\n'
  await fs.writeFile(path.join(owner.root,binding),bindingBytes,{flag:'wx'})
  input.paths=[...new Set([...input.paths,publicRaw,binding])].sort()
  input.prompt+='\n\nCURRENT INVOCATION fresh canary input: '+JSON.stringify({run,publicRaw,binding,rawSha256:sha(raw),phase:input.phase,selection},null,2)+'\nInspect raw fresh version/exits/deny/write/network proof and exact invocation binding. Prior PRE1 raw remains FAIL. Shared immutable bundle and generated transport are unchanged; owner sequencing adds public proof before freeze, not a sandbox fallback. Request/candidate/packet are immutable after prepare.\n'
  await fs.writeFile(path.join(run,'input.json'),JSON.stringify(input,null,2)+'\n',{flag:'wx'})
  const request={phase:input.phase,scope:input.scope,paths:input.paths,prepared:path.join(run,'prepared'),prompt:path.join(run,'prompt.md'),run:path.join(run,'output')}
  await fs.writeFile(request.prompt,input.prompt+'\n\nApproved owning stage selection (metadata is not approval):\n'+JSON.stringify(selection,null,2)+'\n',{flag:'wx'})
  const requestFile=path.join(run,'request.json');await fs.writeFile(requestFile,JSON.stringify(request,null,2)+'\n',{flag:'wx'})
  const before=await bundle(releaseRoot),inputHash=sha(JSON.stringify(input))
  const prepared=await execute(process.execPath,[path.join(directory,'prepare-review.mjs'),requestFile],owner.root)
  await fs.writeFile(path.join(run,'prepare-execution.json'),JSON.stringify(prepared,null,2)+'\n',{flag:'wx'})
  if(prepared.exit!==0)throw Error('PREPARE_BLOCKED')
  verifyPlanSource(await integrity.rawFile(path.join(request.prepared,'packet'),selection.source.path),selection.source)
  const invoked=await execute(process.execPath,[path.join(directory,'invoke-review.mjs'),requestFile],owner.root)
  await fs.writeFile(path.join(run,'invoke-execution.json'),JSON.stringify(invoked,null,2)+'\n',{flag:'wx'})
  receipt={atUtc:new Date().toISOString(),run,owner,change:input.change,phase:input.phase,scope:input.scope,status:'BLOCKED',release:release.digest,inputSha256:inputHash,reviewPolicy:selection,requestedModel:selection.model,requestedEffort:selection.reasoningEffort,actualBackend:'NOT_CONFIRMED',actualEffort:'NOT_CONFIRMED',freshCanary:{publicRaw,binding,sha256:sha(raw),run,status:measured.status},orchestration:'UNCHANGED_SHARED_EXPORTED_CONTROLS_WITH_PREFREEZE_PUBLIC_CANARY_INPUT'}
  try {
    const record=JSON.parse(await fs.readFile(path.join(request.run,'record.json'),'utf8'))
    verifyRequestedPolicy(record,selection)
    const report=await fs.readFile(path.join(request.run,'result.md'))
    if(sha(report)!==record.resultSha256)throw Error('REVIEW_RESULT_DRIFT')
    const verdict=strictReceipt(await fs.readFile(path.join(request.run,'events.jsonl'),'utf8'),report.toString('utf8'),record.exitCode)
    if(!record.candidateUnchanged||!record.packetUnchanged||record.status!==verdict.gateStatus||record.error||invoked.exit!==(verdict.gateStatus==='PASS'?0:1)||(await bundle(releaseRoot)).digest!==before.digest||sha(await fs.readFile(path.join(owner.root,publicRaw)))!==sha(raw)||sha(await fs.readFile(path.join(owner.root,binding)))!==sha(bindingBytes)||sha(JSON.stringify(JSON.parse(await fs.readFile(path.join(run,'input.json'),'utf8'))))!==inputHash)throw Error('INTEGRITY_NOT_VERIFIED')
    verifyPlanSource(await integrity.rawFile(owner.root,selection.source.path),selection.source)
    receipt={...receipt,...verdict,status:verdict.gateStatus,resultSha256:record.resultSha256,candidateUnchanged:true,packetUnchanged:true,sourcePlanUnchanged:true}
  } catch(error){receipt.error=String(error)}
} catch(error){receipt={atUtc:new Date().toISOString(),run,owner,status:'BLOCKED',error:String(error),release:release.digest,reviewPolicy:selection}}
await fs.writeFile(path.join(run,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify(receipt,null,2))
process.exitCode=receipt.status==='PASS'?0:receipt.status==='FAIL'?1:2
