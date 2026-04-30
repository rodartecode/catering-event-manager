import {
  boolean,
  index,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const vendorServiceTypeEnum = pgEnum('vendor_service_type', [
  'rentals',
  'florals',
  'av',
  'photography',
  'transportation',
  'decor',
  'entertainment',
  'other',
]);

export const vendors = pgTable(
  'vendors',
  {
    id: serial('id').primaryKey(),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    contactName: varchar('contact_name', { length: 255 }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    serviceType: vendorServiceTypeEnum('service_type').notNull(),
    notes: text('notes'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyNameIdx: index('idx_vendors_company_name').on(table.companyName),
    serviceTypeIdx: index('idx_vendors_service_type').on(table.serviceType),
    isActiveIdx: index('idx_vendors_is_active').on(table.isActive),
  })
);
