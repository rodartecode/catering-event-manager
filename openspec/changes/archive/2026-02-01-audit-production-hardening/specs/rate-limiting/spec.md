## MODIFIED Requirements

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
