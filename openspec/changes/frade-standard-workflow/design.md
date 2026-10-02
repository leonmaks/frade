# Design: uniform Frade direction workflow

## Context

Owner: codex/frade-standard-workflow, E:/dev/codex/frade-worktrees/frade-standard-workflow.
Original/cumulative baseline: 98f387f96b51b0ad139e3507c376ff1c3e8dec09.
Git common: E:/dev/codex/frade/.git. Shared release v1.1 a3ac63b52187e1f45f08b6d0beffcd67425c491d8ae1ac5d0d0efd3832e73fd0.
Policy raw SHA256: 6c6cf78fccfc4dac9e53c859715850db127f897e7eb79aa94957134bd1c1ffeb.
Read evidence/repository-audit.json and evidence/user-decisions.json. User instructions override local skill assumptions; this package is planning only until coherent plan approval and independent PRE. The numbered W01 checkpoint never starts a later change autonomously.

Observed: one pnpm/Turbo monorepo, 20 package manifests at the committed baseline, 9 active changes there, additional UI/Routing process files only in their owning dirty worktrees. Common CLI exposes status/probe/run/publish, not direction bootstrap or writer execution. Baseline root AGENTS lacks later shared policy; exact user-provided instructions and shared public policy are adopted as process evidence, without foreign product source.

## Goals / Non-Goals

Goals: one external lifecycle; minimal routine human relay; precise role dispatch; executable fail-closed guards; understandable fixed dashboards; repeatable onboarding; all packages assigned applicable checks; consistent publication; preservation of stricter program contracts and historical evidence.

Non-goals: repairing Routing R04, completing Repo Core, closing UI P01, imposing a uniform geometry tolerance or performance budget, retroactive model claims, automatically accepting visual baselines, copying dirty branches, account-wide settings, foreign repositories, force pushing or automatic main merge. No absolute quality guarantee is claimed from a process.

## Decisions

### 1. Direction taxonomy and identities

A direction is a bounded engineering objective, not a physical package. A direction owns stable ID, goal, branch/worktree, immutable origin, current approved checkpoint, versioned rules and numbered stages. A stage owns one OpenSpec change or explicit mapping of existing change artifacts; tasks carry stable IDs, type, dependencies, acceptance/evidence and ordered steps. Phases are lifecycle activities, separate from stage numbers and health. Legacy Routing R01-R10 and UI P01-P07 keep their names and origins. A small feature uses one stage with the same barriers; it cannot skip research/checks silently, but applicable evidence can be bounded.

Do not create empty product packages for planning. Proposed metadata layout: docs/engineering/directions/<id>/{direction.json,ROADMAP.md,AGENTS.md,DIRECTION-STATUS.md,decisions/}. Use a legacy owner status path when present and render it in the common layout. Each OpenSpec change retains its own artifacts/evidence. Internal direction AGENTS extends root/scoped contracts; it never weakens them. Root loader references the active direction manifest so rules apply outside the docs subtree.

### 2. Initial command and standard lifecycle

User command: "Открой направление <name>: <goal>". The owner performs dry-run inventory first, resolves the canonical Git common and selected explicit committed baseline, validates ID/path/remote/ref, verifies available shared policy/runtime, refuses an existing mismatched direction/branch, creates one isolated registered worktree and branch codex/<id>, and seeds intake, research, requirements, roadmap, manifest, rules, status, decision register and OpenSpec planning. No user input is guessed for irreversible product scope or external publication. If origin/baseline/destination is ambiguous, it blocks only dependent steps; safe research proceeds.

Phases: INTAKE -> RESEARCH -> REQUIREMENTS -> PLANNING -> PRE_REVIEW -> BDD_TDD -> IMPLEMENTATION -> CHECKS -> VERIFICATION -> POST_REVIEW -> ARCHIVE -> CLOSED. Integration to a shared target is a separately authorized candidate after closure or an explicitly bounded integration checkpoint; merged candidate receives applicable regression/control revalidation. Unknown phases, skipped barriers and stale approvals fail.

Health is separate: NOT_RUN, RUNNING, PASS, FAIL, BLOCKED, PAUSED. PAUSED requires human instruction. Applicability is REQUIRED or NOT_APPLICABLE with contract-based reason, decided before execution; N/A cannot waive a current applicable FAIL. PRE/POST unavailable/invalid transport is BLOCKED; valid reviewer verdict is exactly PASS/FAIL. Stage/tasks checked-count is administrative progress only, not product readiness.

### 3. Discovery, research and requirements

Intake captures problem, users, expected outcome, constraints, exclusions, original baseline, quality-first priority, publication destination and human decision boundary. Research retains dated primary/local sources, current behavior, reproducible gaps, alternatives/tradeoffs, risks, unknowns and capability limitations. Browsing stays outside confined reviews; selected relevant public/source evidence enters packet.

