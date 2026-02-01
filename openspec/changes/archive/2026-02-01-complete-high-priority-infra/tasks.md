# Tasks: complete-high-priority-infra

## Overview

Two high-priority infrastructure tasks for production readiness.

## Task Order

Tasks can be executed in parallel since they modify independent systems.

### Task 1: Validate Session Management (T167)
**Status**: Ready
**Parallelizable**: Yes
**Files**: None to modify (verification only)

1. Review existing session configuration in `apps/web/src/server/auth.ts`:
   - Verify `maxAge: 24 * 60 * 60` (24 hours)
   - Verify `updateAge: 4 * 60` (4 minutes)

2. Review SessionProvider in `apps/web/src/app/(dashboard)/layout.tsx`:
   - Verify `refetchInterval={240}` (4 minutes in seconds)
   - Verify `refetchOnWindowFocus={true}`

3. Review portal layout `apps/web/src/app/portal/layout.tsx`:
   - Verify same SessionProvider configuration

4. Review SessionGuard in `apps/web/src/components/auth/SessionGuard.tsx`:
   - Verify redirect includes `error=SessionExpired`

5. Review LoginForm displays SessionExpired message:
   - Check for `error=SessionExpired` query param handling

6. Update tasks.md to mark T167 as complete with verification notes

**Validation**: All configuration matches session-management spec requirements

---

### Task 2: Configure Connection Pooling (T178)
**Status**: Ready
**Parallelizable**: Yes
**Files**:
- `packages/database/src/client.ts`
- `apps/scheduling-service/internal/repository/connection.go`

1. Update TypeScript client (`packages/database/src/client.ts`):
   ```typescript
   const client = postgres(connectionString, {
     max: 150,              // 75% of 200 total for CRUD operations
     idle_timeout: 30,      // Close idle connections after 30 seconds
     connect_timeout: 10,   // Connection timeout
     max_lifetime: 60 * 30, // Max connection lifetime: 30 minutes
   });
   ```

2. Update Go service (`apps/scheduling-service/internal/repository/connection.go`):
   ```go
   db.SetMaxOpenConns(50)           // 25% of 200 total for scheduling
   db.SetMaxIdleConns(10)           // Keep 10 idle for quick reuse
   db.SetConnMaxLifetime(30 * time.Minute) // Recycle connections
   db.SetConnMaxIdleTime(5 * time.Minute)  // Close idle connections
   ```

3. Add connection pool documentation to CLAUDE.md

4. Update tasks.md to mark T178 as complete

**Validation**:
- `pnpm type-check` passes
- `go build ./...` passes in scheduling-service
- Total connections: 150 + 50 = 200

---

## Completion Criteria

- [x] T167 verified and marked complete in tasks.md
- [x] T178 implemented and marked complete in tasks.md
- [x] All tests pass (pnpm type-check, go build ./...)
- [x] Documentation updated (tasks.md progress updated to 36/36)
