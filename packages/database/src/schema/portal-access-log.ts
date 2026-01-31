import { pgTable, serial, integer, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { clients } from './clients';

// Audit log for client portal access
export const portalAccessLog = pgTable(
  'portal_access_log',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    clientId: integer('client_id')
      .references(() => clients.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(), // e.g., 'login', 'view_event', 'view_tasks'
    resourceType: varchar('resource_type', { length: 50 }), // e.g., 'event', 'task', 'communication'
    resourceId: integer('resource_id'), // ID of the accessed resource
    ipAddress: varchar('ip_address', { length: 45 }), // IPv4 or IPv6
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  (table) => [
    index('idx_portal_access_log_user_id').on(table.userId),
    index('idx_portal_access_log_client_id').on(table.clientId),
    index('idx_portal_access_log_timestamp').on(table.timestamp),
  ]
);
