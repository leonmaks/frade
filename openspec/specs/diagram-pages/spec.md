# Diagram pages Specification

## Purpose

Define the multipage Frade Draw document lifecycle, reversible page operations and accessible page navigation while preserving complete drawings and the established editor presentation.

## Requirements

### Requirement: Pure native semantic facade

The workspace native-document comparator SHALL consume the existing declared @frade/draw/document pure facade without initializing React, X6 or DOM UI. Its source boundary SHALL authorize only that exact additional public entry for ui-workspace; dependency permissions and other private, deeper, escaping or privileged imports SHALL remain rejected.

#### Scenario: Validate semantic consumer imports

- **WHEN** the workspace comparator imports the pure document facade
- **THEN** the exact public entry passes the boundary, undeclared/private/deeper entries fail, no new package dependency is granted, and pure codec/comparator tests execute without UI initialization

### Requirement: Multipage document compatibility

Frade Draw SHALL represent an ordered, nonempty collection of pages with stable unique page IDs and nonempty names. Each page SHALL own its graph and optional viewport. Version-1 Frade Draw/Designer documents SHALL open losslessly as one page. Version-2 documents SHALL preserve every page through standalone and repository Save/Open/Save As/Discard.

#### Scenario: Legacy and multipage round trips

- **WHEN** a legacy file is opened, a second page is added, both pages are edited, and the file is saved and reopened
- **THEN** both page graphs and their supported styles, constraints, port identities, edited vertices and references are restored, with no transient interaction properties

### Requirement: Legacy and transient state boundaries

The existing exported single-graph APIs SHALL retain version-1 compatibility. Explicit page operations SHALL produce version-2 files; untouched legacy single-page files SHALL retain their existing format. Active page, selection, handles, menus, history and drag previews SHALL remain session state.

#### Scenario: Unchanged legacy drawing

- **WHEN** a legacy single-page file is opened and saved without page operations
- **THEN** its format remains version 1 and no transient state is serialized

#### Scenario: Invalid inactive page

- **WHEN** any page has malformed geometry, duplicate cell IDs within its graph, dangling terminals, duplicate page IDs, an empty name or an unsupported version
- **THEN** opening SHALL fail before replacing any current content, viewport, history or document metadata

### Requirement: Page operations and selection

The bottom strip SHALL always display the current document's pages and an insert control. Insert SHALL append a new empty page, choose the first unused localized numbered name starting at page-count plus one and activate it. Duplicate SHALL insert an independent copy immediately after its source with a new page ID, remapped cell IDs/terminals, copied repository references and localized copy name; its viewport SHALL reset to default zoom/pan, matching the pinned editor.

#### Scenario: Independent duplicate

- **WHEN** a user duplicates a page with connected nodes and repository references and edits the copy
- **THEN** the source graph is unchanged, copied terminals reference copied nodes, and references still identify the same repository objects

### Requirement: Rename and remove pages

Rename SHALL use a modal with current name, confirm and cancel; empty names SHALL leave the page unchanged. Duplicate names SHALL remain valid. Remove SHALL select the next neighbor, or previous if removing the last indexed page; removing the sole page SHALL replace it with a new empty first page.

#### Scenario: Cancel rename

- **WHEN** a user opens Rename and cancels or submits an empty name
- **THEN** page identity, content and history remain unchanged

#### Scenario: Remove the sole page

- **WHEN** the only page is removed
- **THEN** one new empty numbered page remains and one Undo restores the removed page and its content

### Requirement: Page navigation and order

Reordering SHALL work by drag and by a Move menu listing destination pages. Page navigation SHALL preserve content and restore that page's viewport without marking semantic content dirty.

#### Scenario: Reorder without dragging

- **WHEN** the user chooses another page in the active page's Move submenu
- **THEN** the active page moves to that destination's index and all graph data remain unchanged

### Requirement: Page list commands

The page-list menu SHALL provide Insert, all pages with active indicator, Sort Pages and Delete All in pinned-source order. Sort SHALL use natural case-insensitive comparison in the explicitly selected editor locale, preserving relative order of equal names and the active page. Delete All SHALL replace all pages with one empty first page. Each command SHALL be a single undoable operation and SHALL be disabled in readonly mode.

#### Scenario: Sort and clear all

- **WHEN** pages named Page-10, Page-2 and Page-1 are sorted and then Delete All is invoked
- **THEN** sorting produces Page-1, Page-2, Page-10, clearing leaves one empty first page, and two Undo operations restore the original pages, order and content

