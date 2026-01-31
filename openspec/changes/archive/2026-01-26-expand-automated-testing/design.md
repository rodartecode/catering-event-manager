## Context

The catering event management system has 42 test files (30 TypeScript, 5 Go, 7 Playwright E2E) with solid infrastructure but shallow coverage. Router tests cover happy paths and auth rejection but not business rules, state transitions, or edge cases. The Go scheduling service is always mocked in TypeScript tests, creating contract drift risk. No systematic authorization coverage exists across the ~40 tRPC procedures.

**Stakeholders**: Development team, CI/CD pipeline
**Constraints**: Tests must run in CI without manual setup; cross-service tests require Go 1.24+ installed

## Goals / Non-Goals

- **Goals**:
  - Validate all business rules (status transitions, archive constraints, dependency chains) with automated tests
  - Verify the HTTP contract between Next.js scheduling client and Go scheduler with real calls
  - Ensure 100% authorization boundary coverage (every procedure × every role)
  - Provide multi-step workflow tests for critical business processes

- **Non-Goals**:
  - Component/UI interaction tests (separate proposal)
  - Performance/load testing (separate proposal)
  - Expanding Go unit tests (already at 91.7% scheduler coverage)
  - Adding E2E Playwright scenarios (covered by existing `e2e-testing` spec)

## Decisions

### Decision 1: Child Process for Go Service (not Docker Compose)

Cross-service integration tests build the Go binary and spawn it as a child process with a dynamically allocated port.

**Why**: Faster startup (~2s vs ~15s for Docker), no Docker dependency in test runner, simpler CI configuration. The Go service only has 2 endpoints, making full integration tests practical without container orchestration.

**Alternative**: Docker Compose with service containers. Rejected because it adds Docker as a test dependency, slower startup hurts developer feedback loop, and the simple 2-endpoint Go service doesn't warrant container orchestration for testing.

### Decision 2: Data-Driven Authorization Matrix (not Inline per-Test)

Authorization tests use a declarative matrix mapping procedures to expected access levels, with test cases generated via `describe.each`.

**Why**: Self-documenting (the matrix IS the access control spec), catches gaps automatically when new procedures are added, ~120 test cases from ~50 lines of configuration.

**Alternative**: Inline auth tests in each router test file. Rejected because ad-hoc testing misses gaps (current state proves this) and makes it hard to audit coverage.

### Decision 3: Separate Scenario Test Files (not Inline in Router Tests)

Multi-step business rule tests go in `test/scenarios/` rather than inside router test files.

**Why**: Scenario tests exercise multiple procedures across routers (create event → create task → assign resource → check conflict). They don't belong in a single router's test file. Separate files also enable different test isolation strategies (shared state within scenario vs clean state per unit test).

### Decision 4: Shared Testcontainers PostgreSQL for Cross-Service

Both TypeScript tRPC callers and the Go child process connect to the same Testcontainers PostgreSQL instance.

**Why**: Validates real data flow through both services against the same database state. Separate databases would miss schema drift issues.

**Risk**: Test isolation - Go service and TypeScript share database state. Mitigated by running cross-service tests sequentially (no `fileParallelism`) and cleaning database between tests.

## Risks / Trade-offs

- **CI time increase (~90s)**: Cross-service tests add Go build + service startup time. Mitigated by running cross-service tests in a separate CI job that can be parallelized.
- **Go binary build dependency**: Cross-service tests require Go toolchain. Mitigated by making integration tests a separate Vitest project that CI can skip if Go isn't available.
- **Test maintenance**: ~226 new tests increase maintenance burden. Mitigated by data-driven patterns (auth matrix), shared factories, and clear test naming.

## Implementation Details

### Area 1: Router Test Deepening

Add new `describe` blocks to existing router test files. No new files needed.

**Event router** (`apps/web/src/server/routers/event.test.ts`):
- `event.updateStatus`: Valid transitions (8 cases), archived event rejection, status log creation, auth rejection
- `event.update`: Field updates, archived event rejection, non-existent event handling
- `event.archive`: Completed-only constraint, already-archived rejection, field population
- `event.getById`: Full response shape, status history inclusion, NOT_FOUND handling
- `event.list`: Status/client/date filtering, pagination cursor behavior, archived exclusion

