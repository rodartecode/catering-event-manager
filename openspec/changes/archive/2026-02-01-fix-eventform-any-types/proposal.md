# Proposal: Fix EventForm Any Types

## Why

The `EventForm` component uses `any` types for the success callback parameter and field update value, losing the type safety that tRPC provides. This creates a gap in the end-to-end type safety that the project is designed to maintain.

## What Changes

- Replace `(event: any)` callback type with proper tRPC router output type
- Replace `value: any` in `updateField` with the form data value type
- Verify TypeScript catches type errors correctly after the fix

## Capabilities

### Modified Capabilities
- `EventForm`: Type-safe success callback and field updates

## Impact

- `apps/web/src/components/events/EventForm.tsx`: Fix 2 `any` types
