## Purpose

Lets users directly reshape orthogonal connections by dragging derived segments while preserving valid, visible route geometry.

## ADDED Requirements

### Requirement: Derived segment handles

Selecting an orthogonal edge SHALL reveal one temporary handle for every eligible normalized segment; unselected edges SHALL show none. Horizontal handles MUST be centered and use `ns-resize`; vertical handles MUST be centered and use `ew-resize`.

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

Candidate and committed routes SHALL be normalized and validated for zero-length segments, diagonals, reversal, self-intersection, terminal re-entry, and obstacle collisions. Legacy manual-vertex routes MUST load without corruption and are editable when orthogonal.

#### Scenario: Reject an obstructed candidate

- **WHEN** a segment is dragged into an obstacle
- **THEN** the invalid candidate is not committed and the last valid route remains available
