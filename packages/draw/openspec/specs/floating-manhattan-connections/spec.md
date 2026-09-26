# floating-manhattan-connections Specification

## Purpose

Defines deterministic, obstacle-safe orthogonal connections whose default endpoints float on supported shape contours.

## Requirements

### Requirement: Floating attachments during node motion

Moving or resizing a rectangular endpoint SHALL recompute both floating contour
attachments and render the validated orthogonal route consistently. Anchors from
previous segment edits SHALL NOT remain attached to an obsolete side. The
rendered route SHALL NOT enter either figure through its interior.

#### Scenario: Orbit in both directions

- **WHEN** either endpoint is dragged around the other and back, for either edge direction
- **THEN** every accepted position has orthogonal geometry, outward source exit, inward target entry and no self-intersections

#### Scenario: Orbit after editing a corridor

- **WHEN** a floating edge has been edited by segment drag before moving its endpoint around the other figure
- **THEN** old anchors and old routing mode do not introduce diagonals or attach through the figure to its far side

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

When creating or explicitly rerouting a connection, committed and preview routes SHALL use obstacle-aware Manhattan geometry with rounded rendering, avoid non-terminal node bodies, and reject invalid loops or terminal re-entry. Placing an unrelated figure over an already drawn connection is an explicit exception: the connection SHALL remain unchanged. While dragging a new connection over a valid node, the whole node SHALL be highlighted and committing SHALL bind the edge to that node without a port in floating mode.

#### Scenario: Avoid an intermediate obstacle

- **WHEN** a floating edge is routed between two nodes separated by another node
- **THEN** every logical route segment is horizontal or vertical and no segment crosses the intermediate node

### Requirement: Connection creation isolation

Starting or cancelling a new connection SHALL NOT mutate the route, terminals, or rendered path of existing connections.

#### Scenario: Click a connection magnet on an already connected rectangle

- **GIVEN** two rectangles have an existing floating connection, including one previously rerouted by moving a node or editing a segment
- **WHEN** the user presses and releases the connection magnet on either rectangle without connecting another node
- **THEN** the existing logical route and SVG path remain unchanged during the press and after release
- **AND** no temporary connection remains after release

### Requirement: Unrelated figure placement isolation

Adding, moving, or resizing a figure that is not an endpoint of an existing connection SHALL NOT change that connection's geometry or SVG path, even when the figure overlaps the connection. Such overlap is allowed without automatic obstacle avoidance. Moving or resizing an endpoint may still reroute its own connections.

#### Scenario: Place a new figure over an existing connection

- **GIVEN** an existing connection between figures A and B
- **WHEN** another figure is added, dragged, or resized near or over the connection
- **THEN** the existing route and rendered path remain exactly unchanged

#### Scenario: Add a palette figure after creating a connection with the mouse

- **GIVEN** two rectangles created with the rect button, with the second moved away and connected to the first by a real pointer drag
- **WHEN** the user adds another figure with any palette button, overlapping the first rectangle
- **THEN** both original figures retain their positions and sizes and the existing connection retains its logical segments and SVG path
