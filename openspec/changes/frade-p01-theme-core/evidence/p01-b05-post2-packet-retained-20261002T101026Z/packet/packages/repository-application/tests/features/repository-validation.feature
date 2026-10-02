@CORE-007
Feature: repository validation

  @test:AC-validation
  Scenario: the full candidate is validated for persistence
    Given a ChangeSet includes a valid create and an invalid enum
    When the full candidate is validated for persistence
    Then no source bytes change
