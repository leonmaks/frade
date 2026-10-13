# Spec Delta

## Purpose

Hot theme selection requires safe local package registration and recovery, not opening a sample ZIP as if it were an integration.

## ADDED Requirements

### Requirement: Bounded declarative packages

Offline file install SHALL validate archive structure, identity, semver engines, known contributions and native role data within declared resource/path limits. It MUST NOT execute JS or write project files. SHA256 SHALL describe integrity, not publisher trust.

#### Scenario: Incompatible sample fixture

- **WHEN** the provided sample targeting Frade 1.x is installed in current 0.1 runtime
- **THEN** the installer rejects compatibility without modifying registrations or files outside staging


#### Scenario: Archive and schema boundary rejection

- **WHEN** a package exceeds a declared actual byte/count/depth/ratio limit or contains unsafe paths, links, corrupted ZIP metadata, invalid native schema or incompatible engines
- **THEN** installation rejects with a specific diagnostic, no code execution and no writes outside authorized staging, preserving committed registry and dirty work

### Requirement: Transactional lifecycle and recovery

Install/update/rollback SHALL preserve last committed registry/version on validation or commit failure and recover across crashes through durable journal phases. Update capability increases MUST require a grant before use. Only one version per ID SHALL be active.

#### Scenario: Crash at swap

- **WHEN** installation is interrupted at a journal phase
- **THEN** restart restores or completes the last valid committed registry without losing the previous package


#### Scenario: Post-swap rollback and retained version

- **WHEN** a coordinated presentation or durable commit fails after the registry pointer changes, or an explicit retained rollback lacks validated previous bytes
- **THEN** previous committed registry, package and presentation remain recoverable, missing rollback is reported honestly and no mixed generation is exposed

### Requirement: Fallback and safe removal

Disable/uninstall SHALL atomically fallback active theme/icons and preserve dirty work. Unsafe custom-editor closure MUST block removal with save/convert/cancel. Physical cleanup SHALL follow commit and handle release; locked files MUST NOT produce false deletion success.

#### Scenario: Invalid update

- **WHEN** v2 validation fails over installed v1
- **THEN** v1 theme and registrations remain usable and dirty work remains intact


#### Scenario: Unsafe editor and locked cleanup

- **WHEN** a dependent editor vetoes safe removal or physical package files remain locked after a logical lifecycle commit
- **THEN** unsafe removal is blocked with save/convert/cancel and no silent data loss, while cleanup after a successful logical commit is reported pending until actual files can be removed

### Requirement: Honest extensions view

Extensions view SHALL expose install-from-file, details, enabled state, updates, retained-version rollback, uninstall and diagnostics according to actual supported operations. Installing a theme package MUST NOT silently change active theme.

#### Scenario: Theme installation

- **WHEN** a valid theme-only archive commits
- **THEN** new choices are available but the active theme stays unchanged until user selection

#### Scenario: Actual offline lifecycle and restored context

- **WHEN** the user installs and explicitly selects a native theme, updates, disables, rolls back or uninstalls through the actual desktop Extensions view
- **THEN** truthful supported actions and diagnostics use the shared theme/density/keyboard contract, current registry and persisted presentation recover consistently on restart, and dirty editors, selections and domain data are preserved

### Requirement: Checked Windows installation filesystem

The Windows backend SHALL bind one Main-authorized local NTFS installation root and retain checked directory handles. Operations MUST address validated components relative to checked parent handles, reject reparse/special/hardlink entries and enforce exclusive bounded writes. It MUST prevent ancestor replacement from redirecting effects outside the root. No Node path-check fallback is permitted.

#### Scenario: Adversarial ancestor replacement

- **WHEN** an ancestor or leaf is replaced or mutated into a junction at the check/open boundary
- **THEN** checked handle-relative operations refuse or remain confined, and actual owned outside-root bytes stay unchanged

#### Scenario: Positive root and handle release

- **WHEN** ordinary bounded content is written inside a verified root and the owning session is disposed or crashes
- **THEN** exact bytes and identities are verified and all retained handles are released without authorizing another generation

