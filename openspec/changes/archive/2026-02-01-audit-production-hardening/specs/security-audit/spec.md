## ADDED Requirements

### Requirement: Environment-Based CORS Configuration (SEC-007)

The system SHALL configure CORS origins based on the deployment environment.

#### Scenario: Development CORS configuration

Given the application is running in development mode
When a request arrives from localhost origins
Then the request is allowed with appropriate CORS headers

#### Scenario: Production CORS configuration

Given the application is running in production
When examining the CORS configuration
Then only explicitly configured origins in `ALLOWED_ORIGINS` environment variable are permitted
And the configuration does NOT default to localhost

#### Scenario: CORS origin mismatch rejection

Given a request from an origin not in the allowed list
When the request includes credentials or is a preflight request
Then the request is rejected with appropriate CORS error
And no Access-Control-Allow-Origin header is set for that origin

---

### Requirement: Security Event Logging (SEC-008)

The system SHALL log security-relevant events for monitoring and incident response.

#### Scenario: Authentication failure logging

Given a failed login attempt
When the login fails due to invalid credentials
Then a security event is logged with:
  - Event type: "auth.login.failed"
  - Masked email (first 2 chars + domain)
  - IP address
  - Timestamp

#### Scenario: Rate limit exceeded logging

Given a client exceeds rate limits
When the rate limiter rejects a request
Then a security event is logged with:
  - Event type: "rate_limit.exceeded"
  - Endpoint or route
  - IP address
  - Current limit and window

#### Scenario: Authorization failure logging

Given a user attempts an unauthorized action
When the authorization check fails
Then a security event is logged with:
  - Event type: "authz.denied"
  - User ID (if authenticated)
  - Attempted action/resource
  - Required role vs actual role

#### Scenario: Security log format

Given security events are logged
When examining the log output
Then events are in structured JSON format
And include a `security` namespace/category for filtering
And do NOT include sensitive data (passwords, tokens, full emails)
