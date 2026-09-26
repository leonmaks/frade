@CORE-013
Feature: repository events

  @test:AC-events
  Scenario: a committed object event is delivered and the other unsubscribes
    Given two listeners exist and one throws
    When a committed object event is delivered and the other unsubscribes
    Then commit succeeds, the healthy listener receives it and receives nothing after unsubscribe
