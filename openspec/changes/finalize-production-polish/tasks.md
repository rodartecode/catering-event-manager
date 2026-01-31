# Tasks: Finalize Production Polish

## Overview

Complete remaining Phase 8 tasks for production readiness: role-based UI, toast notifications, query caching, loading skeletons, and final validation.

**Estimated Effort:** 4-6 hours
**Dependencies:** None (can start immediately)
**Parallelizable:** Tasks 1-4 can be done in parallel

---

## Tasks

### 1. Add Role-based UI Hook

**File:** `apps/web/src/lib/use-auth.ts` (separated from server-side auth.ts)

- [x] Create `useIsAdmin()` hook using `useSession()`
- [x] Return `{ isAdmin, isLoading }` tuple
- [x] Handle unauthenticated state gracefully

**Validation:** Hook returns correct values for admin/manager roles

---

### 2. Apply Role-based UI to Pages

**Files:**
- `apps/web/src/app/(dashboard)/events/page.tsx`
- `apps/web/src/app/(dashboard)/events/[id]/page.tsx`
- `apps/web/src/app/(dashboard)/clients/page.tsx`
- `apps/web/src/app/(dashboard)/resources/page.tsx`

- [x] Import and use `useIsAdmin()` hook in each page
- [x] Wrap "Create Event" button in `{isAdmin && ...}` conditional
- [x] Wrap "Update Status" and "Archive" buttons in conditional
- [x] Wrap "Add Client" button in conditional
- [x] Wrap "Add Resource" button in conditional

**Validation:** Login as manager, verify admin buttons are hidden

---

### 3. Fix TaskList Admin Prop

**File:** `apps/web/src/components/tasks/TaskList.tsx`

- [x] Remove hardcoded `isAdmin={true}` TODO
- [x] Pass actual `isAdmin` value from parent page
- [x] Update event detail page to pass correct prop

**Validation:** Task create button hidden for manager role

---

### 4. Add Toast Provider

**File:** `apps/web/src/app/providers.tsx`

- [x] Import `Toaster` from `react-hot-toast`
- [x] Add `<Toaster position="top-right" />` inside QueryClientProvider

**Validation:** No console errors, Toaster renders

---

### 5. Add Toast Notifications to Forms

**Files:**
- `apps/web/src/components/clients/ClientForm.tsx`
- `apps/web/src/components/events/EventForm.tsx`
- `apps/web/src/components/events/EventStatusUpdateDialog.tsx`
- `apps/web/src/components/tasks/TaskForm.tsx`
- `apps/web/src/components/tasks/TaskAssignDialog.tsx`
- `apps/web/src/components/resources/ResourceForm.tsx`
- `apps/web/src/components/resources/EditResourceForm.tsx`

- [x] Import `toast` from `react-hot-toast`
- [x] Add `toast.success('Created successfully')` in onSuccess
- [x] Add `toast.error(error.message)` in onError
- [x] Use appropriate success messages per form context

**Validation:** Submit form, see toast notification appear

---

### 6. Create Zod Error Utility

**File:** `apps/web/src/lib/form-utils.ts` (new)

- [x] Create `formatZodErrors(error: z.ZodError): Record<string, string>`
- [x] Extract repeated pattern from existing forms
- [x] Export utility function

**Validation:** Utility matches existing Zod error formatting pattern

---

### 7. Configure React Query Caching

**File:** `apps/web/src/app/providers.tsx`

- [x] Add `staleTime: 5 * 60 * 1000` (5 minutes)
- [x] Add `gcTime: 10 * 60 * 1000` (10 minutes)
- [x] Add `retry: 1`
- [x] Add `refetchOnWindowFocus: false`

**Validation:** Network tab shows no refetch on window focus

---

### 8. Create Loading Skeletons

**Files:**
- `apps/web/src/components/events/EventListSkeleton.tsx` (new)
- `apps/web/src/components/clients/ClientListSkeleton.tsx` (new)
- `apps/web/src/components/tasks/TaskListSkeleton.tsx` (new)

- [x] Create EventListSkeleton with 5 card placeholders
- [x] Create ClientListSkeleton with 5 card placeholders
- [x] Create TaskListSkeleton with 3 task placeholders
- [x] Match existing Tailwind pulse animation style

**Validation:** Skeleton matches data layout structure

---

### 9. Integrate Loading Skeletons

**Files:**
- `apps/web/src/app/(dashboard)/events/page.tsx`
- `apps/web/src/app/(dashboard)/clients/page.tsx`
- `apps/web/src/components/tasks/TaskList.tsx`

- [x] Replace spinner with EventListSkeleton in events page
- [x] Replace spinner with ClientListSkeleton in clients page
- [x] Replace spinner with TaskListSkeleton in TaskList

**Validation:** Page refresh shows skeleton before data loads

---

### 10. Final Validation - Lint

**Command:** `pnpm lint`

- [x] Run lint across all packages
- [x] Fix any errors that arise
- [x] Verify exit code 0

**Validation:** 0 errors, 30 pre-existing warnings (no regressions)

---

### 11. Final Validation - Type Check

**Command:** `pnpm type-check`

- [x] Run TypeScript type checking
- [x] Fix any type errors
- [x] Verify exit code 0

**Validation:** Command completes with no errors

---

### 12. Final Validation - Go Tests

**Command:** `cd apps/scheduling-service && go test ./...`

- [x] Run all Go tests
- [x] Verify all tests pass
- [x] Check coverage meets targets

**Validation:** All tests pass, no failures

---

### 13. Final Validation - Docker Compose

**Command:** `docker-compose config`

- [x] Validate Docker Compose configuration
- [x] Verify service definitions are correct
- [x] Check all services properly configured

**Validation:** Config valid, all services defined correctly

---

### 14. Update Phase 8 Task Status

**File:** `specs/001-event-lifecycle-management/tasks.md`

- [x] Mark T168 complete
- [x] Mark T175-T176 complete
- [x] Mark T177 complete
- [x] Mark T180 complete
- [x] Mark T196-T199 complete
- [x] Update progress to 34/36 (94%)

**Validation:** Task counts accurate

---

## Verification Checklist

After completing all tasks:

- [x] Manager user cannot see admin-only buttons
- [x] Toast notifications appear on form success/error
- [x] Queries don't refetch on window focus
- [x] Skeleton UI shows during data loading
- [x] `pnpm lint` passes
- [x] `pnpm type-check` passes
- [x] `go test ./...` passes
- [x] `docker-compose config` validates
