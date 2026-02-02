# Tasks: Fix EventForm Any Types

## 1. Add RouterOutput type export

- [x] 1.1 Verify `RouterOutput` is exported from `@/lib/trpc` (or add export if missing)

## 2. Fix EventForm types

- [x] 2.1 Import `RouterOutput` type in EventForm.tsx
- [x] 2.2 Replace `any` in `onSuccess` callback with `RouterOutput['event']['create']`
- [x] 2.3 Replace `any` in `updateField` with `EventFormData[keyof EventFormData]`

## 3. Verify

- [x] 3.1 Run `pnpm type-check` to confirm no TypeScript errors
- [x] 3.2 Verify the component still works correctly
