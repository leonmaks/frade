@metamodel @critical
Feature: Configurable metamodel definitions

  @MD-001
  Scenario: Company vocabularies use stable identities
    Given two company models with equal display labels and different namespaces
    When their definitions are validated
    Then both models retain distinct stable type identities
    And no built-in architecture type is required

  @MD-001
  Scenario Outline: Reject malformed model envelopes
    Given a model with "<defect>"
    When its definition is decoded
    Then a structured definition diagnostic is returned
    And no successful definition is returned

    Examples:
      | defect                     |
      | unsupported schema version |
      | malformed namespaced ID    |
      | invalid semantic version   |
      | duplicate type ID          |
      | unknown structural field   |

  @MD-002
  Scenario: Preserve data-only metadata
    Given a valid model with imports profiles viewpoints lifecycle and UI metadata
    When its definition is decoded
    Then its declarations are preserved without I/O or code execution

  @MD-002
  Scenario Outline: Reject invalid metadata declarations
    Given a model with "<defect>"
    When its definition is decoded
    Then a structured definition diagnostic is returned

    Examples:
      | defect                              |
      | undeclared lifecycle transition end |
      | viewpoint domain constraint override |

  @MD-003
  Scenario: Concrete types inherit abstract requirements
    Given an abstract parent with a required attribute and a concrete child
    When the complete definition set is analyzed
    Then the child inherits the attribute and matches the parent subtype rule
    And an instance of the abstract parent is rejected

  @MD-003
  Scenario Outline: Reject unsafe inheritance
    Given a complete definition set with "<defect>"
    When the complete definition set is analyzed
    Then an inheritance diagnostic identifies the offending type
    And no usable partial analysis is returned

    Examples:
      | defect                         |
      | missing parent                 |
      | multiple parents               |
      | inheritance cycle              |
      | inherited attribute kind change |
      | inherited default change       |
      | inherited constraint change    |

  @MD-004
  Scenario: Semantic diagnostics are deterministic and pure
    Given frozen invalid definitions in two equivalent collection orders
    When both definition sets are analyzed repeatedly
    Then their ordered semantic diagnostic identities and paths agree
    And all input values are unchanged

  @MD-004
  Scenario Outline: Reject unsafe traversal
    Given an input containing "<defect>"
    When domain decoding is attempted
    Then a structured safety diagnostic is returned without executing code or truncating input

    Examples:
      | defect                     |
      | executable value           |
      | cyclic object              |
      | recursion depth above 64   |
      | more than 100000 values    |
      | prototype-polluting key    |
