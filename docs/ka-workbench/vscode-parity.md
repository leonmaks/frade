# VSCode reference and parity matrix

Reference: installed VS Code **1.136.1**, commit **a44adf7f53e00964ab890f9f8758a334f1fc15bc**, build date 2026-09-03. Windows, Segoe UI, Dark Modern, zoom 100%, device scale 1. Captured in an isolated profile with an opened YAML file. The exact source is [Microsoft vscode](https://github.com/microsoft/vscode/tree/a44adf7f53e00964ab890f9f8758a334f1fc15bc); theme values came from `extensions/theme-defaults/themes/dark_modern.json`, geometry from the running workbench and `out/vs/workbench/workbench.desktop.main.css`.

[Reference geometry](evidence/reference/geometry.json) and screenshots are recorded for 1280×850, 1600×900 and 850×650 **content** sizes. Electron outer-window decorations are excluded from measurements. Capture script: `apps/desktop/reference-capture.mjs`; it uses a temporary Code profile and never changes the user's profile. Font attribution is in `packages/ui-workspace/THIRD-PARTY-NOTICES.md`.

| Element / gesture            | Reference                                   | Workbench assertion / evidence               | Tolerance               |
| ---------------------------- | ------------------------------------------- | -------------------------------------------- | ----------------------- |
| Title / command area         | height 35; #181818                          | editing Electron test, title y=0             | ±1 px; exact token      |
| Activity Bar                 | width 48; 24 px Codicons                    | editing geometry; bundled reference font     | ±1 px                   |
| Main sidebar                 | default width 300; #181818                  | geometry, drag to 370, restart               | ±1 px                   |
| Editor tabs                  | height 35; active top #0078D4               | editing geometry; preview/pinned unit tests  | ±1 px                   |
| Breadcrumbs                  | height 26                                   | editing geometry                             | ±1 px                   |
| Explorer rows                | height 22; 14 px indentation                | CSS/reference; all-138-object UI traversal   | ±1 px                   |
| Status                       | height 22; #181818                          | geometry in three viewports                  | ±1 px                   |
| Editor / inputs              | #1F1F1F / #313131, border #3C3C3C           | shared tokens and screenshots                | exact tokens            |
| Hover / focus / selected     | #2A2D2E / #0078D4 / #37373D                 | CSS, keyboard tree/prompt tests, screenshots | exact tokens            |
| Preview / pin on edit        | single click / double click / edit          | state tests and real card save test          | behavior exact          |
| Groups / tab movement        | shared document, draggable tabs             | state and editing Electron tests             | behavior exact          |
| Resize / hide / restart      | sash, Ctrl+B, persisted layout              | editing + roundtrip Electron tests           | no clipped controls     |
| Tree keyboard                | arrows, Home/End, Enter, focus != selection | Navigator implementation + UI traversal      | behavior exact          |
| Commands / menu / tooltips   | Ctrl+Shift+P, F1, menu actions              | multi-root tests invoke palette              | supported commands only |
| Save / Save All              | Ctrl+S, independent dirty editors           | real A+B/native disk assertions              | behavior exact          |
| Close / Escape               | Ctrl+W and Save/Discard/Cancel              | shared-group, dirty Cancel and quit tests    | behavior exact          |
| Context / roots              | Add/Remove/Rename/Reorder                   | real multi-root scenario                     | behavior exact          |
| Read errors / model settings | root-local unavailable state                | missing path + preview rejection tests       | no model bleed          |
| Diagnostics / bottom panel   | resizable bottom area                       | editing test; baseline diagnostics           | no clipped controls     |

Intentional product differences: the editor contains metadata-driven architecture cards; tree groups are architecture sections/types or source paths; the Activity Bar offers Explorer/Search/Draw/Settings; the status shows repository/backend state. Frade omits VSCode's Git/debug/extensions/accounts/AI controls, minimap, code outline and text-editor status fields because those operations are not part of this pilot. The reference's temporary “extensions disabled” notification is excluded from comparison. Russian labels and Frade branding are intentional. These differences are not counted as generic VSCode feature support.

The screenshot review found and fixed global Draw CSS affecting `main` height and sidebar padding; geometry assertions now require every pane's top and bottom to remain inside the viewport. Standalone Draw styles and approved snapshot files are unchanged.
