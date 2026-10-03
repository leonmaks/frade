# Direction bootstrap (task 2.3)

Use the actual current shared release in the canonical Frade Git common directory. The CLI resolves that common from its running control location before inspecting a requested source. It reads `frade-workflow/current.json`, checks the immutable release bundle and exact public policy bytes, and requires the existing runner's `status` to report `AVAILABLE` for that release. A missing, drifted or unavailable installation reports `BLOCKED`/`NOT_CONFIGURED`; the unfinished W01 implementation is not a deployed release. The request cannot select or assert its own control installation. Library tests pass an explicit branded, hash-verified fixture context.

`plan` accepts a registered primary or secondary worktree from the same common. `create` additionally verifies the selected policy bytes in the committed baseline and current source checkout. The branch is created only after a matching actual registration, baseline ancestry, path and collision inspection. Availability of the installed review service does not authorize a direction. Before any intent journal or worktree write, `create` requires an external request grant at `<canonical Git common>/frade-workflow/bootstrap-authority.json`. The grant is a regular, canonical file written by a controller outside the requester. Production CLI commands never create or approve it. The fixture context replaces only service availability attestation; fixtures use the same grant verifier.

The grant has `schemaVersion: 1`, canonical `sourceRoot`, `gitCommon`, approved `workspaceParent`, `baseline`, exact `policy`, and `intentHash`. The hash is SHA256 of the normalized request JSON serialized with `JSON.stringify` (Windows path separators normalize to `/` at the request boundary). The grant must match the requested registered source, Git common, parent, baseline, policy and exact intent hash. A different ID, title, goal, outcomes, destination or other request content needs a separate grant. A request field such as `approved: true` is invalid. The `plan` output's `authorityPath` identifies the external grant location; it grants no authority by itself.

Create an absolute-path JSON request with these fields:

```json
{
  "schemaVersion": 1,
  "id": "example-direction",
  "title": "Example direction",
  "goal": "Describe the bounded goal",
  "users": ["intended users"],
  "outcomes": ["observable result"],
  "constraints": ["preserve existing behavior"],
  "exclusions": ["unrelated product files"],
  "sourceRoot": "/absolute/canonical/frade",
  "gitCommon": "/absolute/canonical/frade/.git",
  "workspaceParent": "/absolute/canonical/owners",
  "baseline": "40-lowercase-hex-committed-baseline",
  "policy": {
    "version": "reviewed-release-version",
    "release": "64-lowercase-hex-release-id",
    "sha256": "64-lowercase-hex-policy-hash",
    "artifact": "policy/agent-workflow.md"
  },
  "publication": {
    "remote": "git@example.test:team/frade.git",
    "ref": "refs/heads/codex/example-direction",
    "authorization": "pending human decision"
  }
}
```

From a registered source worktree:

```sh
node scripts/directions/cli.mjs plan /absolute/path/request.json
node scripts/directions/cli.mjs create /absolute/path/request.json
node scripts/directions/cli.mjs check /absolute/canonical/owners/example-direction/docs/engineering/directions/example-direction/direction.json
```

`plan` returns a read-only JSON preview with exact branch, worktree, seed paths, committed baseline, policy, publication destination, unknowns, intent path and an intent hash. `create` returns JSON exit 0 only after the branch is registered and seed files exist; blocked JSON uses exit 2. The branch is `codex/<id>` and the manifest is branch-local. The seed preserves inherited root rules, marks model assignment and downstream gates unresolved, and creates no product package. The seed delta capability matches `openspec/specs/<id>/spec.md`; its draft contains a strict-valid SHALL requirement while product acceptance stays unresolved and blocking.

The partial recovery protocol writes `<Git common>/frade-workflow/intents/<id>.json` with exclusive creation before `git worktree add`. It records the normalized request and its hash, branch, target, source, common, parent, baseline and policy. Every Git call uses command-local hook, fsmonitor and autocrlf settings. Checkout fails closed when committed or common info attributes request a smudge filter; no foreign filter code is run. The CLI verifies actual Git registration and baseline before seeding. A separate `<id>.complete.json` receipt with the exact same origin is written after seed files. A retry with the same granted request either finishes the retained work or returns the existing registered owner; it never cleans, resets or deletes an uncertain target. A different request, existing foreign branch/target, changed policy, unregistered target or case collision blocks without overwriting it. A partial failure returns `BLOCKED` and retains its intent and any registered worktree for inspection.

`check` first confines the path to a registered worktree's exact owned direction manifest, before reading JSON. It then validates canonical parents, the v2 manifest, current selected policy bytes, actual Git owner and the exact original baseline in both retained origin records. It recomputes the normalized request hash and checks owner, source, parent and policy bindings. Ancestor status alone cannot establish the original baseline. An older manually created owner without these records reports `BLOCKED` for later reviewed legacy adoption. `check` grants no gate acceptance. `status`, `review`, `checkpoint` and `publish` report `NOT_IMPLEMENTED` until their later tasks. Safe research and decision recording can continue while acceptance cases, numeric limits, exact role assignments or publication authorization remain unresolved; dependent implementation and publication stay blocked.