### Requirement: Standalone page extraction

The standalone page menu SHALL provide Open in New Window as the pinned source does outside embed mode. It SHALL open an independently editable copy of the selected page in the same application, retaining supported authored content and references without write-back to the source drawing. The embedded page menu SHALL omit this item as the pinned embedded source does.

#### Scenario: Open a page separately

- **WHEN** a standalone user chooses Open in New Window and edits the new drawing
- **THEN** only the selected page is copied, both drawings remain independently editable, and the source drawing is unchanged

### Requirement: Unified reversible history

Insert, duplicate, rename, remove and reorder SHALL each be one reversible action in the same chronological undo/redo sequence as committed graph edits. Switching pages SHALL neither clear history nor add an undo action. Undo/redo SHALL restore the relevant page and its graph without leaking commands into other documents. New/Open/Discard SHALL reset the session history. A canceled or rejected page operation SHALL leave content, history and dirty state unchanged.

#### Scenario: Interleaved graph and page changes

- **WHEN** a shape is edited on page A, page B is inserted and edited, and Undo is invoked three times
- **THEN** the edit on B, insertion of B, and edit on A are reverted in that order; Redo restores the same order and exact supported graph data

#### Scenario: Navigation keeps history

- **WHEN** a user edits a shape, switches to another page and back, then invokes Undo
- **THEN** the shape edit can still be undone and navigation has not marked the document dirty

### Requirement: Pinned Draw.io bottom-strip presentation

The native bottom strip SHALL match the bundled unmodified Draw.io 31.5.2 page strip in the existing editor Light presentation, through the existing shared scoped adapter. Feature color literals and a second theme resolver are forbidden. Original vendor files SHALL remain unchanged. Supported source icons SHALL use the existing approved shared icon/source contract.

#### Scenario: Comparable default strip

- **WHEN** native and pinned embedded Draw.io show the same three named pages at equal viewport and zoom
- **THEN** relative bounds, label/control spacing and supported computed styles match, with only explicitly documented accessibility/integration exceptions
- **AND** the strip spans editor width under the canvas, is 32 CSS px high at default text/fine pointer, uses 13px source typography, 12px/20px outer padding, 30px controls with 4px margins, 8px scroller margins, 16px page inset, an active-only options control and source-derived background/border/hover/active styles

### Requirement: Reference comparison evidence

Geometry and rendered-state comparisons SHALL use unmodified local pinned source with identical viewport, platform, font, labels and state; screenshots and DOM measurements SHALL be retained. Online current Draw.io observations SHALL be labeled supplementary. Exact raster equality SHALL NOT be claimed from CSS matching alone.

#### Scenario: Compare a rendered state

- **WHEN** reference parity is verified
- **THEN** evidence records source hashes, matching environment and actual measured/rendered results with exceptions

### Requirement: Overflow and page menus

Tabs SHALL scroll horizontally under overflow and a page-list control SHALL keep every page reachable. Page context/options menus SHALL expose the same embedded-editor page operations and order as the pinned source. Native context actions SHALL target the clicked page, including an inactive tab. Overflow SHALL not hide insert or page-list controls.

#### Scenario: Operate on an inactive page

- **WHEN** a user opens the context menu on an inactive tab
- **THEN** its actions target that tab and the named page remains reachable under overflow
- **AND** overflow scroll chevrons, active menu glyphs and label truncation retain the reference geometry; the native footer omits the jgraph/drawio icon and external attribution link as explicitly requested by the user on27 October2026, while repository source/license provenance is retained

### Requirement: Existing editor theme ownership

The bottom strip SHALL preserve the approved editor Light presentation and external appearance isolation, with forced-colors taking system priority.

#### Scenario: External theme and density

- **WHEN** application Light/Dark/System/High Contrast or compact/comfortable changes
- **THEN** the editor retains the previously approved pinned Light presentation and geometry, without preference or document mutation; forced-colors takes system priority

### Requirement: Accessible page strip and lifecycle integration

Every action SHALL have an accessible localized name and keyboard access. Selection SHALL expose selected state; arrows/Home/End SHALL navigate, Enter/Space activate, and Shift+F10 or the options control open the page menu. Menus SHALL support arrows, Enter and Escape; rename SHALL manage and restore focus. Dragging SHALL have the Move-menu alternative and Escape cancellation. Active pages SHALL scroll into view.

