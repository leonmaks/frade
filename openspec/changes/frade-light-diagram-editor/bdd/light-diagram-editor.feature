Feature: Shared fixed light diagram editor
  Editor presentation stays stable while application themes and system accessibility change.
  These stage scenarios are planning contracts; executable bindings are not implemented yet.

  @LDE-001
  Scenario Outline: Editor colors remain stable across application selections
    Given a dirty <engine> diagram in <density> density
    And Windows forced colors is inactive
    When the application selects <theme>
    Then the editor workspace and its panels use the common Light profile
    And the external workbench uses the selected theme
    And authored data and editor identity remain unchanged
    Examples:
      | engine | density     | theme             |
      | Frade  | compact     | Dark              |
      | Drawio | comfortable | VSCodeDark2026    |
      | Frade  | comfortable | HighContrast      |
      | Drawio | compact     | System            |

  @LDE-002
  Scenario: Comparable controls share metrics across engines
    Given both editors show a supported button field and menu row
    When density changes between compact and comfortable
    Then comparable declared styles match the common editor tokens
    And targets focus and text contrast meet the applicable accessibility contract

  @LDE-003
  Scenario: Ownership follows an editor popup into the shared host
    Given two editors and the global theme picker exist in a dark workbench
    When one editor opens a portaled dialog and is later disposed
    Then the dialog uses the editor Light scope only while its owner is valid
    And global overlays and the other editor retain their proper ownership
    And modal focus and dismissal behavior remain unchanged

  @LDE-004
  Scenario: Neutral grid does not overwrite authored page or snapping
    Given supported documents have explicit colored and image-backed pages
    When grid visibility pan zoom and application theme change
    Then the neutral workspace and dots follow the shared editor profile
    And authored page paint grid semantics snapping coordinates and export remain unchanged

  @LDE-005
  Scenario: Style sample and canvas use the same supported appearance
    Given an opaque or translucent supported style sample on a declared backdrop
    When its attributes are applied to a canvas object
    Then the sample and canvas use the same authored color opacity and supported style values
    And no theme inversion tint or persisted default materialization occurs

  @LDE-006
  Scenario: Windows forced colors overrides the local Light scope
    Given dirty native and embedded diagrams retain their original author values
    When Windows forced colors is enabled and then disabled
    Then active system colors take priority and the editor returns to Light afterward
    And documents and application preference remain unchanged

  @LDE-007
  Scenario: Unchanged Light colors do not permit a stale acknowledgement
    Given editor colors are equal across two authoritative application revisions
    When an old frame acknowledgement arrives or the current adapter refuses
    Then stale success is rejected and the existing rollback or recovery contract applies
    And startup restore parked editors and restart retain their strict readiness guarantees

  @LDE-008
  Scenario: Keyboard focus and readonly state survive scoped presentation
    Given each editor exposes its existing reachable menus dialogs and readonly controls
    When keyboard navigation resize and 200 percent text zoom are exercised
    Then labels focus modal return and disabled actions reflect real behavior
    And global shortcuts and other editor ownership remain intact

  @LDE-009
  Scenario: Unsupported cross-engine appearance is disclosed
    Given a gradient font or image behavior has no supported equivalent
    When cross-engine appearance results are reported
    Then the specific capability is identified as unsupported or not applicable
    And no universal pixel parity or invented integration is claimed
