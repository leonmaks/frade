Feature: Faithful document file lifecycle

  @APP-101
  Scenario: Preserve a styled diagram through real files
    Given a styled diagram with all shapes and an edited route is open
    When the diagram is downloaded and reopened
    Then its document and rendered route are preserved
    And the reopened diagram remains editable

  @APP-102
  Scenario: Reject an invalid file without losing work
    Given a styled diagram with all shapes and an edited route is open
    When an invalid document is selected
    Then an error is shown and the existing document is unchanged

  @APP-103
  Scenario: Save As retains identity and updates the name
    Given a styled diagram with all shapes and an edited route is open
    When Save As is confirmed with a new name
    Then subsequent downloads use the new name and original identities

  @APP-104
  Scenario: New clears the previous document and history
    Given a styled diagram with all shapes and an edited route is open
    When New is followed by Undo
    Then the document stays empty with fresh identity and default viewport
