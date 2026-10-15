import fs from 'node:fs/promises'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {pathToFileURL} from 'node:url'
import {COMMON,sha,bundle,discover,strictReceipt,verifyRequestedPolicy,verifyPlanSource,validateProbe,materializeInstance} from './core.mjs'
import {rawFile,packetSnapshot,verifyPacketSource} from './transport/integrity.mjs'

// Exact accepted origin for this bounded upgrade. No self-approved executor.
const EXECUTOR='a3ac63b52187e1f45f08b6d0beffcd67425c491d8ae1ac5d0d0efd3832e73fd0'
const POINTER='c47283bfbfdc305bf08ea461b18794561183e39da32c1c15917f47c969ff3760'
const POLICY='6c6cf78fccfc4dac9e53c859715850db127f897e7eb79aa94957134bd1c1ffeb'
const PACKAGE='openspec/changes/frade-review-snapshot-integrity/evidence/release-package'
const INDEX_GUARD='openspec/changes/frade-review-snapshot-integrity/evidence/publication-index-guard.json'
const controls=['scripts/agent-review/core.mjs','scripts/agent-review/publish.mjs','scripts/agent-review/publication.test.mjs','scripts/agent-review/make-bundle.mjs','scripts/agent-review/transport/integrity.mjs','scripts/agent-review/transport/transport.test.mjs','scripts/agent-review/transport/provenance.json','scripts/agent-review/bundle.json']
const tools=['integrity.mjs','policy.mjs','prepare-review.mjs','invoke-review.mjs','transport.test.mjs']
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const requireProof=(condition,reason)=>{if(!condition)throw Error(reason)}
const json=async(root,file)=>JSON.parse(await rawFile(root,file))
const snapshotValid=(value,packet=false)=>{
 const {digest,...body}=value
 requireProof(sha(JSON.stringify(packet?value.artifacts:body))===digest,'POST_SNAPSHOT_DRIFT')
}
function expectedCli(policy,record){return ['-d','Ubuntu-22.04_E','--exec','/usr/bin/env','CODEX_HOME=/mnt/c/Users/NVISEN/.codex',policy.RUNTIME+'/node_modules/.bin/codex','exec','--ignore-user-config','--ignore-rules','--ephemeral','--skip-git-repo-check','--model',record.requestedModel,...policy.configs().flatMap(c=>['-c',c]),'-C',policy.linux(record.packet),'--json','--color','never','--output-last-message',policy.linux(path.join(record.run,'result.md')),'-']}

async function verifyFrozenCandidate(trusted,owner,reviewed,indexSha256){
 requireProof((await bundle(trusted.root)).digest===EXECUTOR,'EXECUTOR_SOURCE_DRIFT')
 const index=path.resolve(owner.root,execFileSync('git',['--no-optional-locks','-c','core.longpaths=true','-c','core.fsmonitor=false','rev-parse','--git-path','index'],{cwd:owner.root,encoding:'utf8'}).trim())
 requireProof(sha(await fs.readFile(index))===indexSha256,'POST_INDEX_DRIFT')
 // Use the exact pinned executor's snapshot format, with explicitly readonly Git.
 const script='const m=await import('+JSON.stringify(pathToFileURL(path.join(trusted.root,'scripts/agent-review/transport/integrity.mjs')).href)+');console.log(JSON.stringify(await m.candidateSnapshot('+JSON.stringify(owner.root)+')))'
 const fresh=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{cwd:owner.root,encoding:'utf8',maxBuffer:32*1024*1024,windowsHide:true,env:{...process.env,GIT_OPTIONAL_LOCKS:'0',GIT_CONFIG_COUNT:'0',GIT_CONFIG_PARAMETERS:"'core.longpaths=true' 'core.fsmonitor=false'"}}))
 requireProof(same(fresh,reviewed)&&sha(await fs.readFile(index))===indexSha256,'PUBLICATION_CANDIDATE_DRIFT')
}

