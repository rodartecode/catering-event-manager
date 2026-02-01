# Change: Production Hardening Audit - Phase 1 (Revised)

## Status Update

**Original audit date:** January 31, 2026
**Revised:** February 1, 2026

This proposal has been revised to reflect implementation progress. Most items from the original audit have been completed through related changes (`extend-accessibility-requirements`, `improve-usability-patterns`).

## Why

The catering event management system is preparing for its first test deployments. This audit identifies remaining gaps and creates actionable specifications for remediation.

## Original Audit Summary (January 31, 2026)

### Security Assessment: STRONG (with gaps) → NOW COMPLETE ✅

**Strengths (unchanged):**
- Modern authentication (Next-Auth v5 with dual-flow: credentials + magic links)
- Comprehensive RBAC (admin/manager/client procedures with 97 test cases)
- Input validation via Zod on all tRPC procedures
- Parameterized queries (Drizzle ORM + SQLC) - no SQL injection risk
- Rate limiting implemented (Next.js + Go service)
- Security headers configured (CSP, X-Frame-Options, etc.)
- bcrypt password hashing (10 salt rounds)
- CSRF protection via NextAuth v5

**Gaps → Now Resolved:**
| Gap | Priority | Status |
|-----|----------|--------|
| In-memory rate limiting (not distributed-ready) | High | ✅ Redis backend implemented with fallback |
| CSP uses `'unsafe-eval'` in dev mode | Medium | ✅ Environment-based CSP configured |
| No Redis backend for rate limiting | High | ✅ `redis.ts` wrapper + integration complete |
| CORS origin hardcoded to localhost | Medium | ✅ ALLOWED_ORIGINS env var support added |
| Limited security event logging | Low | ✅ Security logger namespace added |

### Accessibility Assessment: MODERATE → MOSTLY COMPLETE ✅

**Gaps → Now Resolved:**
| Gap | Priority | Status |
|-----|----------|--------|
| Dialogs missing `role="dialog"` + focus trap | High | ✅ `use-focus-trap.ts` hook created + applied |
| No `aria-describedby` linking errors to fields | High | ✅ `form-a11y.ts` utility created |
| No `aria-live` regions for dynamic content | High | ✅ Toast notifications configured |
| No Escape key handling in modals | Medium | ✅ Focus trap hook handles Escape |
| No skip link to main content | Medium | ✅ `SkipLink.tsx` component + tests |
| Dropdown menus lack keyboard navigation | Medium | ✅ UserMenu keyboard navigation added |
| Color contrast not verified | Medium | ✅ Verified + fixed in extend-accessibility-requirements |

### Usability Assessment: STRONG → COMPLETE ✅

All usability gaps resolved through `improve-usability-patterns` and `extend-accessibility-requirements` changes.

## What Remains

### 1. Accessibility Testing Framework Integration

The only major gap remaining is automated accessibility testing integration:

- **A11Y-TEST-001**: Add `@axe-core/react` and `vitest-axe` dependencies
- **A11Y-TEST-002**: Create axe test helper for Vitest
- **A11Y-TEST-003**: Add axe tests to dialog component tests
- **A11Y-TEST-004**: Add axe tests to form component tests
- **A11Y-TEST-005**: Add Playwright axe scan for critical flows

### 2. Spec Consolidation

This change will:
1. **CREATE** new `accessibility` spec with A11Y-001 through A11Y-005 (dialog, form errors, live regions, skip link, keyboard navigation)
2. **MODIFY** `rate-limiting` spec to add distributed rate limiting scenarios (SEC-001 enhancement)
3. **MODIFY** `rate-limiting` spec to add environment-based CSP scenarios (SEC-005 enhancement)
4. **ADD** SEC-007 (CORS configuration) and SEC-008 (security event logging) to a new `security-audit` spec

**Note:** A11Y-006 (Color Contrast) is NOT included as it duplicates UX-005 already in usability spec.

## Impact

- **Affected specs**:
  - `rate-limiting` (MODIFIED: SEC-001 + SEC-005 enhancements)
  - NEW `accessibility` (A11Y-001 through A11Y-005)
  - NEW `security-audit` (SEC-007 + SEC-008)
- **Affected code**:
  - `apps/web/package.json` (add axe testing dependencies)
  - `apps/web/test/` (add axe test helpers)
  - Component test files (add axe assertions)

## Dependencies

- `@axe-core/react` package
- `vitest-axe` package
- `axe-playwright` package (for E2E)

## Success Criteria

1. All dialogs pass axe accessibility audit
2. All forms pass axe accessibility audit
3. Critical E2E flows pass Playwright axe scans
4. CI pipeline includes accessibility checks
