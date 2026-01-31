# e2e-testing Specification

## Purpose

Ensure correct end-to-end behavior of the catering event management system through Playwright browser tests covering authentication, event lifecycle, task management, resource scheduling, client communication, and analytics workflows. Tests run against a real PostgreSQL database seeded via test helpers and target the Next.js development server.
## Requirements
### Requirement: Authentication Workflow Testing

The system SHALL have E2E tests that validate the complete authentication workflow including login, logout, and role-based access control. Tests SHALL verify that LoginForm surfaces auth errors (invalid credentials) and field validation errors (empty fields).

#### Scenario: User login with valid credentials
- **GIVEN** a registered user exists in the database
- **WHEN** the user navigates to /login and enters valid credentials
- **THEN** the user is redirected to the dashboard

#### Scenario: User login with invalid credentials
- **GIVEN** a user attempts to login
- **WHEN** the user enters invalid email or password
- **THEN** the LoginForm displays "Invalid email or password" in a red alert box and the user remains on the login page

#### Scenario: Admin access to all pages
- **GIVEN** an authenticated user with admin role
- **WHEN** the user navigates to any application page
- **THEN** the page loads successfully without access denied errors

#### Scenario: Manager restricted from admin pages
- **GIVEN** an authenticated user with manager role
- **WHEN** the user attempts to access admin-only functionality
- **THEN** the action is prevented or an access denied error is shown

### Requirement: Event Lifecycle Workflow Testing

The system SHALL have E2E tests that validate the complete event lifecycle from creation through archival. Tests SHALL use the actual EventStatusUpdateDialog radio button interface and semantic selectors matching production components.

#### Scenario: Create and progress event through lifecycle
- **GIVEN** an authenticated admin user
- **WHEN** the user creates a new event via `/events/new` form and updates its status through the EventStatusUpdateDialog
- **THEN** the event progresses through inquiry, planning, preparation, in_progress, completed, and follow_up states using radio button selection and form submission

#### Scenario: Event status history visible
- **GIVEN** an event that has progressed through multiple status changes
- **WHEN** the user views the event detail page
- **THEN** the status timeline (identified by `data-testid="status-timeline"`) shows all historical transitions with timestamps

#### Scenario: Archive completed event
- **GIVEN** an event in completed status (not follow_up — status must be updated to completed first if needed)
- **WHEN** the admin user clicks "Archive Event" and confirms in the archive dialog
- **THEN** the event is archived and the user is redirected to `/events`

### Requirement: Task Management Workflow Testing

The system SHALL have E2E tests that validate task creation, status transitions, assignment, and overdue detection. Tests use the TaskForm dialog, TaskStatusButton component, TaskAssignDialog, and OverdueIndicator.

#### Scenario: Create and complete task
- **GIVEN** an authenticated admin user and an existing event
- **WHEN** the user clicks "Add Task", fills the TaskForm dialog (`#title`, `#description`, `#category`, `#dueDate`), and submits
- **THEN** the task appears in the TaskList with "Pending" status

#### Scenario: Task status transitions
- **GIVEN** a pending task displayed in a TaskCard
- **WHEN** the user clicks the "Start" button (TaskStatusButton) and then the "Complete" button
- **THEN** the task progresses through pending → in_progress → completed states

#### Scenario: Assign task to user
- **GIVEN** an admin user viewing a task in the event detail page
- **WHEN** the user clicks "Assign" on the TaskCard, selects a team member in the TaskAssignDialog, and confirms
- **THEN** the assignee name appears on the task card

#### Scenario: Overdue task detection
- **GIVEN** a task with a due date in the past and status not completed
- **WHEN** the user views the task in the event detail page
- **THEN** the task displays an overdue indicator (`data-testid="overdue-indicator"`) with "Overdue" text

### Requirement: Resource Scheduling Workflow Testing

The system SHALL have E2E tests that validate resource CRUD, filtering, task-level resource assignment, and resource schedule viewing. The resource detail page at `/resources/[id]` includes a `ResourceScheduleCalendar` component identified by `data-testid="resource-schedule"`.

