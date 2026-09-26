@CORE-003
Feature: object identity

  @test:AC-identity
  Scenario: it is renamed and its source file is relocated inside the root
    Given an object has a persisted stable reference
    When it is renamed and its source file is relocated inside the root
    Then the original reference resolves after reopening
