# Spec Delta

## Purpose

Manage the separate backend process reliably through startup, failure, bounded recovery and application shutdown.

## ADDED Requirements

### Requirement: Verified backend startup

The host SHALL launch a separate backend process and accept it as ready only after a valid protocol handshake within a bounded startup deadline.

#### Scenario: Complete startup

- **WHEN** the backend announces a compatible protocol version
- **THEN** host health becomes ready and requests can be served

#### Scenario: Reject incompatible startup

- **WHEN** handshake validation fails or its deadline expires
- **THEN** the backend is marked unavailable and terminated

### Requirement: Bounded crash recovery

Unexpected backend exit SHALL mark health unavailable and fail pending requests. The host SHALL retry startup a bounded number of times and publish each state transition without replaying in-flight operations.

#### Scenario: Recover after a crash

- **WHEN** a ready backend exits unexpectedly
- **THEN** the UI observes unavailability followed by recovery when a replacement process completes its handshake

### Requirement: Controlled shutdown

Application shutdown SHALL stop recovery timers, settle pending requests and stop the backend within a bounded deadline.

#### Scenario: Quit with a running backend

- **WHEN** the user quits the application
- **THEN** the backend exits and no replacement process is started
