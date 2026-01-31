# Change: Add End-to-End Testing Infrastructure

## Why

The catering event management system has comprehensive unit and integration tests (296 passing) but lacks end-to-end tests that validate complete user workflows. E2E tests ensure the system works correctly from the user's perspective, catching integration issues that component-level tests miss.

Phase 4 of the testing strategy focuses on Playwright-based E2E tests covering 6 critical user workflows.

## What Changes

- **E2E test infrastructure**: Create test helpers for authentication, database seeding, and page interactions
- **6 core workflow tests**:
  1. Authentication flow (login, logout, role-based access)
  2. Event lifecycle (inquiry → completed → archived)
  3. Task management (create, assign, complete tasks)
  4. Resource scheduling (assign resources, detect conflicts)
  5. Client communication (record communications, schedule follow-ups)
  6. Analytics dashboard (load reports, filter by date range)
- **CI integration**: E2E tests run in GitHub Actions on PRs

## Impact

- Affected specs: New `e2e-testing` capability
- Affected code:
  - `apps/web/test/e2e/` (new directory with test files)
  - `apps/web/playwright.config.ts` (minor updates)
  - `apps/web/package.json` (scripts already exist)
  - `.github/workflows/` (CI pipeline updates)

## Success Criteria

- All 6 E2E workflows pass locally and in CI
- Tests run in <5 minutes total
- Clear documentation for running and extending E2E tests
- Tests are isolated (no cross-test state pollution)

## Dependencies

- Phase 3 complete (296 tests passing)
- Playwright already installed (@playwright/test ^1.58.0)
- playwright.config.ts already configured
