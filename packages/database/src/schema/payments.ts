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
import { invoices } from './invoices';
import { users } from './users';

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash',
  'check',
  'credit_card',
  'bank_transfer',
  'other',
]);

export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    invoiceId: integer('invoice_id')
      .references(() => invoices.id)
      .notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    method: paymentMethodEnum('method').notNull(),
    paymentDate: timestamp('payment_date', { withTimezone: true }).notNull(),
    reference: varchar('reference', { length: 255 }),
    notes: text('notes'),
    recordedBy: integer('recorded_by')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    invoiceIdIdx: index('idx_payments_invoice_id').on(table.invoiceId),
    paymentDateIdx: index('idx_payments_payment_date').on(table.paymentDate),
  })
);
