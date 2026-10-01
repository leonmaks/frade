# Proposal

## Why

The common workflow v1.0 incorrectly overrides each branch's approved stage-specific reviewer model/effort with gpt-6-astra/xhigh. The user explicitly corrected that process; automatic independent review must follow the owning plan, without rewriting the already delivered Routing instruction.

## What Changes

- Replace the repository-wide fixed model/effort with explicit owning stage and PRE/POST policy selected from approved plan evidence. No global default or silent upgrade/downgrade.
- **BREAKING**: run/probe requests require reviewPolicy with stage, phase, canonical model, reasoningEffort and exact source path/hash/excerpt selected in packet paths. Old incomplete requests fail BLOCKED.
- Bind the generated CLI arguments, provenance and strict receipt to the selected pair; keep original v3 transport templates immutable.
- Publish shared policy v1.1 and additive/common root correction after independent checks. Keep mandatory branch status and automatic dispatch/reception.
- Leave Routing handoff bytes and all feature sources/frozen controls/archive evidence unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- agent-review-workflow: Automatic independent review and Shared worktree service select the approved owning stage model/effort, with traceable provenance and no fallback.

## Impact

Root AGENTS and exact public fragment, docs/engineering/agent-workflow.md and parallel-feature-workflow.md, scripts/agent-review/core.mjs/cli.mjs/make-bundle.mjs/bundle.json, functional tests and this change/status. No product/domain/dependency/CI/Routing source changes. Common public release pointer is updated only after POST; passive-primary root gets exact reviewed correction, previous bytes preserved. User instruction excludes rewriting docs/engineering/routing-v2-agent-handoff.md.
