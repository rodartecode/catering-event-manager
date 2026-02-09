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
import { taskTemplates } from './task-templates';
import { users } from './users';

export const eventStatusEnum = pgEnum('event_status', [
  'inquiry',
  'planning',
  'preparation',
  'in_progress',
  'completed',
  'follow_up',
]);

export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    clientId: integer('client_id')
      .references(() => clients.id)
      .notNull(),
    eventName: varchar('event_name', { length: 255 }).notNull(),
    eventDate: timestamp('event_date').notNull(),
    location: varchar('location', { length: 500 }),
    status: eventStatusEnum('status').default('inquiry').notNull(),
    estimatedAttendees: integer('estimated_attendees'),
    notes: text('notes'),
    isArchived: boolean('is_archived').default(false).notNull(),
    archivedAt: timestamp('archived_at'),
    archivedBy: integer('archived_by').references(() => users.id),
    createdBy: integer('created_by')
      .references(() => users.id)
      .notNull(),
    templateId: integer('template_id').references(() => taskTemplates.id, { onDelete: 'set null' }),
    clonedFromEventId: integer('cloned_from_event_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    clientIdIdx: index('idx_events_client_id').on(table.clientId),
    dateIdx: index('idx_events_date').on(table.eventDate),
    statusIdx: index('idx_events_status').on(table.status),
    archivedIdx: index('idx_events_archived').on(table.archivedAt),
    compositeIdx: index('idx_events_composite').on(table.status, table.eventDate),
    // Analytics indexes (FR-024)
    analyticsStatusCreatedIdx: index('idx_events_analytics_status_created').on(
      table.status,
      table.createdAt
    ),
    analyticsArchivedCreatedIdx: index('idx_events_analytics_archived_created').on(
      table.isArchived,
      table.createdAt
    ),
  })
);
