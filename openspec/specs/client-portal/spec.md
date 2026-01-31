# client-portal Specification

## Purpose
TBD - created by archiving change add-client-portal. Update Purpose after archive.
## Requirements
### Requirement: Client Magic Link Authentication (FR-031)

The system SHALL allow clients to authenticate via magic link email without requiring a password.

#### Scenario: Client requests magic link login
Given a client with portal access enabled
When they enter their email on the portal login page
And click "Send Login Link"
Then the system sends an email containing a secure magic link
And the link expires after 15 minutes
And the login page shows "Check your email for login link"

#### Scenario: Client uses magic link to login
Given a client has received a magic link email
When they click the link within 15 minutes
Then the system validates the token
And creates an authenticated session
And redirects them to the portal dashboard

#### Scenario: Client uses expired magic link
Given a client has a magic link older than 15 minutes
When they click the expired link
Then the system shows an error "This link has expired"
And provides option to request a new magic link

---

### Requirement: Client Portal Dashboard (FR-032)

The system SHALL provide clients with a dedicated portal dashboard showing their active events.

#### Scenario: Client views portal dashboard
Given a logged-in client user
When they access the portal dashboard
Then they see a welcome message with their contact name
And see a summary of their active event count
And see event cards for all their non-archived events
And each card shows event name, date, and current status

#### Scenario: Client with no events views dashboard
Given a logged-in client user with no events
When they access the portal dashboard
Then they see a message "No events yet"
And see contact information for starting a new inquiry

---

### Requirement: Client Event Detail View (FR-033)

The system SHALL allow clients to view detailed progress information for their events.

#### Scenario: Client views event details
Given a logged-in client user
When they click "View Details" on an event card
Then they see the full event information (name, date, location, guest count)
And see the current status with a visual status badge
And see the event progress timeline showing all status changes
And see a task progress summary (X of Y tasks completed)

#### Scenario: Client views event timeline
Given a logged-in client viewing an event detail page
When they look at the progress timeline
Then they see each status change with its date
And statuses are displayed in chronological order
And the current status is visually highlighted

#### Scenario: Client attempts to view another client's event
Given a logged-in client user
When they attempt to access an event belonging to another client
Then the system returns a "Not Found" error
And does not reveal that the event exists

---

### Requirement: Client Task Progress View (FR-034)

The system SHALL allow clients to view task completion status for their events.

#### Scenario: Client views task list
Given a logged-in client viewing an event detail page
When they view the tasks section
Then they see all tasks associated with the event
And each task shows title, status, and due date
And completed tasks show a checkmark indicator
And overdue tasks show a warning indicator

#### Scenario: Task information visibility
Given a logged-in client viewing task details
When they view task information
Then they can see task title and status
And they can see due date
And they cannot see internal notes or assigned staff names

---

### Requirement: Client Communication History View (FR-035)

The system SHALL allow clients to view their communication history with the catering company.

#### Scenario: Client views communications
Given a logged-in client viewing an event detail page
When they view the communications section
Then they see all recorded communications for that event
And each entry shows date, type (email/phone/meeting), and summary
And communications are sorted newest first

---

### Requirement: Staff Portal Access Management (FR-036)

The system SHALL allow administrators to enable and disable client portal access.

#### Scenario: Administrator enables portal access
Given an administrator viewing a client detail page
When they click "Enable Portal Access"
And enter the client contact's email address
Then the system creates a client user account with that email
And sets the client's portal_enabled flag to true
And optionally sends a welcome email with login instructions

#### Scenario: Administrator disables portal access
Given an administrator viewing a client with portal access enabled
When they click "Disable Portal Access"
Then the system deactivates the client's user account
And sets portal_enabled to false
And any active portal sessions are invalidated
And the client can no longer log in

#### Scenario: Administrator views portal access status
Given an administrator viewing the clients list
When they look at a client record
Then they see a visual indicator showing if portal access is enabled
And can see when portal access was last used (if enabled)

