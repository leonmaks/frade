## ADDED Requirements

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
