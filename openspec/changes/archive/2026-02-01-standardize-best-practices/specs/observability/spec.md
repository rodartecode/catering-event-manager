## ADDED Requirements

### Requirement: Structured Logging (OBS-001)

The system SHALL use structured JSON logging for all application log output.

#### Scenario: Log format consistency

Given any log statement in the application
When it is emitted
Then the output is valid JSON with at minimum: `timestamp`, `level`, `message`
And context metadata is included when available (userId, resourceId, etc.)

#### Scenario: Console methods prohibited

Given the application codebase
When scanned for `console.log`, `console.error`, `console.warn` calls
Then zero instances are found in production code paths
And only test files or build scripts may use console methods

#### Scenario: Error logging with stack traces

Given an error is caught and logged
When using the structured logger
Then the error message is captured in the `message` field
And the stack trace is captured in the `stack` field (if Error object)
And contextual metadata is captured in additional fields

---

### Requirement: Error Context Logging (OBS-002)

The system SHALL include contextual metadata in error logs to enable rapid incident diagnosis.

#### Scenario: Service communication errors

Given a call to the Go scheduling service fails
When the error is logged
Then the log includes: endpoint called, request parameters (sanitized), error code
And sensitive data (auth tokens, passwords) is NOT logged

#### Scenario: Database operation errors

Given a database query fails
When the error is logged
Then the log includes: operation type, affected entity type, entity identifiers
And the full SQL query is NOT logged (security)

#### Scenario: Email delivery errors

Given an email send operation fails
When the error is logged
Then the log includes: recipient identifier (not full email), email type, failure reason
And the email content is NOT logged

#### Scenario: Rate limiting events

Given a rate limit is triggered
When the event is logged
Then the log includes: rate limit type, identifier being limited, current count, limit threshold
And the log level is `warn` (not error)
