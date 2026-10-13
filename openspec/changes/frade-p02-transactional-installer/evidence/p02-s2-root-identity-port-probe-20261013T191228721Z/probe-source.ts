import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {it,expect} from 'vitest'
import {createVerifiedFilesystem,NATIVE_FILESYSTEM_SOURCE_SHA256} from '../src/filesystem/factory'
import type {VerifiedFilesystem} from '../src/filesystem/factory'
const distributionDirectory=fileURLToPath(new URL('../dist/native/',import.meta.url))
async function owned(target:string,container:string){
 const actual=await fs.realpath(target),base=await fs.realpath(container)
 const relative=path.relative(base,actual)
 if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw Error('UNSAFE_OWNED_MOVE')
 return actual
}
it('diagnoses whether existing checked public identities distinguish a physically replaced root after disposal',async()=>{
 if(process.platform!=='win32'||process.arch!=='x64')throw Error('ROOT_IDENTITY_NATIVE_NOT_RUN')
 const parent=await fs.realpath(os.tmpdir()),temp=await fs.mkdtemp(path.join(parent,'frade-p02-root-identity-')),
 root=path.join(temp,'extensions'),moved=path.join(temp,'previous-root'),outside=path.join(temp,'outside-sentinel'),hash='a'.repeat(64)
 await fs.mkdir(path.join(root,'versions',hash),{recursive:true});await fs.mkdir(path.join(root,'journal'))
 await fs.writeFile(path.join(root,'versions',hash,'archive.frade-extension'),'diagnostic-owned-bytes');await fs.writeFile(outside,'outside-original')
 let live:VerifiedFilesystem|undefined
 const open=async(generation:number)=>live=await createVerifiedFilesystem({installationRoot:root,distributionDirectory,sourceSha256:NATIVE_FILESYSTEM_SOURCE_SHA256,generation})
 const observation=async(port:VerifiedFilesystem)=>({capabilities:port.capabilities,rootEntries:port.rootEntries,
  versions:(await port.request({operation:'list',path:['versions'],limit:128,cursor:null})).entries,
  archive:(await port.request({operation:'list',path:['versions',hash],limit:128,cursor:null})).entries})
 try{
  const first=await open(1),before=await observation(first),beforeRoot=await fs.stat(root,{bigint:true})
  await first.dispose();expect(first.state).toBe('CLOSED')
  await owned(root,temp)
  if(path.dirname(moved)!==temp||path.dirname(root)!==temp)throw Error('UNSAFE_OWNED_MOVE_DESTINATION')
  await fs.rename(root,moved);await fs.mkdir(root)
  for(const name of ['.coordinator.lock','versions','journal']){
   const from=await owned(path.join(moved,name),temp),to=path.join(root,name)
   await owned(root,temp)
   if(path.dirname(to)!==root)throw Error('UNSAFE_OWNED_CHILD_DESTINATION')
   await fs.rename(from,to)
  }
  const afterRoot=await fs.stat(root,{bigint:true}),second=await open(2),after=await observation(second)
  expect(beforeRoot.ino).not.toBe(afterRoot.ino);expect(beforeRoot.dev).toBe(afterRoot.dev)
  expect(after).toEqual(before);expect(second.state).toBe('VERIFIED')
  expect(await fs.readFile(path.join(root,'versions',hash,'archive.frade-extension'),'utf8')).toBe('diagnostic-owned-bytes')
  console.log(JSON.stringify({scope:'ISOLATED_DIAGNOSTIC_ONLY',physicalRootReplaced:true,oracle:'Node stat only in fixture; not production authority',
   originalInode:String(beforeRoot.ino),replacementInode:String(afterRoot.ino),rootPublicChildEvidenceUnchanged:true,
   versionsParentAndArchiveIdentityUnchanged:true,bothFactoryProofs:'VERIFIED',oldContextClosedBeforeRebind:true,
   finding:'EXISTING_PUBLIC_PORT_CANNOT_PROVE_ORIGINAL_ROOT_IDENTITY',nativeProtocolChanged:false}))
 }finally{
  await live?.dispose();expect(await fs.readFile(outside,'utf8')).toBe('outside-original')
  const actual=await fs.realpath(temp)
  if(path.dirname(actual).toLowerCase()!==parent.toLowerCase()||!path.basename(actual).startsWith('frade-p02-root-identity-'))throw Error('UNSAFE_OWNED_FIXTURE_CLEANUP')
  await fs.rm(actual,{recursive:true})
 }
},20000)
