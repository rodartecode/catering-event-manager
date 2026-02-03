# CLAUDE.md - Types Package

Shared TypeScript types and Zod validation schemas across the monorepo.

## Current Status

**Minimal package** - Validation schemas currently co-located with tRPC routers in `apps/web/src/server/routers/`.

## Why Schemas Live in Routers

```typescript
// apps/web/src/server/routers/event.ts
const createEventInput = z.object({
  clientId: z.number().positive(),
  eventName: z.string().trim().min(1).max(255),
  eventDate: z.coerce.date(),
});
```

**Benefits**:
- Schemas close to usage
- Easy to see procedure inputs
- No import indirection

## When to Extract to This Package

Extract schemas here when:
- Same validation appears in **3+ places**
- Client-side forms need to share validation with tRPC
- Go service needs compatible type definitions

**Candidates for extraction**:
- `paginationInput` - Reused in list procedures
- `dateRangeInput` - Reused in analytics/reporting
- Enum schemas matching database `pgEnum` definitions

## Shared Type Patterns

### Inferred Types from Zod
```typescript
// Define schema
export const eventStatusSchema = z.enum([
  'inquiry', 'planning', 'preparation',
  'in_progress', 'completed', 'follow_up'
]);

// Infer TypeScript type
export type EventStatus = z.infer<typeof eventStatusSchema>;
```

### Pagination Schema
```typescript
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  cursor: z.string().optional(),
});
```

### Date Range Schema
```typescript
export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(
  data => data.endDate > data.startDate,
  { message: 'End date must be after start date' }
);
```

## Commands

```bash
cd packages/types

pnpm build       # Build types package
pnpm type-check  # TypeScript checking
```

## Related Files

- **tRPC Routers**: `apps/web/src/server/routers/` (where schemas currently live)
- **Database Schema**: `packages/database/src/schema/` (Drizzle ORM types)
- **Config Package**: `packages/config/` (shared configuration)
