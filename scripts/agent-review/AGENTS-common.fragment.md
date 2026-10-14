
---

## 20. Shared automatic independent reviews and branch progress

These mandatory engineering rules apply to every Frade feature branch/worktree.
Keep sections1–19, scoped AGENTS, approved contracts, test integrity and STOP rules.

At start/resume identify the owning branch/worktree/change and Git common directory.
Read the reviewed shared policy published under that common directory's
frade-workflow/current.json, when present. Its content-addressed release is common
to registered Frade worktrees; no account-global or per-branch reviewer setup.
If a stale branch lacks the local docs/runner, load that shared release directly
and record exact policy-version/hash adoption in the owning process evidence.
No whole UI merge, foreign uncommitted product files or silent baseline movement.

For every required PRE and POST automatically prepare a relevant authorized Frade
source/contracts/tests/evidence packet, dispatch a fresh independent OpenAI Codex
review using the exact model and reasoning effort assigned in the approved
owning branch plan for its current stage and PRE/POST role, and receive the result. The
reviewer runs in technically verified read-only packet confinement: original
checkout/other-worktrees/credentials/secrets/global settings/writes/network/apps
are unavailable. Authenticated harness access stays outside reviewer commands.
Do not ask the human to relay prompts/results or approve each authorized review.
User authorization on1October2026 extends this workflow to all Frade worktrees;
other repositories and sensitive data remain excluded. Do not silently substitute
a model/effort or claim an unattested backend. There is no universal model/effort
default. Missing, ambiguous or conflicting stage assignments, unavailable requested
models/efforts or an unverified sandbox are BLOCKED for the actual decision/limitation.
Record the selected stage/role and exact plan source hash/excerpt with the review.

Approved coherent plan plus validation precedes PRE; PRE PASS precedes production.
Actual required tests and OpenSpec verification precede POST; POST PASS precedes
archive. Run explicit revalidation after scope changes, not a historical PASS.
Keep stricter owner gates, frozen controls and each numbered STOP checkpoint.
A machine gate is not independent approval. FAIL stops its owner; unavailable,
mutated, truncated, timed-out or ambiguous review is BLOCKED, never PASS.
Review completion needs actual successful execution, complete event stream,
exactly one GATE_STATUS PASS/FAIL and unchanged candidate/packet/request/control
hashes. Save raw reports/events/exits/provenance immutably before interpreting them.
A focused PASS does not grant cumulative closure or human visual acceptance.

Every engineering branch MUST maintain its own tracked *-STATUS.md. Retain an
existing program dashboard; otherwise use docs/engineering/BRANCH-STATUS.md.
Include branch/worktree/change/original baseline, phase/tasks, actual checks/gates,
blockers/decisions, next step and commit/push state. Refresh on start/resume, scope
acceptance, task completion/blocker, check batch, PRE/POST, verification/visual
decision, archive and checkpoint publication. Open it in the right panel and
report queued vs visible honestly. Never update a frozen candidate during review;
record the outcome after unfreezing. Dashboard is not approval or historical
evidence. Preserve old FAIL/NOT_RUN and each feature's separate ownership.

Commit completed authorized checkpoints with honest incomplete/gate status; push
only to a user-authorized destination/ref, verify actual remote SHA, never force.
Ask humans only for material scope/spec/permission/visual or blocked-environment
decisions. Independent review findings cannot change the contract by themselves.
The consumer owns necessary adoption/control revalidation; it cannot make an
independent supplier wait for its routing/product gate or numbered completion.
