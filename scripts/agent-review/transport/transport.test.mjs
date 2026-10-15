import {test,after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {resolve,dirname,relative,isAbsolute} from 'node:path';import {tmpdir} from 'node:os';import {execFileSync} from 'node:child_process';import {safePath,hash,verifyPacketSource,packetSnapshot,candidateSnapshot} from './integrity.mjs';const root=await fs.mkdtemp(resolve(tmpdir(),'frade-review-adversarial-'));after(async()=>{const base=await fs.realpath(tmpdir()),target=await fs.realpath(root),rel=relative(base,target);assert.ok(rel&&!rel.startsWith('..')&&!isAbsolute(rel)&&target.startsWith(resolve(base,'frade-review-adversarial-')));await fs.rm(target,{recursive:true});});const source=resolve(root,'source'),packet=resolve(root,'packet');await fs.mkdir(source);await fs.mkdir(packet);const path='a file.txt',data=Buffer.from('alpha\r\nbeta\n');await fs.writeFile(resolve(source,path),data);await fs.writeFile(resolve(packet,path),data);const manifest={artifacts:[{path,bytes:data.length,sha256:hash(data)}]};
test('exact source bytes and copied packet bind one artifact including EOL',async()=>assert.equal(await verifyPacketSource(source,packet,manifest),1));
test('absolute and traversal paths fail closed',()=>{for(const p of ['../outside','nested/../../outside','C:/private','/private','nested\\private','./a'])assert.throws(()=>safePath(packet,p));});
test('duplicate evidence entry fails',async()=>assert.rejects(verifyPacketSource(source,packet,{artifacts:[...manifest.artifacts,...manifest.artifacts]}),/DUPLICATE/));
test('one byte packet drift fails even with same byte count',async()=>{await fs.writeFile(resolve(packet,path),Buffer.from('Alpha\r\nbeta\n'));await assert.rejects(verifyPacketSource(source,packet,manifest),/DRIFT/);await fs.writeFile(resolve(packet,path),data);});
test('one byte original source drift fails',async()=>{await fs.writeFile(resolve(source,path),Buffer.from('Alpha\r\nbeta\n'));await assert.rejects(verifyPacketSource(source,packet,manifest),/DRIFT/);await fs.writeFile(resolve(source,path),data);});
test('extra packet artifact changes full packet digest',async()=>{const before=await packetSnapshot(packet);await fs.writeFile(resolve(packet,'new.txt'),'extra');assert.notEqual((await packetSnapshot(packet)).digest,before.digest);});
test('junction cannot expose source outside packet',async()=>{const junction=resolve(packet,'junction');await fs.symlink(source,junction,'junction');await assert.rejects(packetSnapshot(packet),/SYMLINK/);});
test('full candidate includes untracked bytes and Git identity',async()=>{const c=resolve(root,'candidate');await fs.mkdir(c);const git=args=>execFileSync('git',args,{cwd:c,encoding:'utf8',stdio:['ignore','pipe','pipe']});git(['init','-b','codex/review-fixture']);git(['-c','user.name=Review Fixture','-c','user.email=fixture@localhost','commit','--allow-empty','-m','isolated fixture']);await fs.writeFile(resolve(c,'original.txt'),'one');const before=await candidateSnapshot(c);assert.equal(before.artifacts.length,1);assert.equal(before.identity.branch,'codex/review-fixture');await fs.writeFile(resolve(c,'original.txt'),'two');assert.notEqual((await candidateSnapshot(c)).digest,before.digest);await fs.writeFile(resolve(c,'added.txt'),'new');assert.equal((await candidateSnapshot(c)).artifacts.length,2);});

import {validatePhase,assertAllowedArtifact,configs,parseVerdict} from './policy.mjs';
test('PRE and POST use the same pinned read-only policy',()=>{assert.equal(validatePhase('PRE'),'PRE');assert.equal(validatePhase('POST'),'POST');assert.throws(()=>validatePhase('ARCHIVE'));const policy=configs().join('\n');assert.match(policy,/:root.*deny/);assert.match(policy,/enabled=false/);assert.match(policy,/model_reasoning_effort="xhigh"/);assert.match(policy,/inherit="none"/);});
test('private paths and live secret-shaped content fail closed',()=>{for(const path of ['.env','.env.local','.aws/credentials','.codex/auth.json','.ssh/id_rsa','secrets.key'])assert.throws(()=>assertAllowedArtifact(path,Buffer.from('fixture')));assert.throws(()=>assertAllowedArtifact('safe.txt',Buffer.from('sk-'+ 'A'.repeat(40))));assertAllowedArtifact('docs/config.md',Buffer.from('OPENAI_API_KEY environment variable name only'));});
const complete=JSON.stringify({type:'thread.started',thread_id:'fixture'})+'\n'+JSON.stringify({type:'turn.completed'})+'\n';
test('actual PASS and FAIL are separate from transport completion',()=>{assert.equal(parseVerdict(complete,'GATE_STATUS: PASS\n',0).gateStatus,'PASS');assert.equal(parseVerdict(complete,'GATE_STATUS: FAIL\n',0).gateStatus,'FAIL');});
test('nonzero CLI result never counts as reviewer PASS',()=>assert.throws(()=>parseVerdict(complete,'GATE_STATUS: PASS\n',2),/TRANSPORT/));
test('truncated or failed event stream rejects a plausible report',()=>{assert.throws(()=>parseVerdict('{}\n','GATE_STATUS: PASS\n',0),/INCOMPLETE/);assert.throws(()=>parseVerdict(complete+JSON.stringify({type:'turn.failed'}),'GATE_STATUS: PASS\n',0),/INCOMPLETE/);});
test('missing and duplicate verdicts fail closed',()=>{assert.throws(()=>parseVerdict(complete,'Looks good',0),/AMBIGUOUS/);assert.throws(()=>parseVerdict(complete,'GATE_STATUS: PASS\nGATE_STATUS: FAIL\n',0),/AMBIGUOUS/);});

test('credential-shaped data fields are excluded before packet egress',()=>{for(const key of ['apiKey','access_token','refresh-token','client_secret','password'])assert.throws(()=>assertAllowedArtifact('ordinary.json',Buffer.from(JSON.stringify({[key]:'X'.repeat(40)}))),/SENSITIVE/);});

// RSI regressions use real Git/index/filesystem operations in owned OS-temp roots.
const fixtureGit=(cwd,args)=>execFileSync('git',['-c','core.longpaths=true',...args],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
async function trackedFixture(name='tracked.txt') {
 const dir=resolve(root,'git-'+(++fixtureSequence));await fs.mkdir(dir);
 fixtureGit(dir,['init','-b','codex/review-fixture']);await fs.mkdir(dirname(resolve(dir,name)),{recursive:true});await fs.writeFile(resolve(dir,name),'original\r\n');
 fixtureGit(dir,['add','--',name]);fixtureGit(dir,['-c','user.name=Review Fixture','-c','user.email=fixture@localhost','commit','-m','isolated fixture']);return dir;
}
let fixtureSequence=0;
test('RSI-002 unstaged tracked absence binds exact index blob without live bytes',async()=>{
 const c=await trackedFixture();const stage=fixtureGit(c,['ls-files','--stage','-z']).split('\t')[0].split(' ');await fs.unlink(resolve(c,'tracked.txt'));
 const a=await candidateSnapshot(c),b=await candidateSnapshot(c);
 assert.deepEqual(a.negativePresence,[{path:'tracked.txt',mode:stage[0],indexBlob:stage[1]}]);assert.equal(a.artifacts.length,0);assert.equal(a.digest,b.digest);
 await fs.writeFile(resolve(c,'tracked.txt'),'original\r\n');assert.notEqual((await candidateSnapshot(c)).digest,a.digest);
});
test('RSI-001 reading dirty stat cache preserves exact raw index bytes',async()=>{
 const c=await trackedFixture(),file=resolve(c,'tracked.txt'),index=resolve(c,'.git/index');
 await fs.utimes(file,new Date('2001-01-01T00:00:00Z'),new Date('2001-01-01T00:00:00Z'));const before=await fs.readFile(index);
 const a=await candidateSnapshot(c);assert.deepEqual(await fs.readFile(index),before);assert.equal((await candidateSnapshot(c)).digest,a.digest);
});
test('RSI-005 staged deletion is never negative presence',async()=>{
 const c=await trackedFixture();fixtureGit(c,['rm','--','tracked.txt']);await assert.rejects(candidateSnapshot(c),/STAGED/);
});
test('RSI-002 NUL-safe paths preserve spaces apostrophes and unicode',async()=>{
 const name="odd [space] ' Ω.txt",c=await trackedFixture(name);await fs.unlink(resolve(c,name));const s=await candidateSnapshot(c);
 assert.equal(s.negativePresence[0].path,name);assert.equal(s.negativePresence.length,1);
});
test('RSI-004 missing tracked child below a junction fails containment',async()=>{
 const c=await trackedFixture('nested/child.txt'),outside=resolve(root,'outside-empty');await fs.mkdir(outside);await fs.unlink(resolve(c,'nested/child.txt'));await fs.rmdir(resolve(c,'nested'));await fs.symlink(outside,resolve(c,'nested'),'junction');
 await assert.rejects(candidateSnapshot(c),/SYMLINK/);
});
// Drive the same controlled read-time mutation through path and FileHandle APIs.
// This changes fixture mechanics only; all failure assertions remain exact.
function bridgeHandleReads(target){const originalOpen=fs.open;fs.open=async function(file,...args){const handle=await originalOpen.call(this,file,...args);if(String(file)===target){const read=handle.readFile.bind(handle);handle.readFile=async(...params)=>{const bytes=await read(...params);await fs.readFile(target);return bytes;};}return handle;};return ()=>{fs.open=originalOpen;};}
test('RSI-003 disappearing untracked live artifact cannot be reclassified absent',async()=>{
 const c=await trackedFixture(),target=resolve(c,'untracked.txt');await fs.writeFile(target,'new');const original=fs.readFile;let removed=false;
 fs.readFile=async function(file,...args){if(String(file)===target&&!removed){removed=true;await fs.unlink(target);}return original.call(this,file,...args);};
 const restoreOpen=bridgeHandleReads(target);
 try{await assert.rejects(candidateSnapshot(c),/ENOENT|SOURCE|DRIFT/);assert.equal(removed,true);}finally{fs.readFile=original;restoreOpen();}
});
test('RSI-004 live bytes changed after a read reject capture',async()=>{
 const c=await trackedFixture(),target=resolve(c,'tracked.txt'),original=fs.readFile;let changed=false;
 fs.readFile=async function(file,...args){const b=await original.call(this,file,...args);if(String(file)===target&&!changed){changed=true;await fs.writeFile(target,'modified\r\n');}return b;};
 const restoreOpen=bridgeHandleReads(target);
 try{await assert.rejects(candidateSnapshot(c),/DRIFT|CHANGED/);assert.equal(changed,true);}finally{fs.readFile=original;restoreOpen();}
});
test('RSI-005 raw index mutation during capture rejects instead of granting a digest',async()=>{
 const c=await trackedFixture(),target=resolve(c,'tracked.txt'),original=fs.readFile;let changed=false;
 fs.readFile=async function(file,...args){const b=await original.call(this,file,...args);if(String(file)===target&&!changed){changed=true;fixtureGit(c,['update-index','--assume-unchanged','tracked.txt']);}return b;};
 const restoreOpen=bridgeHandleReads(target);
 try{await assert.rejects(candidateSnapshot(c),/INDEX|DRIFT|CHANGED|UNSUPPORTED/);assert.equal(changed,true);}finally{fs.readFile=original;restoreOpen();}
});
test('RSI-005 split index rejects unsupported negative-presence semantics',async()=>{
 const c=await trackedFixture();fixtureGit(c,['update-index','--split-index']);await assert.rejects(candidateSnapshot(c),/UNSUPPORTED/);
});
test('RSI-005 index version four rejects until explicitly supported',async()=>{
 const c=await trackedFixture();fixtureGit(c,['update-index','--index-version','4']);await assert.rejects(candidateSnapshot(c),/UNSUPPORTED/);
});
test('RSI-005 skip-worktree and assume-unchanged flags reject hidden worktree state',async()=>{
 for(const flag of ['--skip-worktree','--assume-unchanged']){const c=await trackedFixture();fixtureGit(c,['update-index',flag,'tracked.txt']);await assert.rejects(candidateSnapshot(c),/UNSUPPORTED/);}
});
