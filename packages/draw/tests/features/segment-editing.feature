Feature: Draw.io style segment editing

  @SEG-001 @SEG-008
  Scenario: Selected route exposes horizontal midpoint handle
    Given a selected edge has an eligible horizontal segment
    When segment handles are derived
    Then the horizontal handle is centered and uses ns-resize

  @SEG-012 @SEG-017 @SEG-018
  Scenario: Dragging changes the real route perpendicularly
    Given a horizontal segment drag is active
    When the pointer moves vertically
    Then the live real route is orthogonal and visible

  @SEG-025 @SEG-031
  Scenario: Straight floating edge can detour without crossing an obstacle
    Given a floating straight edge is selected
    When an unrelated object covers its requested corridor
    Then the segment follows the pointer through the unrelated object

  @SEG-039 @SEG-040 @SEG-048
  Scenario: Drag history is atomic and cancellation is reversible
    Given a segment drag has pending pointer updates
    When the drag is cancelled or committed
    Then pending updates are flushed or rolled back atomically
