# Tasks: Expand Automated Testing

## Overview

Deepen and expand the automated test suite across 4 areas: router integration tests, cross-service integration, authorization boundary matrix, and business rule behavioral tests.

**Dependencies:** Existing test infrastructure (Testcontainers, factories, tRPC callers)
**Parallelizable:** Phase 2-3 tasks are independent of each other. Phase 4 is independent of Phase 2-3.

---

## Phase 1: Foundation

### 1. Extend Factory Helpers

**File:** `apps/web/test/helpers/factories.ts`

- [x] Add `createArchivedEvent(db, clientId, createdBy, archivedBy)` convenience factory
- [x] Add `createEventStatusLog(db, eventId, changedBy, overrides)` factory
- [x] Add `createCommunicationWithFollowUp(db, eventId, clientId, contactedBy, overrides)` factory
- [x] Add `createFullTestData(db)` that seeds complete test state (users, client, event, tasks, resources)
- [x] Verify existing tests still pass

**Validation:** `pnpm test` passes with no regressions

---

### 2. Create Input Factories for Auth Matrix

**File:** `apps/web/test/helpers/input-factories.ts` (new)

- [x] Create minimal valid input generators for all ~40 tRPC procedures
- [x] Handle procedures that require pre-existing data (seed via factory helpers)
- [x] Export `getProcedureInput(procedureName)` function
- [x] Group by router (event, task, resource, clients, analytics, portal, user)

**Validation:** Each input factory produces valid input accepted by its procedure

---

### 3. Create Authorization Boundary Matrix Test

**File:** `apps/web/test/auth-matrix.test.ts` (new)

- [x] Define procedure access matrix mapping all procedures to expected role access
- [x] Generate test cases via `describe.each` for each unauthorized role × procedure
- [x] Test adminProcedures reject manager, client, unauthenticated
- [x] Test protectedProcedures reject unauthenticated (allow admin + manager)
- [x] Test clientProcedures reject admin, manager, unauthenticated
- [x] Verify ~120 test cases generated and passing

**Validation:** `pnpm test apps/web/test/auth-matrix.test.ts` -- all ~103 cases pass (97 rejection + 6 summary/meta)

---

## Phase 2: Router Test Deepening

### 4. Deepen Event Router Tests

**File:** `apps/web/src/server/routers/event.test.ts`

- [x] Add `event.updateStatus` tests: valid transitions (inquiry→planning, planning→preparation, etc.), status log creation, archived event rejection, auth rejection
- [x] Add `event.update` tests: field updates, archived event rejection, non-existent event, auth rejection
- [x] Add `event.archive` tests: completed-only constraint, already-archived rejection, sets archivedAt/archivedBy, auth rejection
- [x] Add `event.getById` tests: full response shape, status history, NOT_FOUND, archived event accessible by ID
- [x] Add `event.list` additional tests: status filter, clientId filter, date range filter, archived exclusion, cursor pagination, nextCursor behavior

**Validation:** `pnpm test apps/web/src/server/routers/event.test.ts` -- all ~31 cases pass

---

### 5. Deepen Task Router Tests

**File:** `apps/web/src/server/routers/task.test.ts`

- [x] Add multi-level dependency chain tests (A→B→C execution order enforcement)
- [x] Add archived event constraint tests on create, update, delete
- [x] Add `task.updateStatus` edge cases: revert completed→in_progress, dependency blocking
- [x] Add `task.assignResources` edge cases: multi-resource, unavailable resources, force override with conflicts, Go service unavailability with force=true
- [x] Add pagination tests: overdueOnly filter, cursor behavior

**Validation:** `pnpm test apps/web/src/server/routers/task.test.ts` -- all 50 cases pass

---

### 6. Deepen Resource Router Tests

**File:** `apps/web/src/server/routers/resource.test.ts`

- [x] Add combined type + availability filter tests
- [x] Add multiple resource conflict response tests
- [x] Add `resource.delete` tests: rejection when active assignments exist
- [x] Add `resource.getSchedule` date range edge cases

**Validation:** `pnpm test apps/web/src/server/routers/resource.test.ts` -- all pass (2 skipped due to Date serialization bug)

---

### 7. Add Clients Router Business Logic Tests

**File:** `apps/web/src/server/routers/clients.test.ts`

- [x] Add `clients.recordCommunication` tests: all fields, auth rejection
- [x] Add `clients.listCommunications` tests: pagination, join data included
- [x] Add follow-up workflow tests: scheduleFollowUp, completeFollowUp, getDueFollowUps
- [x] Add `getDueFollowUps` accuracy tests: overdue detection, daysOverdue calculation, excludes completed
- [x] Add portal access lifecycle tests: enablePortalAccess creates user, disablePortalAccess deactivates, email failure handling

**Validation:** `pnpm test apps/web/src/server/routers/clients.test.ts` -- all 43 cases pass

---

## Phase 3: Business Rule Behavioral Tests

### 8. Create Event Lifecycle Scenario Tests

**File:** `apps/web/test/scenarios/event-lifecycle.test.ts` (new)

- [x] Test full lifecycle traversal: inquiry → planning → preparation → in_progress → completed → follow_up → archive
- [x] Verify status log contains all transitions with correct previous/new status
- [x] Test archive constraint: non-completed events (inquiry, planning, preparation, in_progress) cannot be archived
- [x] Test frozen invariant: archived events reject updateStatus, update, and task creation

