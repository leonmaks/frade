@CORE-007 @CORE-008
Feature: commands and revisions

  @test:AC-idempotency
  Scenario: identical and different payloads reuse that key
    Given an operation has been applied with an idempotency key
    When identical and different payloads reuse that key
    Then the original outcome is retained and changed payload is rejected without another effect

  @test:AC-object-crud
  Scenario: a stale delete and then a current delete are requested
    Given a persisted object is updated to a new revision
    When a stale delete and then a current delete are requested
    Then the stale delete preserves the object and the current delete removes it
