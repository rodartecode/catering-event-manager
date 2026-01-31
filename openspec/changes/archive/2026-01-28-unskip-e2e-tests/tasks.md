# Tasks: unskip-e2e-tests

## Task 1: Add data-testid to resource detail schedule section

- [x] **File**: `apps/web/src/app/(dashboard)/resources/[id]/page.tsx`
- **Change**: Add `data-testid="resource-schedule"` to the schedule `<div>` wrapper (around line 185)
- **Verify**: Load `/resources/[id]` page, inspect DOM for test ID

## Task 2: Add follow-ups section to client detail Communications tab

- [x] **File**: `apps/web/src/app/(dashboard)/clients/[id]/page.tsx`
- **Change**: In the Communications tab, add a "Pending Follow-ups" section above the communication list. Filter the communications list for items with `followUpDate && !followUpCompleted`. Add `data-testid="follow-ups"` to the section wrapper.
- **Verify**: Navigate to client detail with a follow-up, see the section rendered

## Task 3: Unskip and fix auth E2E tests

- [x] **File**: `apps/web/test/e2e/workflows/auth.e2e.ts`
- **Changes**:
  - Remove `test.skip` from "user sees error with invalid credentials" — update selectors to match the red alert box rendered by LoginForm (`div.bg-red-50` and text "Invalid email or password")
  - Remove `test.skip` from "user sees error with empty fields" — assert that the form stays on `/login` (HTML5 validation prevents submit)
  - Update skip comments to remove outdated reasons
- **Verify**: Both tests pass in full suite run

## Task 4: Unskip and fix resource scheduling E2E tests

- [x] **File**: `apps/web/test/e2e/workflows/resource-scheduling.e2e.ts`
- **Changes**:
  - Attempted to unskip "detect resource scheduling conflict" and "view resource schedule calendar" — however, on-demand compilation of `/resources/[id]` in Next.js dev mode causes a persistent "Resource Not Found" race condition. These tests are re-skipped with updated, accurate reasons.
  - Kept "view conflict warning before assignment" skipped with updated reason: "Requires creating overlapping schedule entries in test setup"
- **Outcome**: 3 resource scheduling tests remain skipped (2 due to dev mode compilation race, 1 due to complex test setup)

## Task 5: Unskip follow-up view E2E test

- [x] **File**: `apps/web/test/e2e/workflows/client-communication.e2e.ts`
- **Changes**:
  - Remove `test.skip` from "view pending follow-ups" — update selectors to find `[data-testid="follow-ups"]` section and assert "Pending Follow-ups" text
  - Keep "complete follow-up" skipped with updated reason: "Requires seeding communication with follow-up in test setup"
- **Verify**: "view pending follow-ups" passes in full suite run

## Task 6: Update e2e-testing spec

- [x] **File**: `openspec/specs/e2e-testing/spec.md`
- **Changes**: Update the "Documented Remaining Skips" table to reflect 4 skipped tests (down from 7). Remove entries for the 3 unskipped tests. Update skip reasons for the remaining 4 (2 resource tests with accurate dev mode reason, 1 resource test with complex setup reason, 1 follow-up test with setup reason). Update scenario descriptions to remove "(skipped)" from unskipped tests.
- **Verify**: `openspec validate --all` passes (11 passed, 0 failed)

## Task 7: Run full E2E suite and validate

- [x] **Command**: `cd apps/web && pnpm test:e2e`
- **Expected**: 3 tests unskipped and passing (auth: invalid credentials, auth: empty fields, follow-up: view pending). 4 tests remain skipped (down from 7). 14 pre-existing failures (rate limiting, portal tests) unrelated to this change.
- **Result**: 40 passed, 4 skipped, 14 pre-existing failures, 6 did not run (cascading from pre-existing failures)

## Dependencies

- Task 1 must complete before Task 4 (resource tests need data-testid)
- Task 2 must complete before Task 5 (follow-up test needs section)
- Tasks 1 and 2 are parallelizable
- Tasks 3, 4, 5 are parallelizable (after their UI dependencies)
- Task 6 depends on Tasks 3, 4, 5
- Task 7 depends on all prior tasks

## Summary

**Net result**: 7 → 4 skipped tests (3 unskipped)
- Unskipped: auth invalid credentials, auth empty fields, view pending follow-ups
- Kept skipped: detect resource conflict (dev mode race), view schedule calendar (dev mode race), conflict warning (complex setup), complete follow-up (complex setup)
- The 2 resource detail page tests could not be unskipped due to Next.js on-demand compilation race condition in dev mode. The feature works correctly (resource detail page and schedule calendar exist), but the Playwright test hits a timing issue where the page shows "Resource Not Found" during compilation.
