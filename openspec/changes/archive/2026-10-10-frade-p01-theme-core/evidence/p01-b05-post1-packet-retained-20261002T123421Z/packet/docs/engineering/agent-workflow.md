# Frade common agent workflow — v1.1

These mandatory rules apply to every engineering branch/worktree of this Frade repository. The user's 1 October 2026 instruction authorizes automatic independent OpenAI Codex review of relevant Frade sources, contracts, tests and evidence. Credentials, secrets, global settings and other repositories are excluded. Existing AGENTS, approved OpenSpec scope, STOP conditions, test integrity, frozen controls and each numbered checkpoint remain mandatory.

## Automatic PRE and POST

The owning agent reads its approved branch plan, selects the exact model and reasoning effort assigned to the current stage and PRE/POST review role, prepares the relevant packet/prompt, invokes a fresh independent reviewer and receives the result without human relay or repeated review approval. There is no universal model/effort default, silent upgrade or downgrade. Do not reuse implementation or fix-worker parameters for a review unless that role is explicitly assigned in the plan. Missing, ambiguous or conflicting assignment, unavailable required model/effort or unverified sandbox is BLOCKED for the actual decision/limitation. Record the stage, role and exact selected plan path/hash/excerpt. Requested model/effort and independently attested backend/effort are separate; actual backend/effort remains NOT_CONFIRMED.

Use this order: approved coherent proposal/design/spec/tasks → actual strict validation → independent PRE PASS → BDD / meaningful RED → implementation → required GREEN/general checks → OpenSpec verify → independent POST PASS → archive/checkpoint. Preserve stricter program gates and original origin. A focused PASS does not close cumulative work, grant visual acceptance, waive a failed test or authorize the next numbered change. A machine gate is not independent approval. FAIL stops its scope. Human decisions are required for material scope/spec/visual/destination or unresolved authorization/environment changes, not for passing prompts/results.

The reviewer receives an immutable minimal explicit packet. Missing relevant inputs are a completeness blocker. The authenticated external harness uses the signed-in account; auth is not copied or readable by reviewer commands. The pinned current-host runtime is Codex CLI 0.159.3 under WSL Ubuntu-22.04_E. Each invocation first runs an offline sandbox canary: packet read allowed; candidate, Git common storage, another worktree, auth/config reads denied; file writes and socket access denied. Network/apps/web/shell inheritance are disabled inside commands. Root deny with minimal public tools and explicit runtime read is mandatory, not just a read-only label.

Generated instances also use `--ignore-user-config`, `--ignore-rules`, `project_doc_max_bytes=0`, `project_doc_fallback_filenames=[]`. Relevant AGENTS are selected explicitly in the packet. These suppress automatic AGENTS/rules/user-config loading; they do not remove platform instructions or built-in tool descriptions. Do not claim an unattested absence of all platform context. Credentials remain outside sandbox in the launcher. Missing or failed confinement/version proof is BLOCKED; no Windows fallback with weaker isolation.

## Shared service discovery

One installation lives in the repository's **Git common directory**, not a feature branch. `frade-workflow/current.json` points to an immutable content-hash release. It contains reviewed public policy, CLI and exact transport templates, no account configuration. No per-branch reviewer/model setup is needed. Each run derives the owning root/branch from actual cwd, verifies registration against this original Frade common directory, rejects unrelated repositories even if origin matches, and uses a unique run directory. Never run concurrent feature writers in one checkout.

From any registered Frade worktree, in PowerShell:

```powershell
$fradeCommon = (git rev-parse --path-format=absolute --git-common-dir).Trim()
$fradePointer = Get-Content -LiteralPath (Join-Path $fradeCommon 'frade-workflow/current.json') -Raw | ConvertFrom-Json
$fradeRelease = Join-Path $fradeCommon ("frade-workflow/releases/" + $fradePointer.release)
$fradeRunner = Join-Path $fradeRelease 'scripts/agent-review/cli.mjs'
node $fradeRunner status
Get-Content -LiteralPath (Join-Path $fradeRelease 'docs/engineering/agent-workflow.md') -Raw
```

`status` verifies every public bundle file before reporting AVAILABLE. The pointer digest must equal the verified returned release digest. If missing/drifted, stop and report BLOCKED; never fall back to a different repository/worktree. Older branch files and already-running chats cannot be silently rewritten/reinstructed. Load this shared policy through the one-time owner handoff; adopt tracked rules through that branch's approved control process. Future branches acquire root rules by adopting the process commit. No full UI merge is necessary.

## Packet and owner adoption

Before freeze, the owner selects root/scoped AGENTS, active artifacts, applicable contracts, source/tests/evidence and actual check records. Never send .git, .env, credential files, global settings or another repository. Secret/path guards, safe relative paths and raw file realpath checks are mandatory. Index must be empty; commit the authorized planning checkpoint when required, not by discarding/stashing unrelated work.

An older branch saves exact reviewed public policy and necessary public controls from the shared release into its **own approved process evidence directory**, records release/version/origin/bytes/hashes, and selects those adopted relative paths. The runner requires a `policyArtifact` selected in `paths`, with bytes matching the shared policy SHA. This is task evidence, not per-branch model/account configuration. The supplier does not write active foreign checkouts. The consumer owns adoption/control compatibility revalidation, preserves its frozen origin and historical FAIL, and never broadens an allowlist or moves baseline silently.

