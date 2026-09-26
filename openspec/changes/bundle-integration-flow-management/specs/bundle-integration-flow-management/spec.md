# Spec Delta

## Purpose

Manage canonical integration flows and independent diagram bundle membership through the repository and diagram interfaces of both editors.

## ADDED Requirements

### Requirement: Canonical flows and independent membership

The application SHALL store only canonical repository references in each diagram bundle. Membership SHALL be duplicate-free, immediate, undoable, redoable and persistent; removing a member or deleting a bundle MUST NOT delete repository flows. Old empty bundles SHALL load with no members.

#### Scenario: BF-01 Open empty Bundle

- Given a diagram contains System A and System B
- And an empty Bundle connects A and B
- And Repository contains three Integration Flows between A and B
- When the user opens Integration Flow Manager
- Then all three flows are listed
- And all membership checkboxes are unchecked
- And the header shows "0" flows in the Bundle.

#### Scenario: BF-04 Existing membership

- Given Bundle A-B already contains F2
- When Flow Manager is opened
- Then F2 membership checkbox is checked.

#### Scenario: BF-05 Include a flow

- Given eligible F1 is not included
- When the user checks "В жгуте" for F1
- Then F1 reference is added to the Bundle
- And F1 Repository object is unchanged
- And the Diagram becomes dirty.

#### Scenario: BF-06 Exclude a flow

- Given F1 is included
- When the user unchecks "В жгуте"
- Then F1 is removed from the Bundle
- And F1 still exists in Repository.

#### Scenario: BF-07 Prevent duplicate membership

- Given F1 is already included
- When an add operation for F1 is executed again
- Then Bundle contains exactly one reference to F1.

#### Scenario: BF-08 Undo inclusion

- Given F1 was just added
- When the user executes Undo
- Then F1 is no longer included.

#### Scenario: BF-09 Redo inclusion

- Given inclusion of F1 was undone
- When the user executes Redo
- Then F1 is included again.

#### Scenario: BF-10 Persist membership

- Given F1 and F3 are included
- When the diagram is saved and reopened
- Then F1 and F3 remain included
- And no Integration Flow attributes are duplicated into the Bundle.

#### Scenario: BF-37 Delete Bundle

- Given Bundle A-B contains F1 and F2
- When Bundle is deleted from Diagram
- Then Diagram Bundle is removed
- And F1 remains in Repository
- And F2 remains in Repository.

### Requirement: Exact endpoints and validation

The application SHALL accept flows matching the exact unordered endpoint pair, including subsystems and both directions. Ineligible or missing references SHALL remain inspectable and removable but SHALL NOT be newly included. Reconnection SHALL require confirmation of incompatible membership removal and SHALL be one atomic undoable change.

#### Scenario: BF-02 Find both directions

- Given Repository contains Flow F1 from A to B
- And Repository contains Flow F2 from B to A
- When Flow Manager is opened for Bundle A-B
- Then F1 is shown as A -> B
- And F2 is shown as B -> A.

#### Scenario: BF-03 Exclude unrelated flows by default

- Given Repository contains Flow F1 A -> B
- And Flow F2 A -> C
- When Flow Manager is opened for Bundle A-B
- Then F1 is shown
- And F2 is not shown.

#### Scenario: BF-16 Return to pair scope

- Given extended search is enabled
- When the user unchecks "Искать во всем репозитории"
- Then only eligible A-B flows remain in the result set.

#### Scenario: BF-30 Broken reference

- Given Bundle contains reference F1
- And F1 no longer exists in Repository
- When the diagram is opened
- Then Flow Manager shows a broken reference
- And the user can exclude the broken reference
- And the application does not crash.

#### Scenario: BF-35 Reconnect Bundle and remove incompatible flows

- Given Bundle A-B contains F1 A -> B
- When the user reconnects endpoint B to System C
- Then the user is warned that F1 becomes incompatible
- When the user confirms
- Then Bundle becomes A-C
- And F1 is removed from Bundle membership
- And F1 remains in Repository.

#### Scenario: BF-36 Undo Bundle reconnect

- Given Bundle A-B with F1 was reconnected to A-C
- And incompatible F1 was removed
- When Undo is executed
- Then Bundle endpoints return to A-B
- And F1 membership is restored.

### Requirement: Docked accessible flow management

Both diagram editors SHALL provide double-click, context-menu and selected-bundle inspector entry points, a nonblocking creation hint and N/M counts in manager controls. On-edge text lists included flow descriptions and status markers. The manager SHALL remain docked and resizable with Navigator and diagram visible, support keyboard actions, status announcements and schema-driven all-attribute details.

