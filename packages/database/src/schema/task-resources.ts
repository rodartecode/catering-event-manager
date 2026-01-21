import {
  pgTable,
  integer,
  timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { tasks } from './tasks';
import { resources } from './resources';

export const taskResources = pgTable(
  'task_resources',
  {
    taskId: integer('task_id')
      .references(() => tasks.id, { onDelete: 'cascade' })
      .notNull(),
    resourceId: integer('resource_id')
      .references(() => resources.id, { onDelete: 'cascade' })
      .notNull(),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.taskId, table.resourceId] }),
  })
);
