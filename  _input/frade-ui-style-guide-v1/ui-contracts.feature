Feature: Consistent Frade workbench
  # Contract specification only; requires real step definitions and app adapters.

  Scenario Outline: Theme switching preserves workspace state
    Given a dirty editor and an unsent AI draft are open
    When the user selects the "<theme>" theme
    Then all workbench surfaces use the selected semantic theme
    And editor changes and the AI draft remain unchanged
    Examples:
      | theme |
      | light |
      | dark |
      | high-contrast |

  Scenario: Explicit theme takes priority over the operating system
    Given the user has selected light rather than system
    When the operating system switches to dark
    Then Frade stays in light

  Scenario: Density is independent of theme
    Given the dark theme and compact density
    When the user selects comfortable density
    Then relevant rows and controls use comfortable minimum sizes
    And the theme stays dark
    And larger user text is not clipped

  Scenario: Returning restores meaningful work
    Given the user has enabled workspace restoration
    And a diagram and object editor were last active
    When Frade reopens that workspace
    Then those documents and the saved layout are restored
    And the real recovery state of unsaved work is clearly shown

  Scenario: Navigating to AI preserves repository work
    Given a repository editor has unsaved changes
    When the user selects the AI section
    And returns to Repository
    Then the editor still contains those changes

  Scenario: Keyboard focus is distinct from selection
    Given object A is selected in the repository tree
    When keyboard navigation moves focus to object B without selection
    Then object B has a visible focus indicator
    And object A retains its selection indicator

  Scenario: Closing a dirty tab after failed saving
    Given a dirty document is open
    When the user closes its tab and chooses Save
    And saving fails
    Then the tab stays open with its data intact
    And the error provides a recovery action

  Scenario: Tab movement has a keyboard alternative
    Given two editor groups exist
    When the user invokes Move to group from the tab menu
    Then the document moves to the selected group
    And document identity and changes are preserved

  Scenario: Modal returns keyboard focus
    Given an enabled control opens a modal dialog
    When the user cancels with Escape
    Then focus returns to that control if it still exists

  Scenario: Multiple selection survives picker filtering
    Given a multi-reference picker has selected objects A and B
    When a filter hides object A
    Then both A and B remain selected
    And the selected count is two

  Scenario: Reverse usage is read-only derived data
    Given an object is used by another object
    When the user opens Used in
    Then the usage is visible with navigation to the source
    And the derived list cannot be edited as forward references

  Scenario: Excluding a flow changes only the diagram
    Given a repository flow is included in the current bundle
    When the user invokes Exclude from diagram
    Then the flow is no longer included in the diagram
    And the repository flow still exists

  Scenario: Standalone editing has no hidden repository writes
    Given a standalone diagram
    When the user changes a visual status or arrow
    Then diagram appearance changes
    And no repository update is sent

  Scenario: Selecting a shape preserves route geometry
    Given a diagram with a committed route
    When the user hovers and selects an endpoint shape
    Then the route coordinates and constraints stay unchanged
    And feedback uses separate UI overlays

  Scenario: Streaming does not override reading position
    Given the user scrolled up in an AI conversation
    When additional response text arrives
    Then the reading position remains stable
    And Jump to latest is available

  Scenario: IME composition is not message submission
    Given an AI composer has active IME composition
    When the user presses Enter to confirm composition
    Then no AI message is submitted

  Scenario: Save feedback reflects actual persistence
    Given an editor has pending changes
    When saving completes successfully
    Then the dirty marker clears
    And a brief accessible Saved indication appears
    And the diagram remains visible and usable

  Scenario: Narrow layout does not lose editors
    Given two open editor groups and a properties sidebar
    When the viewport becomes narrower than 800 CSS pixels
    Then one editor group is visible
    And the other remains available through switching
    And navigation can be opened without shrinking the editor below usable size

  Scenario: Reduced motion preserves meaningful feedback
    Given the user prefers reduced motion
    When an operation completes
    Then its result remains visible and accessible
    And unnecessary animation is disabled
