import { boolean, integer, pgTable, serial, timestamp, unique } from 'drizzle-orm/pg-core';
import { notificationTypeEnum } from './notifications';
import { users } from './users';

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    notificationType: notificationTypeEnum('notification_type').notNull(),
    inAppEnabled: boolean('in_app_enabled').default(true).notNull(),
    emailEnabled: boolean('email_enabled').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userTypeUnique: unique('uq_notification_preferences_user_type').on(
      table.userId,
      table.notificationType
    ),
  })
);
