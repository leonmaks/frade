# Visual contract decision — FULL REPLACEMENT TEXT ACCEPTED

Baseline: `frade-ka-workbench-pilot/specs/repository-workbench/spec.md`, WB-001, plus `docs/ka-workbench/vscode-parity.md`. Capability exists only in that unarchived change. Do not edit or archive it as a side effect of UI adoption.

| Existing approved assertion                          | New guide v1.0                                   | Conflict                                                                |
| ---------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| Dark #1F1F1F editor, #181818 sidebar, #0078D4 accent | Dark #181A1F / #202329 / #89B4FF; equal Light/HC | exact-color assertions cannot both pass                                 |
| Sidebar default 300, explorer row 22, indent 14      | sidebar 280, compact row 28, indent 16           | geometry exceeds ±1 reference tolerance                                 |
| Status 22, breadcrumbs 26, tabs/title 35             | status 28, breadcrumbs 28, tabs/title 36         | status/breadcrumbs conflict; ±1 tabs/title still need explicit contract |
| Focus outline 1 with offset -1 in implementation     | focus minimum 2 with offset 2                    | current focus cannot satisfy new component contract                     |

Full replacement text for WB-001, explicitly accepted by the user on 30 September 2026 (verbatim text preserved):

> Workbench SHALL preserve the VS Code workbench composition and applicable interaction model while using Frade UI Style Guide v1.0 for explicitly approved migrated presentation surfaces. Each migration SHALL identify affected surfaces, guide/rule version, theme/density/viewport/font/scale matrix and accepted visual evidence. Untouched surfaces SHALL retain their previously approved visual contract. Differences from the historical VS Code reference SHALL be recorded by scope; the historical reference and assertions MUST NOT be weakened or overwritten to hide a failing gate. Cards SHALL remain in the editor area beside the primary navigator. Behavior WB-002–WB-007 and standalone Draw/domain compatibility remain unchanged.
>
> #### Scenario: Compare migrated workbench surfaces
>
> - **WHEN** a migrated surface is verified in its approved theme/density/viewports
> - **THEN** it is compared against explicitly accepted Frade baselines and applicable FDS/A11Y rules; missing evidence or deviations beyond the approved tolerance fail the review
>
> #### Scenario: Retain untouched surface parity
>
> - **WHEN** a surface outside the approved migration scope is verified
> - **THEN** its existing VS Code/Draw baseline and behavior assertions remain applicable and unchanged

Authority and ownership: see `wb001-acceptance-2026-09-30.md` for the user's confirmation, accepted text hash and explicit supersession record. This UI change owns the successor capability. The unarchived pilot remains unchanged; its archive/sync owner must consume this record and preserve historical assertions without reinstating obsolete fidelity for approved migrated surfaces. No fictitious MODIFIED main spec is created here. Independent foundation PRE reviews the proposed archive/sync mechanics. Text acceptance is not PRE, product implementation or acceptance of new screen baselines. The decision does not change routing, persistence or API contracts.

Under root AGENTS §18 and the user's accepted independent-feature process, routing repair/closure/PRE is not a UI prerequisite. Routing owns conditional adoption/revalidation in its consumer stage. Root UI AGENTS integration still requires this foundation's own independent PRE and exact additive scope; do not update routing baselines, fingerprints or gate code here.
