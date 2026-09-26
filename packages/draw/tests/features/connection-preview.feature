Feature: Floating connection preview

  @CONN-015
  Scenario: Free target preview preserves the source exit
    Given a source terminal is fixed on the right boundary
    And the target is still free
    When the pointer moves behind the source
    Then the preview preserves a valid source exit
    And the preview does not re-enter the source

