import { index, integer, pgEnum, pgTable, primaryKey, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const staffSkillEnum = pgEnum('staff_skill', [
  'food_safety_cert',
  'bartender',
  'sommelier',
  'lead_chef',
  'sous_chef',
  'prep_cook',
  'pastry_chef',
  'server',
  'event_coordinator',
  'barista',
]);

export const staffSkills = pgTable(
  'staff_skills',
  {
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    skill: staffSkillEnum('skill').notNull(),
    certifiedAt: timestamp('certified_at'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.skill] }),
    userIdIdx: index('idx_staff_skills_user_id').on(table.userId),
    skillIdx: index('idx_staff_skills_skill').on(table.skill),
  })
);
