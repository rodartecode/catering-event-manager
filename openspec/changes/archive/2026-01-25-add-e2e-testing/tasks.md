# Implementation Tasks

## 1. E2E Infrastructure Setup

- [x] 1.1 Create test directory structure
  - Create `apps/web/test/e2e/helpers/` directory
  - Create `apps/web/test/e2e/workflows/` directory

- [x] 1.2 Create authentication helpers (`test/e2e/helpers/auth.ts`)
  - `loginAsAdmin(page)` - Login with admin credentials
  - `loginAsManager(page)` - Login with manager credentials
  - `logout(page)` - Logout current user
  - `setupAuthState()` - Generate storageState files for fast auth

- [x] 1.3 Create database helpers (`test/e2e/helpers/db.ts`)
  - `cleanTestDatabase()` - Truncate all tables
  - `seedTestUser(email, role)` - Create test users
  - `seedTestEvent(data)` - Create test events
  - `seedTestClient(data)` - Create test clients
  - `seedTestResource(data)` - Create test resources

- [x] 1.4 Create page helpers (`test/e2e/helpers/pages.ts`)
  - Common selectors for navigation
  - Form interaction helpers
  - Toast/notification helpers

- [x] 1.5 Update Playwright config
  - Add global setup for auth state
  - Configure Go service in webServer array
  - Add test database environment variables

## 2. Auth Workflow Tests

- [x] 2.1 Create `test/e2e/workflows/auth.e2e.ts`
  - Test: User can login with valid credentials
  - Test: User sees error with invalid credentials
  - Test: User can logout
  - Test: Admin can access all pages
  - Test: Manager cannot access admin-only pages
  - Test: Unauthenticated user redirected to login

## 3. Event Lifecycle Tests

- [x] 3.1 Create `test/e2e/workflows/event-lifecycle.e2e.ts`
  - Test: Create new event (inquiry status)
  - Test: Update event status through lifecycle
    - inquiry → planning → preparation → in_progress → completed → follow_up
  - Test: View event status history/timeline
  - Test: Archive completed event
  - Test: Filter events by status
  - Test: Search events by name/client

## 4. Task Management Tests

- [x] 4.1 Create `test/e2e/workflows/task-management.e2e.ts`
  - Test: Create task for event
  - Test: Assign task to user
  - Test: Update task status (pending → in_progress → completed)
  - Test: Mark task as overdue
  - Test: View task dependencies
  - Test: Filter tasks by status/category/assignee

## 5. Resource Scheduling Tests

- [x] 5.1 Create `test/e2e/workflows/resource-scheduling.e2e.ts`
  - Test: Create resources (staff, equipment, materials)
  - Test: Assign resource to task
  - Test: Detect resource conflict (same resource, overlapping time)
  - Test: View conflict warning before assignment
  - Test: View resource schedule calendar
  - Test: Filter resources by type/availability

## 6. Client Communication Tests

- [x] 6.1 Create `test/e2e/workflows/client-communication.e2e.ts`
  - Test: Create new client
  - Test: Record communication (phone, email, meeting, other)
  - Test: Schedule follow-up
  - Test: View overdue follow-ups
  - Test: Complete follow-up
  - Test: View client event history

## 7. Analytics Tests

- [x] 7.1 Create `test/e2e/workflows/analytics.e2e.ts`
  - Test: Analytics page loads with charts
  - Test: Event completion chart displays data
  - Test: Resource utilization chart displays data
  - Test: Task performance chart displays data
  - Test: Filter analytics by date range
  - Test: Analytics shows empty state when no data

## 8. CI Integration

- [x] 8.1 Update GitHub Actions workflow
  - Add E2E test job that runs after unit tests
  - Start PostgreSQL test database
  - Start Go scheduling service
  - Run Playwright tests
  - Upload test artifacts on failure

- [x] 8.2 Add documentation
  - Update README with E2E test commands
  - Document test patterns and helpers
  - Add troubleshooting guide for common failures

## Verification

```bash
# Run all E2E tests locally
pnpm test:e2e

# Run specific workflow
pnpm test:e2e --grep "Event Lifecycle"

# Run in UI mode for debugging
pnpm test:e2e:ui

# Run in CI mode
CI=true pnpm test:e2e
```

## Definition of Done

- [x] All 6 workflow test files created and passing
- [x] E2E tests complete in <5 minutes
- [x] CI pipeline includes E2E tests
- [x] Documentation updated
- [ ] No flaky tests (3 consecutive green runs) - *pending CI runs*
