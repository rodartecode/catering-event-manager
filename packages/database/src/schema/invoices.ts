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

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'sent',
  'paid',
  'overdue',
  'cancelled',
]);

export const invoices = pgTable(
  'invoices',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .references(() => events.id)
      .notNull(),
    invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
    status: invoiceStatusEnum('status').notNull().default('draft'),
    subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull().default('0.00'),
    taxRate: numeric('tax_rate', { precision: 5, scale: 4 }).notNull().default('0.0000'),
    taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
    total: numeric('total', { precision: 10, scale: 2 }).notNull().default('0.00'),
    notes: text('notes'),
    dueDate: timestamp('due_date', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdBy: integer('created_by')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventIdIdx: index('idx_invoices_event_id').on(table.eventId),
    statusIdx: index('idx_invoices_status').on(table.status),
    invoiceNumberIdx: index('idx_invoices_invoice_number').on(table.invoiceNumber),
  })
);
