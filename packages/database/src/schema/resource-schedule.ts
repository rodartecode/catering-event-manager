import { index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { events } from './events';
import { resources } from './resources';
import { tasks } from './tasks';

// Note: PostgreSQL tstzrange type is not directly supported by Drizzle ORM
// We use start_time and end_time columns with application-level checks
// The migration will create a GiST index and EXCLUDE constraint using raw SQL

export const resourceSchedule = pgTable(
  'resource_schedule',
  {
    id: serial('id').primaryKey(),
    resourceId: integer('resource_id')
      .references(() => resources.id, { onDelete: 'cascade' })
      .notNull(),
    eventId: integer('event_id')
      .references(() => events.id, { onDelete: 'cascade' })
      .notNull(),
    taskId: integer('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    resourceIdIdx: index('idx_resource_schedule_resource_id').on(table.resourceId),
    eventIdIdx: index('idx_resource_schedule_event_id').on(table.eventId),
    taskIdIdx: index('idx_resource_schedule_task_id').on(table.taskId),
    startTimeIdx: index('idx_resource_schedule_start_time').on(table.startTime),
    endTimeIdx: index('idx_resource_schedule_end_time').on(table.endTime),
    // Analytics indexes (FR-025)
    analyticsResourceTimeIdx: index('idx_resource_schedule_analytics').on(
      table.resourceId,
      table.startTime,
      table.endTime
    ),
  })
);
