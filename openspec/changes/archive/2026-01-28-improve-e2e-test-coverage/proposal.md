# Change: Improve E2E Test Coverage

## Why

Of ~63 E2E tests, only ~38 are active. 25 tests are skipped, but ~18 of those are skipped for reasons that no longer apply. Additionally, 3 active tests in client-communication silently pass without testing anything due to incorrect selectors and missing test data.

## What Changes

### 1. Unskip Portal Tests (17 tests)

The entire `portal.e2e.ts` file is wrapped in `test.describe.skip` with the comment: "Portal auth flow (magic link, portal pages) not yet implemented." However, the portal is now fully implemented:

- **Frontend**: `/portal/login`, `/portal`, `/portal/events`, `/portal/events/[id]` pages all exist
- **Backend**: `portalRouter` in `apps/web/src/server/routers/portal.ts` handles magic link requests, summary, events, event detail
- **Auth**: `magic-link` CredentialsProvider in `apps/web/src/server/auth.ts` verifies tokens via `verifyMagicLinkToken`
- **Test helpers**: `seedPortalTestData`, `createMagicLinkToken`, `seedPortalClient`, `seedPortalUser` all exist in `apps/web/test/e2e/helpers/db.ts`

**Action**: Remove `test.describe.skip` and run portal tests. Minor selector adjustments may be needed to match actual portal UI.

### 2. Fix Client Communication Active Tests (3 tests silently passing)

Three active tests in `client-communication.e2e.ts` use `if/isVisible` guard patterns that cause them to silently pass without actually testing anything:

- **`record phone call communication`** and **`record email communication`**: Look for `button:has-text("Add Communication")`, but the actual button text is "Record New Communication". The `.or()` chain includes `button:has-text("Record")` which should match, BUT the `CommunicationForm` only renders when the client has events. The `beforeAll` seeds a client but no events for that client, so the form never appears.
- **`view client event history`**: Asserts `[data-testid="client-events"]` but this is inside the "Events" tab, and the client detail page defaults to the "communications" tab. The test never clicks the tab.

**Action**:
- Seed at least one event for the test client in `beforeAll`
- Navigate to the communications tab explicitly (it's the default, so this may already work once events exist)
- Replace `isVisible` guards with direct assertions (`expect().toBeVisible()`)
- Fix selector: use `button:has-text("Record New Communication")` instead of `button:has-text("Add Communication")`
- For event history: click the "Events" tab before asserting `[data-testid="client-events"]`

### 3. Unskip Follow-up Scheduling Test (1 test)

The `schedule follow-up` test is skipped with reason: "Dedicated follow-up scheduling UI not built." However, `CommunicationForm` already includes a `followUpDate` input field (`input#followUpDate[type="date"]`) that schedules follow-ups when recording a communication.

**Action**: Rewrite the test to use the CommunicationForm (expand form → select event → fill type/notes → set followUpDate → submit) instead of looking for a standalone "Schedule Follow-up" button.

### 4. Test Stability Fixes

- Remove all `if/isVisible` guard patterns from unskipped/active tests — replace with explicit assertions that fail loudly
- Replace 2 `page.waitForTimeout()` calls in `client-communication.e2e.ts` with semantic waits (these are in currently-skipped tests but will matter if follow-up tests are unskipped)

### 5. Spec Updates

Update `openspec/specs/e2e-testing/spec.md` to add portal testing requirements, update communication test scenarios, and document remaining legitimate skips.

## Impact

- Affected specs: `e2e-testing`
- Affected code:
  - `apps/web/test/e2e/workflows/portal.e2e.ts` (remove `test.describe.skip`)
  - `apps/web/test/e2e/workflows/client-communication.e2e.ts` (fix selectors, seed data, remove guards, unskip 1 test)
  - May need minor portal test selector adjustments
- Expected outcome: ~56/63 tests active (up from ~38/63), ~7 tests remain skipped with documented reasons
- **No application code changes** — only test code

## Remaining Legitimate Skips (~7 tests)

| Test | Skip Reason |
|------|-------------|
| Auth: invalid credentials (2) | LoginForm does not surface auth errors to UI |
| Resource: conflict detection | No resource detail page or schedule calendar |
| Resource: conflict warning | ConflictWarning not in standalone assignment flow |
| Resource: schedule calendar | Resource detail page not implemented |
| Client: view pending follow-ups | No follow-up list section on client detail page |
| Client: complete follow-up | No follow-up completion UI |

## Out of Scope

- Building missing features (login error display, resource schedule calendar, follow-up list UI)
- Adding new E2E test scenarios beyond unskipping/fixing existing ones
- Changing application architecture or component behavior
