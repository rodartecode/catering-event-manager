# CLAUDE.md - Database Package

This file provides guidance for working with the shared database layer in the Catering Event Lifecycle Management System.

## Overview

**Shared Database Package** - Drizzle ORM 0.45.1-based schema definitions and migrations shared between the Next.js application and Go scheduling service.

**Architecture**:
- **Schema Organization**: Domain-driven table definitions using Drizzle ORM
- **Cross-Service Integration**: TypeScript types (Drizzle) + Go types (SQLC) from same PostgreSQL schema
- **Migration Strategy**: Drizzle Kit for schema generation and PostgreSQL migration management
- **Performance Optimization**: GiST indexes, composite indexes, and exclusion constraints

## Essential Commands

### Development Workflow

```bash
# From packages/database/ or root
cd packages/database

# Schema management
pnpm db:generate   # Generate migration files from schema changes
pnpm db:push       # Push schema directly to DB (dev only, no migration files)
pnpm db:migrate    # Apply pending migrations to database
pnpm db:studio     # Launch Drizzle Studio GUI on :4983

# Database seeding
pnpm db:seed       # Populate database with development data

# Direct PostgreSQL access
psql postgresql://admin:changeme@localhost:5432/catering_events
```

### First-Time Setup

```bash
# 1. Ensure PostgreSQL is running
docker-compose up -d postgres

# 2. Push schema to database (creates all tables)
cd packages/database && pnpm db:push

# 3. Seed with development data
pnpm db:seed
```

### Making Schema Changes

```bash
# 1. Modify schema files in src/schema/
# 2. Generate migration
pnpm db:generate

# 3. Apply migration
pnpm db:migrate

# 4. Update SQLC in Go service
cd ../../apps/scheduling-service && sqlc generate

# 5. Verify TypeScript types
pnpm type-check
```

## Schema Organization

### Domain Tables (`/src/schema/`)

**Import Order** (maintained in `index.ts` for FK dependencies):
```typescript
export * from './clients';        // Base entity (no FKs)
export * from './users';          // References clients
export * from './events';         // References clients, users
export * from './event-status-log'; // References events, users
export * from './tasks';          // References events, users
export * from './resources';      // Independent entity
export * from './task-resources'; // Junction table (tasks ↔ resources)
export * from './resource-schedule'; // References resources, events, tasks
export * from './communications'; // References events, clients, users
export * from './verification-tokens'; // Auth tokens
export * from './portal-access-log'; // Audit logging
```

### Core Enums

**Event Lifecycle States**:
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

**Resource Types**:
```typescript
export const resourceTypeEnum = pgEnum('resource_type', [
  'staff',        // People (chefs, servers, coordinators)
  'equipment',    // Tools, appliances, vehicles
  'materials',    // Ingredients, tableware, linens
]);
```

**Task Categories**:
```typescript
export const taskCategoryEnum = pgEnum('task_category', [
  'pre_event',    // Planning and preparation tasks
  'during_event', // Real-time event execution tasks
  'post_event',   // Follow-up and cleanup tasks
]);
```

### Schema Patterns

#### Standard Table Structure
```typescript
export const tableName = pgTable(
  'table_name',
  {
    id: serial('id').primaryKey(),
    // Business columns
    name: varchar('name', { length: 255 }).notNull(),
    // Foreign key references
    clientId: integer('client_id')
      .references(() => clients.id)
      .notNull(),
    // Audit fields (consistent across all tables)
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Performance indexes
    nameIdx: index('idx_table_name_name').on(table.name),
    clientIdx: index('idx_table_name_client_id').on(table.clientId),
  })
);
```

#### Soft Delete Pattern
```typescript
// Events, tasks, and other entities use soft delete
isArchived: boolean('is_archived').default(false).notNull(),
archivedAt: timestamp('archived_at'),
archivedBy: integer('archived_by').references(() => users.id),
```

#### Timestamp Handling
```typescript
// All timestamps use PostgreSQL's timezone-aware types
eventDate: timestamp('event_date').notNull(),                    // Local time
startTime: timestamp('start_time', { withTimezone: true }),      // UTC with timezone
createdAt: timestamp('created_at').defaultNow().notNull(),      // Auto-managed
```

### Performance Optimization

#### Index Strategy

**1. Single Column Indexes** (basic lookups):
```sql
CREATE INDEX idx_events_client_id ON events(client_id);
CREATE INDEX idx_events_status ON events(status);
```

**2. Composite Indexes** (multi-column queries):
```sql
CREATE INDEX idx_events_composite ON events(status, event_date);
CREATE INDEX idx_events_analytics_status_created ON events(status, created_at);
```

**3. GiST Indexes** (time range overlap detection):
```sql
-- Enables O(log n) resource conflict detection
CREATE INDEX idx_resource_schedule_time_range_gist
ON resource_schedule USING gist (
  resource_id,
  tstzrange(start_time, end_time, '[)')
);
```

#### Database Constraints

**Time Range Validation**:
```sql
-- Ensure logical time ordering
ALTER TABLE resource_schedule ADD CONSTRAINT resource_schedule_time_range_valid
CHECK (end_time > start_time);
```

