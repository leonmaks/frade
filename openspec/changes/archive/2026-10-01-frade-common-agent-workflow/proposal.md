# Proposal — Common Frade agent workflow

## Why

Automatic independent PRE/POST and visible progress work in the UI branch but the transport is pinned to that worktree. The user explicitly requires the same engineering policy for all Frade branches without manual prompt relay or per-branch reviewer/account configuration.

## What Changes

- Add a repository-wide automatic independent read-only review and branch-progress rule without removing AGENTS sections1–19 or changing SDD/BDD/TDD/verify/archive and numbered checkpoints.
- Pin requested reviewer gpt-6-astra/xhigh, fresh isolated session, approved minimal Frade packet, fail-closed transport/integrity/verdict, immutable receipt. Actual backend/effort remains NOT_CONFIRMED unless attested.
- Generalize the already-tested Windows/WSL root-deny transport, discover owning registered worktree and shared Git common storage automatically. Publish a versioned shared policy/runner there once for all worktrees on this host; no global configuration or auth copies.
- Require a tracked branch-owned STATUS.md in every engineering branch; automatic agent updates on scope/task/check/gate/blocker/commit/push/verify/archive events, freeze-safe during reviews.
- Provide a Routing V2 owner handoff with automatic PRE revalidation, preserved repair-entry/fingerprints and its own progress. No Routing source/control writes from this supplier task.

## Capabilities

### New Capabilities

- agent-review-workflow: shared independent review orchestration, deterministic receipt/integrity and per-branch progress ownership.

### Modified Capabilities

None. Existing foundation CI/build/domain/routing and UI requirements remain binding. This is an independent unnumbered engineering supplier, not P02 or Routing advancement.

## Impact

Closed repo paths: AGENTS.md additive section20; docs/engineering/{agent-workflow.md,parallel-feature-workflow.md,routing-v2-agent-handoff.md}; scripts/agent-review/**; tests/agent-review/**; this OpenSpec change; existing UI STATUS/context for current progress only. No package/dependency/lockfile/CI/domain/product source or P01 artifact edits. Local installation uses only E:/dev/codex/frade/.git/frade-workflow/** (same registered Git common repository) and a surgical loader append to passive primary AGENTS preserving all preexisting bytes; active Routing checkout remains owner-managed. Actual Git worktree inventory has separate UI and codex/routing-v2 directories; the latter is dirty/frozen and must not receive blind edits or full UI merge.

Authorization: decisions/user-authorization.json. Existing current-host public CLI runtime and tested sandbox probe are reused, credentials stay in authenticated harness outside reviewer filesystem. Other hosts missing a supported verified sandbox report BLOCKED; no promise of configured CI protection or automatic instruction injection into an already-running stale chat. Routing handoff is a one-time policy adoption command, not per-branch account/model setup.
