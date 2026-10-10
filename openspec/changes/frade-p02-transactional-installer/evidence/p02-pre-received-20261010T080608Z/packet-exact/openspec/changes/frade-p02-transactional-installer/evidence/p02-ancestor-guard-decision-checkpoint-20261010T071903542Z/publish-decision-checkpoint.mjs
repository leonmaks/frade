import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';const mp='C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json',m=JSON.parse(fs.readFileSync(mp)),at=new Date().toISOString(),dir=m.base+'/evidence/p02-ancestor-guard-decision-checkpoint-'+at.replace(/[-:.]/g,''),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),save=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});assert.equal(sha(fs.readFileSync(m.ancestorMetadataProposal.file)),m.ancestorMetadataProposal.sha256);assert.equal(sha(fs.readFileSync('packages/extension-service/native/windows-filesystem.cs')),'06b443cdcff44055ac5b18322194e5a6796a74bbcd6950496661a2fd5e128e03');fs.mkdirSync(dir);
fs.appendFileSync(m.base+'/tasks.md',`\n## Required native blocker decision checkpoint\n\n${at}: task2.2 remainsIN_PROGRESS/BLOCKED,3/9. Native9 current4PASS/5FAIL after deterministic new RED; original4 unchanged and PASS. Main UNKNOWN preserves old bytes, root/cached-child enumeration and recursive cleanup are REFUSED, owned Temp sibling renameEBUSY until disposal. Current fixture typecheck/lintPASS; initial unsafe-finallyFAIL and exact same-body helper extraction RCA retained. Portable43/archive59 prior current102PASS; strict active existing plan/UIcompliance currentPASS. Immediate-parent PRE471files/83events PASS reportSHA60f6c8a445d372ba13784c254c6dab2316b618b25bf50018a869046d0397446f does not cover broader guards/additional defects. Proposed exact ${m.ancestorMetadataProposal.file}, SHA${m.ancestorMetadataProposal.sha256}, awaits material architecture decision; current design/proposal/spec intent not changed to adopt it. No production metadata handoff; capabilitiesNOT_VERIFIED. New scope requires coherent strict/new independent PRE Sol/xhigh before repair.\n`);
fs.writeFileSync(m.status,`# Frade UI Design Contract — P02: требуется решение по защите ancestors

Обновлено ${at}. Branch codex/frade-ui-design-contract; worktree C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade; common E:/dev/codex/frade/.git. Исходный program98f387f96b51b0ad139e3507c376ff1c3e8dec09/P02${m.baselineHead} сохранены. Guide v1.0. Routing независим; чужие ветки/код не изменены.

| Этап | Фактический статус |
| --- | --- |
| Audit/planning repair/foundation | CLOSED / ARCHIVED |
| P01 theme resolver/preview | CLOSED / ARCHIVED; точные3minorOPEN_ACCEPTED_DEFERRED и rawFAIL сохранены |
| P02 transactional installer | 3/9;2.2IN_PROGRESS/BLOCKED: native guard/owned-object defects, требуется архитектурное решение |
| P03 VS Code theme import | NOT_STARTED |
| P04 icon registries | NOT_STARTED |
| P05 isolated browser host | NOT_STARTED |
| P06 native contribution APIs | NOT_STARTED |
| P07 registry/profiles/policy | NOT_STARTED |
| Shell → tree/tabs → forms/tables/LoV → Draw/flow manager → AI migration | NOT_STARTED как отдельная последовательная миграция; ранее выполненная основа/P01 сохранены |

## P02: задачи текущего этапа

| Задача | Статус и результат |
| --- | --- |
|1.1 Audit/predecessor/scope/baseline | DONE |
|1.2 Initial strict/independent PRE | DONE; новые amendments требуют своих PRE |
|2.1 Archive/path/limit/semver RED + immutable sample | DONE; компонент59PASS |
|2.2 Staging/validation/journal/native backend/Main picker bridge | IN_PROGRESS/BLOCKED; portable protocol43PASS; native частичный,9actual tests4PASS/5FAIL; installer/bridge не готовы |
|2.3 Crash/recovery/rollback/Windows locks | NOT_DONE; actual transaction kill/reopen ещё не реализован |
|2.4 ExtensionsUI/lifecycle/P01 fallback/dirty state | NOT_DONE |
|3.1 Full applicable package/root/BDD/security/a11y/visual checks | NOT_DONE; выполненные component checks ниже, полные gates NOT_RUN |
|3.2 OpenSpec verify + independent cumulative POST | NOT_RUN / READY_FOR_VERIFY:NO |
|3.3 Archive/close P02 | NOT_RUN; STOPbeforeP03 |

## Последние проверки и изменения

- Reviewed NT same-source-parent rename implemented in native helper; fresh build/source/artifact integrity PASS; original4 actual Windows regressions PASS. SourceSHA06b443cdcff44055ac5b18322194e5a6796a74bbcd6950496661a2fd5e128e03.
- Immediate-parent repair independent PRE PASS: ${m.mainParentMetadataPRE.dir}/verification.json;83events/471files, exact requested Sol/xhigh/confinement/hashesPASS, actualbackend/effortNOT_CONFIRMED. Focused plan permission only; no runtime/P02 closure. Its receipts/checkpoints d3993895/31bb93cd COMMITTED/PUSHED remoteverified.
- Native9 current4PASS/5FAIL, raw p02-check-native-owned-red-current-20261010T071437707Z. Actual Main persistenceUNKNOWN/old bytes retained; root lease listing/cached child listing/recursive cleanupREFUSED; own outer Temp sibling renameEBUSY. These are OPEN_REQUIRED_BLOCKERS, no minor waiver.
- Portable/archive102PASS retained; current typecheck/lintPASS, strict current active planPASS, UIcompliancePASS. Fixture lintFAIL preserved at p02-check-lint-native-owned-red-20261010T071030622Z; repaired identical cleanup body checked, no assertions weakened. Mistaken build entry and diagnostic compiler/scope guard failures preserved separately.
- CapabilitiesNOT_VERIFIED; no shipping installer/native runtime integration claim. Full adversarial/protocol/death/deploy/dev/build/start/general/P01/security/UI/a11y/visual/verify/POST NOT_RUN.
- Изменённых UI экранов нет: текущий ремонт инфраструктурный; новых screenshots нет. P01 baselines/evidence сохранены.

## Необходимое решение

[Точный P02-ANCESTOR-METADATA-HANDOFF-01](../../${m.ancestorMetadataProposal.file}), SHA256${m.ancestorMetadataProposal.sha256}. Предлагается после полного исходного bind/strong root/lease удерживать ту же внешнюю цепочку через перекрывающиеся metadata handles, сохранив все share masks и сильные root/child/source handles. Это меняет механизм защиты всей цепочки, а текущий design:217 разрешает только immediate parent. Диагностика нового варианта положительна для Main/sibling и проверенных атак, но не является полным security PASS. Native production/current active design не изменены в его пользу.

После принятия: точный acceptance → coherent plan → strict → automatic independent PRE gpt-6-sol/xhigh → actual TDD repair/native GREEN/full remaining checks. Если безопасность не доказана, STOP; ни одного waiver. Во всех случаях owned-object listing/cleanup сохраняют lease/guards и meaningful tests.

## Git и панель

Guard decision/RED/checks checkpoint publicationPENDING. Публикация только в user-authorized origin git@github.com:leonmaks/frade.git/ref refs/heads/codex/frade-ui-design-contract, безforce, с remote SHAverification. Rightpanelqueued/visibilityunconfirmed. Merge protectionLOCAL_ONLY/NOT_CONFIGURED. Dashboard не заменяет approvals/raw evidence.

## Предыдущие записи

`+fs.readFileSync(m.status,'utf8'));fs.copyFileSync(process.argv[1],dir+'/publish-decision-checkpoint.mjs',fs.constants.COPYFILE_EXCL);
const git=a=>{const e=spawnSync('D:/Program Files/Git/mingw64/bin/git.exe',['-c','core.longpaths=true','-c','core.autocrlf=false','-c','status.renames=false','-c','diff.renames=false',...a],{encoding:'utf8',windowsHide:true,timeout:240000,maxBuffer:24*1024*1024,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});assert(!e.error,String(e.error));return{exitCode:e.status,stdout:e.stdout,stderr:e.stderr};},ok=a=>{const e=git(a);assert.equal(e.exitCode,0,e.stderr||e.stdout);return e.stdout.trim();},test='packages/extension-service/tests/filesystem.windows.test.ts',allowed=p=>p===test||p===m.status||p.startsWith(m.base+'/');assert.equal(ok(['rev-parse','HEAD']),m.head);assert.equal(ok(['branch','--show-current']),'codex/frade-ui-design-contract');assert.equal(ok(['diff','--cached','--name-only']),'');const st=git(['status','--porcelain','-z','--untracked-files=all']);assert.equal(st.exitCode,0);assert(st.stdout.split('\0').filter(Boolean).every(x=>allowed(x.slice(3))));
ok(['add','--',test,m.base,m.status]);const paths=ok(['diff','--cached','--name-only']).split('\n').filter(Boolean);assert(paths.every(allowed));const known=new Map();for(const p of paths)if(p.endsWith('/stdout.txt')||p.endsWith('/stderr.txt')){const e=JSON.parse(fs.readFileSync(path.dirname(p)+'/execution.json'));known.set(p,e[p.endsWith('/stdout.txt')?'stdoutSha256':'stderrSha256']);}const wc=['-c','core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol','diff','--cached','--no-renames','--check'],checks=[],exceptions=[];let batch=[],count=0;const batches=[];for(const p of paths){if(count+p.length+3>12000&&batch.length){batches.push(batch);batch=[];count=0;}batch.push(p);count+=p.length+3;}if(batch.length)batches.push(batch);for(const scope of batches){const c=git([...wc,'--',...scope]);checks.push({scope,...c});if(c.exitCode===0)continue;assert.equal(c.exitCode,2,c.stderr);const failed=[...new Set([...c.stdout.matchAll(/^(.+?):\d+: (?:trailing whitespace|new blank line at EOF)\.$/gm)].map(x=>x[1]))];assert(failed.length);for(const p of failed){assert(known.has(p),'UNATTESTED_RAW_WHITESPACE '+p);assert.equal(sha(fs.readFileSync(p)),known.get(p));exceptions.push({path:p,sha256:known.get(p)});}const rest=scope.filter(p=>!failed.includes(p));if(rest.length)assert.equal(git([...wc,'--',...rest]).exitCode,0);}
save(dir+'/publication-controls.json',{atUtc:new Date().toISOString(),status:'P02_OWNED_RED_AND_EXACT_PENDING_GUARD_DECISION',headBefore:m.head,paths,checks,rawWhitespaceExceptions:exceptions,productionChanged:false,native:'4PASS/5FAIL',proposal:m.ancestorMetadataProposal,readyForVerify:false});ok(['add','--',dir+'/publication-controls.json']);ok(['commit','--quiet','-m','test(ui): preserve P02 native guard blockers and propose handoff']);const checkpoint=ok(['rev-parse','HEAD']),ref='refs/heads/codex/frade-ui-design-contract',tr=['-c','url.https://github.com/leonmaks/frade.git.insteadOf=git@github.com:leonmaks/frade.git','-c','pack.threads=1','-c','pack.windowMemory=64m'];ok([...tr,'push','origin',checkpoint+':'+ref]);assert.equal(ok([...tr,'ls-remote','origin',ref]).split(/\s+/)[0],checkpoint);save(dir+'/publication.json',{atUtc:new Date().toISOString(),status:'PUSHED_REMOTE_SHA_VERIFIED',checkpoint,ref,tasks:'3/9',native:'4PASS/5FAIL',proposalSHA:m.ancestorMetadataProposal.sha256,readyForVerify:false});fs.writeFileSync(m.status,fs.readFileSync(m.status,'utf8').replace('Guard decision/RED/checks checkpoint publicationPENDING','Guard decision/RED/checks checkpoint '+checkpoint+' COMMITTED/PUSHED remoteSHAverified; metadata receipt follows'));ok(['add','--',m.status,dir+'/publication.json']);assert.equal(git(wc).exitCode,0);ok(['commit','--quiet','-m','docs(ui): record P02 guard decision checkpoint publication']);m.head=ok(['rev-parse','HEAD']);ok([...tr,'push','origin',m.head+':'+ref]);assert.equal(ok([...tr,'ls-remote','origin',ref]).split(/\s+/)[0],m.head);assert.equal(ok(['status','--porcelain']),'');m.ancestorGuardDecisionCheckpoint={dir,checkpoint,head:m.head};m.phase='WAITING_MATERIAL_ANCESTOR_GUARD_DECISION';fs.writeFileSync(mp,JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify({status:'EXACT_GUARD_PROPOSAL_PUBLISHED_CLEAN',head:m.head,checkpoint,proposal:m.ancestorMetadataProposal,native:'4PASS/5FAIL',tasks:'3/9',readyForVerify:false}));