**Conflict Prevention**:
```sql
-- Prevent double-booking at database level
ALTER TABLE resource_schedule ADD CONSTRAINT resource_schedule_no_overlap
EXCLUDE USING gist (
  resource_id WITH =,
  tstzrange(start_time, end_time, '[)') WITH &&
);
```

## Migration Management

### Migration Files (`/src/migrations/`)

**Generated Migration Structure**:
```
src/migrations/
├── 0000_slow_ultimo.sql           # Initial schema (users, clients, events)
├── 0001_events_trigger_and_view.sql # Event status logging triggers
├── 0002_tasks.sql                 # Task management tables
├── 0003_resources.sql             # Resource scheduling tables + GiST indexes
└── meta/                          # Drizzle metadata
    ├── _journal.json              # Migration history
    └── 0000_snapshot.json         # Schema snapshots
```

### Development vs Production Workflows

**Development** (rapid iteration):
```bash
# Skip migration files, push directly
pnpm db:push
```

**Production** (versioned migrations):
```bash
# Generate migration from schema diff
pnpm db:generate

# Review generated SQL in src/migrations/XXXX_name.sql
# Apply to database
pnpm db:migrate
```

### Schema Change Safety

**Before Modifying Schema**:
1. **Backup database** (production) or note current state (development)
2. **Coordinate with Go service** - SQLC queries may need updates
3. **Consider breaking changes** - column renames affect both services
4. **Test with seed data** - verify existing data compatibility

**After Schema Changes**:
```bash
# 1. Regenerate TypeScript types (automatic with Drizzle)
cd packages/database && pnpm db:generate

# 2. Regenerate Go types from same schema
cd apps/scheduling-service && sqlc generate

# 3. Verify type safety across services
pnpm type-check

# 4. Test seed script still works
pnpm db:seed
```

## Database Operations

### Connection Management (`/src/client.ts`)

**Connection Pool Configuration**:
```typescript
// Total budget: 200 connections across all services
const client = postgres(connectionString, {
  max: 150,           // 75% for TypeScript CRUD operations
  idle_timeout: 30,   // Close idle connections after 30s
  connect_timeout: 10, // Connection timeout
  max_lifetime: 60 * 30, // 30 minute max connection lifetime
});
```

**Environment Configuration**:
```bash
# Required in .env
DATABASE_URL="postgresql://admin:changeme@localhost:5432/catering_events"
```

### Database Client Usage

**From Next.js Application**:
```typescript
import { db } from '@catering-event-manager/database';
import { events, clients } from '@catering-event-manager/database/schema';

// Type-safe queries with Drizzle
const upcomingEvents = await db
  .select()
  .from(events)
  .leftJoin(clients, eq(events.clientId, clients.id))
  .where(and(
    eq(events.isArchived, false),
    gte(events.eventDate, new Date())
  ));
```

**From Go Scheduling Service**:
```go
// queries.sql (SQLC reads same PostgreSQL schema)
-- name: GetResourceConflicts :many
SELECT r.id, r.name, rs.start_time, rs.end_time
FROM resource_schedule rs
JOIN resources r ON rs.resource_id = r.id
WHERE rs.resource_id = $1
  AND tstzrange(rs.start_time, rs.end_time, '[)') && tstzrange($2, $3, '[)');
```

## Development Data (`/src/seed.ts`)

### Seeding Strategy

**Comprehensive Test Data**:
- **3 clients** (corporate, startup, wedding planner)
- **4 users** (admin, manager, 2 portal clients)
- **5 events** (various statuses, past and future)
- **10 tasks** (across event lifecycle phases)
- **5 resources** (staff, equipment, materials)
- **5 communications** (email, phone, meeting records)

**Realistic Relationships**:
- Events linked to clients with appropriate users
- Tasks span pre-event, during-event, post-event categories
- Communications track client interaction history
- Password hashing matches NextAuth.js expectations

### Test Data Patterns

**Password Handling**:
```typescript
// Matches NextAuth.js bcrypt.compare() expectations
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Admin/Manager: password123 (hashed)
// Portal clients: magic link only (null password_hash)
```

**Date Relationships**:
```typescript
const now = new Date();
const oneWeek = 7 * 24 * 60 * 60 * 1000;
const oneMonth = 30 * 24 * 60 * 60 * 1000;

// Events: past (completed), near future (active), far future (planned)
eventDate: new Date(now.getTime() + oneMonth),   // Future event
eventDate: new Date(now.getTime() - oneWeek),    // Past event
```

### Running Seed Script

```bash
# Prerequisites
docker-compose up -d postgres
pnpm db:push

# Run seeding
pnpm db:seed

# Output provides login credentials
# Admin: admin@example.com / password123
# Manager: manager@example.com / password123
# Portal: jane.smith@acme.test (magic link)
```

## Integration Points

### Next.js Application Integration

**tRPC Router Pattern**:
```typescript
// apps/web/src/server/routers/event.ts
import { db } from '@catering-event-manager/database';
import { events, eventStatusEnum } from '@catering-event-manager/database/schema';

export const eventRouter = router({
  list: protectedProcedure
    .query(async () => {
      return await db.select().from(events)
        .where(eq(events.isArchived, false));
    }),
});
```

