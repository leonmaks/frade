The cumulative candidate has **one reproduced correctness blocker**: a requirement can be counted as accepted while one of its declared scenarios has failed evidence.

Reviewed checkpoint: `42cb1cbe4a81ef6a775b03cd7712183055540fda`; implementation: `a71a7bedc41beac16ce1c374509281b4e9feca79`; baseline: `98f387f96b51b0ad139e3507c376ff1c3e8dec09`. Frozen candidate digest: `5919f2b9e95a3271cfd2dbebce9de123dfaa635741b8adf68b2e05b01ac1ec88`.

The approved/requested W01 independent-POST assignment is **gpt-6-astra/xhigh**, established from the accepted design and D03. Actual backend and effort remain **NOT_CONFIRMED**.

**Blocking finding — P2 / Medium: incomplete requirement-to-scenario reciprocity permits false acceptance.**

[contracts.mjs:378](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-05T11-53-43-075Z-e49f42e2-8085-4eb7-bb2a-06b1bafe4589/prepared/packet/scripts/directions/contracts.mjs:378) checks that each scenario names an existing requirement, but does not require that requirement’s `scenarioIds` include the scenario.

[status.mjs:168](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-05T11-53-43-075Z-e49f42e2-8085-4eb7-bb2a-06b1bafe4589/prepared/packet/scripts/directions/status.mjs:168) then calculates acceptance from that incomplete outgoing list. Its additional check covers omitted human/future scenarios, but not omitted executable scenarios.

I reproduced this through the current APIs using an independently pinned, in-memory evidence boundary:

- Requirement `REQ-001` lists passing scenario `S1`.
- Both `S1` and failing scenario `S2` declare `requirementId: REQ-001`.
- Both scenarios have valid reciprocal task links and assertion/run records.
- `S1` has trusted current PASS evidence; `S2` has a current FAIL record.

| Requirement’s outgoing links | Structural validation | Accepted requirements | Proven scenarios |
|---|---|---:|---:|
| `S1` only | Valid, no issues | **1/1** | 1/2 |
| `S1, S2` | Valid, no issues | **0/1** | 1/2 |

Only the outgoing link changed; evidence was unchanged. Both projections report `RUN_NOT_VERIFIED` for the failed run and keep archive readiness false. This is a **false acceptance metric**, not a demonstrated archive bypass.

It violates FWE-014’s truthful evidence-derived metrics and design §5’s rule that missing evidence cannot increase acceptance. The incomplete relationship validation also undermines FWE-004’s traceability contract.

Required correction: enforce reciprocal requirement/scenario membership and prevent omitted executable scenarios from disappearing from requirement acceptance. Add regression-first coverage for omitted failing or unverified scenarios, alongside a fully reciprocal trusted positive control. Preserve human/future pending behavior, existing assertions and raw failures. This review performs no repair and grants no new scope.

**Completeness and independent assessment.**

I inspected root/nested AGENTS, proposal, accepted design, all three specs, tasks, current implementation/test/documents and fixtures, cumulative changes, required-check records, historical failures, RED/RCA/D04, both admitted Verify generations, and the unadmitted POST observation/recovery.

All **18 requirements and 46 scenarios** were reconciled with current code, meaningful assertion bodies, bound native execution titles, or approved boundaries. The 70 assertion references were checked against current file hashes and run-title occurrences.

| Requirement / scenarios | Principal evidence | Assessment |
|---|---|---|
| FWE-001 S01–S04 | Ownership, loader, bootstrap and closure tests; native owner replay | Supported within closure limits |
| FWE-002 S01–S02 | Intake/bootstrap and unresolved-acceptance controls | Supported; research decisions remain bounded |
| FWE-003 S01–S02 | Real temporary-Git creation, recovery and collision controls | Supported |
| FWE-004 S01–S02 | Trace, new task-link regressions and independent budget controls | Existing controls supported; relationship defect above |
| FWE-005 S01–S03 | Lifecycle proof, ordering and focused-review controls | Supported |
| FWE-006 S01–S02 | Classified RCA and historical-failure preservation | Supported |
| FWE-007 S01–S02 | Applicability rejection and unchanged-tree evidence | Supported |
| FWE-008 S01–S03 | Approved adoption/integration boundaries; legacy closure control | S01/S02 future; S03 supported |
| FWE-009 S01–S03 | Exact-role, override, approval and source-drift tests | Supported |
| FWE-010 S01–S03 | Review preparation, confinement, secret/path controls | Supported within recorded limits |
| FWE-011 S01–S03 | Stream, freeze, retention and termination controls | Supported |
| FWE-012 S01–S02 | Unattested provenance and unavailable-writer controls | Supported |
| FWE-013 S01–S02 | Status structure, origin and history controls | Supported |
| FWE-014 S01–S03 | Status proof/count controls and fresh reproduction | **Requirement acceptance invariant fails** |
| FWE-015 S01–S02 | Freeze races, staleness and historical-owner refresh | Supported |
| FWE-016 S01–S03 | Checkpoint admission, blocker evidence and D04 regressions | Supported |
| FWE-017 S01–S03 | Exact destination, divergence and remote-SHA controls | Supported |
| FWE-018 S01–S02 | Guide, supported flows and human-decision boundaries | Supported within CLI/library limits |

