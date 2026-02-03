# CLAUDE.md - tRPC Server Layer

tRPC v11 API layer with domain-organized routers and Next-Auth v5 integration.

## Directory Structure

```
server/
├── routers/           # Domain-organized API routes
│   ├── _app.ts       # Root router combining all domains
│   ├── event.ts      # Event management (✅ implemented)
│   ├── task.ts       # Task management
│   ├── resource.ts   # Resource scheduling
│   ├── analytics.ts  # Analytics & reporting
│   ├── clients.ts    # Client management
│   ├── user.ts       # User management
│   └── portal.ts     # Client portal (read-only)
├── services/         # Business logic services
├── trpc.ts          # tRPC initialization + context
├── auth.ts          # Next-Auth v5 configuration
└── auth.test.ts     # Auth configuration tests
```

## Authorization Levels

```typescript
// trpc.ts - Protected procedure types
export const publicProcedure = t.procedure;                    // No auth required
export const protectedProcedure = t.procedure.use(requireAuth); // Any authenticated
export const adminProcedure = t.procedure.use(requireAdmin);    // Admin only
export const clientProcedure = t.procedure.use(requireClient);  // Client portal
```

## Router Implementation Pattern

```typescript
// routers/[domain].ts
import { router, adminProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';

const inputSchema = z.object({
  // Zod validation
});

export const domainRouter = router({
  // Admin-only mutations
  create: adminProcedure
    .input(inputSchema)
    .mutation(async ({ ctx, input }) => {
      // ctx.db - Drizzle database client
      // ctx.session - Next-Auth session
      // input - Validated input
    }),

  // Protected queries
  list: protectedProcedure
    .input(listSchema)
    .query(async ({ ctx, input }) => {
      // Implementation
    }),

  // Real-time subscriptions
  updates: protectedProcedure
    .subscription(() => {
      // SSE implementation
    }),
});
```

## Error Handling

```typescript
import { TRPCError } from '@trpc/server';
import { logger } from '@/lib/logger';

// NOT_FOUND for missing resources
if (!entity) {
  throw new TRPCError({ code: 'NOT_FOUND', message: 'Entity not found' });
}

// FORBIDDEN for auth failures
if (!canAccess) {
  throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
}

// Always log errors
logger.error('Operation failed', error, { context: 'domain.operation' });
```

## Testing Patterns

Tests co-located: `routers/event.ts` + `routers/event.test.ts`

```typescript
import { createAdminCaller, createManagerCaller } from '@/test/helpers/trpc';

describe('domainRouter', () => {
  it('creates when admin authenticated', async () => {
    const caller = createAdminCaller(db);
    const result = await caller.domain.create(input);
    expect(result).toBeDefined();
  });

  it('rejects when unauthorized', async () => {
    const caller = createManagerCaller(db);
    await expect(caller.domain.create(input)).rejects.toMatchObject({
      code: 'FORBIDDEN'
    });
  });
});
```

## Context Object

```typescript
// Available in all procedures via ctx
interface Context {
  db: DrizzleClient;           // Database connection
  session: Session | null;     // Next-Auth session
  headers: Headers;            // Request headers
}
```

## Adding New Routers

1. Create `routers/[domain].ts` with router definition
2. Add to `routers/_app.ts`:
   ```typescript
   import { domainRouter } from './domain';
   export const appRouter = router({
     // ... existing
     domain: domainRouter,
   });
   ```
3. Write tests in `routers/[domain].test.ts`
4. Add auth matrix coverage in `test/auth-matrix.test.ts`

## Related Documentation

- **App Context**: `../../CLAUDE.md`
- **Database Schema**: `../../../../packages/database/CLAUDE.md`
- **Test Helpers**: `../../../test/helpers/`
