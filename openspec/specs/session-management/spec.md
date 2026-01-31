# session-management Specification

## Purpose
TBD - created by archiving change add-session-management. Update Purpose after archive.
## Requirements
### Requirement: Session Auto-Refresh
The system SHALL automatically refresh user sessions in the background to prevent unexpected logouts during active use.

#### Scenario: Background session refresh
- **WHEN** a user is authenticated in the dashboard or portal
- **THEN** the session SHALL be refreshed every 4 minutes silently
- **AND** the session SHALL be refreshed when the browser tab regains focus

#### Scenario: Session configuration
- **WHEN** NextAuth is configured
- **THEN** session maxAge SHALL be 24 hours
- **AND** session updateAge SHALL be 4 minutes

### Requirement: Session Expiry Handling
The system SHALL gracefully handle session expiry by redirecting users to the appropriate login page.

#### Scenario: Dashboard session expiry
- **WHEN** a dashboard user's session expires
- **THEN** the user SHALL be redirected to /login
- **AND** the URL SHALL include callbackUrl for post-login redirect
- **AND** the URL SHALL include error=SessionExpired parameter

#### Scenario: Portal session expiry
- **WHEN** a portal user's session expires
- **THEN** the user SHALL be redirected to /portal/login
- **AND** the URL SHALL include callbackUrl for post-login redirect

#### Scenario: Session expired message
- **WHEN** a user arrives at login with error=SessionExpired
- **THEN** the login form SHALL display "Your session has expired. Please sign in again."

### Requirement: tRPC Auth Error Handling
The system SHALL handle UNAUTHORIZED errors from tRPC calls gracefully.

#### Scenario: tRPC UNAUTHORIZED response
- **WHEN** a tRPC mutation returns UNAUTHORIZED error
- **THEN** the user SHALL be signed out
- **AND** redirected to login with SessionExpired error
- **AND** auth errors SHALL NOT be retried

