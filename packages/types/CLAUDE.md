# CLAUDE.md - Types Package

**Placeholder for shared TypeScript types** across the catering event manager monorepo.

## Current Status

This package is **minimal** - contains only placeholder files. All Zod validation schemas are currently defined inline within tRPC routers (`apps/web/src/server/routers/`).

```
packages/types/
└── src/
    └── index.ts    # Empty placeholder export
```

## Why Schemas Live in Routers

Currently, validation schemas are co-located with tRPC procedures:

```typescript
// apps/web/src/server/routers/event.ts
const createEventInput = z.object({
  clientId: z.number().positive(),
  eventName: z.string().trim().min(1).max(255),
  eventDate: z.coerce.date(),
  // ...
});

export const eventRouter = router({
  create: adminProcedure
    .input(createEventInput)
    .mutation(/* ... */),
});
```

**Benefits of current approach**:
- Schemas are close to their usage
- Easy to see what each procedure accepts
- No import indirection

## Future Consideration: Schema Extraction

If schemas become duplicated or need to be shared across multiple services, consider extracting common patterns here:

**Potential candidates for extraction**:
- `paginationInput` - Reused in list procedures
- `dateRangeInput` - Reused in analytics/reporting
- Enum schemas matching database `pgEnum` definitions

**When to extract**:
- When the same validation logic appears in 3+ places
- When client-side forms need to share validation with tRPC
- When Go service needs compatible type definitions

## Commands

```bash
# Build types package (currently no-op)
cd packages/types && pnpm build

# Type check
cd packages/types && pnpm type-check
```

## Related Files

- **tRPC routers**: `apps/web/src/server/routers/` - Where schemas currently live
- **Database schema**: `packages/database/src/schema/` - Drizzle ORM types
- **Config package**: `packages/config/` - Shared configuration (not types)
