# CLAUDE.md - Database Package

Shared Drizzle ORM schema definitions for the Catering Event Manager.

→ **Commands**: See `/COMMANDS.md#database` for database commands
→ **Troubleshooting**: See `/TROUBLESHOOTING.md` for database issues

## Overview

**Shared Database Package**: Drizzle ORM schemas shared between Next.js (TypeScript) and Go scheduler (SQLC).

## Schema Organization

```
src/schema/
├── clients.ts           # Base entity (no FKs)
├── users.ts             # References clients
├── events.ts            # References clients, users
├── event-status-log.ts  # References events, users
├── tasks.ts             # References events, users
├── resources.ts         # Independent entity
├── task-resources.ts    # Junction table
├── resource-schedule.ts # References resources, events, tasks
└── communications.ts    # References events, clients, users
```

## Core Enums

```typescript
// Event Lifecycle
eventStatusEnum: ['inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up']

// Resource Types
resourceTypeEnum: ['staff', 'equipment', 'materials']

// Task Categories
taskCategoryEnum: ['pre_event', 'during_event', 'post_event']
```

## Schema Patterns

### Standard Table Structure
```typescript
export const tableName = pgTable('table_name', {
  id: serial('id').primaryKey(),
  // Business columns
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('idx_table_name').on(table.name),
}));
```

### Soft Delete Pattern
```typescript
isArchived: boolean('is_archived').default(false).notNull(),
archivedAt: timestamp('archived_at'),
archivedBy: integer('archived_by').references(() => users.id),
```

## Performance Indexes

### GiST Index (Conflict Detection)
```sql
CREATE INDEX idx_resource_schedule_time_range_gist
ON resource_schedule USING gist (resource_id, tstzrange(start_time, end_time, '[)'));
```

### Composite Indexes
```sql
CREATE INDEX idx_events_composite ON events(status, event_date);
```

## Development Workflow

### Making Schema Changes
```bash
cd packages/database
# 1. Edit schema files
# 2. Generate migration
pnpm db:generate
# 3. Apply to database
pnpm db:migrate  # OR pnpm db:push (dev only)
# 4. Regenerate Go types
cd ../../apps/scheduling-service && sqlc generate
# 5. Verify types
pnpm type-check
```

### Seed Data
```bash
pnpm db:seed

# Default credentials after seeding:
# Admin: admin@example.com / password123
# Manager: manager@example.com / password123
```

## Cross-Service Type Safety

Both services share the same PostgreSQL schema:
- **TypeScript**: Drizzle ORM types (automatic)
- **Go**: SQLC generated types

**After schema changes**, regenerate both:
```bash
cd packages/database && pnpm db:generate
cd ../../apps/scheduling-service && sqlc generate
```

## Database Usage

**From Next.js**:
```typescript
import { db } from '@catering-event-manager/database';
import { events } from '@catering-event-manager/database/schema';

const results = await db.select().from(events).where(eq(events.isArchived, false));
```

**From Go** (SQLC queries in `apps/scheduling-service/sql/`):
```sql
-- name: GetResourceConflicts :many
SELECT r.id, r.name, rs.start_time, rs.end_time
FROM resource_schedule rs
JOIN resources r ON rs.resource_id = r.id
WHERE rs.resource_id = $1;
```

## Related Documentation

- **Project Root**: `../../CLAUDE.md`
- **Next.js App**: `../../apps/web/CLAUDE.md`
- **Go Service**: `../../apps/scheduling-service/CLAUDE.md`
