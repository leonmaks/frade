# Diagram editor presentation delta

## Purpose

Provide a stable shared light editing environment for native and embedded diagrams while preserving authored appearance and system accessibility overrides.

## ADDED Requirements

### Requirement: Stable light editor environment

Both diagram editors SHALL use the same fixed light presentation scope when Windows forced colors is inactive, independently of the selected application theme. External workbench surfaces SHALL retain the selected theme.

#### Scenario: All application selections
- **GIVEN** a native and an embedded diagram are open
- **WHEN** Light, Dark, System, High Contrast or VS Code Dark 2026 is selected with forced colors inactive
- **THEN** both editor environments remain light while the external workbench follows its selection

#### Scenario: System appearance changes
- **WHEN** OS light/dark preference changes while application mode is System
- **THEN** editor colors remain light without replacing editor instances or changing the global selection

### Requirement: Common editor surfaces and density

The editor scope SHALL include its canvas, toolbars, palettes, property/format/reference/flow panels, messages, tooltips, menus and application-rendered dialogs. Comparable controls SHALL share semantic styles and independent compact/comfortable/coarse accessibility minima.

#### Scenario: Comparable controls in both engines
- **WHEN** text fields, buttons, menu rows, selected items and dialogs are compared at the same density, fonts and scale
- **THEN** their declared shared color, typography, spacing, border, focus and target-size values match the common editor contract

#### Scenario: Available and unavailable capabilities
- **WHEN** a control exists in only one engine
- **THEN** its actual state is verified without inventing an equivalent action in the other engine

### Requirement: Ownership survives portal placement

Editor-owned overlays SHALL inherit the editor presentation by explicit owner identity even outside its DOM subtree. Global overlays SHALL retain application presentation; stale, closed or reassigned ownership MUST NOT leak light styles.

#### Scenario: Owned popup outside editor root
- **WHEN** a diagram opens a submenu, color picker or dialog in a shared portal or frame body
- **THEN** that surface remains light and its existing keyboard, focus and dismissal behavior is preserved

#### Scenario: Simultaneous global and editor overlays
- **WHEN** a global theme picker and an editor-owned popup are exercised with two editor instances
- **THEN** each surface retains its proper owner and disposing either editor does not restyle the other or the workbench

### Requirement: Neutral canvas and decorative dot grid

The neutral workspace SHALL use canvas color #F9FAFC and dot color #CDD3DC in both editors outside forced colors. Grid rendering SHALL preserve semantic grid size, origin, snapping and navigation transforms. Explicit authored page backgrounds and images SHALL remain authoritative.

#### Scenario: Neutral workspace and authored page
- **WHEN** default and explicitly colored/image-backed pages are opened in both editors
- **THEN** neutral workspace colors match while authored page paint remains unchanged and export receives no UI grid or workspace-color injection

#### Scenario: Pan zoom and grid visibility
- **WHEN** the user pans, zooms or uses the existing grid toggle
- **THEN** visible grid phase follows the existing transform and semantic coordinates, snap results and document settings remain unchanged

### Requirement: Authored appearance remains faithful

Theme transitions SHALL preserve authored fill, stroke, text, opacity, gradients, images and appearance attributes without inversion or tinting. Palette/style samples and canvas objects SHALL use the same supported appearance values and comparable backdrops. UI selection decorations SHALL remain distinct from authored paint.

#### Scenario: Palette to canvas fidelity
- **WHEN** a supported opaque or translucent style is previewed and applied
- **THEN** the palette reports the same attributes used on canvas, alpha is compared over a matching backdrop, and unsupported features are disclosed

#### Scenario: Existing authored and inherited styles
- **WHEN** documents with explicit and inherited styles pass through preview, commit, cancel, restart and editor switching
- **THEN** no theme operation changes serialized attributes, domain-resolved paint, undo history or repository content

### Requirement: Windows forced colors retains priority

When Windows forced colors is active, editor UI and accessible rendering SHALL use the existing system-controlled mapping instead of the fixed light palette. Original authored values and the user's application theme preference SHALL remain unchanged.

#### Scenario: Enter and leave forced colors
- **WHEN** forced colors is enabled and then disabled with dirty diagrams and open editor panels
- **THEN** system mapping takes precedence while active and the light editor returns afterward without author-style or preference mutation

### Requirement: Shared appearance without engine replacement

Cross-engine parity SHALL cover declared common presentation roles and supported appearance fixtures. It MUST NOT require equal feature sets, universal raster identity or semantic conversion between diagram formats.

#### Scenario: Unsupported gradient or font behavior
- **WHEN** an appearance capability lacks equivalent support or rendering differs
- **THEN** the report identifies the specific engine limitation and no exact-parity PASS is claimed for it

### Requirement: Accessible editor interaction

Keyboard access, real accessible names/states, visible unclipped focus, modal ownership, readonly behavior, text zoom and applicable reflow SHALL remain valid in the fixed light scope and forced colors. Existing document actions and shortcuts SHALL retain their meaning.

#### Scenario: Keyboard and modal lifecycle
- **WHEN** a user opens and dismisses editor menus/dialogs by keyboard, including after resize and 200 percent text zoom
- **THEN** actions remain available, disabled actions stay inactive, focus remains visible and returns to the connected opener without trapping unrelated editors

### Requirement: Evidence and acceptance are surface specific

Closure SHALL require current screenshots and behavior evidence for both engines, external application themes, both densities and forced colors. Historical results SHALL remain immutable, and missing or unavailable coverage MUST NOT be reported as PASS. New visual baselines require human acceptance.

#### Scenario: Historical baseline no longer describes editor colors
- **WHEN** an approved light-editor expectation supersedes an older theme-colored editor screenshot
- **THEN** the old source/result is retained, the exact changed expectation is mapped to this contract and the new actual screenshots are reviewed separately
