@metamodel @critical
Feature: Typed metamodel attribute validation

  @MA-001
  Scenario Outline: Every attribute kind has positive and negative validation
    Given valid and invalid fixture values for "<kind>"
    When both values are validated against their attribute schema
    Then the valid value passes without coercion
    And the invalid value reports its precise attribute path

    Examples:
      | kind    |
      | string  |
      | text    |
      | integer |
      | decimal |
      | boolean |
      | date    |
      | datetime |
      | enum    |
      | reference |
      | list    |
      | object  |

  @MA-001
  Scenario: Nested validation identifies item and field
    Given a list of structured objects with one invalid and one undeclared field
    When the list value is validated
    Then diagnostics identify the list index and both fields without dropping data

  @MA-002
  Scenario: Required and nullable are independent
    Given the required optional nullable and defaulted attribute truth table
    When missing null and present values are validated
    Then only permitted combinations succeed
    And defaults apply only to absent values
    And an absent optional parent object remains absent

  @MA-002
  Scenario: Defaults are validated independent copies
    Given a schema with a nested mutable default
    When defaults are applied to two inputs
    Then both results satisfy the schema
    And changing one result leaves the other result and schema unchanged

  @MA-002
  Scenario Outline: Reject invalid bounds and defaults
    Given an attribute fixture with "<defect>"
    When its schema and value are validated
    Then the expected constraint diagnostic is returned

    Examples:
      | defect                   |
      | numeric bound violation  |
      | string length violation  |
      | list cardinality violation |
      | contradictory bounds     |
      | invalid default          |

  @MA-003
  Scenario: Reference targets require supplied identity and type information
    Given permitted subtype forbidden type and unresolved reference targets
    When reference values are validated with the supplied target map
    Then only the permitted subtype reference succeeds
    And other references report explicit target diagnostics without I/O
