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
import { clients } from './clients';
import { events } from './events';
import { users } from './users';

export const communicationTypeEnum = pgEnum('communication_type', [
  'email',
  'phone',
  'meeting',
  'other',
]);

export const communications = pgTable(
  'communications',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .references(() => events.id)
      .notNull(),
    clientId: integer('client_id')
      .references(() => clients.id)
      .notNull(),
    type: communicationTypeEnum('type').notNull(),
    subject: varchar('subject', { length: 255 }),
    notes: text('notes'),
    contactedAt: timestamp('contacted_at').defaultNow().notNull(),
    contactedBy: integer('contacted_by').references(() => users.id),
    followUpDate: timestamp('follow_up_date'),
    followUpCompleted: boolean('follow_up_completed').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    eventIdIdx: index('idx_communications_event_id').on(table.eventId),
    clientIdIdx: index('idx_communications_client_id').on(table.clientId),
    followUpDateIdx: index('idx_communications_follow_up_date').on(table.followUpDate),
    contactedAtIdx: index('idx_communications_contacted_at').on(table.contactedAt),
  })
);
