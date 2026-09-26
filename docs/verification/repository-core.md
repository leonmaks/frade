# Frade Repo Core — implementation report

2026-09-24. The requested change rename is complete. The active `frade-repo-core` OpenSpec change is not archived. **The entire master prompt is not complete.**

## Implemented and checked

Eight production packages provide canonical objects/relations, stable qualified identity, safe JSON decoding, reused configurable metamodel validation, profiles/sessions, bounded queries/traversal, validated CRUD with revisions/idempotency, post-commit events, preservation-aware native YAML/JSON, derived SQLite, optional Git, independent diagram bindings and authorized HTTP/Electron integration. No mandatory cloud service, invented corporate schema or direct renderer filesystem API was introduced.

The continuation adds the original 112-case awaited BDD harness, independent memory-adapter conformance, capability-shaped factories, bounded history, declarative policy rules, real external-change degradation/recovery, explicit native recovery with actual process termination tests, revision-consistent graph traversal and a disposable diagram binding controller. Broader requirements still have partial executable coverage, not blanket certification from a CORE tag.

The user approved native v2 on 2026-09-24. It is implemented as opt-in immutable JSONL pages, a manifest publication boundary, a private SQLite catalog, complete streaming validation and guarded delta commands. Native v1 remains compatible. New tests cover process interruption, cross-page references, native v2 Electron commands, query/validation properties, model/result isolation and stale cursors. Optional query/snapshot ports, cancellation/event hardening, HTTP deadline cleanup and index rebuild races have focused fixes and tests. Formal [tasks](../../openspec/changes/frade-repo-core/tasks.md) now record 26/37 complete; remaining checks are not automatically closed by implementation existence.

## Historical pre-v2 verification

- `pnpm check:all`: PASS — lint, strict types, unit/contract/BDD, boundaries, build, 214 browser and 2 Electron E2E.
- Repository package tests: 243 passing, including 15 shared memory/YAML/JSON contracts. BDD: 27 scenarios linked to 25 tests and all 20 CORE IDs, plus 112 executable cases linked to all 13 RE/RP/RC IDs and a negative runner test. Seven seeded properties execute 200 cases each.
- Frozen offline installation, final formatting, strict OpenSpec and portable API example typecheck: PASS.
- Ten approved visual baseline hashes unchanged. No commit, push, real user repository mutation or archive.
- Small benchmark measured; Medium/Large open rejected with RESOURCE_LIMIT. Performance acceptance incomplete.

[Actual test results](../../openspec/changes/frade-repo-core/evidence/test-results.md), [gates](../../openspec/changes/frade-repo-core/evidence/acceptance.md), [contract results](../../openspec/changes/frade-repo-core/evidence/contract-test-results.md), [integration](../../openspec/changes/frade-repo-core/evidence/integration-results.md), [traceability](../../openspec/changes/frade-repo-core/evidence/requirements-traceability.md), [benchmark](../../openspec/changes/frade-repo-core/evidence/benchmark-results.md).

## Native v2 verification checkpoint

The earlier v2 `check:all` passed 278 repository tests, 214 browser and 2 Electron tests. Later safety changes exposed a generic type error in a new property test and overly strict event validation incompatible with native v1's state-bearing CRUD events. Both are corrected; 49 affected acceptance/contract/hostile tests passed. The final whole-workspace `check:all` then exited 0, including all package tests/builds/boundaries, 214 browser tests and 3 Electron tests. Final formatting and frozen offline installation also pass. Failed intermediate runs remain recorded in v2 evidence.

Strict OpenSpec, frozen offline installation and traceability pass. Traceability now includes 33 native v2 scenarios / 6 V2 requirements. All three native v2 performance datasets completed in both runs; optimized Large open/index/validation took 469.51 s, update/index 94.67 ms, sampled peak RSS 328,503,296 bytes. [V2 evidence](../../openspec/changes/frade-repo-core/evidence/native-v2-progress.md) and [measurements/budgets](../../openspec/changes/frade-repo-core/evidence/benchmark-v2-analysis.md) identify measured source hashes and limitations. Native v1's historical Medium/Large failures are not erased.

## Files and guides

New package roots: `packages/repository-domain`, `repository-ports`, `repository-application`, `adapter-yaml`, `local-index`, `versioning-git`, `repository-api`, `repository-bridge`. Existing changes: Desktop main/preload/tests, Draw public document subpath manifest, root scripts/lockfile, architecture/traceability checks and renamed OpenSpec references. [File inventory](../../openspec/changes/frade-repo-core/evidence/changed-files.txt) lists concrete task files; the initial Git tree was wholly untracked, so this is not a tracked git diff.

[API](../repository-core/README.md), [adapters](../repository-core/adapters.md), [metamodels](../repository-core/metamodels.md), [diagrams](../repository-core/diagrams.md), [security/deployment](../repository-core/security.md), [normative requirements](../architecture/repo-core-requirements.md), [ADRs](../adr/repo-core.md).

## Remaining work and external decisions

The scale expansion was approved and implemented without replacing native v1 or weakening entity decoding. Unfinished: configuration migration preview/apply, full history/event/lifecycle acceptance, policy combinations, broader detached-diagram/fuzz tests, P2 search restrictions and final gate/evidence sign-off. Cold opening Large is still slow; calibrated local regression budgets are not deployment SLAs. No Designer shell exists to integrate a new Navigator/Inspector UI. PostgreSQL/remote/search remain restricted contracts; federation is an in-process read registry.

External schemas/stable keys, deployment auth policy, PostgreSQL/migration infrastructure, target performance budgets and operator recovery policy still require repository-specific decisions. [Known limitations](../../openspec/changes/frade-repo-core/evidence/known-limitations.md) lists concrete follow-ups. `openspec-verify-change` found critical completion gaps: archive is prohibited and no unfinished stage is marked fully accepted.
