## Context

During `next build`, Next.js 16 with Turbopack performs "page data collection" which evaluates route handlers AND their transitive imports. The database client is imported at module level in `src/server/auth.ts` and `src/server/trpc.ts`, which are used throughout the app. This causes the build to fail when `DATABASE_URL` is not set.

Current state:
- Build job fails with: `Error: DATABASE_URL environment variable is not set`
- Error cascades through: `/api/auth/[...nextauth]`, `/api/health`, `/api/cron/follow-ups`, and tRPC routes
- Other jobs (unit tests, e2e, quality gates) have PostgreSQL and work fine
- `force-dynamic` alone does NOT prevent module-level evaluation in Next.js 16 + Turbopack

## Goals / Non-Goals

**Goals:**
- CI Build job passes without DATABASE_URL or PostgreSQL service
- Runtime behavior completely unchanged
- Single-point fix (not touching every route)

**Non-Goals:**
- Adding PostgreSQL to Build job (conceptually wrong - builds shouldn't need databases)
- Refactoring all routes to use dynamic imports (too invasive)

## Decisions

### Use lazy database initialization

**Decision**: Defer DATABASE_URL validation to first actual database usage, not module load time.

**Rationale**:
- Fixes the problem at the source (database package)
- No changes needed to any routes or server code
- Build-time module evaluation succeeds (no side effects at import)
- Runtime behavior unchanged (error still thrown if DATABASE_URL missing when db is used)
- Pattern is common in libraries that require runtime configuration

**Alternatives considered**:
1. **`force-dynamic` on routes**: Does NOT prevent module-level evaluation in Next.js 16 + Turbopack
2. **Dynamic imports in each route**: Works but requires touching many files, error-prone
3. **Add PostgreSQL to Build job**: Wrong approach - builds shouldn't need databases
4. **Placeholder DATABASE_URL**: Misleading, could mask configuration issues until runtime

## Risks / Trade-offs

**Risk**: Error moves from startup to first query → **Mitigation**: Error message remains the same, just deferred. Apps always call db early (auth, health check), so error surfaces immediately at runtime.

**Risk**: Slightly more complex client code → **Mitigation**: Complexity is isolated to one file, well-documented.
