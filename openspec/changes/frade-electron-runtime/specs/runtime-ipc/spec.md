# Spec Delta

## Purpose

Define validated process communication usable by the desktop host and an Electron-independent backend service.

## ADDED Requirements

### Requirement: Typed validated health requests

Every runtime request SHALL carry a protocol version, unique request ID, allowlisted operation and validated payload. Main SHALL authorize the sending window and main frame before forwarding a request. The backend SHALL validate it again, and responses MUST be validated before delivery.

#### Scenario: Query backend health

- **WHEN** an authorized renderer queries health after backend startup
- **THEN** it receives a validated health snapshot from the backend

#### Scenario: Reject invalid requests

- **WHEN** a request has an unknown operation, malformed payload, unsupported version or unauthorized sender
- **THEN** the operation is rejected with a stable error code without backend execution

### Requirement: Correlation and finite request lifetime

The transport SHALL match responses by request ID, ignore unknown or duplicate response IDs, bound waiting by a timeout and support cancellation with resource cleanup. It MUST NOT replay requests automatically after timeout or process failure.

#### Scenario: Cancel or time out a request

- **WHEN** a waiting request is cancelled or reaches its deadline
- **THEN** its promise settles with a stable error and the pending entry and listeners are released

### Requirement: Sequenced health events

Health changes SHALL carry a monotonically increasing sequence. Renderer subscriptions MUST be removable and a fresh health query SHALL recover current state after a subscription gap.

#### Scenario: Remove a listener

- **WHEN** a component unsubscribes from health events
- **THEN** it receives no further events
