import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const taskTemplates = pgTable('task_templates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
