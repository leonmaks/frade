Feature: Opt-in paged native repositories
  @V2-001 @V2-002 @test:v2-cross-page
  Scenario: Resolve cross-page entities without a full snapshot
    Given canonical objects and relations in different immutable pages
    When the version-two repository opens and is queried
    Then references resolve and source-backed catalog queries are equivalent
  @V2-002 @test:v2-invalid
  Scenario: Refuse invalid authoritative data
    Given duplicated identities or missing relation targets
    When the source is validated
    Then no healthy manifest is published
  @V2-001 @V2-002 @test:v2-corrupt
  Scenario: Detect page corruption
    Given a published page has been edited without changing its hash
    When the repository reopens
    Then opening fails without changing source bytes
  @V2-001 @V2-003 @test:v2-capacity
  Scenario: Exceed a full snapshot envelope safely
    Given a valid graph larger than 100000 decoded values
    When it is queried by identity or bounded page
    Then bounded pages are returned without requiring a complete graph DTO
  @V2-005 @test:v2-compatibility
  Scenario: Preserve version-one repositories
    Given an existing native version-one repository
    When paged repository creation targets its occupied directory
    Then version-one files remain unchanged and existing destinations are refused
  @V2-003 @test:v2-cursors
  Scenario: Reject cross-session cursors
    Given a query cursor from another session
    When it is used for continuation
    Then the cursor is rejected without mixed pages

  @V2-004 @test:v2-delta
  Scenario: Write without a complete graph DTO
    Given a verified repository exceeding the snapshot export limit
    When a guarded object update is applied and replayed
    Then exactly one update persists across reopen
  @V2-004 @test:v2-atomic
  Scenario: Validate all changes before publication
    Given a batch containing a restricted referenced-object deletion
    When the batch is submitted and then an explicit cascade is submitted
    Then the invalid batch preserves the manifest and only the valid cascade commits
  @V2-004 @test:v2-conflict
  Scenario: Reject a stale second writer
    Given two sessions share a source revision
    When the first commits and the second submits a stale change
    Then the first writer's manifest is preserved
  @V2-004 @test:v2-recovery
  Scenario: Recover after actual process termination
    Given a writer is interrupted before or after manifest publication
    When a host previews and explicitly finishes recovery
    Then active writers are protected and source evidence is retained
  @V2-004 @test:v2-recovery-conflict
  Scenario: Reject a stale recovery preview
    Given a staged write failed without publishing its manifest
    When a mismatching preview is submitted before an explicit keep-source recovery
    Then the mismatch is rejected and source bytes remain unchanged
  @V2-004 @test:v2-orphan-lock
  Scenario: Recover a pre-journal interruption
    Given an inactive writer left a lock but no journal
    When an explicit keep-source recovery uses the verified preview
    Then the existing source remains unchanged and no staged command is invented
  @V2-004 @test:v2-post-commit
  Scenario: Preserve a committed write when finalization fails
    Given source publication succeeded but final acknowledgement cleanup failed
    When the caller retries or explicitly recovers the committed source
    Then the original object remains persisted exactly once with a recovery warning
  @V2-005 @test:v2-routing
  Scenario: Route a trusted host directory by its profile
    Given an opt-in native version-two profile
    When the existing native host entry point opens the selected directory
    Then the paged session resolves its persisted object
  @V2-005 @test:v2-export
  Scenario: Explicitly adopt semantic data in a new destination
    Given a version-one repository and an empty independent destination
    When the caller acknowledges loss of source formatting
    Then semantic export succeeds without modifying version-one source bytes
  @V2-004 @test:v2-events
  Scenario: Publish notifications only after committed source changes
    Given two subscribed sessions and a throwing listener
    When one session commits a change
    Then other listeners receive the confirmed change and external subscribers can resync
  @V2-002 @V2-004 @test:v2-policies
  Scenario: Preserve declarative policies across paged preparation
    Given readonly attributes and an acyclic relation policy
    When forbidden attribute and cycle changes are proposed
    Then both changes are rejected and permitted updates still commit
  @V2-001 @test:v2-containment
  Scenario: Reject traversal and symlinked page roots
    Given a traversal mapping or symlinked page directory
    When the repository opens
    Then opening is denied without outside storage access
  @V2-001 @test:v2-boundaries
  Scenario: Reject malformed or incompatible source envelopes
    Given malformed profiles or manifests exceeding format bounds
    When opening is attempted
    Then no healthy session is returned and source bytes are retained
  @V2-002 @test:v2-equivalence
  Scenario: Compare streaming integrity with complete validation
    Given reproducible generated directed and undirected graphs
    When both validators check endpoints duplicates and cardinalities
    Then they agree on acceptance for every generated graph
  @V2-003 @test:v2-query-equivalence
  Scenario: Compare paged query semantics
    Given reproducible generated attributes and stable sorting keys
    When portable and indexed queries are read page by page
    Then ordering filtering projection and membership agree
  @V2-003 @test:v2-cancellation
  Scenario: Cancel a long portable scan
    Given a sorted query requiring more than one scan checkpoint
    When cancellation is requested
    Then the bounded executor yields and returns cancelled
  @V2-006 @test:v2-measurements
  Scenario: Record representative size measurements
    Given isolated Small Medium and Large synthetic datasets
    When cold opening querying traversing and updating are measured
    Then evidence records actual results and memory observations rather than inferred success
  @V2-002 @V2-003 @test:v2-index-import
  Scenario: Build derived indexes after bounded source ingestion
    Given an empty disposable catalog
    When bulk loading completes before validation
    Then query indexes exist and a second import cannot replace a populated catalog
  @V2-002 @V2-004 @test:v2-attribute-references
  Scenario: Preserve cross-page attribute references
    Given an attribute references another page's typed object
    When target deletion type changes or an absent target are proposed
    Then invalid changes preserve source and explicit reference removal enables deletion
  @V2-003 @test:v2-stale-cursor
  Scenario: Reject stale and changed-query cursors
    Given a cursor pinned to a query and committed revision
    When the query changes or a subsequent command commits
    Then continuation returns an explicit cursor error
  @V2-001 @V2-002 @test:v2-errors
  Scenario: Preserve typed configuration errors
    Given malformed profile or metamodel JSON
    When the host opens the repository
    Then the failure retains its configuration category without exposing parser internals
  @V2-004 @test:v2-defensive-outcomes
  Scenario: Isolate retained operation outcomes
    Given a committed command has a reconcilable result
    When a caller edits its returned result
    Then a later reconciliation retains the original committed values
  @V2-001 @test:v2-defensive-capabilities
  Scenario: Protect verified capability collections
    Given a session publishes its supported operators
    When a caller attempts to edit the collection
    Then the session's verified declaration remains unchanged
  @V2-004 @test:v2-operation-bounds
  Scenario: Bound operation IDs before journal creation
    Given an operation ID exceeds the serialized journal field budget
    When a command is submitted
    Then it is rejected before creating a lock or changing the manifest
  @V2-001 @test:v2-creation-bounds
  Scenario: Refuse configuration that cannot be reopened
    Given a new profile exceeds the native configuration byte budget
    When a paged repository is created
    Then creation returns a resource error rather than publishing an unreadable repository
  @V2-002 @test:v2-model-isolation
  Scenario: Isolate returned model authority
    Given a session uses a readonly attribute policy
    When a caller edits its returned model binding and policy
    Then the session retains the original binding and validation policy
  @V2-003 @test:v2-reload-cursor
  Scenario: Diagnose a cursor after external reload
    Given a page cursor was issued before another session committed
    When the reader reloads and continues that cursor
    Then it reports a stale revision in the same session scope
