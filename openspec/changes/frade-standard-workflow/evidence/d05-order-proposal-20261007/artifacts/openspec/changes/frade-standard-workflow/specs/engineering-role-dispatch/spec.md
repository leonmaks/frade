# Engineering role dispatch

## Purpose

Defines exact approved model/effort dispatch and independent packet-confined review with honest execution provenance for every Frade stage and task role.

## ADDED Requirements

### Requirement: FWE-009 Exact model resolution

Dispatch SHALL resolve one exact approved model/effort for stage and task type/role, with a reviewed task-specific override taking priority. It MUST retain approved source path/raw hash/excerpt and revision, never use a range, silent fallback or request metadata as approval.

#### Scenario: FWE-009-S01 Resolve a task exception

- **WHEN** an approved task-specific executor pair differs from its stage/type pair
- **THEN** only that task uses the explicit pair with exception authority retained

#### Scenario: FWE-009-S02 Block ambiguous assignments

- **WHEN** a role assignment is missing, contradictory or says high/xhigh or Luna/Sol
- **THEN** dispatch reports BLOCKED and does not select its own pair

#### Scenario: FWE-009-S03 Reject plan drift

- **WHEN** the approved assignment source bytes change after review request creation
- **THEN** the invocation is rejected until coherent revalidation

### Requirement: FWE-010 Automatic independent review

The owner SHALL prepare, invoke and receive fresh independent PRE/POST through verified immutable packet confinement without routine human relay. The reviewer MUST have no writes, original-checkout/other-worktree/secrets/global-settings/network/apps access.

#### Scenario: FWE-010-S01 Check confinement before review

- **WHEN** an independent review is invoked
- **THEN** the exact runtime/version and permitted/denied resource canary must pass before reviewer work

#### Scenario: FWE-010-S02 Fail unavailable isolation

- **WHEN** packet confinement or exact required runtime cannot be verified
- **THEN** review is BLOCKED with no weaker fallback

#### Scenario: FWE-010-S03 Keep auth outside packet

- **WHEN** the selected packet includes a credential, .env, unsafe path or foreign repository
- **THEN** packet preparation rejects it before dispatch

### Requirement: FWE-011 Complete immutable review reception

A review SHALL bind candidate/packet/request/toolchain/control/plan hashes and full raw events, exits and report. Valid approval requires clean complete execution and exactly one PASS/FAIL verdict; drift, truncation, ambiguity or timeout MUST be BLOCKED. Every required inspection command MUST complete successfully; nonzero exit, missing completion or failed stream MUST prevent clean PASS reception. A predeclared negative-test harness MAY validate an expected failing child only when the harness itself completes successfully. A failed required inspection MUST NOT be retrospectively reclassified as a negative control, and later success MUST NOT erase earlier failure. Historical contradictory PASS receipts and raw failures SHALL remain immutable; current admission requires a new complete clean source-bound run.

#### Scenario: FWE-011-S01 Reject forged PASS

- **WHEN** a plausible report says PASS but its final event/report binding or candidate hash differs
- **THEN** the receipt is BLOCKED and cannot unlock a phase

#### Scenario: FWE-011-S02 Freeze owner data

- **WHEN** review is running
- **THEN** source, status, index and HEAD remain unchanged until receipt retention and unfreeze

#### Scenario: FWE-011-S03 Retain a valid FAIL

- **WHEN** a complete immutable review returns one FAIL verdict
- **THEN** the owner stores raw FAIL and repairs within approved scope before a fresh review

#### Scenario: FWE-011-S04 Reject failed required inspections

- **WHEN** otherwise complete events/report say PASS but a required inspection exits nonzero, including 1 or 2, lacks completion or has a failed stream
- **THEN** reception is BLOCKED, raw evidence remains retained and no phase is unlocked

#### Scenario: FWE-011-S05 Validate a predeclared negative control

