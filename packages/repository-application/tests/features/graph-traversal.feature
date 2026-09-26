@CORE-006
Feature: graph traversal

  @test:AC-traversal
  Scenario: bounded and unbounded traversals are requested
    Given a graph has a directed cycle
    When bounded and unbounded traversals are requested
    Then bounded traversal terminates without duplicates and unbounded depth is rejected
