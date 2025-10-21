# Technology Research: Catering Event Lifecycle Management

**Feature**: 001-event-lifecycle-management
**Date**: 2025-10-19
**Phase**: 0 (Research & Decision Documentation)

## Purpose

This document captures technology research, decisions, rationales, and alternatives considered for the hybrid Next.js + Go architecture. All decisions align with the Technology Excellence principle (Constitution Principle I).

---

## R1: Monorepo Structure (pnpm + Turborepo)

**Decision**: Use pnpm workspaces with Turborepo for monorepo management

**Rationale**:
- **pnpm**: Fastest package manager (3x faster than npm), efficient disk usage via hard links, strict node_modules structure prevents phantom dependencies
- **Turborepo**: Industry-standard build orchestration, intelligent caching, parallel task execution across workspaces
- **Developer Experience**: Single `pnpm install` for entire project, atomic cross-package changes, unified tooling

**Implementation**:
```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Alternatives Considered**:
- **npm workspaces**: Slower, larger node_modules
- **Yarn**: Slightly slower than pnpm, less strict dependency resolution
- **Lerna**: Deprecated in favor of native workspaces + Turborepo
- **Nx**: More complex, overkill for 2-service monorepo

**References**:
- pnpm benchmarks: https://pnpm.io/benchmarks
- Turborepo docs: https://turbo.build/repo/docs

---

## R2: tRPC v11 with Next.js 15 App Router

**Decision**: Use tRPC v11 for end-to-end type-safe RPC between frontend and backend

**Rationale**:
- **Zero API Boilerplate**: No REST endpoints to write, maintain, or document
- **Type Safety**: Shared types between client/server, compile-time errors for API changes
- **React Server Components**: tRPC v11 supports Next.js 15 App Router with RSC
- **Real-time Ready**: Built-in WebSocket/SSE subscriptions for live updates (SC-004 requirement)
- **Developer Experience**: Autocomplete for all procedures, no manual type synchronization

**Implementation Pattern**:
```typescript
// apps/web/src/server/routers/event.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const eventRouter = router({
  create: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      eventDate: z.date(),
      location: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Type-safe database access via Drizzle
      return await ctx.db.insert(events).values(input);
    }),

  onStatusChange: protectedProcedure
    .subscription(async function* ({ ctx }) {
      // Real-time updates via Server-Sent Events
      yield* ctx.eventStream;
    }),
});
```

**Server-Sent Events vs WebSockets**:
- **Chosen**: Server-Sent Events (SSE) for real-time updates
- **Why**: Simpler setup, unidirectional (server→client) matches our needs, auto-reconnect, HTTP/2 multiplexing
- **When to use WebSockets**: Bidirectional chat-style communication (not needed for P1-P5)

**Alternatives Considered**:
- **REST + OpenAPI**: Manual type generation, slower development, no real-time built-in
- **GraphQL**: Over-fetching/under-fetching solved but adds complexity, no native real-time
- **Server Actions only**: Limited to mutations, no subscriptions, less flexible

**References**:
- tRPC v11 docs: https://trpc.io/docs/server/procedures
- SSE guide: https://trpc.io/docs/server/subscriptions

---

## R3: Drizzle ORM for PostgreSQL

**Decision**: Use Drizzle ORM 0.36+ for type-safe database access in Next.js app

**Rationale**:
- **Lightest ORM**: 7.4kb (vs Prisma ~15kb), zero runtime overhead
- **SQL-like Syntax**: Close to raw SQL, easy migration from SQLC knowledge
- **Type Safety**: Full TypeScript inference from schema, compile-time query validation
- **Migration System**: Built-in migrations with rollback support
- **Performance**: Fastest TypeScript ORM in 2025 benchmarks

**Schema Pattern**:
```typescript
// packages/database/src/schema/events.ts
import { pgTable, serial, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const eventStatusEnum = pgEnum('event_status', [
  'inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up'
]);

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  clientId: serial('client_id').references(() => clients.id),
  eventDate: timestamp('event_date').notNull(),
  location: varchar('location', { length: 255 }),
  status: eventStatusEnum('status').default('inquiry').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Migration Strategy**:
```bash
# Generate migration
pnpm db:generate

# Apply migration
pnpm db:migrate

# Rollback
pnpm db:rollback
```

**Alternatives Considered**:
- **Prisma**: Heavier, separate schema file, slower startup, stronger ecosystem
- **TypeORM**: Legacy patterns, decorator-based, slower than Drizzle
- **Kysely**: Query builder only (no schema management), more manual

**References**:
- Drizzle vs Prisma: https://www.bytebase.com/blog/drizzle-vs-prisma/
- Drizzle migrations: https://orm.drizzle.team/docs/migrations

---

## R4: Go Fiber v3 + SQLC for Scheduling Service

**Decision**: Use Fiber v3 (Go HTTP framework) + SQLC (type-safe SQL→Go) for scheduling microservice

**Rationale**:
- **Performance**: Fiber processes 5k requests <1 second (7-11x faster than Node.js)
- **Concurrency**: Go goroutines perfect for parallel conflict detection across 50+ events
- **Type Safety**: SQLC generates type-safe Go from SQL queries (zero runtime reflection)
- **Simple API**: HTTP endpoints called by Next.js, no gRPC complexity needed for MVP

**SQLC Pattern**:
```sql
-- apps/scheduling-service/internal/repository/queries.sql
-- name: CheckResourceConflict :many
SELECT r.id, r.resource_name, t.event_id, t.start_time, t.end_time
FROM resources r
JOIN task_resources tr ON r.id = tr.resource_id
JOIN tasks t ON tr.task_id = t.id
WHERE r.id = $1
  AND t.start_time < $2
  AND t.end_time > $3
  AND t.status != 'completed';
```

Generated Go:
```go
// queries.sql.go (auto-generated by SQLC)
type CheckResourceConflictRow struct {
    ID           int32
    ResourceName string
    EventID      int32
    StartTime    time.Time
    EndTime      time.Time
}

func (q *Queries) CheckResourceConflict(ctx context.Context, arg CheckResourceConflictParams) ([]CheckResourceConflictRow, error)
```

**Fiber Handler**:
```go
// apps/scheduling-service/internal/api/handlers.go
func (h *Handler) CheckConflicts(c *fiber.Ctx) error {
    var req ConflictRequest
    if err := c.BodyParser(&req); err != nil {
        return fiber.NewError(fiber.StatusBadRequest, err.Error())
    }

    conflicts, err := h.queries.CheckResourceConflict(c.Context(), db.CheckResourceConflictParams{
        ResourceID: req.ResourceID,
        StartTime:  req.StartTime,
        EndTime:    req.EndTime,
    })

    return c.JSON(conflicts)
}
```

**Alternatives Considered**:
- **Gin**: Slightly slower than Fiber, less Express-like API
- **Echo**: Similar performance, smaller community
- **Chi**: Router-only, need more boilerplate
- **GORM (ORM)**: Runtime reflection overhead, slower than SQLC

**References**:
- Fiber benchmarks: https://docs.gofiber.io/extra/benchmarks/
- SQLC docs: https://docs.sqlc.dev/en/latest/

---

## R5: Next-Auth v5 for Authentication

**Decision**: Use Next-Auth v5 (Auth.js) for session-based authentication

**Rationale**:
- **Next.js Native**: Official auth solution for Next.js 15, RSC support
- **Role-Based Access**: Built-in role/permission handling (admin vs manager per FR-028)
- **Session Management**: Secure session cookies, no JWT complexity needed for MVP
- **Database Sessions**: Store sessions in PostgreSQL for audit trail (FR-030)

**Configuration**:
```typescript
// apps/web/src/server/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/server/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      authorize: async (credentials) => {
        // Validate against users table
        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email),
        });

        if (!user || !await verifyPassword(credentials.password, user.passwordHash)) {
          return null;
        }

        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    session({ session, token }) {
      session.user.role = token.role;
      return session;
    },
  },
});
```

**Role Enforcement**:
```typescript
// apps/web/src/server/trpc.ts
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== 'administrator') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});
```

**Alternatives Considered**:
- **Clerk**: SaaS dependency, overkill for single-company MVP
- **Custom JWT**: More work, session management simpler for internal app
- **OAuth only**: Not needed until client portal (FR-031, out of scope)

**References**:
- Next-Auth v5 docs: https://authjs.dev/getting-started/installation

---

## R6: Docker Compose Multi-Service Setup

**Decision**: Use Docker Compose for local development and MVP deployment

**Rationale**:
- **Single Command**: `docker-compose up` starts PostgreSQL + Next.js + Go service
- **Environment Parity**: Dev/staging/prod use same containers
- **Service Dependencies**: Automatic service dependency management
- **Kubernetes-Ready**: Same Dockerfiles work for K8s when needed

**docker-compose.yml**:
```yaml
version: '3.9'

services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: catering_events
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://admin:${DB_PASSWORD}@postgres:5432/catering_events
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      SCHEDULING_SERVICE_URL: http://scheduler:8080
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./apps/web:/app
      - /app/node_modules

  scheduler:
    build:
      context: .
      dockerfile: apps/scheduling-service/Dockerfile
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgresql://admin:${DB_PASSWORD}@postgres:5432/catering_events
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

**Development Workflow**:
```bash
# Start all services
docker-compose up

# Run migrations
docker-compose exec web pnpm db:migrate

# Run tests
docker-compose exec web pnpm test
```

**Alternatives Considered**:
- **Kubernetes from day 1**: Over-engineering for MVP, adds complexity
- **Separate databases**: Unnecessary for single-company MVP, harder to manage
- **Manual service management**: Error-prone, inconsistent environments

**References**:
- Docker Compose docs: https://docs.docker.com/compose/

---

## R7: Real-Time Updates (tRPC Subscriptions + SSE)

**Decision**: Use tRPC subscriptions with Server-Sent Events for real-time updates

**Rationale**:
- **Type Safety**: Subscriptions are type-safe like all tRPC procedures
- **Simpler than WebSockets**: Unidirectional updates (server→client) match requirements
- **Auto-Reconnect**: Built-in reconnection logic
- **HTTP/2 Multiplexing**: Multiple subscriptions over single connection

**Implementation**:
```typescript
// apps/web/src/server/routers/event.ts
import { observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';

const eventEmitter = new EventEmitter();

export const eventRouter = router({
  onStatusChange: protectedProcedure
    .input(z.object({ eventId: z.number().optional() }))
    .subscription(({ input }) => {
      return observable<EventUpdate>((emit) => {
        const handler = (data: EventUpdate) => {
          if (!input.eventId || data.eventId === input.eventId) {
            emit.next(data);
          }
        };

        eventEmitter.on('status-change', handler);

        return () => {
          eventEmitter.off('status-change', handler);
        };
      });
    }),
});

// Emit updates after mutation
updateStatus: protectedProcedure
  .mutation(async ({ ctx, input }) => {
    const updated = await ctx.db.update(events)...;
    eventEmitter.emit('status-change', updated);
    return updated;
  }),
```

**Client Usage**:
```typescript
// apps/web/src/app/(dashboard)/events/[id]/page.tsx
'use client';

export function EventDetail({ eventId }: { eventId: number }) {
  trpc.event.onStatusChange.useSubscription(
    { eventId },
    {
      onData(update) {
        // Auto-update UI when status changes
        queryClient.setQueryData(['event', eventId], update);
      },
    }
  );
}
```

**Performance**: Meets SC-004 (2-second update requirement) via instant server→client push.

**Alternatives Considered**:
- **Polling**: Wasteful, higher latency, doesn't meet SC-004
- **WebSockets**: Bidirectional complexity not needed, harder to scale
- **Long polling**: Outdated, SSE is better

**References**:
- tRPC subscriptions: https://trpc.io/docs/subscriptions

---

## R8: TypeScript/Go Type Sharing Strategy

**Decision**: Manual type mapping between TypeScript (Drizzle) and Go (SQLC) with shared PostgreSQL schema

**Rationale**:
- **Single Source of Truth**: PostgreSQL schema defines structure
- **Each Service Uses Native Tools**: Drizzle for TS, SQLC for Go (no JSON schema translation)
- **Type Safety Maintained**: Compile-time checks in both languages
- **Simplified Workflow**: No code generation between languages

**Pattern**:
```typescript
// packages/database/src/schema/resources.ts (Drizzle)
export const resources = pgTable('resources', {
  id: serial('id').primaryKey(),
  resourceName: varchar('resource_name', { length: 255 }),
  resourceType: pgEnum('resource_type', ['staff', 'equipment', 'materials']),
});
```

```sql
-- apps/scheduling-service/internal/repository/queries.sql (SQLC)
-- name: GetResource :one
SELECT id, resource_name, resource_type
FROM resources
WHERE id = $1;
```

**HTTP API Contract**:
- Go service exposes RESTful JSON API
- Next.js calls via typed HTTP client
- OpenAPI spec documents contract (generated in Phase 1)

**Alternatives Considered**:
- **Protocol Buffers/gRPC**: Overkill for 2-service MVP, HTTP is simpler
- **JSON Schema Generation**: Additional tooling complexity, manual sync is fine for MVP
- **Shared TypeScript→Go code gen**: Brittle, breaks type safety guarantees

**References**:
- SQLC type mappings: https://docs.sqlc.dev/en/latest/howto/named_parameters.html

---

## R9: Testing Strategy

**Decision**: Multi-layer testing with Vitest (unit), Playwright (E2E), Go testing (scheduler logic)

**Rationale**:
- **Vitest**: Fastest TypeScript test runner, ESM native, Vite integration
- **Playwright**: Cross-browser E2E, component testing, visual regression
- **Go testing**: Standard library, fast parallel execution

**Test Pyramid**:
1. **Unit Tests** (70%): tRPC procedures, React components, Go scheduler algorithms
2. **Integration Tests** (20%): Database transactions, cross-service calls
3. **E2E Tests** (10%): Full user journeys (Playwright)

**Coverage Targets**:
- Overall: >80% (Constitution requirement)
- Scheduling algorithms: 100% (critical path)
- tRPC procedures: >90% (business logic)

**CI/CD Pipeline**:
```yaml
# .github/workflows/test.yml
jobs:
  test:
    steps:
      - run: pnpm test # Vitest unit tests
      - run: pnpm test:e2e # Playwright E2E
      - run: cd apps/scheduling-service && go test ./...
      - run: pnpm db:test # Migration rollback tests
```

**Alternatives Considered**:
- **Jest**: Slower than Vitest, ESM support issues
- **Cypress**: Slower than Playwright, no component testing
- **Supertest**: Manual API testing vs typed tRPC procedures

**References**:
- Vitest docs: https://vitest.dev/
- Playwright docs: https://playwright.dev/

---

## Summary Table

| Research Area | Decision | Key Rationale | Alternative Rejected |
|---------------|----------|---------------|---------------------|
| Monorepo | pnpm + Turborepo | Fastest, efficient, industry standard | npm (slower), Nx (complex) |
| API Layer | tRPC v11 | Zero boilerplate, type-safe, real-time | REST (manual), GraphQL (complex) |
| TS ORM | Drizzle 0.36+ | Lightest, fastest, SQL-like | Prisma (heavier), TypeORM (legacy) |
| Go Framework | Fiber v3 | 7-11x faster, Go concurrency | Gin (slower), Chi (more boilerplate) |
| Go ORM | SQLC | Compile-time type safety, zero overhead | GORM (runtime reflection) |
| Auth | Next-Auth v5 | Next.js native, RSC support | Clerk (SaaS), Custom JWT (more work) |
| Deployment | Docker Compose | Simple, environment parity | Kubernetes (premature), Manual (error-prone) |
| Real-time | tRPC + SSE | Type-safe, simpler than WebSockets | Polling (wasteful), WebSockets (complex) |
| Testing | Vitest + Playwright + Go test | Fast, comprehensive, typed | Jest (slower), Cypress (slower) |

---

## Next Steps

All technology decisions documented. Proceed to Phase 1:
1. Generate `data-model.md` (PostgreSQL schema design)
2. Generate `contracts/` (tRPC routers + Go API spec)
3. Generate `quickstart.md` (developer setup guide)