### Requirement: Verified Windows journal persistence

Coordinator journal publication SHALL use same-directory checked-handle rename, write-through writes and explicit successful flushes before ACK. Unsupported or uncertain capability MUST block installer use. Errors after possible effects MUST return UNKNOWN and require recovery. Process-crash evidence MUST NOT be reported as unconditional OS or hardware power-loss proof.

#### Scenario: Flush or helper failure at commit

- **WHEN** flush, rename, timeout or helper death prevents a verified durable ACK after an effect
- **THEN** old and new recoverable bytes remain, further transactions block and recovery reconciles a validated coordinator phase without false success

### Requirement: Closed filesystem transport

The helper SHALL accept only bounded versioned installation-root operations authenticated to one session/generation with serialized request IDs, offsets and deadlines. Malformed, replayed, stale or oversized frames MUST cause refusal without another effect. No shell, network, arbitrary host path or privileged renderer API is allowed.

#### Scenario: Stale or oversized command

- **WHEN** a command has an invalid session, generation, sequence, deadline, schema, path or actual frame/chunk size
- **THEN** the command is rejected before its effect and the unusable session is disposed with pending calls settled honestly

### Requirement: Verified filesystem helper deployment

Frade SHALL build the first-party helper with an existing explicitly discovered compiler and verify source, artifact, protocol and runtime capability before use. Missing, drifted or unsupported output MUST block installation without runtime compilation, SDK installation, elevation or global configuration changes. Native Windows checks SHALL remain explicit separate evidence from portable checks.

#### Scenario: Missing or drifted backend

- **WHEN** compiler, CLR, architecture, supported filesystem, copied executable or integrity metadata is unavailable or inconsistent
- **THEN** installer reports BACKEND_UNAVAILABLE or REFUSED without staging writes, while portable checks do not claim Windows PASS

### Requirement: Unambiguous journal phase publication

The single coordinator SHALL publish immutable ordered hash-linked phase records to previously absent final names with ReplaceIfExists false. Existing confirmed records MUST remain byte-present. Recovery SHALL validate the complete ordinal/hash/state chain and decide old versus new state only from a valid COMMITTED marker. Conflicts, gaps, forks and malformed authoritative records MUST block. Recovery dispositions SHALL share that journal and MUST NOT add a transaction phase.

#### Scenario: Existing phase target and uncertain publication

- **WHEN** a phase target exists, or rename or flush has an uncertain result
- **THEN** publication never overwrites that target, confirmed prefix bytes remain and complete checked recovery recognizes a valid intent or blocks conflicting state without a false ACK

#### Scenario: Valid commit marker and incomplete recovery

- **WHEN** startup finds a valid incomplete transaction chain or a valid COMMITTED with a lost reply
- **THEN** it restores old state before the marker or retains new state after it, verifies both durable stores before publishing a same-journal recovery disposition and refuses later operations until reconciliation completes

### Requirement: Complete journal outcome reservation

Admission SHALL reserve bounded capacity for the full transaction outcome and recovery before STAGING or package/state effects. Same-directory publication MUST use one checked parent for temp and final. Confirmed closing dispositions and cleanup intents SHALL be reused without appending duplicate journal records during retries or restart. Insufficient capacity MUST refuse admission while preserving committed state.

#### Scenario: Near-limit admission and interrupted closure

- **WHEN** remaining journal capacity cannot cover eight bounded records and eight MiB, or an admitted transaction is interrupted
- **THEN** insufficient admission refuses before STAGING, while admitted recovery retains its remaining reservation, completes the chosen outcome within that envelope and never lets a later operation consume it

#### Scenario: Same-parent publication and repeated locked cleanup

- **WHEN** journal publication is interrupted or committed physical cleanup remains locked across retries and restarts
- **THEN** temp and final remain entries of the same checked parent, confirmed chain/disposition is reused and physical retries preserve honest pending state without consuming new journal records

#### Scenario: Native same-source-parent confinement

