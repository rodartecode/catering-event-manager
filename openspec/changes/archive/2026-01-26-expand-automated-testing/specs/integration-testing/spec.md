## ADDED Requirements

### Requirement: Router Integration Test Coverage

The system SHALL have integration tests that validate business rules, edge cases, and error paths for all tRPC procedures beyond happy-path and authorization checks.

#### Scenario: Event status transitions validated

- **GIVEN** an event in a specific lifecycle status
- **WHEN** the admin attempts to update the status to each possible next state
- **THEN** valid transitions succeed with status log entries created, and invalid transitions are rejected

#### Scenario: Task dependency enforcement validated

- **GIVEN** tasks with dependency relationships (A depends on B)
- **WHEN** task A's status is updated before task B is completed
- **THEN** the update is rejected with a dependency constraint error

#### Scenario: Archive constraints enforced

- **GIVEN** events in various lifecycle statuses
- **WHEN** an admin attempts to archive each event
- **THEN** only events with completed status are archived successfully, and non-completed events are rejected

#### Scenario: Client follow-up workflow validated

- **GIVEN** a client with recorded communications and scheduled follow-ups
- **WHEN** follow-up dates pass without completion
- **THEN** getDueFollowUps returns them with accurate daysOverdue calculations

---

### Requirement: Cross-Service Contract Validation

The system SHALL have integration tests that validate the HTTP contract between the Next.js scheduling client and the Go scheduling service by making real HTTP calls against a running Go service instance.

#### Scenario: Conflict detection returns accurate results with real Go service

- **GIVEN** a resource with an existing schedule assignment in the database
- **WHEN** the scheduling client calls the Go service to check for conflicts with an overlapping time range
- **THEN** the Go service returns conflict details including resource name, conflicting times, and event information

#### Scenario: Resource availability returns schedule entries from real Go service

- **GIVEN** a resource with multiple schedule assignments
- **WHEN** the scheduling client queries the Go service for resource availability in a date range
- **THEN** the Go service returns all overlapping schedule entries with task and event context

#### Scenario: End-to-end resource assignment with conflict detection

- **GIVEN** a task requiring resource assignment and a resource with an existing overlapping schedule
- **WHEN** the tRPC assignResources procedure is called (without mocking the scheduling client)
- **THEN** the real Go service detects the conflict and the procedure returns conflict details to the caller

---

### Requirement: Authorization Boundary Matrix

The system SHALL have automated tests that systematically verify every tRPC procedure enforces its expected role-based access control using a data-driven approach covering all roles against all procedures.

#### Scenario: Admin procedures reject manager, client, and unauthenticated callers

- **GIVEN** a tRPC procedure defined with `adminProcedure` middleware
- **WHEN** a manager, client, or unauthenticated user calls the procedure
- **THEN** the call is rejected with FORBIDDEN or UNAUTHORIZED error

#### Scenario: Protected procedures reject unauthenticated callers

- **GIVEN** a tRPC procedure defined with `protectedProcedure` middleware
- **WHEN** an unauthenticated user calls the procedure
- **THEN** the call is rejected with UNAUTHORIZED error

#### Scenario: Client procedures reject admin and manager callers

- **GIVEN** a tRPC procedure defined with `clientProcedure` middleware
- **WHEN** an administrator or manager calls the procedure
- **THEN** the call is rejected with FORBIDDEN error indicating client access required

---

### Requirement: Business Rule Behavioral Validation

The system SHALL have scenario-driven tests that validate multi-step business workflows exercising multiple procedures across routers to ensure end-to-end business rule correctness.

#### Scenario: Complete event lifecycle from inquiry through archive

- **GIVEN** a newly created event in inquiry status
- **WHEN** the event progresses through planning, preparation, in_progress, completed, follow_up, and is then archived
- **THEN** each transition succeeds, the status log records all transitions, and the archived event rejects further mutations

#### Scenario: Task dependency chain execution order enforced

- **GIVEN** three tasks where C depends on B and B depends on A
- **WHEN** tasks are completed in order (A first, then B, then C)
- **THEN** each task can only progress after its dependency is completed, and circular dependencies are prevented

#### Scenario: Resource conflict detection and force override workflow

- **GIVEN** a resource assigned to one event during a specific time period
- **WHEN** the same resource is assigned to another event with overlapping time
- **THEN** the conflict is detected and reported, and a force override creates the assignment despite the conflict
