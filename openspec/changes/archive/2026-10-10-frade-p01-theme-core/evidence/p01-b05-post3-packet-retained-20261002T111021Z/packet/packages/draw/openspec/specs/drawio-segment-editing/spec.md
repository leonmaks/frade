# drawio-segment-editing Specification

## Purpose

Lets users directly reshape orthogonal connections by dragging derived segments while preserving valid, visible route geometry.

## Requirements

### Requirement: Symmetric floating rectangle editing

Floating rectangle segment editing SHALL use the same geometric policy under
left/right reflection, top/bottom reflection, axis transposition and source/target
reversal. A corridor sweeping across the opposite terminal SHALL resolve that
terminal on the approached side instead of crossing its body or retaining a
backtracking route. Releasing and reselecting SHALL preserve these rules.

#### Scenario: Reflect or reverse an interaction

- **WHEN** a valid segment interaction and its figures are reflected, transposed or edge-reversed
- **THEN** the resulting geometry obeys the equivalent transformed contour and direction constraints

#### Scenario: Sweep through the opposite figure and reselect

- **WHEN** a user moves a corridor across the opposite floating rectangle, releases it and starts another drag
- **THEN** the corridor follows the pointer through valid side transitions without terminal re-entry, self-intersection or 180-degree reversal

#### Scenario: Move a straight floating connection

- **WHEN** the user moves a direct connection inside the figures' common attachment interval and then beyond it
- **THEN** it remains straight inside the interval and creates a valid contour-attached detour outside it

### Requirement: Derived segment handles

Selecting an orthogonal edge SHALL reveal one temporary handle for every eligible normalized segment; unselected edges SHALL show none. Handles MUST be circular and centered. Horizontal segments use `row-resize`; vertical segments use `col-resize`, perpendicular to the segment, matching pinned Draw.io.

#### Scenario: Generate handles without manual vertices

- **WHEN** a selected routed edge has three eligible orthogonal segments and no manual waypoints
- **THEN** the editor displays one handle per eligible segment

### Requirement: Live perpendicular editing

Dragging a horizontal handle SHALL change only its graph Y coordinate; dragging a vertical handle SHALL change only its graph X coordinate. During drag, the same real edge MUST remain visible with its semantic style, markers, and rounded connector; a dashed technical preview MUST NOT replace it.

#### Scenario: Drag during pointer capture

- **WHEN** a user drags a horizontal segment and has not released the pointer
- **THEN** the real rendered edge follows a valid orthogonal live route at the requested Y coordinate

### Requirement: Floating terminal editing and detours

An editable terminal segment of a floating connection MAY slide its attachment along the applicable contour. If sliding cannot satisfy a requested coordinate, the editor SHALL construct a valid orthogonal detour or retain the last valid route. Fixed terminal stubs remain protected.

#### Scenario: Create a detour outside the attachment interval

- **WHEN** a straight floating edge is dragged beyond both endpoint side intervals
- **THEN** its endpoints remain on their contours and a valid orthogonal detour is used

### Requirement: Atomic persistence and history

A completed segment drag SHALL create exactly one undoable operation and persist only canonical route constraints. Escape, pointer cancellation, deletion, deselection, and graph disposal SHALL safely cancel active editing without a committed history entry.

#### Scenario: Restore an edited segment

- **WHEN** a user commits a segment drag, saves the diagram, reloads it, and executes undo then redo
- **THEN** the route constraint and resulting valid geometry are restored at each step

### Requirement: Route validity and compatibility

Candidate and committed routes SHALL be normalized and validated for zero-length segments, diagonals, reversal, self-intersection, terminal re-entry into their own endpoints. Unrelated shapes and diagram elements MUST NOT affect initial routing, preview, dragging, endpoint changes or document restoration. Legacy manual-vertex routes MUST load without corruption and are editable when orthogonal.

#### Scenario: Cross an unrelated figure

- **WHEN** a segment is dragged through a figure other than its endpoints
- **THEN** the segment follows the pointer and the unrelated figure does not constrain or rewrite the route
