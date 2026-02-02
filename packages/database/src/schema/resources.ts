import {
  boolean,
  index,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const resourceTypeEnum = pgEnum('resource_type', ['staff', 'equipment', 'materials']);

export const resources = pgTable(
  'resources',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    type: resourceTypeEnum('type').notNull(),
    hourlyRate: numeric('hourly_rate', { precision: 10, scale: 2 }),
    isAvailable: boolean('is_available').default(true).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index('idx_resources_type').on(table.type),
    availableIdx: index('idx_resources_available').on(table.isAvailable),
    nameIdx: index('idx_resources_name').on(table.name),
  })
);
