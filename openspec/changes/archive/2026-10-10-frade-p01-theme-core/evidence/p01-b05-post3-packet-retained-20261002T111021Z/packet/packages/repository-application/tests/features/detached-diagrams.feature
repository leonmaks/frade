@CORE-014 @CORE-015
Feature: detached diagrams

  @test:AC-detached
  Scenario: it detaches and the repository closes
    Given a bound diagram element has cached content and visual overrides
    When it detaches and the repository closes
    Then cached content and overrides remain available for standalone editing
