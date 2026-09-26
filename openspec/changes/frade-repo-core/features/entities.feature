@repository-core
Feature: Portable repository entities

  @RE-1
  Scenario Outline: Identity is independent of location and namespace collisions
    Given repository entities with "<condition>"
    When their qualified identities and provenance are decoded
    Then entity identity is preserved without collisions or revision ordering
    Examples:
      | condition                            |
      | identical local IDs in two sources   |
      | equal object and relation local IDs  |
      | delimiters in repository and IDs     |
      | a renamed physical resource          |
      | revisions 9 and 10 as opaque strings |

  @RE-2
  Scenario Outline: Unsafe or malformed entities fail closed
    Given an entity with "<defect>"
    When the entity is decoded
    Then decoding fails without input mutation or getter execution
    Examples:
      | defect                  |
      | a blank reference       |
      | a blank object name     |
      | a blank revision        |
      | an invalid type ID      |
      | an unknown field        |
      | a nested accessor       |
      | a dangerous key         |
      | a custom prototype      |
      | a cycle                 |
      | a sparse array          |
      | a non-finite number     |
      | an undefined value      |
      | a symbol property       |

  @RE-2
  Scenario: Decoded data does not alias input
    Given a valid object with nested attributes
    When its source attributes are changed after decoding
    Then the decoded attributes keep their original values

  @RE-2
  Scenario Outline: Resource budgets are explicit
    Given an otherwise valid snapshot at "<boundary>"
    When the snapshot envelope is decoded
    Then the decode outcome is "<outcome>" without partial data
    Examples:
      | boundary             | outcome        |
      | depth 64             | success        |
      | depth 65             | RESOURCE_LIMIT |
      | 100000 visited values | success       |
      | 100001 visited values | RESOURCE_LIMIT |

  @RE-3
  Scenario: Project only metamodel validation fields
    Given a bound snapshot with names revisions provenance and omitted defaulted attributes
    When the snapshot is projected for metamodel validation
    Then qualified references remain and storage fields and defaults are not added

  @RE-3
  Scenario Outline: Exact binding is required
    Given a compiled model and a snapshot with a different "<part>"
    When repository validation is requested
    Then the result is BINDING_MISMATCH and no writer is called
    Examples:
      | part        |
      | model ID    |
      | version     |
      | fingerprint |
