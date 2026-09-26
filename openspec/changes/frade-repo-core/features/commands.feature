@repository-core
Feature: Validated and reconcilable repository commands

  @RC-1
  Scenario Outline: Reject inadmissible writes before dispatch
    Given a repository command with "<condition>"
    When the command is executed
    Then execution returns "<result>" and the writer call count is zero
    Examples:
      | condition                 | result              |
      | missing policy            | PERMISSION_DENIED   |
      | denying policy            | PERMISSION_DENIED   |
      | throwing policy           | PERMISSION_DENIED   |
      | missing expected revision | INVALID_INPUT       |
      | wrong repository target   | REPOSITORY_MISMATCH  |
      | closed session            | SESSION_CLOSED      |
      | duplicate batch target    | INVALID_INPUT       |

  @RC-1
  Scenario: Visibility is not authorization
    Given a visible object and a denying authorization policy
    When the object is replaced
    Then execution returns PERMISSION_DENIED and the writer call count is zero

  @RC-2
  Scenario Outline: A snapshot must be suitable for full validation
    Given a command snapshot with "<defect>"
    When the command is executed
    Then no writer is called and validation reports "<result>"
    Examples:
      | defect                         | result              |
      | incomplete declaration         | INCOMPLETE_SNAPSHOT |
      | a different model fingerprint  | BINDING_MISMATCH    |
      | unresolved external references | VALIDATION_FAILED   |

  @RC-2
  Scenario Outline: Domain invariants reject invalid final state
    Given a valid repository and a command causing "<violation>"
    When the complete prospective state is validated
    Then the command fails with qualified diagnostics and the stored state is unchanged
    Examples:
      | violation                      |
      | an unknown object type         |
      | an abstract object instance    |
      | an invalid inherited attribute |
      | a missing relation endpoint    |
      | a forbidden endpoint pair      |
      | a forbidden self relation      |
      | a duplicate relation pair      |
      | maximum cardinality overflow   |
      | minimum cardinality underflow  |
      | a dangling attribute reference |
      | a dangling endpoint on delete  |

  @RC-2 @RC-3
  Scenario Outline: Support object and relation mutations
    Given an authorized guarded adapter and a valid "<operation>" command
    When the command is executed
    Then exactly one commit returns matching results and a new snapshot revision
    Examples:
      | operation        |
      | create object    |
      | replace object   |
      | delete object    |
      | create relation  |
      | replace relation |
      | delete relation  |

  @RC-2
  Scenario: Validate a batch as one final state
    Given an atomic batch creating objects and their required relations and attribute references
    When the batch is executed
    Then the final combined state validates and all its resources commit together

  @RC-2
  Scenario: Materialize defaults only on changed entities
    Given changed and untouched objects both omitting a defaulted attribute
    When a valid replacement is executed
    Then only the changed object's committed attributes contain the materialized default

  @RC-3
  Scenario Outline: Preserve state on optimistic conflict
    Given a validated command with "<race>" before commit
    When the guarded commit is dispatched
    Then it returns CONFLICT with no automatic retry and no partial write
    Examples:
      | race                         |
      | a changed target revision    |
      | an existing create target    |
      | a changed unrelated relation |
      | a changed model binding      |

  @RC-3
  Scenario: Malformed acknowledgement is uncertain
    Given a dispatched write whose acknowledgement omits committed revisions
    When the acknowledgement is received
    Then the result is OUTCOME_UNKNOWN with the original operation ID

  @RC-4
  Scenario Outline: Distinguish cancellation from uncertain persistence
    Given a valid command paused at "<barrier>"
    When the originating caller cancels
    Then the result is "<result>" with writer call count <calls>
    Examples:
      | barrier                   | result          | calls |
      | before writer dispatch    | CANCELLED       | 0     |
      | after writer dispatch     | OUTCOME_UNKNOWN | 1     |
      | after commit before reply | OUTCOME_UNKNOWN | 1     |

  @RC-4
  Scenario Outline: Reconcile without replay
    Given a command with an unknown outcome
    When lookup reports "<outcome>"
    Then reconciliation exposes "<outcome>" and does not dispatch another write
    Examples:
      | outcome       |
      | committed     |
      | not-committed |
      | pending       |
      | unknown       |

  @RC-4
  Scenario Outline: Repeated operation IDs are controlled
    Given an accepted command with operation ID op1
    When op1 is submitted again with "<variation>"
    Then the second call yields "<result>" and total writer calls do not exceed one
    Examples:
      | variation                   | result                |
      | identical pending command   | shared outcome        |
      | identical completed command | retained outcome      |
      | reordered attribute keys    | shared outcome        |
      | a different payload         | OPERATION_ID_CONFLICT |
      | a different revision        | OPERATION_ID_CONFLICT |
      | reordered attribute array   | OPERATION_ID_CONFLICT |

  @RC-4
  Scenario: Operation tracking does not silently evict
    Given a session retaining 1024 accepted operation IDs
    When a new distinct operation is submitted
    Then it returns RESOURCE_LIMIT and a prior operation remains replay-protected

  @RC-4
  Scenario: Close after dispatch remains uncertain
    Given a dispatched write without an acknowledgement
    When the session closes
    Then the caller receives OUTCOME_UNKNOWN with its operation ID and no replay occurs

  @RC-5
  Scenario Outline: Acceptance infrastructure fails closed
    Given the acceptance infrastructure fault "<fault>"
    When the relevant verification gate runs
    Then the gate fails instead of reporting successful acceptance
    Examples:
      | fault                        |
      | forbidden production import  |
      | private package import       |
      | unmapped Gherkin step         |
      | ambiguous Gherkin step        |
      | rejected asynchronous step    |
      | unexpanded outline parameter |
