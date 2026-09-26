Feature: Constraint-preserving model projections

  @MP-1
  Scenario: Select exact types
    Given a profile selecting a parent but not its child
    When I compile and request that profile
    Then the projection selects only the parent
    And full domain analysis still contains the child

  @MP-1
  Scenario: Empty means no selection
    Given a profile with empty type selections
    When I compile and request that profile
    Then the projection selects no types

  @MP-1
  Scenario: Reject a profile with unknown types
    Given a profile selecting an unknown type
    When I compile the organization
    Then compilation fails without a candidate

  @MP-2
  Scenario: Intersect profile and viewpoint
    Given a viewpoint selecting a type excluded by a profile
    When I compile and request their combined projection
    Then the excluded type is absent from the projection
    And full domain analysis still contains the excluded type

  @MP-2
  Scenario: Reject unrelated presentation
    Given a viewpoint styles a known but unselected type
    When I compile the organization
    Then compilation fails with a viewpoint diagnostic

  @MP-2
  Scenario: Keep relation rules behind presentation
    Given a viewpoint relabels a relation and hides one endpoint type
    When I validate invalid repository relations against the compiled full model
    Then original endpoint and cardinality violations are reported

  @MP-3
  Scenario Outline: Resolve explicit projection selectors
    Given a compiled organization model with a profile and viewpoint
    When I request projection selectors "<selectors>"
    Then the projection result is "<result>"

    Examples:
      | selectors         | result                       |
      | neither           | all types                    |
      | profile only      | exact profile selection      |
      | viewpoint only    | exact viewpoint selection    |
      | unknown profile   | diagnostic without selection |
      | unknown viewpoint | diagnostic without selection |

  @MP-3
  Scenario: Isolate projection mutation
    Given a compiled organization model with a profile and viewpoint
    When I attempt to mutate returned projection selections and presentation
    Then a fresh projection and full model remain unchanged
