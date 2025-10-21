# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Catering Event Lifecycle Management System** - Hybrid microservices monorepo for managing catering events from initial inquiry to post-event follow-up, with automated resource conflict detection.

**Architecture**:
- Next.js 15 app (CRUD, auth, UI) + Go scheduling service (resource conflicts)
- Shared PostgreSQL 17 database with Drizzle ORM (TypeScript) and SQLC (Go)
- Type-safe end-to-end via tRPC v11 and SQLC compile-time generation

## Essential Commands

### Development

```bash
# First-time setup
pnpm install
docker-compose up -d postgres
cd packages/database && pnpm db:push && cd ../..

# Start all services
pnpm dev                    # Next.js app on :3000 (Turborepo)

# Or start individually (separate terminals)
cd apps/web && pnpm dev     # Next.js app on :3000
cd apps/scheduling-service && go run cmd/scheduler/main.go  # Go service on :8080

# Docker Compose (all services)
docker-compose up           # PostgreSQL + Next.js + Go scheduler
docker-compose up -d postgres  # Just PostgreSQL
```

### Database Operations

```bash
# All commands from packages/database/
cd packages/database

pnpm db:generate   # Generate Drizzle migrations from schema changes
pnpm db:push       # Push schema directly to DB (dev only, no migration files)
pnpm db:migrate    # Apply pending migrations to database
pnpm db:studio     # Launch Drizzle Studio GUI on :4983

# Connect to PostgreSQL directly
psql postgresql://admin:changeme@localhost:5432/catering_events
```

### Code Quality

```bash
pnpm lint          # ESLint + Biome linting
pnpm type-check    # TypeScript type checking across all packages
pnpm format        # Format code with Biome
pnpm format:check  # Check formatting without writing
pnpm test          # Run all tests (Vitest + Go tests)
```

### Building

```bash
pnpm build         # Build all apps and packages (Turborepo)
pnpm clean         # Remove all build artifacts and node_modules
```

### Go Service Commands

```bash
cd apps/scheduling-service

# Development
go run cmd/scheduler/main.go
go build -o bin/scheduler cmd/scheduler/main.go && ./bin/scheduler

# Testing
go test ./...
go test -v ./internal/scheduler/...

# Generate SQL from SQLC
sqlc generate      # Regenerate type-safe Go code from SQL queries
```

## Architecture & Structure

### Monorepo Layout

```
apps/
├── web/                           # Next.js 15 application
│   ├── src/app/                   # App Router pages (Next.js 15)
│   ├── src/server/                # tRPC API layer
│   │   ├── routers/               # Domain-organized tRPC routers
│   │   │   ├── event.ts           # Event management procedures
│   │   │   ├── task.ts            # Task management procedures
│   │   │   ├── resource.ts        # Resource assignment procedures
│   │   │   └── client.ts          # Client management procedures
│   │   ├── trpc.ts                # tRPC initialization + context
│   │   └── auth.ts                # Next-Auth v5 configuration
│   └── src/lib/                   # Client utilities and hooks
│
└── scheduling-service/            # Go Fiber service
    ├── cmd/scheduler/main.go      # Entry point
    ├── internal/
    │   ├── scheduler/             # Conflict detection algorithms
    │   ├── handlers/              # HTTP handlers (Fiber v3)
    │   └── database/              # SQLC-generated code
    └── sql/                       # SQL queries for SQLC

packages/
├── database/                      # Shared Drizzle ORM schemas
│   ├── src/schema/                # Database table definitions
│   │   ├── users.ts               # User accounts + roles
│   │   ├── clients.ts             # Client records
│   │   ├── events.ts              # Event lifecycle tracking
│   │   ├── tasks.ts               # Task management
│   │   ├── resources.ts           # Staff/equipment/materials
│   │   └── index.ts               # Schema exports
│   └── src/migrations/            # Generated migration files
│
├── types/                         # Shared TypeScript types
│   └── src/                       # Zod schemas and type definitions
│
└── config/                        # Shared configurations
    ├── typescript-config/         # Base tsconfig.json
    ├── eslint-config/             # Shared ESLint rules
    └── tailwind-config/           # Tailwind CSS presets
```

### Key Architectural Patterns

