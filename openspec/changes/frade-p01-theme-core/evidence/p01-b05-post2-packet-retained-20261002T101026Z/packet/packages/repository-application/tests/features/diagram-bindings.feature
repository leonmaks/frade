@CORE-015
Feature: diagram bindings

  @test:AC-binding
  Scenario: two diagram nodes bind the same reference
    Given a repository object exists
    When two diagram nodes bind the same reference
    Then both cache equivalent snapshots and no domain mutation occurs
