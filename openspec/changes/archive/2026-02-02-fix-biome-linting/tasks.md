## 1. Biome Config Migration

- [x] 1.1 Run `pnpm biome migrate --write` to update biome.json schema

## 2. Fix Unused Imports

- [x] 2.1 Remove unused `signIn` import from RegisterForm.test.tsx
- [x] 2.2 Remove unused `createEvent`, `createEventStatusLog` imports from event.test.ts
- [x] 2.3 Remove unused `desc`, `isNull`, `or` imports from task.ts

## 3. Fix Unused Variables (underscore prefix)

- [x] 3.1 Rename unused `user` to `_user` in RegisterForm.tsx callback
- [x] 3.2 Rename unused `eventId` to `_eventId` in ResourceAssignmentDialog.tsx
- [x] 3.3 Rename unused `session` to `_session` in task.ts
- [x] 3.4 Rename unused `taskId` to `_taskId` in TaskCard.test.tsx
- [x] 3.5 Remove or use `mutationCallback` in EventStatusUpdateDialog.test.tsx
- [x] 3.6 Remove or use `resourceCount` in TaskCard.test.tsx

## 4. Fix Explicit Any Types

- [x] 4.1 Add eslint-disable comment for DrizzleAdapter cast in auth.ts (external type mismatch)
- [x] 4.2 Type helper function `db` params in task.ts (lines 64, 107)
- [x] 4.3 Type remaining `any` usages in task.ts (lines 500, 754)
- [x] 4.4 Type form handlers in ResourceForm.tsx (lines 30, 88)
- [x] 4.5 Type subscription handler in event.ts (line 231)

## 5. Verification

- [x] 5.1 Run `pnpm format:check` and verify it passes
- [x] 5.2 Run `pnpm lint` and verify zero warnings
- [x] 5.3 Run `pnpm type-check` and verify it still passes
- [ ] 5.4 Commit and push to verify CI passes