- **WHEN** a held checked ordinary journal source is published to an absent basename, or a caller requests another parent or a conflicting target
- **THEN** publication remains in its original pinned directory without reopening an unlocked parent, conflicting targets and outside-root bytes stay unchanged, and errors without verified flush/readback never produce a durable ACK

### Requirement: Existing Main persistence coexistence

The verified extension filesystem binding SHALL preserve existing Main presentation persistence and recovery while retaining checked installation-root confinement. Any internal desired-access refinement MUST keep continuous checked parent identity and strong install-root/lease guards. It MUST NOT authorize sibling writes, release the guard chain or change existing Main presentation storage contracts.

#### Scenario: Bound root and actual presentation persistence

- **WHEN** the native helper remains bound while Main persists, readbacks, restarts or compensates a presentation selection
- **THEN** existing settings semantics remain correct, unchanged checked installation-root effects stay confined and unsupported or uncertain guards block installation without reporting a false capability

### Requirement: Continuous outer identity handoff

The backend SHALL acquire the complete same-object outer metadata replacement set only after original full binding and strong root/lease establishment. It MUST retain every original outer identity continuously and verify the complete chain before each non-disposal operation. Uncertain identity or handoff MUST invalidate binding without a false ACK. Metadata handles MUST NOT authorize effects outside the checked installation root.

#### Scenario: Overlapping complete-chain handoff

- **WHEN** original outer guards are replaced after strong root and exclusive lease establishment
- **THEN** all replacements match original volume/file ID/final path/type/case while the original complete set is still held, and any partial failure makes the binding unusable with all handles disposed

#### Scenario: Changed identity and ordinary sibling IO

- **WHEN** an outer identity changes or ordinary Main/owned sibling IO runs while the helper remains bound
- **THEN** changed or uncertain guards refuse before effects or stay confined without verified ACK, ordinary sibling IO remains compatible and owned outside-root bytes stay unchanged

### Requirement: Exact owned-object enumeration

Listing and cleanup SHALL reuse an already-held owned object only after exact parent/component, enumerated file ID, volume/path/type and ordinary single-link checks. Borrowed handles and the exclusive root lease MUST remain retained. Unknown entries MUST use strict checked-child opens without reparse following or sharing relaxation; names alone MUST NOT confer trust or deletion authority.

#### Scenario: Listing own lease and cached children

- **WHEN** bounded enumeration encounters the exact held root lease, cached directory or pending file
- **THEN** identity-checked reuse avoids self-conflicting reopen, borrowed pins remain held and cleanup preserves protected objects while reporting only actual checked deletion

### Requirement: Identity-bound optional removal

The existing remove operation SHALL accept optional expectedIdentity as24 lowercase hex and compare it with the actual held target before deletion. Missing, unsafe or mismatched targets MUST refuse before deletion. Invalid types/IDs and unknown fields MUST reject before effects. With no optional fields the original recursive contract SHALL remain unchanged.

#### Scenario: Genuine identity mismatch during owned cleanup

- **WHEN** a caller supplies a captured identity and the actual checked target differs, is missing or unsafe
- **THEN** deletion refuses without removing the changed target or unknown bytes, retaining the checked parent and honest session outcome

### Requirement: Empty-only checked directory removal

Optional emptyOnly SHALL accept only literal true for directories. It MUST attempt only kernel empty-directory deletion and never recursively remove children. File plus emptyOnly and emptyOnly false MUST reject before effects. Nonempty or late-child refusal/uncertainty SHALL retain all unknown bytes and report REFUSED/UNKNOWN honestly.

#### Scenario: Unknown child in held bootstrap directory

- **WHEN** a genuine unknown child exists or arrives before empty-only deletion of the exact held directory
- **THEN** the child is never recursively deleted and the directory cleanup refuses or reports UNKNOWN according to actual possible effects

### Requirement: Bounded volatile bootstrap proof

