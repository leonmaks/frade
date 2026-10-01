# Frade UI adoption — actual result as of 30 September 2026

**Adoption stopped before implementation: PRE blocker review FAIL.** Existing application code, AGENTS, canonical docs, CI and token/runtime layers were not modified. The guide is not yet mandatory in production or technically enforced. No POST PASS, archive or branch protection was claimed.

## Delivered artifacts

Foundation proposal/design/tasks plus three capability specs, proposed full WB-001 replacement, proposed additive AGENTS UI section, exact owner branch-protection instructions, checkpoint roadmap, adapted BDD feature/traceability plan, read-only audit/inventory/rule mapping and immutable baseline logs/screenshots. Seven separately scaffolded P01–P07 changes each have proposal/design/spec/tasks and strict validation; all implementation checkboxes remain open.

Changed paths are confined to:

- openspec/changes/frade-ui-design-contract/**
- openspec/changes/frade-p01-theme-core/**
- openspec/changes/frade-p02-transactional-installer/**
- openspec/changes/frade-p03-vscode-theme-import/**
- openspec/changes/frade-p04-icon-registries/**
- openspec/changes/frade-p05-isolated-browser-host/**
- openspec/changes/frade-p06-native-contributions/**
- openspec/changes/frade-p07-registry-profiles-policy/**

Guide v1.0/tokens1.0.0; source package read-only under actual ` _input/` path. Applicable FDS-001–018/A11Y-001–010 mapping is in audit.md; EXT contracts map to P stages in roadmap/design/specs. All runtime capabilities described in those planning documents are future requirements, not delivered functionality. Light/Dark runtime adoption must occur simultaneously in P01; original archive remains incompatible future P02 fixture under current Frade0.1 engines.

## Actual checks

| Check | Status/result |
|---|---|
| OpenSpec strict validation | PASS for foundation + P01–P07 (8 commands,exit0) |
| Existing four UI/desktop packages | PASS typecheck/lint,83 tests including45 bundle BDD |
| Existing desktop production build | PASS |
| Existing architecture boundaries | PASS Draw/runtime/repository/workbench |
| Supplied palette checker | PASS102 named pairs; not application WCAG |
| Isolated negative controls | expected FAIL: drift and poor contrast,exit1; positive exit0; temp copies removed |
| Runtime audit capture | PASS7 real screenshots using nine synthetic objects,1280×850,DPR1,Segoe UI; no pageerrors |
| R04 current machine architecture gate | FAIL,exit1; new UI/input paths outside its exact scope; controls untouched |
| Independent PRE / POST | NOT_RUN; executor blocker review FAIL prevents implementation |
| New generator/theme resolver/literal check/CI | NOT_IMPLEMENTED / BLOCKED at PRE |
| Guide theme-density/keyboard/a11y/visual regression matrix | NOT_RUN; baseline smoke/screenshots are not visual acceptance |
| Full pnpm check:all / remote CI run | NOT_RUN |
| Branch protection | NOT_CONFIGURED for new UI checks; actual existing remote rules unverified,gh absent |

Commands/exits: baseline/planning-validation-results.json and ui-check-results.json; build/test/typecheck/lint/boundary logs; exact capture/input-control scripts and results. Current gate failure is retained in baseline/routing-gate.txt. Initial commit/status/patch/input/control hashes are retained. Final integrity check records unchanged tracked diff/controls/input and new paths separately. No evidence was rewritten to manufacture PASS.

## Screenshots

| Screen | Current runtime evidence |
|---|---|
| Welcome | [welcome](baseline/welcome.png) |
| Command palette | [commands](baseline/commands.png) |
| Inspector/tree/tabs | [repository card](baseline/repository-card.png) |
| Repository settings | [settings](baseline/repository-settings.png) |
| Embedded Draw.io | [embedded](baseline/embedded-drawio.png) |
| Native X6 diagram | [native Draw](baseline/native-draw.png) |
| Draw.io synthetic diagram | [Draw.io](baseline/drawio-synthetic-objects.png) |

Screenshots depict current Dark Modern shell and separate light diagram surfaces. They contain synthetic data only and were visually inspected. They do not demonstrate Light/HC, new density, routing correctness, flow-manager behavior or an AI provider. Input/mockup screenshots were not substituted for application output.

## Remaining mismatches and decisions

No runtime theme/density/extension services, unified overlay/shortcut registries or new UI compliance gate exists. Current explorer rows22px/focus1px differ from guide; shell dimensions/palette conflict with WB-001. Native/embedded Draw retain independent light presentation; atomic adapter protocol is specified, not implemented. AI/providers and full multi-LoV contracts are not established. Domain appearance colors/diagram semantics remain separate and unchanged.

Approve decisions/visual-contract.md through explicit ownership reconciliation with the unarchived pilot. Resolve R04 frozen root AGENTS and restrictive machine scope through its owning planning/PRE protocol or wait for its closure. Then obtain independent PRE approval; a local syntax or token PASS does not substitute. No automatic P01 implementation begins at this checkpoint.

External KA screenshot export was rejected by automatic approval review because it would persist potentially sensitive external contents in repository evidence. Safe synthetic capture succeeded instead. Initial directory write denial and Node launch warning were environment/tool issues, not UI errors. External-KA screenshots remain BLOCKED without separate permission.

```text
CHANGE: frade-ui-design-contract; requested P01–P07 planning
IMPLEMENTED: read-only product audit + planning/evidence only; no product implementation
FILES CHANGED: eight new OpenSpec planning/evidence trees listed above
TESTS ADDED: isolated supplied-checker audit controls and capture smoke scripts; no production regression tests yet
COMMANDS EXECUTED: strict validation x8; desktop build; scoped UI typecheck/lint/test; boundaries; R04 gate; synthetic captures; positive/drift/contrast input controls; git status/diff/integrity inspection
TEST RESULTS: baseline checks PASS; intentional negative controls FAIL as expected; R04 gate FAIL; adoption/migration checks NOT_RUN/BLOCKED
KNOWN BLOCKERS: WB-001 visual contract, frozen AGENTS/exact R04 scope, missing independent PRE; remote required checks unverified
READY_FOR_VERIFY: NO
```