// Non-writing verifier also exercised by isolated synthetic fixtures. Fixtures
// are never independent approval; installation always supplies actual discovery.
export async function verifyPublication(release,owner,proof,pointerBytes){
 requireProof(sha(pointerBytes)===POINTER,'PUBLICATION_POINTER_DRIFT')
 const pointer=JSON.parse(pointerBytes)
 requireProof(pointer.release===EXECUTOR&&pointer.policySha256===POLICY&&path.resolve(pointer.common)===path.resolve(COMMON),'UNTRUSTED_EXECUTOR')
 const trusted=await bundle(path.join(COMMON,'frade-workflow/releases',EXECUTOR))
 requireProof(trusted.digest===EXECUTOR&&trusted.manifest.policySha256===POLICY,'EXECUTOR_SOURCE_DRIFT')
 const run=path.dirname(proof),receipt=await json(run,'receipt.json'),input=await json(run,'input.json'),request=await json(run,'request.json'),record=await json(run,'output/record.json')
 requireProof(path.resolve(proof)===path.resolve(run,'output')&&await fs.realpath(run)===path.resolve(run),'POST_RUN_PATH')
 requireProof(receipt.run===run&&same(receipt.owner,owner)&&record.run===proof&&record.candidate===owner.root,'POST_OWNER_MISMATCH')
 requireProof(receipt.phase==='POST'&&input.phase==='POST'&&record.phase==='POST'&&receipt.status==='PASS'&&record.status==='PASS'&&receipt.gateStatus==='PASS'&&record.gateStatus==='PASS'&&!receipt.error&&!record.error&&!record.timedOut&&!record.stdinError,'POST_NOT_VERIFIED')
 requireProof(receipt.release===EXECUTOR&&receipt.inputSha256===sha(JSON.stringify(input))&&same(receipt.reviewPolicy,input.reviewPolicy),'POST_INPUT_DRIFT')
 requireProof(input.reviewPolicy.phase==='POST'&&same(receipt.reviewPolicy.source,input.reviewPolicy.source)&&receipt.requestedModel===input.reviewPolicy.model&&receipt.requestedEffort===input.reviewPolicy.reasoningEffort,'POST_PLAN_MISMATCH')
 verifyRequestedPolicy(record,input.reviewPolicy)
 requireProof(input.paths.includes(input.policyArtifact)&&input.paths.includes(input.reviewPolicy.source.path)&&new Set(input.paths).size===input.paths.length,'POST_SELECTION_DRIFT')
 const expectedRequest={phase:input.phase,scope:input.scope,paths:input.paths,prepared:path.join(run,'prepared'),prompt:path.join(run,'prompt.md'),run:path.join(run,'output')}
 requireProof(same(request,expectedRequest)&&receipt.scope===input.scope&&record.scope===input.scope&&receipt.change===input.change,'POST_REQUEST_DRIFT')
 const provenance=await json(trusted.root,'scripts/agent-review/transport/provenance.json'),templates={}
 for(const name of tools)templates[name]=await rawFile(trusted.root,'scripts/agent-review/transport/'+name)
 const reconstructed=materializeInstance(templates,provenance,trusted.digest,owner,run,input.policyArtifact,input.reviewPolicy)
 requireProof((await rawFile(run,'instance-provenance.json')).equals(Buffer.from(JSON.stringify(reconstructed.provenance,null,2)+'\n')),'POST_INSTANCE_PROVENANCE_DRIFT')
 const fingerprints=[]
 for(const item of reconstructed.files){const bytes=await rawFile(run,'instance/'+item.path);requireProof(bytes.equals(Buffer.from(item.text)),'POST_INSTANCE_DRIFT:'+item.path);fingerprints.push({path:item.path,sha256:sha(bytes)})}
 requireProof(same(record.toolchain,fingerprints),'UNREVIEWED_POST_TRANSPORT')
 const policy=await import(pathToFileURL(path.join(run,'instance/policy.mjs')))
 requireProof(record.cli?.launcher==='wsl.exe'&&record.cli.version==='0.159.3'&&same(record.cli.args,expectedCli(policy,record)),'POST_CLI_DRIFT')
 const probeBytes=await rawFile(run,'instance/offline-probe-b.json'),probe=JSON.parse(probeBytes),start=probe.out.indexOf('{"rows":')
 requireProof(probe.exit===0&&probe.version?.exit===0&&probe.version.out.trim()==='codex-cli 0.159.3'&&start>=0&&policy.configs().every(c=>probe.args.includes(c))&&record.readConfinementProbeSha256===sha(probeBytes),'POST_PROBE_DRIFT')
 validateProbe(JSON.parse(probe.out.slice(start)),probe.existence)
 for(const [file,script] of [['prepare-execution.json','prepare-review.mjs'],['invoke-execution.json','invoke-review.mjs']]){
  const execution=await json(run,file)
  requireProof(execution.command===process.execPath&&execution.exit===0&&execution.cwd===owner.root&&same(execution.args,[path.join(run,'instance',script),path.join(run,'request.json')]),'POST_EXECUTION_DRIFT')
  if(script==='invoke-review.mjs'){const status=JSON.parse(execution.out);requireProof(status.status==='PASS'&&status.gateStatus==='PASS'&&status.threadId===record.threadId&&status.run===proof&&!status.error,'POST_EXECUTION_DRIFT')}
 }
 const report=await rawFile(run,'output/result.md'),events=await rawFile(run,'output/events.jsonl'),verdict=strictReceipt(events.toString(),report.toString(),record.exitCode)
 requireProof(verdict.gateStatus==='PASS'&&verdict.threadId===receipt.threadId&&verdict.threadId===record.threadId&&sha(report)===record.resultSha256&&sha(report)===receipt.resultSha256,'POST_RESULT_DRIFT')
 const prompt=await rawFile(run,'prompt.md'),expectedPrompt=input.prompt+'\n\nApproved owning stage selection (verify semantic plan approval; metadata is not approval):\n'+JSON.stringify(input.reviewPolicy,null,2)+'\n'
 requireProof(prompt.equals(Buffer.from(expectedPrompt))&&sha(prompt)===record.promptSha256&&prompt.equals(await rawFile(run,'output/prompt.md')),'POST_PROMPT_DRIFT')
 const before=await json(run,'output/candidate-before.json'),after=await json(run,'output/candidate-after.json'),frozen=await json(run,'prepared/candidate-before.json')
 snapshotValid(before);snapshotValid(after);snapshotValid(frozen)
 requireProof(same(before,after)&&same(before,frozen)&&before.identity.head===owner.head&&before.identity.branch===owner.branch&&!before.identity.cachedNames&&receipt.candidateUnchanged===true&&record.candidateUnchanged===true,'POST_CANDIDATE_DRIFT')
 const packetBefore=await json(run,'output/packet-before.json'),packetAfter=await json(run,'output/packet-after.json');snapshotValid(packetBefore,true);snapshotValid(packetAfter,true)
 requireProof(same(packetBefore,packetAfter)&&record.packet===path.join(run,'prepared/packet')&&same(await packetSnapshot(record.packet),packetBefore)&&receipt.packetUnchanged===true&&record.packetUnchanged===true,'POST_PACKET_DRIFT')
 const manifestBytes=await rawFile(record.packet,'REVIEW-PACKET-MANIFEST.json'),manifest=JSON.parse(manifestBytes)
 requireProof(sha(manifestBytes)===record.packetManifestSha256&&manifest.version===3&&manifest.phase==='POST'&&manifest.scope===input.scope&&manifest.authorization===input.policyArtifact&&record.authorization===input.policyArtifact&&manifest.candidate.head===owner.head&&manifest.candidate.branch===owner.branch&&manifest.candidate.digest===before.digest&&same(manifest.artifacts.map(a=>a.path),input.paths)&&record.verifiedSourceFiles===input.paths.length,'POST_MANIFEST_DRIFT')
 requireProof(packetBefore.artifacts.length===manifest.artifacts.length+1&&packetBefore.artifacts.every(a=>a.path==='REVIEW-PACKET-MANIFEST.json'||input.paths.includes(a.path)),'UNDECLARED_PACKET_FILE')
 await verifyPacketSource(owner.root,record.packet,manifest)
 const live=new Map(before.artifacts.map(a=>[a.path,a]));for(const item of manifest.artifacts){requireProof(same(live.get(item.path),item),'POST_SOURCE_PROOF_DRIFT');policy.assertAllowedArtifact(item.path,await rawFile(record.packet,item.path))}
 requireProof(sha(await rawFile(record.packet,input.policyArtifact))===POLICY,'POST_POLICY_DRIFT');verifyPlanSource(await rawFile(record.packet,input.reviewPolicy.source.path),input.reviewPolicy.source)
 const indexGuard=await json(run,'owner-index-guard.json'),git=args=>execFileSync('git',['--no-optional-locks','-c','core.longpaths=true','-c','core.fsmonitor=false',...args],{cwd:owner.root,encoding:'utf8'}).trim(),actualIndex=path.resolve(owner.root,git(['rev-parse','--git-path','index']))
 requireProof(input.paths.includes(INDEX_GUARD),'MISSING_REVIEWED_INDEX_GUARD')
 const reviewedIndex=await json(record.packet,INDEX_GUARD)
 requireProof(reviewedIndex.head===owner.head&&path.resolve(reviewedIndex.indexPath)===actualIndex&&/^[a-f0-9]{64}$/.test(reviewedIndex.sha256)&&indexGuard.head===owner.head&&path.resolve(indexGuard.indexPath)===actualIndex&&indexGuard.before===reviewedIndex.sha256&&indexGuard.after===reviewedIndex.sha256&&sha(await fs.readFile(actualIndex))===reviewedIndex.sha256,'POST_INDEX_DRIFT')
 if(before.identity.index)requireProof(before.identity.index.sha256===reviewedIndex.sha256,'POST_INDEX_DRIFT')
 const expectedMembership=[...trusted.manifest.files.map(item=>item.path),'scripts/agent-review/publication.test.mjs']
 const actualMembership=release.manifest.files.map(item=>item.path)
 requireProof(actualMembership.length===expectedMembership.length&&new Set(actualMembership).size===expectedMembership.length&&expectedMembership.every(p=>actualMembership.includes(p)),'PUBLICATION_MEMBERSHIP_DRIFT')
 const prefix=PACKAGE+'/'
 requireProof(release.root===path.join(owner.root,PACKAGE),'PUBLICATION_SOURCE_ROOT')
 requireProof(release.manifest.policyVersion==='1.1'&&release.manifest.policySha256===POLICY&&(await bundle(release.root)).digest===release.digest,'PUBLICATION_SOURCE_DRIFT')
 {
  for(const canonical of controls){const artifact=manifest.artifacts.find(a=>a.path===canonical),source=await rawFile(owner.root,canonical),copy=await rawFile(release.root,canonical);requireProof(artifact?.sha256===sha(source)&&source.equals(copy),'PUBLICATION_CONTROL_MIRROR_DRIFT:'+canonical)}
  for(const item of release.manifest.files){if(!controls.includes(item.path)){const previous=trusted.manifest.files.find(x=>x.path===item.path);requireProof(previous?.sha256===item.sha256,'PUBLICATION_UNRELATED_SOURCE_DRIFT:'+item.path)}}
 }
 const files=[];for(const item of [...release.manifest.files,{path:'scripts/agent-review/bundle.json',sha256:release.digest}]){
  requireProof(!files.some(x=>x.path===item.path),'PUBLICATION_DUPLICATE_PATH');const artifact=manifest.artifacts.find(a=>a.path===prefix+item.path),bytes=await rawFile(release.root,item.path)
  requireProof(artifact?.sha256===item.sha256&&sha(bytes)===item.sha256&&bytes.equals(await rawFile(record.packet,prefix+item.path)),'PUBLICATION_NOT_REVIEWED:'+item.path);files.push({...item,bytes})
 }
 await verifyFrozenCandidate(trusted,owner,before,reviewedIndex.sha256)
 return {record,files,expectedPointerSha256:POINTER,reviewedCandidate:before,reviewedIndexSha256:reviewedIndex.sha256,trusted}
}