#### Scenario: Assign resource to task
- **GIVEN** a task in an event and available resources
- **WHEN** the admin clicks "Resources" on a TaskCard, selects a resource in the ResourceAssignmentDialog, and clicks "Assign Resources"
- **THEN** the resource assignment succeeds and the dialog closes

#### Scenario: Detect resource scheduling conflict (skipped)
- **GIVEN** a resource in the resources list
- **WHEN** the admin clicks on the resource to view its detail page
- **THEN** the schedule section (`data-testid="resource-schedule"`) is visible with the ResourceScheduleCalendar
- **NOTE** Skipped — on-demand compilation of `/resources/[id]` in dev mode causes race condition

#### Scenario: View resource schedule calendar (skipped)
- **GIVEN** a resource in the resources list
- **WHEN** the user clicks on the resource to view details
- **THEN** the schedule section (`data-testid="resource-schedule"`) renders the ResourceScheduleCalendar
- **NOTE** Skipped — on-demand compilation of `/resources/[id]` in dev mode causes race condition

#### Scenario: View conflict warning before assignment (skipped)
- **GIVEN** a resource already assigned to a task during a specific time period
- **WHEN** the admin attempts to assign the same resource to another task with overlapping time
- **THEN** a conflict warning is displayed before the assignment
- **NOTE** Skipped — requires creating overlapping schedule entries in test setup

### Requirement: Client Portal Workflow Testing

The system SHALL have E2E tests that validate the complete client portal experience including magic link authentication, portal dashboard access, event viewing, data isolation between clients, portal-staff auth separation, portal navigation, and expired token handling. Tests seed portal data via `seedPortalTestData` and use `createMagicLinkToken` to simulate magic link authentication.

#### Scenario: Portal login page accessible
- **GIVEN** an unauthenticated user
- **WHEN** the user navigates to `/portal/login`
- **THEN** the portal login form is displayed with an email input

#### Scenario: Portal redirects unauthenticated users
- **GIVEN** an unauthenticated user
- **WHEN** the user navigates to `/portal` or `/portal/events`
- **THEN** the user is redirected to `/portal/login`

#### Scenario: Magic link request
- **GIVEN** a portal-enabled client
- **WHEN** the user submits their email on the portal login form
- **THEN** a success message is shown (without revealing whether the email exists)

#### Scenario: Authenticated portal access
- **GIVEN** a valid magic link token created via `createMagicLinkToken`
- **WHEN** the user navigates to `/portal/login?email=...&token=...`
- **THEN** the user is redirected to the portal dashboard showing client name and events

#### Scenario: Event details in portal
- **GIVEN** an authenticated portal user with events
- **WHEN** the user clicks on an event name
- **THEN** the event detail page shows event name and status

#### Scenario: Data isolation between clients
- **GIVEN** two clients with separate events
- **WHEN** client A authenticates via magic link
- **THEN** client A sees only their own events and cannot access client B's events by direct URL

#### Scenario: Portal-staff auth separation
- **GIVEN** a portal user and a staff user
- **WHEN** the portal user attempts to access `/` (staff dashboard)
- **THEN** the portal user is redirected to `/login` or `/portal`
- **WHEN** the staff user attempts to access `/portal`
- **THEN** the staff user is redirected to `/portal/login`

#### Scenario: Portal navigation
- **GIVEN** an authenticated portal user on the dashboard
- **WHEN** the user navigates to an event detail and clicks back
- **THEN** the user returns to the portal dashboard

#### Scenario: Expired magic link
- **GIVEN** an expired magic link token
- **WHEN** the user attempts to authenticate with the expired token
- **THEN** the user remains on the login page or sees an error message

### Requirement: Client Communication Workflow Testing

The system SHALL have E2E tests that validate client communication tracking via the CommunicationForm component. The test client MUST have at least one event seeded (via `seedTestEvent`) because CommunicationForm only renders when the client has events. Tests SHALL use the "Record New Communication" button, select an event from `select#event`, select a type from `select#type`, fill `textarea#notes`, and submit via "Save Communication".