- **WHEN** a regression harness executes an intentionally failing child with a predeclared expected result
- **THEN** only a successful harness assertion may count as test evidence; a failed required inspection cannot be relabelled after execution

#### Scenario: FWE-011-S06 Reconcile historical contradiction

- **WHEN** a historical RECEIVED_VALID_PASS conflicts with retained inspection failures or its necessary raw streams are unavailable
- **THEN** history remains immutable, current clean admission is unestablished and fresh clean formal Verify is required before dependent POST

#### Scenario: FWE-011-S07 Require a fresh clean run

- **WHEN** a run contains truncation, failed inspections or erroneous audit results followed by corrective successful commands
- **THEN** the old limitations remain visible and a new clean candidate-bound run is required for gate acceptance

### Requirement: FWE-012 Separate requested and actual execution

Execution provenance SHALL distinguish approved pair, requested pair, invoked arguments and independently confirmed backend/effort. Approved/requested/invoked model and effort MUST match the exact approved assignment. Without independent backend attestation actual backend/effort SHALL remain NOT_CONFIRMED; this alone MUST NOT block execution unless the owning approved plan explicitly requires that attestation. Explicit unavailable/unsupported model or effort, substitution, known actual mismatch or failed invocation MUST block dependent execution without fallback. Trusted pinned runtime, required confinement and complete invocation/review receipts remain mandatory. Automatic model dispatch MUST NOT claim that an existing chat changed model; unsupported executor dispatch MUST be explicit.

#### Scenario: FWE-012-S01 Record unattested backend

- **WHEN** CLI invocation uses the approved model/effort but has no independent backend attestation
- **THEN** requested/invoked values are recorded while actual backend/effort stays NOT_CONFIRMED

#### Scenario: FWE-012-S02 Block unsupported writer dispatch

- **WHEN** a task requires a writable worker but only the confined read-only review service exists
- **THEN** writer execution is NOT_IMPLEMENTED/BLOCKED rather than falsely reusing reviewer confinement

### Requirement: FWE-022 Exact admitted execution authority

Controller SHALL проверять existing protected host grant, verified owner registration, current approved phase/task authority, pinned trusted runtime/profile и exact approved/requested/invoked pair перед запуском/resume. Receipt SHALL содержать source path/raw hash/excerpt/revision, decision binding, runtime/profile/grant identities, invocation results и отдельные actual fields. Missing/ambiguous assignment, explicit unsupported/unavailable pair, substitution, known actual mismatch или failed launch MUST давать BLOCKED без fallback. Actual NOT_CONFIRMED SHALL обрабатываться по FWE-012 и MUST NOT требовать нового универсального attestation service. Historical D03 hashes SHALL сохраняться; новая D05 revision SHALL приниматься отдельным nonrecursive approver record в составе одного D05 package decision.

#### Scenario: FWE-022-S01 Admit exact invocation with honest provenance

- **WHEN** approved/requested/invoked pair совпадает, trusted pinned runtime/confinement проверены и complete receipts доступны, но backend attestation отсутствует
- **THEN** запуск может удовлетворить W01/fixture admission, actual остаётся NOT_CONFIRMED и gate verdict определяется actual checks/review, не вымышленной attestation

#### Scenario: FWE-022-S02 Block explicit unsupported or substituted execution

- **WHEN** provider явно отвергает approved model/effort, invoked pair отличается, actual mismatch подтверждён либо runtime/profile/launch invalid
- **THEN** dependent execution BLOCKED с retained reason, без silent model/effort/provider/profile fallback

#### Scenario: FWE-022-S03 Bind D05 without changing historical constants