// Verify the entire physical installed tree, including unlisted empty directories.
export async function verifyInstalledRelease(output,release){
 requireProof(await fs.realpath(output)===path.resolve(output),'SYMLINK_RELEASE')
 const expected=new Map([...release.manifest.files,{path:'scripts/agent-review/bundle.json',sha256:release.digest}].map(item=>[item.path,item.sha256])),directories=new Set(),seen=new Set(),seenDirectories=new Set()
 for(const file of expected.keys()){let parent=path.posix.dirname(file);while(parent!=='.'){directories.add(parent);parent=path.posix.dirname(parent)}}
 const walk=async relative=>{for(const entry of await fs.readdir(path.join(output,relative),{withFileTypes:true})){
  const name=relative?relative+'/'+entry.name:entry.name,target=path.join(output,name)
  requireProof(!entry.isSymbolicLink()&&await fs.realpath(target)===path.resolve(target),'SYMLINK_RELEASE')
  if(entry.isDirectory()){requireProof(directories.has(name),'UNREVIEWED_INSTALLED_DIRECTORY:'+name);seenDirectories.add(name);await walk(name)}
  else{requireProof(entry.isFile()&&expected.has(name),'UNREVIEWED_INSTALLED_FILE:'+name);requireProof(sha(await rawFile(output,name))===expected.get(name),'INSTALLED_RELEASE_DRIFT');seen.add(name)}
 }}
 await walk('');requireProof(seen.size===expected.size&&seenDirectories.size===directories.size,'INSTALLED_RELEASE_MEMBERSHIP_DRIFT')
 requireProof((await bundle(output)).digest===release.digest,'INSTALLED_RELEASE_DRIFT')
 return {status:'PASS',files:seen.size,directories:seenDirectories.size,digest:release.digest}
}

