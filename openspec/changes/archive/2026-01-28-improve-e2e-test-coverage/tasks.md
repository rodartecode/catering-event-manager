# Tasks: improve-e2e-test-coverage

## 1. Unskip Portal Tests (17 tests)

- [x] 1.1 Remove `test.describe.skip` from `portal.e2e.ts` — change to `test.describe`
- [x] 1.2 Run portal tests and fix any selector mismatches against actual portal UI (login form, dashboard welcome, event cards, navigation links)
- [x] 1.3 Verify magic link auth flow works in test context — `createMagicLinkToken` → navigate with token → authenticated portal dashboard
- [x] 1.4 Verify data isolation tests — client A cannot see client B's events, cannot access by direct URL
- [x] 1.5 Verify portal-staff separation tests — portal users blocked from `/`, staff users redirected from `/portal`

## 2. Fix Client Communication Test Data (prerequisite for sections 3-4)

- [x] 2.1 Add `seedTestEvent` call in `client-communication.e2e.ts` `beforeAll` to create an event for the test client (required for CommunicationForm to render)

## 3. Fix Client Communication Active Tests (3 tests)

- [x] 3.1 Rewrite `record phone call communication` — remove `isVisible` guard, click "Record New Communication" button, select event from `#event` dropdown, select type `phone` from `#type`, fill `#notes`, click submit, assert communication appears
- [x] 3.2 Rewrite `record email communication` — same pattern with type `email`
- [x] 3.3 Rewrite `view client event history` — click "Events" tab button before asserting `[data-testid="client-events"]` is visible, remove `isVisible` guard

## 4. Unskip and Rewrite Follow-up Scheduling Test (1 test)

- [x] 4.1 Unskip `schedule follow-up` — rewrite to use CommunicationForm: expand form → select event → set type → fill notes → fill `#followUpDate` with future date → submit → assert communication saved

## 5. Test Stability (depends on 1-4)

- [x] 5.1 Replace `page.waitForTimeout(1000)` calls in `client-communication.e2e.ts` with semantic waits (`waitForLoadState`, `expect().toBeVisible()`)
- [x] 5.2 Audit all unskipped tests for remaining `isVisible` guard patterns — replace with direct assertions

## 6. Spec Update (depends on 1-5)

- [x] 6.1 Update `openspec/specs/e2e-testing/spec.md` — add Client Portal Workflow Testing requirement, update Client Communication scenarios, update Test Stability requirement, document remaining skips
