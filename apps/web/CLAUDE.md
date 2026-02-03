# CLAUDE.md - Next.js Web Application

Next.js 16 + React 19 full-stack application with tRPC v11 API, Next-Auth v5 authentication.

→ **Commands**: See `/COMMANDS.md` for all development and testing commands
→ **Environment**: See `/ENV.md` for required environment variables
→ **Troubleshooting**: See `/TROUBLESHOOTING.md` for common issues
→ **Architecture**: See `/ARCHITECTURE.md` for system design

## Quick Context

**Tech Stack**: Next.js 16, React 19, tRPC v11, Next-Auth v5, Tailwind CSS 4
**Testing**: Vitest + Playwright + TestContainers + Quality Gates

## Directory Structure

```
src/
├── server/routers/           # tRPC API (→ src/server/CLAUDE.md)
│   ├── _app.ts              # Root router
│   ├── event.ts             # Event management (✅ implemented)
│   ├── task.ts              # Task management
│   ├── resource.ts          # Resource scheduling
│   ├── analytics.ts         # Reporting
│   └── clients.ts           # Client management
│
├── components/              # Domain-organized UI
│   ├── events/             # Event components
│   ├── tasks/              # Task components
│   ├── dashboard/          # Layout components
│   └── auth/               # Auth forms
│
├── app/                    # App Router pages
│   ├── (dashboard)/        # Protected routes
│   ├── portal/             # Client portal
│   └── api/                # API routes
│
└── lib/                    # Utilities
    ├── trpc.ts             # tRPC client
    ├── auth.ts             # Next-Auth config
    └── logger.ts           # Structured logging
```

## tRPC Router Patterns

### Protected Procedures
```typescript
export const protectedProcedure = t.procedure.use(requireAuth);  // Any authenticated
export const adminProcedure = t.procedure.use(requireAdmin);     // Admin only
```

### Router Structure
```typescript
export const eventRouter = router({
  create: adminProcedure.input(schema).mutation(/* ... */),
  list: protectedProcedure.input(schema).query(/* ... */),
});
```

### Error Handling
```typescript
import { TRPCError } from '@trpc/server';
import { logger } from '@/lib/logger';

if (!event) {
  throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
}

logger.error('Failed to get event', error, { context: 'event.getById' });
```

## Structured Logging

**Use `@/lib/logger`**, never `console.*` in production:

```typescript
logger.info('Event created', { eventId, context: 'event.create' });
logger.error('Database failed', error, { context: 'event.list' });
```

## Component Patterns

### Accessibility-First
WCAG 2.1 AA compliance enforced by quality gates:
```typescript
import { getInputA11yProps, getErrorProps } from '@/lib/form-a11y';
```

### Co-located Tests
Tests live next to components: `Component.tsx` + `Component.test.tsx`

### Domain Exports
```typescript
// src/components/events/index.ts
export { EventCard, EventForm, EventStatusBadge } from './EventCard';
```

## Authentication

### Role-Based Access
```typescript
// src/lib/use-auth.ts
const { session, isUnauthorized } = useRequireAuth('administrator');
```

### Route Protection
- Dashboard routes: admin or manager required
- Portal routes: client role required
- Public: `/login`, `/register`, `/api/health`

## Testing Infrastructure

### Test Organization
```
test/
├── helpers/               # db.ts, trpc.ts, factories.ts
├── scenarios/            # Business logic tests
├── integration/          # Cross-service tests
├── e2e/                  # Playwright tests
│   └── quality-gates/   # Visual/a11y/performance
└── auth-matrix.test.ts  # Authorization matrix (~97 cases)
```

### Test Callers
```typescript
const caller = createAdminCaller(db);
const result = await caller.event.create({ ... });
```

### Quality Gates
Visual regression + accessibility + performance for key pages:
- **Visual**: <1% pixel difference
- **Accessibility**: WCAG 2.1 AA (axe-core)
- **Performance**: LCP < 3s, CLS < 0.15

## Development Workflows

### Adding tRPC Procedures
1. Define Zod schema for input
2. Implement procedure in domain router
3. Write router tests with auth matrix coverage
4. Add to UI with tRPC React Query hooks

### Adding Components
1. Create in domain directory (`src/components/domain/`)
2. Write tests with accessibility checks
3. Add to domain index for clean imports
4. Integrate with pages

### Schema Changes
After modifying `packages/database`:
```bash
cd packages/database && pnpm db:generate
cd ../../apps/scheduling-service && sqlc generate
pnpm type-check
```

## Related Documentation

- **Project Root**: `../../CLAUDE.md`
- **Server Patterns**: `src/server/CLAUDE.md`
- **Database Schema**: `../../packages/database/CLAUDE.md`
- **Go Service**: `../../apps/scheduling-service/CLAUDE.md`
- **Implementation Guides**: `../../docs/implementation-guides/`
