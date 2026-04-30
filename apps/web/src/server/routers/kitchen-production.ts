import {
  eventMenuItems,
  eventMenus,
  events,
  kitchenStations,
  menuItems,
  type ProductionStepTemplate,
  productionTasks,
  users,
} from '@catering-event-manager/database/schema';
import { TRPCError } from '@trpc/server';
import { and, eq, ilike } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { adminProcedure, protectedProcedure, router } from '../trpc';

const stationTypes = [
  'oven',
  'grill',
  'prep_counter',
  'cold_storage',
  'stovetop',
  'fryer',
  'mixer',
] as const;

const prepTypes = [
  'marinate',
  'bake',
  'grill',
  'plate',
  'chop',
  'mix',
  'chill',
  'fry',
  'assemble',
  'garnish',
] as const;

const productionTaskStatuses = ['pending', 'in_progress', 'completed', 'skipped'] as const;

/**
 * Compute scheduledStart and scheduledEnd from event date and offset/duration.
 */
function computeScheduledTimes(
  eventDate: Date,
  offsetMinutes: number,
  durationMinutes: number
): { scheduledStart: Date; scheduledEnd: Date } {
  const scheduledStart = new Date(eventDate.getTime() + offsetMinutes * 60 * 1000);
  const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60 * 1000);
  return { scheduledStart, scheduledEnd };
}

// ============================================
// Station Router
// ============================================

const stationRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          query: z.string().min(1).max(100).optional(),
          type: z.enum(stationTypes).optional(),
          venueId: z.number().optional(),
          isActive: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input?.isActive !== undefined) {
        conditions.push(eq(kitchenStations.isActive, input.isActive));
      } else {
        conditions.push(eq(kitchenStations.isActive, true));
      }

      if (input?.query) {
        const pattern = `%${input.query}%`;
        conditions.push(ilike(kitchenStations.name, pattern));
      }

      if (input?.type) {
        conditions.push(eq(kitchenStations.type, input.type));
      }

      if (input?.venueId !== undefined) {
        conditions.push(eq(kitchenStations.venueId, input.venueId));
      }

      return ctx.db
        .select()
        .from(kitchenStations)
        .where(and(...conditions))
        .orderBy(kitchenStations.name);
    }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const [station] = await ctx.db
      .select()
      .from(kitchenStations)
      .where(eq(kitchenStations.id, input.id));
    if (!station) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Kitchen station not found' });
    }
    return station;
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(255),
        type: z.enum(stationTypes),
        capacity: z.number().int().min(1).default(1),
        venueId: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [station] = await ctx.db.insert(kitchenStations).values(input).returning();
        logger.info('Kitchen station created', {
          stationId: station.id,
          context: 'station.create',
        });
        return station;
      } catch (error) {
        logger.error(
          'Failed to create kitchen station',
          error instanceof Error ? error : new Error(String(error)),
          { context: 'station.create' }
        );
        throw error;
      }
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().trim().min(1).max(255).optional(),
        type: z.enum(stationTypes).optional(),
        capacity: z.number().int().min(1).optional(),
        venueId: z.number().nullable().optional(),
        notes: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [station] = await ctx.db
        .update(kitchenStations)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(kitchenStations.id, id))
        .returning();
      if (!station) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Kitchen station not found' });
      }
      return station;
    }),
});

// ============================================
// Production Task Router
// ============================================

const taskRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        eventId: z.number(),
        status: z.enum(productionTaskStatuses).optional(),
        stationId: z.number().optional(),
        prepType: z.enum(prepTypes).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(productionTasks.eventId, input.eventId)];

      if (input.status) {
        conditions.push(eq(productionTasks.status, input.status));
      }

      if (input.stationId) {
        conditions.push(eq(productionTasks.stationId, input.stationId));
      }

      if (input.prepType) {
        conditions.push(eq(productionTasks.prepType, input.prepType));
      }

      return ctx.db
        .select()
        .from(productionTasks)
        .where(and(...conditions))
        .orderBy(productionTasks.scheduledStart);
    }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const [task] = await ctx.db
      .select()
      .from(productionTasks)
      .where(eq(productionTasks.id, input.id));
    if (!task) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Production task not found' });
    }
    return task;
  }),

  create: adminProcedure
    .input(
      z.object({
        eventId: z.number(),
        menuItemId: z.number().optional(),
        stationId: z.number().optional(),
        name: z.string().trim().min(1).max(255),
        prepType: z.enum(prepTypes),
        durationMinutes: z.number().int().min(1),
        offsetMinutes: z.number().int(),
        servings: z.number().int().positive().optional(),
        assignedTo: z.number().optional(),
        dependsOnTaskId: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify event exists and get its date
      const [event] = await ctx.db
        .select({ id: events.id, eventDate: events.eventDate })
        .from(events)
        .where(eq(events.id, input.eventId));
      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
      }

      // Verify dependency belongs to same event
      if (input.dependsOnTaskId) {
        const [dep] = await ctx.db
          .select({ id: productionTasks.id })
          .from(productionTasks)
          .where(
            and(
              eq(productionTasks.id, input.dependsOnTaskId),
              eq(productionTasks.eventId, input.eventId)
            )
          );
        if (!dep) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Dependency task not found or belongs to a different event',
          });
        }
      }

      const { scheduledStart, scheduledEnd } = computeScheduledTimes(
        event.eventDate,
        input.offsetMinutes,
        input.durationMinutes
      );

      try {
        const [task] = await ctx.db
          .insert(productionTasks)
          .values({
            ...input,
            scheduledStart,
            scheduledEnd,
          })
          .returning();
        logger.info('Production task created', {
          taskId: task.id,
          eventId: input.eventId,
          context: 'kitchenProduction.task.create',
        });
        return task;
      } catch (error) {
        logger.error(
          'Failed to create production task',
          error instanceof Error ? error : new Error(String(error)),
          { context: 'kitchenProduction.task.create' }
        );
        throw error;
      }
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        stationId: z.number().nullable().optional(),
        name: z.string().trim().min(1).max(255).optional(),
        prepType: z.enum(prepTypes).optional(),
        durationMinutes: z.number().int().min(1).optional(),
        offsetMinutes: z.number().int().optional(),
        servings: z.number().int().positive().nullable().optional(),
        assignedTo: z.number().nullable().optional(),
        dependsOnTaskId: z.number().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Get existing task to check if we need to recompute times
      const [existing] = await ctx.db
        .select()
        .from(productionTasks)
        .where(eq(productionTasks.id, id));
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Production task not found' });
      }

      let scheduledTimes = {};
      const newOffset = data.offsetMinutes ?? existing.offsetMinutes;
      const newDuration = data.durationMinutes ?? existing.durationMinutes;

      if (data.offsetMinutes !== undefined || data.durationMinutes !== undefined) {
        const [event] = await ctx.db
          .select({ eventDate: events.eventDate })
          .from(events)
          .where(eq(events.id, existing.eventId));
        if (event) {
          scheduledTimes = computeScheduledTimes(event.eventDate, newOffset, newDuration);
        }
      }

      const [task] = await ctx.db
        .update(productionTasks)
        .set({ ...data, ...scheduledTimes, updatedAt: new Date() })
        .where(eq(productionTasks.id, id))
        .returning();
      return task;
    }),

  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const [deleted] = await ctx.db
      .delete(productionTasks)
      .where(eq(productionTasks.id, input.id))
      .returning({ id: productionTasks.id });
    if (!deleted) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Production task not found' });
    }
    return deleted;
  }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(productionTaskStatuses),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [task] = await ctx.db
        .update(productionTasks)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(productionTasks.id, input.id))
        .returning();
      if (!task) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Production task not found' });
      }
      return task;
    }),
});

// ============================================
// Timeline Router
// ============================================

