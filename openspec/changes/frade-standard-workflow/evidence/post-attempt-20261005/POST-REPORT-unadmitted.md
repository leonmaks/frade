The cumulative W01 candidate has one reproduced correctness blocker: completed tasks can disappear from acceptance validation when their trace mappings are missing or empty.

Reviewed scope: published checkpoint `661f872226425fac84606e201ac7677d7b0e504d`, original baseline `98f387f96b51b0ad139e3507c376ff1c3e8dec09`, implementation matching `1086b867abc4d28085b851353e6ced356d7abc50`, and frozen candidate digest `47b45a44df0ce544be123131177dd6c13198c10f0dcf4b5df537d91776ff4741`. Approved POST assignment is **gpt-6-astra/xhigh**, established from the unchanged design and D03—not request metadata. Actual backend and effort remain **NOT_CONFIRMED**.

**Blocking finding — P2 / Medium: missing completed-task mappings suppress the required inconsistency.**

At [status.mjs:215](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-05T10-29-19-856Z-27bb43a7-b1b4-477a-93b2-20b9ab089d1c/prepared/packet/scripts/directions/status.mjs:215), lines 215–224 emit `TASK_ACCEPTANCE_GAP` only when a matching trace task already contains an unproven scenario. A missing task record, `scenarioIds: []`, or omitted `scenarioIds` escapes this check. `validateTraceability` in `scripts/directions/contracts.mjs:344` also accepts these cases because it does not independently validate every task’s outgoing links.

I reproduced all three cases through the current `projectStatus` API using the installed POST-stage manifest and a nonempty synthetic trace with independently verified in-memory evidence for another task:

| Completed task’s mapping | Trace validation | Dashboard issues | Next action |
|---|---|---|---|
| Missing | Valid | None | Continue current stage |
| Empty scenario list | Valid | None | Continue current stage |
| Omitted scenario list | Valid | None | Continue current stage |
| Explicit unproven scenario, comparison control | Valid | `TASK_ACCEPTANCE_GAP` | Resolve blockers |

The first three cases report two completed tasks without identifying the second task’s missing evidence. Archive readiness remains false; this is **not** a reproduced archive bypass.

The responsible invariant is **FWE-014-S01**, which requires both reporting the inconsistency and keeping readiness false. Design §§3/5/8 and FWE-004’s traceability principle reinforce it. Existing coverage at `tests/directions/status.test.mjs:140` checks administrative counts, acceptance and readiness, but does not assert this missing-mapping behavior.

Required correction: validate every completed checklist task against a meaningful trace mapping, report missing/empty mappings, and validate task-to-scenario references. Preserve legitimate pending human/future boundaries without converting them into acceptance. Add meaningful negative regressions for these three cases and a valid mapped positive control under the existing authorized workflow.

**Completeness and scenario review.**

I reviewed root/nested AGENTS, proposal, design, all three specs, tasks, feedback register, cumulative diff, current scripts/tests/docs, required-check records, preserved RED/intermediate failures/RCA/D04, and both formal Verify reports and receipts.

All **18 requirements and 46 scenario mappings** were examined against assertion bodies and bound run titles. The following summarizes coverage; test references are beneath `tests/directions/`. “Supported” describes current control evidence, not accepted requirements or completed deployment.

| Requirement / scenarios | Principal assertion evidence | Disposition |
|---|---|---|
| FWE-001 S01–S04 | `root-loader:329`, `bootstrap:206,299`, `lifecycle:329,420`, `repair:200`; native owner replay | Supported |
| FWE-002 S01–S02 | `bootstrap:206`, `contracts:217` | Supported; research decisions remain explicit |
| FWE-003 S01–S02 | `bootstrap:277,299,619` | Supported |
| FWE-004 S01–S02 | `contracts:147,156`, `budget-boundary:189,208,230,274` | Existing controls supported; task-mapping gap identified above |
| FWE-005 S01–S03 | `lifecycle:50,78,169,214` | Supported |
| FWE-006 S01–S02 | `repair:142`, `contracts:156`, `publication:609` | Supported |
| FWE-007 S01–S02 | `contracts:227,254`, `check-applicability:53` | Supported |
| FWE-008 S01–S03 | Approved owner/integration boundaries; `lifecycle:233` | S01/S02 future; S03 supported |
| FWE-009 S01–S03 | `roles:86,129,145`, `task41-installed-red:59` | Supported |
| FWE-010 S01–S03 | `review:420,564`, installed preflight and canary receipts | Supported within recorded limits |
| FWE-011 S01–S03 | `review:497,513,526,538`, `review-terminal:395` | Supported |
| FWE-012 S01–S02 | `roles:322`, `w01-origin-admission:122` | Supported; writer remains `NOT_IMPLEMENTED` |
| FWE-013 S01–S02 | `status:118,140,380,462,588,599` | Supported |
| FWE-014 S01–S03 | `status:140,249`, fresh reproduction above | **S01 blocked**; S02/S03 supported |
| FWE-015 S01–S02 | `status:380,497,599,618`; native owner replay | Supported |
| FWE-016 S01–S03 | `publication:378,492,595,609,769,782` | Supported |
| FWE-017 S01–S03 | `publication:378,407,468,530,578` | Supported |
| FWE-018 S01–S02 | `w01-origin-admission:149`, `bootstrap:619`, installed-role/owner controls, `contracts:196`, `roles:114` | Supported within documented CLI/library and human boundaries |

