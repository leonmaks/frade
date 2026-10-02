@CORE-010 @CORE-011
Feature: yaml adapter

  @test:AC-yaml
  Scenario: a known entity attribute is updated
    Given yAML has comments and unknown metadata
    When a known entity attribute is updated
    Then unrelated metadata and comments remain
