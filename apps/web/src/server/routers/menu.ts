import {
  dietaryTagEnum,
  eventMenuItems,
  eventMenus,
  events,
  menuItemCategoryEnum,
  menuItems,
} from '@catering-event-manager/database/schema';
import { TRPCError } from '@trpc/server';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { adminProcedure, protectedProcedure, router } from '../trpc';

// ── Input schemas ──────────────────────────────────────────────

const createItemInput = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().optional(),
  costPerPerson: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Cost must be a valid decimal with up to 2 decimal places'),
  category: z.enum(menuItemCategoryEnum.enumValues),
  allergens: z.array(z.string().trim().min(1)).default([]),
  dietaryTags: z.array(z.enum(dietaryTagEnum.enumValues)).default([]),
});

const updateItemInput = z.object({
  id: z.number().positive(),
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().nullable().optional(),
  costPerPerson: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Cost must be a valid decimal with up to 2 decimal places')
    .optional(),
  category: z.enum(menuItemCategoryEnum.enumValues).optional(),
  allergens: z.array(z.string().trim().min(1)).optional(),
  dietaryTags: z.array(z.enum(dietaryTagEnum.enumValues)).optional(),
});

const deleteItemInput = z.object({ id: z.number().positive() });

const listItemsInput = z.object({
  category: z.enum(menuItemCategoryEnum.enumValues).optional(),
  activeOnly: z.boolean().default(true),
});

const getItemByIdInput = z.object({ id: z.number().positive() });

