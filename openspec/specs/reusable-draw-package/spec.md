# reusable-draw-package Specification

## Purpose

Preserves the proven Frade Draw editor as a standalone local-first product and exposes it as a reusable, host-neutral package for later Frade desktop and web applications.

## Requirements

### Requirement: Standalone and embeddable editor

The Draw package SHALL provide a documented React integration entry point and SHALL remain runnable as a standalone browser application. Embedding the editor MUST NOT require Electron, a repository backend, or a remote service.

#### Scenario: Embed Draw in a host

- **WHEN** a React host mounts the documented Draw editor entry point in a supplied container
- **THEN** the editing canvas initializes and disposes without relying on Node.js or privileged host APIs

#### Scenario: Run Draw standalone

- **WHEN** a developer starts the Draw package's standalone development application
- **THEN** the same production editor implementation is available for interactive use and browser verification

### Requirement: Local diagram lifecycle compatibility

The migrated editor SHALL create, open, save, and save-as versioned JSON diagram documents locally. A malformed or unsupported document MUST leave the currently open diagram intact, and a supported round trip MUST preserve nodes, edges, route constraints, and viewport state without transient interaction state.

#### Scenario: Round-trip a migrated diagram

- **WHEN** a user saves a diagram containing nodes and edges and opens that document in the migrated package
- **THEN** supported graph content, route constraints, and viewport state are restored with the same observable behavior as the source editor

### Requirement: Existing diagram editing behavior

The migrated editor SHALL retain the source editor's rectangle, rounded rectangle, ellipse, diamond, and text shapes; stable identities; labels and styling; selection; move and resize; deletion; undo and redo; grid, pan, zoom and fit controls; and SVG and PNG export.

#### Scenario: Move a connected node

- **WHEN** a user moves a selected node that has connected edges
- **THEN** the node position changes and each affected edge is recalculated according to the existing routing policy

#### Scenario: Export a non-empty diagram

- **WHEN** a user exports a visible non-empty graph to SVG or PNG
- **THEN** the generated output represents the visible graph without requiring a backend

### Requirement: Floating Manhattan connection compatibility

The migrated editor SHALL retain deterministic floating contour attachments, perpendicular rectangular terminal directions, obstacle-aware orthogonal routing, rounded rendering, fixed-port identity, connection-creation isolation, and unrelated-figure placement isolation. Supported operations MUST NOT introduce diagonal segments, terminal re-entry, self-intersection, or unrequested rerouting of unrelated edges.

#### Scenario: Route around an obstacle

- **WHEN** a floating edge is created between two nodes separated by a non-terminal node
- **THEN** every logical segment is orthogonal and the route does not cross the intermediate node

#### Scenario: Preserve an unrelated connection

- **WHEN** a non-terminal figure is added, moved, or resized over an existing connection
- **THEN** the connection's logical route and rendered path remain unchanged

### Requirement: Segment editing compatibility

The migrated editor SHALL retain derived segment handles, live perpendicular manipulation of the real styled edge, valid floating-terminal detours, atomic undoable persistence, safe cancellation, legacy orthogonal route loading, and route validation.

#### Scenario: Commit a segment drag

- **WHEN** a user drags an eligible segment and releases it at a valid position
- **THEN** the visible edge follows a valid orthogonal route during the interaction and the completed drag creates exactly one undoable operation

#### Scenario: Reject an invalid candidate

- **WHEN** a requested segment position would collide with an obstacle or violate route validity
- **THEN** the invalid candidate is not committed and the last valid route remains available

### Requirement: Source regression preservation

The migrated package MUST retain executable coverage for the source editor's unit, Gherkin-mapped, property-oriented geometry, real-browser interaction, and deterministic screenshot scenarios. Migration changes MUST NOT silently replace or weaken a source scenario to obtain a passing result.

#### Scenario: Compare source and migrated verification

- **WHEN** the migration verification suite runs against the Draw package
- **THEN** all applicable source scenarios execute from their migrated locations and report equivalent or stronger assertions