Requirements use stable IDs, mandatory behavior/invariants, explicit acceptance cases, compatibility/preservation constraints and measurable limits. Each requirement links to BDD scenario -> task -> meaningful test/assertion -> actual source-bound evidence. Critical invariants, failure/cancel/recovery states and security boundaries require positive, negative and boundary controls. Qualitative usability/visual decisions remain human. Numerical limits are approved per contract before measurement, not fitted to observed failures. Existing actual evidence may be reused only with source/toolchain/config applicability proof; failed obsolete runs remain retained.

### 4. Exact role assignments (approved for this direction)

User authorized the following exact assignments on 2 October 2026 via the question/reply saved in evidence/user-decisions.json. This is the W01 stage plan, not a global model default.

| Stage | Role | Model | Effort |
|---|---|---|---|
| W01 | planning-architecture | gpt-6-astra | high |
| W01 | independent-PRE | gpt-6-astra | xhigh |
| W01 | tooling-tests | gpt-6-sol | high |
| W01 | formal-Verify | gpt-6-astra | high |
| W01 | independent-POST | gpt-6-astra | xhigh |

Checkpoint/publication is a deterministic authorized orchestration action, not a new LLM reasoning assignment. Drafting onboarding/requirements belongs to planning-architecture; schema/CLI/test implementation belongs to tooling-tests.

For future directions, approved stage task-type assignment resolves one pair; a reviewed task-specific exception overrides only its own task and role. Resolver must emit stage, task, type/role, exact pair, source path/raw hash/excerpt, assignment revision and override reason/approval. No "Luna/Sol", "high/xhigh", dynamic choice, universal strongest model, silent fallback or request-self-approval. Missing mappings block dispatch. Recommended pairs in templates are proposals and never authorize execution. Executor and reviewer assignments are separate. The current chat model cannot be silently changed; launch exact approved workers through supported tooling only after actual runtime/confinement proof. Review worker is fresh, independent and read-only; a writable implementation worker is confined to its own owner scope, gets no reviewer credentials and cannot self-certify PRE/POST. Initial tooling must report writer dispatch NOT_IMPLEMENTED rather than pretend it exists.

### 5. Fixed dashboard and metrics

Exactly eight primary sections, same order: 1 Decision/Next Action; 2 Identity/Scope; 3 Stage Roadmap; 4 Active Tasks/Steps; 5 Checks/Gates/Quality; 6 Models/Execution; 7 Dependencies/Decisions/Blockers; 8 Git/Publication/Evidence. Current projection renders validated structured state; dated raw history remains separate. Legacy dashboards can retain append-only historical tail after these sections, with a clear snapshot boundary; no rewrite of old evidence. A tracked required status path is recorded in manifest.

Top row: UTC update, direction/stage/phase/health, exact next permitted action, human decision or NONE. Counts use explicit complete/total/remaining requirements/tasks/checks; missing evidence cannot increase acceptance. Report invariant failures, executed scenario coverage, negative-control coverage, regression state, approved performance/security/visual gates, stale evidence, open blocker age, failed fix attempts, baseline/source fingerprints, last checkpoint SHA and verified remote SHA. No invented quality score, arbitrary 100% code coverage mandate or universal latency budget.

Refresh on start/resume, scope/decision, task/blocker/check batch, PRE/POST/Verify/archive/publication. Freeze defers status writes. Render after receipt unfreeze; open right panel and distinguish queued/visible. Hash the input records used to produce the projection. A record claiming PASS is not evidence: validator checks declared evidence bindings and review receipts; actual gate execution stays authoritative.

### 6. Commit/push cadence and remote safety

Recommended normative cadence: one commit and push after each coherent completed task whose required checks pass; additionally commit/push planning approval, PRE/POST receipt, stage close/archive and reproduced blocker/RCA checkpoint when new evidence exists. Combine events belonging to the same frozen candidate into one checkpoint; do not create empty commits. Do not push every shell command, failed local patch or intermediate edit. A work-in-progress diagnostic checkpoint must label incomplete/FAIL/BLOCKED and cannot satisfy GREEN/closure. Preserve RED locally before repair; a durable RED checkpoint can be published with explicit non-ready status.

Opening a direction captures explicit human remote/ref authorization once; routine subsequent publication uses it. This direction is authorized only git@github.com:leonmaks/frade.git refs/heads/codex/frade-standard-workflow. Validate URL/ref plus actual branch/upstream; explicit scoped staging; scan prohibited/sensitive files; refuse unexpected staging or unauthorized paths; no blind git add .; no force/reset/clean. Push exact local checkpoint SHA to exact approved ref and verify remote SHA by fresh ls-remote. Remote divergence, unavailable transport, permissions or mismatch = publication BLOCKED, never PUBLISHED; retain checkpoint locally. Push cannot mutate main or another direction. Publication receipt is append-only after verification; avoid self-referential "this commit" hashes by pointing to the preceding source checkpoint and record receipt in the next natural checkpoint, without infinite commits.

### 7. Applicable controls for all packages

