# Design

## Context

v1.0 source and installed release9cd select fixed Astra/xhigh in CLI status, instance configs, raw inner invoke and outer receipt. Original v3 transport bytes/provenance are immutable templates and archives remain evidence. User correction is controlling authority for this narrow supplier, independent of P01/Routing product gates.

## Goals / Non-Goals

**Goals:** bind automatic fresh review to the approved stage plan and record exact provenance without account configuration; preserve strict read-only and source/packet/transport gates, branch progress and checkpoint behavior.

**Non-Goals:** parse arbitrary prose into model decisions, select cheaper/stronger defaults, change Routing handoff or product scope, rewrite old evidence, change credentials/global settings/runtime.

## Decisions

Request reviewPolicy explicitly contains stage, phase matching request PRE/POST, canonical model ID, reasoningEffort, and source {path, sha256, excerpt}. The source must be a selected safe owning relative artifact; raw hash and nonempty exact excerpt are verified before any generated instance/WSL review. Stage assignment interpretation is the owning agent's responsibility and independent review checks the complete relevant approved plan; metadata alone never proves semantic approval. A missing, ambiguous or conflicting assignment is BLOCKED and requires a decision, not a fallback. Do not mandate a new plan format or make a request itself the approval.

Use canonical CLI model IDs; safe nonempty model-ID syntax and explicit CLI reasoning enum guard code injection. Availability is established by actual requested invocation; unknown/unavailable exact selection is BLOCKED, never retry a different pair. Carry the whole selected provenance in raw input/provenance/receipt and add it explicitly to reviewer prompt. A model may be Sol, Luna, Astra or another explicitly approved supported ID; no universal Astra preference.

Extend generated instances (not original templates) by exactly-once callback substitutions of model CLI argument, inner requested metadata, policy reasoning config and generated pinned-policy test expectation. The offline confinement probe uses that same selected policy, so dynamic effort does not bypass proof. CLI status reports PLAN_REQUIRED rather than a pair; probe requires the same plan selection input as run. No default argument on run/instance. Generated controls keep every deny/auth/global-config/instruction suppression flag.

After invocation strict outer receipt additionally verifies inner requested pair and actual CLI --model/config tokens equal selected policy (exactly once); mismatches are BLOCKED. Source plan participates in full source freeze and packet hashes. Preserve original15 controls and previous9 functional assertions; adapt old direct instance fixtures to supply an explicit fixture selection, add new meaningful plan/phase/provenance/generated-command tests.

### This supplier review assignment

The existing authorized UI engineering review policy is retained specifically for this narrow corrective supplier; it is not the default for other feature stages.

| Stage | Role | Model | Reasoning |
| --- | --- | --- | --- |
| common-policy-repair | PRE | gpt-6-astra | xhigh |
| common-policy-repair | POST | gpt-6-astra | xhigh |

PRE/POST bootstrap through already reviewed original external v3 transport requesting exactly this pair; its raw record and strict wrapper are verified automatically. New transport cannot self-approve publication. Functional fixtures demonstrate gpt-6-sol/high and gpt-6-astra/xhigh selections without incurring unrelated paid reviews; actual live reviewer backend remains NOT_CONFIRMED.

## Risks / Trade-offs

[Prose ambiguity] → exact plan excerpt/hash plus complete approved inputs and independent semantic review; stop rather than infer a universal default. [Template substitution] → exactly once JSON literals/callback, syntax/real generated prepare/guard regressions. [Old requests] → explicit BREAKING BLOCKED, owner adds stage evidence through its own process. [Frozen old adopted policy] → preserve current source, consumer owns exact new-policy adoption/revalidation; supplier does not write Routing. [Unchanged old Routing handoff fixed pair] → leave bytes as requested, canonical v1.1/shared rules explicitly supersede only its obsolete universal pair, owner already has direct correction.

## Migration Plan

PRE → meaningful RED → bounded repair/rules v1.1 → functional/general/strict checks and verification → independent cumulative POST → publish immutable reviewed release with updated pointer, old release retained → append reviewed clarification to passive-primary AGENTS preserving all previous bytes → validate installed discovery/probes, canonical delta sync/archive/post-archive checks → authorized UI commit/push/remote SHA; STOP. Publication failure leaves prior pointer active, no weaker release fallback. No updates to active Routing checkout or delivered handoff.
