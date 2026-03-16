import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { events } from './events';
import { users } from './users';

export const expenseCategoryEnum = pgEnum('expense_category', [
  'labor',
  'food_supplies',
  'equipment_rental',
  'venue',
  'transportation',
  'decor',
  'beverages',
  'other',
]);

export const expenses = pgTable(
  'expenses',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .references(() => events.id)
      .notNull(),
    category: expenseCategoryEnum('category').notNull(),
    description: varchar('description', { length: 500 }).notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    vendor: varchar('vendor', { length: 255 }),
    expenseDate: timestamp('expense_date', { withTimezone: true }).notNull(),
    notes: text('notes'),
    createdBy: integer('created_by')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventIdIdx: index('idx_expenses_event_id').on(table.eventId),
    categoryIdx: index('idx_expenses_category').on(table.category),
    expenseDateIdx: index('idx_expenses_expense_date').on(table.expenseDate),
  })
);