General contract baseline: applicable strict OpenSpec, lint/typecheck/build, unit/BDD/boundary tests and clean lockfile/reproducibility checks. Product changes require affected package checks plus required root regression per approved control matrix; docs/process-only changes require actual process/control tests, strict validation, content/hash/link checks and proven unchanged product tree, not an invented product GREEN. New schema/CLI/CI controls need integration tests on actual temporary Git/worktrees and adversarial controls, not just schema examples.

Per subsystem: Routing geometry/property/parity/mutation/compiler/frozen gates; UI theme/density/keyboard/contrast/visual/preservation; Repository profiles/identity/revisions/authorization/atomicity/recovery; Metamodel composition/inheritance/imports/fingerprints; Runtime sender/DTO/isolation/lifecycle; adapters actual filesystem/SQL/Git behavior; host browser/Electron real integration. Existing thresholds and narrower constraints prevail. Each area must have declared scope owner and actual applicability, including shared manifests/CI/AGENTS. No unrelated FAIL blocks an independent direction, but a failing truly applicable check cannot be relabelled unrelated.

### 8. Bootstrap and validators

Proposed entry: node scripts/directions/cli.mjs plan <request.json>; create <approved-request.json>; check <manifest>; status <manifest>; review <manifest> PRE|POST; checkpoint <manifest> <event>; publish <receipt>. User commands map to these deterministically. plan is read-only and outputs exact creation/destination/unknowns; create is idempotent only when owner/baseline/hash match. Creation uses argv APIs without shell interpolation, validates canonical path containment/reparse points/case collisions, Git ownership/modes and branch/ref collisions; partial operations return recoverable receipts and never delete existing work. Registry is branch-local/versioned; common service remains review transport. Do not assume common network capability grants reviewer network.

Validator detects unresolved models, missing evidence/task order/approval, unknown status, forged/stale bindings, scope drift, semantic weakening, changed source during review, incomplete stream, missing checks/remote SHA and circular dependencies. Machine checks complement independent semantic review; false plan approval cannot be verified merely by a JSON true. Adoption of new public controls needs PRE/RED/implementation/checks/Verify/POST and immutable release publish, then consumer-owned migration. No rewriting release v1.1.

### 9. Adoption and integration

New directions use the new standard after reviewed release adoption. Existing Routing/UI/Repo Core keep approved origin and evidence; add mapping records and common dashboard header through owning planning revalidation. Adopt one direction at a time in separate worktrees. Archived historical changes remain historical, not reopened or renamed without a new authorized scope. Completed checkboxes without Verify/POST/archive map to IMPLEMENTED_PENDING_CLOSURE, never CLOSED. Future stages with ambiguous model matrices are PLANNING_BLOCKED, not automatically assigned today's models.

Shared release is published only after actual successful complete POST of public supplier controls; registration/bundle hashes and discovery/confinement are verified from registered owners. Per-owner control adoption may fail independently and does not prevent supplier closure. A reviewed standard alone does not claim all directions migrated. CI definitions and branch protection distinguish LOCAL_ONLY, REMOTE_VERIFIED and NOT_CONFIGURED.

Integration captures target commit/ref, resolved conflicts, preserved supplier/consumer approvals, final diff and tests on actual merged candidate, independent integration POST as applicable and explicit merge permission. No auto main merge. Pre-merge feature POST cannot certify a later conflicting merge tree.

## Risks / Trade-offs

Frequent task publication improves recoverability but creates evidence volume: keep relevant minimal packets, never recursively select copied historical packets; raw receipts immutable and storage budgets measured before reviews. Strong controls cost time; quality remains first, human interaction second, not test count maximization. Proposed model assignments require availability, not aliases or unattested claims. Existing docs are inconsistent/stale; mapping must use observed source path/hash/time and separate owner status, never infer closure.

## Migration Plan

1. This W01 planning package + audited user decisions + exact public-policy adoption; actual strict validation; independent PRE on approved scope.
2. Implement docs/templates/schema/lifecycle/role/status/bootstrap/publication controls in the sole owning workspace after meaningful RED. Run targeted and required general control checks.
3. Formal Verify -> independent POST -> immutable common release/control publication under allowed destinations -> W01 archive/checkpoint -> STOP.
4. Routing, UI and Repo Core migration are separately authorized owner checkpoints; preserve frozen origins and conduct their affected PRE/POST. Record NOT_STARTED until actual adoption.
5. Main integration is separately authorized and revalidated; no next numbered engineering change automatically.

## Verification Strategy

BDD requirements cover creation collision/foreign root, ambiguous role/task overrides, task/barrier ordering, drifted/forged review, UNKNOWN/N/A misuse, dashboard count integrity, blocked publication/divergent remote, schema version/adoption, public-release hash and unchanged product behavior. Use deterministic Node tests plus actual disposable Git repositories/worktrees/remotes for mutations. Run commands/exits/hashes, positive/negative controls, strict OpenSpec and changed-path audit. Existing shared CLI is consumed unchanged; regression-test any new wrappers and scoped root loader. Root product check:all applicability must be declared with contract proof before implementation; no false product PASS from docs-only tests.
