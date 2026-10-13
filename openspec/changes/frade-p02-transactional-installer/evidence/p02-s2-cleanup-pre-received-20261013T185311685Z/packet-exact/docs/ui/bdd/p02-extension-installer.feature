Feature: Native transactional declarative package installer
  Background:
    Given Frade app0.1.0 and Frade API1.0.0
    And canonical Frade semantic color roles
    And immutable original package fixture and separately hashed compatible Light+Dark fixture
  Scenario: P02PKG001 Original incompatible sample
    When the Frade1.x sample is validated
    Then ENGINE_INCOMPATIBLE is returned without mutation or registration
  Scenario: P02PKG002 Compatible paired themes
    When the derived native package is validated
    Then both stable theme IDs and the exact archive hash are available without activation
  Scenario: P02PKG003 Actual resource boundaries
    When ZIP byte count, entry count, path depth or expansion ratio exceeds the contract
    Then a specific bounded diagnostic is returned
  Scenario: P02PKG004 Unsafe paths and links
    When an archive contains traversal, Windows aliases, case duplicates, ancestor conflicts or link/device modes
    Then validation rejects before any outside-root write
  Scenario: P02PKG005 Manifest and native theme schemas
    When identity, semver, contributions, capabilities or theme role data is unsupported
    Then the package is rejected without executing its content
  Scenario: P02PKG006 Corrupted transport
    When CRC, local and central metadata, encryption, compression or sizes disagree
    Then validation rejects with the actual cause
  Scenario: P02S2A001 Durable-intent-owned archive storage
    Given a validated durable STAGING and the exact chosen archive hash
    When its privately detached bounded bytes are copied through the checked backend
    Then readback preserves the exact ZIP and paired themes without registration or selection
  Scenario: P02S2A002 Immutable journal and complete checked scan
    When bounded canonical records are published through one held records parent
    Then exact ordinal, predecessor, payload, filename, identity and full initial/final inventories agree before authority is returned
    And a gap, fork, changed snapshot or unknown entry blocks without overwriting history
  Scenario: P02S2A003 Complete outcome reservation
    When admission checks the full phase, recovery-plan and disposition record sizes
    Then eight slots and eight MiB are reserved before STAGING and seven slots or one byte less refuse
    And recognized pending bytes consume their planned slot and no second admission spends the open reserve
  Scenario: P02S2A004 Actual NTFS helper death and reopen
    When the task-owned verified helper is killed before or after a valid COMMITTED record
    Then fresh checked scan keeps the prefix and selects old or new journal authority respectively
    And this component proof does not claim Main settings reconciliation or the full coordinator kill matrix