Thus, **43 scenario mappings retain supporting current-control evidence, two retain approved future boundaries, and one has a reproduced current defect**.

**Commands, evidence integrity and limitations.**

Fresh read-only work included:

- Raw size/hash verification of all **148 packet artifacts**, all **28 required-check artifacts**, and the cumulative diff.
- Verification of all 70 present candidate source bindings and all 55 present bindings in each native record. The only absent bindings are the two explicitly excluded historical task27 Linux logs.
- Comparison of cumulative diff content with current files, including all 15 binary-patch fixture/module Git blob hashes.
- Direct `node tests/directions/contracts.test.mjs`: **14 passing tests** on Linux Node 18.19.1.
- Pure API probes reproducing the blocker, resolving all five installed roles through raw design/D03 authority, and exactly reconstructing the installed status projection.

Audited native evidence—not rerun here—records **200 passing executions / 183 unique titles**, plus the separate **1/1 native historical-owner replay**, on Windows Node 24.18.0. The 17 repeated executions arise from imported bootstrap tests. Windows results do not establish execution of platform-conditional POSIX bodies.

The 28 records include scoped lint/format, strict validation, boundary controls, applicability, loader, integrity/content, discovery/canary, status and reception checks. General lint, typecheck and build each report **20/20 cached Turbo results**. Product `check:all`, remote CI and branch protection retain their declared unrun/unconfigured states; no product success is inferred. Recorded frozen-tree applicability supports their bounded treatment.

The accepted Verify receipt binds **183 immutable inputs**, complete stream/final reports and identical raw before/after index hashes, with `GIT_OPTIONAL_LOCKS=0`. Both delivered report hashes match. I audited those receipts and the native reception audit; I did not access retained external streams/index files outside this packet. The first same-source, unadmitted Verify result remains historical because of the reproduced optional-lock index refresh. The task4.1 publication record verifies remote SHA `661f8722…`.

The preparation failure remains an **ENVIRONMENT admission correction**: no reviewer invocation or verdict preceded recovery, the two irrelevant ignored logs remain untouched, and current checks/source/assertions were retained. It supplies no gate approval.

**Architecture, coherence and earlier findings.**

The reviewed architecture maintains separate trusted authority, execution evidence and owner requests. Release verification precedes loading; reception checks complete streams, final-report agreement, raw retention, exact-run termination and candidate/raw-index freeze. Permission canaries establish confinement, not reviewer correctness. Current review reception must still validate this report after completion.

Root/nested rule inheritance, ordinary journal-backed origin, the narrowly pinned historical W01 exception, partial-journal rejection, freeze races, preserved history, seeded task projection and publication guards remain coherent with the approved design.

- **V01 resolved:** exact CI scope admitted; widened/foreign scope rejected.
- **V02 resolved:** raw design/D03 revision and decision authority required for all five assignments.
- **V03 resolved:** numeric seeded tasks and initial/refreshed counts verified.
- **V04 resolved:** journal-backed and historical origins remain distinct; partial journals and frozen writes block.
- **D04 preserved:** historical source and all three historical assertions remain pinned; authenticated-current regression is separate.
- **W03 remains a pending acceptance limit:** installed trace is `PLANNING_DECLARATIONS_NOT_EXECUTION`; current projection honestly shows `TRACE_SHAPE`, tasks **15/18**, requirements **0/18 accepted**, scenarios **0/46 executed**, and no accepted check metrics. That alone does not require archive before POST. However, the new FWE-014 defect invalidates the broader claim that missing task evidence is always reported.

The feedback register preserves human decisions separately from recommendations. Scoped attributes/ignore controls retain raw evidence and CRLF origins; binary diff suppression does not waive inspection. No frozen Routing/UI/Repository Core/product/lockfile/vendor change or owner adoption is supported by the reviewed delta.

**Required next actions and closure conditions.**

Receive and preserve this failure through the strict transport, retain the reproduction, and keep task4.2 incomplete. The owning workflow must address the blocker, preserve existing assertions and historical failures, then obtain applicable source-bound checks, fresh formal Verify and fresh cumulative POST. This report grants no repair scope or model change.

Tasks4.3 and4.4 remain future barriers. Any later authorized sync/archive must stay within the three declared spec destinations and dated W01-only archive, preserve immutable raw bytes—including CRLF—retain explicit original-to-relocated reference mapping, and revalidate hashes, links, scope, controls and publication bindings. No later merge tree, foreign deployment, migration or main merge is certified.

GATE_STATUS: FAIL