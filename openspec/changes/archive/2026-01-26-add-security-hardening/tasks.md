# Tasks: Add Security Hardening

## Overview

Implementation tasks for adding rate limiting, CSRF protection, and Content Security Policy to the catering event management system.

**Estimated Effort:** 4-6 hours
**Dependencies:** None (can start immediately)
**Parallelizable:** Tasks 1-3 can be done in parallel
**Status:** ✅ Complete (January 25, 2026)

---

## Tasks

### 1. Add Rate Limiting Library and Configuration

**File:** `apps/web/src/lib/rate-limit.ts`

- [x] Create rate limiting utility with in-memory fallback
- [x] Configure general rate limit (100 req/min per IP)
- [x] Configure auth rate limit (5 req/min per IP)
- [x] Configure magic link rate limit (3 req/5min per email)
- [x] Add type definitions for rate limit responses

**Validation:** Unit test that rate limiter correctly tracks requests ✅

---

### 2. Integrate Rate Limiting into tRPC Handler

**File:** `apps/web/src/app/api/trpc/[trpc]/route.ts`

- [x] Import rate limiter from lib/rate-limit.ts
- [x] Add IP extraction from request headers
- [x] Wrap handler with rate limit check
- [x] Return 429 response with Retry-After header when exceeded
- [x] Add X-RateLimit-Remaining header to responses

**Validation:** Manual test with curl showing 429 after 100+ requests ✅

---

### 3. Add Auth-Specific Rate Limiting

**Files:**

- `apps/web/src/server/auth.ts`
- `apps/web/src/app/api/auth/[...nextauth]/route.ts`

- [x] Apply stricter rate limit to credentials authorize function
- [x] Apply rate limit to magic link token creation
- [x] Log rate-limited authentication attempts for security monitoring

**Validation:** Test that 6th login attempt in 1 minute returns 429 ✅

---

### 4. Add Rate Limiting to Go Scheduling Service

**File:** `apps/scheduling-service/internal/api/middleware.go`

- [x] Import fiber/middleware/limiter
- [x] Configure limiter with 200 req/min per IP
- [x] Add custom error response for rate limit exceeded
- [x] Position limiter middleware before route handlers

**Validation:** Go test and manual test with curl ✅

---

### 5. Verify and Document CSRF Protection

**Files:**

- `apps/web/src/server/auth.ts`
- `apps/web/src/app/api/trpc/[trpc]/route.ts`

- [x] Verify Next-Auth CSRF is enabled (check cookie settings)
- [x] Document CSRF protection in auth.ts comments
- [x] Add origin validation to tRPC handler for mutations
- [x] Test that cross-origin POST requests are rejected

**Validation:** Test mutation request with different Origin header fails ✅

---

### 6. Add Content Security Policy Header

**File:** `apps/web/next.config.ts`

- [x] Add Content-Security-Policy header to headers() config
- [x] Configure directives: default-src, script-src, style-src, connect-src
- [x] Add frame-ancestors 'none' (supplement X-Frame-Options)
- [x] Test that application still functions correctly with CSP

**Validation:** Browser dev tools shows CSP header, no violations in console ✅

---

### 7. Add Rate Limit Tests

**Files:**

- `apps/web/src/lib/rate-limit.test.ts`
- `apps/scheduling-service/internal/api/middleware_test.go`

- [x] Unit test in-memory rate limiter behavior
- [x] Test rate limit reset after window expires
- [x] Test auth-specific stricter limits
- [x] Add Go test for scheduling service rate limiting

**Validation:** `pnpm test` and `go test ./...` pass ✅

---

### 8. Update Environment Configuration

**Files:**

- `.env.example`
- `apps/web/.env.example`
- `README.md`

- [x] Add UPSTASH_REDIS_URL (optional, for production rate limiting)
- [x] Document rate limit configuration options
- [x] Add security configuration section to README

**Validation:** Documentation review ✅

---

### 9. Security Header Audit

**File:** `apps/web/next.config.ts`

- [x] Verify all security headers are present and correct
- [x] Test with securityheaders.com or similar tool
- [x] Document any headers intentionally omitted and why

**Validation:** Security headers scan shows A rating ✅

---

## Verification Checklist

After completing all tasks:

- [x] `pnpm test` passes (all TypeScript tests)
- [x] `go test ./...` passes (all Go tests)
- [x] `pnpm lint` passes (no linting errors)
- [x] Manual test: Login rate limiting works (429 after 5 attempts)
- [x] Manual test: API rate limiting works (429 after 100 requests)
- [x] Manual test: Cross-origin mutation requests blocked
- [x] Manual test: Security headers present in browser dev tools
- [x] Documentation updated with security configuration

---

## Rollback Plan

If issues arise in production:

1. **Rate limiting causing issues:** Set very high limits (10000/min) or disable via env var
2. **CSP blocking legitimate content:** Switch to report-only mode
3. **CSRF blocking legitimate requests:** Verify origin whitelist includes all valid origins

---

## Implementation Summary

### Files Created

- `apps/web/src/lib/rate-limit.ts` - Rate limiting utility with in-memory store
- `apps/web/src/lib/rate-limit.test.ts` - Rate limiting unit tests
- `apps/scheduling-service/internal/api/middleware_test.go` - Go middleware tests

### Files Modified

- `apps/web/src/app/api/trpc/[trpc]/route.ts` - Rate limiting + origin validation
- `apps/web/src/app/api/auth/[...nextauth]/route.ts` - Auth rate limiting
- `apps/web/src/server/auth.ts` - Magic link rate limiting + CSRF docs
- `apps/web/src/server/routers/portal.ts` - Updated for new MagicLinkResult type
- `apps/web/next.config.ts` - CSP and security headers
- `apps/scheduling-service/internal/api/middleware.go` - Go rate limiting
- `apps/scheduling-service/go.mod` - Added limiter dependency
- `.env.example` - Upstash Redis config
- `apps/web/.env.example` - Upstash Redis config
- `README.md` - Security documentation section
