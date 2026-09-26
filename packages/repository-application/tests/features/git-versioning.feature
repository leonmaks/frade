@CORE-018
Feature: git versioning

  @test:AC-git
  Scenario: an object is edited and versioning is inspected
    Given a native repository has no Git metadata
    When an object is edited and versioning is inspected
    Then native editing works and Git reports unavailable explicitly
