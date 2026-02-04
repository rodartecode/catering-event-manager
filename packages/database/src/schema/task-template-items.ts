import { index, integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { taskTemplates } from './task-templates';
import { taskCategoryEnum } from './tasks';

export const taskTemplateItems = pgTable(
  'task_template_items',
  {
    id: serial('id').primaryKey(),
    templateId: integer('template_id')
      .references(() => taskTemplates.id, { onDelete: 'cascade' })
      .notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    category: taskCategoryEnum('category').notNull(),
    daysOffset: integer('days_offset').notNull(),
    dependsOnIndex: integer('depends_on_index'),
    sortOrder: integer('sort_order').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    templateIdIdx: index('idx_task_template_items_template_id').on(table.templateId),
    sortOrderIdx: index('idx_task_template_items_sort_order').on(table.templateId, table.sortOrder),
  })
);
