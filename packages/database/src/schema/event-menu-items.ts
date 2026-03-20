import { index, integer, pgTable, serial, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { eventMenus } from './event-menus';
import { menuItems } from './menu-items';

export const eventMenuItems = pgTable(
  'event_menu_items',
  {
    id: serial('id').primaryKey(),
    eventMenuId: integer('event_menu_id')
      .references(() => eventMenus.id, { onDelete: 'cascade' })
      .notNull(),
    menuItemId: integer('menu_item_id')
      .references(() => menuItems.id)
      .notNull(),
    quantityOverride: integer('quantity_override'),
    notes: text('notes'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventMenuIdIdx: index('idx_event_menu_items_event_menu_id').on(table.eventMenuId),
    menuItemIdIdx: index('idx_event_menu_items_menu_item_id').on(table.menuItemId),
    uniqueMenuItemPerMenu: unique('uq_event_menu_items_menu_item').on(
      table.eventMenuId,
      table.menuItemId
    ),
  })
);
