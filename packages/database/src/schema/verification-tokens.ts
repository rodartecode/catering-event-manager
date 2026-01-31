import { pgTable, varchar, timestamp, primaryKey } from 'drizzle-orm/pg-core';

// Next-Auth verification tokens for magic link authentication
export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(), // Email address
    token: varchar('token', { length: 255 }).notNull(), // Unique token
    expires: timestamp('expires').notNull(), // Token expiration time
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
);
