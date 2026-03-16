import { index, integer, numeric, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { invoices } from './invoices';

export const invoiceLineItems = pgTable(
  'invoice_line_items',
  {
    id: serial('id').primaryKey(),
    invoiceId: integer('invoice_id')
      .references(() => invoices.id, { onDelete: 'cascade' })
      .notNull(),
    description: varchar('description', { length: 500 }).notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull().default('1.00'),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    invoiceIdIdx: index('idx_invoice_line_items_invoice_id').on(table.invoiceId),
  })
);
