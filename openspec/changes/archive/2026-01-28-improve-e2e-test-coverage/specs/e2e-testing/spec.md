## ADDED Requirements

### Requirement: Client Portal Workflow Testing

The system SHALL have E2E tests that validate the complete client portal experience including magic link authentication, dashboard access, event viewing, data isolation between clients, and portal-staff separation. Tests SHALL use the `seedPortalTestData` helper to create portal-enabled clients and `createMagicLinkToken` to generate authentication tokens.

#### Scenario: Portal login page accessible
- **GIVEN** an unauthenticated user
- **WHEN** the user navigates to `/portal/login`
- **THEN** the portal login form is displayed with an email input and submit button

#### Scenario: Portal redirects unauthenticated users
- **GIVEN** an unauthenticated user
- **WHEN** the user navigates to `/portal` or `/portal/events`
- **THEN** the user is redirected to `/portal/login`

#### Scenario: Magic link request sends confirmation
- **GIVEN** a client with portal access enabled
- **WHEN** the client enters their email on the portal login page and submits
- **THEN** a "check your email" confirmation message is displayed

#### Scenario: Magic link authentication succeeds
- **GIVEN** a valid magic link token created via `createMagicLinkToken`
- **WHEN** the client navigates to `/portal/login` with email and token parameters
- **THEN** the client is authenticated and redirected to the portal dashboard showing their name and events

#### Scenario: Client can only see own events
- **GIVEN** two clients with separate events
- **WHEN** client A logs into the portal
- **THEN** client A sees only their own events and cannot access client B's events by URL

#### Scenario: Portal users cannot access staff dashboard
- **GIVEN** a portal-authenticated client user
- **WHEN** the user attempts to navigate to the staff dashboard (`/`)
- **THEN** the user is redirected to login or portal pages

#### Scenario: Staff users cannot access portal
- **GIVEN** a staff user authenticated via credentials
- **WHEN** the staff user attempts to access `/portal`
- **THEN** the user is redirected to portal login (staff auth does not work for portal)

#### Scenario: Expired magic link shows error
- **GIVEN** an expired magic link token
- **WHEN** the client attempts to use the expired token
- **THEN** the login page shows an error or the user remains on the login page

## MODIFIED Requirements

### Requirement: Client Communication Workflow Testing

The system SHALL have E2E tests that validate client communication tracking including recording phone calls, emails, and meetings via the CommunicationForm component. Tests SHALL seed events for the test client (required for CommunicationForm to render) and SHALL use direct assertions instead of `if/isVisible` guard patterns. Follow-up scheduling SHALL be tested via the CommunicationForm's `followUpDate` field. Tests for follow-up list viewing and completion SHALL be skipped until dedicated follow-up management UI is built.

#### Scenario: Record client communication
- **GIVEN** an existing client with at least one event
- **WHEN** the admin expands the CommunicationForm (clicks "Record New Communication"), selects an event, chooses a communication type, enters notes, and submits
- **THEN** the communication appears in the client's communication list

#### Scenario: Schedule follow-up via communication form
- **GIVEN** an existing client with at least one event
- **WHEN** the admin records a communication and sets a follow-up date via the `followUpDate` input
- **THEN** the communication is saved with the scheduled follow-up date

#### Scenario: View client event history
- **GIVEN** an existing client with associated events
- **WHEN** the admin views the client detail page and clicks the "Events" tab
- **THEN** the events table (`data-testid="client-events"`) displays the client's events

#### Scenario: View overdue follow-ups (skipped)
- **GIVEN** a follow-up with a due date in the past
- **WHEN** the user views the follow-ups list or dashboard
- **THEN** the overdue follow-up is highlighted
- **NOTE** Skipped until follow-up list section added to client detail page

#### Scenario: Complete follow-up (skipped)
- **GIVEN** a recorded communication with a scheduled follow-up
- **WHEN** the admin marks the follow-up complete
- **THEN** the follow-up status changes from pending to completed
- **NOTE** Skipped until dedicated follow-up completion UI is built

### Requirement: Test Stability

E2E tests SHALL NOT use `page.waitForTimeout()` for synchronization. Tests SHALL use semantic waits (`waitFor`, `waitForLoadState`, `expect().toBeVisible()`) for reliable timing. Tests SHALL NOT use `if/isVisible` guard patterns that silently pass when elements are missing — they SHALL use explicit assertions that fail loudly. Tests SHALL seed all required data in `beforeAll` to ensure UI elements are present before asserting against them.

#### Scenario: No silent pass patterns
- **WHEN** reviewing E2E test code
- **THEN** no test wraps its core assertions inside `if (await element.isVisible())` blocks that would silently skip the assertion if the element is missing
