# Design: uniform Frade direction workflow

## Context

Owner: codex/frade-standard-workflow, E:/dev/codex/frade-worktrees/frade-standard-workflow.
Original/cumulative baseline: 98f387f96b51b0ad139e3507c376ff1c3e8dec09.
Git common: E:/dev/codex/frade/.git. Shared release v1.1 a3ac63b52187e1f45f08b6d0beffcd67425c491d8ae1ac5d0d0efd3832e73fd0.
Policy raw SHA256: 6c6cf78fccfc4dac9e53c859715850db127f897e7eb79aa94957134bd1c1ffeb.
Read evidence/repository-audit.json and evidence/user-decisions.json. User instructions override local skill assumptions; this package is planning only until coherent plan approval and independent PRE. The numbered W01 checkpoint never starts a later change autonomously.

Observed: one pnpm/Turbo monorepo, 20 package manifests at the committed baseline, 9 active changes there, additional UI/Routing process files only in their owning dirty worktrees. Common CLI exposes status/probe/run/publish, not direction bootstrap or writer execution. Baseline root AGENTS lacks later shared policy; exact user-provided instructions and shared public policy are adopted as process evidence, without foreign product source.

## Goals / Non-Goals

Goals: one external lifecycle; minimal routine human relay; precise role dispatch; executable fail-closed guards; understandable fixed dashboards; repeatable onboarding; all packages assigned applicable checks; consistent publication; preservation of stricter program contracts and historical evidence.

Non-goals: repairing Routing R04, completing Repo Core, closing UI P01, imposing a uniform geometry tolerance or performance budget, retroactive model claims, automatically accepting visual baselines, copying dirty branches, account-wide settings, foreign repositories, force pushing or automatic main merge. No absolute quality guarantee is claimed from a process.

## Decisions

### 1. Direction taxonomy and identities

A direction is a bounded engineering objective, not a physical package. A direction owns stable ID, goal, branch/worktree, immutable origin, current approved checkpoint, versioned rules and numbered stages. A stage owns one OpenSpec change or explicit mapping of existing change artifacts; tasks carry stable IDs, type, dependencies, acceptance/evidence and ordered steps. Phases are lifecycle activities, separate from stage numbers and health. Legacy Routing R01-R10 and UI P01-P07 keep their names and origins. A small feature uses one stage with the same barriers; it cannot skip research/checks silently, but applicable evidence can be bounded.

Do not create empty product packages for planning. Proposed metadata layout: docs/engineering/directions/<id>/{direction.json,ROADMAP.md,AGENTS.md,DIRECTION-STATUS.md,decisions/}. Use a legacy owner status path when present and render it in the common layout. Each OpenSpec change retains its own artifacts/evidence. Internal direction AGENTS extends root/scoped contracts; it never weakens them. Root loader references the active direction manifest so rules apply outside the docs subtree.

### 1a. Phase-bounded scope and closure destinations

