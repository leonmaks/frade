# FOUNDATION-ARCHIVE-01 — proposed planning repair

Status: PROPOSED_NOT_ACCEPTED. No production repair has been applied. This proposal is separate from the completed exact EOL delta; PRE-EOL-20260930T120821Z does not approve it.

Observed defect: scripts/ui/traceability.mjs reads openspec/changes/frade-ui-design-contract/bdd/ui-contracts.feature, and scripts/ui/controls.mjs copies the same active path. A verified OS-temp fixture passed before archive (CLI exit 0, 25 foundation / 23 future), then failed after moving the fixture change into archive (CLI exit 1, ENOENT). Source/history remained unchanged; cleanup succeeded. Evidence: openspec/changes/frade-ui-design-contract/evidence/foundation-archive-path-reproduction-2026-09-30.json. Classification: INTEGRATION. Supplier/owner is UI foundation; routing has no task or gate here.

## Exact proposed implementation scope

| Path | Proposed change |
| --- | --- |
| docs/ui/bdd/ui-contracts.feature | Durable executable BDD contract copied from the current adapted feature; retains every existing case and explicit future boundary; approved archive regression cases added only after PRE/TDD |
| scripts/ui/traceability.mjs | Read the single durable canonical BDD path; missing/invalid canonical feature must fail. No searching active/archive directories or fallback to stale policy |
| scripts/ui/controls.mjs | Copy that same durable contract into existing verified temp controls; retain all existing positive/negative outcomes and cleanup protections |
| tests/ui-contract/archive.test.mjs | Meaningful RED before changing the production readers; actual traceability CLI and controls succeed after isolated change archival/removal; missing canonical BDD remains FAIL |
| docs/ui/decisions/ui-contract-traceability.json | Preserve current 25 foundation / 23 future entries and all existing assertion-source hashes; bind only actually added archive assertions with new stable IDs |
| openspec/changes/frade-ui-design-contract/bdd/ui-contracts.feature | Keep the active SDD artifact coherent with the durable copy and approved additional archive cases while the change remains active; the original input is immutable |
| docs/ui/decisions/branch-protection.md | Durable copy of existing owner instructions; no remote policy modification or protection claim |
| docs/ui/adoption.md | Point runtime BDD and owner-instruction links to durable docs paths; record provenance and actual adoption status |

Planning/evidence edits stay in the existing foundation change and docs/ui/decisions. No root path addition; package scripts/CI need no change because existing glob/compliance commands execute the new tests. Eight .gitattributes entries, all eight raw artifact anchors, guide 1.0/tokens 1.0.0/adoption revision 1, selector exception, generator/token oracle, feature/domain/routing/vendor/input/brand sources and old evidence are frozen. There is no ninth LF rule. Do not copy routing changes.

## Proposed coherent artifact delta, after acceptance

- proposal.md: add durable lifecycle ownership to the existing compliance/archive requirement, preserving foundation and EOL decisions.
- design.md: declare docs/ui/bdd/ui-contracts.feature the single runtime contract. Keep the change's adapted feature as its SDD artifact and record the exact logical content/provenance transferred; archival relocates evidence, not runtime policy. Preserve logical LF hashes for BDD/assertion sources separately from the eight immutable raw-byte artifacts.
- specs/ui-token-compliance/spec.md: add the lifecycle requirement and scenarios below; no weakening of existing requirements.
- tasks.md: insert 3.8 (accepted planning repair + focused independent PRE) and 3.9 (archive RED → durable readers/copies/bindings → targeted checks); reopen 4.3 for fresh post-repair full checks. Counts become 16/21 from 17/19, with historical records preserved.
- bdd/traceability-plan.md: archive scenarios remain planning text until PRE and real assertion bodies exist. Do not put unimplemented foundation cases into current bindings or disguise them as future.
- execution-context.json: retain the EOL PASS separately; archive blocker closes only after real regression checks. No self-issued POST PASS.

Proposed requirement text:

### Requirement: UI compliance survives specification archival

UI compliance SHALL read a stable canonical BDD contract independent of the active OpenSpec change directory. Archiving or removing the completed change artifact SHALL preserve successful binding/control execution. Missing or malformed canonical BDD MUST fail rather than fall back to an active/archive copy. Existing foundation assertions, explicit future boundaries, token/literal negatives and immutable historical evidence MUST remain strict. Owner instruction links SHALL point to durable documentation.

#### Scenario: Completed change is archived

- WHEN an isolated fixture moves the active change into archive
- THEN actual traceability CLI and compliance controls still pass against the unchanged canonical BDD contract

#### Scenario: Active and archive artifacts are absent

- WHEN an isolated fixture contains canonical docs/registry/assertion sources but no active or archived change
- THEN actual runtime checks still pass without consulting OpenSpec lifecycle state

#### Scenario: Canonical contract is missing or malformed

- WHEN canonical BDD is missing or malformed while a historical change copy still exists
- THEN compliance fails without fallback, suppressed errors, skipped tests or a rewritten baseline

## Sequence and review constraints

Acceptance of this exact planning delta → coherent artifacts + strict validation + fresh manifest → focused independent PRE (recommended gpt-6-astra, xhigh; actual backend/effort must be recorded truthfully) → actual failing lifecycle assertions → production readers/copies → targeted/negative/full checks → OpenSpec verification → independent POST → archive and post-archive compliance verification → STOP. Do not advance P01.

The existing EOL full suite exit 0 is preserved as historical implementation evidence. It does not prove post-archive durability and does not waive this blocker. Remote CI remains LOCAL_ONLY/unobserved; branch protection NOT_CONFIGURED/unverified.
