@CORE-019
Feature: access control

  @test:AC-access
  Scenario: the caller requests access or mutation
    Given a caller has read-only permission or wrong repository scope
    When the caller requests access or mutation
    Then application authorization denies the operation before persistence
