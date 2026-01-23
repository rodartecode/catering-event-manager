# Tasks: Fix Monorepo Configuration Issues

## Phase 1: Package Configuration

- [x] **T200**: Add exports field to `packages/database/package.json` with subpath exports for `/schema` and `/client`
- [x] **T201**: Update `apps/web/tsconfig.json` to remove broken `extends` reference and inline necessary settings
- [x] **T202**: Verify database imports resolve correctly after package.json changes

## Phase 2: Type Augmentation

- [x] **T203**: Create `apps/web/src/types/next-auth.d.ts` with User type augmentation adding `id` and `role` properties
- [x] **T204**: Add Session type augmentation with extended user properties
- [x] **T205**: Verify `session.user.role` and `user.role` no longer cause type errors

## Phase 3: tRPC Fixes

- [x] **T206**: Update `apps/web/src/app/(dashboard)/events/[id]/page.tsx` to use tRPC v11 `useSubscription` hook instead of `.subscribe()`
- [x] **T207**: Add explicit type for subscription data callback parameter
- [x] **T208**: Fix `apps/web/src/app/api/trpc/[trpc]/route.ts` createContext type mismatch by using proper FetchCreateContextFnOptions

## Phase 4: Router & Type Fixes

- [x] **T209**: Create minimal `apps/web/src/server/routers/clients.ts` router with list query (renamed from `client.ts` to avoid tRPC reserved name collision)
- [x] **T210**: Register clients router in `_app.ts`
- [x] **T211**: Update `apps/web/src/components/events/EventForm.tsx` to use proper clients router reference
- [x] **T212**: Fix changedBy/createdBy/archivedBy type errors by converting `session.user.id` (string) to number

## Phase 5: Verification

- [x] **T213**: Run `pnpm type-check` and verify 0 TypeScript errors
- [x] **T214**: Run `pnpm lint` and verify no new lint errors introduced
- [x] **T215**: Run `pnpm dev` and verify application starts without errors

## Dependencies

- T200 must complete before T202
- T203, T204 must complete before T205
- T206, T207, T208 can run in parallel
- T209, T210 must complete before T211
- All tasks T200-T212 must complete before T213

## Additional Fixes Applied

During implementation, additional issues were discovered and fixed:

1. **Workspace dependency**: Added `@catering-event-manager/database` as a workspace dependency in `apps/web/package.json`
2. **Router name collision**: Renamed `client` router to `clients` to avoid tRPC reserved name collision
3. **ID type mismatches**: Converted `session.user.id` (string from NextAuth) to number using `parseInt()` in multiple routers
4. **Adapter version conflict**: Cast `DrizzleAdapter(db)` to `any` to resolve @auth/core version mismatch
5. **Analytics query builder**: Fixed `.where()` chaining issue in `analytics.ts` by building conditions upfront
6. **Lint fixes**: Fixed unescaped entities in EventForm.tsx and EventStatusTimeline.tsx
7. **ESLint config**: Created `.eslintrc.json` to enable linting without interactive prompt
