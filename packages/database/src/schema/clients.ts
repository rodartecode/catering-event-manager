import { pgTable, serial, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  contactName: varchar('contact_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  notes: text('notes'),
  portalEnabled: boolean('portal_enabled').default(false).notNull(),
  portalEnabledAt: timestamp('portal_enabled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
