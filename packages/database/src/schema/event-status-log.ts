import {
  pgTable,
  serial,
  integer,
  timestamp,
  text,
  index,
} from 'drizzle-orm/pg-core';
import { events, eventStatusEnum } from './events';
import { users } from './users';

export const eventStatusLog = pgTable(
  'event_status_log',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .references(() => events.id)
      .notNull(),
    oldStatus: eventStatusEnum('old_status'),
    newStatus: eventStatusEnum('new_status').notNull(),
    changedBy: integer('changed_by')
      .references(() => users.id)
      .notNull(),
    notes: text('notes'),
    changedAt: timestamp('changed_at').defaultNow().notNull(),
  },
  (table) => ({
    eventIdIdx: index('idx_event_status_log_event_id').on(table.eventId),
    changedAtIdx: index('idx_event_status_log_changed_at').on(table.changedAt),
  })
);
