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

A review SHALL bind candidate/packet/request/toolchain/control/plan hashes and full raw events, exits and report. Valid approval requires clean complete execution and exactly one PASS/FAIL verdict; drift, truncation, ambiguity or timeout MUST be BLOCKED.

#### Scenario: FWE-011-S01 Reject forged PASS

- **WHEN** a plausible report says PASS but its final event/report binding or candidate hash differs
- **THEN** the receipt is BLOCKED and cannot unlock a phase

#### Scenario: FWE-011-S02 Freeze owner data

- **WHEN** review is running
- **THEN** source, status, index and HEAD remain unchanged until receipt retention and unfreeze

#### Scenario: FWE-011-S03 Retain a valid FAIL

- **WHEN** a complete immutable review returns one FAIL verdict
- **THEN** the owner stores raw FAIL and repairs within approved scope before a fresh review

### Requirement: FWE-012 Separate requested and actual execution

Execution provenance SHALL distinguish approved pair, invoked arguments and independently confirmed backend/effort. Automatic model dispatch MUST NOT claim that an existing chat changed model; unsupported executor dispatch MUST be explicit.

#### Scenario: FWE-012-S01 Record unattested backend

- **WHEN** CLI invocation uses the approved model/effort but has no independent backend attestation
- **THEN** requested/invoked values are recorded while actual backend/effort stays NOT_CONFIRMED

#### Scenario: FWE-012-S02 Block unsupported writer dispatch

- **WHEN** a task requires a writable worker but only the confined read-only review service exists
- **THEN** writer execution is NOT_IMPLEMENTED/BLOCKED rather than falsely reusing reviewer confinement
