import {
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { events } from './events';
import { vendors } from './vendors';

export const eventVendors = pgTable(
  'event_vendors',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .references(() => events.id, { onDelete: 'cascade' })
      .notNull(),
    vendorId: integer('vendor_id')
      .references(() => vendors.id, { onDelete: 'restrict' })
      .notNull(),
    role: varchar('role', { length: 255 }),
    cost: numeric('cost', { precision: 10, scale: 2 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventIdIdx: index('idx_event_vendors_event_id').on(table.eventId),
    vendorIdIdx: index('idx_event_vendors_vendor_id').on(table.vendorId),
    uniqueEventVendor: unique('uq_event_vendors_event_vendor').on(table.eventId, table.vendorId),
  })
);
