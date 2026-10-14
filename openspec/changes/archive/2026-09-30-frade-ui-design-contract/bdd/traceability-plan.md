# Adapted BDD mapping — current foundation including EOL and archive repair

The read-only input feature remains unchanged. docs/ui/bdd/ui-contracts.feature is the sole runtime contract; bdd/ui-contracts.feature is its coherent adapted SDD artifact. Current registry docs/ui/decisions/ui-contract-traceability.json maps 51 cases: 28 foundation bindings to actual assertion sources (including 20 browser examples) and 23 future cases with explicit owner/reason. Binding integrity is separate from executing tests.

| Tag | Actual/planned owner | Current status |
| --- | --- | --- |
| foundation | node:test generator/literal/drift/traceability and isolated generated-CSS Playwright matrix | IMPLEMENTED: 28 bindings; prior executed evidence retained |
| p01 | Vitest controlled resolver/transaction adapters and actual workbench browser tests | FUTURE: no runtime resolver integration implemented |
| shell | shared controls/overlay/commands interactions and Electron matrix | FUTURE migration scope |
| tree-tabs | Navigator interactions and tab/dirty/group behavior | related existing tests do not count as migrated guide coverage |
| forms | Inspector/picker interactions, multi-selection/filter/reverse projection | FUTURE; current picker does not establish multi-LoV behavior |
| draw | existing bundle-flows BDD and approved presentation/state-preservation integration | related historical tests retained; migrated guide scope not implemented |
| ai-future | separately approved AI presentation/behavior adapter | FUTURE; no AI/provider implementation claimed |

PRE-01's two executed foundation outlines cover OS Light/Dark × absent/System/Light/Dark/HC × forced-colors on/off. Each example binds to actual media and all-role root/child assertions in apps/desktop/tests/e2e/ui-contract-token-cascade.spec.ts. Source-CSS RED and generated-CSS GREEN are immutable earlier evidence, not rerun/rewritten by this planning repair.

Current checks reject missing/unknown/duplicate IDs/bindings, missing assertions, changed assertion-source hashes, incomplete/duplicate examples and skipped/focused tests. Future cases never count as executed coverage. The supplied feature's restoration, state/AI draft, focus, dirty failure, group movement, LoV/reverse usage, detach, standalone, route selection, IME/streaming, feedback, narrow layout and reduced-motion intentions remain in their owning stages.

## Accepted EOL delta — implemented after focused PRE

Focused PRE-EOL-20260930T120821Z passed. FUI-026/027/028 now bind the following cases to real checkout assertions; the new targeted/CI/full logs record actual execution. Existing 22 foundation bindings and 23 future cases remain intact:

```gherkin
@foundation @eol-repair
Scenario: Accepted LF attributes survive fresh Windows-style checkout
  Given all eight canonical artifacts and the exact accepted attributes in a verified OS-temp Git repository
  And that temporary repository uses core.autocrlf true
  When the staged fixture files are freshly checked out
  Then all eight raw SHA256 hashes and LF bytes match the original canonical artifacts
  And the unchanged token CLI exits zero with 102 named pairs
  And the verified temporary repository is removed

@foundation @eol-repair
Scenario: Missing attributes demonstrate physical byte drift
  Given the same canonical artifacts in an isolated Git repository without attributes
  And core.autocrlf true is set only in that repository
  When the staged fixture files are freshly checked out
  Then physical CRLF drift is observed and the unchanged token CLI exits one
  And production source input and historical evidence hashes remain unchanged

@foundation @eol-repair
Scenario: LF rule scope cannot silently broaden
  Given the exact eight accepted logical attribute entries
  When a required entry is removed or an extra wildcard or CRLF-target entry is added
  Then checkout compliance fails without normalizing protected artifacts or accepting new scope
```

TDD: add absent-configuration regression first, retain meaningful RED, then only the approved root attributes/control implementation; run targeted GREEN and full required regression. Normalize LF/CRLF only while parsing root configuration, never the eight protected artifacts. Missing Git, failed cleanup or unavailable execution is FAIL/BLOCKED rather than skip.


FOUNDATION-ARCHIVE-01 reproduction remains immutable. Focused PRE-ARCHIVE-20260930T134029Z approved its accepted exact scope. Five actual lifecycle regressions were RED before reader changes; targeted GREEN and post-repair UI compliance now pass. Independent POST and actual archive/post-archive verification remain separate unfinished checkpoints.


## Accepted archive lifecycle delta — implemented after focused PRE

Both runtime readers use the sole durable docs/ui/bdd/ui-contracts.feature path; adapted bdd/ui-contracts.feature remains the identical active SDD artifact. All previous 48 cases / 25 foundation bindings / 23 future boundaries and assertion-source hashes are preserved. FUI-029/030/031 now bind real assertions in tests/ui-contract/archive.test.mjs to UI-ARCHIVE:archived-change, UI-ARCHIVE:no-change-artifacts and UI-ARCHIVE:canonical-no-fallback. Additional tests catch accidental production resource reads and preserve execution/cleanup errors. The original planning scenario text below remains intent; the coherent executable feature contains the implemented cases.

```gherkin
@FUI-029 @foundation @archive-repair
Scenario: Completed change is archived without breaking compliance
  Given canonical BDD registry and assertion sources in a verified OS-temp fixture
  And an active foundation change artifact in that fixture
  When only the fixture change is moved into its archive directory
  Then actual traceability CLI and ordinary compliance controls pass against the canonical contract
  And the verified fixture is removed and source history remains unchanged

@FUI-030 @foundation @archive-repair
Scenario: Runtime compliance needs no active or archive artifacts
  Given canonical BDD registry and assertion sources in a verified OS-temp fixture
  And no active or archived foundation change artifact
  When actual traceability CLI and ordinary controls run against that fixture
  Then they pass without consulting OpenSpec lifecycle state

@FUI-031 @foundation @archive-repair
Scenario: Missing or malformed canonical BDD cannot fall back
  Given a valid historical foundation BDD artifact in a verified OS-temp fixture
  When the canonical BDD is missing or malformed
  Then actual compliance fails for each condition without reading that historical copy
  And errors and cleanup failures cannot become successful or skipped coverage
```

TDD: convert the preserved reproduction into actual failing lifecycle assertions before changing readers; then add canonical copies/readers/bindings. Missing and malformed conditions both need real assertions. Fixture-base negatives must catch accidental reads from production. The new lifecycle GREEN executes actual CLI and controls against archived/no-artifact fixtures, with all seven required exits; missing and malformed canonical BDD both fail despite valid historical copies. Full post-repair and post-archive commands retain new logs; original EOL results remain immutable.
