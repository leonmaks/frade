@CORE-015
Feature: reconnect and conflicts

  @test:AC-reconnect
  Scenario: the domain revision changes and the binding reconnects
    Given a detached binding has local visual overrides
    When the domain revision changes and the binding reconnects
    Then the binding is stale and overrides survive without domain overwrite
