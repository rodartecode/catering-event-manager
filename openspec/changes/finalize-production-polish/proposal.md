# Proposal: Finalize Production Polish

## Why

The catering event management system is 93% complete (186/200 tasks), but Phase 8 Polish has critical gaps that affect user experience and production readiness:

1. **Admin buttons visible to managers** - Role-based UI rendering incomplete (T168)
2. **No success/error feedback** - `react-hot-toast` installed but unused (T175-176)
3. **No query caching** - React Query has zero cache configuration (T177)
4. **Spinners instead of skeletons** - Poor perceived performance (T180)
5. **Final validation incomplete** - Lint, type-check, tests not verified (T196-200)

These were explicitly deferred as "Out of Scope" in `complete-phase8-production` change.

## What Changes

### 1. Role-based UI Rendering (T168)

Add `useIsAdmin()` hook and conditionally hide admin-only buttons:

| Page/Component | Admin-only Elements |
|----------------|---------------------|
| `/events` | "Create Event" button |
| `/events/[id]` | Status update, Archive buttons |
| `/clients` | "Add Client" button |
| `/resources` | "Add Resource" button |
| `TaskList` | Create task button |

Backend authorization (`adminProcedure`) remains as defense-in-depth.

### 2. Toast Notifications (T176)

- Add `<Toaster />` provider to root layout
- Add `toast.success()` on mutation success
- Add `toast.error()` on mutation failure
- Apply to: ClientForm, EventForm, TaskForm, ResourceForm, status dialogs

### 3. Zod Error Formatting (T175)

Create `formatZodErrors()` utility to DRY up the repeated pattern:
```typescript
// Current pattern repeated in 8+ forms
if (error instanceof z.ZodError) {
  error.issues.forEach((err) => {
    fieldErrors[err.path[0]] = err.message;
  });
}
```

### 4. React Query Caching (T177)

Configure QueryClient with production-appropriate settings:
- `staleTime`: 5 minutes (reduce unnecessary refetches)
- `gcTime`: 10 minutes (garbage collection)
- `refetchOnWindowFocus`: false (prevent jarring refetches)
- `retry`: 1 (single retry on failure)

### 5. Loading Skeletons (T180)

Replace spinner-based loading states with skeleton UI:
- EventListSkeleton for events page
- ClientListSkeleton for clients page
- TaskListSkeleton for task lists

Pattern: Match existing `AnalyticsSkeleton` component style.

### 6. Final Validation (T196-200)

- T196: `pnpm lint` passes
- T197: `pnpm type-check` passes
- T198: `go test ./...` passes
- T199: `docker-compose up` starts all services
- T200: Success criteria SC-001 through SC-010 validated

## Out of Scope

- Database connection pooling (T178) - Already configured
- Cursor pagination docs (T179) - Already implemented server-side
- tRPC Panel API docs (T184) - Lower priority
- Health check script (T190) - Already have health endpoints
