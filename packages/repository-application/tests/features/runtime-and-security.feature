@CORE-001 @CORE-016 @CORE-019
Feature: runtime and security

  @test:AC-transport
  Scenario: an unknown path-bearing operation and a missing entity lookup are sent
    Given a controlled application transport is available
    When an unknown path-bearing operation and a missing entity lookup are sent
    Then unsafe operations are denied and typed errors omit internal stack traces
