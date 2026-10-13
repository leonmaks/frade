import { describe, expect, it } from 'vitest'
import { InstallerJournal } from '../src/journal'
import { MemoryFilesystem, plan, tx, tx2, record } from './s2a-fixture'
const h='a'.repeat(64),owner={sessionId:'window-1',windowId:5,generation:13,requestId:'window/intent-13'}
async function committed(){
 const f=new MemoryFilesystem(),j=new InstallerJournal(f,1),p=plan(h)
 await j.begin(tx,p)
 for(const phase of ['VALIDATED','PREPARED','SWAPPED','PRESENTATION_ACK','COMMITTED','CLEANUP'])await j.phase(tx,phase)
 const s=await j.scan()
 await j.disposition(tx,{outcome:'RETAINED_COMMITTED',authorityHash:s.active!.committedHash,registry:p.newRegistry,presentation:p.newPresentation,consumedRevision:12,cleanupPending:[]})
 return {f,j,p}
}
describe('P02 S2b phase-specific cleanup intent and protected authority',()=>{
 it('admits removal intent for an old version needed before commit and cleanup-eligible after commit',async()=>{
  const {j,p}=await committed(),removal={...p,oldRegistry:p.newRegistry,newRegistry:{revision:2,entries:[]},oldPresentation:p.newPresentation,newPresentation:p.newPresentation,cleanup:[h]}
  const admitted=await j.begin(tx2,removal)
  expect(admitted.active?.plan.cleanup).toEqual([h]);expect(admitted.active?.plan.versions).toContain(h)
  expect(admitted.authority?.registry).toEqual(p.newRegistry)
 })
 it('records a candidate as potential rollback cleanup while protecting it after a valid marker',async()=>{
  const f=new MemoryFilesystem(),j=new InstallerJournal(f,1),p={...plan(h),cleanup:[h]}
  await j.begin(tx,p)
  for(const phase of ['VALIDATED','PREPARED','SWAPPED','PRESENTATION_ACK','COMMITTED','CLEANUP'])await j.phase(tx,phase)
  const s=await j.scan()
  await expect(j.disposition(tx,{outcome:'RETAINED_COMMITTED',authorityHash:s.active!.committedHash,registry:p.newRegistry,presentation:p.newPresentation,consumedRevision:12,cleanupPending:[h]})).rejects.toThrow()
  expect((await j.scan()).records).toHaveLength(7)
 })
 it('permits truthful locked candidate cleanupPending in the eight-record premarker rollback outcome',async()=>{
  const f=new MemoryFilesystem(),j=new InstallerJournal(f,1),p={...plan(h),cleanup:[h]}
  await j.begin(tx,p)
  for(const phase of ['VALIDATED','PREPARED','SWAPPED','PRESENTATION_ACK'])await j.phase(tx,phase)
  const target=record(13)
  await j.recoveryPlan(tx,{observed:p.newPresentation,target,mode:'WRITE',owner,consumedRevision:13})
  await j.phase(tx,'CLEANUP')
  const closed=await j.disposition(tx,{outcome:'ROLLED_BACK',authorityHash:null,registry:p.oldRegistry,presentation:target,consumedRevision:13,cleanupPending:[h]})
  expect(closed.records).toHaveLength(8);expect(closed.active).toBeNull()
  expect(closed.records.at(-1)?.record.payload.cleanupPending).toEqual([h])
 })
 it('never claims current old authority as rollback cleanupPending on a failed remove',async()=>{
  const {j,p}=await committed(),removal={...p,oldRegistry:p.newRegistry,newRegistry:{revision:2,entries:[]},oldPresentation:p.newPresentation,newPresentation:p.newPresentation,cleanup:[h]}
  await j.begin(tx2,removal)
  await j.recoveryPlan(tx2,{observed:p.newPresentation,target:p.newPresentation,mode:'NO_SETTINGS_WRITE',owner,consumedRevision:12})
  const s=await j.scan(),prior=s.records.find(r=>r.record.kind==='RecoveryDisposition')!.sha256
  await expect(j.disposition(tx2,{outcome:'ROLLED_BACK',authorityHash:prior,registry:p.newRegistry,presentation:p.newPresentation,consumedRevision:12,cleanupPending:[h]})).rejects.toThrow()
  expect((await j.scan()).active?.transactionId).toBe(tx2)
 })
})

