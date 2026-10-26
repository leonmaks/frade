const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../../../../..'), req=createRequire(path.join(root,'packages/ui-workspace/package.json')),ts=req('typescript');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'), read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const livePath='apps/desktop/tests/e2e/ui-contract-theme.spec.ts',oldDir='openspec/changes/frade-light-diagram-editor/decisions/lde-refusal-intent-01/';
const live=read(livePath),oldDraft=read(oldDir+'ui-contract-theme.intent-guard.draft.ts'), candidate=fs.readFileSync(path.join(__dirname,'ui-contract-theme.phase-intent-guard.draft.ts'),'utf8');
const cache=new Map();
function load(rel){
 if(cache.has(rel))return cache.get(rel).exports;
 const mod={exports:{}};cache.set(rel,mod);
 const source=read(rel),js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const localRequire=id=>{assert.ok(id.startsWith('.'),'Only actual relative Frade source');const next=path.posix.normalize(path.posix.join(path.posix.dirname(rel),id+'.ts'));assert.ok(!next.startsWith('../'));return load(next)};
 vm.runInNewContext(js,{module:mod,exports:mod.exports,require:localRequire,setTimeout,clearTimeout,structuredClone,AbortController},{filename:rel,timeout:1000});return mod.exports;
}
const {createPresentationService}=load('packages/ui-workspace/src/design/theme/service.ts'),{builtinTokens}=load('packages/ui-workspace/src/design/generated/tokens.ts');
function callback(source){
 const sf=ts.createSourceFile('fixture.ts',source,ts.ScriptTarget.Latest,true);let node;
 function visit(n){if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text==='addInitScript'&&n.arguments[0]?.getText(sf).includes('__p01RefuseDark')){assert.equal(node,undefined);node=n.arguments[0]}ts.forEachChild(n,visit)}visit(sf);assert.ok(node);
 const listeners=[],replies=[],win={addEventListener:(type,fn)=>{if(type==='message')listeners.push(fn)}};
 const context={window:win,parent:{postMessage:(value,origin)=>replies.push({value:JSON.parse(value),origin})},document:{addEventListener(){}},requestAnimationFrame(){},performance:{now:()=>1},location:{host:'probe-only'}};
 vm.runInNewContext(ts.transpileModule('('+node.getText(sf)+')()',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context,{timeout:1000});assert.equal(listeners.length,1);
 return {arm:value=>{win.__p01RefuseDark=value},dispatch(data){const start=replies.length;let stopped=false;listeners[0]({data:JSON.stringify(data),stopImmediatePropagation(){stopped=true}});const reply=replies[start];if(reply){assert.equal(replies.length,start+1);assert.deepEqual(reply.value.context,JSON.parse(JSON.stringify(data.context)));assert.equal(reply.value.status,'REFUSED');assert.equal(reply.value.message,'Controlled current frame refusal');assert.equal(reply.origin,'frade://app')}return {refused:!!reply,stopped}}};
}
const selection=mode=>({mode,density:'compact',preferred:{light:'frade.builtin/light',dark:'frade.builtin/dark','high-contrast':'frade.builtin/high-contrast'}});
const snapshot=(kind,revision=0)=>({id:'frade.builtin/'+kind,label:kind,kind,density:'compact',revision,colors:{...builtinTokens.themes[kind]},effectiveColors:{...builtinTokens.themes[kind]},forcedColors:false,status:'VALID',repairPasses:0,issues:[],compatibility:{recognized:[],ignored:[],repaired:[]}});
async function sequence(source,{priorPreview=false,membership=false,commit=false,project=true}={}){
 const f=callback(source),trace=[],initial=snapshot('light');let generation=0,persistCalls=0,visible=false,recoveryCalls=0,inject=false,joined;
 let durable={revision:0,generation:0,transactionId:'boot',selection:selection('light')};const durableBefore=JSON.stringify(durable);
 const host={announceIntent:async()=>({generation:++generation}),persist:async(context,choice)=>{persistCalls++;durable={revision:durable.revision+1,generation:context.generation,transactionId:context.transactionId,selection:choice};return {status:'ACK',durable}},reconcile:async()=>durable};
 const barrier={paint:async()=>{visible=true},reveal:()=>{visible=false},recovery:()=>{visible=true;recoveryCalls++}};
 const service=createPresentationService({sessionId:'probe',initialSnapshot:initial,initialDurable:durable,host,barrier});
 const ack=(context,id)=>({...context,participantId:id,participantGeneration:1,painted:true});
 const extra={id:'extra',generation:1,hide(){},reveal(){},async prepare(value,context){trace.push({participant:'extra',operation:'prepare',context:{...context},kind:value.kind});return {apply:async next=>ack(next,'extra'),rollback:async(_,next)=>ack(next,'extra'),dispose(){}}}};
 const participant={id:'frame',generation:1,requiresPaintCover:true,hide(){},reveal(){},async prepare(value,context){
   const projected=project?{...value,id:'frade.builtin/light',kind:'light',colors:{...builtinTokens.themes.light},effectiveColors:{...builtinTokens.themes.light}}:value;
   const reply=f.dispatch({action:'fradePresentation',operation:'prepare',snapshot:projected,context,participantId:'frame',participantGeneration:1});
   trace.push({participant:'frame',operation:'prepare',kind:projected.kind,context:{...context},refused:reply.refused});
   if(inject&&context.phase==='prepare'){inject=false;joined=service.register(extra).ready.then(()=>({status:'READY'}),error=>({status:'ERROR',message:String(error)}))}
   if(reply.refused)throw Error('Controlled current frame refusal');
   return {apply:async next=>{trace.push({participant:'frame',operation:'apply',context:{...next}});return ack(next,'frame')},rollback:async(_,next)=>{trace.push({participant:'frame',operation:'rollback',context:{...next}});return ack(next,'frame')},dispose(){}};
 }};
 await service.register(participant).ready;
 let preview;if(priorPreview){preview=await service.preview(selection('dark'),snapshot('dark'));assert.equal(preview.status,'APPLIED')}
 f.arm(true);inject=membership;
 const target=await (commit?service.commit(selection('dark'),snapshot('dark')):service.preview(selection('dark'),snapshot('dark')));
 const afterTarget=service.state(),targetVisible=visible,join=joined?await joined:undefined;
 const cancel=await service.cancel();
 const result={priorPreview,membership,commit,project,previewStatus:preview?.status,targetStatus:target.status,phaseAfterTarget:afterTarget.phase,currentRevisionAfterTarget:afterTarget.snapshot.revision,previewAfterTarget:afterTarget.preview,barrierAfterTarget:targetVisible,cancelStatus:cancel.status,finalPhase:service.state().phase,join,persistCalls,recoveryCalls,durableUnchanged:JSON.stringify(durable)===durableBefore,trace};
 return result;
}
function phaseChecks(){const f=callback(candidate),base={version:1,sessionId:'probe',requestId:'probe/intent-1',transactionId:'probe/intent-1',generation:1,revision:1,membership:1,phase:'prepare'},checks=[];
 const check=(name,patch,refused,operation='prepare',kind='light')=>{const data={action:'fradePresentation',operation,snapshot:{kind},context:{...base,...patch}},actual=f.dispatch(data);assert.equal(actual.refused,refused,name);assert.equal(actual.stopped,refused,name);checks.push({name,expectedRefused:refused,...actual})};
 check('unarmed forward is allowed',{},false);f.arm(true);
 check('boot join cannot capture target',{phase:'join',revision:0},false);
 check('compensation before forward cannot capture target',{phase:'rollback',revision:0},false);
 check('missing phase cannot capture target',{phase:undefined},false);
 check('wrong operation cannot capture target',{},false,'apply');
 check('rollback operation cannot capture target',{phase:'rollback'},false,'rollback');
 check('wrong kind cannot capture target',{},false,'prepare','dark');
 check('target forward is refused',{},true);
 check('membership reprepare remains refused',{membership:2},true);
 check('same request compensation is allowed',{phase:'rollback',revision:0},false);
 check('same request join remains allowed',{phase:'join',revision:0},false);
 check('same target remains refused after rollback',{},true);
 check('distinct cancel is allowed',{requestId:'probe/intent-2',transactionId:'probe/intent-2'},false);
 check('target remains refused after cancel',{},true);
 f.arm(false);f.arm(true);
 check('explicit rearm captures next target',{requestId:'probe/intent-3',transactionId:'probe/intent-3'},true);
 f.arm(false);check('disarm permits target',{requestId:'probe/intent-3',transactionId:'probe/intent-3'},false);
 return checks;
}
(async()=>{
 const original=await sequence(live,{priorPreview:true,project:false});assert.equal(original.targetStatus,'REFUSED');assert.equal(original.cancelStatus,'CANCELED');assert.equal(original.recoveryCalls,0);
 const acceptedCounterexample=await sequence(oldDraft,{priorPreview:true});assert.equal(acceptedCounterexample.targetStatus,'RECOVERY_BLOCKED');assert.ok(acceptedCounterexample.trace.some(x=>x.operation==='prepare'&&x.context.phase==='rollback'&&x.refused));
 const checks=phaseChecks(),scenarios=[];
 for(const options of [{},{priorPreview:true},{commit:true},{priorPreview:true,commit:true},{membership:true},{priorPreview:true,membership:true}]){
  const result=await sequence(candidate,options);assert.equal(result.targetStatus,'REFUSED');assert.equal(result.cancelStatus,'CANCELED');assert.equal(result.recoveryCalls,0);assert.equal(result.barrierAfterTarget,false);assert.equal(result.currentRevisionAfterTarget,0);assert.equal(result.previewAfterTarget,false);assert.equal(result.persistCalls,0);assert.equal(result.durableUnchanged,true);if(result.join)assert.equal(result.join.status,'READY');
  const targetForwards=result.trace.filter(x=>x.participant==='frame'&&x.operation==='prepare'&&x.context.phase==='prepare'&&x.refused);assert.equal(targetForwards.length,options.membership?2:1);assert.equal(new Set(targetForwards.map(x=>x.context.requestId)).size,1);
  if(options.priorPreview)assert.ok(result.trace.some(x=>x.participant==='frame'&&x.operation==='prepare'&&x.context.phase==='rollback'&&!x.refused));
  const baseline=await sequence(live,{...options,project:false});
  const comparable=x=>({targetStatus:x.targetStatus,phaseAfterTarget:x.phaseAfterTarget,currentRevisionAfterTarget:x.currentRevisionAfterTarget,previewAfterTarget:x.previewAfterTarget,barrierAfterTarget:x.barrierAfterTarget,cancelStatus:x.cancelStatus,finalPhase:x.finalPhase,join:x.join,persistCalls:x.persistCalls,recoveryCalls:x.recoveryCalls,durableUnchanged:x.durableUnchanged,trace:x.trace.map(({kind,...rest})=>rest)});
  assert.deepEqual(comparable(result),comparable(baseline),'Exact service state/phase/context/refusal preservation versus original');
  scenarios.push({...result,originalServiceParity:'PASS'});
 }
 const servicePath='packages/ui-workspace/src/design/theme/service.ts',typesPath='packages/ui-workspace/src/design/theme/types.ts';
 console.log(JSON.stringify({atUtc:new Date().toISOString(),status:'PASS',limits:'Real unchanged service/state transitions plus actual extracted/transpiled fixture callback; mocked paint/host transport, not Electron/IPC/rendering PASS',original,acceptedCounterexample:{...acceptedCounterexample,status:'REPRODUCED_FAIL'},phaseChecks:checks,scenarios,sources:[livePath,servicePath,typesPath].map(p=>({path:p,sha256:digest(fs.readFileSync(path.join(root,p)))})),candidateSha256:digest(candidate),probeSha256:digest(fs.readFileSync(__filename))},null,2));
})().catch(error=>{console.error(error);process.exitCode=1});