#### Scenario: BF-11 View all attributes

- Given F1 is visible in Flow Manager
- When the user opens F1 details
- Then all readable metamodel attributes of F1 are visible.

#### Scenario: BF-38 Keyboard membership

- Given focus is on F1 membership checkbox
- When Space is pressed
- Then membership toggles
- And focus remains predictable.

#### Scenario: BF-39 Accessible direction

- Given a screen reader is active
- When F1 A -> B is focused
- Then direction is announced as textual Source -> Consumer information
- And is not represented by icon alone.

### Requirement: Indexed repository search

The manager SHALL search the owning repository through its query service using a pair index, debounced text, filters, stable sorting and bounded pagination. Extended search SHALL show all flows with source/consumer labels and disable incompatible membership. Filtered eligible bulk membership SHALL be one diagram operation.

#### Scenario: BF-12 Search inside current pair

- Given several flows exist between A and B
- When the user searches for "customer"
- Then only matching A-B flows are displayed
- And membership state remains correct.

#### Scenario: BF-13 Filter by direction

- Given A -> B and B -> A flows exist
- When Direction filter is set to A -> B
- Then only A -> B flows are displayed.

#### Scenario: BF-14 Extended search

- Given Flow F5 connects C -> D
- When "Искать во всем репозитории" is checked
- And the user searches for F5
- Then F5 is displayed
- And its Source and Consumer are visible.

#### Scenario: BF-15 Non-eligible extended result

- Given F5 connects C -> D
- And current Bundle is A-B
- When F5 is displayed through extended search
- Then its membership checkbox is disabled
- And an explanation says F5 cannot be included in A-B.

#### Scenario: BF-17 Empty pair

- Given Repository has no flow between A and B
- When Flow Manager opens
- Then an empty state is shown
- And "Создать поток" is available
- And extended search can be enabled.

#### Scenario: BF-18 Create A -> B

- Given Bundle A-B is open
- When the user chooses "Новый поток"
- And selects direction A -> B
- And supplies all required attributes
- And saves
- Then a new Integration Flow is created in Repository
- And its source is A
- And consumer is B.

#### Scenario: BF-19 Create B -> A

- Given Bundle A-B is open
- When the user creates a flow with direction B -> A
- Then source is B
- And consumer is A.

#### Scenario: BF-20 Create and automatically include

- Given "Добавить в текущий жгут" is checked
- When the new flow is successfully created
- Then its canonical RepoObjectRef is added to the current Bundle.

#### Scenario: BF-40 Large repository

- Given Repository contains 100000 Integration Flows
- When Flow Manager opens for Bundle A-B
- Then UI does not render 100000 table rows
- And query uses Repo Core filtering/indexing
- And results use paging or virtualization.

#### Scenario: BF-41 Filtered bulk include

- Given a filter produces five eligible flows
- When the user invokes bulk include
- Then exactly those five flows are included
- And Undo restores all five memberships in one logical operation.

#### Scenario: BF-42 Non-eligible flows ignored by bulk include

- Given extended search results contain eligible and non-eligible flows
- When bulk include is executed
- Then only eligible flows are included.

### Requirement: Repository lifecycle operations

Schema-driven forms SHALL create, edit, reverse and clone canonical repository flows through authorized repository mutations. Creation SHALL offer default-on membership and idempotent retry after membership failure. Reverse SHALL preserve identity and other attributes. Clone SHALL generate or validate a new identity, copy only cloneable fields, and adapt unrelated endpoints to the current bundle. Incompatible endpoint edits SHALL require explicit confirmation before save.

#### Scenario: BF-21 Create validation

- Given required attributes are missing
- When the user attempts to save
- Then Repository create is not called
- And validation errors are displayed.

#### Scenario: BF-22 Duplicate user-defined ID

- Given Repository requires user-defined IDs
- And the entered ID already exists
- When the form is saved
- Then create fails with an ID conflict
- And no Bundle membership is added.

#### Scenario: BF-23 Repository create succeeds but membership fails

- Given a valid new flow
- And Repository create succeeds
- And Diagram membership mutation fails
- Then the new Repository object remains
- And the UI reports that it was not added to the Bundle
- And "Retry adding" is offered.

#### Scenario: BF-24 Edit normal attribute

- Given F1 is included in Bundle A-B
- When its description is edited
- Then canonical F1 is updated
- And membership remains unchanged.

#### Scenario: BF-25 Reverse direction

