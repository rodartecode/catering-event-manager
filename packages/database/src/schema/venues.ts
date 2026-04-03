import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const kitchenTypeEnum = pgEnum('kitchen_type', [
  'full',
  'prep_only',
  'warming_only',
  'none',
]);

export const venues = pgTable(
  'venues',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    address: text('address').notNull(),
    capacity: integer('capacity'),
    hasKitchen: boolean('has_kitchen').default(false).notNull(),
    kitchenType: kitchenTypeEnum('kitchen_type'),
    equipmentAvailable: text('equipment_available').array().default([]),
    parkingNotes: text('parking_notes'),
    loadInNotes: text('load_in_notes'),
    contactName: varchar('contact_name', { length: 255 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    contactEmail: varchar('contact_email', { length: 255 }),
    notes: text('notes'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index('idx_venues_name').on(table.name),
    isActiveIdx: index('idx_venues_is_active').on(table.isActive),
  })
);
