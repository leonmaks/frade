@repository-core
Feature: Capability-based repository sessions

  @RP-1
  Scenario: Read from a read-only source
    Given an adapter with readers and no writer
    When an object is read and then a mutation is requested
    Then the read succeeds and the mutation is READ_ONLY with zero writes

  @RP-1
  Scenario: Reject contradictory capabilities
    Given an adapter advertising atomic writes without a writer
    When an application session is opened
    Then opening fails with ADAPTER_CONTRACT and the returned session is closed once

  @RP-2
  Scenario Outline: Settle cancelled or closed reads
    Given a delayed reader that ignores cancellation
    When "<action>" occurs
    Then the caller receives "<result>" without publishing late data or leaking listeners
    Examples:
      | action                  | result         |
      | cancellation before I/O | CANCELLED      |
      | cancellation during I/O | CANCELLED      |
      | close during I/O        | SESSION_CLOSED |

  @RP-2
  Scenario: Clean up a late open
    Given a delayed adapter open
    When the open is cancelled before the adapter returns a session
    Then the caller is cancelled and the late session is closed once

  @RP-2
  Scenario: Close is idempotent despite adapter failure
    Given an active session whose adapter close rejects
    When the application session is closed twice
    Then subscriptions are released and adapter close is invoked once with sanitized failure

  @RP-3
  Scenario Outline: Validate paging bounds
    Given an adapter supporting paged object reads
    When a page of size <size> is requested
    Then the paging result is "<result>"
    Examples:
      | size | result        |
      | 1    | success       |
      | 1000 | success       |
      | 0    | INVALID_INPUT |
      | 1001 | INVALID_INPUT |

  @RP-3
  Scenario Outline: Cursors preserve their scope
    Given a cursor from a successful repository query
    When the cursor is reused with "<change>"
    Then the query fails with "<result>" without returning mixed pages
    Examples:
      | change                | result         |
      | a different session   | INVALID_CURSOR |
      | a different filter    | INVALID_CURSOR |
      | a new source revision | STALE_CURSOR   |

  @RP-3
  Scenario Outline: Reject invalid reader responses
    Given an adapter returning "<defect>"
    When an application read is performed
    Then the result is ADAPTER_CONTRACT without exposing the invalid data
    Examples:
      | defect                      |
      | an object from another repo |
      | an oversized page           |
      | a malformed revision        |
      | a duplicate entity in a page |

  @RP-4
  Scenario Outline: Missing write guarantees are not emulated
    Given a writer with "<limitation>"
    When a command requiring the missing guarantee is requested
    Then the result is UNSUPPORTED and the writer is not called
    Examples:
      | limitation                  |
      | no snapshot guard           |
      | no atomic batch             |
      | no operation reconciliation |

  @RP-4
  Scenario: Snapshot guards prevent write skew
    Given a validated command whose target revision is unchanged
    When another relation changes before guarded commit
    Then the commit returns CONFLICT and applies none of the command

  @RP-5
  Scenario Outline: Event delivery has explicit continuity
    Given a subscribed application session
    When the adapter sends "<sequence>"
    Then subscribers observe "<result>"
    Examples:
      | sequence               | result                        |
      | a contiguous change    | one committed change          |
      | a repeated sequence    | no duplicate callback         |
      | a sequence gap         | refresh invalidation          |
      | a change after close   | no callback                   |
      | a change after unsubscribe | no callback               |

  @RP-5
  Scenario: Isolate a failing listener
    Given two subscribers of which the first throws
    When the adapter publishes a committed change
    Then the second subscriber receives it and the commit remains successful

  @RP-5
  Scenario: Unsupported history is explicit
    Given an adapter without history capability
    When history is requested
    Then the result is UNSUPPORTED rather than an empty history page
