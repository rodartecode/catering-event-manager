# E2E Tests

End-to-end tests for the Catering Event Manager using [Playwright](https://playwright.dev/).

## Overview

These tests validate complete user workflows across the application, ensuring all critical paths work correctly from the user's perspective.

## Test Organization

Tests are organized by **workflow** rather than by page:

```
test/e2e/
├── helpers/
│   ├── auth.ts          # Login/logout helpers
│   ├── db.ts            # Database seeding/cleanup
│   └── pages.ts         # Page interaction helpers
├── workflows/
│   ├── auth.e2e.ts              # Authentication workflows
│   ├── event-lifecycle.e2e.ts   # Event creation → completion
│   ├── task-management.e2e.ts   # Task CRUD and status changes
│   ├── resource-scheduling.e2e.ts  # Resource assignment & conflicts
│   ├── client-communication.e2e.ts # Client management & follow-ups
│   └── analytics.e2e.ts         # Analytics dashboard
├── global-setup.ts      # Runs once before all tests
└── README.md
```

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI mode (interactive debugging)
pnpm test:e2e:ui

# Run specific test file
pnpm --filter @catering/web exec playwright test auth.e2e.ts

# Run with headed browser (visible)
pnpm --filter @catering/web exec playwright test --headed

# Debug a specific test
pnpm --filter @catering/web exec playwright test --debug auth.e2e.ts
```

## Prerequisites

1. **PostgreSQL** running (via Docker Compose):
   ```bash
   docker-compose up -d postgres
   ```

2. **Database schema** pushed:
   ```bash
   pnpm --filter @catering/database db:push
   ```

3. **Playwright browsers** installed:
   ```bash
   pnpm --filter @catering/web exec playwright install chromium
   ```

The test runner automatically starts:
- Next.js dev server on `:3000`
- Go scheduling service on `:8080`

## Test Patterns

### Authentication

Tests use pre-configured test users:

```typescript
import { loginAsAdmin, loginAsManager, TEST_ADMIN } from '../helpers/auth';

test('admin can access settings', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/settings');
  // ...
});
```

### Database Seeding

Each test file has a `beforeAll` hook that seeds required data:

```typescript
test.beforeAll(async () => {
  await cleanTestDatabase();
  await seedTestUser(TEST_ADMIN.email, 'administrator', TEST_ADMIN.password);
  await seedTestClient({ companyName: 'Test Company' });
});
```

### Resilient Selectors

Use multiple selector strategies for resilience:

```typescript
// Prefer data-testid, fall back to text
const button = page.locator('[data-testid="submit-btn"]')
  .or(page.locator('button:has-text("Submit")'));
await button.click();
```

### Conditional Tests

Handle optional UI features gracefully:

```typescript
const featureButton = page.locator('[data-testid="optional-feature"]');
if (await featureButton.isVisible({ timeout: 3000 })) {
  await featureButton.click();
  // Test the feature
}
```

## Workflow Coverage

| Workflow | Scenarios | Requirements |
|----------|-----------|--------------|
| Authentication | Login, logout, role-based access | FR-001 |
| Event Lifecycle | Create, status updates, archive | FR-001, FR-003 |
| Task Management | Create, assign, complete | FR-006 |
| Resource Scheduling | Create, assign, conflicts | FR-008, FR-011 |
| Client Communication | Record calls, schedule follow-ups | FR-022 |
| Analytics | Dashboard loading, filtering | FR-018 |

## CI Integration

E2E tests run in GitHub Actions after unit tests pass:

```yaml
e2e-tests:
  needs: [unit-tests, go-tests]
  # ... PostgreSQL service, Playwright setup
```

On failure, test artifacts are uploaded:
- `playwright-report/` - HTML test report
- `test-results/` - Screenshots and traces

## Debugging Failures

1. **View the HTML report**:
   ```bash
   pnpm --filter @catering/web exec playwright show-report
   ```

2. **Run with trace recording**:
   ```bash
   pnpm --filter @catering/web exec playwright test --trace on
   ```

3. **Use Playwright Inspector**:
   ```bash
   pnpm --filter @catering/web exec playwright test --debug
   ```

## Adding New Tests

1. Create a new file in `workflows/` named `<feature>.e2e.ts`
2. Import helpers from `../helpers/`
3. Use `test.beforeAll` to seed required data
4. Follow existing patterns for resilient selectors
5. Run locally before pushing

## Environment Variables

Tests use these environment variables (set in CI or `.env.local`):

```bash
DATABASE_URL=postgresql://admin:changeme@localhost:5432/catering_events_test
NEXTAUTH_SECRET=test-secret
NEXTAUTH_URL=http://localhost:3000
SCHEDULING_SERVICE_URL=http://localhost:8080
```