#### Scenario: Keyboard page editing

- **WHEN** a user navigates the strip, opens a menu, confirms/cancels Rename and reorders without dragging
- **THEN** actions execute by keyboard and focus returns to the relevant visible tab

### Requirement: Accessibility and readonly boundary

Pointer targets SHALL satisfy A11Y-004; coarse-pointer, text-zoom and forced-colors exceptions to pinned visuals SHALL be enumerated and verified. Readonly SHALL permit page navigation while rejecting all mutation paths.

#### Scenario: Readonly and keyboard

- **WHEN** a readonly diagram with overflowing page tabs is navigated by keyboard
- **THEN** every page remains reachable, selection/focus are visible and graph/page modification controls cannot mutate content

### Requirement: Host lifecycle integration

Loading/error/dirty states SHALL preserve every page; repository-bound save SHALL serialize the complete document, and page switching SHALL close stale page-specific flow UI and refresh references/appearance safely.

#### Scenario: Repository save and discard

- **WHEN** pages with repository objects are changed, saved, changed again and discarded
- **THEN** all saved pages return with their references intact, later unsaved pages disappear, stale flow panels close, and page navigation does not write repository objects

### Requirement: Scoped cumulative control adoption

Necessary shared-file changes SHALL preserve historical source/execution evidence through an explicit reviewed original-to-adopted mapping. Historical verification SHALL validate exact adopted live bytes before reading exact original bytes, retaining original manifests, report pins and meaningful assertions. Unknown drift or missing evidence SHALL fail closed.

#### Scenario: Validate cumulative source adoption

- **WHEN** an independent feature necessarily changes an input of an archived exact-source proof
- **THEN** the closed mapping validates both original and adopted bytes, historical proof remains immutable, fresh current tests execute, and a one-byte undeclared/live/origin mutation fails

### Requirement: Fresh current execution binding

Fresh current executions SHALL independently bind adopted/new product and test bytes to actual results. Historical runtime PASS SHALL NOT be relabeled as current-candidate runtime PASS.

#### Scenario: Check the adopted implementation

- **WHEN** adopted source is verified
- **THEN** new exact-input executions provide current evidence independently of the retained historical proof

#### Scenario: Preserve current main edits and historical assertion strength

- **WHEN** main contains the preserved dependency changes and different source checkout line endings
- **THEN** individually hash-bound historical origins replay exact original bytes without changing the11 LDE assertions, all current inputs bind fresh actual executions, undeclared live/origin/report drift is rejected, and the user's tracked/untracked bytes remain unchanged

#### Scenario: Native footer without external branding

- **WHEN** the native editor renders its footer in normal, overflow, readonly or accessible presentation states
- **THEN** no jgraph/drawio icon, link or branding focus stop is present and page controls, keyboard navigation, persistence and accepted accessibility behavior remain available

#### Scenario: Exact generated inventory after Git checkout

- **WHEN** the generated Draw.io source inventory is checked out with core.autocrlf true or false
- **THEN** its one-file nested attribute restores exact generated LF bytes, other token files retain their existing rules, the attribute participates in current input binding, and semantic or unregistered raw drift still fails the unchanged generator/source checks

### Requirement: Exact legacy color coordinate adoption

Any legacy color coordinate migration SHALL require proof that all literal values, declaration contexts, count and classifications remain unchanged.

#### Scenario: Preserve legacy color boundaries

- **WHEN** surrounding authorized edits shift an unchanged existing color declaration
- **THEN** exact old/new coordinate proof preserves its original classification, while any added color or changed declaration context fails the existing gate

### Requirement: Idempotent presentation publication

Repeated equal editor appearance SHALL avoid redundant owned DOM/style mutations while validating and repairing actual altered values, priorities or missing/changed owned stylesheet. Every revision SHALL still satisfy the existing parent/frame paint barriers, opacity, ownership, semantic preservation and durable publication contracts within the unchanged150ms hot-commit budget.

#### Scenario: Reapply equal appearance and repair changed projection

- **WHEN** a new transaction uses equal editor appearance, or an owned property/priority/stylesheet was changed or detached
- **THEN** equal owned values and connected byte-identical stylesheet are retained, actual drift is repaired, the exact new revision waits for both original paint boundaries and durable readback, and existing diagram semantics/preferences remain unchanged