**Type Exports**:
```typescript
// Drizzle automatically generates TypeScript types
import type { Event, EventStatus } from '@catering-event-manager/database/schema';

// Use in component props, tRPC procedures, etc.
interface EventListProps {
  events: Event[];
  onStatusChange: (eventId: number, status: EventStatus) => void;
}
```

### Go Service Integration

**SQLC Configuration** (`apps/scheduling-service/sqlc.yaml`):
```yaml
version: "2"
sql:
  - engine: "postgresql"
    queries: "sql/queries/"
    schema: "../../packages/database/src/migrations/"
    gen:
      go:
        package: "database"
        out: "internal/database"
        sql_package: "pgx/v5"
```

**Conflict Detection Queries**:
```sql
-- sql/queries/resource_conflicts.sql
-- name: GetOverlappingSchedules :many
SELECT rs.id, rs.resource_id, rs.start_time, rs.end_time, rs.event_id
FROM resource_schedule rs
WHERE rs.resource_id = $1
  AND tstzrange(rs.start_time, rs.end_time, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)');
```

### Type Safety Coordination

**Schema Change Impact**:
1. **Column Rename**: Breaks both TypeScript and Go until regenerated
2. **Add Column**: Safe if nullable or has default value
3. **Drop Column**: Breaking change, requires coordinated deployment
4. **Enum Change**: Affects both services, especially removing values

**Verification Workflow**:
```bash
# After schema changes, verify all services compile
cd packages/database && pnpm db:generate
cd ../../apps/scheduling-service && sqlc generate
cd ../../ && pnpm type-check
cd apps/web && pnpm type-check
cd apps/scheduling-service && go build ./...
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL status
docker-compose ps postgres
docker-compose logs postgres

# Test connection directly
psql $DATABASE_URL -c "SELECT version();"

# Verify schema exists
psql $DATABASE_URL -c "\dt" # List tables
psql $DATABASE_URL -c "\d events" # Describe events table
```

### Migration Problems

```bash
# Reset database (dev only)
docker-compose down postgres
docker volume rm catering-event-manager_postgres_data
docker-compose up -d postgres
pnpm db:push

# Check migration status
pnpm db:studio  # View via GUI

# Manual migration rollback (if needed)
psql $DATABASE_URL -c "DELETE FROM __drizzle_migrations WHERE id = 'XXXX';"
```

### Schema Sync Issues

**Symptoms**:
- TypeScript type errors after schema changes
- Go compilation errors in SQLC-generated code
- Runtime errors about missing columns/tables

**Resolution**:
```bash
# 1. Verify migration applied
psql $DATABASE_URL -c "\d table_name"

# 2. Regenerate types for both services
cd packages/database && pnpm db:generate
cd ../../apps/scheduling-service && sqlc generate

# 3. Clear build caches
pnpm clean && pnpm install
cd apps/scheduling-service && go mod tidy
```

### Performance Issues

**Slow Queries**:
```sql
-- Check query performance
EXPLAIN ANALYZE SELECT * FROM events WHERE status = 'planning';

-- Verify indexes exist
\di events  -- List indexes for events table
```

**Connection Pool Exhaustion**:
```bash
# Monitor active connections
psql $DATABASE_URL -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"

# Adjust pool settings in src/client.ts if needed
```

## Schema Evolution Guidelines

### Making Safe Changes

**✅ Safe Additions**:
- New nullable columns with defaults
- New tables (no existing FK references)
- New indexes for performance
- Additional enum values (at end)

**⚠️ Breaking Changes** (require coordination):
- Renaming columns or tables
- Changing column types
- Removing columns or tables
- Removing enum values
- Adding NOT NULL constraints to existing columns

### Production Deployment

**Schema Change Checklist**:
1. **Test migration** on copy of production data
2. **Coordinate deployment** between Next.js and Go services
3. **Plan rollback strategy** for breaking changes
4. **Monitor performance** after index changes
5. **Verify seed script** still works in CI/CD

**Zero-Downtime Patterns**:
- **Add columns** as nullable first, populate, then add NOT NULL
- **Rename columns** using views for backward compatibility
- **Drop columns** after confirming no code references them

## Performance Monitoring

### Key Metrics

**Query Performance**:
- Event list queries: <100ms (with proper indexes)
- Resource conflict detection: <100ms (using GiST index)
- Analytics queries: <500ms (using composite indexes)

**Connection Usage**:
- TypeScript service: max 150 connections (75% of budget)
- Go service: max 50 connections (25% of budget)
- Target: <80% utilization under normal load

### Monitoring Commands

```sql
-- Active query monitoring
SELECT query, state, query_start
FROM pg_stat_activity
WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%';

-- Index usage statistics
SELECT indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Table size monitoring
SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename::regclass))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```

---

**Next Steps**: After database setup, continue with implementing tRPC routers and Go service integration. See project root `CLAUDE.md` for service-specific guidance.