Select canonical CLI model ID and one exact effort from the approved plan; preserve plan naming/aliases in the exact source excerpt and make the mapping reviewable. The runner verifies safe ID/effort, phase, selected source raw SHA256 and excerpt; the owner and independent reviewer verify semantic approval and conflicts using complete relevant plan inputs. Request metadata is never its own approval. Original v3 templates retain historic constants only as immutable substitution origins. New generated CLI, probe policy, inner metadata and strict outer receipt must match the selected pair exactly.

Prepare an external JSON request as task input (not inside the frozen candidate). This illustrative Sol/high pair belongs only to the example stage; replace every value from the actual approved stage assignment:

```json
{
  "phase": "PRE",
  "change": "selected-owning-change",
  "scope": "Exact approved scope and exclusions",
  "reviewPolicy": {
    "stage": "example-stage",
    "phase": "PRE",
    "model": "gpt-6-sol",
    "reasoningEffort": "high",
    "source": {
      "path": "openspec/changes/selected-owning-change/design.md",
      "sha256": "<lowercase SHA256 of raw plan bytes>",
      "excerpt": "<exact approved stage reviewer assignment from the plan>"
    }
  },
  "policyArtifact": "openspec/changes/selected-owning-change/evidence/shared-policy.md",
  "paths": ["AGENTS.md", "openspec/changes/selected-owning-change/design.md", "openspec/changes/selected-owning-change/evidence/shared-policy.md"],
  "prompt": "Full prepared independent review prompt; list authority, scope, applicability, actual evidence, limits and require exactly one standalone GATE_STATUS: PASS or FAIL."
}
```

The paths and placeholder hash/excerpt above only illustrate shape; the owner must include all necessary relevant inputs. Invoke and receive automatically:

```powershell
node $fradeRunner probe C:/path/to/external-request.json
node $fradeRunner run C:/path/to/external-request.json
```

Old requests without an explicit valid reviewPolicy fail BLOCKED; status reports that plan selection is required, not a configured reviewer pair. A probe uses the same explicit selection and never chooses a reviewer default. The previously delivered Routing handoff remains unchanged at the user's request; this v1.1 rule supersedes only its obsolete universal Astra/xhigh wording. The Routing owner already received the direct correction and retains its control/adoption gates.

The runner preserves full input selection, request/prompt, source/packet/instance hashes, full tracked and nonignored-untracked candidate bytes plus Git identity, stdout/stderr/exit/report and immutable receipt in its unique common run. Do not update sources, dashboards, index or HEAD during review. A changed candidate/request/packet/toolchain/release, failed execution, incomplete stream or ambiguous verdict is BLOCKED. Only a clean completed stream and one exact single-line verdict may authorize progression. The strict outer receipt overrides a permissive inner v3 result. Raw FAIL is never rewritten. Save the received outputs and provenance in dated owning evidence after unfreeze. Exit0=PASS, exit1=FAIL, exit2=BLOCKED; inspect receipt, not an isolated plausible sentence.

## Required branch progress

Every active engineering branch MUST maintain its own **tracked `*-STATUS.md`**. Retain existing program files: UI uses `docs/ui/UI-DESIGN-CONTRACT-STATUS.md`, Routing uses `docs/routing-v2/ROUTING-V2-STATUS.md`; otherwise use `docs/engineering/BRANCH-STATUS.md`. Do not create a shared feature-progress file in common storage.

Include actual branch/worktree, active change, original baseline/cumulative origin and current checkpoint, phase, full stage list plus detailed active tasks, actual check/gate PASS/FAIL/BLOCKED/NOT_RUN, evidence/limitations, unresolved decisions/blockers, next action and commit/push state. Use UTC timestamps for evidence, optional MSK display.

The owner refreshes on start/resume, accepted scope, completed/blocked tasks, completed check batch, PRE/POST receipt, blocker/visual decision, verify, archive, commit and verified publication. Defer dashboard writes while candidate is frozen. Open the file in the right panel; queued is not proof of visibility. Dashboard is a current projection, never approval/evidence replacement. Preserve historical dated evidence unchanged.

## Checkpoints and parallel features

Commit completed authorized checkpoints honestly, including explicitly incomplete FAIL checkpoints. Push only to a user-authorized remote/ref, verify actual remote SHA, never force or rewrite unrelated work. Publishing a UI checkpoint does not authorize publishing another branch. Serialize shared-file merges and explain conflicts.

UI and Routing have independent feature gates. A directed product dependency exists only when a consumer uses supplier API/artifact/behavior. The consumer owns integration/waiting/adoption; the supplier does not wait for its gate/archive/process repair. Common ancestry, root AGENTS or a historical whole-file fingerprint is not itself a product dependency. If presentation actually changes routing semantics, split it into Routing-owned work.

## Installation and limitations

Publish a reviewed public release only after supplier verification and independent POST PASS. `publish` checks original POST transport fingerprints, strict output, packet hashes and every selected release file; it never copies product sources. Save install/pointer/hash/primary-loader provenance and check discovery/confinement from both worktree contexts. Older active owner checkouts are not edited here. Other hosts need one verified runtime installation; unsupported hosts report BLOCKED. These engineering instructions are not GitHub branch protection or CI enforcement.

Official config references: [configuration](https://learn.chatgpt.com/docs/config-file/config-reference), [AGENTS discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md). Executed local probes, not documentation alone, establish current-host command confinement.
