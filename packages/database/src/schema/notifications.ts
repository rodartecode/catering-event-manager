import {
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const notificationTypeEnum = pgEnum('notification_type', [
  'task_assigned',
  'status_changed',
  'overdue',
  'follow_up_due',
]);

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body'),
    readAt: timestamp('read_at', { withTimezone: true }),
    entityType: varchar('entity_type', { length: 50 }),
    entityId: integer('entity_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_notifications_user_id').on(table.userId),
    userIdReadAtIdx: index('idx_notifications_user_id_read_at').on(table.userId, table.readAt),
    entityIdx: index('idx_notifications_entity').on(table.entityType, table.entityId),
    createdAtIdx: index('idx_notifications_created_at').on(table.createdAt),
  })
);
