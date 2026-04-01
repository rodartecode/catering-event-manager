import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';

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
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index('idx_resources_type').on(table.type),
    availableIdx: index('idx_resources_available').on(table.isAvailable),
    nameIdx: index('idx_resources_name').on(table.name),
    userIdUniqueIdx: uniqueIndex('idx_resources_user_id')
      .on(table.userId)
      .where(sql`user_id IS NOT NULL`),
  })
);