#### Hybrid Microservices
- **Next.js App**: Handles CRUD operations, authentication, UI rendering, analytics
- **Go Scheduler**: Handles resource conflict detection (performance-critical, ~100ms requirement)
- **Why Split**: Go service provides 7-11x faster scheduling algorithms than Node.js, critical for SC-003 (100% conflict detection)

#### Domain-Driven Organization
Files are organized by **domain** (events, tasks, resources), NOT by technical layers (controllers, services, repositories).

Example tRPC router structure:
```typescript
// apps/web/src/server/routers/event.ts
export const eventRouter = router({
  create: adminProcedure.input(...).mutation(...),
  list: protectedProcedure.input(...).query(...),
  updateStatus: adminProcedure.input(...).mutation(...),
  archive: adminProcedure.input(...).mutation(...),
});
```

#### Database Schema Sharing
- **Drizzle ORM** (`packages/database/`): TypeScript schema definitions, migrations
- **SQLC** (Go service): Reads same PostgreSQL schema, generates type-safe Go code
- Both services access same `public` schema in PostgreSQL 17

#### Type Safety End-to-End
- **Frontend ↔ Next.js**: tRPC v11 provides compile-time type checking
- **Next.js ↔ Database**: Drizzle ORM provides typed queries
- **Go ↔ Database**: SQLC generates type-safe Go structs from SQL at compile time
- **Result**: Refactoring a database column causes TypeScript AND Go compile errors

### Authentication & Authorization

**Next-Auth v5** with session-based authentication:
- **Administrator**: Full access (create/edit/delete all entities)
- **Manager**: Read-only + update task status + assign resources

Protected tRPC procedures:
```typescript
export const protectedProcedure = t.procedure.use(requireAuth);      // Any logged-in user
export const adminProcedure = t.procedure.use(requireAdmin);         // Administrators only
```

### Real-Time Updates

Event status changes use **Server-Sent Events** (SSE) to push updates to connected clients:
- tRPC subscriptions for real-time event/task status changes
- Target: Updates visible within 2 seconds (SC-004)

### Archive Strategy

Events are **soft deleted** (archived), not permanently deleted:
- `events.is_archived = true` + `archived_at` timestamp
- Preserves historical data for analytics (SC-009)
- Queries filter archived events by default unless explicitly requested

## Testing Strategy

### TypeScript Tests (Vitest)

```bash
# Run from root
pnpm test

# Run specific package
cd apps/web && pnpm test

# Watch mode
cd apps/web && pnpm test:watch
```

**Test organization**: Co-located with source files
```
src/
├── server/
│   └── routers/
│       ├── event.ts
│       └── event.test.ts       # Unit tests for tRPC procedures
```

### Go Tests

```bash
cd apps/scheduling-service
go test ./...                   # All tests
go test -v ./internal/scheduler/...  # Specific package with verbose output
go test -cover ./...            # With coverage
```

**Test files**: `*_test.go` next to implementation files

### E2E Tests (Playwright)

```bash
cd apps/web
pnpm test:e2e                   # Run E2E tests
pnpm test:e2e:ui                # With Playwright UI
```

**Coverage targets**: >80% overall, 100% for scheduling algorithms (critical business logic)

## Implementation Guides

Comprehensive step-by-step guides located in `docs/implementation-guides/`:

- **PHASE-2-FOUNDATIONAL.md**: Database schema, auth, tRPC setup, Go service foundation
- **PHASE-3-USER-STORY-1.md**: Event management MVP (create, track, status updates)
- **PHASES-4-8-OVERVIEW.md**: Task management, resource scheduling, analytics, client communication

Each guide includes exact file paths, complete code examples, and verification commands.

## Database Schema Key Concepts

### Event Lifecycle States

Events progress through standard lifecycle (Drizzle enum):
```typescript
export const eventStatusEnum = pgEnum('event_status', [
  'inquiry',      // Initial client contact
  'planning',     // Event details being finalized
  'preparation',  // Tasks being completed
  'in_progress',  // Event currently happening
  'completed',    // Event finished
  'follow_up'     // Post-event client communication
]);
```

### Status Change Logging

All status transitions are recorded in `event_status_log` table:
- Captures: previous status, new status, timestamp, user who made change
- Enables audit trail and timeline visualization (FR-003)

### Resource Conflict Detection