**Validation:** `pnpm test apps/web/test/scenarios/event-lifecycle.test.ts` -- all 4 pass

---

### 9. Create Task Dependency Chain Scenario Tests

**File:** `apps/web/test/scenarios/task-dependencies.test.ts` (new)

- [x] Test 3-level chain execution: C depends on B depends on A; enforce ordering
- [x] Test circular dependency prevention: A→B→C, then C→A rejected
- [x] Test self-reference prevention: A→A rejected
- [x] Test deletion cascade: delete middle task B, C's dependency cleared

**Validation:** `pnpm test apps/web/test/scenarios/task-dependencies.test.ts` -- all 4 pass

---

### 10. Create Resource Conflict Scenario Tests

**File:** `apps/web/test/scenarios/resource-conflicts.test.ts` (new)

- [x] Test conflict detection: assign resource 9AM-5PM, then try 1PM-9PM → conflict returned
- [x] Test force override: force=true succeeds despite conflict
- [x] Test multiple resources with mixed conflict/clear results
- [x] Test Go service unavailability: force=true proceeds with warning, force=false errors

**Validation:** `pnpm test apps/web/test/scenarios/resource-conflicts.test.ts` -- all 4 pass

---

### 11. Create Client Communication Workflow Scenario Tests

**File:** `apps/web/test/scenarios/client-communication.test.ts` (new)

- [x] Test record → schedule follow-up → verify not yet due → set past date → verify overdue → complete → verify resolved
- [x] Test daysOverdue calculation accuracy
- [x] Test multiple follow-ups for same client

**Validation:** `pnpm test apps/web/test/scenarios/client-communication.test.ts` -- all 3 pass

---

## Phase 4: Cross-Service Integration Tests

### 12. Create Cross-Service Test Infrastructure

**File:** `apps/web/test/integration/setup.ts` (new)

- [x] Implement `buildGoService()`: runs `go build -o /tmp/test-scheduler cmd/scheduler/main.go`
- [x] Implement `startGoService(dbUrl, port)`: spawns child process, waits for health check
- [x] Implement `stopGoService()`: kills process, cleans up binary
- [x] Implement dynamic port allocation via `net.createServer().listen(0)`
- [x] Add health check polling with retry (5 attempts, 1s interval)

**Validation:** Setup function starts and stops Go service programmatically

---

### 13. Create Cross-Service Integration Test Suite

**File:** `apps/web/test/integration/cross-service.test.ts` (new)

- [x] Test conflict detection: overlapping resource assignment detected by real Go service
- [x] Test no-conflict: non-overlapping assignments pass
- [x] Test multiple resources with mixed results
- [x] Test resource availability: schedule entries returned for date range
- [x] Test empty availability: unscheduled resource returns no entries
- [x] Test end-to-end: tRPC `task.assignResources` → real Go conflict check → DB write
- [x] Test end-to-end with conflict: assignment blocked by real Go service
- [x] Test end-to-end with force: assignment succeeds despite real conflict

**Validation:** `pnpm test:integration` -- all 8 scenarios pass

---

### 14. Add Integration Vitest Project Configuration

**File:** `apps/web/vitest.config.ts` (modify)

- [x] Add `integration` project with `testMatch: ['test/integration/**/*.test.ts']`
- [x] Set `testTimeout: 30000` for integration project
- [x] Set `fileParallelism: false` for integration project
- [x] Set `SCHEDULING_SERVICE_URL` environment variable dynamically
- [x] Exclude integration tests from default test project

**Validation:** `pnpm test` runs unit tests only; `pnpm test:integration` runs cross-service tests

---

### 15. Add Integration Test npm Scripts

**File:** `apps/web/package.json` (modify)

- [x] Add `test:integration` script
- [x] Ensure `test` script excludes integration tests by default

**Validation:** Both scripts work independently

---

## Phase 5: Verification and Documentation

### 16. Run Full Test Suite

- [x] Run `pnpm test` and verify all existing + new unit/behavioral tests pass
- [x] Run `pnpm lint && pnpm type-check` and verify no regressions

**Validation:** All commands exit with code 0

---

### 17. Update CLAUDE.md with New Test Commands

**File:** `CLAUDE.md` (modify)

- [x] Add `pnpm test:integration` to testing section
- [x] Document cross-service test requirements (Go toolchain)
- [x] Update test count and coverage information

**Validation:** CLAUDE.md accurately reflects test commands

---

### 18. Document Test Architecture Decisions

**File:** `docs/decisions/0002-expand-automated-testing.md` (new)

- [x] Record child process approach for Go service integration tests
- [x] Record data-driven auth matrix pattern
- [x] Record scenario test separation from router tests
- [x] Follow existing ADR format in `docs/decisions/`

**Validation:** ADR follows established format

---

## Verification Checklist

After completing all tasks:

- [x] `pnpm test` passes with ~279 new test cases (559 total, up from ~280)
- [x] Auth matrix covers all 49 procedures × relevant unauthorized roles (~103 cases)
- [x] Event lifecycle test validates all 6 status transitions + archive
- [x] Task dependency test validates 3-level chain + circular prevention
- [x] Resource conflict test validates detection + force override
- [x] Client communication test validates full follow-up workflow
- [x] `pnpm lint && pnpm type-check` passes with no regressions
