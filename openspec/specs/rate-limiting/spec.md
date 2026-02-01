# rate-limiting Specification

## Purpose
TBD - created by archiving change add-security-hardening. Update Purpose after archive.
## Requirements
### Requirement: tRPC API Rate Limiting (SEC-001)

The system SHALL rate limit all tRPC API requests to prevent abuse using distributed storage for multi-instance deployments.

#### Scenario: Normal API usage within limits

Given an API client making requests to tRPC endpoints
When they make up to 100 requests within a 1-minute window
Then all requests receive normal responses
And the `X-RateLimit-Remaining` header shows requests remaining

#### Scenario: API client exceeds rate limit

Given an API client making requests to tRPC endpoints
When they exceed 100 requests within a 1-minute window
Then the 101st request returns HTTP 429 (Too Many Requests)
And the response includes a `Retry-After` header with seconds to wait
And the response body contains error message "Rate limit exceeded"

#### Scenario: Rate limit resets after window

Given an API client who exceeded the rate limit
When the 1-minute window expires
Then subsequent requests are accepted normally
And the rate limit counter resets

#### Scenario: Distributed rate limiting across instances

Given multiple Next.js instances behind a load balancer
When a client makes requests distributed across instances
Then the rate limit is shared across all instances via Redis
And the total request count is accurate regardless of which instance handles requests

#### Scenario: Redis unavailability fallback

Given Redis is temporarily unavailable
When the rate limiter cannot connect to Redis
Then the system falls back to in-memory rate limiting per instance
And a warning is logged indicating degraded rate limiting mode
And the system continues to function without crashing

---

### Requirement: Authentication Rate Limiting (SEC-002)

The system SHALL apply stricter rate limits to authentication endpoints to prevent brute-force attacks.

#### Scenario: Login attempts within limit

Given a user attempting to log in
When they make up to 5 login attempts within a 1-minute window
Then all attempts are processed normally
And failed attempts return appropriate error messages

#### Scenario: Login brute-force prevention

Given an attacker attempting to brute-force login
When they exceed 5 login attempts within a 1-minute window
Then the 6th attempt returns HTTP 429
And the response shows "Too many login attempts, please wait"
And the account is NOT locked (only rate limited)

#### Scenario: Magic link request rate limiting

Given a user requesting magic link emails
When they request more than 3 magic links within a 5-minute window
Then additional requests return HTTP 429
And the response shows "Please wait before requesting another link"

---

### Requirement: Go Scheduling Service Rate Limiting (SEC-003)

The system SHALL rate limit the Go scheduling service to prevent resource exhaustion.

#### Scenario: Normal scheduling requests

Given the Next.js app calling the scheduling service
When making conflict detection requests within limits (200/minute)
Then all requests are processed with normal latency (<100ms)

#### Scenario: Scheduling service rate limit exceeded

Given excessive requests to the scheduling service
When requests exceed 200 per minute from a single source
Then additional requests return HTTP 429
And the service remains responsive for other clients

---

### Requirement: CSRF Protection (SEC-004)

The system SHALL protect state-changing operations from cross-site request forgery attacks.

#### Scenario: Legitimate mutation request

Given an authenticated user making a tRPC mutation
When the request originates from the application domain
And includes valid session cookies
Then the mutation is executed normally

#### Scenario: CSRF attack blocked

Given an attacker site attempting to forge a request
When the request originates from a different domain
And targets a state-changing tRPC mutation
Then the request is rejected with HTTP 403
And no state changes occur

#### Scenario: Session cookie protection

Given session cookies are set after authentication
When examining the cookie attributes
Then the SameSite attribute is set to "Lax" or "Strict"
And the HttpOnly attribute is set to true
And the Secure attribute is true in production

---

### Requirement: Content Security Policy (SEC-005)

The system SHALL enforce Content Security Policy headers to mitigate XSS attacks with environment-appropriate strictness.

#### Scenario: CSP headers present on all responses

Given any request to the application
When examining the response headers
Then the Content-Security-Policy header is present
And includes `default-src 'self'` directive
And includes `frame-ancestors 'none'` directive

#### Scenario: Production CSP strictness

Given the application is running in production (`NODE_ENV=production`)
When examining the Content-Security-Policy header
Then the `script-src` directive does NOT include `'unsafe-eval'`
And the CSP is stricter than development mode

#### Scenario: Development CSP flexibility

Given the application is running in development (`NODE_ENV=development`)
When examining the Content-Security-Policy header
Then the `script-src` directive MAY include `'unsafe-eval'` for hot reloading
And a comment in the configuration explains this exception

#### Scenario: Inline script injection blocked

Given an attacker attempting XSS via inline script injection
When malicious inline script is somehow injected into the page
Then the browser blocks script execution due to CSP
And a CSP violation is reported (if reporting configured)

#### Scenario: External script loading restricted

Given the application page is loaded
When the browser parses the CSP header
Then only scripts from 'self' and explicitly allowed sources load
And scripts from arbitrary external domains are blocked

### Requirement: Security Headers (SEC-006)

The system SHALL include comprehensive security headers on all responses.

#### Scenario: Clickjacking protection

Given any page in the application
When loaded in an iframe on an external site
Then the browser blocks rendering due to X-Frame-Options: DENY
And the page cannot be clickjacked

#### Scenario: MIME sniffing prevention

Given the application serves content
When the X-Content-Type-Options header is examined
Then it is set to "nosniff"
And browsers respect the declared Content-Type

#### Scenario: Referrer information protection

Given a user clicking external links from the application
When the browser sends a referrer header
Then only the origin is sent (not full URL path)
And sensitive URL parameters are not leaked

