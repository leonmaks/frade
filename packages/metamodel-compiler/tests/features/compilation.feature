Feature: Metamodel source composition

  @MC-1
  Scenario Outline: Decode a model source
    Given a valid organization envelope supplied as "<format>"
    When I compile the organization
    Then the candidate contains its declared types
    And the input is unchanged

    Examples:
      | format     |
      | structured |
      | JSON       |

  @MC-1
  Scenario Outline: Reject unsafe sources
    Given an organization source with "<defect>"
    When I compile the organization
    Then compilation fails without a candidate
    And no source accessor or function was executed

    Examples:
      | defect                     |
      | malformed JSON             |
      | unsupported envelope       |
      | unsupported domain version |
      | accessor                   |
      | dangerous key              |
      | cyclic structured value    |
      | nonstandard prototype      |
      | excessive nesting          |
      | excessive text length      |
      | excessive value count      |

  @MC-2
  Scenario: Load a diamond once
    Given two imports share the same exact base package
    When I compile the organization
    Then the base package was loaded once
    And its types occur once in the candidate

  @MC-2
  Scenario Outline: Reject invalid imports
    Given an import graph with "<defect>"
    When I compile the organization
    Then compilation fails without a candidate
    And the diagnostic identifies the failing package

    Examples:
      | defect                  |
      | unavailable package     |
      | mismatched identity     |
      | cyclic imports          |
      | conflicting versions    |
      | duplicate definition ID |
      | exceeded package budget |
      | exceeded edge budget    |
      | exceeded graph depth    |
      | exceeded total values   |

  @MC-3
  Scenario: Add an attribute to an imported parent
    Given an organization adds a required attribute with a valid default to an imported parent
    When I compile the organization
    Then the parent and descendants contain the added attribute
    And all original attributes and constraints are retained

  @MC-3
  Scenario: Add an attribute to an imported relation
    Given an organization adds an attribute to an imported relation
    When I compile the organization
    Then the relation contains the added attribute
    And endpoint cardinality direction duplicate and self-reference policies are unchanged

  @MC-3
  Scenario Outline: Reject non-additive extensions
    Given an organization extension with "<defect>"
    When I compile the organization in both package orders
    Then both compilations fail without a candidate

    Examples:
      | defect                         |
      | existing own attribute         |
      | existing inherited attribute   |
      | identical duplicate addition   |
      | ancestor descendant additions  |
      | deletion field                 |
      | changed relation policy        |
      | changed parent                 |
      | changed abstract flag          |
      | changed lifecycle              |
      | unknown target                 |
      | local target                   |
      | sibling-only target            |

  @MC-4
  Scenario: Resolve inheritance across imports
    Given a local type inherits from a valid imported parent
    When I compile the organization
    Then the candidate contains the inherited attributes and lineage

  @MC-4
  Scenario Outline: Reject invalid composed semantics
    Given composed model definitions with "<defect>"
    When I compile the organization
    Then compilation fails with the corresponding domain diagnostic
    And the diagnostic identifies the responsible entity

    Examples:
      | defect                            |
      | incompatible descendant attribute |
      | invalid extension default         |
      | unresolved reference target       |
      | inheritance cycle                 |
      | missing parent                    |

  @MC-5
  Scenario: Sanitize loader errors
    Given the import loader throws an error containing private host details
    When I compile the organization
    Then a load-stage diagnostic is returned without private host details
    And compilation has no candidate

  @MC-5
  Scenario: Order semantic diagnostics deterministically
    Given semantically identical invalid models with reordered declarations
    When I compile both models
    Then their package-qualified semantic diagnostics are identical
