# Tasks: fix-trpc-subscription-crash

## Task 1: Remove subscription call from event detail page
- [x] Remove `useSubscription` call and related code (lines 28-38) from `apps/web/src/app/(dashboard)/events/[id]/page.tsx`
- [x] Remove `trpc.useUtils()` call if no longer needed (check if `utils` is used elsewhere in the component)
- [x] Add `refetchInterval: 5000` to the `trpc.event.getById.useQuery()` options
- **Verify**: Page loads at `/events/[id]` without crash, data section renders

## Task 2: Remove placeholder subscription procedures
- [x] Remove `onStatusChange` subscription from `apps/web/src/server/routers/event.ts` (lines 380-396)
- [x] Remove `observable` import from `event.ts` if no longer used
- [x] Remove `onUpdate` subscription from `apps/web/src/server/routers/task.ts` (lines 801-816)
- [x] Remove `observable` import from `task.ts` if no longer used
- **Verify**: `pnpm type-check` passes ✅

## Task 3: Run type checking and tests
- [x] Run `pnpm type-check` — confirm no TypeScript errors ✅
- [x] Run `cd apps/web && pnpm test` — confirm no unit test regressions ✅ (559 passed, 2 skipped)
- [ ] Run E2E tests that were skipped due to this bug — confirm event detail page is accessible
- **Verify**: All tests pass, no regressions

## Task 4: Update spec
- [x] Apply spec delta to `openspec/specs/monorepo-configuration/spec.md` — replace old subscription requirement with polling-based requirement
- **Verify**: `openspec validate fix-trpc-subscription-crash --strict --no-interactive` passes

## Dependencies
- Tasks 1 and 2 are independent (can be done in parallel)
- Task 3 depends on Tasks 1 and 2
- Task 4 can be done at any time