The Main-owned backend SHALL use only the accepted finite non-authoritative .frade-runtime-probe fixture under its bound root. Bounds SHALL remain3 ordinary entries,16KiB payload,4KiB owner/proof JSON,48 commands,60s overall and10s per command. VERIFIED MUST remain private and volatile, source/root/helper/generation-bound, and require complete checked proof and identity-bound empty-only cleanup. Query/build metadata SHALL remain NOT_VERIFIED.

#### Scenario: Fresh successful bootstrap and interrupted fixture

- **WHEN** a fresh absent fixture completes checked write/flush/same-parent publication/readback and normal cleanup, or startup finds a stale/unsafe/interrupted fixture
- **THEN** only the fully successful current live context may become VERIFIED; stale or uncertain fixture blocks and preserves bytes without prefix cleanup, retry, reuse or persisted certificate

### Requirement: Preserved coordinator authority during bootstrap

Bootstrap metadata SHALL remain non-authoritative and write no package/state registry, presentation, staging, version, journal or COMMITTED marker. Package/state effects MUST retain the one coordinator's durable intent and valid COMMITTED authority. Installed-state recovery MUST complete before first paint; bootstrap proof MUST NOT substitute for it.

#### Scenario: Bootstrap unavailable and installed state

- **WHEN** bootstrap is unavailable or Main closes while installed state or a transaction exists
- **THEN** no mixed generation or preference reset bypasses coordinated recovery, and shutdown invalidates callbacks and awaits actual helper disposal without weakening the dirty-work guard

### Requirement: Bounded DEV presentation timing diagnostics

Development diagnostics SHALL emit only the accepted fixed phase labels and numeric timings, with at most ten renderer markers per boot. Diagnostics MUST preserve operation order, awaits, listeners, error propagation, readiness and the existing timeout. They MUST NOT add APIs, IPC, schemas or expose document, session, path, settings or credential payloads. Production logging MUST be eliminated.

#### Scenario: Development phase observation and production preservation

- **WHEN** the existing dev boot, ready acknowledgement and disposal execute, or the production bundle is built
- **THEN** only bounded development markers may be captured, production omits them, and original behavior, APIs, timeout and regression assertions remain unchanged

#### Scenario: Unreproduced historical timing failure

- **WHEN** at most three approved instrumented canonical dev/rebuild attempts do not reproduce the earlier failure
- **THEN** diagnostics report NOT_PROVEN and stop for reassessment without attributing a cause, waiving FAIL or changing timeout or assertions

### Requirement: Exact accepted historical development risk

Only the historical dev5s failure identified by accepted P02-DEV-TIMEOUT-DEFERRED-RISK-01 SHALL be deferred as P02-D01 with cause NOT_PROVEN. Original FAIL evidence MUST remain immutable. Every timeout, assertion and required current check MUST remain unchanged.

#### Scenario: Accepted disposition after bounded diagnostics

- **WHEN** three approved diagnostic attempts finish without reproducing that historical failure and the exact human decision is accepted
- **THEN** the original diagnostic STOP and FAIL remain evidence, the causal-fix prerequisite for only that failure is removed, and coherent strict validation plus fresh applicable independent PRE/POST precede progression

#### Scenario: New failure or historical recurrence

- **WHEN** the deferred failure recurs or any required current check fails
- **THEN** the owner stops for meaningful reproduction and RCA, P02-D01 grants no current failure waiver, and incomplete S1/S2 or cumulative P02 gates cannot be reported PASS

## Implementation traceability for existing S2 requirements

2026-10-10T21:29:38.373Z: [S2 scheme](../../evidence/p02-s2-scheme-20261010T212938373Z/s2-scheme.md) maps the unchanged requirements/scenarios to immutable exact archive storage, existing checked commands, one reserved seven-phase journal/closing disposition, COMMITTED-only recovery and named bridge/P01 ports. No new or weakened normative requirement or scenario; all original spec text above remains byte-present. Current focused S1 POST PASS does not prove these S2 obligations, which remain NOT_IMPLEMENTED/NOT_RUN until meaningful RED/GREEN and applicable gates.

## Current accepted S2 hooks plan — superseding failed integration only

