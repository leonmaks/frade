@metamodel @critical
Feature: Relation eligibility and snapshot integrity

  @MR-001
  Scenario: Directed and undirected endpoint matching differ
    Given a parent subtype and target type with endpoint rules
    When directed and undirected type pairs are checked in both orientations
    Then directed results respect source and target roles
    And undirected eligibility is invariant under endpoint reversal
    And successful eligibility is not presented as mutation approval

  @MR-002
  Scenario Outline: Eligible pairs can fail final validation
    Given an eligible relation pair in a complete prospective snapshot with "<defect>"
    When the full snapshot is validated
    Then a constraint-specific diagnostic rejects the snapshot

    Examples:
      | defect                         |
      | missing endpoint               |
      | forbidden self-reference       |
      | forbidden duplicate pair       |
      | duplicate relation identity    |
      | invalid relation attribute     |
      | maximum cardinality exceeded   |
      | minimum cardinality unsatisfied |

  @MR-002
  Scenario: Qualified identities and undirected duplicates
    Given different repositories reuse a local object ID
    And an undirected relation is repeated with reversed endpoints
    When the full snapshot is validated
    Then repository-qualified objects remain distinct
    And the reversed relation is recognized as a duplicate pair

  @MR-002
  Scenario: Prospective updates count once and removals enforce minimums
    Given a valid snapshot with exactly one required relation
    When that relation is updated in place and separately removed
    Then the updated snapshot counts the relation once
    And the removal snapshot fails minimum cardinality

  @MR-003
  Scenario: Reject asymmetric undirected cardinalities
    Given an undirected definition with unequal source and target bounds
    When its definition is validated
    Then an ambiguous cardinality diagnostic is returned

  @MR-003
  Scenario: Count an allowed self-loop once without mutation
    Given a frozen complete snapshot with one permitted undirected self-loop
    When the full snapshot is validated twice
    Then the incident count for its object is one
    And both ordered diagnostic results agree
    And all input values are unchanged