- **WHEN** amendment меняет design bytes при unchanged five W01 pairs
- **THEN** original D05 acceptance и D03 constants сохраняются; corrected D05 scope проверяется по separately human-approved package/design/decision chain, а operational source/path/raw hash/exact role excerpt/revision/decision записывается отдельно от approved overlay scope/path/hash/task excerpts в каждом worker receipt; fresh clean PRE проверяет весь corrected order через actually supported admitted adapter без code/guard/pin substitution, live D03 остаётся operational через 2.8/2.9/2.10, и только 2.11 после meaningful RED согласованно устанавливает exact corrected eleven artifacts и current authority consumers; raw D03 manifest fields остаются historical origin, current authority выводится из protected nonrecursive accepted decision; partial/mixed state BLOCKED, unchanged historical assertions реально выполняются по explicit human-approved finite path/hash/semantic mapping вместе с additive current D05 denial/drift controls, а unsupported transition остаётся BLOCKED без guard bypass или ранней implementation

#### Scenario: FWE-022-S04 Respect a stricter owner and bounded fixture grants

- **WHEN** own approved owner plan явно требует actual attestation либо fixture пытается использовать grant вне двух D05 test directions
- **THEN** missing required attestation или выход за test grant блокирует dependent dispatch; W01 NOT_CONFIRMED policy и fixture pairs не превращаются в universal owner defaults

#### Scenario: FWE-022-S05 Separate workers, reviewers and brokers

- **WHEN** worker пытается получить reviewer approval capability, broker credentials, foreign-owner scope или изменить protected host registration
- **THEN** техническое confinement/admission отклоняет действие, raw evidence сохраняется и никакой gate не считается пройденным

### Requirement: FWE-023 Bounded immutable transport

Request transport SHALL использовать safe short absolute regular-file locator либо exact framed stdin с immutable byte length/SHA256 и packet/owner/run/phase/authority/runtime bindings. Full request MUST NOT передаваться как большой JSON argv, сокращаться ради argv limit или менять shared reviewer v1.1. Configurable versioned policy SHALL валидировать positive safe-integer limits и native constraints до dispatch; D05 initial constants: request 16 MiB, metadata envelope 64 KiB, packet 64 MiB/4096 files, locator 4096 UTF-8 bytes с stricter native limit, output 256 MiB/run, transport inactivity 300s. Limit overflow, traversal/link/reparse/TOCTOU, hash drift, invalid framing, failed stream или timeout MUST исключать acceptance. Original request/packet SHALL сохраняться неизменно; partial output SHALL маркироваться incomplete.

#### Scenario: FWE-023-S01 Deliver the original large request

- **WHEN** доступны original 33,270-character request и original packet из 277 файлов/7,389,082 bytes в пределах approved policy
- **THEN** adapter передаёт их полные исходные bytes и проверяет manifest hashes без shortening/full JSON argv; missing original bytes оставляет regression NOT_RUN/BLOCKED

#### Scenario: FWE-023-S02 Test every configured boundary

- **WHEN** request/envelope/packet/file-count/locator/output/inactivity достигают limit−1, limit и limit+1 в своих единицах либо native limit строже
- **THEN** policy разрешает только допустимые complete inputs, boundary behavior проверяется, overflow/timeouts не дают partial PASS и original evidence не подрезается

#### Scenario: FWE-023-S03 Reject path races and aliases

- **WHEN** locator выходит из effective namespace через traversal/link/reparse/Windows-WSL alias либо bytes меняются между binding и consumption
- **THEN** safe open/read/spool verification блокирует dispatch до использования подменённых bytes и сохраняет исходные request/packet

#### Scenario: FWE-023-S04 Reject failed or incomplete streams

- **WHEN** stdin/output имеет short/extra bytes, duplicate/unknown framing, failed stream, timeout или missing final completion
- **THEN** incomplete evidence сохраняется с BLOCKED admission и не считается complete при resume

#### Scenario: FWE-023-S05 Validate policy before launch

- **WHEN** configuration содержит zero/negative/noninteger/overflow limits, несовместимые length/count values, неподдерживаемый native locator или недостаточное approved storage
- **THEN** preflight отклоняет её; policy hash фиксируется для valid run, а изменение accepted limits требует revalidation вместо silent truncation
