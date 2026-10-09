@CORE-005
Feature: reference resolution

  @test:AC-resolve
  Scenario: references are resolved
    Given targets are missing, foreign or malformed
    When references are resolved
    Then results distinguish not-found, unavailable and malformed references
