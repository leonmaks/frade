@CORE-006
Feature: query engine

  @test:AC-query
  Scenario: bounded pages and attribute filters are requested
    Given multiple objects match a query
    When bounded pages and attribute filters are requested
    Then pages contain each stable identity once and excessive limits are rejected