Positive bootstrap fixtures exercise library entry points; their titles do not establish every documented CLI command. Installed review preflight is not a completed live POST. These limits were retained when assessing the evidence.

**Integrity, execution evidence and limits.**

Fresh packet checks established:

- **195/195** artifact sizes and hashes match; 71 candidate source bindings were checked.
- The decoded cumulative diff is lossless UTF-8: **747,457 bytes**, SHA256 `fb07b426a63bef1d6d0a27a89cfdcfe0c82df3a6a78db87b216c08b1cb3cde12`. All **74** final Git blob bindings match packet files.
- All **29 required-check artifacts** match their hashes. Each has a successful recorded process result. Their 56 present source bindings match; the other two are the explicitly excluded historical task27 Linux logs.
- All **23 prior JavaScript test/helper files are byte-identical** to their earlier native source bindings, preserving their entire ASTs. The recorded **180 top-level test calls** are not an executed unique-test count.
- Current dashboard rendering and source digest reproduce exactly at checkpoint42cb, retaining history and reporting `TRACE_SHAPE`, `TASK_ACCEPTANCE_GAP`, **15/18 administrative tasks**, **0/18 accepted requirements**, and false archive readiness.

Supplied native Windows Node24.18.0 evidence—not rerun here—shows meaningful **RED: seven failures and one positive pass**, followed by **208/208 GREEN, 191 unique titles, zero skipped**, targeted **8/8**, and historical-owner replay **1/1**. The eight regressions meaningfully cover missing/empty/omitted task mappings, outgoing task reciprocity, trusted positive proof, and pending human/future boundaries. They do not cover the newly reproduced requirement-link defect.

The 29 records cover 21 implementation checks and eight Verify-administration checks. Scoped lint/format, strict active/all validation, content/integrity, applicability, loader, installed controls, status and reception were audited. Boundary evidence records 19 tests and four commands. General lint/typecheck/build each report **20/20 cached Turbo results**. Canary evidence establishes confinement only.

I actually ran the packet’s contract tests (**14/14**) and new regression tests (**8/8**) on Linux Node18.19.1, plus read-only integrity, projection and defect probes. Native suites, original-owner operations and external retained streams were assessed from supplied records, not independently rerun. Windows passing titles do not prove execution of platform-conditional POSIX bodies. Product `check:all`, remote CI and branch protection retain their unrun/unconfigured states.

**Earlier findings, architecture and coherence.**

V01–V04 remain resolved on independent reassessment: exact CI scope admission; genuine design/D03 role provenance; numeric seeded tasks with actual projections; and distinct journal-backed/historical origin handling with partial-journal and freeze rejection. D04 preserves the historical source and three historical assertions, with a separate authenticated-current regression.

The prior FWE-014 completed-task observation is substantively repaired. Its POST report remains **UNADMITTED** because the heredoc failure triggered `REVIEW_EVENTS`. Recovery records bind retained raw output, unchanged source/index/full candidate, exact-run termination and freeze release before repair. The first ignored-log preparation failure dispatched no reviewer. Corrected path selection excludes those logs without altering them. Whitespace-failing raw evidence remains represented by its exact origin pointer; the current diff encoding is lossless. External origin bytes were not accessed.

W03 is a **permissible pending acceptance limitation for this phase**: FWE-004 and design §§3/5 require actual evidence or approved boundaries, which the separate audited mappings supply; they do not require rewriting immutable planning declarations into an executable ledger before POST. This does not certify automatic ledger ingestion, accepted metrics or closure, and does not excuse the new false-acceptance defect.

The architecture retains separate request, authority and evidence boundaries; release verification precedes loading; reception and freeze release require complete retained evidence and termination checks. Root17, frozen product/foreign scope and shared v1.1 remain preserved within the supplied integrity evidence. The latest repair changes contracts/status and adds regressions; bootstrap, review guards and shared policy remain unchanged.

**Required disposition and closure conditions.**

Retain this report and reproduction through strict reception; task4.2 remains incomplete. The admitted Verify at a71 remains historical evidence of that phase, but this independently reproduced defect prevents progression. An authorized regression-first correction requires current applicable checks, fresh formal Verify and fresh cumulative POST.

Tasks4.3 and4.4 remain later barriers, not prerequisites to performing POST. Closure must stay inactive until its gates pass. Any later closure must sync only:

- `openspec/specs/engineering-direction-lifecycle/spec.md`
- `openspec/specs/engineering-role-dispatch/spec.md`
- `openspec/specs/engineering-progress-publication/spec.md`

It must archive only dated W01, relocate owned references/current authority bindings, preserve immutable receipt bytes and original hashes through explicit origin mappings, and revalidate changed hashes, links, scope and publication evidence. Disposable closure tests do not certify the actual W01 archive.

No writes, repairs, task completion, adoption, archive or merge occurred. Writer dispatch remains `NOT_IMPLEMENTED`; foreign adoption remains `NOT_STARTED`. All tool calls in this review completed successfully; the receiver must still validate the completed terminal stream and frozen-candidate integrity.

GATE_STATUS: FAIL