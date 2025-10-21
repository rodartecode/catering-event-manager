# Data Model: Catering Event Lifecycle Management

**Feature**: 001-event-lifecycle-management
**Date**: 2025-10-19
**Phase**: 1 (Design & Contracts)
**Database**: PostgreSQL 17

## Overview

This document defines the PostgreSQL database schema using Drizzle ORM syntax. The schema supports all functional requirements (FR-001 through FR-032) with optimizations for the performance goals (SC-001 through SC-010).

### Schema Organization

- **Public Schema**: Core business entities (Events, Clients, Tasks, Resources, Communications, Users)
- **Scheduling Schema**: Resource availability cache and conflict detection state (Go service only)
- **Archive Tables**: Soft-deleted/archived events for historical retention (FR-007)

---

## Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Clients   │────────<│    Events    │>────────│    Tasks    │
└─────────────┘    1:N  └──────────────┘    1:N  └─────────────┘
                              │   │                      │
                              │   │1:N                   │N:M
                              │   │                      │
                              │   └──────────┐           │
                              │1:N           │           │
                              ▼              ▼           ▼
                     ┌──────────────┐  ┌──────────────┐ ┌──────────────┐
                     │Communications│  │EventStatusLog│ │TaskResources │
                     └──────────────┘  └──────────────┘ └──────────────┘
                                                               │
                                                               │N:1
                                                               ▼
                                                        ┌──────────────┐
                                                        │  Resources   │
                                                        └──────────────┘
                                                               │
                                                               │1:N
                                                               ▼
                                                        ┌──────────────┐
                                                        │ResourceSched │
                                                        └──────────────┘