Go service uses **GiST indexes** for efficient time range queries:
```sql
CREATE INDEX idx_resources_time_range ON resource_assignments
USING GIST (tsrange(start_time, end_time));
```

Detects overlapping assignments in <100ms (SC-003 requirement).

## Environment Variables

Required `.env` files (copy from `.env.example`):

```bash
# Root .env
DATABASE_URL="postgresql://admin:changeme@localhost:5432/catering_events"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"  # Generate unique secret
NEXTAUTH_URL="http://localhost:3000"
SCHEDULING_SERVICE_URL="http://localhost:8080"

# apps/web/.env.local (same as above)
# apps/scheduling-service/.env
DATABASE_URL="postgresql://admin:changeme@localhost:5432/catering_events"
PORT=8080
```

**Never commit** `.env.local` or `.env` files (only `.env.example` is tracked).

## Tech Stack Versions

- **Node.js**: 20 LTS
- **pnpm**: 10+
- **Go**: 1.23+
- **PostgreSQL**: 17
- **Next.js**: 15.1+
- **React**: 19
- **tRPC**: v11 (RC)
- **Drizzle ORM**: 0.36+
- **Fiber**: v3 (Go)
- **SQLC**: 1.27+

## Implementation Status

**Phase 1**: ✅ Complete - Monorepo structure, dependencies, Docker Compose
**Phase 2**: ⏳ Pending - Database schema, auth, tRPC, Go service foundation

See `specs/001-event-lifecycle-management/tasks.md` for detailed task breakdown (200 tasks across 8 phases).

## Troubleshooting

### PostgreSQL Connection Issues
```bash
docker-compose ps postgres              # Check if running
docker-compose logs postgres            # View logs
docker-compose restart postgres         # Restart database
psql $DATABASE_URL -c "\dt"            # Test connection + list tables
```

### Port Conflicts
```bash
lsof -i :3000                          # Check what's using Next.js port
lsof -i :8080                          # Check what's using Go service port
kill -9 <PID>                          # Kill conflicting process
```

### Dependency Issues
```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install                           # Clean reinstall
pnpm store prune                       # Clear pnpm cache
```

### Type Errors After Schema Changes
```bash
cd packages/database
pnpm db:generate                       # Regenerate Drizzle types
cd ../../apps/scheduling-service
sqlc generate                          # Regenerate Go types
pnpm type-check                        # Verify TypeScript types
```

## Performance Goals (Success Criteria)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Event creation time | <5 minutes | SC-001 |
| Status update visibility | <2 seconds | SC-004 |
| Report generation | <10 seconds | SC-005 |
| Resource conflict detection | <100ms | (not in SC, architecture requirement) |
| Concurrent events | 50+ without degradation | SC-007 |
| Uptime during business hours | >99.5% | SC-010 |

## Constitution Principles

This project follows 6 core principles (see `.specify/constitution.md`):

1. **Technology Excellence**: Latest stable versions, modern patterns (React 19, tRPC v11, Drizzle)
2. **Modular Architecture**: Domain organization, clear service boundaries, <5 core dependencies per service
3. **Test-First Development**: Red-Green-Refactor, >80% coverage, contract tests
4. **API-First Design**: tRPC contracts defined before implementation, versioned endpoints
5. **Observability & Quality**: Structured JSON logging, health checks, performance metrics
6. **Continuous Learning**: Document decisions, improve patterns, share knowledge

When making changes, ensure compliance with these principles.

## Feature Specifications

Detailed user stories and requirements: `specs/001-event-lifecycle-management/spec.md`

**Priority Order**:
- **P1**: Event Management (create, track status, view history)
- **P2**: Task Management (assign, complete, track dependencies)
- **P3**: Resource Scheduling (assign, detect conflicts, view utilization)
- **P4**: Analytics & Reporting (completion rates, resource utilization)
- **P5**: Client Communication (record communications, schedule follow-ups)

## Next Steps

After Phase 1 completion, implement Phase 2 (Foundational):
1. Review `docs/implementation-guides/PHASE-2-FOUNDATIONAL.md`
2. Create database schema (users, clients, enums)
3. Configure Next-Auth v5 authentication
4. Set up tRPC infrastructure
5. Initialize Go Fiber service with health check

See `NEXT-STEPS.md` for detailed getting started guide.
