# CLAUDE.md - Types Package

**Shared TypeScript types and Zod validation schemas** for the catering event manager monorepo.

## Package Purpose

This package provides **type safety and validation consistency** across all services:
- **Shared Zod schemas**: Input validation for tRPC procedures
- **Common type definitions**: Domain objects, API contracts, utility types
- **Type safety boundary**: Ensures consistent data structures between Next.js and Go services

## Current Status

⚠️ **Package is minimal** - Currently contains only placeholder files. Most validation schemas are defined inline within tRPC routers (`apps/web/src/server/routers/`).

**Planned migration**: Extract duplicate Zod schemas from routers into shared, reusable definitions here.

## Zod Schema Patterns

### Schema Naming Conventions

```typescript
// Input schemas for tRPC procedures
export const createEventInput = z.object({...});
export const listEventsInput = z.object({...});
export const updateEventInput = z.object({...});

// Domain object schemas
export const eventSchema = z.object({...});
export const taskSchema = z.object({...});
export const resourceSchema = z.object({...});

// Enum schemas (match database pgEnum definitions)
export const eventStatusEnum = z.enum(['inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up']);
export const taskStatusEnum = z.enum(['pending', 'in_progress', 'completed']);
export const resourceTypeEnum = z.enum(['staff', 'equipment', 'materials']);
```

### Schema Organization Structure

```typescript
// src/schemas/
├── events.ts          # Event-related validation schemas
├── tasks.ts           # Task management schemas
├── resources.ts       # Resource scheduling schemas
├── clients.ts         # Client management schemas
├── common.ts          # Shared utility schemas (pagination, date ranges)
└── index.ts           # Re-export all schemas
```

### Common Schema Patterns

```typescript
// Pagination input pattern (reusable)
export const paginationInput = z.object({
  limit: z.number().min(1).max(100).default(50),
  cursor: z.number().optional(),
});

// Date range input pattern
export const dateRangeInput = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

// ID parameter pattern
export const idParam = z.object({
  id: z.number().positive(),
});

// Optional update pattern
export const createEventInput = z.object({
  eventName: z.string().trim().min(1).max(255),
  eventDate: z.coerce.date(),
  // ... required fields
});

export const updateEventInput = createEventInput.partial().extend({
  id: z.number().positive(), // Always required for updates
});
```

## Type Exports Strategy

### Database vs API Types

```typescript
// Import from database package for source of truth
import { events } from '@catering-event-manager/database/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// Generate base types from database schema
export type Event = InferSelectModel<typeof events>;
export type NewEvent = InferInsertModel<typeof events>;

// API response types (may include computed fields)
export type EventWithClient = Event & {
  client: {
    name: string;
    contactEmail: string;
  };
};

export type EventListItem = Pick<Event, 'id' | 'eventName' | 'eventDate' | 'status'> & {
  clientName: string;
  taskCount: number;
};
```

### Type Safety Across Services

```typescript
// Define interfaces that both TypeScript and Go services can understand
export interface SchedulingRequest {
  resourceId: number;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  eventId: number;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictingAssignments?: Array<{
    resourceId: number;
    eventId: number;
    startTime: string;
    endTime: string;
  }>;
}
```

## Validation Strategies

### tRPC Integration Pattern

```typescript
// In router files (apps/web/src/server/routers/*.ts)
import { createEventInput, updateEventInput } from '@catering-event-manager/types';

export const eventRouter = router({
  create: adminProcedure
    .input(createEventInput)  // Imported shared schema
    .mutation(async ({ input, ctx }) => {
      // input is fully typed based on Zod schema
    }),

  update: adminProcedure
    .input(updateEventInput)  // Imported shared schema
    .mutation(async ({ input, ctx }) => {
      // Type-safe operations
    }),
});
```

### Error Handling Pattern

```typescript
// Validation error formatting utility
import { z } from 'zod';

export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  error.issues.forEach((issue) => {
    if (issue.path[0]) {
      fieldErrors[issue.path[0] as string] = issue.message;
    }
  });
  return fieldErrors;
}

// Custom validation error class
export class ValidationError extends Error {
  constructor(
    message: string,
    public fieldErrors: Record<string, string>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### Form Validation Pattern

```typescript
// Client-side form validation (React Hook Form integration)
import { zodResolver } from '@hookform/resolvers/zod';
import { createEventInput } from '@catering-event-manager/types';

export function EventForm() {
  const form = useForm({
    resolver: zodResolver(createEventInput),
    defaultValues: {
      eventName: '',
      eventDate: new Date(),
      // ...
    },
  });

  // Form is type-safe and validated
}
```

## Development Workflow

### Adding New Shared Types

```bash
# 1. Create/update schema file
cd packages/types/src/schemas/
# Edit relevant schema file (events.ts, tasks.ts, etc.)

# 2. Update index export
# Add to src/index.ts

# 3. Build and verify types
cd packages/types
pnpm build

# 4. Update consumers
cd ../../apps/web
# Remove duplicate inline schemas from routers
# Import from @catering-event-manager/types instead

# 5. Verify type checking
pnpm type-check
```

### Schema Evolution Guidelines

```typescript
// ✅ Safe changes (backwards compatible)
export const eventInput = z.object({
  eventName: z.string(),
  eventDate: z.coerce.date(),
  newOptionalField: z.string().optional(), // Safe to add
});

// ❌ Breaking changes (avoid or version carefully)
export const eventInput = z.object({
  eventName: z.number(), // Changed type - BREAKING
  // eventDate: removed field - BREAKING
  newRequiredField: z.string(), // Required field - BREAKING
});

// ✅ Versioning approach for breaking changes
export const eventInputV1 = z.object({...}); // Keep old version
export const eventInputV2 = z.object({...}); // New version
export const eventInput = eventInputV2;      // Current version alias
```

### Testing Validation Schemas

```typescript
// Test files: src/schemas/*.test.ts
import { describe, test, expect } from 'vitest';
import { createEventInput } from './events';

describe('createEventInput', () => {
  test('accepts valid event data', () => {
    const validData = {
      eventName: 'Wedding Reception',
      eventDate: '2026-06-15',
      clientId: 1,
    };

    expect(() => createEventInput.parse(validData)).not.toThrow();
  });

  test('rejects invalid event data', () => {
    const invalidData = {
      eventName: '',  // Empty string should fail
      eventDate: 'not-a-date',
      clientId: -1,   // Negative ID should fail
    };

    expect(() => createEventInput.parse(invalidData)).toThrow();
  });
});
```

## Commands

```bash
# Build types package
cd packages/types && pnpm build

# Run type checks
cd packages/types && pnpm type-check

# Run tests
cd packages/types && pnpm test

# Run tests in watch mode
cd packages/types && pnpm test:watch
```

## Migration Priority

**Current duplicate schemas to extract** (from `apps/web/src/server/routers/`):

1. **Event schemas**: `eventStatusEnum`, `createEventInput`, `updateEventInput`, `listEventsInput`
2. **Task schemas**: `taskStatusEnum`, `taskCategoryEnum`, `createTaskInput`, `updateTaskInput`
3. **Resource schemas**: `resourceTypeEnum`, `createResourceInput`, `checkConflictsInput`
4. **Common patterns**: `paginationInput`, `dateRangeInput`, ID validation patterns

**Benefits after migration**:
- **Reduced duplication**: Single source of truth for validation logic
- **Better consistency**: Same validation rules across all endpoints
- **Easier testing**: Schemas can be unit tested independently
- **Go service alignment**: Shared type definitions between TypeScript and Go