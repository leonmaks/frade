@CORE-003 @RE-1
Feature: Stable repository identity
  @test:identity-rename
  Scenario: Rename or relocate an object
    Given a qualified object reference and a separate source location
    When the name or source location changes
    Then its identity remains unchanged and kind namespaces do not collide

  @test:identity-tuples
  Scenario: Delimiters in identities
    Given arbitrary repository and entity identifiers
    When qualified identity keys are compared
    Then unequal tuples never share an identity key