#### Scenario: Record client communication
- **GIVEN** an existing client record with at least one event
- **WHEN** the admin clicks "Record New Communication", selects an event, selects type (phone/email), fills notes, and clicks "Save Communication"
- **THEN** the communication appears in the client's communication list

#### Scenario: Schedule follow-up via CommunicationForm
- **GIVEN** an existing client record with at least one event
- **WHEN** the admin records a communication and fills the `input#followUpDate` field with a future date
- **THEN** the communication with follow-up is saved and appears in the list

#### Scenario: View pending follow-ups
- **GIVEN** a communication with a pending follow-up
- **WHEN** the user views the client detail Communications tab
- **THEN** a "Pending Follow-ups" section (`data-testid="follow-ups"`) displays pending items

#### Scenario: Complete follow-up (skipped)
- **GIVEN** a communication with a pending follow-up
- **WHEN** the admin clicks "Mark Follow-Up Complete" in the CommunicationList
- **THEN** the follow-up status changes to completed
- **NOTE** Skipped — requires seeding communication with follow-up in test setup

#### Scenario: View client event history
- **GIVEN** an existing client with events
- **WHEN** the admin clicks the "Events" tab on the client detail page
- **THEN** the events section (`data-testid="client-events"`) is visible

### Requirement: Analytics Dashboard Testing

The system SHALL have E2E tests that validate the analytics dashboard loads and displays data correctly. Chart and card components SHALL be identified by data-testid attributes.

#### Scenario: Analytics page loads successfully
- **GIVEN** an authenticated user
- **WHEN** the user navigates to the analytics page
- **THEN** the page loads with chart components visible

#### Scenario: Analytics charts display data
- **GIVEN** existing events, tasks, and resources in the database
- **WHEN** the user views the analytics page
- **THEN** the event completion (`data-testid="event-completion-chart"`), resource utilization (`data-testid="resource-utilization"`), and task performance (`data-testid="task-performance"`) charts display relevant data

#### Scenario: Filter analytics by date range
- **GIVEN** the analytics page is loaded
- **WHEN** the user selects a custom date range via the DateRangePicker (`#date-from`, `#date-to`) and clicks "Apply"
- **THEN** the charts update to reflect only data within the selected range

### Requirement: Test Stability

E2E tests SHALL NOT use `page.waitForTimeout()` for synchronization. Tests SHALL use semantic waits (`waitFor`, `waitForLoadState`, `expect().toBeVisible()`) for reliable timing. Tests SHALL NOT use `if/isVisible` guard patterns that silently pass when elements are missing — they SHALL use explicit assertions that fail loudly. All active (non-skipped) tests have been audited and cleared of these anti-patterns.

#### Scenario: No silent-pass or timeout anti-patterns in active tests
- **GIVEN** the set of active (non-skipped) E2E test files
- **WHEN** reviewed for anti-patterns
- **THEN** no test uses `page.waitForTimeout()` for synchronization
- **AND** no test wraps assertions inside `if (await element.isVisible())` guard blocks

### Requirement: Documented Remaining Skips

Each skipped E2E test SHALL have a documented reason in both the test file (via `test.skip` annotation) and in this specification. The following tests remain legitimately skipped (~4 tests):

| Test | File | Reason |
|------|------|--------|
| Detect resource scheduling conflict | resource-scheduling.e2e.ts | On-demand compilation of `/resources/[id]` in dev mode causes race condition |
| View resource schedule calendar | resource-scheduling.e2e.ts | On-demand compilation of `/resources/[id]` in dev mode causes race condition |
| View conflict warning before assignment | resource-scheduling.e2e.ts | Requires creating overlapping schedule entries in test setup |
| Complete follow-up | client-communication.e2e.ts | Requires seeding communication with follow-up in test setup |

#### Scenario: All skipped tests have documented reasons
- **GIVEN** the set of skipped E2E tests
- **WHEN** reviewed against this specification
- **THEN** every `test.skip` call has a corresponding entry in the table above with a reason