**Task router** (`apps/web/src/server/routers/task.test.ts`):
- Multi-level dependency chains (A→B→C execution order)
- Archived event constraints on all mutations
- Pagination edge cases (overdueOnly, assignedToMe)
- Resource assignment: multi-resource, force override, service unavailability

**Resource router** (`apps/web/src/server/routers/resource.test.ts`):
- Combined type + availability filters
- Multiple resource conflict responses
- Schedule retrieval with date ranges

**Clients router** (`apps/web/src/server/routers/clients.test.ts`):
- Communication CRUD with event/client context
- Follow-up lifecycle: schedule → detect overdue → complete
- Portal access: enable → create user → disable → deactivate user
- getDueFollowUps with overdue calculation accuracy

### Area 2: Cross-Service Integration

**Infrastructure** (`apps/web/test/integration/setup.ts`):
```
1. setupGoService():
   - go build -o /tmp/test-scheduler cmd/scheduler/main.go
   - Find available port via net.createServer().listen(0)
   - Spawn child process with DATABASE_URL and PORT env vars
   - Wait for health check (GET /api/v1/health) with retry
   - Return { port, process, url }

2. teardownGoService():
   - Kill child process
   - Clean up binary
```

**Test scenarios** (`apps/web/test/integration/cross-service.test.ts`):
- Conflict detection: overlapping assignments detected with real Go service
- No conflict: non-overlapping assignments pass
- Multiple resources: mixed conflict/clear results
- Resource availability: schedule entries returned for date range
- End-to-end: tRPC assignResources → Go conflict check → DB write

**Vitest config**: New `integration` project with:
- `testMatch: ['test/integration/**/*.test.ts']`
- `testTimeout: 30000`
- `setupFiles: ['./test/integration/setup.ts']`
- `fileParallelism: false`

### Area 3: Authorization Matrix

**Structure** (`apps/web/test/auth-matrix.test.ts`):
```typescript
const procedures = {
  // adminProcedure - only administrator
  'event.create': { access: 'admin', input: () => eventCreateInput() },
  'event.updateStatus': { access: 'admin', input: () => eventStatusInput() },
  // ... ~40 procedures

  // protectedProcedure - admin + manager
  'event.list': { access: 'protected', input: () => ({}) },
  // ...

  // clientProcedure - only client
  'portal.getSummary': { access: 'client', input: () => ({}) },
  // ...
};
```

For each procedure and each unauthorized role, generate a test case that calls the procedure and asserts `UNAUTHORIZED` or `FORBIDDEN` error.

**Input factories** (`apps/web/test/helpers/input-factories.ts`):
Minimal valid input generators for each procedure. Some procedures require pre-existing data (event, client, task); these use factory helpers to seed before calling.

### Area 4: Business Rule Scenarios

**Event lifecycle** (`apps/web/test/scenarios/event-lifecycle.test.ts`):
- Full traversal: inquiry → planning → preparation → in_progress → completed → follow_up → archive
- Archive constraint: non-completed events cannot be archived
- Frozen invariant: archived events reject all mutations

**Task dependencies** (`apps/web/test/scenarios/task-dependencies.test.ts`):
- 3-level chain: C depends on B depends on A. C blocked until B complete, B blocked until A complete.
- Circular prevention: A→B→C, then C→A rejected
- Deletion cascade: delete B, C's dependency cleared

**Resource conflicts** (`apps/web/test/scenarios/resource-conflicts.test.ts`):
- Detection: assign Chef 9AM-5PM, try 1PM-9PM → conflict returned
- Force override: force=true succeeds despite conflict
- Service down: force=true proceeds with warning

**Client communication** (`apps/web/test/scenarios/client-communication.test.ts`):
- Record → schedule follow-up → verify not yet due → advance date → verify overdue → complete → verify resolved

## Open Questions

None remaining after user confirmed: child process approach for Go service, all 4 areas in scope.