const createEventMenuInput = z.object({
  eventId: z.number().positive(),
  name: z.string().trim().min(1).max(255),
  notes: z.string().trim().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

const updateEventMenuInput = z.object({
  id: z.number().positive(),
  name: z.string().trim().min(1).max(255).optional(),
  notes: z.string().trim().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const deleteEventMenuInput = z.object({ id: z.number().positive() });

const addItemToEventMenuInput = z.object({
  eventMenuId: z.number().positive(),
  menuItemId: z.number().positive(),
  quantityOverride: z.number().int().positive().optional(),
  notes: z.string().trim().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

const removeItemFromEventMenuInput = z.object({ id: z.number().positive() });

const updateEventMenuItemInput = z.object({
  id: z.number().positive(),
  quantityOverride: z.number().int().positive().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const listEventMenusInput = z.object({ eventId: z.number().positive() });

const eventIdInput = z.object({ eventId: z.number().positive() });

const shoppingListInput = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
});

// ── Router ─────────────────────────────────────────────────────

export const menuRouter = router({
  // ── Catalog CRUD ──

  createItem: adminProcedure.input(createItemInput).mutation(async ({ ctx, input }) => {
    const { db, session } = ctx;

    const [item] = await db
      .insert(menuItems)
      .values({
        name: input.name,
        description: input.description ?? null,
        costPerPerson: input.costPerPerson,
        category: input.category,
        allergens: input.allergens,
        dietaryTags: input.dietaryTags,
        createdBy: Number(session.user.id),
      })
      .returning();

    logger.info('Menu item created', { menuItemId: item.id, context: 'menu.createItem' });

    return item;
  }),

  updateItem: adminProcedure.input(updateItemInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;
    const { id, ...updates } = input;

    const existing = await db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(eq(menuItems.id, id))
      .then((rows) => rows[0]);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Menu item not found' });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.costPerPerson !== undefined) updateData.costPerPerson = updates.costPerPerson;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.allergens !== undefined) updateData.allergens = updates.allergens;
    if (updates.dietaryTags !== undefined) updateData.dietaryTags = updates.dietaryTags;

    const [updated] = await db
      .update(menuItems)
      .set(updateData)
      .where(eq(menuItems.id, id))
      .returning();

    logger.info('Menu item updated', { menuItemId: id, context: 'menu.updateItem' });

    return updated;
  }),

  deleteItem: adminProcedure.input(deleteItemInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;

    const existing = await db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(eq(menuItems.id, input.id))
      .then((rows) => rows[0]);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Menu item not found' });
    }

    // Soft delete — item may be referenced by event menus
    const [updated] = await db
      .update(menuItems)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(menuItems.id, input.id))
      .returning();

    logger.info('Menu item deactivated', { menuItemId: input.id, context: 'menu.deleteItem' });

    return updated;
  }),

  listItems: protectedProcedure.input(listItemsInput).query(async ({ ctx, input }) => {
    const { db } = ctx;

    const conditions = [];
    if (input.activeOnly) {
      conditions.push(eq(menuItems.isActive, true));
    }
    if (input.category) {
      conditions.push(eq(menuItems.category, input.category));
    }

    const results = await db
      .select()
      .from(menuItems)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(menuItems.name);

    return results;
  }),

  getItemById: protectedProcedure.input(getItemByIdInput).query(async ({ ctx, input }) => {
    const { db } = ctx;

    const item = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, input.id))
      .then((rows) => rows[0]);

    if (!item) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Menu item not found' });
    }

    return item;
  }),

  // ── Event Menu CRUD ──

  createEventMenu: adminProcedure.input(createEventMenuInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;

    const event = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, input.eventId))
      .then((rows) => rows[0]);

    if (!event) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
    }

    const [menu] = await db
      .insert(eventMenus)
      .values({
        eventId: input.eventId,
        name: input.name,
        notes: input.notes ?? null,
        sortOrder: input.sortOrder,
      })
      .returning();

    logger.info('Event menu created', {
      eventMenuId: menu.id,
      eventId: input.eventId,
      context: 'menu.createEventMenu',
    });

    return menu;
  }),

  updateEventMenu: adminProcedure.input(updateEventMenuInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;
    const { id, ...updates } = input;

    const existing = await db
      .select({ id: eventMenus.id })
      .from(eventMenus)
      .where(eq(eventMenus.id, id))
      .then((rows) => rows[0]);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Event menu not found' });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;

    const [updated] = await db
      .update(eventMenus)
      .set(updateData)
      .where(eq(eventMenus.id, id))
      .returning();

    logger.info('Event menu updated', { eventMenuId: id, context: 'menu.updateEventMenu' });

    return updated;
  }),

  deleteEventMenu: adminProcedure.input(deleteEventMenuInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;

    const existing = await db
      .select({ id: eventMenus.id })
      .from(eventMenus)
      .where(eq(eventMenus.id, input.id))
      .then((rows) => rows[0]);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Event menu not found' });
    }

    await db.delete(eventMenus).where(eq(eventMenus.id, input.id));

    logger.info('Event menu deleted', { eventMenuId: input.id, context: 'menu.deleteEventMenu' });

    return { success: true };
  }),

  addItemToEventMenu: adminProcedure
    .input(addItemToEventMenuInput)
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Verify event menu exists
      const menu = await db
        .select({ id: eventMenus.id })
        .from(eventMenus)
        .where(eq(eventMenus.id, input.eventMenuId))
        .then((rows) => rows[0]);

      if (!menu) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event menu not found' });
      }

      // Verify menu item exists and is active
      const item = await db
        .select({ id: menuItems.id, isActive: menuItems.isActive })
        .from(menuItems)
        .where(eq(menuItems.id, input.menuItemId))
        .then((rows) => rows[0]);

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Menu item not found' });
      }

      if (!item.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot add inactive menu item',
        });
      }

      const [entry] = await db
        .insert(eventMenuItems)
        .values({
          eventMenuId: input.eventMenuId,
          menuItemId: input.menuItemId,
          quantityOverride: input.quantityOverride ?? null,
          notes: input.notes ?? null,
          sortOrder: input.sortOrder,
        })
        .returning();

      logger.info('Item added to event menu', {
        eventMenuItemId: entry.id,
        eventMenuId: input.eventMenuId,
        menuItemId: input.menuItemId,
        context: 'menu.addItemToEventMenu',
      });

      return entry;
    }),

  removeItemFromEventMenu: adminProcedure
    .input(removeItemFromEventMenuInput)
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const existing = await db
        .select({ id: eventMenuItems.id })
        .from(eventMenuItems)
        .where(eq(eventMenuItems.id, input.id))
        .then((rows) => rows[0]);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event menu item not found' });
      }

      await db.delete(eventMenuItems).where(eq(eventMenuItems.id, input.id));

      logger.info('Item removed from event menu', {
        eventMenuItemId: input.id,
        context: 'menu.removeItemFromEventMenu',
      });

      return { success: true };
    }),

  updateEventMenuItem: adminProcedure
    .input(updateEventMenuItemInput)
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { id, ...updates } = input;

      const existing = await db
        .select({ id: eventMenuItems.id })
        .from(eventMenuItems)
        .where(eq(eventMenuItems.id, id))
        .then((rows) => rows[0]);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event menu item not found' });
      }

      const updateData: Record<string, unknown> = {};
      if (updates.quantityOverride !== undefined)
        updateData.quantityOverride = updates.quantityOverride;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;

      const [updated] = await db
        .update(eventMenuItems)
        .set(updateData)
        .where(eq(eventMenuItems.id, id))
        .returning();

      logger.info('Event menu item updated', {
        eventMenuItemId: id,
        context: 'menu.updateEventMenuItem',
      });

      return updated;
    }),

  // ── Queries ──

  listEventMenus: protectedProcedure.input(listEventMenusInput).query(async ({ ctx, input }) => {
    const { db } = ctx;

    const menus = await db
      .select()
      .from(eventMenus)
      .where(eq(eventMenus.eventId, input.eventId))
      .orderBy(eventMenus.sortOrder, eventMenus.name);

    // Fetch items for all menus in one query
    const menuIds = menus.map((m) => m.id);
    if (menuIds.length === 0) return [];

    const items = await db
      .select({
        eventMenuItem: eventMenuItems,
        menuItem: menuItems,
      })
      .from(eventMenuItems)
      .innerJoin(menuItems, eq(eventMenuItems.menuItemId, menuItems.id))
      .where(
        sql`${eventMenuItems.eventMenuId} IN (${sql.join(
          menuIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      )
      .orderBy(eventMenuItems.sortOrder);

    // Group items by event menu
    const itemsByMenu = new Map<number, typeof items>();
    for (const row of items) {
      const menuId = row.eventMenuItem.eventMenuId;
      if (!itemsByMenu.has(menuId)) {
        itemsByMenu.set(menuId, []);
      }
      itemsByMenu.get(menuId)?.push(row);
    }

    return menus.map((menu) => ({
      ...menu,
      items: (itemsByMenu.get(menu.id) || []).map((row) => ({
        ...row.eventMenuItem,
        menuItem: row.menuItem,
      })),
    }));
  }),

  getEventMenuCostEstimate: protectedProcedure.input(eventIdInput).query(async ({ ctx, input }) => {
    const { db } = ctx;

    // Get event's estimated_attendees
    const event = await db
      .select({ id: events.id, estimatedAttendees: events.estimatedAttendees })
      .from(events)
      .where(eq(events.id, input.eventId))
      .then((rows) => rows[0]);

    if (!event) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
    }

    const defaultQuantity = event.estimatedAttendees ?? 0;

    // Get all menu items for this event with their costs
    const rows = await db
      .select({
        costPerPerson: menuItems.costPerPerson,
        quantityOverride: eventMenuItems.quantityOverride,
        menuName: eventMenus.name,
        category: menuItems.category,
      })
      .from(eventMenuItems)
      .innerJoin(eventMenus, eq(eventMenuItems.eventMenuId, eventMenus.id))
      .innerJoin(menuItems, eq(eventMenuItems.menuItemId, menuItems.id))
      .where(eq(eventMenus.eventId, input.eventId));

    let total = 0;
    const byMenu: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const row of rows) {
      const cost = parseFloat(row.costPerPerson ?? '0');
      const qty = row.quantityOverride ?? defaultQuantity;
      const lineTotal = cost * qty;

      total += lineTotal;

      const menuName = row.menuName;
      byMenu[menuName] = (byMenu[menuName] || 0) + lineTotal;

      const cat = row.category;
      byCategory[cat] = (byCategory[cat] || 0) + lineTotal;
    }

    return {
      totalEstimate: Math.round(total * 100) / 100,
      estimatedAttendees: defaultQuantity,
      itemCount: rows.length,
      byMenu: Object.entries(byMenu).map(([name, menuTotal]) => ({
        name,
        total: Math.round(menuTotal * 100) / 100,
      })),
      byCategory: Object.entries(byCategory).map(([category, catTotal]) => ({
        category,
        total: Math.round(catTotal * 100) / 100,
      })),
    };
  }),

  getEventDietarySummary: protectedProcedure.input(eventIdInput).query(async ({ ctx, input }) => {
    const { db } = ctx;

    const rows = await db
      .select({
        allergens: menuItems.allergens,
        dietaryTags: menuItems.dietaryTags,
      })
      .from(eventMenuItems)
      .innerJoin(eventMenus, eq(eventMenuItems.eventMenuId, eventMenus.id))
      .innerJoin(menuItems, eq(eventMenuItems.menuItemId, menuItems.id))
      .where(eq(eventMenus.eventId, input.eventId));

    const allergenSet = new Set<string>();
    const dietaryTagSet = new Set<string>();

    for (const row of rows) {
      if (row.allergens) {
        for (const a of row.allergens) {
          if (a) allergenSet.add(a);
        }
      }
      if (row.dietaryTags) {
        for (const t of row.dietaryTags) {
          if (t) dietaryTagSet.add(t);
        }
      }
    }

    return {
      allergens: Array.from(allergenSet).sort(),
      dietaryTags: Array.from(dietaryTagSet).sort(),
      itemCount: rows.length,
    };
  }),

  getShoppingList: protectedProcedure.input(shoppingListInput).query(async ({ ctx, input }) => {
    const { db } = ctx;

    const rows = await db
      .select({
        menuItemId: menuItems.id,
        name: menuItems.name,
        category: menuItems.category,
        costPerPerson: menuItems.costPerPerson,
        quantityOverride: eventMenuItems.quantityOverride,
        estimatedAttendees: events.estimatedAttendees,
        eventName: events.eventName,
      })
      .from(eventMenuItems)
      .innerJoin(eventMenus, eq(eventMenuItems.eventMenuId, eventMenus.id))
      .innerJoin(menuItems, eq(eventMenuItems.menuItemId, menuItems.id))
      .innerJoin(events, eq(eventMenus.eventId, events.id))
      .where(
        and(
          gte(events.eventDate, input.dateFrom),
          lte(events.eventDate, input.dateTo),
          eq(events.isArchived, false)
        )
      );

    // Aggregate by menu item
    const aggregated = new Map<
      number,
      {
        name: string;
        category: string;
        costPerPerson: string;
        totalQuantity: number;
        eventNames: Set<string>;
      }
    >();

    for (const row of rows) {
      const qty = row.quantityOverride ?? row.estimatedAttendees ?? 0;

      if (!aggregated.has(row.menuItemId)) {
        aggregated.set(row.menuItemId, {
          name: row.name,
          category: row.category,
          costPerPerson: row.costPerPerson,
          totalQuantity: 0,
          eventNames: new Set(),
        });
      }

      const entry = aggregated.get(row.menuItemId)!;
      entry.totalQuantity += qty;
      entry.eventNames.add(row.eventName);
    }

    return Array.from(aggregated.entries()).map(([menuItemId, data]) => ({
      menuItemId,
      name: data.name,
      category: data.category,
      totalQuantity: data.totalQuantity,
      estimatedCost: Math.round(parseFloat(data.costPerPerson) * data.totalQuantity * 100) / 100,
      eventCount: data.eventNames.size,
      events: Array.from(data.eventNames),
    }));
  }),

  // ── Production Steps Template ───────────────────────────────────

  updateProductionSteps: adminProcedure
    .input(
      z.object({
        menuItemId: z.number().positive(),
        productionSteps: z
          .array(
            z.object({
              name: z.string().min(1).max(255),
              prepType: z.string().min(1),
              stationType: z.string().min(1),
              durationMinutes: z.number().int().min(1),
              offsetMinutes: z.number().int(),
            })
          )
          .nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .update(menuItems)
        .set({
          productionSteps: input.productionSteps,
          updatedAt: new Date(),
        })
        .where(eq(menuItems.id, input.menuItemId))
        .returning();
      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Menu item not found' });
      }
      logger.info('Production steps updated', {
        menuItemId: input.menuItemId,
        stepCount: input.productionSteps?.length ?? 0,
        context: 'menu.updateProductionSteps',
      });
      return item;
    }),
});
