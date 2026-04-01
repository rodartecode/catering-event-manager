import { boolean, index, integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export const staffAvailability = pgTable(
  'staff_availability',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    dayOfWeek: integer('day_of_week').notNull(), // 0=Sunday, 6=Saturday (JS Date.getDay())
    startTime: varchar('start_time', { length: 5 }).notNull(), // HH:MM format
    endTime: varchar('end_time', { length: 5 }).notNull(), // HH:MM format
    isRecurring: boolean('is_recurring').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_staff_availability_user_id').on(table.userId),
    compositeIdx: index('idx_staff_availability_composite').on(table.userId, table.dayOfWeek),
  })
);
