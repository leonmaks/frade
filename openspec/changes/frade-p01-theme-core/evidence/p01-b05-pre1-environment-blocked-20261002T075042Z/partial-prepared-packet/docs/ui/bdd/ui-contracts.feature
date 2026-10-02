Feature: Frade UI design contract adoption
  # Foundation binds to assertion tests; future cases have explicit owners.
  # Binding integrity and test execution are separate checks.

  @FUI-001 @foundation
  Scenario: Generated token drift cannot pass
    Given canonical token source and generated CSS and typed roles
    When an isolated fixture changes generated CSS
    Then compliance fails with Generated CSS drift
    And canonical source and outputs remain unchanged

  @FUI-002 @foundation
  Scenario: New colors cannot hide behind legacy exceptions
    Given an inventoried legacy color in a feature
    When a fixture adds another feature color
    Then compliance fails at the new occurrence

  @FUI-003 @foundation @pre01
  Scenario Outline: Forced colors override every generated palette role
    Given generated token CSS in an isolated browser document
    And OS prefers "<scheme>" with root theme "<theme>"
    When forced colors are active
    Then every generated theme role uses its declared system keyword on root and inherited child
    And original input files remain unchanged
    Examples:
      | scheme | theme         |
      | light  | absent        |
      | light  | system        |
      | light  | light         |
      | light  | dark          |
      | light  | high-contrast |
      | dark   | absent        |
      | dark   | system        |
      | dark   | light         |
      | dark   | dark          |
      | dark   | high-contrast |

  @FUI-004 @foundation @pre01
  Scenario Outline: Normal media retains the selected generated palette
    Given generated token CSS in an isolated browser document
    And OS prefers "<scheme>" with root theme "<theme>"
    When forced colors are inactive
    Then explicit themes retain their palette while absent and System follow OS preference on root and inherited child
    And original input files remain unchanged
    Examples:
      | scheme | theme         |
      | light  | absent        |
      | light  | system        |
      | light  | light         |
      | light  | dark          |
      | light  | high-contrast |
      | dark   | absent        |
      | dark   | system        |
      | dark   | light         |
      | dark   | dark          |
      | dark   | high-contrast |

  @FUI-005 @p01
  Scenario Outline: Theme switching preserves actual workbench state
    Given a dirty object editor and an open diagram in the real workbench
    When the user commits the "<theme>" theme
    Then shell portals and required diagram adapters share the committed snapshot
    And draft content document bytes dirty state selection and undo remain unchanged
    Examples:
      | theme         |
      | light         |
      | dark          |
      | high-contrast |

  @FUI-006 @p01
  Scenario: Preview cancellation does not persist
    Given committed Light and a dirty editor
    When Dark is previewed and Escape is pressed
    Then all participants return to Light without a setting write
    And unsaved changes remain

  @FUI-007 @p01
  Scenario: Canvas preparation failure rolls back
    Given a committed theme and embedded diagram
    When a required canvas adapter rejects preparation
    Then no participant or persistent setting commits the candidate
    And previous theme and document content remain intact

  @FUI-008 @p01
  Scenario: Explicit theme outranks system
    Given explicit Light instead of System
    When OS changes to Dark
    Then committed Light remains

  @FUI-009 @p01
  Scenario: Density is independent
    Given Dark and compact density
    When comfortable density is selected and restored after restart
    Then controls meet comfortable minimums without clipping
    And theme stays Dark

  @FUI-010 @shell
  Scenario: Return restores meaningful work
    Given restoration enabled with object and diagram editors
    When Frade reopens the workspace
    Then documents and layout restore with actual unsaved recovery state

  @FUI-011 @shell
  Scenario: Modal returns focus
    Given an enabled control opens a modal
    When Escape cancels
    Then focus returns to its opener when available

  @FUI-012 @shell
  Scenario: Feedback reflects persistence
    Given pending changes
    When persistence succeeds
    Then dirty clears and accessible Saved feedback leaves the diagram usable

  @FUI-013 @shell
  Scenario: Narrow layout preserves editors
    Given two groups and a properties sidebar
    When viewport narrows below 800 CSS pixels
    Then one group remains visible and the other is accessible through switching without data loss

  @FUI-014 @shell
  Scenario: Reduced motion retains feedback
    Given prefers-reduced-motion
    When an operation completes
    Then result stays visible with optional movement disabled

  @FUI-015 @tree-tabs
  Scenario: Focus differs from selection
    Given A selected in tree
    When keyboard focuses B
    Then B has visible focus and A retains selection

  @FUI-016 @tree-tabs
  Scenario: Failed saving does not close dirty tab
    Given a dirty document
    When close chooses Save and saving fails
    Then tab and content remain with a recovery action

  @FUI-017 @tree-tabs
  Scenario: Tab movement has keyboard alternative
    Given two editor groups
    When Move to group is invoked through keyboard
    Then document identity and draft are preserved

  @FUI-018 @forms
  Scenario: Multiple selection survives filtering
    Given selected references A and B
    When search hides A
    Then both stay selected and selected count is two

  @FUI-019 @forms
  Scenario: Reverse usage is read only
    Given an object referenced by another object
    When Used in opens
    Then navigation to the source exists and the derived collection cannot be edited

  @FUI-020 @draw
  Scenario: Exclude changes only diagram
    Given repository flow in current bundle
    When Exclude from diagram runs
    Then membership changes and repository flow still exists

  @FUI-021 @draw
  Scenario: Standalone sends no repository writes
    Given standalone diagram
    When visual status or arrow changes
    Then no repository update is sent

  @FUI-022 @draw
  Scenario: Selection preserves route geometry
    Given committed route
    When endpoint is hovered and selected
    Then endpoints route constraints and document semantics stay unchanged

  @FUI-023 @ai-future
  Scenario: AI navigation preserves repository draft
    Given dirty editor and a future approved AI presentation adapter
    When AI opens and Repository is revisited
    Then repository draft remains

  @FUI-024 @ai-future
  Scenario: Streaming preserves reading position
    Given future approved streaming adapter and user scrolled up
    When response text arrives
    Then position stays stable and Jump to latest appears

  @FUI-025 @ai-future
  Scenario: IME is not submission
    Given future approved composer with active IME
    When Enter confirms composition
    Then no message is submitted


  @FUI-026 @foundation @eol-repair
  Scenario: Accepted LF attributes survive fresh Windows-style checkout
    Given all eight canonical artifacts and the exact accepted attributes in a verified OS-temp Git repository
    And that temporary repository uses core.autocrlf true
    When the staged fixture files are freshly checked out
    Then all eight raw SHA256 hashes and LF bytes match the original canonical artifacts
    And the unchanged token CLI exits zero with 102 named pairs
    And the verified temporary repository is removed

  @FUI-027 @foundation @eol-repair
  Scenario: Missing attributes demonstrate physical byte drift
    Given the same canonical artifacts in an isolated Git repository without attributes
    And core.autocrlf true is set only in that repository
    When the staged fixture files are freshly checked out
    Then physical CRLF drift is observed and the unchanged token CLI exits one
    And production source input and historical evidence hashes remain unchanged

  @FUI-028 @foundation @eol-repair
  Scenario: LF rule scope cannot silently broaden
    Given the exact eight accepted logical attribute entries
    When a required entry is removed or an extra wildcard or CRLF-target entry is added
    Then checkout compliance fails without normalizing protected artifacts or accepting new scope


  @FUI-029 @foundation @archive-repair
  Scenario: Compliance survives completed change archival
    Given canonical BDD registry and assertion sources in an owned OS-temp fixture
    When the active change is moved to the archive in that fixture
    Then the actual traceability CLI exits zero and all seven compliance controls have their required exits
    And the verified fixture is removed without modifying production or historical evidence

  @FUI-030 @foundation @archive-repair
  Scenario: Compliance needs no active or archived change artifacts
    Given canonical BDD registry and assertion sources in an owned OS-temp fixture
    When neither active nor archived change artifacts exist in that fixture
    Then the actual traceability CLI exits zero and all seven compliance controls have their required exits
    And checks resolve trusted tooling with resources from the fixture

  @FUI-031 @foundation @archive-repair
  Scenario: Missing or malformed canonical BDD cannot fall back
    Given a valid historical change copy and canonical BDD in an owned OS-temp fixture
    When canonical BDD is missing or malformed
    Then the actual traceability CLI fails and compliance cannot pass
    And no active archived or production contract replaces the invalid canonical contract
