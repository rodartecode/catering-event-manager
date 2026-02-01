# Design: Production Hardening Audit - Phase 1 (Revised)

## Context

This is Phase 1 of production hardening for first test deployments. The original audit (January 31, 2026) covered security, accessibility, and usability. Most items have been implemented through related changes.

**Related archived changes:**
- `extend-accessibility-requirements` (2026-02-01) - Color contrast, focus rings, decorative icons, custom controls, loading states
- `improve-usability-patterns` (2026-02-01) - Skeleton accessibility, unsaved changes protection, touch targets
- `add-security-hardening` (2026-01-25) - Rate limiting, CSRF, CSP, security headers

**Stakeholders:**
- Development team (implementing remaining fixes)
- QA team (validating accessibility via automated tests)
- CI/CD (integrating accessibility checks)

## Goals / Non-Goals

### Goals
- Create new `accessibility` spec documenting implemented patterns
- Enhance `rate-limiting` spec with distributed rate limiting and environment-based CSP
- Add `security-audit` spec for CORS and security logging
- Integrate automated accessibility testing into CI

### Non-Goals
- Implementing core accessibility fixes (already done)
- Implementing security hardening (already done)
- WCAG AAA compliance (AA is target)
- Performance optimization (separate effort)

## Decisions

### Decision 1: New Accessibility Spec (Not Merged Into Usability)

**What:** Create dedicated `accessibility` spec separate from `usability` spec.

**Why:**
- Accessibility requirements are technical (ARIA, focus management, keyboard nav)
- Usability requirements are behavioral (loading states, error recovery, touch targets)
- Separation makes each spec more focused and maintainable
- Some accessibility items (A11Y-001 dialogs, A11Y-002 forms) are distinct from usability concerns

**Note:** Color contrast (formerly A11Y-006) was NOT included because it already exists as UX-005 in the usability spec. This avoids duplication.

### Decision 2: Accessibility Testing as A11Y-006

**What:** Replace the duplicate "Color Contrast" requirement with "Automated Accessibility Testing" (A11Y-006).

**Why:**
- Color contrast is already covered by UX-005
- Automated testing is a genuine gap (no axe dependencies currently)
- Aligns with CI/CD goals of preventing regressions

**Implementation:**
```bash
# Component tests
pnpm add -D vitest-axe

# E2E tests
pnpm add -D @axe-core/playwright
```

### Decision 3: Security Spec Organization

**What:** Keep security requirements in `security-audit` spec for CORS and logging enhancements; modify `rate-limiting` spec for distributed rate limiting.

**Rationale:**
- SEC-001 (rate limiting) and SEC-005 (CSP) are modifications to existing `rate-limiting` spec
- SEC-007 (CORS) and SEC-008 (security logging) are new, distinct concerns
- `security-audit` spec captures operational security monitoring patterns

### Decision 4: Axe Testing Strategy

**What:** Use `vitest-axe` for component tests and `@axe-core/playwright` for E2E.

**Component Test Pattern:**
```typescript
import { axe, toHaveNoViolations } from 'vitest-axe';

expect.extend(toHaveNoViolations);

it('has no accessibility violations', async () => {
  const { container } = render(<EventStatusUpdateDialog isOpen={true} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**E2E Test Pattern:**
```typescript
import { injectAxe, checkA11y } from '@axe-core/playwright';

test('login page is accessible', async ({ page }) => {
  await page.goto('/login');
  await injectAxe(page);
  await checkA11y(page);
});
```

**Why this approach:**
- `vitest-axe` integrates with existing Vitest setup
- `@axe-core/playwright` integrates with existing Playwright E2E tests
- Both use axe-core rules (WCAG 2.1 AA by default)
- CI can fail on violations with clear remediation guidance

## Risks / Trade-offs

### Risk 1: Axe False Positives
- **Risk:** axe may flag valid patterns as violations
- **Mitigation:** Use `axe.configure()` to disable specific rules when justified
- **Documentation:** Add comments explaining any disabled rules

### Risk 2: Test Maintenance Burden
- **Risk:** Axe tests may slow down development if flaky
- **Mitigation:** Only add axe assertions to key components (dialogs, forms)
- **Trade-off:** Coverage vs. velocity (favor key components)

## Migration Plan

### Remaining Work

1. **Add axe dependencies** (14.1)
   ```bash
   cd apps/web
   pnpm add -D vitest-axe @axe-core/playwright
   ```

2. **Create axe test helper** (14.2)
   - `apps/web/test/helpers/axe.ts` - Helper functions + Vitest extend

3. **Add axe to dialog tests** (14.3)
   - EventStatusUpdateDialog.test.tsx
   - TaskAssignDialog.test.tsx
   - ResourceAssignmentDialog.test.tsx

4. **Add axe to form tests** (14.4)
   - LoginForm.test.tsx
   - EventForm.test.tsx
   - TaskForm.test.tsx
   - ResourceForm.test.tsx

5. **Add Playwright axe scans** (14.5)
   - Critical flows: login, event creation, task management

## Open Questions

1. **Axe rule configuration:** Which rules should be globally disabled?
   - Recommendation: None initially; disable specific rules per-component if needed

2. **CI failure behavior:** Should axe failures be blocking or warning-only initially?
   - Recommendation: Blocking from the start to establish discipline

3. **Coverage scope:** Which additional components should get axe tests?
   - Recommendation: Start with dialogs and forms; expand based on violations found
