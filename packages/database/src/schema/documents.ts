import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { events } from './events';
import { users } from './users';

export const documentTypeEnum = pgEnum('document_type', [
  'contract',
  'menu',
  'floor_plan',
  'permit',
  'photo',
]);

export const documents = pgTable(
  'documents',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .references(() => events.id)
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    type: documentTypeEnum('type').notNull(),
    storageKey: varchar('storage_key', { length: 1000 }).notNull(),
    fileSize: integer('file_size').notNull(),
    mimeType: varchar('mime_type', { length: 255 }).notNull(),
    sharedWithClient: boolean('shared_with_client').default(false).notNull(),
    uploadedBy: integer('uploaded_by')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventIdIdx: index('idx_documents_event_id').on(table.eventId),
    typeIdx: index('idx_documents_type').on(table.type),
    sharedWithClientIdx: index('idx_documents_shared_with_client').on(table.sharedWithClient),
  })
);
