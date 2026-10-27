## ADDED Requirements

### Requirement: Embedded editor respects host keyboard focus
The embedded Draw.io adapter SHALL preserve host input focus during passive typing-shim refresh and SHALL grant editor focus on an intentional accepted repository drop.

#### Scenario: Passive refresh while host search is active
- **GIVEN** host object search owns keyboard focus and a Draw.io selection refresh is queued
- **WHEN** the typing shim refresh executes
- **THEN** host search retains focus and its text
- **AND** selected graph cells are preserved

#### Scenario: Intentional valid repository drop
- **GIVEN** an enabled editable embedded editor and a valid repository object
- **WHEN** the user drops the object onto its canvas
- **THEN** editor keyboard focus is granted and the object is inserted once
- **AND** existing gesture, undo and persistence behavior remains unchanged