const timelineRouter = router({
  getByEvent: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ ctx, input }) => {
      const tasks = await ctx.db
        .select({
          task: productionTasks,
          stationName: kitchenStations.name,
          stationType: kitchenStations.type,
          menuItemName: menuItems.name,
          assignedToName: users.name,
        })
        .from(productionTasks)
        .leftJoin(kitchenStations, eq(productionTasks.stationId, kitchenStations.id))
        .leftJoin(menuItems, eq(productionTasks.menuItemId, menuItems.id))
        .leftJoin(users, eq(productionTasks.assignedTo, users.id))
        .where(eq(productionTasks.eventId, input.eventId))
        .orderBy(productionTasks.scheduledStart);

      return tasks;
    }),

  recalculate: adminProcedure
    .input(z.object({ eventId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [event] = await ctx.db
        .select({ id: events.id, eventDate: events.eventDate })
        .from(events)
        .where(eq(events.id, input.eventId));
      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
      }

      const tasks = await ctx.db
        .select()
        .from(productionTasks)
        .where(eq(productionTasks.eventId, input.eventId));

      let updated = 0;
      for (const task of tasks) {
        const { scheduledStart, scheduledEnd } = computeScheduledTimes(
          event.eventDate,
          task.offsetMinutes,
          task.durationMinutes
        );
        await ctx.db
          .update(productionTasks)
          .set({ scheduledStart, scheduledEnd, updatedAt: new Date() })
          .where(eq(productionTasks.id, task.id));
        updated++;
      }

      logger.info('Timeline recalculated', {
        eventId: input.eventId,
        tasksUpdated: updated,
        context: 'kitchenProduction.timeline.recalculate',
      });

      return { updated };
    }),
});

// ============================================
// Combined Router
// ============================================

export const kitchenProductionRouter = router({
  station: stationRouter,
  task: taskRouter,
  timeline: timelineRouter,

  autoGenerate: adminProcedure
    .input(
      z.object({
        eventId: z.number(),
        clearExisting: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get event with date
      const [event] = await ctx.db
        .select({
          id: events.id,
          eventDate: events.eventDate,
          estimatedAttendees: events.estimatedAttendees,
        })
        .from(events)
        .where(eq(events.id, input.eventId));
      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
      }

      // Get all menu items for this event via eventMenuItems → eventMenus
      const items = await ctx.db
        .select({
          menuItemId: menuItems.id,
          menuItemName: menuItems.name,
          productionSteps: menuItems.productionSteps,
          quantityOverride: eventMenuItems.quantityOverride,
        })
        .from(eventMenuItems)
        .innerJoin(eventMenus, eq(eventMenuItems.eventMenuId, eventMenus.id))
        .innerJoin(menuItems, eq(eventMenuItems.menuItemId, menuItems.id))
        .where(eq(eventMenus.eventId, input.eventId));

      // Clear existing auto-generated tasks if requested
      if (input.clearExisting) {
        await ctx.db
          .delete(productionTasks)
          .where(
            and(
              eq(productionTasks.eventId, input.eventId),
              eq(productionTasks.isAutoGenerated, true)
            )
          );
      }

      // Get available stations for auto-assignment
      const stations = await ctx.db
        .select()
        .from(kitchenStations)
        .where(eq(kitchenStations.isActive, true));

      let created = 0;
      for (const item of items) {
        if (!item.productionSteps) continue;

        const steps = item.productionSteps as ProductionStepTemplate[];
        if (!Array.isArray(steps)) continue;

        for (const step of steps) {
          const { scheduledStart, scheduledEnd } = computeScheduledTimes(
            event.eventDate,
            step.offsetMinutes,
            step.durationMinutes
          );

          // Auto-assign station: match by type, prefer first available
          const matchingStation = stations.find((s) => s.type === step.stationType);

          const servings = item.quantityOverride ?? event.estimatedAttendees ?? undefined;

          await ctx.db.insert(productionTasks).values({
            eventId: input.eventId,
            menuItemId: item.menuItemId,
            stationId: matchingStation?.id ?? null,
            name: step.name || `${step.prepType} ${item.menuItemName}`,
            prepType: step.prepType as (typeof prepTypes)[number],
            durationMinutes: step.durationMinutes,
            offsetMinutes: step.offsetMinutes,
            scheduledStart,
            scheduledEnd,
            servings: servings ?? null,
            isAutoGenerated: true,
          });
          created++;
        }
      }

      logger.info('Production tasks auto-generated', {
        eventId: input.eventId,
        tasksCreated: created,
        menuItemsProcessed: items.length,
        context: 'kitchenProduction.autoGenerate',
      });

      return { created, menuItemsProcessed: items.length };
    }),
});
