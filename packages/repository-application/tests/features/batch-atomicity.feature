@CORE-007 @CORE-020
Feature: batch atomicity

  @test:AC-validation
  Scenario: the full candidate is validated for persistence
    Given a ChangeSet includes a valid create and an invalid enum
    When the full candidate is validated for persistence
    Then no source bytes change

  @test:AC-recovery
  Scenario: the repository reopens
    Given a native write left a recovery journal
    When the repository reopens
    Then RECOVERY_REQUIRED is returned and source data remains intact
