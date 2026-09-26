## ADDED Requirements

### Requirement: Native offline Draw.io editing

The system SHALL use a pinned local Draw.io engine to open, edit and save native diagram XML without converting it to the standalone X6 model or sending diagram content to an external service.

#### Scenario: Complex native document

- **WHEN** a document containing compressed pages, layers, groups, edges, labels and custom XML attributes is opened, edited and saved
- **THEN** the document remains editable in Draw.io with its supported structure and attributes preserved.

#### Scenario: Invalid document

- **WHEN** a file cannot be decoded as a supported diagram
- **THEN** the editor reports an error and leaves the original file unchanged.

### Requirement: Declared compatibility boundaries

The system MUST document the supported engine version and distinguish native document fidelity from unavailable external resources, plugins, cloud integrations, server-backed exports and future-version features.

#### Scenario: Offline external dependency

- **WHEN** a diagram references an unavailable external image, font or extension
- **THEN** the application does not claim complete visual fidelity and does not silently replace or discard that dependency from the document.
