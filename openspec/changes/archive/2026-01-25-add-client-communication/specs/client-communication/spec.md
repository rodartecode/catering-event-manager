# Specification: Client Communication Management

## ADDED Requirements

### Requirement: Record Client Communications (FR-022)

The system SHALL allow administrators to record client communications with date, type, and notes for any event.

#### Scenario: Record phone call communication

Given a logged-in administrator viewing a client detail page
When they click "Record Communication"
And select an event and type "phone"
And enter notes "Discussed event requirements"
And submit the form
Then the communication appears in the client's history
And shows the type, notes, and timestamp

#### Scenario: Record email communication with follow-up

Given a logged-in administrator viewing a client detail page
When they record a communication with type "email"
And set a follow-up date for next week
Then the communication shows a pending follow-up indicator
And the follow-up appears in the dashboard count

---

### Requirement: Schedule Follow-Up Tasks (FR-023)

The system SHALL support scheduling follow-up tasks for client communications.

#### Scenario: Schedule follow-up on existing communication

Given a communication without a follow-up date
When an administrator schedules a follow-up for tomorrow
Then the communication shows "Due tomorrow" indicator
And the dashboard count increases by one

#### Scenario: Complete a follow-up

Given a communication with an overdue follow-up
When the user clicks "Mark Complete"
Then the follow-up indicator shows green checkmark
And the dashboard count decreases by one

#### Scenario: View overdue follow-ups

Given multiple communications with past follow-up dates
When the user views the dashboard
Then a banner shows "X follow-ups due (Y overdue)"
And clicking "View All" shows only clients with due follow-ups

---

### Requirement: View Client Communication History (FR-021)

The system SHALL display all events and communications associated with a specific client.

#### Scenario: View client detail with communications

Given a client with 5 recorded communications
When the user navigates to the client detail page
And clicks the "Communications" tab
Then all 5 communications display in chronological order
And each shows type, subject, notes, and follow-up status

#### Scenario: Expand communication notes

Given a communication with long notes (>150 characters)
When the user views the communication list
Then notes are truncated with "Show more" link
And clicking "Show more" reveals full notes

---

### Requirement: Client List with Search (FR-024)

The system SHALL provide search and browse functionality for all clients with quick access to details.

#### Scenario: Search clients by company name

Given 10 clients in the system
When the user types "Acme" in the search field
Then only clients with "Acme" in company name appear
And results update as the user types

#### Scenario: Filter clients with pending follow-ups

Given the dashboard shows 3 due follow-ups
When the user clicks "View All" on the follow-up banner
Then the clients list shows only clients with due follow-ups
And a "Show All Clients" button is visible

---

### Requirement: Follow-Up Notification Banner (FR-025)

The system SHALL display follow-up reminders prominently on the clients page.

#### Scenario: Banner shows when follow-ups are due

Given 2 follow-ups due today and 1 overdue
When the user views the clients page
Then a yellow banner shows "You have 3 follow-ups due (1 overdue)"
And provides a "View All" link

#### Scenario: Dismiss banner for session

Given a visible follow-up banner
When the user clicks the dismiss button
Then the banner hides for the current session
And reappears after page refresh

---

### Requirement: Follow-Up Cron API (FR-026)

The system SHALL provide an API endpoint for external monitoring of follow-ups.

#### Scenario: Cron endpoint returns follow-up summary

Given 5 pending follow-ups in the database
When the cron endpoint is called
Then it returns JSON with total, overdue, and dueToday counts
And logs the summary for monitoring
