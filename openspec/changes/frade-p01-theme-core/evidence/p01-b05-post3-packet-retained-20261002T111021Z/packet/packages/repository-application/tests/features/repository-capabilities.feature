@CORE-010
Feature: repository capabilities

  @test:AC-capabilities
  Scenario: the operation is requested
    Given a ChangeSet targets an independent repository
    When the operation is requested
    Then it is rejected with unchanged source bytes and no distributed capability claim
