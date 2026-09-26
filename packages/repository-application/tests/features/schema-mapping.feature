@CORE-011
Feature: schema mapping

  @test:AC-mapping
  Scenario: the repository is opened
    Given a source mapping attempts parent-directory traversal
    When the repository is opened
    Then the unsafe path is rejected before source access