Planning may write only the owning change and docs/engineering/BRANCH-STATUS.md. Implementation uses the reviewed explicit control/docs path set; this is not permission to write foreign direction metadata. Closure permissions are separate and remain inactive until required checks, formal Verify and current independent POST PASS plus the human policy decision. W01 closure allows only `openspec/specs/engineering-direction-lifecycle/spec.md`, `openspec/specs/engineering-role-dispatch/spec.md`, `openspec/specs/engineering-progress-publication/spec.md` and the dated directory openspec/changes/archive/<actual-archive-date>-frade-standard-workflow/**. The archive date is recorded at execution, canonically validated, and never expands the owner ID or matches another change. Sync is limited to W01 delta requirements; archive moves exactly this owning change, retains raw hashes, and relocates owned relative references and role-source paths/hash bindings. Historical immutable receipts keep their original paths/hashes and gain an explicit origin-to-archive mapping; they are never rewritten. All unrelated specs, archives, product/frozen files and owner process state remain excluded.

Add positive actual temporary-Git sync/archive/reference-relocation controls and negative early-closure, foreign-spec, foreign-archive, unsafe date/path, stale approval and broken-reference controls. No real sync/archive occurs in this planning repair.

### 2. Initial command and standard lifecycle

User command: "Открой направление <name>: <goal>". The owner performs dry-run inventory first, resolves the canonical Git common and selected explicit committed baseline, validates ID/path/remote/ref, verifies available shared policy/runtime, refuses an existing mismatched direction/branch, creates one isolated registered worktree and branch codex/<id>, and seeds intake, research, requirements, roadmap, manifest, rules, status, decision register and OpenSpec planning. No user input is guessed for irreversible product scope or external publication. If origin/baseline/destination is ambiguous, it blocks only dependent steps; safe research proceeds.

Phases: INTAKE -> RESEARCH -> REQUIREMENTS -> PLANNING -> PRE_REVIEW -> BDD_TDD -> IMPLEMENTATION -> CHECKS -> VERIFICATION -> POST_REVIEW -> ARCHIVE -> CLOSED. Integration to a shared target is a separately authorized candidate after closure or an explicitly bounded integration checkpoint; merged candidate receives applicable regression/control revalidation. Unknown phases, skipped barriers and stale approvals fail.

Health is separate: NOT_RUN, RUNNING, PASS, FAIL, BLOCKED, PAUSED. PAUSED requires human instruction. Applicability is REQUIRED or NOT_APPLICABLE with contract-based reason, decided before execution; N/A cannot waive a current applicable FAIL. PRE/POST unavailable/invalid transport is BLOCKED; valid reviewer verdict is exactly PASS/FAIL. Stage/tasks checked-count is administrative progress only, not product readiness.

### 3. Discovery, research and requirements

Intake captures problem, users, expected outcome, constraints, exclusions, original baseline, quality-first priority, publication destination and human decision boundary. Research retains dated primary/local sources, current behavior, reproducible gaps, alternatives/tradeoffs, risks, unknowns and capability limitations. Browsing stays outside confined reviews; selected relevant public/source evidence enters packet.

Requirements use stable IDs, mandatory behavior/invariants, explicit acceptance cases, compatibility/preservation constraints and measurable limits. Each requirement links to BDD scenario -> task -> meaningful test/assertion -> actual source-bound evidence. Critical invariants, failure/cancel/recovery states and security boundaries require positive, negative and boundary controls. Qualitative usability/visual decisions remain human. Numerical limits are approved per contract before measurement, not fitted to observed failures. Existing actual evidence may be reused only with source/toolchain/config applicability proof; failed obsolete runs remain retained.

### 4. Exact role assignments (approved for this direction)

User authorized the following exact assignments on 2 October 2026 via the question/reply saved in evidence/user-decisions.json. This is the W01 stage plan, not a global model default.

| Stage | Role | Model | Effort |
|---|---|---|---|
| W01 | planning-architecture | gpt-6-astra | high |
| W01 | independent-PRE | gpt-6-astra | xhigh |
| W01 | tooling-tests | gpt-6-sol | high |
| W01 | formal-Verify | gpt-6-astra | high |
| W01 | independent-POST | gpt-6-astra | xhigh |

Checkpoint/publication is a deterministic authorized orchestration action, not a new LLM reasoning assignment. Drafting onboarding/requirements belongs to planning-architecture; schema/CLI/test implementation belongs to tooling-tests.

For future directions, approved stage task-type assignment resolves one pair; a reviewed task-specific exception overrides only its own task and role. Resolver must emit stage, task, type/role, exact pair, source path/raw hash/excerpt, assignment revision and override reason/approval. No "Luna/Sol", "high/xhigh", dynamic choice, universal strongest model, silent fallback or request-self-approval. Missing mappings block dispatch. Recommended pairs in templates are proposals and never authorize execution. Executor and reviewer assignments are separate. The current chat model cannot be silently changed; launch exact approved workers through supported tooling only after actual runtime/confinement proof. Review worker is fresh, independent and read-only; a writable implementation worker is confined to its own owner scope, gets no reviewer credentials and cannot self-certify PRE/POST. Initial tooling must report writer dispatch NOT_IMPLEMENTED rather than pretend it exists.

### 5. Fixed dashboard and metrics

Exactly eight primary sections, same order: 1 Decision/Next Action; 2 Identity/Scope; 3 Stage Roadmap; 4 Active Tasks/Steps; 5 Checks/Gates/Quality; 6 Models/Execution; 7 Dependencies/Decisions/Blockers; 8 Git/Publication/Evidence. Current projection renders validated structured state; dated raw history remains separate. Legacy dashboards can retain append-only historical tail after these sections, with a clear snapshot boundary; no rewrite of old evidence. A tracked required status path is recorded in manifest.

Top row: UTC update, direction/stage/phase/health, exact next permitted action, human decision or NONE. Counts use explicit complete/total/remaining requirements/tasks/checks; missing evidence cannot increase acceptance. Report invariant failures, executed scenario coverage, negative-control coverage, regression state, approved performance/security/visual gates, stale evidence, open blocker age, failed fix attempts, baseline/source fingerprints, last checkpoint SHA and verified remote SHA. No invented quality score, arbitrary 100% code coverage mandate or universal latency budget.

Refresh on start/resume, scope/decision, task/blocker/check batch, PRE/POST/Verify/archive/publication. Freeze defers status writes. Render after receipt unfreeze; open right panel and distinguish queued/visible. Hash the input records used to produce the projection. A record claiming PASS is not evidence: validator checks declared evidence bindings and review receipts; actual gate execution stays authoritative.

### 6. Commit/push cadence and remote safety

Recommended normative cadence: one commit and push after each coherent completed task whose required checks pass; additionally commit/push planning approval, PRE/POST receipt, stage close/archive and reproduced blocker/RCA checkpoint when new evidence exists. Combine events belonging to the same frozen candidate into one checkpoint; do not create empty commits. Do not push every shell command, failed local patch or intermediate edit. A work-in-progress diagnostic checkpoint must label incomplete/FAIL/BLOCKED and cannot satisfy GREEN/closure. Preserve RED locally before repair; a durable RED checkpoint can be published with explicit non-ready status.

Opening a direction captures explicit human remote/ref authorization once; routine subsequent publication uses it. This direction is authorized only git@github.com:leonmaks/frade.git refs/heads/codex/frade-standard-workflow. Validate URL/ref plus actual branch/upstream; explicit scoped staging; scan prohibited/sensitive files; refuse unexpected staging or unauthorized paths; no blind git add .; no force/reset/clean. Push exact local checkpoint SHA to exact approved ref and verify remote SHA by fresh ls-remote. Remote divergence, unavailable transport, permissions or mismatch = publication BLOCKED, never PUBLISHED; retain checkpoint locally. Push cannot mutate main or another direction. Publication receipt is append-only after verification; avoid self-referential "this commit" hashes by pointing to the preceding source checkpoint and record receipt in the next natural checkpoint, without infinite commits.

### 7. Applicable controls for all packages

General contract baseline: applicable strict OpenSpec, lint/typecheck/build, unit/BDD/boundary tests and clean lockfile/reproducibility checks. Product changes require affected package checks plus required root regression per approved control matrix; docs/process-only changes require actual process/control tests, strict validation, content/hash/link checks and proven unchanged product tree, not an invented product GREEN. New schema/CLI/CI controls need integration tests on actual temporary Git/worktrees and adversarial controls, not just schema examples.

Per subsystem: Routing geometry/property/parity/mutation/compiler/frozen gates; UI theme/density/keyboard/contrast/visual/preservation; Repository profiles/identity/revisions/authorization/atomicity/recovery; Metamodel composition/inheritance/imports/fingerprints; Runtime sender/DTO/isolation/lifecycle; adapters actual filesystem/SQL/Git behavior; host browser/Electron real integration. Existing thresholds and narrower constraints prevail. Each area must have declared scope owner and actual applicability, including shared manifests/CI/AGENTS. No unrelated FAIL blocks an independent direction, but a failing truly applicable check cannot be relabelled unrelated.

### 8. Bootstrap and validators

Proposed entry: node scripts/directions/cli.mjs plan <request.json>; create <approved-request.json>; check <manifest>; status <manifest>; review <manifest> PRE|POST; checkpoint <manifest> <event>; publish <receipt>. User commands map to these deterministically. plan is read-only and outputs exact creation/destination/unknowns; create is idempotent only when owner/baseline/hash match. Creation uses argv APIs without shell interpolation, validates canonical path containment/reparse points/case collisions, Git ownership/modes and branch/ref collisions; partial operations return recoverable receipts and never delete existing work. Registry is branch-local/versioned; common service remains review transport. Do not assume common network capability grants reviewer network.

Validator detects unresolved models, missing evidence/task order/approval, unknown status, forged/stale bindings, scope drift, semantic weakening, changed source during review, incomplete stream, missing checks/remote SHA and circular dependencies. Machine checks complement independent semantic review; false plan approval cannot be verified merely by a JSON true. Adoption of new public controls needs PRE/RED/implementation/checks/Verify/POST and immutable release publish, then consumer-owned migration. No rewriting release v1.1.

### 9. Adoption and integration

New directions use the new standard after reviewed release adoption. Existing Routing/UI/Repo Core keep approved origin and evidence; add mapping records and common dashboard header through owning planning revalidation. Adopt one direction at a time in separate worktrees. Archived historical changes remain historical, not reopened or renamed without a new authorized scope. Completed checkboxes without Verify/POST/archive map to IMPLEMENTED_PENDING_CLOSURE, never CLOSED. Future stages with ambiguous model matrices are PLANNING_BLOCKED, not automatically assigned today's models.

Shared release is published only after actual successful complete POST of public supplier controls; registration/bundle hashes and discovery/confinement are verified from registered owners. Per-owner control adoption may fail independently and does not prevent supplier closure. A reviewed standard alone does not claim all directions migrated. CI definitions and branch protection distinguish LOCAL_ONLY, REMOTE_VERIFIED and NOT_CONFIGURED.

Integration captures target commit/ref, resolved conflicts, preserved supplier/consumer approvals, final diff and tests on actual merged candidate, independent integration POST as applicable and explicit merge permission. No auto main merge. Pre-merge feature POST cannot certify a later conflicting merge tree.

## Risks / Trade-offs

Frequent task publication improves recoverability but creates evidence volume: keep relevant minimal packets, never recursively select copied historical packets; raw receipts immutable and storage budgets measured before reviews. Strong controls cost time; quality remains first, human interaction second, not test count maximization. Proposed model assignments require availability, not aliases or unattested claims. Existing docs are inconsistent/stale; mapping must use observed source path/hash/time and separate owner status, never infer closure.

## Migration Plan

1. This W01 planning package + audited user decisions + exact public-policy adoption; actual strict validation; independent PRE on approved scope.
2. Implement docs/templates/schema/lifecycle/role/status/bootstrap/publication controls in the sole owning workspace after meaningful RED. Run targeted and required general control checks.
3. Formal Verify -> independent POST -> immutable common release/control publication under allowed destinations -> W01 archive/checkpoint -> STOP.
4. Routing, UI and Repo Core migration are separately authorized owner checkpoints; preserve frozen origins and conduct their affected PRE/POST. Record NOT_STARTED until actual adoption.
5. Main integration is separately authorized and revalidated; no next numbered engineering change automatically.

## Verification Strategy

BDD requirements cover creation collision/foreign root, ambiguous role/task overrides, task/barrier ordering, drifted/forged review, UNKNOWN/N/A misuse, dashboard count integrity, blocked publication/divergent remote, schema version/adoption, public-release hash and unchanged product behavior. Use deterministic Node tests plus actual disposable Git repositories/worktrees/remotes for mutations. Run commands/exits/hashes, positive/negative controls, strict OpenSpec and changed-path audit. Existing shared CLI is consumed unchanged; regression-test any new wrappers and scoped root loader. Root product check:all applicability must be declared with contract proof before implementation; no false product PASS from docs-only tests.

## D05 — proposed bounded architecture amendment

Статус PROPOSED_NOT_APPROVED. После hash-bound принятия этот раздел расширяет текущий W01 scope и sections 1a/2/4/5/8/9 только описанным способом. Он не заявляет implemented writer/service. Historical D03/D04 approvals и raw hashes сохраняются. Adoption данного planning packet охватывает только одиннадцать существующих файлов, перечисленных ниже; это не общий planning grant на docs или production.

### D05.1 Evidence and one approval package

POST 2026-10-07 FAIL, report SHA256 5654822b2e5fd221fe83834b6236316d540528298cc5d5fe6f752d574e215bc9, checkpoint 62b9e0fbfd55f8b2e99f8ea210786fc6c9f01fd0, implementation eadd32026c0f71a82ce3981ae3e6cdd16f924e26. verifyRawReview() принимает otherwise complete PASS с required inspection exits 1/2; это reception defect, не доказанный обход shared runner. Historical RECEIVED_VALID_PASS и inspection failures остаются неизменными; current clean Verify admission не установлен. Task 4.1 переоткрывается только после D05 approval, старый checked snapshot и receipt сохраняются; 4.2 incomplete.

Original D05 decision принимает exact eleven-artifact package и остаётся immutable вместе с его artifact bytes. Материальная коррекция порядка создаёт отдельный immutable proposed package тех же одиннадцати targets: proposal.md, design.md, tasks.md, три capability spec.md, feedback-register.md внутри openspec/changes/frade-standard-workflow, docs/engineering/standard-workflow.md, docs/engineering/newcomer-guide.md, docs/engineering/directions/frade-standard-workflow/direction.json и AGENTS.md. Host вычисляет actual raw hashes и canonical package digest в existing permitted staging; отдельный nonrecursive accepted decision создаётся только после explicit human approval этой коррекции. Он связывает corrected package/design, original D05 decision, unchanged five pairs и сохраняемые fixture/policy grants; отдельно утверждает точную historical-test mapping D05.3 и замену future adoption timing. Он не входит в хешируемый им пакет. Draft labels immutable originals не меняются: effective acceptance определяется decision chain. Existing host/model/remote permissions не переоткрываются; scope/limits/closure grants не расширяются.

PRE 2026-10-07 остаётся FAIL из-за truncated inspections и отсутствовавшего в packet strict-all; ordering conflict не был предметом его verdict. Поздний supplied strict-all-approved-d05.json с isolated OpenSpec 1.14.0 selected/all strict и 174 bound inputs сохраняется как evidence прежнего exact candidate, не как validation этой коррекции. Task 1.6 требует fresh selected/all strict и полных bindings corrected candidate; task 1.7 — новый complete clean independent PRE всего исправленного порядка до production, без code/guard/pin substitution.

### D05.2 Concrete host and capability contract

Один repository-owned controller предоставляет проектируемые submit/resume/inspect-status/cancel. Existing admitted Windows host broker автоматически start/attach-ит on-demand reusable process по canonical Git common/control revision. Persistent OS service, новый service account, per-direction sessions/configs и ручной executor launch не требуются.

Initial target — existing pinned Codex 0.159.3 через confined executor adapter в WSL Ubuntu-22.04_E, existing explicit host writable roots, isolated exact OpenSpec 1.14.0. Global OpenSpec 1.14.1 не изменяется. Production owner E:/dev/codex/frade-worktrees/frade-standard-workflow и common E:/dev/codex/frade/.git не смешиваются со staging данной подготовки /mnt/e/dev/codex/frade-worker-staging/w01-automation-plan-revision-20261007/work. Broker использует production paths только если они входят в его существующий подтверждённый grant; worker writable root не создаёт такого права.

Effective capability = verified canonical registration ∩ approved phase/task scope ∩ existing host grant, затем сужение root/nested contracts, runtime enforcement, lease и freeze. Controller хранит authority/capability issuance вне worker writes. Manifest flags и request paths не создают grants. Windows/WSL aliases проверяются по canonical filesystem/Git identity, включая reparse/case/interop risks; broad drive access не подразумевается.

Preflight receipt автоматически связывает host identity; canonical common/owner/branch; Windows/WSL mapping; baseline/HEAD/index/source hashes; existing grant ID/digest и effective roots; control/policy/authority digests; trusted absolute launcher и executable hashes; Codex version 0.159.3; distro Ubuntu-22.04_E identity; isolated OpenSpec 1.14.0 identity/hash; permission-profile digest; role source/excerpt и approved/requested/invoked pair; run/lease/freeze IDs; canary commands/exits/denied-target hashes; outcome/limitations. Trusted expected runtime hashes берутся из existing pinned inventory, не из worker declaration. Missing trusted runtime binding или drift блокирует dependent execution.

Positive read/write canaries и synthetic denied original/common/foreign/secrets/settings/network/link/reparse/Windows-interop probes обязательны при admission и runtime/profile drift. Проверяется реальная Windows-host/WSL связка. Post-hoc diff audit недостаточен. Если existing capabilities не обеспечивают isolation, BLOCKED с concrete failed probe; self-elevation, установка service, расширение global config/grants и ослабление canaries исключены. Новая infrastructure need сообщается лишь при фактически установленной необходимости.

### D05.3 Roles and nonrecursive authority transition

Пять exact assignments section 4 остаются без изменений. Approved/requested/invoked model+effort обязаны совпадать. Missing/ambiguous source, explicit unavailable/unsupported pair, substitution, runtime/profile mismatch или failed invocation блокируют запуск/resume. No universal default/fallback. Deterministic controller/checkpoint/publication не получают LLM assignment.

Actual backend/effort отдельно NOT_CONFIRMED, если независимой attestation нет. Это допустимое состояние FWE-012-S01, а не универсальная причина BLOCKED. Complete receipt включает trusted invocation arguments/results и все execution/inspection events, но не выдуманную backend attestation. Missing attestation блокирует только если собственный approved owner plan явно требует её. Подтверждённое actual mismatch блокирует независимо от request. Unknown availability field само по себе не доказывает unsupported model; explicit provider rejection или невозможность успешного launch сохраняются как BLOCKED без fallback.

Current root-loader, bootstrap checkedHistoricalW01() и review approvedW01() требуют D03 operational state. Historical design: openspec/changes/frade-standard-workflow/design.md, SHA256 501168ced50a35e128a0fc86e79bab6ac9aa31cd343eca3eedac56f81570978a, approved commit 61c7b6d9b0cde8fe06b714c74bfa6ac04009a1ab. Historical decision: openspec/changes/frade-standard-workflow/evidence/policy-acceptance.json, SHA256 98511f4a32f358b668809fa2e910d090b56617b5c05da1f332ac3517d2ff3239. Original D05 design SHA256 4d1dfc52532ab239b03b89e50b6a1994aa5ee68bff49d98f3bffc650d39d8fe2 would deterministically fail unchanged V-02 if installed before 2.9. Corrected D05 hashes are computed separately; historical constants are never overwritten.

Task 1.6 must prove an already-admitted host route for both fresh PRE and subsequent approved tooling-tests work under separate operational-source and scope bindings. A library reader seam alone is insufficient. Task 1.7 reviews the entire correction with live D03 intact and the exact immutable corrected D05 overlay plus its human decision in the packet. No production code, guard or pin changes precede this clean PRE. Unsupported separation or worker confinement is BLOCKED_AUTHORITY_TRANSITION; metadata approval cannot repair it, and 2.11 cannot run early.

After completed 1.7, the accepted corrected overlay governs requirements, task order and implementation scope. Live D03 proposal/design/specs/manifest/scoped rules and their operational pins remain installed through 2.8, 2.9 and 2.10; reception implementation may change only its reviewed code/tests after RED. Task progress and receipts are recorded separately without premature installation of the overlay. Each executor/reviewer receipt records operational source path/raw hash/exact role excerpt/revision and decision, separately from immutable overlay location, logical target paths, package/design hashes, relevant scope/task excerpts and approval chain; it also binds actual input/control hashes and the unchanged approved/requested/invoked pair. D03 operational admission never supplies D05 scope by itself. Task 2.9 runs the full currently applicable D03-installed suite, including unchanged V-01/V-02, plus new reception regressions. No old test becomes N/A and no failure is excluded to obtain GREEN. Task 2.10 retains live D03 while obtaining meaningful automation and migration RED.

Task 2.11 builds and tests the migration after that RED. Through an existing admitted bounded host route, stop competing execution and close admission, verify the exact expected old owner state and accepted candidate, then install all eleven corrected artifacts together with reviewed current authority consumers. Root-loader, bootstrap, role resolution and review admission must agree on the same accepted current package/design/scoped-rule bindings. The exact manifest retains its D03 roleAuthority, policyAcceptance and old receipt fields as historical origin evidence; after migration, validated current consumers derive a separate in-memory current authority/task projection from the protected accepted decision and exact overlay bindings, without rewriting the raw manifest into a self-hashing document. Historical fields cannot unlock current execution or closure. Fresh receipts use the current D05 source/hash/excerpt and separately retain D03 origin provenance. This migration neither edits historical constants nor grants generic acceptance of arbitrary new hashes.

Atomicity means no observer can receive admission for a mixed state: the admission barrier covers artifact installation, consumer activation and final validation. The transaction records explicit old/new paths, modes, hashes and phase; drift, crash or incomplete validation keeps it BLOCKED until exact-state recovery succeeds. Do not assume the future 2.13 broker already exists. Unsupported bounded migration remains BLOCKED. No later task starts until migrated current checks, historical replay and additive D05 controls all pass.

Historical-test mapping is an explicit proposed human specification decision. Preserve tests/directions/task41-installed-red.test.mjs raw bytes at SHA256 ae2ad7cc8583760fb32aa9b540149d65972c91307cf91f086fec7cd0a4a2d220. Replay those exact bytes, including V-01/V-02, under tests/directions/fixtures/d03-authority-replay/tree/tests/directions/task41-installed-red.test.mjs, with each original repository-relative dependency p mapped to tests/directions/fixtures/d03-authority-replay/tree/p. Thus the test's unchanged relative root/import expressions resolve within the bound fixture. The mapped design and decision retain the exact D03 hashes above. Original raw tests remain retained; assertions, expected values, hash constants and test names are unchanged. The fixture is read-only execution input, not a new owner, publication destination or third lifecycle fixture grant.

Before human approval and fresh PRE, the host must attach an exact finite mapping inventory of every copied test, transitive module, manifest, source/decision and required runtime input: original logical path, immutable source revision/snapshot, raw hash, replay path and semantic purpose. Bind the selected D03-compatible installed control snapshot separately from the D03 planning commit; do not claim that the later installed tests existed at that commit. Preserve every original denial/drift assertion. Unknown dependency bytes/hashes or any assertion whose meaning cannot survive this mapping keep it BLOCKED. No blanket relocation permission follows from approval.

At 2.11 the test runner must explicitly execute this raw historical replay as a required suite member with its own command, environment, inventory hashes, exits and assertion results. Moving its execution context is not deletion, skip, N/A or an unrecorded test-discovery exclusion. Inventory checks must fail if an original test is omitted, duplicated as acceptance evidence, mutated or only claimed to have run. Separately execute current live D05 controls that retain all original scope/role/approval/drift denials and positively prove current admission. Add negative controls for missing or forged correction approval, wrong current design/decision/rule hash, changed role excerpt/pair, stale D03-only current admission, wrong owner/scope, mixed migration state and replay dependency drift. Historical success cannot substitute for current-control success, and current success cannot substitute for historical replay. The same required pair of suites continues through 3.4, 4.1 and 4.2.

Future direction intent автоматически преобразуется planning role в draft scope, requirements, exact roles, applicability и capability request из versioned repository policy/owner contracts. Own approved stage plan остаётся источником dispatch; W01 pairs не становятся defaults. Неоднозначность policy оформляется конкретным вариантом в материальном owner planning decision, без ручного role/text relay. Fixture grants section D05.8 — единственное ограниченное наследование W01 test profile.

### D05.4 Execution, lease, freeze and recovery

Initial writer path — isolated staging внутри existing explicit writable roots, readonly selected baseline/inputs/toolchain, собственные output/cache namespace. Worker commands не имеют original checkout/common Git/foreign owners/secrets/global settings/auth/broker credentials или arbitrary network. Trusted model transport не выдаёт worker network permission. Direct owner writes возможны только при доказанном exact path enforcement и отзыве process capability; иначе staging.

Staging result содержит explicit paths/modes, baseline/input/output hashes и evidence. Broker проверяет actual registration, current owner bytes, scope, lease/freeze/gates; links, unsafe executable escape, unexpected files и dirty drift блокируют adoption. Он не перезаписывает unrelated work.

Lease key = canonical common+worktree. Один writer, exact run/task/role, source/authority/runtime/profile digests, epoch/fencing token. Proposed constants: heartbeat 10s, expiry 60s, оба positive и expiry ≥ 3×heartbeat; validation и timing boundary tests обязательны. Expiry не допускает второго writer до доказанной остановки старого process tree и revocation. Если остановка/отзыв недоказуемы — BLOCKED. Старый epoch не принимается broker.

Freeze блокирует source/index/HEAD/status/adoption/publication, не снимается по expiry. Journal/events/receipts сохраняются вне frozen candidate. Namespace включает private temp/log paths и controlled process group. Cancel отзывает lease, останавливает children и сохраняет partial evidence. Resume проверяет journal, live children, source/runtime/authority/permissions, lease/freeze, pending adoption и local/remote outcome; не дублирует writes и не приписывает PASS incomplete run. Launcher disappearance требует отдельной reproduction/RCA по фактам.

### D05.5 Review reception and unchanged reviewer

Shared v1.1 неизменен: release a3ac63b52187e1f45f08b6d0beffcd67425c491d8ae1ac5d0d0efd3832e73fd0, policy 6c6cf78fccfc4dac9e53c859715850db127f897e7eb79aa94957134bd1c1ffeb. PRE/POST — fresh independent read-only packet-confined sessions, без writer credentials/approval capability.

Reception связывает candidate/source/index/HEAD/packet/request/plan/control/toolchain/authority hashes, полный raw stream, command completions/exits и final report/event. Required inspection nonzero, missing completion, truncation, failed stream, timeout, ambiguous verdict или mismatch исключают clean PASS. Заранее объявленный negative harness может проверить expected failing child и сам завершиться успешно; failed inspection нельзя ретроспективно назвать negative control. Old raw FAIL/PASS/limitations остаются; correction требует нового clean run. Tasks 2.8/2.9 дают meaningful RED/RCA/repair, 4.1/4.2 — новые полные gates.

### D05.6 Configurable bounded transport

Repository adapter передаёт request через short safe absolute regular-file locator или exact framed stdin; argv несёт только locator/digest, без полного JSON и shell interpolation. Envelope связывает version/run/owner/phase/authority/runtime, request byte length/SHA256, packet manifest/digest. No evidence shortening, no shared-runtime edit.

Proposed policy constants: request payload 16 MiB; metadata envelope 64 KiB; packet aggregate 64 MiB/4096 files; locator 4096 UTF-8 bytes и одновременно stricter native limit; raw output 256 MiB/run; transport inactivity timeout 300s с heartbeat, отдельно от review runtime deadline. Конфигурация versioned/hash-bound; positive safe integers, согласованность limits/counts/lengths, storage availability и native constraints валидируются до launch. Изменение утверждённых limits требует policy revalidation. Тесты: limit−1/limit/limit+1 для bytes/count/time, invalid/zero/negative/overflow config, multibyte locator/native limits, active heartbeat и stalled transport.

Safe open/read/immutable spool должны исключать containment/link/reparse/alias escape и TOCTOU; сравниваются actual consumed bytes/hash, не только имя до открытия. Short/extra stdin, unknown/duplicate framing, hash drift, failure/timeout дают BLOCKED. Overflow сохраняет partial stream с incomplete marker без acceptance и не изменяет оригинальные request/packet.

Historical workaround: 273+4=277 файлов, 7,389,082 bytes; short prompt 28,741 chars вместо original 33,270 chars при ENAMETOOLONG. Task 2.12 использует original request bytes и original packet manifest/files неизменно; char count не заменяет byte length. Missing original bytes означает NOT_RUN/BLOCKED regression, не synthetic replacement. Дополнительные boundary fixtures хранятся отдельно от исторического packet.

### D05.7 Automatic ingestion, metrics and broker

Versioned adapters автоматически получают task/spec/source snapshots, actual check process results, decision records, Verify/review raw receipts и broker outcomes. Event содержит immutable ID, sequence, causation/run/task/owner, producer/version и source digest. Retry дедуплицируется; out-of-order буферизуется, gap/conflict блокирует affected readiness. Manual PASS JSON не является authoritative evidence.

Requirements total = unique current approved requirement IDs; accepted = requirements со всеми required scenarios, meaningful assertions, current passing applicable evidence и required decisions/gates. Task total/checked = decimal parseTasks; evidence-complete count отдельно. Scenario coverage = distinct executed required scenarios / total required scenarios; negative coverage = distinct executed required negatives / declared required negatives. Checks показываются раздельно PASS/FAIL/BLOCKED/NOT_RUN и justified N/A; remaining = total−complete, retries не удваиваются. Blocker age выводится из first unresolved event и explicit timestamp, fix attempts — из связанных runs. Numerical metrics требуют own approved limits/actual measurements; qualityScore не вводится.

Ровно восемь sections design 5 сохраняются. Input digest покрывает все source records и explicit timestamp; renderer version и exact rendered bytes воспроизводятся. Start/resume/scope/decision/task/blocker/check batch/review/Verify/adoption/publication/closure автоматически вызывают ingestion/reconciliation; frozen events сохраняются внешне и render ждёт verified unfreeze. Missing adapter/stale source = truthful BLOCKED/STALE/NOT_RUN без принятия affected metrics. Panel visibility только UNKNOWN/QUEUED до подтверждения.

Typed host broker обслуживает bootstrap/adopt/checkpoint/publish в существующих grants. Credentials/remote network вне workers; arbitrary shell/argv intents запрещены. Общий lock сериализует common/index/ref operations; current owner lease/freeze, registration, scope, source SHA и destination проверяются перед mutation. Safe process-local Git config отключает непредусмотренные hooks/filters/config, не меняя global settings. Explicit staging, sensitive-path audit, no force, exact SHA и fresh remote query обязательны. Production destination неизменен: git@github.com:leonmaks/frade.git refs/heads/codex/frade-standard-workflow. Crash-after-push сначала сверяет remote outcome, затем сохраняет idempotent receipt, без duplicate/empty commit loops.

### D05.8 Actual E2E and owner adoption

D05 явно grants двум disposable fixtures task 3.3 test profile с пятью unchanged W01 pairs, existing permitted disposable roots и local bare remotes. Перед запуском receipt связывает фактические canonical paths/registration/baselines/intent hashes; отсутствие existing root grant блокирует тест, не расширяет OS permissions. Fixture stage rows ссылаются на этот named test grant. Future directions используют свои approved stage plans.

Fixture A: новый bounded test intent, automatic roles/checks/rights draft и bootstrap, planning approval в пределах explicit D05 test envelope, actual PRE, meaningful RED, confined implementation test-only поведения, checks, actual formal Verify, actual independent POST, checkpoint/verified local bare-remote SHA/status и STOP.

Fixture B: иной registered stale disposable owner, reviewed exact old/new control hashes и D05-bounded adoption, затем тот же полный lifecycle. Инъекции crash/cancel/stale epoch/freeze/crash-after-push и WAITING_FOR_HUMAN проверяют blocked transitions и safe resume. Harness подаёт заранее разрешённый test-only decision event после доказанного waiting; он не подделывает live human approval. У fixtures разные IDs/intents/baselines/scopes/branches/worktrees/remotes/journals. Оба используют один service API и реальные admitted model sessions/confinement/Git/review boundaries; manual launches, mocks или library-only не удовлетворяют 3.3. Actual NOT_CONFIRMED допустимо по D05.3; explicit unsupported pair/substitution/failed receipts блокируют.

Real owner adoption происходит позже в собственных checkpoints: inventory verified registration, origin/HEAD/dirty bytes, old/new policy/control/authority hashes, nested rules/gates; capability выводится из approved owner scope и existing host grant. Hash drift/wrong owner/missing approval блокируют без overwrites. W01 historical exception не переносится; Routing/UI/Repo Core остаются NOT_STARTED.

### D05.9 Tasks, traceability, checks and closure

Порядок 1.6→1.7→2.8→2.9→2.10→2.11→2.12→2.13→3.3→3.4→4.1→4.2. Все 18 исторических IDs сохраняются; добавляются десять decimal IDs в существующие groups, всего 28 current tasks. Старое checked 4.1 сохраняется исторически, current 4.1 открывается после approval. Каждый implementation unit RED→RCA при дефекте→implementation→targeted GREEN→applicable regression→checkpoint; два failed fixes требуют STOP PATCHING/RCA.

Mapping: FWE-011-S04–S07→2.8/2.9/3.4/4.1/4.2; FWE-019-S01–S02→1.6/2.10/2.11/3.3, S03/S05→2.10/2.11/3.3, S04→1.6/1.7/3.4/4.1/4.2/4.3/4.4; FWE-020-S01–S06→1.6/2.10/2.11/3.3; FWE-021-S01–S03→2.10/2.11/3.3; FWE-022-S01/S02/S04/S05→1.6/2.10/2.11/3.3, S03→1.6/1.7/2.10/2.11; FWE-023-S01–S05→2.12/3.3/3.4; FWE-024-S01–S05 и FWE-025-S01–S04→2.13/3.3/3.4. Существующие requirement/scenario mappings сохраняются. Assertion/run links создаются только из фактического разрешённого исполнения; сейчас это план.

Mandatory validation: isolated exact OpenSpec 1.14.0 strict change/all-spec; parser/collision/schema/content/link/traceability/render/hash; full direction unit/BDD/integration/actual temporary-Git/adversarial suite; required applicable root lint/type/build/boundary/platform checks; unchanged product/frozen/lockfile/vendor. Windows/WSL claims требуют actual target tests. Cached evidence используется только с source/toolchain/config applicability proof. check:all/native rerun/remote CI/protection не считаются PASS без исполнения; unavailable required check блокирует closure.

Fresh 4.1 проверяет весь amended candidate, старые и новые requirements/tasks и два E2E. Fresh 4.2 — cumulative independent POST от original baseline через immutable v1.1 с complete clean reception; старый/focused POST недостаточен. Tasks 4.3/4.4 остаются later barriers в рамках existing bounded closure authorization, неактивными до current mandatory gates и required decisions. Scope design 1a неизменен; main merge, foreign adoption и следующий numbered change не разрешаются.

Оценки: 1.6–1.7 8–20h; 2.8–2.9 6–12h; 2.10–2.11 20–40h; 2.12 6–12h; 2.13 12–24h; 3.3 10–20h; 3.4 4–8h; 4.1–4.2 8–16h. Automation subtotal 48–96h, reception отдельно 6–12h; total 74–152h без external waiting, повторного repair и 4.3/4.4. Это estimates, не delivered capability или обещание PASS.
