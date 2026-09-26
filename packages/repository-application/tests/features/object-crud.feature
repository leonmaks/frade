@CORE-007 @CORE-008 @CORE-009
Feature: object crud

  @test:AC-object-crud
  Scenario: a stale delete and then a current delete are requested
    Given a persisted object is updated to a new revision
    When a stale delete and then a current delete are requested
    Then the stale delete preserves the object and the current delete removes it
