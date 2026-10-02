Feature: Reproducible publication and safe model review

  @MV-1
  Scenario: Ignore irrelevant ordering
    Given equivalent envelopes with reordered keys imports types attributes and selection sets
    When I compile both models
    Then their fingerprints and locks are identical

  @MV-1
  Scenario Outline: Include meaningful content in identity
    Given two otherwise identical models differing in "<content>"
    When I compile both models
    Then their fingerprints differ

    Examples:
      | content                 |
      | presentation label      |
      | attribute constraint    |
      | ordered default list    |
      | extension attribute     |
      | imported source content |
      | model version           |

  @MV-2
  Scenario: Replay a generated lock
    Given a successful compilation and its generated model lock
    When I compile the same sources in locked mode
    Then the fingerprint matches the first compilation
    And the supplied lock is unchanged

  @MV-2
  Scenario Outline: Reject lock mismatch
    Given locked compilation with "<defect>"
    When I compile the organization
    Then compilation fails without a candidate
    And the supplied lock is unchanged

    Examples:
      | defect                     |
      | same-version content drift |
      | missing package entry      |
      | extra package entry        |
      | duplicate package entry    |
      | incorrect fingerprint      |
      | incorrect root identity    |
      | malformed content hash     |
      | unsupported lock version   |

  @MV-3
  Scenario Outline: Preserve the last publication on failure
    Given a successfully published model
    When a new publication fails at "<stage>"
    Then readers still observe the original complete snapshot

    Examples:
      | stage           |
      | load            |
      | source decode   |
      | domain analysis |
      | extension merge |
      | projection      |
      | hash exception  |
      | malformed hash  |
      | lock validation |

  @MV-3
  Scenario Outline: Reject stale completion
    Given a published model and two overlapping compilation requests
    When the newer request "<outcome>" before the older succeeds
    Then the older request reports superseded
    And the published state reflects only the newer outcome

    Examples:
      | outcome  |
      | succeeds |
      | fails    |

  @MV-3
  Scenario Outline: Defend published data
    Given a successfully published model
    When I attempt to mutate "<target>"
    Then subsequent reads retain the original content and fingerprint

    Examples:
      | target                    |
      | caller input              |
      | returned type attributes  |
      | nested default values     |
      | exposed lookup collection |
      | returned model lock       |
      | copied domain analysis    |

  @MV-4
  Scenario Outline: Classify impact without data claims
    Given old and candidate models differing by "<change>"
    When I compare the models
    Then impact reports "<classification>"
    And repository compatibility is not claimed

    Examples:
      | change                    | classification        |
      | removed type              | removed and review    |
      | added required attribute  | changed and review    |
      | changed relation bound    | changed and review    |
      | changed label only        | presentation only     |
      | changed profile selection | projection change     |
      | model version only        | model identity change |

  @MV-5
  Scenario: Preview removed types without deletion
    Given a complete repository snapshot containing an object whose type the candidate removes
    And its model binding matches the old model
    When I preview migration
    Then the preview reports that repository-qualified object and unknown type
    And repository data and binding are unchanged

  @MV-5
  Scenario: Keep same local IDs distinct across repositories
    Given two repositories contain objects with the same object ID but different candidate validity
    And their supplied model binding matches the old model
    When I preview migration
    Then diagnostics identify only the invalid repository-qualified object

  @MV-5
  Scenario: Do not materialize defaults
    Given a complete repository snapshot omits an attribute default introduced by the candidate
    And its model binding matches the old model
    When I preview migration
    Then the stored attribute remains absent
    And repository data and binding are unchanged

  @MV-5
  Scenario: Reject a stale binding
    Given repository data with a binding that does not match the old model
    When I preview migration
    Then a binding-mismatch diagnostic is returned without a compatibility claim

  @MV-5
  Scenario: Missing context is not compatibility
    Given only old and candidate models without repository data
    When I preview migration
    Then model impact is returned and repository compatibility is not evaluated