export async function publish(release,owner,proof){
 requireProof(path.resolve(owner.common)===path.resolve(COMMON),'UNRELATED_REPOSITORY')
 const actual=await discover(owner.root)
 requireProof(same(actual,owner),'POST_OWNER_MISMATCH')
 const storage=path.join(owner.common,'frade-workflow'),current=path.join(storage,'current.json'),run=path.dirname(proof)
 requireProof(path.dirname(run)===path.join(storage,'runs'),'POST_RUN_PATH')
 requireProof(await fs.realpath(storage)===path.resolve(storage),'SYMLINK_STORAGE')
 const verified=await verifyPublication(release,owner,proof,await rawFile(storage,'current.json')),output=path.join(storage,'releases',release.digest)
 const pointer={version:1,release:release.digest,common:owner.common,installedAtUtc:new Date().toISOString(),postResultSha256:verified.record.resultSha256,policySha256:release.manifest.policySha256},pointerBytes=Buffer.from(JSON.stringify(pointer,null,2)+'\n')
 // One exclusive owned temporary pointer serializes cooperating publishers.
 const temporary=path.join(storage,'current.json.lock');let acquired=false
 try{
  await fs.writeFile(temporary,pointerBytes,{flag:'wx'});acquired=true
  requireProof(sha(await fs.readFile(current))===verified.expectedPointerSha256,'PUBLICATION_POINTER_DRIFT')
  await fs.mkdir(output,{recursive:true});requireProof(await fs.realpath(output)===path.resolve(output),'SYMLINK_RELEASE')
  for(const item of verified.files){const target=path.join(output,item.path);await fs.mkdir(path.dirname(target),{recursive:true});requireProof(await fs.realpath(path.dirname(target))===path.dirname(target),'SYMLINK_RELEASE');try{await fs.writeFile(target,item.bytes,{flag:'wx'})}catch(e){if(e.code!=='EEXIST')throw e;}requireProof((await rawFile(output,item.path)).equals(item.bytes),'INSTALLED_RELEASE_DRIFT')}
  await verifyInstalledRelease(output,release)
  requireProof(same(await discover(owner.root),owner)&&(await bundle(release.root)).digest===release.digest,'PUBLICATION_SOURCE_DRIFT')
  await verifyFrozenCandidate(verified.trusted,owner,verified.reviewedCandidate,verified.reviewedIndexSha256)
  await verifyInstalledRelease(output,release)
  requireProof(sha(await rawFile(storage,'current.json'))===verified.expectedPointerSha256&&(await rawFile(storage,'current.json.lock')).equals(pointerBytes),'PUBLICATION_POINTER_DRIFT')
  await fs.rename(temporary,current);acquired=false
  requireProof((await rawFile(storage,'current.json')).equals(pointerBytes),'INSTALLED_POINTER_DRIFT')
  return {...pointer,output,status:'PASS'}
 }finally{if(acquired){const bytes=await rawFile(storage,'current.json.lock');requireProof(bytes.equals(pointerBytes),'PUBLICATION_LOCK_DRIFT');await fs.unlink(temporary)}}
}
