# Tasks: Production Hardening Audit - Phase 1 (Revised)

## Status Summary

**Original tasks:** 76
**Completed:** 76 ✅
**Remaining:** 0

Most tasks were completed through related changes:
- `extend-accessibility-requirements` (archived 2026-02-01)
- `improve-usability-patterns` (archived 2026-02-01)
- `add-security-hardening` (archived 2026-01-25)

## Completed Tasks (Reference Only)

### ✅ Phase 1a: High Priority Accessibility (COMPLETE)

#### ✅ 1. Focus Trap Hook
- [x] 1.1 Create `apps/web/src/hooks/use-focus-trap.ts` with focus trap logic
- [x] 1.2 Handle Tab/Shift+Tab cycling within container
- [x] 1.3 Handle Escape key for dismissal callback
- [x] 1.4 Save and restore focus on mount/unmount
- [x] 1.5 Add unit tests for focus trap behavior

#### ✅ 2. Accessible Dialog Components
- [x] 2.1 Update `EventStatusUpdateDialog.tsx` with role, aria-modal, aria-labelledby, useFocusTrap
- [x] 2.2 Update `TaskForm.tsx` modal with accessible dialog pattern
- [x] 2.3 Update `TaskAssignDialog.tsx` with accessible dialog pattern
- [x] 2.4 Update `ResourceForm.tsx` modal with accessible dialog pattern
- [x] 2.5 Update `ResourceAssignmentDialog.tsx` with accessible dialog pattern
- [x] 2.6 Update `CommunicationForm.tsx` modal with accessible dialog pattern

#### ✅ 3. Form Error Accessibility
- [x] 3.1 Create error ID generation utility for consistent aria-describedby
- [x] 3.2 Update `LoginForm.tsx` with aria-describedby and aria-invalid
- [x] 3.3 Update `EventForm.tsx` with aria-describedby and aria-invalid
- [x] 3.4 Update `TaskForm.tsx` form fields with error associations
- [x] 3.5 Update `ResourceForm.tsx` form fields with error associations
- [x] 3.6 Update `EditResourceForm.tsx` form fields with error associations
- [x] 3.7 Add aria-required to required fields across all forms

#### ✅ 4. Live Region for Toasts
- [x] 4.1 Verify react-hot-toast aria-live configuration
- [x] 4.2 Create LiveRegion wrapper component if needed
- [x] 4.3 Update toast provider configuration for screen reader announcements

### ✅ Phase 1b: Medium Priority Accessibility (COMPLETE)

#### ✅ 5. Skip Link
- [x] 5.1 Create `apps/web/src/components/a11y/SkipLink.tsx` component
- [x] 5.2 Style skip link (visually hidden, visible on focus)
- [x] 5.3 Add skip link to DashboardLayout.tsx
- [x] 5.4 Add skip link to PortalLayout.tsx
- [x] 5.5 Add main landmark `id="main-content"` to main element

#### ✅ 6. Keyboard Navigation for UserMenu
- [x] 6.1 Add keyboard event handlers (ArrowUp, ArrowDown, Enter, Escape)
- [x] 6.2 Implement focus management for menu items
- [x] 6.3 Add roving tabindex pattern for menu navigation
- [x] 6.4 Test keyboard-only menu interaction

#### ✅ 7. Color Contrast Audit
- [x] 7.1 Run axe audit on all page templates
- [x] 7.2 Document failing contrast ratios
- [x] 7.3 Fix status badge contrast issues
- [x] 7.4 Fix link text contrast issues (if any)
- [x] 7.5 Verify focus indicator contrast

#### ✅ 8. Loading State Accessibility
- [x] 8.1 Add role="status" and aria-label to spinner components
- [x] 8.2 Update skeleton components with aria-busy on parent
- [x] 8.3 Hide skeleton elements from screen readers (aria-hidden)

### ✅ Phase 2: Security Hardening (COMPLETE)

#### ✅ 9. Environment-Based CSP
- [x] 9.1 Refactor `next.config.ts` to build CSP based on NODE_ENV
- [x] 9.2 Remove 'unsafe-eval' from production CSP
- [x] 9.3 Document CSP differences in CLAUDE.md
- [x] 9.4 Add test to verify production CSP strictness

#### ✅ 10. Redis Rate Limiting Backend
- [x] 10.1 Add `ioredis` dependency
- [x] 10.2 Create Redis client wrapper with connection handling
- [x] 10.3 Implement sliding window rate limiter using Redis sorted sets
- [x] 10.4 Add fallback to in-memory when Redis unavailable
- [x] 10.5 Add REDIS_URL to environment variable schema
- [x] 10.6 Update rate-limit.ts to use Redis backend
- [x] 10.7 Add integration tests for distributed rate limiting

#### ✅ 11. Environment-Based CORS
- [x] 11.1 Add ALLOWED_ORIGINS to environment variable schema
- [x] 11.2 Update CORS configuration to use ALLOWED_ORIGINS
- [x] 11.3 Default to restrictive origins in production
- [x] 11.4 Document CORS configuration in CLAUDE.md

#### ✅ 12. Security Event Logging
- [x] 12.1 Create security logger namespace in logger.ts
- [x] 12.2 Add auth failure logging (login, magic link)
- [x] 12.3 Add rate limit exceeded logging
- [x] 12.4 Add authorization failure logging in tRPC middleware
- [x] 12.5 Ensure PII masking in security logs

### ✅ Phase 3: Usability Enhancements (COMPLETE)

#### ✅ 13. Unsaved Changes Protection
- [x] 13.1 Create `useFormDirty` hook
- [x] 13.2 Integrate with EventForm, TaskForm, ResourceForm
- [x] 13.3 Add beforeunload event listener
- [x] 13.4 Test form dirty state detection

---

## Remaining Tasks

### ✅ 14. Accessibility Testing Integration

- [x] 14.1 Add `vitest-axe` dependency to apps/web/package.json
- [x] 14.2 Create axe test helper in `apps/web/test/helpers/axe.ts`
- [x] 14.3 Add axe tests to dialog component tests (EventStatusUpdateDialog, TaskAssignDialog, ResourceAssignmentDialog)
- [x] 14.4 Add axe tests to form component tests (LoginForm, RegisterForm)
- [x] 14.5 Add Playwright axe scan for critical flows (auth.e2e.ts - login, dashboard)

---

## Validation

### ✅ 15. Final Verification

- [x] 15.1 Run full axe audit on all pages (manual - done during extend-accessibility-requirements)
- [x] 15.2 Manual screen reader testing (VoiceOver) - done during extend-accessibility-requirements
- [x] 15.3 Keyboard-only navigation testing - done during extend-accessibility-requirements
- [x] 15.4 Verify Redis rate limiting across instances
- [x] 15.5 Verify production CSP headers
- [x] 15.6 Update documentation with accessibility notes (axe test helper documented inline)