┌─────────────┐
│    Users    │
└─────────────┘
```

---

## Core Entities

### 1. Users Table

**Purpose**: Authentication, authorization, audit trail (FR-028, FR-029, FR-030)

```typescript
// packages/database/src/schema/users.ts
import { pgTable, serial, varchar, timestamp, pgEnum, boolean } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['administrator', 'manager']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('manager').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role) WHERE is_active = true;
```

**Relationships**:
- User (1) → Events (N): Created by
- User (1) → Tasks (N): Assigned tasks
- User (1) → EventStatusLog (N): Status changes made by

**Constraints**:
- Email must be unique
- Password hash minimum 60 chars (bcrypt)
- Active users only for role-based queries

---

### 2. Clients Table

**Purpose**: Client records and contact information (FR-020, FR-021)

```typescript
// packages/database/src/schema/clients.ts
import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  contactName: varchar('contact_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Indexes
CREATE INDEX idx_clients_company_name ON clients(company_name);
CREATE INDEX idx_clients_email ON clients(email);
```

**Relationships**:
- Client (1) → Events (N): Client events

**Validation**:
- Email format validation (application layer)
- Phone format standardization (application layer)

---

### 3. Events Table

**Purpose**: Core event management (FR-001 through FR-007)

```typescript
// packages/database/src/schema/events.ts
import { pgTable, serial, varchar, text, timestamp, integer, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { clients } from './clients';

export const eventStatusEnum = pgEnum('event_status', [
  'inquiry',
  'planning',
  'preparation',
  'in_progress',
  'completed',
  'follow_up',
  'archived'
]);

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  eventName: varchar('event_name', { length: 255 }).notNull(),
  eventDate: timestamp('event_date').notNull(),
  location: varchar('location', { length: 500 }),
  status: eventStatusEnum('status').default('inquiry').notNull(),
  estimatedAttendees: integer('estimated_attendees'),
  notes: text('notes'),
  isArchived: boolean('is_archived').default(false).notNull(),
  archivedAt: timestamp('archived_at'),
  archivedBy: integer('archived_by').references(() => users.id),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Indexes for performance (SC-004, SC-005)
CREATE INDEX idx_events_client_id ON events(client_id);
CREATE INDEX idx_events_date ON events(event_date) WHERE is_archived = false;
CREATE INDEX idx_events_status ON events(status) WHERE is_archived = false;
CREATE INDEX idx_events_archived ON events(archived_at) WHERE is_archived = true;
CREATE INDEX idx_events_composite ON events(status, event_date) WHERE is_archived = false;
```

**Relationships**:
- Event (N) → Client (1): Client reference
- Event (N) → User (1): Created by
- Event (1) → Tasks (N): Event tasks
- Event (1) → EventStatusLog (N): Status history
- Event (1) → Communications (N): Client communications

**State Transitions** (FR-002):
```
inquiry → planning → preparation → in_progress → completed → follow_up
                                                          ↓
                                                      archived
```

**Archive Strategy** (FR-007):
- Soft delete: `is_archived = true, archived_at = NOW(), archived_by = user_id`
- Archived events excluded from active queries via `WHERE is_archived = false`
- Archived events available for analytics (FR-024)

---

### 4. Event Status Log Table

**Purpose**: Audit trail for status changes (FR-003, FR-030)

```typescript
// packages/database/src/schema/event-status-log.ts
import { pgTable, serial, integer, timestamp, text } from 'drizzle-orm/pg-core';
import { events, eventStatusEnum } from './events';
import { users } from './users';

export const eventStatusLog = pgTable('event_status_log', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  oldStatus: eventStatusEnum('old_status'),
  newStatus: eventStatusEnum('new_status').notNull(),
  changedBy: integer('changed_by').references(() => users.id).notNull(),
  notes: text('notes'),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
});

// Indexes
CREATE INDEX idx_event_status_log_event_id ON event_status_log(event_id);
CREATE INDEX idx_event_status_log_changed_at ON event_status_log(changed_at);
```

**Relationships**:
- EventStatusLog (N) → Event (1)
- EventStatusLog (N) → User (1): Changed by

**Trigger** (Application Layer):
```sql
-- Automatically log status changes on UPDATE
CREATE OR REPLACE FUNCTION log_event_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO event_status_log (event_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_status_change_trigger
AFTER UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION log_event_status_change();
```

---

### 5. Tasks Table

**Purpose**: Event task management (FR-008 through FR-014)

```typescript
// packages/database/src/schema/tasks.ts
import { pgTable, serial, varchar, text, timestamp, integer, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { events } from './events';
import { users } from './users';

export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed']);

export const taskCategoryEnum = pgEnum('task_category', ['pre_event', 'during_event', 'post_event']);

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  dueDate: timestamp('due_date'),
  status: taskStatusEnum('status').default('pending').notNull(),
  category: taskCategoryEnum('category').notNull(),
  assignedTo: integer('assigned_to').references(() => users.id),
  completedAt: timestamp('completed_at'),
  completedBy: integer('completed_by').references(() => users.id),
  dependsOnTaskId: integer('depends_on_task_id').references(() => tasks.id), // FR-014
  isOverdue: boolean('is_overdue').default(false).notNull(), // Computed field
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Indexes for performance
CREATE INDEX idx_tasks_event_id ON tasks(event_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to) WHERE status != 'completed';
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status != 'completed';
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_overdue ON tasks(is_overdue) WHERE status != 'completed';
```

**Relationships**:
- Task (N) → Event (1): Event association
- Task (N) → User (1): Assigned to
- Task (N) → Task (1): Task dependency (FR-014)
- Task (N) → Resources (M): Task resources (via join table)

**Computed Fields**:
- `is_overdue`: Updated daily via cron job: `UPDATE tasks SET is_overdue = true WHERE due_date < NOW() AND status != 'completed'`

**Constraints**:
- Task cannot depend on itself (check constraint)
- Circular dependencies prevented (application layer validation)
- Completed tasks must have `completed_at` and `completed_by`

---

### 6. Resources Table

**Purpose**: Staff, equipment, materials tracking (FR-015, FR-016)

```typescript
// packages/database/src/schema/resources.ts
import { pgTable, serial, varchar, text, pgEnum, boolean, timestamp } from 'drizzle-orm/pg-core';

export const resourceTypeEnum = pgEnum('resource_type', ['staff', 'equipment', 'materials']);

export const resources = pgTable('resources', {
  id: serial('id').primaryKey(),
  resourceName: varchar('resource_name', { length: 255 }).notNull(),
  resourceType: resourceTypeEnum('resource_type').notNull(),
  description: text('description'),
  isAvailable: boolean('is_available').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Indexes
CREATE INDEX idx_resources_type ON resources(resource_type) WHERE is_available = true;
CREATE INDEX idx_resources_name ON resources(resource_name);
```

**Relationships**:
- Resource (M) → Tasks (N): Task assignments (via join table)
- Resource (1) → ResourceSchedule (N): Availability tracking

---

### 7. Task Resources Table (Join Table)

**Purpose**: Many-to-many relationship between tasks and resources (FR-016)

```typescript
// packages/database/src/schema/task-resources.ts
import { pgTable, serial, integer, timestamp } from 'drizzle-orm/pg-core';
import { tasks } from './tasks';
import { resources } from './resources';
import { users } from './users';

export const taskResources = pgTable('task_resources', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').references(() => tasks.id).notNull(),
  resourceId: integer('resource_id').references(() => resources.id).notNull(),
  assignedBy: integer('assigned_by').references(() => users.id).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: resource cannot be assigned to same task twice
  uniqTaskResource: pgUnique('uniq_task_resource').on(table.taskId, table.resourceId),
}));

// Indexes for conflict detection (FR-017, FR-019)
CREATE INDEX idx_task_resources_resource_id ON task_resources(resource_id);
CREATE INDEX idx_task_resources_task_id ON task_resources(task_id);
```

---

### 8. Resource Schedule Table (Scheduling Schema)

**Purpose**: Resource availability cache for conflict detection (FR-017, FR-018, FR-019)

```typescript
// packages/database/src/schema/resource-schedule.ts
import { pgTable, serial, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { resources } from './resources';
import { events } from './events';

export const resourceSchedule = pgTable('resource_schedule', {
  id: serial('id').primaryKey(),
  resourceId: integer('resource_id').references(() => resources.id).notNull(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  isBlocked: boolean('is_blocked').default(false).notNull(), // Manual block (maintenance, etc.)
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Constraint: end_time must be after start_time
  checkTimeRange: check('check_time_range', sql`end_time > start_time`),
}));

// Indexes for fast conflict detection (SC-004: 2-second updates)
CREATE INDEX idx_resource_schedule_resource_id ON resource_schedule(resource_id);
CREATE INDEX idx_resource_schedule_time_range ON resource_schedule USING GIST (
  tstzrange(start_time, end_time)
);
CREATE INDEX idx_resource_schedule_event_id ON resource_schedule(event_id);
```

**Conflict Detection Query** (used by Go service):
```sql
-- Check if resource has conflicts in time range
SELECT COUNT(*)
FROM resource_schedule
WHERE resource_id = $1
  AND tstzrange(start_time, end_time) && tstzrange($2, $3)
  AND is_blocked = false;
```

---

### 9. Communications Table

**Purpose**: Client communication history (FR-022, FR-023)

```typescript
// packages/database/src/schema/communications.ts
import { pgTable, serial, integer, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { events } from './events';
import { clients } from './clients';
import { users } from './users';

export const communicationTypeEnum = pgEnum('communication_type', ['email', 'phone', 'meeting', 'other']);

export const communications = pgTable('communications', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  eventId: integer('event_id').references(() => events.id), // Nullable: communication may not be event-specific
  type: communicationTypeEnum('type').notNull(),
  subject: varchar('subject', { length: 255 }),
  notes: text('notes').notNull(),
  followUpDate: timestamp('follow_up_date'), // FR-023: Schedule follow-up
  followUpCompleted: boolean('follow_up_completed').default(false),
  recordedBy: integer('recorded_by').references(() => users.id).notNull(),
  communicatedAt: timestamp('communicated_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Indexes
CREATE INDEX idx_communications_client_id ON communications(client_id);
CREATE INDEX idx_communications_event_id ON communications(event_id);
CREATE INDEX idx_communications_follow_up ON communications(follow_up_date)
  WHERE follow_up_completed = false;
```

**Relationships**:
- Communication (N) → Client (1)
- Communication (N) → Event (1): Optional event context
- Communication (N) → User (1): Recorded by

---

## Archive Tables

### Event Archive View

**Purpose**: Read-only view of archived events for analytics (FR-024, FR-025, FR-026, FR-027)

```sql
CREATE VIEW archived_events AS
SELECT
  e.*,
  c.company_name,
  c.contact_name,
  u.name AS archived_by_name
FROM events e
JOIN clients c ON e.client_id = c.id
JOIN users u ON e.archived_by = u.id
WHERE e.is_archived = true;
```

---

## Drizzle Schema Organization

```
packages/database/src/schema/
├── index.ts                 # Export all schemas
├── users.ts                 # Users + enums
├── clients.ts               # Clients
├── events.ts                # Events + status enum
├── event-status-log.ts      # Event audit trail
├── tasks.ts                 # Tasks + enums
├── resources.ts             # Resources + enum
├── task-resources.ts        # Join table
├── resource-schedule.ts     # Scheduling cache
└── communications.ts        # Communications + enum
```

**index.ts**:
```typescript
export * from './users';
export * from './clients';
export * from './events';
export * from './event-status-log';
export * from './tasks';
export * from './resources';
export * from './task-resources';
export * from './resource-schedule';
export * from './communications';
```

---

## Migration Strategy

### Initial Migration (0000_init.sql)

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- For time range indexes

-- Create enums
CREATE TYPE user_role AS ENUM ('administrator', 'manager');
CREATE TYPE event_status AS ENUM ('inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up', 'archived');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE task_category AS ENUM ('pre_event', 'during_event', 'post_event');
CREATE TYPE resource_type AS ENUM ('staff', 'equipment', 'materials');
CREATE TYPE communication_type AS ENUM ('email', 'phone', 'meeting', 'other');

-- Create tables (in dependency order)
CREATE TABLE users (...);
CREATE TABLE clients (...);
CREATE TABLE events (...);
CREATE TABLE event_status_log (...);
CREATE TABLE tasks (...);
CREATE TABLE resources (...);
CREATE TABLE task_resources (...);
CREATE TABLE resource_schedule (...);
CREATE TABLE communications (...);

-- Create indexes (listed above per table)

-- Create triggers
CREATE TRIGGER event_status_change_trigger ...;
```

### Rollback Strategy

```bash
# Drizzle supports automatic rollback
pnpm db:rollback

# Manual rollback
psql -d catering_events -f migrations/0001_down.sql
```

---

## Performance Optimizations

### Query Performance (SC-004, SC-005)

1. **Composite Indexes**: `(status, event_date)` for filtered event lists
2. **Partial Indexes**: `WHERE is_archived = false` excludes archived data from active queries
3. **GiST Indexes**: Time range queries for conflict detection
4. **Connection Pooling**: PgBouncer for connection management (200 max connections)

### Analytics Queries (FR-024 to FR-027)

```sql
-- Event completion report (SC-005: <10 seconds)
SELECT
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) as avg_days_to_complete
FROM events
WHERE created_at BETWEEN $1 AND $2
GROUP BY status;

-- Resource utilization (SC-005: <10 seconds)
SELECT
  r.id,
  r.resource_name,
  COUNT(DISTINCT tr.task_id) as assigned_tasks,
  SUM(EXTRACT(EPOCH FROM (t.due_date - t.created_at))) as total_hours_allocated
FROM resources r
LEFT JOIN task_resources tr ON r.id = tr.resource_id
LEFT JOIN tasks t ON tr.task_id = t.id
WHERE t.created_at BETWEEN $1 AND $2
GROUP BY r.id, r.resource_name;
```

---

## Data Integrity

### Constraints

- **Foreign Keys**: Cascading deletes where appropriate (e.g., event → tasks)
- **Check Constraints**: `end_time > start_time` for schedules
- **Unique Constraints**: (task_id, resource_id) prevents duplicate assignments
- **Not Null**: Critical fields (email, event_date, status)

### Transactions

- **Event Creation**: Atomic transaction (event + initial status log)
- **Task Assignment**: Atomic (task_resources + notification)
- **Archive**: Atomic (update event + create archive log)

---

## Next Phase

Schema design complete. Proceed to:
1. Generate API contracts (tRPC routers + Go API spec)
2. Generate quickstart.md (setup instructions)
