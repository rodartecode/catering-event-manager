## Context

The CI pipeline uses `pnpm/action-setup@v4` to install pnpm before running tests and builds. The action now enforces that pnpm version is specified in exactly one place. Currently we have two conflicting sources:

1. `.github/workflows/ci.yml` line 12: `PNPM_VERSION: '10'` (used in 6 job steps)
2. `package.json` line 37: `"packageManager": "pnpm@10.0.0"`

The action fails with `ERR_PNPM_BAD_PM_VERSION` before any actual CI work happens.

## Goals / Non-Goals

**Goals:**
- Unblock CI pipeline on all branches
- Use the modern, recommended pnpm version specification pattern
- Maintain consistency between local development and CI

**Non-Goals:**
- Upgrading pnpm version (staying on 10.0.0)
- Changing any other CI behavior
- Addressing the secondary Codecov upload warnings

## Decisions

**Decision: Remove version from workflow, keep packageManager in package.json**

Rationale:
- `packageManager` in package.json is the npm/pnpm recommended approach
- Works with Node's corepack for consistent local development
- `pnpm/action-setup@v4` auto-detects from packageManager field
- Single source of truth for pnpm version

Alternative considered: Remove `packageManager` from package.json
- Rejected: Less portable, requires developers to know which version to use locally

## Risks / Trade-offs

**[Low] Version drift** → Mitigated by packageManager being explicit (`pnpm@10.0.0`)

**[None] Behavioral change** → Both sources already specify pnpm 10, so no actual version change
