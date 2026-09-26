# Spec Delta

## Purpose

Provide an isolated desktop host for the reusable diagram editor and future architecture repository UI.

## ADDED Requirements

### Requirement: Desktop editor host

The desktop application SHALL mount the reusable Draw editor and support local document editing, open, save and Save As without privileged access from its renderer.

#### Scenario: Launch and edit

- **WHEN** the desktop application starts
- **THEN** the user can create a diagram and save and reopen it through desktop-compatible file controls

### Requirement: Isolated local UI

The renderer MUST run with Node integration disabled, context isolation and sandbox enabled. The host MUST deny unapproved navigation, new windows and permission requests and serve only bundled renderer resources in production with a restrictive Content Security Policy.

#### Scenario: Reject privileged renderer access

- **WHEN** renderer code attempts to access Node or generic IPC
- **THEN** neither API is exposed and only named application methods are available

#### Scenario: Reject external navigation

- **WHEN** content attempts to navigate to an unapproved origin or open a new window
- **THEN** the host blocks that action
