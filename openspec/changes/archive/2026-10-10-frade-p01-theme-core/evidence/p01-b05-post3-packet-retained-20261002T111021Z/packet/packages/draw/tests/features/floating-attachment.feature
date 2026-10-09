Feature: Floating contour attachments

  @ATTACH-001 @ATTACH-020
  Scenario: Source stays on a contour and leaves by its normal
    Given two rectangular nodes are connected in floating mode
    When their route is resolved
    Then the source attachment is on the source contour
    And the source terminal follows its outward normal

  @ATTACH-015
  Scenario: Straight edge slides within both side intervals
    Given two aligned floating rectangles
    When the corridor is moved within both vertical intervals
    Then both attachments slide without unnecessary bends

  @ATTACH-016
  Scenario: Out of range corridor creates a detour
    Given two aligned floating rectangles
    When the corridor is moved outside attachment intervals
    Then the result is a valid orthogonal detour