2026-10-13T13:46:52.732Z: exact human acceptance [P02-S2-PRESENTATION-HOOKS-01](../../decisions/p02-s2-presentation-hooks-accepted-20261013T134652732Z.json) binds unchanged proposed SHA256 a10ebe39ac088d32de8dbf27b331017e1a420a450a4346b0aabca347597e3dab. Adopt [complete revised S2 scheme](../../evidence/p02-s2-hooks-accepted-plan-20261013T134652732Z/s2-scheme.md), especially section6, as current controlling algorithm for remaining2.2/2.3. This supersedes the older S2 scheme's service.ts freeze, swap-inside-barrier and missing registry-only publication/late allocation mechanism ONLY. Original failed scheme/PRE and all other paths/security/storage/journal/recovery/domain requirements stay immutable and controlling. Add ONLY packages/ui-workspace/src/design/theme/service.ts for optional portable injected admit/beforeApply/beforePublish hooks/guards; no new native command/field/dependency/phase or routing/vendor/Repo/Draw/token/brand/CI/shared-policy change. Original P01 tests/controls remain frozen.

Exact signatures: optional PresentationCoordinatorHooks methods admit/beforeApply/beforePublish(input: PresentationCoordinatorInput, signal: AbortSignal): Promise<void>; ServiceOptions.coordinatorHooks optional. Detached/frozen input carries existing PhaseContext, actual action/selection/snapshot/currentDurable, plus optional validated pendingDurable at beforePublish. admit after actual announceIntent, before prepare/cover/effects, separate60000ms; beforeApply AFTER painted barrier/check/changed=true BEFORE apply,2000ms; beforePublish AFTER all actual applyACKs and any original persist/durable validation BEFORE public state/reveal/success,5000ms. No hook state mutation/fabricated ACK or existing2s/5s/5000ms timeout/retry change. Registry-only finalizes PRESENTATION_ACK/readback/COMMITTED with identical settings/revision; commit writes exact privately reserved full record (base9/max11→12, not13) recorded beforeSTAGING. Exclusive Main owner prevents competing revision consumption. Before-marker compensate old, after-marker retain new covered/recoveryblocked; no genericrendererrestore or weakening known/schema/CAS/monotonic contracts. Actual recovery conflict requires separate decision.

Current S1 focusedPOSTPASS is separate; prior S2PREFAIL remainsFAIL. Current3/9,2.2/2.3unchecked; S2 runtime/RED/GREEN/fullchecks/cumulativeverify/POST/visual/archive NOT_RUN. P02-D01 originalFAIL/causeNOT_PROVEN unchanged. Fresh strict+automatic independentPRE gpt-6-sol/xhigh required before implementation; noP03.

## ADDED Requirements

### Requirement: Optional awaited presentation coordinator hooks

The presentation service SHALL expose only the accepted optional portable lifecycle hooks. Hooks MUST preserve standalone behavior, original validation and deadlines. Publication MUST await verified transaction authority.

#### Scenario: Rejected provisional adoption

- **WHEN** beforeApply adopts a registry and then rejects or ownership invalidates
- **THEN** changed=true compensation restores old authority under cover or blocks safely without mixed reveal

#### Scenario: Registry-only finalization before reveal

- **WHEN** a registry change preserves presentation selection
- **THEN** all participant ACKs and identical settings readback precede valid COMMITTED and every reveal or success, without settings write or revision increment

#### Scenario: Marker uncertainty and hook-free operation

- **WHEN** a valid COMMITTED reply is lost or hooks are absent
- **THEN** committed uncertainty cannot restore old authority, while absent hooks preserve original operation order and all original assertions

### Requirement: Complete presentation record reservation

Main SHALL reserve the full owned candidate record before STAGING under serialized ownership. Persistence MUST use that exact record once, preserve schema/CAS/known-record protections and refuse stale competing writers.

#### Scenario: Reserved revision is persisted exactly

- **WHEN** authoritative revision is9 and maximum consumed revision is11
- **THEN** admission reserves12 before STAGING, later persistence writes12 rather than13, and cancellation or uncertainty does not silently reuse consumed revisions

