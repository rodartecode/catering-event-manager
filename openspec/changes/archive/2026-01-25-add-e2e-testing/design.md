# E2E Testing Architecture

## Context

The application has a hybrid microservices architecture:
- Next.js 15 app (tRPC API, UI, authentication)
- Go scheduling service (resource conflict detection)
- Shared PostgreSQL 17 database

E2E tests must validate complete user workflows across both services.

## Goals

- Validate critical user workflows end-to-end
- Catch integration issues between Next.js and Go services
- Ensure role-based access control works correctly
- Verify real-time updates (SSE) function properly

## Non-Goals

- Replace unit/integration tests (those are already comprehensive)
- Test every UI component (covered by Vitest component tests)
- Performance benchmarking (separate tooling needed)

## Decisions

### 1. Test Database Strategy

**Decision**: Use Docker Compose with a dedicated test database

**Rationale**:
- Playwright config already uses `pnpm dev` webServer
- Testcontainers add complexity for E2E (slower startup, state management)
- Dedicated test database allows data seeding and cleanup between tests

**Implementation**:
```bash
# docker-compose.test.yml
services:
  postgres-test:
    image: postgres:17
    ports:
      - "5433:5432"  # Different port to avoid conflicts
    environment:
      POSTGRES_DB: catering_events_test
```

### 2. Authentication in Tests

**Decision**: Use direct database seeding + Next-Auth session cookies

**Rationale**:
- Bypass login UI for most tests (faster, less flaky)
- Test login UI only in dedicated auth workflow tests
- Store auth state in Playwright storageState for reuse

**Implementation**:
```typescript
// test/e2e/helpers/auth.ts
export async function loginAsAdmin(page: Page) {
  // Seed user if not exists
  await seedTestUser('admin@test.com', 'admin');
  // Navigate to login and authenticate
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@test.com');
  await page.fill('[name="password"]', 'testpass123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

// Or use storageState for faster tests
export async function getAdminStorageState(): Promise<string> {
  // Return path to saved auth state
  return '.playwright/auth/admin.json';
}
```

### 3. Test Organization

**Decision**: Organize tests by workflow, not by page

**Rationale**:
- Workflows span multiple pages
- Easier to maintain test isolation
- Matches business use cases

**Structure**:
```
test/e2e/
├── helpers/
│   ├── auth.ts           # Authentication helpers
│   ├── db.ts             # Database seeding/cleanup
│   └── pages.ts          # Page object models
├── workflows/
│   ├── auth.e2e.ts       # Login, logout, role access
│   ├── event-lifecycle.e2e.ts
│   ├── task-management.e2e.ts
│   ├── resource-scheduling.e2e.ts
│   ├── client-communication.e2e.ts
│   └── analytics.e2e.ts
└── global-setup.ts       # One-time setup (seed admin user)
```

### 4. Go Service Integration

**Decision**: Run Go service as part of E2E test setup

**Rationale**:
- Resource conflict detection must work in E2E tests
- Tests validate full stack including Go service
- Docker Compose can orchestrate both services

**Implementation**:
```typescript
// playwright.config.ts update
webServer: [
  {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  {
    command: 'cd ../scheduling-service && go run cmd/scheduler/main.go',
    url: 'http://localhost:8080/health',
    reuseExistingServer: !process.env.CI,
  },
],
```

### 5. Test Isolation

**Decision**: Clean database state before each test file (not each test)

**Rationale**:
- Full cleanup before each test is slow
- Tests within a file can share setup (e.g., create event, then test workflows on it)
- Use `test.describe.serial` for dependent tests

**Implementation**:
```typescript
// In each test file
test.beforeAll(async () => {
  await cleanTestDatabase();
  await seedTestData();
});

test.describe.serial('Event Lifecycle', () => {
  // Tests run in order, sharing state
});
```

## Alternatives Considered

### Testcontainers for E2E
- **Pro**: Isolated database per test run
- **Con**: Slow startup (~10-15s), complex state management
- **Verdict**: Overkill for E2E (already used in integration tests)

### Mocking Go Service
- **Pro**: Faster tests, no Go dependency
- **Con**: Misses real integration issues
- **Verdict**: Real Go service is essential for E2E validation

### Page Object Pattern
- **Pro**: Abstracts page interactions
- **Con**: Can over-abstract for simple workflows
- **Verdict**: Use selectively for complex pages (events, analytics)

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Flaky tests due to timing | Use Playwright's auto-waiting, explicit waits for async operations |
| Slow test runs | Parallel execution, shared auth state, test-file-level isolation |
| Go service dependency | CI workflow starts Go service before tests |
| Database state pollution | beforeAll cleanup, clear isolation strategy |

## Migration Plan

1. Create E2E helper infrastructure
2. Implement auth workflow tests first (validates infrastructure)
3. Add remaining workflows one at a time
4. Integrate into CI pipeline
5. Document test patterns for future contributors

## Open Questions

- **SSE testing**: How to validate real-time updates? May need custom helpers to wait for SSE events.
- **File uploads**: If file upload features exist, need separate handling (Playwright supports this but requires setup).
