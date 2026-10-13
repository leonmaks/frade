import { describe, it, expect } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { createVerifiedFilesystem, NATIVE_FILESYSTEM_SOURCE_SHA256 } from '@frade/extension-service'
import type { VerifiedFilesystem } from '@frade/extension-service'
import { createPresentationSettings } from '../../src/main/presentation-settings'
import type { PresentationRecord, PresentationChoice, PresentationPhase } from '@frade/runtime-contracts'
const distributionDirectory=fileURLToPath(new URL('../../../../packages/extension-service/dist/native/',import.meta.url))
const choice=(mode:'light'|'dark'):PresentationChoice=>({mode,density:'compact',preferred:{light:'frade.builtin/light',dark:'frade.builtin/dark','high-contrast':'frade.builtin/high-contrast'}})
const record=(revision:number,mode:'light'|'dark'='light'):PresentationRecord=>({version:1,revision,generation:10,transactionId:'window-1/intent-original',selection:choice(mode)})
async function fixture(run:(root:string,open:(generation:number)=>Promise<VerifiedFilesystem>)=>Promise<void>){
 const parent=await fs.realpath(os.tmpdir()),root=await fs.mkdtemp(path.join(parent,'frade-p02-owned-main-')),
  sentinel=path.join(root,'outside-original'),started=performance.now()
 await fs.writeFile(sentinel,'outside-original')
 let live:VerifiedFilesystem|undefined
 const open=async(generation:number)=>{live=await createVerifiedFilesystem({installationRoot:path.join(root,'extensions'),distributionDirectory,sourceSha256:NATIVE_FILESYSTEM_SOURCE_SHA256,generation});return live}
 try{await run(root,open)}finally{
  await live?.dispose()
  expect(await fs.readFile(sentinel,'utf8')).toBe('outside-original')
  const resolved=await fs.realpath(root)
  if(path.dirname(resolved).toLowerCase()!==parent.toLowerCase()||!path.basename(resolved).startsWith('frade-p02-owned-main-'))throw Error('UNSAFE_OWNED_MAIN_CLEANUP')
  await fs.rm(resolved,{recursive:true})
  console.log(JSON.stringify({scope:'Actual Main owned settings while existing shipped NTFS helper is bound; coordinator/full kills NOT_RUN',durationMs:Math.round(performance.now()-started),outsideUnchanged:true,powerLoss:'NOT_PROVEN'}))
 }
}
if(process.platform==='win32'&&process.arch==='x64'){
 describe('P02 actual NTFS/private Main exact record proof',()=>{
  it('keeps the checked root bound while consuming11/reserving12/writing exact12, then denies a competing ordinary write',()=>fixture(async(root,open)=>{
   const target=path.join(root,'presentation-settings.json');await fs.writeFile(target,JSON.stringify(record(9))+'\n')
   const native=await open(1),store=createPresentationSettings({userData:root,sessionId:'window-1',windowId:5})
   await store.initialize();const {generation}=await store.announceIntent('window-1/intent-runtime'),
    context:PresentationPhase={version:1,sessionId:'window-1',requestId:'window-1/intent-runtime',transactionId:'window-1/intent-runtime',generation,revision:1,membership:1,phase:'apply'},
    owner=await store.coordinator.acquire(context)
   await store.coordinator.seed(owner,[record(9)],11)
   const planned=await store.coordinator.reserve(owner,choice('dark'))
   expect(planned.revision).toBe(12)
   expect((await store.persist(context,choice('light'),9)).status).toBe('REFUSED')
   expect((await store.coordinator.write(owner,planned)).durable).toEqual(planned)
   expect(await fs.readFile(target,'utf8')).toBe(JSON.stringify(planned)+'\n')
   expect(native.state).toBe('VERIFIED');await store.coordinator.release(owner)
  }))
  it('restores exact journal-owned13 with a bound helper and fresh Main owner, then repeats13 without14',()=>fixture(async(root,open)=>{
   const target=path.join(root,'presentation-settings.json'),planned=record(13)
   await fs.writeFile(target,JSON.stringify(record(12))+'\n')
   const first=await open(1),store=createPresentationSettings({userData:root,sessionId:'fresh-window',windowId:5}),
    owner=await store.coordinator.recover([record(9),record(12),planned],13)
   expect((await store.coordinator.write(owner,planned)).durable).toEqual(planned)
   const bytes=await fs.readFile(target)
   await store.coordinator.release(owner);await first.dispose()
   const second=await open(2),fresh=createPresentationSettings({userData:root,sessionId:'next-window',windowId:6}),
    next=await fresh.coordinator.recover([record(9),record(12),planned],13)
   expect((await fresh.coordinator.write(next,planned)).durable).toEqual(planned)
   expect(await fs.readFile(target)).toEqual(bytes)
   expect((await fresh.coordinator.reserve(next,choice('dark'))).revision).toBe(14)
   expect(second.state).toBe('VERIFIED');await fresh.coordinator.release(next)
  }))
  it('reuses a genuine complete settings stage13 after process-restart setup without reallocating',()=>fixture(async(root,open)=>{
   const target=path.join(root,'presentation-settings.json'),planned=record(13)
   await fs.writeFile(target,JSON.stringify(record(12,'dark'))+'\n')
   await fs.writeFile(target+'.staged',JSON.stringify(planned)+'\n')
   const native=await open(1),store=createPresentationSettings({userData:root,sessionId:'fresh-window',windowId:5}),
    owner=await store.coordinator.recover([record(9),record(12,'dark'),planned],13)
   expect((await store.coordinator.write(owner,planned)).durable).toEqual(planned)
   expect(await fs.readFile(target,'utf8')).toBe(JSON.stringify(planned)+'\n')
   await expect(fs.lstat(target+'.staged')).rejects.toMatchObject({code:'ENOENT'})
   expect(native.state).toBe('VERIFIED');await store.coordinator.release(owner)
  }))
  it('blocks unknown actual/staged settings with unchanged ordinary bytes and no default startup cleanup',()=>fixture(async(root,open)=>{
   const target=path.join(root,'presentation-settings.json'),actual=JSON.stringify(record(12,'dark'))+'\n',stage='unexpected'
   await fs.writeFile(target,actual);await fs.writeFile(target+'.staged',stage)
   const native=await open(1),store=createPresentationSettings({userData:root,sessionId:'fresh-window',windowId:5})
   await expect(store.coordinator.recover([record(9),record(12,'dark'),record(13)],13)).rejects.toThrow()
   expect(await fs.readFile(target,'utf8')).toBe(actual);expect(await fs.readFile(target+'.staged','utf8')).toBe(stage)
   expect(native.state).toBe('VERIFIED')
  }))
 })
}else{
 it('reports Windows owned native proof NOT_RUN and refuses an unsupported backend before effects',async()=>{
  await expect(createVerifiedFilesystem({installationRoot:path.join(os.tmpdir(),'frade-p02-unsupported-uncreated','extensions'),distributionDirectory,sourceSha256:NATIVE_FILESYSTEM_SOURCE_SHA256,generation:1})).rejects.toThrow()
  console.log('P02_OWNED_MAIN_WINDOWS_NATIVE_NOT_RUN: unsupported host; portable Main cases are separate evidence')
 })
}