## Current accepted monotonic recovery — exact scoped supersession

2026-10-13T14:30:31.057Z: [exact acceptance](../../decisions/p02-s2-monotonic-recovery-accepted-20261013T143031057Z.json) binds P02-S2-MONOTONIC-RECOVERY-01 proposalSHA 5375face6d98b000d92b5e6e6439c47d41a7e1f5ca7f693fa26108307ecb9efa. Adopt [complete current S2 scheme](../../evidence/p02-s2-recovery-accepted-plan-20261013T143031057Z/s2-scheme.md) sections4–7/12 for remaining2.2/2.3. It supersedes ONLY prior exact-old PresentationRecord restoration, absent RecoveryPlan and premarker closure branch. Semantic old registry/selection before validCOMMITTED and new after it remain; premarker changed owned settings are restored by a full planned monotonic compensation record, never falsely labelled original old bytes. Original current hooks, path boundaries/security/package limits and all other contracts remain. Original prior scheme/PREFAIL are immutable history, not current approval.

One immutable same-chain RecoveryPlan precedes any compensation write, binding full actual owned observed record/target/old registry/predecessor/consumed max/cleanup refs. Old9/reserved12/actual12→planned13→exactwrite13, restart reuses13 (no14); later mutation14. Exactold9 selects NO_SETTINGS_WRITE but consumed12 is not reused. ValidCOMMITTED always retainsnew12/no old plan. Unknown settings/ownership/fork blocks without overwrite. Reconstruct consumed max from all validated reservations/plans/closures, including cancelled outcomes; private Main recovery registers exact owned candidates without weakening schema/CAS/known maps/64cache or allowing stale callbacks. Original P01 standalone allocation/reconcile/fields/retries/timeouts/assertions unchanged, no extra hook or rendererrestore.

Envelope stays8slots/8MiB: normal7phases+oneDisposition=8; confirmed premarker prefix≤5+oneRecoveryPlan+atmostoneCLEANUP+oneROLLED_BACKDisposition≤8. CLEANUP is same phase, now once for premarker physical cleanup after plan; RecoveryPlan bookkeeping is not new phase/journal. Settle valid marker vs absent/owned pending temp by full scan before branch; no conflictingordinal/extraACK/ninthrecord/duplicateclosure. Complete verified targetbytes+oldregistry/version bind closing disposition and nextboot/admission. IO/ENOSPC/flush uncertainty remains UNKNOWN/BLOCKED.

Scope remains accepted P02 paths including ONLY three optional service.ts hooks, private Main owned ports and new P02 tests. No dependency/nativefield/op/domain/routing/Repo/vendor/Draw/token/brand/CI/shared-policy edit; original P01 tests/evidence freeze. Current3/9; S2production/RED/GREEN/actualkill NOT_RUN, fullREADY_FOR_VERIFY:NO. Earlier original/current PREFAIL and P02-D01causeNOT_PROVEN retained. New strict+automaticPRE gpt-6-sol/xhigh precede production; later applicablechecks/verify/POST/visual/archive remain mandatory. NoP03. Strategy alternatives/probe/reassessment/cost20–30minforecast and21min47smeasured priorPRE are in exact accepted proposal/current scheme; no duplicatefullS1 run without input change.

## ADDED Requirements

### Requirement: Journal-bound monotonic compensation

Premarker recovery SHALL retain exact old registry and selection. A differing owned settings record MUST be restored through one immutable same-chain RecoveryPlan containing its full monotonic target before writing. Unowned records SHALL block.

#### Scenario: Interrupted monotonic restoration

- **WHEN** old9 and reserved12 are journal-known, settings12 were written and COMMITTED is confirmed absent
- **THEN** RecoveryPlan13 precedes compensation, actual13 retains old selection/registry and crash/reopen reuses exact13 before ROLLED_BACK or any later admission

#### Scenario: Exact old settings and later mutation

- **WHEN** settings still equal exactold9 or recovery13 is complete
- **THEN** NO_SETTINGS_WRITE preserves old bytes without reusing consumed12, and a later mutation after13 reserves14

