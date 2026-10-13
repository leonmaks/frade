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
