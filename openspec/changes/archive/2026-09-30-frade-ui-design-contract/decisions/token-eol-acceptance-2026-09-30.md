# Accepted EOL scope repair — 30 September 2026

The user's direct reply «подтверждаю» accepts the previously presented narrow planning repair and focused independent PRE for FOUNDATION-EOL-01. No second confirmation is needed for these planning edits. This is not an independent gate PASS.

Accepted draft: docs/ui/decisions/token-eol.gitattributes.proposed, SHA256 7aebd327f1c5a08490abc5ded3a7198db42e5ac7b34b35a7ad2f5197a8dbd960. Root .gitattributes may contain only these eight logical entries after focused PRE PASS:

```gitattributes
docs/ui/Frade-UI-Style-Guide.md text eol=lf
docs/ui/QA-Checklist.md text eol=lf
docs/ui/Themes-and-Plugins-Spec.md text eol=lf
packages/ui-workspace/tokens/tokens.json text eol=lf
packages/ui-workspace/tokens/theme.schema.json text eol=lf
tests/ui-contract/fixtures/upstream.tokens.css text eol=lf
packages/ui-workspace/src/design/generated/tokens.css text eol=lf
packages/ui-workspace/src/design/generated/tokens.ts text eol=lf
```

The user-approved refinement includes regression-first fresh-checkout controls within existing scripts/ui and tests/ui-contract roots, BDD/bindings and existing pnpm/CI integration, preserving raw artifact hashes, original input/history and prior PASS/FAIL records. It does not change guide 1.0, tokens 1.0.0, CSS adoption revision 1, palettes, role sets, contrast requirements, runtime UI/domain/routing or branch protection. There is no routing predecessor.

Prior implementation report: 14/17 complete with full local suite PASS (isolated server), Draw215/215 and desktop41/41. Revised tasks: 13/19 complete; 3.6 and 3.7 are new, 4.3 reopened only for post-repair revalidation. Historical counts/evidence are not overwritten.

Before-state snapshot: evidence/foundation-eol-planning-before-2026-09-30.json. Focused EOL PRE NOT_RUN; root attributes and new checkout code/test remain absent. Prior PRE-20260930T091121Z continues to authorize its old foundation scope only; the executor cannot self-approve the added path.
