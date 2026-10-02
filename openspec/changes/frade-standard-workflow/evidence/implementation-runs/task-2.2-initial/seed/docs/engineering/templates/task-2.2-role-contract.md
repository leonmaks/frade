# Exact role resolver contract (task 2.2)

`scripts/directions/roles.mjs` exports `createRoleAuthority`, `resolveRole`, and
`writableWorkerDispatch`. This document defines a reusable schema. Any example row in a
template is **PROPOSED**, and cannot authorize dispatch. An approved plan and direct human
or reviewed-plan authority must be established for each direction.

## Inputs and authority

`resolveRole({manifest, stageId, taskId, taskType, role, reader, authority, invoked, executionKind})`
selects one exact stage/type/role assignment. A stage has `roleAssignments`, `roleAuthority`,
and `taskOverrides` arrays. Each assignment has `role`, `model`, `effort`, and optional
`taskType`, `executionKind`, and `source`. If `taskType` is absent, it equals `role`,
as in approved W01. A supplied `executionKind` must agree with the distinct reviewer
roles (`independent-PRE`, `independent-POST`, `reviewer`) or executor roles.
`roleAuthority` or a row's `source` has canonical relative `path`, raw `sha256` (legacy
draft `hash` accepted), `revision`, and a separate `decision: {path,sha256}`. The row's
`source.excerpt`, when supplied, is the exact stage/type/role/pair table line in the raw
source. The W01 table line is derived from the selected pair and checked for unique
exact presence.

The trusted controller chooses the artifact root for `createArtifactReader(root)` and
creates `createRoleAuthority({bindings,verifyApproval})`. Bindings anchor source and
decision paths, raw SHA256 values, and revisions independently of request or manifest
metadata. The verifier must establish the direct human decision or reviewed approved
plan from actual raw decision evidence and compare its scope, stage, task/type/role, pair,
revision, and approval to the selected assignment. It must return `true` only after those
checks. There is no default verifier. A JSON `PASS`, request pair, or manifest boolean is
never approval. The resolver rereads raw source and decision bytes through the safe
artifact reader, rejects hash drift, and requires one exact excerpt line. A trusted
controller must keep its bindings and verifier outside writable request data.

For W01, the accepted design binding is
`openspec/changes/frade-standard-workflow/design.md` at
`501168ced50a35e128a0fc86e79bab6ac9aa31cd343eca3eedac56f81570978a`.
The direct decision binding is
`openspec/changes/frade-standard-workflow/evidence/user-decisions.json` at
`126589d990e2e44b04efe8825b5ec4d90582205ba6c729375528c383ccbaf186`.
Revision `D03` binds the accepted concrete plan while the earlier model reply remains
the exact model authorization. The five W01 rows are planning-architecture Astra/high,
independent-PRE Astra/xhigh, tooling-tests Sol/high, formal-Verify Astra/high, and
independent-POST Astra/xhigh. These values are W01 only.

## Task exceptions and result

A task exception has `taskId`, `taskType`, `role`, exact `model` and `effort`, nonempty
`reason`, `source: {path,sha256,revision,excerpt}`, and
`approval: {path,sha256}`. Its exact source row is
`| <stage> | <task> | <type> | <role> | <model> | <effort> | exception: <reason> |`.
The controller must verify the exception's own approval. It changes only the matching
task and role; other tasks use their stage row. Missing, duplicate, contradictory,
range, unapproved, forged, or drifted assignments return `{ok:false,status:'BLOCKED',issues}`.

Successful resolution returns `{ok:true,status:'RESOLVED',assignment,provenance}`.
`assignment` records stage, task, type, role, executor/reviewer kind, exact pair,
source path/raw hash/excerpt/revision, and any exception reason and approval.
`provenance.requested` is the selected approved pair; `provenance.invoked` is the
optional caller-reported invocation and must match it exactly. Neither field attests
the running model. `actualBackend`, `actualEffort`, and model availability remain
`NOT_CONFIRMED` until separate runtime evidence exists. Unknown availability is a
dispatch limitation and never licenses a model substitute.

`writableWorkerDispatch()` always returns `NOT_IMPLEMENTED` / `BLOCKED`. It performs no
launch, cannot switch the current chat, and cannot reuse the existing read-only
independent reviewer packet as writable executor confinement. A future writable-worker
integration needs separate owner-scope and runtime proof. Independent review transport
and its confinement remain under their existing separate control.
