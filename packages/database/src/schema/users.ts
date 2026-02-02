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
import { clients } from './clients';

export const userRoleEnum = pgEnum('user_role', ['administrator', 'manager', 'client']);

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }), // Nullable for magic link clients
    name: varchar('name', { length: 255 }).notNull(),
    role: userRoleEnum('role').default('manager').notNull(),
    clientId: integer('client_id').references(() => clients.id), // Link to client for portal users
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_users_client_id').on(table.clientId)]
);
