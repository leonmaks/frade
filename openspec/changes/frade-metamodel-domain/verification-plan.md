# Verification plan — not implementation evidence

This document records the pre-implementation verification plan. Implementation and executed evidence are now recorded in `docs/verification/metamodel-domain.md`; the scenarios below are bound to package tests.

## Traceability

| Requirement                            | Planned Gherkin tag | Additional unit/property evidence                                                    |
| -------------------------------------- | ------------------- | ------------------------------------------------------------------------------------ |
| Versioned configurable definitions     | MD-001              | Envelope/ID/version/duplicate matrices; two company fixtures; dependency boundary    |
| Declarative metadata contracts         | MD-002              | Valid/invalid lifecycle, profile and viewpoint declarations                          |
| Safe single inheritance                | MD-003              | Transitivity; equal redeclaration; unknown parent; cycles; abstract instances        |
| Deterministic non-mutating validation  | MD-004              | Frozen inputs; reordered collections; depth/value budgets; cycle/prototype rejection |
| Complete typed attribute vocabulary    | MA-001              | Eleven discriminants; date/calendar/timezone edge cases; nested paths                |
| Required nullable defaults and bounds  | MA-002              | Truth table; invalid defaults; bounds; absent parent; copy isolation                 |
| Reference target validation            | MA-003              | Qualified identity; unresolved target; exact/subtype matching                        |
| Inheritance-aware endpoint eligibility | MR-001              | Type direction/subtype matrices and reversal property                                |
| Snapshot-based relation integrity      | MR-002              | Dangling endpoints; typed attributes; duplicate IDs/pairs; min/max; update-once      |
| Explicit complete-state contract       | MR-003              | Symmetric undirected bounds; self-loop counting; complete-state API documentation    |

The three files under bdd/ are planning inputs. During implementation, port them to package features and bind every step to actual domain operations/assertions. Execute all Scenario Outline rows. Syntax validation alone, a tag registry or a mapping to test filenames is not behavioral evidence.

## TDD and acceptance

For each implementation task record a focused failing test first, then its passing result. Use deterministic seeded property tests and save any counterexample needed for reproducibility. Final evidence must include package unit/BDD/property results, consumer typecheck, root boundary tests, frozen lockfile installation, pnpm check:all, unchanged Draw PNG hashes and strict OpenSpec validation.

No Electron IPC or UI feature is added here; existing desktop E2E is a regression gate, not proof of metamodel integration into the desktop. No YAML/import loading, profile compilation, fingerprinting, repository freshness/concurrency or migration result is claimed.
