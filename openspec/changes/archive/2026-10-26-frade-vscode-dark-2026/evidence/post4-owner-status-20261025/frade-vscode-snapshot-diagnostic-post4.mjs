import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,relative,isAbsolute} from 'node:path';
export const hash=b=>createHash('sha256').update(b).digest('hex');
export function safePath(root,path){if(typeof path!=='string'||!path||isAbsolute(path)||path.includes('\\')||path.split('/').some(p=>!p||p==='..'||p==='.'))throw Error('UNSAFE_PATH');const target=resolve(root,path),r=relative(root,target);if(!r||r==='..'||r.startsWith('..\\')||r.startsWith('../')||isAbsolute(r))throw Error('PATH_ESCAPE');return target;}
const stamp=s=>({dev:s.dev,ino:s.ino,size:s.size,mtimeMs:s.mtimeMs,ctimeMs:s.ctimeMs});
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Walk every ancestor, even when the leaf is absent; realpath(leaf) alone cannot do this.
async function inspectPath(root,path){
 const base=resolve(root),target=safePath(base,path);if(await fs.realpath(base)!==base)throw Error('SYMLINK_ROOT');
 let current=base;
 for(const segment of path.split('/')){
  current=resolve(current,segment);let s;
  try{s=await fs.lstat(current);}catch(e){if(e.code==='ENOENT')return {target,absent:true};throw e;}
  if(s.isSymbolicLink()||await fs.realpath(current)!==current)throw Error('SYMLINK_PATH');
  if(current!==target&&!s.isDirectory())throw Error('NONREGULAR_ANCESTOR');
  if(current===target){if(!s.isFile())throw Error('NONREGULAR_SOURCE');return {target,absent:false,stat:s};}
 }
 throw Error('UNSAFE_PATH');
}
export async function rawFile(root,path){
 const target=safePath(root,path);if(await fs.realpath(target)!==target)throw Error('SYMLINK_PATH');
 const before=await fs.lstat(target);if(!before.isFile()||before.isSymbolicLink())throw Error('NONREGULAR_SOURCE');
 const handle=await fs.open(target,'r');
 try{
  const opened=await handle.stat(),bound=await fs.lstat(target);
  if(!opened.isFile()||!equal(stamp(before),stamp(opened))||!equal(stamp(opened),stamp(bound))||await fs.realpath(target)!==target)throw Error('SOURCE_CHANGED:'+path);
  const bytes=await handle.readFile(),ended=await handle.stat(),after=await fs.lstat(target);
  if(!equal(stamp(opened),stamp(ended))||!equal(stamp(opened),stamp(after))||await fs.realpath(target)!==target)throw Error('SOURCE_CHANGED:'+path);
  return bytes;
 }finally{await handle.close();}
}
function validateIndex(bytes){
 if(bytes.length<32||bytes.toString('ascii',0,4)!=='DIRC'||![2,3].includes(bytes.readUInt32BE(4)))throw Error('UNSUPPORTED_INDEX');
 if(!createHash('sha1').update(bytes.subarray(0,-20)).digest().equals(bytes.subarray(-20)))throw Error('INVALID_INDEX_CHECKSUM');
 const count=bytes.readUInt32BE(8);let offset=12;
 for(let i=0;i<count;i++){
  const start=offset;if(offset+62>bytes.length-20)throw Error('INVALID_INDEX');
  const mode=bytes.readUInt32BE(offset+24),flags=bytes.readUInt16BE(offset+60);offset+=62;
  if(![0o100644,0o100755].includes(mode)||flags&0xc000||flags&0x3000)throw Error('UNSUPPORTED_INDEX_ENTRY');
  const nul=bytes.indexOf(0,offset);if(nul<0||nul>=bytes.length-20)throw Error('INVALID_INDEX');
  offset=start+Math.ceil((nul+1-start)/8)*8;
 }
 while(offset<bytes.length-20){
  if(offset+8>bytes.length-20)throw Error('INVALID_INDEX');const name=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32BE(offset+4);offset+=8;
  if(!/^[A-Z][A-Za-z0-9]{3}$/.test(name)||offset+size>bytes.length-20)throw Error('UNSUPPORTED_INDEX_EXTENSION');offset+=size;
 }
 if(offset!==bytes.length-20)throw Error('INVALID_INDEX');
}
async function indexIdentity(file){
 let before;try{before=await fs.lstat(file);}catch(e){if(e.code==='ENOENT')return {path:file,exists:false};throw e;}
 if(!before.isFile()||before.isSymbolicLink()||await fs.realpath(file)!==file)throw Error('UNSUPPORTED_INDEX_PATH');
 const bytes=await fs.readFile(file),after=await fs.lstat(file);if(!equal(stamp(before),stamp(after)))throw Error('INDEX_CHANGED');validateIndex(bytes);
 return {path:file,exists:true,...stamp(after),sha256:hash(bytes)};
}
export async function candidateSnapshot(root){
 root=resolve(root);if(await fs.realpath(root)!==root)throw Error('SYMLINK_ROOT');
 const git=args=>execFileSync('git',['--no-optional-locks','-c','core.longpaths=true','-c','core.fsmonitor=false',...args],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
 const indexPath=resolve(root,git(['rev-parse','--git-path','index']).trim()),index=await indexIdentity(indexPath);
 if(git(['rev-parse','--show-object-format']).trim()!=='sha1'||git(['rev-parse','--shared-index-path']).trim())throw Error('UNSUPPORTED_INDEX');
 const describe=()=>{
  const identity={head:git(['rev-parse','HEAD']).trim(),branch:git(['branch','--show-current']).trim(),status:git(['status','--porcelain=v1','-z','--untracked-files=all']),cachedNames:git(['diff','--cached','--name-only','-z']),index};
  if(identity.cachedNames)throw Error('STAGED_CHANGES');
  const entries=git(['ls-files','--stage','-z']).split('\0').filter(Boolean).map(line=>{const m=/^(100644|100755) ([a-f0-9]{40}) 0\t([\s\S]+)$/.exec(line);if(!m)throw Error('UNSUPPORTED_INDEX_ENTRY');safePath(root,m[3]);return {path:m[3],mode:m[1],indexBlob:m[2]};});
  if(new Set(entries.map(x=>x.path)).size!==entries.length)throw Error('UNSUPPORTED_INDEX_ENTRY');
  if(git(['ls-files','-v','-z']).split('\0').filter(Boolean).some(x=>x[0]!=='H'))throw Error('UNSUPPORTED_INDEX_FLAGS');
  const others=git(['ls-files','--others','--exclude-standard','-z']).split('\0').filter(Boolean);others.forEach(p=>safePath(root,p));
  const status=identity.status.split('\0').filter(Boolean),deleted=new Set();
  for(const item of status){const code=item.slice(0,2),p=item.slice(3);if(code===' D')deleted.add(p);else if(![' M','??',' T'].includes(code))throw Error('UNSUPPORTED_STATUS');}
  return {identity,entries,others,deleted:[...deleted].sort()};
 };
 const before=describe(),entryMap=new Map(before.entries.map(x=>[x.path,x]));
 const capture=async()=>{
  const artifacts=[],negativePresence=[];
  for(const p of [...new Set([...before.entries.map(x=>x.path),...before.others])].sort()){
   if(before.deleted.includes(p)){
    const lookup=await inspectPath(root,p),entry=entryMap.get(p);
    if(!lookup.absent)throw Error('SOURCE_CHANGED:'+p);if(!entry)throw Error('UNPROVEN_ABSENCE:'+p);negativePresence.push(entry);
   }else{const b=await rawFile(root,p);artifacts.push({path:p,bytes:b.length,sha256:hash(b)});}
  }
  if(negativePresence.length!==before.deleted.length)throw Error('UNPROVEN_ABSENCE');
  return {artifacts,negativePresence};
 };
 const first=await capture();const i1=await indexIdentity(indexPath),d1=describe();console.log(JSON.stringify({diagnosticOnly:true,stage:'first',indexEqual:equal(index,i1),describeEqual:equal(before,d1),indexBefore:index,indexAfter:i1,statusEqual:before.identity.status===d1.identity.status,changedKeys:Object.keys(before).filter(k=>!equal(before[k],d1[k]))}));
 const second=await capture();const i2=await indexIdentity(indexPath),d2=describe();const old=new Map(first.artifacts.map(x=>[x.path,x]));console.log(JSON.stringify({diagnosticOnly:true,stage:'second',artifactsEqual:equal(first,second),indexEqual:equal(index,i2),describeEqual:equal(before,d2),changedArtifacts:second.artifacts.filter(x=>!equal(x,old.get(x.path))),indexBefore:index,indexAfter:i2,statusEqual:before.identity.status===d2.identity.status,changedKeys:Object.keys(before).filter(k=>!equal(before[k],d2[k]))}));
 const state={identity:before.identity,...first};return {...state,digest:hash(JSON.stringify(state))};
}
export async function packetSnapshot(root){const artifacts=[];const walk=async path=>{for(const e of await fs.readdir(resolve(root,path),{withFileTypes:true})){const child=path?path+'/'+e.name:e.name;if(e.isSymbolicLink())throw Error('SYMLINK_PACKET');if(e.isDirectory())await walk(child);else if(e.isFile()){const b=await rawFile(root,child);artifacts.push({path:child,bytes:b.length,sha256:hash(b)});}else throw Error('NONREGULAR_PACKET');}};await walk('');artifacts.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);return {artifacts,digest:hash(JSON.stringify(artifacts))};}
export async function verifyPacketSource(candidate,packet,manifest){const seen=new Set();for(const a of manifest.artifacts){if(seen.has(a.path))throw Error('DUPLICATE_PATH');seen.add(a.path);for(const root of [candidate,packet]){const b=await rawFile(root,a.path);if(b.length!==a.bytes||hash(b)!==a.sha256)throw Error('SOURCE_OR_PACKET_DRIFT:'+a.path);}}return seen.size;}

await candidateSnapshot('E:/dev/codex/frade-worktrees/vscode-dark-2026');
