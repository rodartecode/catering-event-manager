# Change: Fix E2E Test Suite to Match Current UI

## Why
Out of 63 E2E tests, only 5 pass. The tests were written against an assumed UI structure (data-testid selectors, specific button labels, component layouts) that doesn't match the actual implementation. The codebase uses semantic HTML testing (getByRole, getByText, getByLabel) with `id`/`htmlFor` attributes, but the E2E tests rely heavily on `data-testid` attributes that don't exist in production components. Additionally, 13 portal tests validate features that aren't fully built yet.

## What Changes

### Tier 1: Skip unimplementable tests (no app changes)
- Add `test.skip()` to 13 portal tests (portal auth flow not built)
- Add `test.skip()` to ~22 tests that exercise features structurally absent from the UI (resource schedule calendar, conflict warning integration, task status action buttons, follow-up management UI)
- Add skip reasons documenting what app feature is needed before the test can pass

### Tier 2: Add data-testid attributes to existing components (~9 tests)
- Add `data-testid` to: analytics cards/charts, task cards, overdue indicators, status timeline, client events tab, follow-ups section
- No behavioral changes — just adding test hooks to already-rendered elements

### Tier 3: Fix selector mismatches and timing issues (~14 tests)
- Update test selectors to match actual form field IDs, button labels, and page structure
- Add proper `waitFor` calls where tests fail due to async rendering
- Fix tests that assume table rows (`tr`) when UI uses card layouts
- Update status badge selectors to match actual class names

### Out of scope
- Building missing features (portal auth, resource schedule calendar, task status buttons)
- Changing application architecture or component structure
- Adding new E2E test coverage beyond what exists

## Impact
- Affected specs: `e2e-testing`
- Affected code:
  - `apps/web/test/e2e/workflows/*.e2e.ts` (all 7 test files)
  - `apps/web/test/e2e/helpers/pages.ts` (page helper selectors)
  - `apps/web/src/components/**/*.tsx` (add data-testid attributes only)
- Expected outcome: ~28/63 tests passing, ~35 tests skipped with documented reasons