#### Scenario: Marker or unsafe recovery target

- **WHEN** validCOMMITTED exists or settings/ownership cannot match a validated journal-owned record
- **THEN** committed recovery retains new without an old plan, while unsafe recovery blocks and preserves bytes

### Requirement: Bounded recovery closure branch

RecoveryPlan SHALL be bookkeeping in the original journal, not another phase or authority. Premarker closure MUST fit the original eight-record/eight-MiB reserve and reuse confirmed records without duplicate allocation.

#### Scenario: Maximum rollback branch

- **WHEN** five phase finals precede a confirmed premarker failure
- **THEN** one RecoveryPlan, at most one CLEANUP and one closing ROLLED_BACK use at most eight bounded records with identical original prefix

#### Scenario: Repeated crash and pending marker

- **WHEN** recovery repeats or a COMMITTED publication has an uncertain pending/final entry
- **THEN** a full checked scan settles authority before rollback, known targets/records are reused and a ninth record, conflicting ordinal or duplicate plan blocks


## Current accepted cleanup recovery exception

2026-10-13T18:28:17.200Z: [exact acceptance](../../decisions/p02-s2-cleanup-recovery-rebind-accepted-20261013T182817200Z.json) binds unchanged proposal SHA256 4d1ae25813e812089bb9bf5dec2b9d2a58db079e11a610f195d189cbad637d0d. [Current scheme](../../evidence/p02-s2-cleanup-rebind-accepted-plan-20261013T182817200Z/s2-scheme.md) supersedes only the mid-transaction rebind prohibition for its finite live pre-effect cleanup sharing refusal, and mandatory descendant readback for non-deleting bookkeeping of that cleanup-only directory. Unknown/changed objects, protected archives and all other safety/closure rules remain. Earlier diagnostic FAIL is preserved, not a product PASS. Original requirements/scenarios remain except these precise accepted supersessions. Fresh strict/PRE Sol/xhigh precede implementation; P023/9/fullREADY_FOR_VERIFY:NO.

## ADDED Requirements

### Requirement: One-shot closed cleanup session recovery

The coordinator SHALL replace an already CLOSED session only once per identified live pre-effect cleanup REFUSED/WIN32_32. Confirmed disposal MUST precede fresh bind. Full chain, actual settings, protected archives and original remaining reserve MUST be verified before closing.

#### Scenario: Cleanup sharing refusal before or after marker

- **WHEN** a journal-authorized identity-bound cleanup encounters the accepted sharing refusal after durable CLEANUP
- **THEN** admission and reveal remain blocked, old lease disposal completes before a fresh verified owner, COMMITTED selects old or new, exact RecoveryPlan and consumed revision are reused, and only the missing reserved closing disposition may be published

#### Scenario: Replacement safety or closure cannot be established

- **WHEN** disposal, fresh proof, directory identity, protected bytes, actual settings, scan or closing verification fails, or another error or UNKNOWN occurs
- **THEN** recovery remains BLOCKED with bytes and envelope retained, no overlapping owner, retry loop, new STAGING or budget reset

### Requirement: Non-deleting cleanup-only pending bookkeeping

A closing disposition SHALL report only finite validated cleanup refs outside current and retained sets. Accepted locked descendants MAY remain unverified only in the same ordinary cleanup-only directory with captured and revalidated identity. No child effect SHALL follow in that replacement session.

#### Scenario: Locked cleanup-only contents stay unresolved

- **WHEN** the accepted live cleanup refusal leaves child access unavailable but the checked directory identity matches and all protected authority checks pass
- **THEN** closing records honest CLEANUP_PENDING and unavailable-content diagnostics, preserves bytes, and claims neither valid child inventory nor deletion nor trust in uninspected children

#### Scenario: Safe later cleanup or ownership conflict

- **WHEN** cleanup is retried after lock release or any unknown, changed, unsafe or protected entry is observed
- **THEN** full ordinary inventory and actual identity/hash checks precede any removal, conflicts preserve bytes and block deletion, and retries append no records
