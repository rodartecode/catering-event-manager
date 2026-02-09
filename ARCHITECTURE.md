# Architecture Overview

Core architectural patterns and decisions for the Catering Event Manager.

## System Architecture

**Hybrid Microservices Monorepo**: Next.js handles CRUD/UI, Go handles performance-critical scheduling.

```
┌─────────────────┐     ┌──────────────────┐
│   Next.js 16    │────▶│  Go Fiber v3     │
│   (tRPC v11)    │     │  (Scheduling)    │
│   :3000         │     │  :8080           │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
            ┌─────────────────┐
            │  PostgreSQL 17  │
            │  (Shared Schema)│
            └─────────────────┘
```

**Why Split?** Go scheduler provides 7-11x faster conflict detection than Node.js, critical for <100ms SC-003 requirement.

## Type Safety Chain

```
Frontend ←──tRPC v11──→ Next.js ←──Drizzle ORM──→ PostgreSQL ←──SQLC──→ Go
     (compile-time)         (typed queries)        (shared schema)   (type-safe)
```

Refactoring a database column causes TypeScript AND Go compile errors.

## Domain-Driven Organization

Files organized by **business domain**, NOT technical layers:

```
src/server/routers/
├── event.ts       # Event management
├── task.ts        # Task management
├── resource.ts    # Resource scheduling
├── analytics.ts   # Reporting
├── clients.ts     # Client communication
├── user.ts        # User management
├── portal.ts      # Client portal (read-only)
└── template.ts    # Task templates
```

## Authentication & Authorization

**Next-Auth v5** with session-based auth and role-based access:

| Role | Access Level |
|------|--------------|
| Administrator | Full access (create/edit/delete all) |
| Manager | Read-only + update task status + assign resources |
| Client | Portal access (view own events only) |

```typescript
export const protectedProcedure = t.procedure.use(requireAuth);  // Any authenticated
export const adminProcedure = t.procedure.use(requireAdmin);     // Admin only
```

## Database Patterns

### Soft Delete (Archive)
```typescript
isArchived: boolean('is_archived').default(false).notNull(),
archivedAt: timestamp('archived_at'),
```

### Event Lifecycle States
```
inquiry → planning → preparation → in_progress → completed → follow_up
```

### Resource Conflict Detection
GiST indexes for O(log n) time range overlap queries:
```sql
CREATE INDEX idx_resources_time_range ON resource_schedule
USING GIST (tsrange(start_time, end_time));
```

## Real-Time Updates

Currently uses polling (5-second `refetchInterval`) for near-real-time updates:
- Event status changes visible within seconds
- Task assignment notifications
- Resource conflict alerts

Future: SSE via tRPC subscriptions when Redis Pub/Sub infrastructure is added.

## Performance Targets

| Metric | Target |
|--------|--------|
| Event creation | <5 minutes |
| Status update visibility | <2 seconds |
| Report generation | <10 seconds |
| Resource conflict detection | <100ms |
| Concurrent events | 50+ without degradation |
| Uptime (business hours) | >99.5% |

## Logging

Structured JSON logging via `@/lib/logger`:

```typescript
logger.info('Event created', { eventId, context: 'event.create' });
logger.error('Database failed', error, { context: 'event.list' });
```

**Never use** `console.log/error/warn` in production code.

## Monorepo Structure

```
apps/
├── web/                    # Next.js 16 application
└── scheduling-service/     # Go Fiber v3 service

packages/
├── database/              # Drizzle ORM schemas (shared)
├── types/                 # Shared TypeScript types
└── config/                # Shared configurations
```

## Constitution Principles

1. **Technology Excellence**: Latest stable versions, modern patterns
2. **Modular Architecture**: Domain organization, clear boundaries
3. **Test-First Development**: >80% coverage, contract tests
4. **API-First Design**: tRPC contracts before implementation
5. **Observability**: Structured logging, health checks, metrics
6. **Continuous Learning**: Document decisions, share knowledge

For detailed decisions, see `docs/decisions/` (Architecture Decision Records).
