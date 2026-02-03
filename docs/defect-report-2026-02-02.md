# Manual Acceptance Test - Defect Report

**Date:** 2026-02-02
**Environment:** Production (https://catering-event-manager.vercel.app/)
**Tester:** Automated via Playwright

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 1 |
| Medium | 1 |
| Low | 1 |

**Overall Status:** ❌ BLOCKING - Application is non-functional due to database connectivity issues

---

## Critical Defects

### DEF-001: Database Connection Failure - Registration Completely Broken

**Severity:** Critical
**Status:** Open
**Affects:** User Registration, likely all database operations

**Steps to Reproduce:**
1. Navigate to https://catering-event-manager.vercel.app/register
2. Fill in all required fields (Name, Email, Password, Confirm Password)
3. Click "Create account"

**Expected Result:**
User account is created and user is redirected to login or dashboard.

**Actual Result:**
HTTP 500 error returned. Error message displayed to user:
```
Failed query: select "id", "email", "password_hash", "name", "role", "client_id",
"is_active", "created_at", "updated_at" from "users" "users" where "users"."email" = $1 limit $2
params: testuser@example.com,1
```

**API Response:**
```json
{
  "error": {
    "json": {
      "message": "Failed query: select \"id\", \"email\", \"password_hash\", \"name\", \"role\", \"client_id\", \"is_active\", \"created_at\", \"updated_at\" from \"users\" \"users\" where \"users\".\"email\" = $1 limit $2\nparams: apitest@example.com,1",
      "code": -32603,
      "data": {
        "code": "INTERNAL_SERVER_ERROR",
        "httpStatus": 500,
        "path": "user.register"
      }
    }
  }
}
```

**Root Cause Analysis:**
The PostgreSQL database connection is failing on Vercel. This is likely due to:
1. Missing `DATABASE_URL` environment variable in Vercel project settings
2. Database not provisioned/accessible from Vercel's serverless functions
3. Connection string misconfiguration for production environment

**Impact:**
- Users cannot create accounts
- Users cannot login (no accounts exist)
- Application is completely unusable

**Screenshot:** `.playwright-mcp/registration-error-sql-leak.png`

---

## High Severity Defects

### DEF-002: SQL Query Exposed in Error Messages (Security Vulnerability)

**Severity:** High
**Status:** Open
**Type:** Security - Information Disclosure

**Description:**
When database errors occur, the full SQL query including table structure, column names, and parameter values is exposed to end users in the UI error message.

**Information Leaked:**
- Table name: `users`
- All column names: `id`, `email`, `password_hash`, `name`, `role`, `client_id`, `is_active`, `created_at`, `updated_at`
- Query structure and parameterization pattern
- User-submitted data (email address in params)

**Security Impact:**
- Reveals database schema to potential attackers
- Aids in SQL injection attack planning
- Exposes that `password_hash` column exists (confirms password storage approach)
- OWASP Top 10: A01:2021 – Broken Access Control / Information Exposure

**Recommended Fix:**
1. Implement proper error handling that returns generic user-friendly messages
2. Log detailed errors server-side only
3. Never expose raw database errors to clients in production
4. Example fix in tRPC error handler:
```typescript
// Instead of exposing the raw error:
throw new TRPCError({
  code: 'INTERNAL_SERVER_ERROR',
  message: 'An error occurred. Please try again later.',
});
```

**Screenshot:** `.playwright-mcp/registration-error-sql-leak.png`

---

## Medium Severity Defects

### DEF-003: Missing Favicon (404 Error)

**Severity:** Medium
**Status:** Open
**Type:** Missing Asset

**Steps to Reproduce:**
1. Navigate to any page on the application
2. Check browser console or navigate directly to `/favicon.ico`

**Expected Result:**
Favicon loads successfully, browser tab shows application icon.

**Actual Result:**
- HTTP 404 response for `/favicon.ico`
- Browser console shows: `Failed to load resource: the server responded with a status of 404`
- Application's custom 404 page is served instead of the favicon

**Impact:**
- Unprofessional appearance in browser tabs
- Console error noise
- Minor SEO impact

**Recommended Fix:**
Add favicon files to `apps/web/public/`:
- `favicon.ico`
- `apple-touch-icon.png`
- Consider adding `site.webmanifest` for PWA support

**Screenshot:** `.playwright-mcp/favicon-404.png`

---

## Low Severity Defects

### DEF-004: Console Noise from Browser Extensions

**Severity:** Low
**Status:** Informational
**Type:** Environment-Specific

**Description:**
The console logs provided by the user contain extensive noise from the 1Password browser extension. While this doesn't affect the application, it makes debugging difficult.

**Note:** The `runtime.lastError` messages and 1Password-related logs are from the browser extension, not the application itself. These can be ignored when debugging application issues.

---

## Test Results - Functionality That Works

| Feature | Status | Notes |
|---------|--------|-------|
| Login page loads | ✅ Pass | Renders correctly |
| Registration page loads | ✅ Pass | Renders correctly |
| Client-side validation (password mismatch) | ✅ Pass | Shows "Passwords don't match" |
| Protected route redirect | ✅ Pass | `/events` redirects to `/login` |
| Login error handling | ✅ Pass | Shows "Invalid email or password" |
| 404 page | ✅ Pass | Custom 404 page with navigation links |
| URL callback preservation | ✅ Pass | `?callbackUrl=` parameter works |

---

## Recommendations

### Immediate Actions (P0)

1. **Configure DATABASE_URL in Vercel**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add `DATABASE_URL` with production PostgreSQL connection string
   - Redeploy the application

2. **Fix Error Message Exposure**
   - Update tRPC error handling to sanitize database errors
   - Return generic "Registration failed" message to users
   - Log detailed errors server-side for debugging

### Short-term Actions (P1)

3. **Add Favicon**
   - Create and add favicon to `apps/web/public/`
   - Update `apps/web/src/app/layout.tsx` metadata if needed

4. **Add Database Health Check**
   - Implement `/api/health` endpoint that verifies database connectivity
   - Add to deployment verification process

### Testing Infrastructure

5. **Add E2E Tests for Auth Flows**
   - Registration success/failure scenarios
   - Login success/failure scenarios
   - Protected route access

---

## Appendix: Screenshots

All screenshots saved to `.playwright-mcp/` directory:
- `registration-form-filled.png` - Filled registration form
- `registration-error-sql-leak.png` - Error with SQL exposure
- `login-invalid-credentials.png` - Login error display
- `favicon-404.png` - 404 page for missing favicon
- `registration-api-error-final.png` - Final error state

---

*Report generated from manual acceptance testing session*
