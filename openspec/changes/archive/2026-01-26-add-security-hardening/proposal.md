# Proposal: Add Security Hardening

## Why

The catering event management system handles sensitive business data (client information, event details, financial data) and supports user authentication with multiple roles. Before production deployment, security hardening is critical to protect against common web application attacks.

**Current Security Gaps:**

1. **No Rate Limiting** - API endpoints are vulnerable to brute-force attacks and DoS
   - Login endpoint can be brute-forced without throttling
   - tRPC mutations can be called at unlimited rates
   - Go scheduling service has no request throttling

2. **No CSRF Protection** - State-changing requests vulnerable to cross-site attacks
   - Next-Auth doesn't have explicit CSRF token validation configured
   - Attackers could forge requests if user is logged in elsewhere

3. **Incomplete Security Headers** - CSP header is missing
   - X-Frame-Options, X-Content-Type-Options are present
   - **Content-Security-Policy missing** - XSS attack surface remains

**Risk Assessment:**

| Gap | Attack Vector | Impact |
|-----|---------------|--------|
| No rate limiting | Brute-force login, DoS | Account compromise, service outage |
| No CSRF | Cross-site request forgery | Unauthorized actions as logged-in user |
| Missing CSP | XSS injection | Data theft, session hijacking |

## What Changes

### 1. Rate Limiting (T191, T192)

Add request rate limiting to both services:

**tRPC API (Next.js):**
- Global rate limit: 100 requests/minute per IP
- Auth endpoints: 5 requests/minute per IP (stricter for login)
- Use in-memory store for dev, Redis adapter for production

**Go Scheduling Service:**
- Global rate limit: 200 requests/minute per IP
- Use Fiber's built-in limiter middleware

### 2. CSRF Protection (T193)

Configure Next-Auth with proper CSRF protection:
- Enable CSRF token generation and validation
- Ensure all state-changing tRPC mutations validate CSRF token
- Add CSRF token to forms where needed

### 3. Content Security Policy (Enhancement to T195)

Add CSP header to next.config.ts:
- Restrict script sources to self and trusted CDNs
- Restrict style sources to self and inline (for Tailwind)
- Disable inline scripts except for nonces
- Report violations to logging endpoint

## Out of Scope

- Web Application Firewall (WAF) - infrastructure concern
- DDoS protection - handled at load balancer/CDN level
- Penetration testing - post-implementation validation
- Security audit - separate engagement

## Success Criteria

- [ ] All API endpoints rate limited with configurable thresholds
- [ ] CSRF token validated on all state-changing mutations
- [ ] CSP header present blocking inline scripts
- [ ] No regressions in existing functionality
- [ ] Security headers score "A" on securityheaders.com
