@CORE-012
Feature: local index

  @test:AC-index
  Scenario: the SQLite index is corrupted and rebuilt
    Given source entities are persisted and an index can be rebuilt
    When the SQLite index is corrupted and rebuilt
    Then source-backed and indexed queries agree and source data remains intact