- Given F1 is A -> B
- And F1 belongs to Bundle A-B
- When the user chooses Reverse Direction
- And saves
- Then F1 becomes B -> A
- And F1 retains the same canonical ID
- And all non-endpoint attributes are preserved
- And F1 remains in Bundle A-B.

#### Scenario: BF-26 Endpoint change makes membership invalid

- Given F1 A -> B belongs to Bundle A-B
- When F1 consumer is changed from B to C
- Then the user is warned that F1 will be excluded
- When the user confirms and saves
- Then F1 becomes A -> C in Repository
- And F1 is removed from Bundle A-B.

#### Scenario: BF-27 Cancel invalidating endpoint edit

- Given F1 belongs to Bundle A-B
- When the user changes an endpoint to C
- And declines the warning
- Then Repository F1 remains unchanged
- And Bundle membership remains unchanged.

#### Scenario: BF-28 Clone eligible flow

- Given F1 A -> B exists
- When the user clones F1
- Then a new object F2 is created
- And F2 has a different canonical ID
- And cloneable attributes equal F1
- And source/consumer remain A/B.

#### Scenario: BF-29 Clone extended-search flow for current Bundle

- Given current Bundle is A-B
- And search result F5 is C -> D
- When the user selects "Клонировать для A ↔ B"
- Then the create form copies cloneable F5 attributes
- And uses A and B as endpoints
- And allows choosing A -> B or B -> A.

### Requirement: Permissions errors and concurrency

Repository and diagram permissions SHALL be enforced separately. Queries SHALL distinguish unavailable/error from empty results and offer retry. Revision conflicts SHALL preserve the draft and offer current-version reload. Repository events SHALL refresh query/index and validation without silently modifying closed diagrams. Disconnection SHALL retain known refs and disable repository operations.

#### Scenario: BF-31 Read-only Repository

- Given Repository is read-only
- And Diagram is writable
- When Flow Manager opens
- Then existing eligible flows can be included/excluded
- And Create is disabled
- And Edit is disabled
- And Reverse is disabled
- And Clone is disabled.

#### Scenario: BF-32 Read-only Diagram

- Given Diagram is read-only
- When Flow Manager opens
- Then membership controls are disabled.

#### Scenario: BF-33 Repository query failure

- Given Repository query fails
- When Flow Manager opens
- Then an error state is shown
- And the state is not presented as "no flows found"
- And Retry is available.

#### Scenario: BF-34 Repository refresh

- Given Flow Manager is open
- And another operation creates eligible F4
- When Repo Core publishes repository change
- Then F4 can appear after query/cache refresh
- Without reopening the diagram.

### Requirement: Pointer boundaries and descriptive bundle labels

Pointer gestures MUST end on release, cancellation or lost focus even across the Draw.io iframe. Navigator and native panel resize MUST NOT continue after release.

#### Scenario: Release across an iframe boundary

- **WHEN** a resize starts on either side of the iframe and the mouse is released on the other side
- **THEN** subsequent mouse movement does not resize panels or drag objects

#### Scenario: Flow descriptions on every bundle

- **WHEN** a bundle includes repository flows
- **THEN** its label lists one description per flow with markers • for used, + for created, ~ for modified and - for deleted
- **AND** long names wrap with a four-character continuation indent
- **AND** labels update after membership, repository changes and reopening without entering diagram history

### Requirement: Freely movable translucent labels

Both engines MUST render bundle label backgrounds with AA alpha and opaque text. Users MUST be able to drag the label freely without moving the systems or bundle endpoints.

#### Scenario: Drag and retain a label

- **WHEN** a user drags a populated bundle label
- **THEN** its position follows the pointer and supports one-step Undo/Redo
- **AND** saving, reopening and live flow updates preserve manual geometry
- **AND** only geometry and canonical references are stored, without flow descriptions

### Requirement: Independent routing and Draw.io editing notation

Frade Draw MUST ignore every non-terminal shape during routing, preview, segment drag, reconnection and restored diagram rendering. User-authored bends MUST NOT change when unrelated objects are added, moved or resized.

#### Scenario: Cross unrelated shapes continuously

- **WHEN** a user drags a bundle segment through another object
- **THEN** the actual line follows each pointer coordinate without rejecting the route
- **AND** the segment cursor is perpendicular to its orientation in both directions
- **AND** one Undo restores the route and Redo reapplies it

#### Scenario: Draw.io selection parity

- **WHEN** the bundle is selected
- **THEN** it shows circular segment points, floating terminal rings and the pinned Draw.io classic selection colors
- **AND** deselection removes transient tools without altering document styles
