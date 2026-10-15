import {test,after} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {pathToFileURL} from 'node:url'
import {COMMON,sha,bundle,instance,materializeInstance} from './core.mjs'
import * as publication from './publish.mjs'
import {packetSnapshot} from './transport/integrity.mjs'
// Synthetic unit proof fixtures only. They never count as independent review,
// never run Codex, and never install anything in the real common directory.
const root=await fs.mkdtemp(path.join(tmpdir(),'frade-publication-fixture-'))
after(async()=>{const base=await fs.realpath(tmpdir()),target=await fs.realpath(root),relative=path.relative(base,target);assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative)&&target.startsWith(path.join(base,'frade-publication-fixture-')));await fs.rm(target,{recursive:true})})
const oldRoot=path.join(COMMON,'frade-workflow/releases/a3ac63b52187e1f45f08b6d0beffcd67425c491d8ae1ac5d0d0efd3832e73fd0'),trusted=await bundle(oldRoot),pointer=Buffer.from('ewogICJ2ZXJzaW9uIjogMSwKICAicmVsZWFzZSI6ICJhM2FjNjNiNTIxODdlMWY0NWYwOGI2ZDBiZWZmY2Q2NzQyNWM0OTFkOGFlMWFjNWQwZDBlZmQzODMyZTczZmQwIiwKICAiY29tbW9uIjogIkU6XFxkZXZcXGNvZGV4XFxmcmFkZVxcLmdpdCIsCiAgImluc3RhbGxlZEF0VXRjIjogIjIwMjYtMTAtMDFUMTc6NDM6NDguMTg3WiIsCiAgInBvc3RSZXN1bHRTaGEyNTYiOiAiMGMwNGFmNWVhZGIxZTljNjNiODc3ZDkwMTJkODQ1OTVjNTNiYjFmNmI5ODVkOTZhNTIzNjNiZTdjMmMzMzllMSIsCiAgInBvbGljeVNoYTI1NiI6ICI2YzZjZjc4ZmNjZmM0ZGFjOWU1M2M4NTk3MTU4NTBkYjEyN2Y4OTdlN2ViNzlhYTk0OTU3MTM0YmQxYzFmZmViIgp9Cg==','base64');let sequence=0
const put=async(dir,file,bytes)=>{const target=path.join(dir,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes)}
const json=async(dir,file,value)=>put(dir,file,JSON.stringify(value,null,2)+'\n')
const get=async(dir,file)=>JSON.parse(await fs.readFile(path.join(dir,file)))
const git=(cwd,args)=>execFileSync('git',['--no-optional-locks','-c','core.longpaths=true','-c','core.fsmonitor=false',...args],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
async function fixture(packaged=true,memberFault){
 const base=path.join(root,String(++sequence)),candidate=path.join(base,'candidate'),run=path.join(base,'run'),proof=path.join(run,'output');await fs.mkdir(candidate,{recursive:true});await fs.mkdir(run,{recursive:true});await fs.mkdir(proof)
 for(const item of [...trusted.manifest.files,{path:'scripts/agent-review/bundle.json'}])await put(candidate,item.path,await fs.readFile(path.join(oldRoot,item.path)))
 const integrity='scripts/agent-review/transport/integrity.mjs';await fs.appendFile(path.join(candidate,integrity),'\n// Isolated reviewed upgrade fixture.\n')
 const pins=await get(candidate,'scripts/agent-review/transport/provenance.json'),entry=pins.entries.find(e=>e.path==='integrity.mjs'),bytes=await fs.readFile(path.join(candidate,integrity));entry.sha256=sha(bytes);entry.bytes=bytes.length;await json(candidate,'scripts/agent-review/transport/provenance.json',pins)
 await put(candidate,'scripts/agent-review/publication.test.mjs','// synthetic unit fixture test bytes\n');
 const candidateManifest=structuredClone(trusted.manifest);candidateManifest.files.push({path:'scripts/agent-review/publication.test.mjs'});for(const item of candidateManifest.files)item.sha256=sha(await fs.readFile(path.join(candidate,item.path)));if(memberFault?.omit)candidateManifest.files=candidateManifest.files.filter(f=>f.path!==memberFault.omit);if(memberFault?.duplicate)candidateManifest.files.push({...candidateManifest.files.find(f=>f.path===memberFault.duplicate)});if(memberFault?.extra){await put(candidate,memberFault.extra,'unknown public fixture\n');candidateManifest.files.push({path:memberFault.extra,sha256:sha('unknown public fixture\n')});}await json(candidate,'scripts/agent-review/bundle.json',candidateManifest)
 const plan='openspec/changes/unit-fixture/design.md',policyArtifact='docs/engineering/agent-workflow.md',planText='Synthetic unit fixture stage | POST | gpt-6-sol | xhigh\n';await put(candidate,plan,planText)
 const packagePrefix='openspec/changes/frade-review-snapshot-integrity/evidence/release-package',sourceRoot=packaged?path.join(candidate,packagePrefix):candidate;
 if(packaged){for(const item of [...trusted.manifest.files,{path:'scripts/agent-review/publication.test.mjs'},...(memberFault?.extra?[{path:memberFault.extra}]:[]),{path:'scripts/agent-review/bundle.json'}])await put(sourceRoot,item.path,await fs.readFile(path.join(candidate,item.path)));}
 git(candidate,['init','-b','codex/publication-fixture']);git(candidate,['add','--','.']);git(candidate,['-c','user.name=Review Fixture','-c','user.email=fixture@localhost','commit','-m','synthetic unit fixture'])
 await put(candidate,'unselected-tracked.txt','frozen unselected bytes\n');git(candidate,['add','--','unselected-tracked.txt']);git(candidate,['-c','user.name=Review Fixture','-c','user.email=fixture@localhost','commit','-m','unselected historical source']);
 const owner={root:candidate,common:await fs.realpath(COMMON),branch:'codex/publication-fixture',registered:[candidate],head:git(candidate,['rev-parse','HEAD'])},reviewPolicy={stage:'Synthetic unit fixture stage',phase:'POST',model:'gpt-6-sol',reasoningEffort:'xhigh',source:{path:plan,sha256:sha(planText),excerpt:planText.trim()}},release=await bundle(sourceRoot)
 const indexGuardPath='openspec/changes/frade-review-snapshot-integrity/evidence/publication-index-guard.json',preIndexPath=path.resolve(candidate,git(candidate,['rev-parse','--git-path','index']));await json(candidate,indexGuardPath,{head:owner.head,indexPath:preIndexPath,sha256:sha(await fs.readFile(preIndexPath))});
 await instance(trusted,owner,run,policyArtifact,reviewPolicy)
 const policy=await import(pathToFileURL(path.join(run,'instance/policy.mjs'))),paths=[...new Set([...(packaged?["scripts/agent-review/core.mjs","scripts/agent-review/publish.mjs","scripts/agent-review/publication.test.mjs","scripts/agent-review/make-bundle.mjs","scripts/agent-review/transport/integrity.mjs","scripts/agent-review/transport/transport.test.mjs","scripts/agent-review/transport/provenance.json","scripts/agent-review/bundle.json"]:[...candidateManifest.files.map(f=>f.path),'scripts/agent-review/bundle.json']),plan,indexGuardPath,policyArtifact,...(packaged?[...candidateManifest.files.map(f=>packagePrefix+'/'+f.path),packagePrefix+'/scripts/agent-review/bundle.json']:[])])].sort(),input={phase:'POST',change:'synthetic-unit-fixture',scope:'Unit fixture reviewed control upgrade',reviewPolicy,policyArtifact,paths,prompt:'Synthetic unit proof; not independent approval.'}
 const request={phase:'POST',scope:input.scope,paths,prepared:path.join(run,'prepared'),prompt:path.join(run,'prompt.md'),run:proof},prompt=input.prompt+'\n\nApproved owning stage selection (verify semantic plan approval; metadata is not approval):\n'+JSON.stringify(reviewPolicy,null,2)+'\n'
 await json(run,'input.json',input);await json(run,'request.json',request);await put(run,'prompt.md',prompt);await put(run,'output/prompt.md',prompt)
 const artifacts=[];for(const p of paths){const data=await fs.readFile(path.join(candidate,p));artifacts.push({path:p,bytes:data.length,sha256:sha(data)});await put(run,'prepared/packet/'+p,data)}
 const snapshot=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',`const m=await import(${JSON.stringify(pathToFileURL(path.join(oldRoot,'scripts/agent-review/transport/integrity.mjs')).href)});console.log(JSON.stringify(await m.candidateSnapshot(${JSON.stringify(candidate)})))`],{encoding:'utf8',env:{...process.env,GIT_OPTIONAL_LOCKS:'0',GIT_CONFIG_COUNT:'0',GIT_CONFIG_PARAMETERS:"'core.longpaths=true' 'core.fsmonitor=false'"},windowsHide:true}));for(const f of ['prepared/candidate-before.json','output/candidate-before.json','output/candidate-after.json'])await json(run,f,snapshot)
 const manifest={version:3,phase:'POST',scope:input.scope,authorization:policyArtifact,candidate:{head:owner.head,branch:owner.branch,digest:snapshot.digest},selection:'Synthetic explicit fixture paths',artifacts};await json(run,'prepared/packet/REVIEW-PACKET-MANIFEST.json',manifest);const packet=path.join(run,'prepared/packet'),packetState=await packetSnapshot(packet);for(const f of ['output/packet-before.json','output/packet-after.json'])await json(run,f,packetState)
 const rows=['allowed','source','common','other','auth','settings'].map(name=>({name,read:name==='allowed',...(name==='allowed'?{}:{error:'EACCES'})})),probe={exit:0,version:{exit:0,out:'codex-cli 0.159.3\n'},args:policy.configs(),existence:{source:true,common:true,other:true,auth:true,settings:true},out:JSON.stringify({rows,write:false,network:{denied:true},status:'PASS'})};await json(run,'instance/offline-probe-b.json',probe)
 const report='Synthetic unit fixture; not approval.\nGATE_STATUS: PASS\n',events=JSON.stringify({type:'thread.started',thread_id:'synthetic-unit-fixture'})+'\n'+JSON.stringify({type:'turn.completed'})+'\n';await put(run,'output/result.md',report);await put(run,'output/events.jsonl',events)
 const toolchain=[];for(const p of ['integrity.mjs','policy.mjs','prepare-review.mjs','invoke-review.mjs','transport.test.mjs'])toolchain.push({path:p,sha256:sha(await fs.readFile(path.join(run,'instance',p)))})
 const cli={launcher:'wsl.exe',version:'0.159.3',args:['-d','Ubuntu-22.04_E','--exec','/usr/bin/env','CODEX_HOME=/mnt/c/Users/NVISEN/.codex',policy.RUNTIME+'/node_modules/.bin/codex','exec','--ignore-user-config','--ignore-rules','--ephemeral','--skip-git-repo-check','--model','gpt-6-sol',...policy.configs().flatMap(c=>['-c',c]),'-C',policy.linux(packet),'--json','--color','never','--output-last-message',policy.linux(path.join(proof,'result.md')),'-']}
 const record={phase:'POST',scope:input.scope,status:'PASS',gateStatus:'PASS',run:proof,candidate,packet,authorization:policyArtifact,requestedModel:'gpt-6-sol',requestedEffort:'xhigh',actualBackend:'NOT_CONFIRMED',actualEffort:'NOT_CONFIRMED',toolchain,readConfinementProbeSha256:sha(await fs.readFile(path.join(run,'instance/offline-probe-b.json'))),packetManifestSha256:sha(await fs.readFile(path.join(packet,'REVIEW-PACKET-MANIFEST.json'))),verifiedSourceFiles:paths.length,promptSha256:sha(prompt),cli,exitCode:0,threadId:'synthetic-unit-fixture',resultSha256:sha(report),candidateUnchanged:true,packetUnchanged:true};await json(run,'output/record.json',record)
 const receipt={run,owner,change:input.change,phase:'POST',scope:input.scope,status:'PASS',gateStatus:'PASS',release:trusted.digest,inputSha256:sha(JSON.stringify(input)),reviewPolicy,requestedModel:'gpt-6-sol',requestedEffort:'xhigh',threadId:record.threadId,resultSha256:record.resultSha256,candidateUnchanged:true,packetUnchanged:true};await json(run,'receipt.json',receipt)
 for(const [file,script] of [['prepare-execution.json','prepare-review.mjs'],['invoke-execution.json','invoke-review.mjs']])await json(run,file,{command:process.execPath,args:[path.join(run,'instance',script),path.join(run,'request.json')],cwd:candidate,exit:0,out:script==='invoke-review.mjs'?JSON.stringify({status:'PASS',gateStatus:'PASS',threadId:record.threadId,run:proof}):'{}',err:''})
 const indexPath=path.resolve(candidate,git(candidate,['rev-parse','--git-path','index'])),indexSha=sha(await fs.readFile(indexPath));await json(run,'owner-index-guard.json',{indexPath,head:owner.head,before:indexSha,after:indexSha})
 return {base,candidate,run,proof,release,owner,pointer}
}
async function verify(f){if(publication.verifyPublication)return publication.verifyPublication(f.release,f.owner,f.proof,f.pointer);return publication.publish(f.release,{...f.owner,common:path.join(f.base,'isolated-common')},f.proof)}
test('RSI-006 old trusted executor can prove a changed candidate without comparing instance to templates',async()=>{const f=await fixture();await assert.doesNotReject(verify(f))})
test('RSI-006 pure materialization reproduces all original instance bytes and mutations',async()=>{const f=await fixture(),original=await get(f.run,'instance-provenance.json'),input=await get(f.run,'input.json'),pins=await get(oldRoot,'scripts/agent-review/transport/provenance.json'),templates={};for(const name of ['integrity.mjs','policy.mjs','prepare-review.mjs','invoke-review.mjs','transport.test.mjs'])templates[name]=await fs.readFile(path.join(oldRoot,'scripts/agent-review/transport',name));const result=materializeInstance(templates,pins,trusted.digest,f.owner,f.run,input.policyArtifact,input.reviewPolicy);assert.deepEqual(result.provenance,original);for(const item of result.files)assert.equal(item.text,await fs.readFile(path.join(f.run,'instance',item.path),'utf8'))})

// Each case mutates one real on-disk proof link; assertions reject before writes.
const corrupt=async(f,file,edit)=>{const value=await get(f.run,file);await json(f.run,file,edit(value)??value)}
const cases=[
 ['outer executor release',f=>corrupt(f,'receipt.json',x=>{x.release=f.release.digest})],
 ['outer owner',f=>corrupt(f,'receipt.json',x=>{x.owner.branch='codex/foreign'})],
 ['input scope',f=>corrupt(f,'input.json',x=>{x.scope='altered'})],
 ['request scope',f=>corrupt(f,'request.json',x=>{x.scope='altered'})],
 ['model selection',f=>corrupt(f,'output/record.json',x=>{x.requestedModel='gpt-6-astra'})],
 ['reasoning selection',f=>corrupt(f,'output/record.json',x=>{x.requestedEffort='high'})],
 ['instance bytes despite submitted hash',async f=>{await fs.appendFile(path.join(f.run,'instance/integrity.mjs'),'\n// altered\n');await corrupt(f,'output/record.json',x=>{x.toolchain[0].sha256=sha('altered')})}],
 ['instance mutation provenance',f=>corrupt(f,'instance-provenance.json',x=>{x.mutations[0].newSha256='0'.repeat(64)})],
 ['CLI permissions',f=>corrupt(f,'output/record.json',x=>{x.cli.args.push('-c','approval_policy="on-request"')})],
 ['probe write allowance',f=>corrupt(f,'instance/offline-probe-b.json',x=>{const measured=JSON.parse(x.out);measured.write=true;x.out=JSON.stringify(measured)})],
 ['execution drift',f=>corrupt(f,'invoke-execution.json',x=>{x.args[0]='untrusted.mjs'})],
 ['truncated event stream',f=>put(f.run,'output/events.jsonl',JSON.stringify({type:'thread.started',thread_id:'synthetic-unit-fixture'})+'\n')],
 ['report byte drift',f=>put(f.run,'output/result.md','Different report\nGATE_STATUS: PASS\n')],
 ['candidate proof mutation',f=>corrupt(f,'output/candidate-after.json',x=>{x.artifacts[0].sha256='0'.repeat(64)})],
 ['packet proof mutation',f=>corrupt(f,'output/packet-after.json',x=>{x.artifacts.pop()})],
 ['extra packet artifact',f=>put(f.run,'prepared/packet/extra.txt','undeclared')],
 ['selected packet bytes',f=>fs.appendFile(path.join(f.run,'prepared/packet/scripts/agent-review/transport/integrity.mjs'),'changed')],
 ['live candidate bytes',f=>fs.appendFile(path.join(f.candidate,'scripts/agent-review/transport/integrity.mjs'),'changed')],
 ['raw index drift',async f=>{const guard=await get(f.run,'owner-index-guard.json');await fs.appendFile(guard.indexPath,'changed')}],
 ['expected pointer drift',async f=>{f.pointer=Buffer.from(f.pointer.toString()+' ')}],
]
for(const [name,mutate] of cases)test('RSI-007/008 rejects '+name+' without installing a pointer',async()=>{const f=await fixture();await mutate(f);await assert.rejects(verify(f));await assert.rejects(fs.stat(path.join(f.base,'isolated-common/frade-workflow/current.json')),e=>e.code==='ENOENT')})


test('RSI-006 package in authorized evidence binds unchanged shared public files and canonical eight controls',async()=>{const f=await fixture(true);await assert.doesNotReject(verify(f));assert.notEqual(f.release.root,f.owner.root)})
test('RSI-007 package cannot mask a canonical control source change',async()=>{const f=await fixture(true);await fs.appendFile(path.join(f.candidate,'scripts/agent-review/core.mjs'),'changed');await assert.rejects(verify(f))})
test('RSI-007 package cannot adopt unreviewed unrelated public workflow bytes',async()=>{const f=await fixture(true);await fs.appendFile(path.join(f.release.root,'docs/engineering/routing-v2-agent-handoff.md'),'changed');await assert.rejects(verify(f))})

test('POST-gap full unselected tracked bytes must stay frozen after review',async()=>{const f=await fixture(true);await fs.writeFile(path.join(f.candidate,'unselected-tracked.txt'),'changed after POST\n');await assert.rejects(verify(f))})
test('POST-gap supplemental index cannot be rebound to changed raw bytes',async()=>{const f=await fixture(true);git(f.candidate,['update-index','--assume-unchanged','unselected-tracked.txt']);const guard=await get(f.run,'owner-index-guard.json'),changed=sha(await fs.readFile(guard.indexPath));await corrupt(f,'owner-index-guard.json',x=>{x.before=x.after=changed});await assert.rejects(verify(f))})
test('POST-gap owner root cannot bypass exact evidence package source',async()=>{const f=await fixture(false);await assert.rejects(verify(f))})

test('POST2-gap packaged-only public artifacts do not need unselected root packet copies',async()=>{const f=await fixture(true);await assert.rejects(fs.stat(path.join(f.proof,'../prepared/packet/scripts/agent-review/cli.mjs')),e=>e.code==='ENOENT');await assert.doesNotReject(verify(f))})

test('POST3-members rejects omitted CLI from otherwise source-bound reviewed manifest',async()=>{const f=await fixture(true,{omit:"scripts/agent-review/cli.mjs"});await assert.rejects(verify(f))})

test('POST3-members rejects omitted control from otherwise source-bound reviewed manifest',async()=>{const f=await fixture(true,{omit:"scripts/agent-review/transport/integrity.mjs"});await assert.rejects(verify(f))})
test('POST3-members rejects unknown public artifact even with valid hashes',async()=>{const f=await fixture(true,{extra:'docs/engineering/unknown-fixture.md'});await assert.rejects(verify(f))})
test('POST3-members rejects duplicate canonical entry even with valid hashes',async()=>{const f=await fixture(true,{duplicate:'scripts/agent-review/cli.mjs'});await assert.rejects(verify(f))})

async function installedFixture(){const f=await fixture(true),installed=path.join(f.base,'installed');await fs.mkdir(installed);for(const item of [...f.release.manifest.files,{path:'scripts/agent-review/bundle.json'}])await put(installed,item.path,await fs.readFile(path.join(f.release.root,item.path)));return {...f,installed}}
const verifyInstalled=(f)=>publication.verifyInstalledRelease?publication.verifyInstalledRelease(f.installed,f.release):bundle(f.installed);
test('POST4-installed exact release directory accepts only reviewed files',async()=>{const f=await installedFixture();await assert.doesNotReject(verifyInstalled(f))})
test('POST4-installed extra preexisting bytes cannot be adopted by a valid bundle',async()=>{const f=await installedFixture();await put(f.installed,'unreviewed.txt','outside reviewed release');await assert.rejects(verifyInstalled(f))})
test('POST4-installed unknown empty directory is not part of reviewed layout',async()=>{const f=await installedFixture();await fs.mkdir(path.join(f.installed,'unreviewed-empty'));await assert.rejects(verifyInstalled(f))})
