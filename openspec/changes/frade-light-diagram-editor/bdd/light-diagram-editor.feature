Feature: Pinned upstream Drawio Light editor integration
  Fixed upstream styling coexists with workbench themes and protected documents.

  @LDE-001
  Scenario: Editors retain upstream Light across external choices
    Given dirty native and embedded editors in a dark workbench
    When external themes and System appearance change
    Then editor UI retains pinned Drawio Light and external themes still work
    And author data revisions and identities remain correct

  @LDE-002
  Scenario: Comparable controls derive fixed upstream metrics
    Given native and iframe controls use the verified upstream adapter
    When workbench compact and comfortable density change
    Then editor metrics stay fixed with declared accessibility exceptions
    And external preferences and authoritative metadata remain correct

  @LDE-003
  Scenario: Ownership survives portals and disposal
    Given two editors and a global theme picker
    When an owned dialog opens and its editor is disposed
    Then style focus and dismissal follow the valid owner only
    And other editors and global overlays retain their ownership

  @LDE-004
  Scenario: Workspace and grid preserve document semantics
    Given default and supported authored backgrounds
    When pan zoom grid visibility and external themes change
    Then UI backing follows pinned presentation
    And grid snapping transforms documents and export remain unchanged

  @LDE-005
  Scenario: Author paint is independent from upstream chrome
    Given supported opaque alpha inherited and Drawio page image or gradient content
    When appearance preview commit and cancel occur
    Then paint and sample values stay unchanged without inversion or materialized defaults
    And unsupported native capabilities are disclosed

  @LDE-006
  Scenario: Forced colors overrides upstream Light
    Given dirty native and embedded editors with owned UI
    When forced colors enters and exits
    Then UI uses system mapping while active and upstream Light afterward
    And documents and application preference remain unchanged

  @LDE-007
  Scenario: Equal styles never bypass transaction guards
    Given equal editor appearance across authoritative revisions
    When an old acknowledgement arrives or an adapter refuses
    Then original identity deadline refusal rollback and readiness contracts apply

  @LDE-008
  Scenario: Keyboard focus and constrained interaction survive
    Given reachable menus dialogs and readonly controls
    When keyboard resize text zoom and coarse targets are exercised
    Then labels focus return dismissal and disabled actions remain correct
    And styles and shortcuts do not leak to another editor

  @LDE-009
  Scenario: Source closure rejects adapter tampering
    Given pinned CSS resources and generated native adapter
    When source output scope or a required artifact is altered
    Then compliance fails and original history stays unchanged
    And unsupported controls and accessibility adaptations are disclosed
