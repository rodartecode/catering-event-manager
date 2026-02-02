## Why

The CI Build job fails because `next build` evaluates `/api/health` at build time, which imports the database client that throws when `DATABASE_URL` is not set. The Build job doesn't have a PostgreSQL service or `DATABASE_URL` configured because builds shouldn't require runtime database connections.

## What Changes

- Add `export const dynamic = 'force-dynamic'` to `/api/health` route to prevent Next.js from evaluating it during build
- This is the standard Next.js pattern for routes that require runtime resources (already used in `/api/cron/follow-ups`)

## Capabilities

### New Capabilities

None - this is a configuration fix, not a new capability.

### Modified Capabilities

None - no spec-level behavior changes, only CI infrastructure fix.

## Impact

- **File Changed**: `apps/web/src/app/api/health/route.ts`
- **CI**: Build job will pass without needing DATABASE_URL or PostgreSQL service
- **Runtime Behavior**: Unchanged - health route still checks database connectivity when called
