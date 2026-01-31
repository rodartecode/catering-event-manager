# E2E Testing Capability

## ADDED Requirements

### Requirement: Authentication Workflow Testing

The system SHALL have E2E tests that validate the complete authentication workflow including login, logout, and role-based access control.

#### Scenario: User login with valid credentials
- **GIVEN** a registered user exists in the database
- **WHEN** the user navigates to /login and enters valid credentials
- **THEN** the user is redirected to the dashboard

#### Scenario: User login with invalid credentials
- **GIVEN** a user attempts to login
- **WHEN** the user enters invalid email or password
- **THEN** an error message is displayed and the user remains on the login page

#### Scenario: Admin access to all pages
- **GIVEN** an authenticated user with admin role
- **WHEN** the user navigates to any application page
- **THEN** the page loads successfully without access denied errors

#### Scenario: Manager restricted from admin pages
- **GIVEN** an authenticated user with manager role
- **WHEN** the user attempts to access admin-only functionality
- **THEN** the action is prevented or an access denied error is shown

### Requirement: Event Lifecycle Workflow Testing

The system SHALL have E2E tests that validate the complete event lifecycle from creation through archival.

#### Scenario: Create and progress event through lifecycle
- **GIVEN** an authenticated admin user
- **WHEN** the user creates a new event and updates its status through each lifecycle stage
- **THEN** the event progresses through inquiry, planning, preparation, in_progress, completed, and follow_up states

#### Scenario: Event status history visible
- **GIVEN** an event that has progressed through multiple status changes
- **WHEN** the user views the event detail page
- **THEN** the status timeline shows all historical transitions with timestamps

#### Scenario: Archive completed event
- **GIVEN** an event in completed or follow_up status
- **WHEN** the admin user archives the event
- **THEN** the event is marked as archived and no longer appears in active event lists

### Requirement: Task Management Workflow Testing

The system SHALL have E2E tests that validate task creation, assignment, and completion workflows.

#### Scenario: Create and complete task
- **GIVEN** an authenticated admin user and an existing event
- **WHEN** the user creates a task, assigns it to a user, and marks it complete
- **THEN** the task progresses through pending, in_progress, and completed states

#### Scenario: Overdue task detection
- **GIVEN** a task with a due date in the past
- **WHEN** the user views the task list
- **THEN** the task is visually marked as overdue

### Requirement: Resource Scheduling Workflow Testing

The system SHALL have E2E tests that validate resource scheduling and conflict detection.

#### Scenario: Assign resource without conflict
- **GIVEN** an available resource and a task with a time slot
- **WHEN** the admin assigns the resource to the task
- **THEN** the assignment succeeds without conflict warnings

#### Scenario: Detect resource scheduling conflict
- **GIVEN** a resource already assigned to a task during a specific time period
- **WHEN** the admin attempts to assign the same resource to another task with overlapping time
- **THEN** a conflict warning is displayed before the assignment

#### Scenario: View resource schedule
- **GIVEN** a resource with multiple assignments
- **WHEN** the user views the resource schedule page
- **THEN** all assignments are displayed in a calendar or timeline view

### Requirement: Client Communication Workflow Testing

The system SHALL have E2E tests that validate client communication tracking and follow-up scheduling.

#### Scenario: Record client communication
- **GIVEN** an existing client record
- **WHEN** the admin records a phone call, email, or meeting
- **THEN** the communication appears in the client's communication history

#### Scenario: Schedule and complete follow-up
- **GIVEN** a recorded communication
- **WHEN** the admin schedules a follow-up and later marks it complete
- **THEN** the follow-up status changes from pending to completed

#### Scenario: View overdue follow-ups
- **GIVEN** a follow-up with a due date in the past
- **WHEN** the user views the follow-ups list or dashboard
- **THEN** the overdue follow-up is highlighted

### Requirement: Analytics Dashboard Testing

The system SHALL have E2E tests that validate the analytics dashboard loads and displays data correctly.

#### Scenario: Analytics page loads successfully
- **GIVEN** an authenticated user
- **WHEN** the user navigates to the analytics page
- **THEN** the page loads with chart components visible

#### Scenario: Analytics charts display data
- **GIVEN** existing events, tasks, and resources in the database
- **WHEN** the user views the analytics page
- **THEN** the event completion, resource utilization, and task performance charts display relevant data

#### Scenario: Filter analytics by date range
- **GIVEN** the analytics page is loaded
- **WHEN** the user selects a custom date range
- **THEN** the charts update to reflect only data within the selected range
