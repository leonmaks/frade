# Spec Delta

## MODIFIED Requirements

### Requirement: Local diagram lifecycle compatibility

The migrated editor SHALL create, open, save, and save-as versioned JSON diagram documents locally. A malformed or unsupported document MUST leave the currently open diagram intact, and a supported round trip MUST preserve nodes, edges, route constraints, and viewport state without transient interaction state. Shape identity, supported visual styles, labels, fixed-port identities, edited route vertices, terminal offsets and document metadata MUST survive Save/Open. Save As SHALL request a nonempty document name and use it for subsequent downloads. Duplicate cell IDs, dangling node references and invalid optional geometry MUST be rejected before replacing the active graph. New/Open SHALL reset selection and undo history so undo cannot restore another document.

#### Scenario: Round-trip a migrated diagram

- **WHEN** a user saves a diagram containing nodes and edges and opens that document in the migrated package
- **THEN** supported graph content, route constraints, and viewport state are restored with the same observable behavior as the source editor

#### Scenario: Preserve styled shapes and edited routes

- **WHEN** the user saves and reopens a diagram containing all supported shapes, styled connections, fixed ports and edited floating segments
- **THEN** shape identities, labels, supported styles, port identities, vertices and terminal offsets are preserved and the reopened graph remains editable

#### Scenario: Save with a new name

- **WHEN** the user confirms a nonempty name through Save As
- **THEN** the downloaded document and subsequent Save downloads use that name while cell and document identities remain stable

#### Scenario: Reject invalid files safely

- **WHEN** the user opens malformed JSON or a document with unsupported versions, duplicate IDs, invalid geometry or dangling references
- **THEN** the editor reports the error and preserves the existing graph, viewport and document identity

#### Scenario: Start a new document

- **WHEN** the user creates a new document after editing or opening another document
- **THEN** the graph is empty, viewport and document metadata are reset, and undo cannot recover cells from the previous document
