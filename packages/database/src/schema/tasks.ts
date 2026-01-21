import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { events } from './events';
import { users } from './users';

export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'in_progress',
  'completed',
]);

export const taskCategoryEnum = pgEnum('task_category', [
  'pre_event',
  'during_event',
  'post_event',
]);

export const tasks = pgTable(
  'tasks',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .references(() => events.id)
      .notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    category: taskCategoryEnum('category').notNull(),
    status: taskStatusEnum('status').default('pending').notNull(),
    assignedTo: integer('assigned_to').references(() => users.id),
    dueDate: timestamp('due_date'),
    dependsOnTaskId: integer('depends_on_task_id'),
    isOverdue: boolean('is_overdue').default(false).notNull(),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    eventIdIdx: index('idx_tasks_event_id').on(table.eventId),
    statusIdx: index('idx_tasks_status').on(table.status),
    assignedToIdx: index('idx_tasks_assigned_to').on(table.assignedTo),
    dueDateIdx: index('idx_tasks_due_date').on(table.dueDate),
    overdueIdx: index('idx_tasks_overdue').on(table.isOverdue),
  })
);
