# Design: Fix EventForm Any Types

## Context

The project uses tRPC v11 which provides end-to-end type safety between server and client. The `EventForm` component creates events via `trpc.event.create.useMutation()`, but the success callback uses `any` instead of leveraging tRPC's inferred types.

## Goals / Non-Goals

**Goals:**
- Use tRPC's `RouterOutput` type for the success callback parameter
- Use proper union type for `updateField` value parameter
- Maintain full backward compatibility with existing code

**Non-Goals:**
- Refactoring unrelated parts of EventForm
- Adding new functionality

## Decisions

### Decision 1: Use RouterOutput for callback type

Import `RouterOutput` from the tRPC client and use `RouterOutput['event']['create']` to get the exact return type of the create mutation. This ensures the type stays in sync if the server-side procedure changes.

```typescript
import type { RouterOutput } from '@/lib/trpc';

interface EventFormProps {
  onSuccess: (event: RouterOutput['event']['create']) => void;
  onCancel: () => void;
}
```

### Decision 2: Use EventFormData value type for updateField

The `updateField` function updates any field in `EventFormData`. The value type should be `EventFormData[keyof EventFormData]` to capture all possible field value types.

```typescript
const updateField = (
  field: keyof EventFormData,
  value: EventFormData[keyof EventFormData]
) => { ... };
```
