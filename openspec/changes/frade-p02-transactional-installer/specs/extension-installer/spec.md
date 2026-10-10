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
