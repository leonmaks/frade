@CORE-004 @CORE-009
Feature: relation crud

  @test:AC-relation-crud
  Scenario: incoming/outgoing queries and a restricted target deletion are requested
    Given two objects are connected by a directed relation
    When incoming/outgoing queries and a restricted target deletion are requested
    Then both adjacency views agree and rejected deletion preserves the target
