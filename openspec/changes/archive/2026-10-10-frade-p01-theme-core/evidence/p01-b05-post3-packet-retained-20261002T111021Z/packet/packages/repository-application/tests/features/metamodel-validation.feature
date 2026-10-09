@CORE-002 @CORE-017
Feature: metamodel validation

  @test:AC-metamodel
  Scenario: a new configured type is added and the repository is reopened
    Given a model configuration is valid
    When a new configured type is added and the repository is reopened
    Then the new type can be instantiated without changing Core

  @test:AC-model-version
  Scenario: the repository opens
    Given a source model has an unsupported schema version
    When the repository opens
    Then opening fails and the model bytes remain unchanged
