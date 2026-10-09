Feature: Diagram lifecycle

  @APP-001
  Scenario: Create an empty diagram
    Given the editor is initialized
    When the user creates a new diagram
    Then the graph contains no cells

  @APP-002
  Scenario: Add a rectangle
    Given the editor is initialized
    When the user creates a rectangle
    Then exactly one node is added

  @APP-006
  Scenario: Save and load a diagram
    Given a diagram contains a node
    When the document is serialized and deserialized
    Then the node model is restored
