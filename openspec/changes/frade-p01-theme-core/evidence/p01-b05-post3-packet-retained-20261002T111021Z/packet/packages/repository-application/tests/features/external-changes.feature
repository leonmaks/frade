@CORE-013
Feature: external changes

  @test:AC-watch
  Scenario: the repository reloads twice
    Given an external writer changes an entity
    When the repository reloads twice
    Then the changed entity is available and duplicate reload events are suppressed
