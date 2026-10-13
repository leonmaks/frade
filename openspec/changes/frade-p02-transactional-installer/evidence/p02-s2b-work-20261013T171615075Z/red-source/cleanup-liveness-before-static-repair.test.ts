import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { createVerifiedFilesystem, NATIVE_FILESYSTEM_SOURCE_SHA256 } from '../src/filesystem/factory'
import type { VerifiedFilesystem } from '../src/filesystem/factory'
import { CheckedFiles, CheckedStorage } from '../src/storage'
import { InstallerJournal } from '../src/journal'
import { hash, plan, tx } from './s2a-fixture'

const compatible=await fs.readFile(new URL('./fixtures/compatible-light-dark.frade-extension',import.meta.url))
const tokens=JSON.parse(await fs.readFile(new URL('../../ui-workspace/tokens/tokens.json',import.meta.url),'utf8'))
const distributionDirectory=fileURLToPath(new URL('../dist/native/',import.meta.url))
const options={appVersion:'0.1.0',apiVersion:'1.0.0',themeRoles:Object.keys(tokens.themes.light)}

/** Diagnostic only: proves refusal and candidate strategy, never a production recovery claim. */
describe('P02 S2b actual locked cleanup liveness diagnostic',()=>{
 it('proves that a real Windows lock closes the old context, and a fresh full scan can close the same reserved outcome without retrying deletion',async()=>{
  if(process.platform!=='win32'||process.arch!=='x64')throw Error('P02_LOCKED_CLEANUP_NATIVE_NOT_RUN')
  const parent=await fs.realpath(os.tmpdir()), temp=await fs.mkdtemp(path.join(parent,'frade-p02-cleanup-liveness-')),
   root=path.join(temp,'extensions'),outside=path.join(temp,'outside-original'),started=performance.now(),h=hash(compatible)
  await fs.writeFile(outside,'outside-original')
  let live:VerifiedFilesystem|undefined
  let releaseLock:(()=>Promise<void>)|undefined
  const open=async(generation:number)=>{
   live=await createVerifiedFilesystem({installationRoot:root,distributionDirectory,sourceSha256:NATIVE_FILESYSTEM_SOURCE_SHA256,generation})
   return live
  }
  try{
   const first=await open(1),j=new InstallerJournal(first,1),p={...plan(h),cleanup:[h]}
   await j.begin(tx,p)
   expect((await new CheckedStorage(first).putArchive(compatible,h,options,()=>j.scan())).status).toBe('VALID')
   for(const phase of ['VALIDATED','PREPARED','SWAPPED','PRESENTATION_ACK'])await j.phase(tx,phase)
   await j.recoveryPlan(tx,{observed:p.oldPresentation,target:p.oldPresentation,mode:'NO_SETTINGS_WRITE',
    owner:{sessionId:'window-1',windowId:5,generation:13,requestId:'window/intent-13'},consumedRevision:12})
   await j.phase(tx,'CLEANUP')
   const before=await j.scan(),prefix=before.records.map(r=>({name:r.name,sha256:r.sha256})),
    target=['versions',h,'archive.frade-extension'],entry=(await new CheckedFiles(first).list(['versions',h]))[0]
   expect(before.records).toHaveLength(7);expect(before.remainingSlots).toBe(1)
   expect(entry.name).toBe('archive.frade-extension')
   const code="$stream=[System.IO.FileStream]::new($env:FRADE_OWNED_LOCK_PATH,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::Read); try { [Console]::Out.WriteLine('FRADE_LOCK_READY'); [Console]::Out.Flush(); [Console]::In.ReadLine() | Out-Null } finally { $stream.Dispose() }"
   const lock=spawn('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',code],
    {windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,FRADE_OWNED_LOCK_PATH:path.join(root,...target)}})
   let errors='',output=''
   lock.stderr.on('data',b=>{errors+=b;if(errors.length>4096)lock.kill()})
   const exited=new Promise<void>(resolve=>lock.once('close',()=>resolve()))
   releaseLock=async()=>{lock.stdin.end('\n');await exited}
   await new Promise<void>((resolve,reject)=>{
    const timer=setTimeout(()=>{lock.kill();reject(Error('LOCK_SETUP_TIMEOUT '+errors))},5000)
    lock.once('error',e=>{clearTimeout(timer);reject(e)})
    lock.once('exit',()=>{clearTimeout(timer);reject(Error('LOCK_SETUP_EXIT '+errors))})
    lock.stdout.on('data',b=>{output+=b;if(output.includes('FRADE_LOCK_READY')){clearTimeout(timer);resolve()}else if(output.length>4096){lock.kill();reject(Error('LOCK_SETUP_OVERFLOW'))}})
   })
   let refusal:unknown
   try{await first.request({operation:'remove',path:target,kind:'file',expectedIdentity:entry.identity})}catch(e){refusal=e}
   expect(refusal).toBeInstanceOf(Error);expect(String(refusal)).toContain('WIN32_32')
   expect(first.state).toBe('CLOSED')
   const closing={outcome:'ROLLED_BACK' as const,authorityHash:null,registry:p.oldRegistry,presentation:p.oldPresentation,consumedRevision:12,cleanupPending:[h]}
   let oldClose:unknown
   try{await j.disposition(tx,closing)}catch(e){oldClose=e}
   expect(oldClose).toBeInstanceOf(Error)
   await first.dispose()
   const second=await open(2),fresh=new InstallerJournal(second,2),reopened=await fresh.scan()
   expect(reopened.records.map(r=>({name:r.name,sha256:r.sha256}))).toEqual(prefix)
   expect(reopened.active?.recovery?.target).toEqual(p.oldPresentation)
   expect(reopened.authority?.registry).toEqual(p.oldRegistry)
   expect(reopened.pending).toEqual([]);expect(reopened.remainingSlots).toBe(1)
   // Conservative pending: checked version-directory identity proves presence. Do NOT retry or enumerate locked children.
   const actual=(await new CheckedFiles(second).list(['versions'])).find(e=>e.name===h)
   expect(actual?.kind).toBe('directory')
   const closed=await fresh.disposition(tx,closing)
   expect(closed.records).toHaveLength(8);expect(closed.active).toBeNull()
   expect(closed.records.slice(0,7).map(r=>({name:r.name,sha256:r.sha256}))).toEqual(prefix)
   expect(closed.records.at(-1)?.record.payload.cleanupPending).toEqual([h])
   await second.dispose()
   await releaseLock();releaseLock=undefined
   expect(hash(await fs.readFile(path.join(root,...target)))).toBe(h)
   const third=await open(3),again=await new InstallerJournal(third,3).scan()
   expect(again.records.map(r=>r.sha256)).toEqual(closed.records.map(r=>r.sha256))
   expect(again.active).toBeNull()
   console.log(JSON.stringify({scope:'DIAGNOSTIC_ONLY; production coordinator/owner/Main reconciliation NOT_IMPLEMENTED',
    nativeLock:'WIN32_32',oldContext:'CLOSED',sameContextClosing:'FAIL',freshScanSameEnvelope:'PASS',
    records:8,prefixUnchanged:true,candidateBytesUnchanged:true,lockHeldDuringClosing:true,
    durationMs:Math.round(performance.now()-started),powerLoss:'NOT_PROVEN'}))
  }finally{
   await releaseLock?.()
   await live?.dispose()
   expect(await fs.readFile(outside,'utf8')).toBe('outside-original')
   const actual=await fs.realpath(temp)
   if(path.dirname(actual).toLowerCase()!==parent.toLowerCase()||!path.basename(actual).startsWith('frade-p02-cleanup-liveness-'))throw Error('UNSAFE_OWNED_CLEANUP_FIXTURE')
   await fs.rm(actual,{recursive:true})
  }
 },20000)
})
