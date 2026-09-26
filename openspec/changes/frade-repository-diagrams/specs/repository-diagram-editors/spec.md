## ADDED Requirements

### Requirement: Ordinary diagram tabs

The system SHALL open diagram files in ordinary preview or pinned editor tabs alongside object cards, supporting ordering, editor groups, restoration and Save, Save All, Discard and Cancel.

#### Scenario: Dirty document lifecycle

- **WHEN** a diagram is edited and its tab or workspace is closed
- **THEN** the common dirty guard offers saving, discarding or cancelling and preserves the draft on failure or cancellation.

#### Scenario: Switch editor tabs

- **WHEN** a user switches between a diagram and a card or reorders them
- **THEN** diagram edits and editor state remain available without entering a separate Draw mode.

### Requirement: Explicit diagram object scope

The system MUST restrict diagram object insertion to the owning repository and explicitly connected external catalogs described separately, preserving stable source and object identities in XML metadata.

#### Scenario: Multiple repository roots

- **WHEN** two roots are open and a diagram belongs to one
- **THEN** drops reject objects from the other root unless they are independently declared through an explicit external catalog.

#### Scenario: Unresolved object reference

- **WHEN** a referenced object or external source is unavailable
- **THEN** its diagram cell remains intact and the unresolved reference is visible without automatic rebinding.

### Requirement: Native Frade repository integration

The system SHALL select Frade Draw for `.frade` and Draw.io for `.drawio`, using the shared file and tab lifecycle. Frade Draw SHALL preserve typed object references, expose host events and update bound captions in near real time after repository events.

#### Scenario: Bound object changes

- **WHEN** an object referenced by an open `.frade` diagram is renamed through its repository
- **THEN** its diagram caption updates after the repository event without reopening the diagram and the updated snapshot can be saved.

#### Scenario: Activate a bound cell

- **WHEN** the user activates a bound local Frade Draw node
- **THEN** the corresponding repository object card opens without changing the node's object identity.

### Requirement: Navigator insertion on both canvases

The system SHALL accept repository objects dragged from the navigator onto Draw.io and Frade Draw canvases at the drop position, preserving stable reference identity, view transforms, undo and shared persistence. Neither editor SHALL show a separate repository object picker panel.

#### Scenario: Drop a local or external object

- **WHEN** a user drags an object from the owning repository or an explicitly connected catalog onto either canvas
- **THEN** a bound node is inserted at the drop position and can be undone and saved through the common lifecycle.

#### Scenario: Reject an unauthorized drop

- **WHEN** a drag belongs to another repository, an unavailable source, or a read-only destination
- **THEN** no node is added and existing diagram content remains unchanged.

### Requirement: Configurable system notation

Both editors SHALL insert repository systems as square rectangles with configurable fill, outline, width and shadow derived from target status, change type, placement and parent. Settings SHALL expose and persist the notation under Отображение элементов.

#### Scenario: External subsystem

- **WHEN** a system has external placement and a nonempty parent
- **THEN** both engines use the external blue palette, one-unit outline and no shadow regardless of change type.

#### Scenario: Attribute refresh

- **WHEN** a bound system's visual attributes or notation settings change
- **THEN** Frade Draw and live-enabled Draw.io refresh its managed styles without altering geometry, and the diagram follows the ordinary save lifecycle.

#### Scenario: Manual Draw.io appearance

- **WHEN** Draw.io live synchronization is disabled
- **THEN** existing shapes retain manual appearance while newly dropped systems receive the configured notation.

### Requirement: Empty integration bundles

Both diagram engines SHALL support creating an empty bundle between repository systems using native mouse connection gestures. Empty bundles SHALL default to a solid #404040 line of width 1 in Draw.io UI units, with no arrows at either end, configurable under element appearance.

#### Scenario: Native connection gesture

- **WHEN** the user drags a connection from one resolved system to another
- **THEN** one empty bundle is created, undoable in one action, retaining attached endpoints when systems move and preserving its identity and notation after save/reopen.

#### Scenario: Ordinary connectors and preferences

- **WHEN** existing preferences are upgraded or bundle appearance settings are changed
- **THEN** system preferences survive migration and unrelated connectors retain their notation; read-only diagrams remain unchanged.

#### Scenario: Integration flows deferred

- **WHEN** a bundle is created in this feature
- **THEN** it is empty and no integration flows or repository objects are created.
