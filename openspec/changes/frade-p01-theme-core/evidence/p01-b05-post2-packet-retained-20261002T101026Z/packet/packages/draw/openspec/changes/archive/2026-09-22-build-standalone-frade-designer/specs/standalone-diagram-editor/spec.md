## Purpose

Provides a self-contained, local-first diagram authoring surface without any architecture repository or remote service dependency.

## ADDED Requirements

### Requirement: Local diagram lifecycle

The editor SHALL create, open, save, and save-as versioned JSON diagram documents locally. A malformed or unsupported document MUST leave the currently open diagram intact.

#### Scenario: Round-trip a diagram

- **WHEN** a user saves a diagram containing nodes and edges and then opens that file
- **THEN** the editor restores its nodes, edges, supported route constraints, and viewport without transient interaction state

### Requirement: Basic diagram editing

The editor SHALL provide rectangle, rounded rectangle, ellipse, diamond, and text nodes with stable IDs, labels, styling, selection, move, resize, deletion, undo, and redo.

#### Scenario: Move a selected node

- **WHEN** a user moves a selected node with connected edges
- **THEN** the node position changes and each affected edge is recalculated

### Requirement: Canvas controls and export

The editor SHALL support grid display, pan, zoom, fit-to-content, SVG export, and PNG export without a backend.

#### Scenario: Export a diagram

- **WHEN** a user exports a non-empty diagram to SVG or PNG
- **THEN** the exported output represents the visible graph
