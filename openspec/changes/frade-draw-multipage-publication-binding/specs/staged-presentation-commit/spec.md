## ADDED Requirements

### Requirement: Commit preparation overlaps paint without early publication
An accepted commit SHALL prepare its temporary settings file with real fsync/close concurrently with unchanged applied paint. Authoritative rename SHALL wait for every exact paint acknowledgement, fresh host ownership and revision CAS. Reveal and success SHALL wait for owned rename and authoritative readback.

#### Scenario: Slow filesystem flush
- **GIVEN** an accepted commit and a pending temporary file flush
- **WHEN** required participants paint the candidate
- **THEN** their paint proceeds without awaiting the flush
- **AND** final rename, readback, reveal and success wait for both flush completion and all exact paint acknowledgements

#### Scenario: Refusal or supersession while staging
- **GIVEN** a staged or in-flight commit
- **WHEN** a participant refuses, membership changes or a newer intent arrives
- **THEN** no stale authoritative commit or reveal occurs
- **AND** the serialized host queue settles and cleans staging during owned compensation before another commit can finalize

### Requirement: Staging retains strict persistence and recovery boundaries
The authorized top-level presentation channel SHALL bind strict bounded stage DTOs to session, request, generation, transaction, revision, membership, selection and expected durable revision. Staging SHALL NOT acknowledge durable success. Finalization SHALL reject mismatched preparation and retain readback, UNKNOWN handling, original deadlines and recovery curtain.

#### Scenario: Forged or mismatched staged commit
- **GIVEN** a prepared commit
- **WHEN** finalization changes its membership, selection, revision, generation or transaction
- **THEN** it is refused before authoritative rename
- **AND** unsafe paths, unauthorized senders and malformed fields remain rejected

#### Scenario: Lost or failed write outcome
- **GIVEN** staging or finalization fails or times out
- **WHEN** owned compensation cannot prove settings and staging cleanup
- **THEN** recovery blocks success and retains the curtain and dirty documents

#### Scenario: Preview and legacy host
- **GIVEN** preview, cancel, refresh or an existing host without staging capability
- **WHEN** the service processes the request
- **THEN** preview, cancel and refresh perform no settings staging
- **AND** a legacy commit retains all original applied-paint-before-persist assertions
- **AND** intent alone performs no filesystem mutation and required compensation of an earlier in-flight commit remains available
