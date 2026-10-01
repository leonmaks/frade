Feature: Reviews honor approved owning stage plans
  Scenario: Different stage reviewer assignments
    Given approved stage assignments Sol high and Astra xhigh with exact plan provenance
    When the owners automatically request their respective PRE or POST
    Then generated CLI, requested metadata, confinement probe and receipt use each exact pair
  Scenario: Missing or drifted assignment
    Given a missing assignment or a mismatched phase, source hash or excerpt
    When a review is requested
    Then it is BLOCKED before reviewer execution with no default or substitution
  Scenario: Actual invocation differs from selection
    Given selected Sol high with verified plan input
    When inner metadata or CLI instead uses Astra xhigh
    Then strict reception is BLOCKED and raw evidence remains
