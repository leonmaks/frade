## Mandatory Frade UI design contract

Merge this section into the existing root AGENTS.md; do not replace existing instructions. Resolve paths against the actual monorepo before adopting.

Every new or modified Frade UI MUST follow `docs/ui/Frade-UI-Style-Guide.md` v1.0 and the canonical shared UI tokens/components. This includes Electron, web, Draw, Repository, Projects, AI, Settings, dialogs, overlays and notifications.

Read `docs/ui/Themes-and-Plugins-Spec.md` for hot-pluggable themes and native extension contracts. Light and dark ship together. Do not equate VS Code-like UX or theme import with support for all executable VS Code extensions. Every plugin contribution inherits Frade tokens, focus, keyboard and component contracts.

Before a UI change:
1. Read root/scoped AGENTS.md, the style guide, existing shared UI and current approved OpenSpec scope.
2. Record applicable FDS/A11Y rule IDs, screens, states, theme/density coverage and keyboard contracts in the change.
3. Reuse existing shared components and semantic tokens. Do not add feature-level color literals, a second visual system, an icon family or a competing theme resolver.
4. Preserve VS Code workbench structure and Frade's architectural-workshop character: restored context, clear focus, beautiful diagrams, meaningful feedback on actual work.

Implementation MUST stay within authorized paths. This contract does not override safety, frozen artifacts, approved domain/routing contracts or existing sequential PRE/POST gates. When an approved specification conflicts with this guide, document the exact conflict and propose a specification change through the existing workflow; do not silently reinterpret it.

For every affected UI surface, verify applicable light/dark/high-contrast themes, compact/comfortable density, keyboard access, pointer targets, focus, resize/text zoom and loading/error/dirty/empty states. New behavior needs meaningful interaction coverage; cosmetic changes need appropriate visual verification, not tests that merely restate CSS.

Before completion, produce a UI compliance report with PASS/FAIL/BLOCKED/NOT_RUN per applicable check, actual commands/results, commit, environment and limitations. Missing evidence MUST NOT be reported as PASS. Failed or blocked required gates prevent progression/archive under the project workflow. Baselines are not auto-approved.

Changes to MUST rules, token contracts, workbench behavior or brand assets require the corresponding approved specification/ADR change. Routine choices within existing components/tokens do not require another user confirmation. The agent must not broaden a small UI task into an unrelated migration.

The guide becomes binding for new changes after this section and the canonical docs are integrated. Branch/CI enforcement must be verified separately; an AGENTS instruction alone is not a technical merge protection.
