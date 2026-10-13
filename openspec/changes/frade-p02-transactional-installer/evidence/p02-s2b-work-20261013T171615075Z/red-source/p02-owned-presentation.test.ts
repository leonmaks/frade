import { describe, expect, it } from 'vitest'
import { createPresentationSettings } from '../../src/main/presentation-settings'
import type { PresentationFiles } from '../../src/main/presentation-settings'
import type { PresentationRecord, PresentationPhase, PresentationChoice } from '@frade/runtime-contracts'
const choice = (mode: 'light' | 'dark'): PresentationChoice => ({ mode, density:'compact', preferred:{light:'frade.builtin/light',dark:'frade.builtin/dark','high-contrast':'frade.builtin/high-contrast'} })
const record = (revision:number, mode:'light'|'dark'='light'):PresentationRecord => ({version:1,revision,generation:10,transactionId:'window-1/intent-original',selection:choice(mode)})
type Lease = any
interface OwnedPort {
 acquire(context:PresentationPhase):Promise<Lease>
 recover(records:PresentationRecord[], consumedRevision:number):Promise<Lease>
 seed(owner:Lease, records:PresentationRecord[], consumedRevision:number):Promise<void>
 read(owner:Lease):Promise<PresentationRecord>
 reserve(owner:Lease, selection:PresentationChoice):Promise<PresentationRecord>
 write(owner:Lease, target:PresentationRecord):Promise<any>
 release(owner:Lease):Promise<void>
}
async function fixture(actual=record(9), staged?:string) {
 const root='C:/frade-p02-owned-fixture', target=root+'/presentation-settings.json', stage=target+'.staged',
  data=new Map<string,string>([[target,JSON.stringify(actual)+'\n']]), trace:string[]=[]
 if(staged!==undefined)data.set(stage,staged)
 const files:PresentationFiles={
  async read(p){trace.push('read');return data.get(p.replaceAll('\\','/'))},
  async stage(p,b){trace.push('stage');p=p.replaceAll('\\','/');if(data.has(p))throw Error('EXCLUSIVE_STAGE');data.set(p,b)},
  async rename(a,b){trace.push('rename');a=a.replaceAll('\\','/');b=b.replaceAll('\\','/');if(!data.has(a))throw Error('NO_STAGE');data.set(b,data.get(a)!);data.delete(a)},
  async remove(p){trace.push('remove');data.delete(p.replaceAll('\\','/'))},
 }
 const store=createPresentationSettings({userData:root,sessionId:'window-1',windowId:5,files})
 const context=async()=>{await store.initialize();const {generation}=await store.announceIntent('window-1/intent-runtime');return {version:1,sessionId:'window-1',requestId:'window-1/intent-runtime',transactionId:'window-1/intent-runtime',generation,revision:1,membership:1,phase:'apply'} as PresentationPhase}
 // RED uses the existing callable Main path, not a missing import. It demonstrates
 // ordinary allocation/reconcile/initialize behavior against required owned semantics.
 // GREEN selects the real private Main port; the legacy path remains unable to pass.
 const legacy:OwnedPort={
  async acquire(ctx){return {context:ctx,consumed:0}},
  async recover(records,consumed){await store.initialize();const {generation}=await store.announceIntent('window-1/intent-recovery');return {context:{version:1,sessionId:'window-1',requestId:'window-1/intent-recovery',transactionId:'window-1/intent-recovery',generation,revision:1,membership:1,phase:'rollback'},records,consumed}},
  async seed(o,records,consumed){o.records=records;o.consumed=consumed},
  async read(){return JSON.parse(data.get(target)!)},
  async reserve(o,selection){const base=await legacy.read(o);return {...base,revision:Math.max(base.revision,o.consumed)+1,generation:o.context.generation,transactionId:o.context.transactionId,selection}},
  async write(o,value){const actual=await legacy.read(o);if(o.context.phase==='rollback'){return {status:'ACK',durable:await store.reconcile(o.context,{...actual,selection:value.selection})}}return store.persist(o.context,value.selection,actual.revision)},
  async release(){},
 }
 const port=(Reflect.get(store,'coordinator') as OwnedPort|undefined)??legacy
 return {store,port,context,trace,data,target,stage,actual:()=>JSON.parse(data.get(target)!) as PresentationRecord}
}
describe('P02 owned Main reservation and exact journal target',()=>{
 it('consumes max11 and writes reserved12 exactly, including request and generation, without allocating again',async()=>{
  const f=await fixture(),owner=await f.port.acquire(await f.context())
  await f.port.seed(owner,[record(9)],11)
  const planned=await f.port.reserve(owner,choice('dark'))
  expect(planned.revision).toBe(12)
  expect(f.trace.filter(x=>x==='stage')).toHaveLength(0)
  const result=await f.port.write(owner,planned)
  expect(result.status).toBe('ACK');expect(result.durable).toEqual(planned);expect(f.actual()).toEqual(planned)
 })
 it('refuses competing ordinary writes while the exact record is reserved, with no stage effect',async()=>{
  const f=await fixture(),context=await f.context(),owner=await f.port.acquire(context)
  await f.port.seed(owner,[record(9)],11);await f.port.reserve(owner,choice('dark'))
  const before=f.data.get(f.target),writes=f.trace.filter(x=>x==='stage').length
  expect((await f.store.persist(context,choice('light'),9)).status).toBe('REFUSED')
  expect(f.data.get(f.target)).toBe(before);expect(f.trace.filter(x=>x==='stage')).toHaveLength(writes)
 })
 it('refuses a second owner and reuses one reservation only for the identical selection',async()=>{
  const f=await fixture(),context=await f.context(),owner=await f.port.acquire(context)
  await expect(f.port.acquire(context)).rejects.toThrow()
  await f.port.seed(owner,[record(9)],11)
  const first=await f.port.reserve(owner,choice('dark'))
  expect(await f.port.reserve(owner,choice('dark'))).toEqual(first)
  await expect(f.port.reserve(owner,choice('light'))).rejects.toThrow()
 })
 it('invalidates stale ownership before another settings effect',async()=>{
  const f=await fixture(),owner=await f.port.acquire(await f.context())
  await f.port.seed(owner,[record(9)],11);const planned=await f.port.reserve(owner,choice('dark')),before=f.data.get(f.target)
  await f.store.announceIntent('window-1/intent-later')
  const result=await f.port.write(owner,planned)
  expect(result.status).not.toBe('ACK');expect(f.data.get(f.target)).toBe(before)
 })
 it('same-selection observed12 still writes the full pre-journalled13 rather than returning12',async()=>{
  const old=record(9),observed=record(12),planned=record(13),f=await fixture(observed),
   owner=await f.port.recover([old,observed,planned],13)
  const result=await f.port.write(owner,planned)
  expect(result.status).toBe('ACK');expect(result.durable).toEqual(planned);expect(f.actual()).toEqual(planned)
 })
 it('restart registers journal-owned13 and reapplies it exactly; repeated restore never allocates14',async()=>{
  const old=record(9),observed=record(12,'dark'),planned=record(13),f=await fixture(observed),
   owner=await f.port.recover([old,observed,planned],13)
  expect((await f.port.write(owner,planned)).durable).toEqual(planned)
  expect((await f.port.write(owner,planned)).durable).toEqual(planned)
  expect(f.actual()).toEqual(planned);expect(f.trace.filter(x=>x==='stage')).toHaveLength(1)
 })
 it('NO_SETTINGS_WRITE preserves exact old9 bytes while cancelled consumed12 makes next reserve13',async()=>{
  const old=record(9),f=await fixture(old),before=f.data.get(f.target),owner=await f.port.recover([old,record(12,'dark')],12)
  expect(await f.port.read(owner)).toEqual(old)
  expect(f.data.get(f.target)).toBe(before)
  const next=await f.port.reserve(owner,choice('dark'))
  expect(next.revision).toBe(13);expect(f.trace.filter(x=>x==='stage')).toHaveLength(0)
 })
 it('unknown actual record blocks journal recovery before writes and preserves exact bytes',async()=>{
  const f=await fixture(record(15,'dark')),before=f.data.get(f.target)
  await expect(f.port.recover([record(9),record(12,'dark'),record(13)],13)).rejects.toThrow()
  expect(f.data.get(f.target)).toBe(before);expect(f.trace.filter(x=>x==='stage'||x==='rename'||x==='remove')).toHaveLength(0)
 })
 it('unknown staged bytes are preserved; startup does not blindly delete them before journal ownership',async()=>{
  const f=await fixture(record(12,'dark'),'unexpected-owned-by-nobody'),before=f.data.get(f.target)
  await expect(f.port.recover([record(9),record(12,'dark'),record(13)],13)).rejects.toThrow()
  expect(f.data.get(f.stage)).toBe('unexpected-owned-by-nobody');expect(f.data.get(f.target)).toBe(before)
 })
 it('forged target at a journal-known revision refuses without overwriting actual settings',async()=>{
  const f=await fixture(record(12,'dark')),owner=await f.port.recover([record(9),record(12,'dark'),record(13)],13),
   before=f.data.get(f.target),forged={...record(13),transactionId:'window-1/forged'}
  const result=await f.port.write(owner,forged)
  expect(result.status).not.toBe('ACK');expect(f.data.get(f.target)).toBe(before)
 })
 it('conflicting same-revision candidates and a 65th cached record are refused before effects',async()=>{
  const f=await fixture(),owner=await f.port.acquire(await f.context()),before=f.data.get(f.target)
  await expect(f.port.seed(owner,[record(9),{...record(9),selection:choice('dark')}],9)).rejects.toThrow()
  await expect(f.port.seed(owner,Array.from({length:65},(_,i)=>record(i)),64)).rejects.toThrow()
  expect(f.data.get(f.target)).toBe(before);expect(f.trace.filter(x=>x==='stage')).toHaveLength(0)
 })
})

