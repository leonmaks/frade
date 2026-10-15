# ui-design-contract Specification

## Purpose

Make Frade UI changes reviewable against one canonical design contract while preserving engineering checkpoints and domain behavior.

## Requirements

### Requirement: Canonical mandatory UI contract

Every new or modified UI surface SHALL record guide version 1.0, applicable FDS/A11Y rules, approved scope, affected states/themes/densities and evidence. Canonical documentation and the additive AGENTS section MUST preserve existing rules. UI's own conflicts/applicable controls MUST be resolved before adoption; independent routing work MUST NOT be a UI predecessor. Documentation alone MUST NOT claim merge protection.

#### Scenario: Independent frozen consumer control

- **WHEN** routing freezes an earlier shared engineering contract and UI independently changes it within its own approved scope
- **THEN** UI follows its own PRE, while routing owns its later adoption/revalidation without blocking UI

#### Scenario: Actual UI contract conflict

- **WHEN** UI violates its own approved visual/behavior contract or required check
- **THEN** UI progression stops until that conflict/failure is resolved in its owning layer

### Requirement: Independent feature process and consumer dependencies

UI Contract SHALL use its own baseline, feature workspace, scope and applicable PRE/test/verify/POST gates. It MUST NOT require R04 completion, routing repair or routing PRE for unrelated UI artifacts. Dependencies SHALL follow actual consumed API/artifact/behavior; integration tasks MUST belong to the consumer. Shared-file merges SHALL preserve old evidence and domain invariants.

#### Scenario: Parallel routing and UI work

- **WHEN** UI and routing have isolated workspaces and independent behavior scopes
- **THEN** each can advance through its own approved gates without acquiring a predecessor from the other program

#### Scenario: Routing consumes UI artifacts

- **WHEN** routing adopts UI tokens or independently approved shared-contract changes
- **THEN** routing verifies its own integration/control tasks after supplier availability, and UI delivery does not wait for routing

#### Scenario: New UI change

- **WHEN** a new or modified UI change is reviewed after contract adoption
- **THEN** absent rule/state/evidence mapping prevents a successful compliance verdict

### Requirement: Shared component and workshop contract

UI SHALL reuse semantic roles, the existing approved icon family and shared components. Each shared component SHALL describe anatomy, variants, sizes, states, keyboard, accessibility, tokens and examples. The workbench SHALL express personal ownership through real restored context, clear selection and factual persistence feedback. Unsupported operations MUST NOT appear functional.

#### Scenario: Unimplemented AI provider

- **WHEN** an AI representation is added without an approved provider integration
- **THEN** its availability and behavior accurately identify the missing provider and no action claims data was sent or applied

### Requirement: Checkpointed migration preserves semantics

Each approved migration stage SHALL obtain PRE approval, actual required verification and independent POST approval before archival or a dependent implementation. Draw UI selection/theme feedback MUST NOT alter endpoints, routes, constraints, document semantics or repository flow ownership. A fixture archive MUST NOT be presented as a working installer.

#### Scenario: Theme alters presentation

- **WHEN** UI selection feedback or a palette changes around a diagram
- **THEN** persisted diagram content, route constraints and repository contents remain identical

#### Scenario: Required check cannot execute

- **WHEN** a required accessibility or visual check cannot execute
- **THEN** the report states BLOCKED or NOT_RUN with reason and the stage cannot claim PASS or advance
