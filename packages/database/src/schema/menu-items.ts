import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const menuItemCategoryEnum = pgEnum('menu_item_category', [
  'appetizer',
  'main',
  'side',
  'dessert',
  'beverage',
]);

export const dietaryTagEnum = pgEnum('dietary_tag', [
  'vegan',
  'vegetarian',
  'gluten_free',
  'halal',
  'kosher',
  'dairy_free',
  'nut_free',
]);

export const menuItems = pgTable(
  'menu_items',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    costPerPerson: numeric('cost_per_person', { precision: 10, scale: 2 }).notNull(),
    category: menuItemCategoryEnum('category').notNull(),
    allergens: text('allergens').array().default([]),
    dietaryTags: dietaryTagEnum('dietary_tags').array().default([]),
    isActive: boolean('is_active').default(true).notNull(),
    productionSteps: jsonb('production_steps'),
    createdBy: integer('created_by')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index('idx_menu_items_category').on(table.category),
    isActiveIdx: index('idx_menu_items_is_active').on(table.isActive),
  })
);
