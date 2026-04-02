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
├── resources.ts         # Staff/equipment/materials (optional user_id FK for staff)
├── staff-skills.ts      # Staff skill certifications (staff_skill enum)
├── staff-availability.ts # Weekly recurring availability (HH:MM slots)
├── task-resources.ts    # Junction table
├── resource-schedule.ts # References resources, events, tasks
├── communications.ts    # References events, clients, users
├── documents.ts         # References events, users (Supabase Storage)
├── menu-items.ts        # Global menu catalog (allergens[], dietary_tags[])
├── event-menus.ts       # Per-event menu groupings
├── event-menu-items.ts  # Junction: event_menus ↔ menu_items
├── expenses.ts          # References events, users
├── invoices.ts          # References events, users
├── invoice-line-items.ts # References invoices
├── payments.ts          # References invoices, users
├── notifications.ts     # User notifications (notification_type enum)
├── notification-preferences.ts # Per-user per-type in-app/email toggles
├── portal-access-log.ts # Client portal access audit log
├── task-templates.ts    # Independent entity
├── task-template-items.ts # References task-templates
└── verification-tokens.ts # Portal magic link tokens
```

## Core Enums

```typescript
// Event Lifecycle
eventStatusEnum: ['inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up']

// Resource Types
resourceTypeEnum: ['staff', 'equipment', 'materials']

// Task Categories
taskCategoryEnum: ['pre_event', 'during_event', 'post_event']

// Menu Item Categories
menuItemCategoryEnum: ['appetizer', 'main', 'side', 'dessert', 'beverage']

// Dietary Tags
dietaryTagEnum: ['vegan', 'vegetarian', 'gluten_free', 'halal', 'kosher', 'dairy_free', 'nut_free']

// Notification Types
notificationTypeEnum: ['task_assigned', 'status_changed', 'overdue', 'follow_up_due']

// Staff Skills
staffSkillEnum: ['food_safety_cert', 'bartender', 'sommelier', 'lead_chef', 'sous_chef', 'prep_cook', 'pastry_chef', 'server', 'event_coordinator', 'barista']
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
