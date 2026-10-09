@CORE-010
Feature: repository session

  @test:AC-session-open
  Scenario: the repository is opened and a mutation is requested
    Given a native repository has a writable or read-only profile
    When the repository is opened and a mutation is requested
    Then state and capabilities match the profile and read-only storage receives no write

  @test:AC-session-close
  Scenario: the session is closed twice
    Given an open repository session owns resources
    When the session is closed twice
    Then it remains CLOSED and rejects new reads
