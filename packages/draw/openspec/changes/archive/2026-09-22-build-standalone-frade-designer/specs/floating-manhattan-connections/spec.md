## Purpose

Defines deterministic, obstacle-safe orthogonal connections whose default endpoints float on supported shape contours.

## ADDED Requirements

### Requirement: Floating contour attachment

An ordinary connection SHALL persist source and target node IDs in floating mode, not fixed contour coordinates. The resolved attachment points MUST lie on the supported figure contour and may change after route, node position, node size, or obstacle changes.

#### Scenario: Slide a straight floating connection

- **WHEN** a user moves a horizontal straight connection vertically within both rectangles' valid side intervals
- **THEN** both attachments slide along their contours, both node IDs remain unchanged, and no unnecessary bend is introduced

### Requirement: Perpendicular rectangular terminals

For axis-aligned rectangular contours, the first route segment SHALL align with the source outward side normal and the final directed segment SHALL align with the target inward normal.

#### Scenario: Resolve right-to-left connection

- **WHEN** a floating connection is routed from the right side of one rectangle to the left side of another
- **THEN** its first segment points rightward and its final segment points rightward into the target

### Requirement: Stable dynamic attachment selection

The router SHALL select terminal sides deterministically and MUST avoid side oscillation for small equivalent changes. Explicit fixed-port connections MUST retain their port IDs and MUST NOT silently convert to floating mode.

#### Scenario: Preserve fixed-port compatibility

- **WHEN** an adjacent segment of an explicitly fixed connection is edited
- **THEN** its source and target port identities remain unchanged

### Requirement: Manhattan routing and preview

Committed and preview connections SHALL use obstacle-aware Manhattan geometry with rounded rendering, must not cross non-terminal node bodies, and must reject invalid loops or terminal re-entry. While dragging a new connection over a valid node, the whole node SHALL be highlighted and committing SHALL bind the edge to that node without a port in floating mode.

#### Scenario: Avoid an intermediate obstacle

- **WHEN** a floating edge is routed between two nodes separated by another node
- **THEN** every logical route segment is horizontal or vertical and no segment crosses the intermediate node
