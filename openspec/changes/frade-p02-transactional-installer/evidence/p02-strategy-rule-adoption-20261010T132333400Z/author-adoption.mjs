import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
const root='C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade';
assert.equal(process.cwd().replaceAll('\\','/'),root);
const mp='C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json';
const m=JSON.parse(fs.readFileSync(mp));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const git=args=>{const r=spawnSync('D:/Program Files/Git/mingw64/bin/git.exe',['-c','core.longpaths=true','-c','core.autocrlf=false','-c','status.renames=false','-c','diff.renames=false',...args],{encoding:'utf8',windowsHide:true,timeout:60000});assert(!r.error);assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
assert.equal(git(['branch','--show-current']),'codex/frade-ui-design-contract');
assert.equal(git(['rev-parse','HEAD']),m.head);assert.equal(git(['status','--porcelain']),'');
const prior=m.strategyAnalysis.dir;
assert.equal(sha(fs.readFileSync(prior+'/analysis.md')),'9468492294f829f2771dd9ff39fd604c5a56736fe9ae5e7468ed12738ca35d8f');
const atUtc=new Date().toISOString(),dir=m.base+'/evidence/p02-strategy-rule-adoption-'+atUtc.replace(/[-:.]/g,'');
fs.mkdirSync(dir);
const save=(name,v)=>fs.writeFileSync(dir+'/'+name,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const rule=`---

## 18. Strategy Before Expensive Work

Before substantial implementation, an expensive review, bulk processing, or a long
test run, analyze the feasible strategies for achieving the required result.
Do not default to executing the largest procedure or repeatedly processing the
same volume.

Record and communicate before execution:

1. The objective, acceptance criteria, and evidence needed to prove completion.
2. All materially different feasible alternatives, including the existing
   approach, removing duplicate work, incremental checks, safe reuse of verified
   results, isolation or parallel execution, and algorithm or tool changes.
   Explain why an alternative is inapplicable when relevant.
3. For each viable alternative: expected time, resource and token cost, risks,
   dependencies, and uncertainty. Distinguish measured durations from forecasts
   and hard timeouts; label any success probability as measured or judgment.
4. The selected strategy and why it offers the best expected path to the required
   result while preserving correctness and the required evidence.
5. A bounded initial probe when major costs are unknown, progress observations,
   a reassessment point, and criteria for stopping or changing strategy.

Optimize execution without weakening specifications, assertions, historical
regressions, source binding, isolation, or independent review requirements.
Run each required check on the exact applicable inputs; avoid duplicate complete
runs when equivalent coverage can be demonstrated. Change a mandated procedure
only within user-authorized scope and reconcile its formal contract first.

If observed costs or failures invalidate the selected strategy, reassess before
launching another expensive attempt. Preserve interrupted and failed evidence;
never report an incomplete run as PASS. Already spent time or tokens are not a
reason to continue an inferior strategy.

Apply this analysis proportionately: routine low-impact edits do not require a
large planning ceremony. Do not request another approval for actions the user
has already authorized.
`;
save('user-supplied-rule.md',rule);
// A bounded read-only probe: exact owning inputs, no helper launch or source writes.
const probeStart=performance.now(),startedAtUtc=new Date().toISOString();
const inputPaths=['AGENTS.md',m.base+'/proposal.md',m.base+'/design.md',m.base+'/tasks.md','packages/extension-service/src/filesystem/types.ts','packages/extension-service/src/filesystem/windows.ts','packages/extension-service/native/windows-filesystem.cs','apps/desktop/src/main/index.ts','apps/desktop/package.json','packages/extension-service/package.json'];
assert(inputPaths.length<=10);
let bytes=0;const contents={},inputs=inputPaths.map(path=>{const b=fs.readFileSync(path);assert(b.length<=512*1024);bytes+=b.length;assert(bytes<=5*1024*1024);contents[path]=b.toString('utf8');return {path,bytes:b.length,sha256:sha(b)};});
const design=contents[m.base+'/design.md'],native=contents['packages/extension-service/native/windows-filesystem.cs'],transport=contents['packages/extension-service/src/filesystem/windows.ts'],main=contents['apps/desktop/src/main/index.ts'];
assert(native.includes('runtimeProof="NOT_VERIFIED"'));assert(transport.includes("caps.runtimeProof === 'NOT_VERIFIED'"));
assert(design.includes('| P02 transactional installer | PRE | gpt-6-sol | xhigh |'));assert(design.includes('| P02 transactional installer | POST | gpt-6-sol | xhigh |'));
const excerpt=(path,term)=>contents[path].split(/\r?\n/).flatMap((line,i)=>line.includes(term)?[{line:i+1,text:line}]:[]);
const facts={factoryExists:fs.existsSync('packages/extension-service/src/filesystem/factory.ts'),mainAdapterExists:fs.existsSync('apps/desktop/src/main/extension-installer.ts'),mainHasExtensionService:main.includes('extension-service'),nativeCapability:excerpt('packages/extension-service/native/windows-filesystem.cs','case "capabilities"'),transportCapability:excerpt('packages/extension-service/src/filesystem/windows.ts',"caps.runtimeProof === 'NOT_VERIFIED'"),bootstrapContract:excerpt(m.base+'/design.md','bootstrap metadata establishment'),deploymentContract:excerpt(m.base+'/design.md','Main resolves this exact'),capabilityExitContract:excerpt(m.base+'/design.md','Capabilities remain NOT_VERIFIED'),mainStartup:excerpt('apps/desktop/src/main/index.ts','.whenReady()'),mainShutdown:excerpt('apps/desktop/src/main/index.ts',"app.on('before-quit'")};
const durationMs=performance.now()-probeStart;assert(durationMs<60000);
save('bounded-probe.json',{startedAtUtc,finishedAtUtc:new Date().toISOString(),status:'COMPLETE_READ_ONLY',scope:'10 exact owning inputs; source inspection only, not runtime security proof',limits:{maxFiles:10,maxFileBytes:524288,maxTotalBytes:5242880,readDeadlineMs:60000,interpretationBudgetMinutes:20,productionWrites:0,fullSuites:0,reviews:0},measured:{durationMs,inputBytes:bytes,files:inputs.length},inputs,facts,capabilities:'NOT_VERIFIED',runtimeExecution:'NOT_RUN',PRE:'NOT_RUN',POST:'NOT_RUN'});
const analysis=`# P02: точное правило стратегии, затраты и ограниченное исследование

Дата UTC ${atUtc}; branch codex/frade-ui-design-contract; worktree ${root}; common E:/dev/codex/frade/.git. Candidate ${m.head}; original P02 baseline 0ecaf44938382bd8daa7d512887dda8a8ee9b372, program origin 98f387f96b51b0ad139e3507c376ff1c3e8dec09; guide v1.0.

## Источник и границы применения

Точный текст Strategy Before Expensive Work получен непосредственно из ответа пользователя, сохранён в user-supplied-rule.md (SHA256 ${sha(rule)}). ADOPTED_FROM_USER_MESSAGE для этой UI-ветки. Commit/path публикации общего правила не предоставлены и не подтверждены. Заголовок §18 сохранён как источник; существующий root §18 Independent Feature Ownership не перезаписан/перенумерован. Root AGENTS, общий release и Routing checkout не изменены. Правило действует по прямому пользовательскому указанию.

Это новое дополнение к неизменному ${prior}/analysis.md (SHA256 9468492294f829f2771dd9ff39fd604c5a56736fe9ae5e7468ed12738ca35d8f). Его старый NOT_LOCATED и отсутствие ETA остаются историей; текущая adoption и прогнозы ниже их уточняют. Proposal/design/spec, scope, утверждённые MUST, task acceptance, модель и контрольные источники неизменны. Анализ не является PRE, POST или capability proof.

## 1. Цель, критерии приёмки и необходимое evidence

Ближайший результат: в единственном Main-authorized userData/extensions root безопасно привязать поставляемый Windows/NTFS backend, выполнить доказательный ограниченный runtime probe и корректно завершать процесс. Installer API остаётся закрытым до необходимых native/runtime/deploy доказательств. Нельзя выставить VERIFIED из capabilities ACK, который сейчас сообщает NOT_VERIFIED.

Для S0 нужен конкретный согласованный алгоритм bootstrap/fixture ownership/UNKNOWN/stale cleanup/disposal, mapping к текущему scope и источникам, strict validation и свежий независимый PRE gpt-6-sol/xhigh. Для S1: meaningful RED/RCA/GREEN, current native/source/artifact identities, реальные positive/negative filesystem assertions и Main startup/shutdown; фактический dev initial/rebuild/build/start в собственном Temp profile. Уничтожение рабочего профиля, runtime compilation, другой write root, Node fs fallback, новые debug IPC, SDK и изменение frozen configs не разрешены.

Конечная приёмка P02 сохраняется полностью: staging/validation, один immutable ordered hash-linked journal, семь фаз/reserve8/8MiB/closing disposition, real process kill/reopen/recovery OLD/NEW, lifecycle и dirty/P01 preservation, actual Extensions UI, applicable media/keyboard/visual acceptance, все required tests/type/lint/build/boundary/root/P01/security/a11y, OpenSpec verify, cumulative POST, archive и verified UI push. Сохраняются actual command/stdout/stderr/exit/inputs hashes, immutable raw FAILs, review events/provenance/confinement, screenshots только реальных изменённых экранов. На следующем numbered P03 обязательный STOP.

## 2–3. Различные стратегии и ожидаемые затраты

A–I и причины неприменимости полностью перечислены в исходном analysis.md. Здесь добавлены оценки, которых требует точный текст. Все часы ниже — **прогноз инженерной работы агента**, без ожидания человека/восстановления среды; не измерение и не обещание даты. Слишком широкий пока интервал намеренно показывает bootstrap/recovery неизвестность. Сравниваются оставшиеся работы P02, а не весь P03–P07/migration program.

| Допустимая стратегия | Прогноз времени | Ресурсы и токены | Риски, зависимости, неопределённость |
| --- | --- | --- | --- |
| A: primitives + широкие повторные checks/gates | 30–100 ч | Больше повторных compilations/Electron starts, журналов и review-пакетов; ожидаемый token cost высокий относительно C+G | Поздняя Main/recovery интеграция. Тот же backend/P01 API; scope человеческих решений заранее неизвестен |
| C+G: риск сначала, Main рано, завершённые slices, релевантные checks | 23–71 ч | Один writer; serial native/build, независимые read/type/lint parallel where safe; ожидаемый token cost средний относительно A | Bootstrap/UNKNOWN и real kill/recovery всё ещё главные риски. Не зависит от Routing. Все этапные gates сохраняются |
| H как scoped дополнение к C+G: compiler caching/concurrency после измерения | Исследование 0.5–2 ч, выигрыш пока неизвестен | Дополнительные CPU/I/O/fixture storage и низкий добавочный анализ токенов; full review при control changes | Cache key/false reuse и исторический parallel timeout. Сейчас не выбирается: проверенные полные commands занимают около минуты; сначала доказать bottleneck |

B (целый installer до gates), D (общие concurrent writers), E (Node fallback), I (замена утверждённой модели/независимости) не допускаются текущими правилами, поэтому не выдаём фиктивный допустимый ETA. F (новый SDK/backend/перенос цели) требует нового решения/анализа, выбрасывает проверенные исходники и пока не имеет доказанного выигрыша. Изоляция другого writer в отдельном worktree технически возможна, но bootstrap/journal/Main делят новые interfaces; перенос/merge/control revalidation сейчас увеличат неопределённость. Независимые проверки без общих output writers можно распараллеливать без такой реорганизации; агентам поручения не выдавались.

**Token cost:** сравнительная оценка выше — judgement forecast, не измеренный usage. Абсолютные billed/reasoning/cached input counts в текущих check receipts отсутствуют. Байты пакета не равны счёту API. До первого нового review записать размер и полный состав exact packet; после него сохранить только действительно доступные usage fields и пересчитать прогноз. Денежную стоимость без tariff/actual usage не выдумывать. Численных success probabilities нет: данных для измерения нет, словесная оценка риска — инженерное суждение.

Измеренные wall receipts неизменны: service test226 63.993 s, BDD226 66.819 s, targeted host26 10.769 s, type 2.939 s, lint 5.297 s, boundaries 0.991 s, UI compliance 28.388 s, desktop build 61.384 s. Источник — prior observations.json и linked raw execution receipts. Полные test+BDD около 131 s последовательного исполнения; targeted имеет другую coverage и не заменяет их. Hard timeout существующего check recorder 240 s, protocol operation max 10 s; это не ETA. Reviewer runtime timeout берётся из актуальной validated request, не из прогноза. Peak CPU/RAM/disk и reviewer token usage не измерены, чисел для них не заявляем.

| Внутренний срез | Прогноз часов | Критический выход |
| --- | --- | --- |
| S0: concrete bootstrap/probe design + applicable PRE | 1–3 | Coherent source-bound plan, strict, независимый PRE PASS |
| S1: capability/factory/Main/deployment | 3–8 | Реальный runtime/lifecycle proof, required component checks |
| S2: install/journal/crash/recovery vertical | 8–24 | Bounded journal, OLD/NEW authority по COMMITTED, real kill/reopen |
| S3: lifecycle/rollback/locks/revisions/veto | 6–18 | Все соответствующие actual contracts и regressions |
| S4: Extensions UI/dirty/media/visual | 3–10 | Работающие действия + actual UI evidence/visual decision |
| S5: full checks/verify/cumulative POST/archive | 2–8 | Required current candidate PASS, verified publication, STOP P03 |

Сумма 23–71 ч — прогноз при последовательных slices и отсутствии новых material blockers; не календарный SLA. Review queue/runtime, восстановление окружения, новые обязательные решения и повторные RCA могут вывести за диапазон. На выходе S0 и S1 диапазоны надо переоценить по факту, а не поддерживать прежний прогноз ради уже потраченного времени.

## 4. Выбор и cadence

Сохраняется C+G. Самый дорогой ожидаемый rework возникает на runtime/bootstrap/recovery boundary, а не в одном минутном suite; ранний Main выявляет ошибки asset/root/lifecycle до большого installer/UI. Повторно используем существующие protocol/transport/validators/P01 ports с exact source/control binding, а не исторические PASS на изменённом коде. Последовательный native file execution сохраняется; cache не внедряется без измерения.

Локальный дефект: deterministic RED → RCA → repair → targeted GREEN; после целого slice или общей root/lease/transport/state границы required complete suites и applicable checks. На cumulative closure текущие inputs проверяются всеми required командами. Не выполнять одинаковый full test+BDD после каждой строки; оба named scripts исполняются реально на обязательном checkpoint. Ни одно assertion/timeout/frozen source/independent gate не сокращено. P02 PRE и POST ровно gpt-6-sol/xhigh согласно design; backend attestation отдельно, не выдуманная гарантия.

## 5. Ограниченное исследование и точка пересмотра

Начальное **read-only probe**: максимум 10 exact owning files, 512 KiB/file, 5 MiB total, чтение максимум 60 s, интерпретация максимум 20 min; production writes/helper launches/full suites/independent reviews = 0. Цель: найти действующие capability/bootstrapping/deploy/lifecycle ограничения и отсутствующие точки реализации. Выполнен bounded-probe.json: ${inputs.length} файлов, ${bytes} байт, ${(durationMs/1000).toFixed(3)} s измеренного чтения. Это source-inspection completion, не runtime/security PASS. Полные relevant matching lines и source hashes сохранены в receipt, console больших исходников не нужна.

Наблюдения: factory ${facts.factoryExists?'существует':'отсутствует'}, Main adapter ${facts.mainAdapterExists?'существует':'отсутствует'}, current Main ${facts.mainHasExtensionService?'имеет':'не имеет'} extension-service import. Native и host reply validator сохраняют NOT_VERIFIED; design разрешает bootstrap metadata до STAGING, требует одного root и настоящего dev/start/lifecycle proof. Эти факты не определяют автоматически разрешение на произвольные test-file effects: exact ownership/durable-intent/UNKNOWN/stale fixture algorithm ещё должен быть согласован с действующим контрактом. SPEC_CONFLICT пока не доказан.

До следующего expensive run: завершить mapping S0 и конкретное предложение; выяснить, достаточно ли уже утверждённого scope. Material new root/command/bootstrap exception — решение человека; обычные choices внутри scope дополнительных подтверждений не требуют. Затем согласованный strict/PRE, meaningful TDD и S1. Размер reviewer-пакета выбирается достаточным по actual affected contracts; без всего UI gallery при чисто filesystem review, но с нужными source/tests/history. Source binding/confinement/полный event stream обязательны.

Точки пересмотра: **после этой probe**, после первого fresh PRE receipt, после S1 actual Main/dev proof и на каждом slice exit. После probe C+G подтверждён как стратегия порядка, а S0 остаётся OPEN, production не начинается. Если 20 min не дают concrete bootstrap mapping, сохранить частичный результат и пересмотреть boundary/отдельный proposal, не наращивать volume review. Для первых проверок фиксировать wall duration; новый timeout/ресурсный конфликт или более чем двукратное ухудшение относительно сопоставимого current run требует диагностики до повторного expensive run (диагностический сигнал, не новая test tolerance).

Security/state defect или applicable FAIL → STOP владельца; два unsuccessful fixes → no-patch-loop/RCA. Unknown/invalid candidate/packet/review → BLOCKED/FAIL по контракту, не retry до устранения причины. Новый scope/spec conflict/unsupported filesystem/runtime → точный decision/repair. Interrupted/failed evidence сохраняется. Low performance без correctness defect → измерить bottleneck и оценить H, не снижать проверки. Уже потраченные tokens/time не оправдывают худшую стратегию.

## Фактический статус

ADOPTION: ADOPTED_FROM_USER_MESSAGE. STRATEGY: C+G. READ_ONLY_INITIAL_PROBE: COMPLETE. S0 detailed implementation plan/PRE: NOT_RUN. Production changes: NONE. P02 tasks 3/9, 2.2 IN_PROGRESS; capability NOT_VERIFIED; Main/runtime/dev/start/journal/recovery/Extensions UI/full closure открыты. Verify/cumulative POST/archive NOT_RUN. READY_FOR_VERIFY: NO. Root/common policy publication NOT_VERIFIED; это adoption UI-ветки, не объявление общего deploy. Старые FAIL/NOT_RUN остаются immutable history.
`;
save('analysis-addendum.md',analysis);
const adoption={atUtc,source:'direct human message in current Frade UI chat',sourceCommit:null,sourcePath:null,ruleSha256:sha(rule),status:'ADOPTED_FROM_USER_MESSAGE',branch:'codex/frade-ui-design-contract',headBefore:m.head,priorAnalysis:prior+'/analysis.md',priorAnalysisSha256:'9468492294f829f2771dd9ff39fd604c5a56736fe9ae5e7468ed12738ca35d8f',analysisSha256:sha(analysis),selectedStrategy:'C+G',proposalDesignSpecsChanged:false,rootAgentsChanged:false,sharedReleaseChanged:false,productionChanged:false,tasks:'3/9',PRE:'NOT_RUN',POST:'NOT_RUN',publication:'PENDING'};
save('adoption.json',adoption);fs.copyFileSync(process.argv[1],dir+'/author-adoption.mjs',fs.constants.COPYFILE_EXCL);
const previous=fs.readFileSync(m.status,'utf8');const top=`# Frade UI Design Contract — P02: стратегия и точное правило приняты\n\nОбновлено ${atUtc}. Branch codex/frade-ui-design-contract; worktree ${root}; common E:/dev/codex/frade/.git. Program origin98f387f96b51b0ad139e3507c376ff1c3e8dec09; P02 baseline0ecaf44938382bd8daa7d512887dda8a8ee9b372; guide v1.0. Routing независим.\n\nТочный Strategy Before Expensive Work: **ADOPTED_FROM_USER_MESSAGE**, hash ${sha(rule)}; source commit/path не предоставлены. Evidence ${dir}/analysis-addendum.md: alternatives A–I, forecasts времени/ресурсов/token cost, bounded probe и reassessment/STOP. Root AGENTS/common policy не перезаписаны; общая публикация NOT_VERIFIED. Старый NOT_LOCATED ниже — историческое состояние.\n\nВыбрана **C+G**: S0 concrete bootstrap/ownership/UNKNOWN design + strict/PRE → S1 реальный factory/runtime/Main → S2 install/journal/recovery → S3 lifecycle → S4 UI → S5 closure. Прогноз оставшегося P02 **23–71 часов активной инженерной работы**, не календарное обещание; после S0/S1 переоценка. Exact token usage/peak resources не измерены; ожидаемые token costs сравнительные. Measured test22664s/BDD67s/host26≈11s отдельно. Bounded source probe COMPLETE, не runtime proof.\n\nP02 **3/9**, 2.2 IN_PROGRESS; precise runtime/Main S0 PRE **NOT_RUN**. Последние реальные component checks226/226/type/lint/build/boundaries/UIcompliance/strictPASS сохранены; новых component runs/PRE/POST нет. Capabilities NOT_VERIFIED; Main/dev/start/journal/recovery/UI/full checks/verify/cumulative POST/archive открыты. Production/spec/design/guide/P01/routing не менялись. READY_FOR_VERIFY:NO; STOP beforeP03.\n\nСледующий шаг: concrete S0 algorithm и scope mapping; затем actual strict и automatic independent PRE **gpt-6-sol/xhigh** по P02 plan до production. Решение человека только при доказанном изменении scope/spec/permission; стратегия не требует повторного approval.\n\nПоследний verified published HEAD ${m.head}. Rule-adoption docs checkpoint publication PENDING; только authorized origin git@github.com:leonmaks/frade.git / refs/heads/codex/frade-ui-design-contract. Right panel queued/visibility unconfirmed; merge protection LOCAL_ONLY/NOT_CONFIGURED.\n\n## Предыдущие записи\n\n`;
fs.writeFileSync(m.status,top+previous);m.strategyRuleAdoption={...adoption,dir};m.phase='P02_STRATEGY_RULE_ADOPTED_S0_RUNTIME_DESIGN_PRE_PENDING';fs.writeFileSync(mp,JSON.stringify(m,null,2)+'\n');
console.log(JSON.stringify({dir,ruleSha256:sha(rule),analysisSha256:sha(analysis),probe:{files:inputs.length,bytes,durationMs},status:'ADOPTED_FROM_USER_MESSAGE',productionChanged:false,tasks:'3/9',publication:'PENDING'}));
