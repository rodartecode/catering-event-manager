import { resourceSchedule, resources } from '@catering-event-manager/database/schema';
import { TRPCError } from '@trpc/server';
import { and, eq, gt, ilike, sql } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { SchedulingClientError, schedulingClient } from '../services/scheduling-client';
import { adminProcedure, protectedProcedure, router } from '../trpc';

// Resource type enum for validation
const resourceTypeEnum = z.enum(['staff', 'equipment', 'materials']);

// Resource create input schema
const createResourceInput = z.object({
  name: z.string().trim().min(1).max(255),
  type: resourceTypeEnum,
  hourlyRate: z.string().optional(), // numeric stored as string
  notes: z.string().optional(),
});

// Resource list input schema
const listResourcesInput = z.object({
  type: resourceTypeEnum.optional(),
  isAvailable: z.boolean().optional(),
  query: z.string().min(2).max(100).optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.number().optional(),
});

// Resource schedule query input
const getScheduleInput = z.object({
  resourceId: z.number().positive(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

// Check conflicts input
const checkConflictsInput = z.object({
  resourceIds: z.array(z.number().positive()).min(1),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  excludeScheduleId: z.number().positive().optional(),
});

// Update resource input
const updateResourceInput = z.object({
  id: z.number().positive(),
  name: z.string().trim().min(1).max(255).optional(),
  type: resourceTypeEnum.optional(),
  hourlyRate: z.string().optional().nullable(),
  isAvailable: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export const resourceRouter = router({
  // FR-015: Create resource (administrators only)
  create: adminProcedure.input(createResourceInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;

    // Check for duplicate name
    const [existing] = await db
      .select({ id: resources.id })
      .from(resources)
      .where(eq(resources.name, input.name))
      .limit(1);

    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A resource with this name already exists',
      });
    }

    // Create resource
    const [resource] = await db
      .insert(resources)
      .values({
        name: input.name,
        type: input.type,
        hourlyRate: input.hourlyRate,
        notes: input.notes,
      })
      .returning();

    return resource;
  }),

  // FR-015: List resources with filters
  list: protectedProcedure.input(listResourcesInput).query(async ({ ctx, input }) => {
    const { db } = ctx;
    const { type, isAvailable, query, limit, cursor } = input;

    // Build where conditions
    const conditions = [];

    if (type) {
      conditions.push(eq(resources.type, type));
    }

    if (isAvailable !== undefined) {
      conditions.push(eq(resources.isAvailable, isAvailable));
    }

    if (query) {
      conditions.push(ilike(resources.name, `%${query}%`));
    }

    if (cursor) {
      conditions.push(sql`${resources.id} > ${cursor}`);
    }

    // Query resources
    const results = await db
      .select()
      .from(resources)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(resources.name)
      .limit(limit + 1);

    let nextCursor: number | null = null;
    if (results.length > limit) {
      const nextItem = results.pop();
      nextCursor = nextItem!.id;
    }

    return {
      items: results,
      nextCursor,
    };
  }),

  // FR-015: Get resource by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const [resource] = await db
        .select()
        .from(resources)
        .where(eq(resources.id, input.id))
        .limit(1);

      if (!resource) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Resource not found',
        });
      }

      // Get upcoming schedule count
      const now = new Date();
      const scheduleCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(resourceSchedule)
        .where(and(eq(resourceSchedule.resourceId, input.id), gt(resourceSchedule.endTime, now)));

      return {
        ...resource,
        upcomingAssignments: Number(scheduleCount[0]?.count || 0),
      };
    }),

  // FR-018: Get resource schedule calling Go service
  getSchedule: protectedProcedure.input(getScheduleInput).query(async ({ input }) => {
    try {
      const result = await schedulingClient.getResourceAvailability({
        resource_id: input.resourceId,
        start_date: input.startDate,
        end_date: input.endDate,
      });

      // Transform snake_case to camelCase for frontend
      return {
        resourceId: result.resource_id,
        entries: result.entries.map((entry) => ({
          id: entry.id,
          resourceId: entry.resource_id,
          eventId: entry.event_id,
          eventName: entry.event_name,
          taskId: entry.task_id,
          taskTitle: entry.task_title,
          startTime: new Date(entry.start_time),
          endTime: new Date(entry.end_time),
          notes: entry.notes,
          createdAt: new Date(entry.created_at),
          updatedAt: new Date(entry.updated_at),
        })),
      };
    } catch (error) {
      logger.error(
        'Get resource schedule failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          context: 'getSchedule',
          resourceId: input.resourceId,
          dateRange: { start: input.startDate.toISOString(), end: input.endDate.toISOString() },
          code: error instanceof SchedulingClientError ? error.code : undefined,
        }
      );

      if (error instanceof SchedulingClientError) {
        if (error.code === 'TIMEOUT' || error.code === 'CONNECTION_ERROR') {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unable to reach scheduling service. Please try again.',
          });
        }
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get resource schedule',
      });
    }
  }),

  // FR-017, FR-019: Check for scheduling conflicts
  checkConflicts: protectedProcedure.input(checkConflictsInput).query(async ({ input }) => {
    try {
      const result = await schedulingClient.checkConflicts({
        resource_ids: input.resourceIds,
        start_time: input.startTime,
        end_time: input.endTime,
        exclude_schedule_id: input.excludeScheduleId,
      });

      // Transform snake_case to camelCase for frontend
      return {
        hasConflicts: result.has_conflicts,
        conflicts: result.conflicts.map((conflict) => ({
          resourceId: conflict.resource_id,
          resourceName: conflict.resource_name,
          conflictingEventId: conflict.conflicting_event_id,
          conflictingEventName: conflict.conflicting_event_name,
          conflictingTaskId: conflict.conflicting_task_id,
          conflictingTaskTitle: conflict.conflicting_task_title,
          existingStartTime: new Date(conflict.existing_start_time),
          existingEndTime: new Date(conflict.existing_end_time),
          requestedStartTime: new Date(conflict.requested_start_time),
          requestedEndTime: new Date(conflict.requested_end_time),
          message: conflict.message,
        })),
      };
    } catch (error) {
      logger.error(
        'Check conflicts failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          context: 'checkConflicts',
          resourceIds: input.resourceIds.slice(0, 5),
          timeRange: { start: input.startTime.toISOString(), end: input.endTime.toISOString() },
          code: error instanceof SchedulingClientError ? error.code : undefined,
        }
      );

      if (error instanceof SchedulingClientError) {
        if (error.code === 'TIMEOUT' || error.code === 'CONNECTION_ERROR') {
          // Return empty conflicts with warning when service unavailable
          return {
            hasConflicts: false,
            conflicts: [],
            warning: 'Unable to verify conflicts - scheduling service unavailable',
          };
        }
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to check conflicts',
      });
    }
  }),

  // FR-015: Update resource (administrators only)
  update: adminProcedure.input(updateResourceInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;
    const { id, ...updates } = input;

    // Verify resource exists
    const [existing] = await db.select().from(resources).where(eq(resources.id, id)).limit(1);

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Resource not found',
      });
    }

    // Check for duplicate name if being updated
    if (updates.name && updates.name !== existing.name) {
      const [duplicate] = await db
        .select({ id: resources.id })
        .from(resources)
        .where(eq(resources.name, updates.name))
        .limit(1);

      if (duplicate) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A resource with this name already exists',
        });
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.hourlyRate !== undefined) updateData.hourlyRate = updates.hourlyRate;
    if (updates.isAvailable !== undefined) updateData.isAvailable = updates.isAvailable;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const [updated] = await db
      .update(resources)
      .set(updateData)
      .where(eq(resources.id, id))
      .returning();

    return updated;
  }),

  // FR-015: Delete resource (administrators only)
  delete: adminProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Verify resource exists
      const [resource] = await db
        .select()
        .from(resources)
        .where(eq(resources.id, input.id))
        .limit(1);

      if (!resource) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Resource not found',
        });
      }

      // Check for active assignments
      const now = new Date();
      const [activeAssignment] = await db
        .select({ id: resourceSchedule.id })
        .from(resourceSchedule)
        .where(and(eq(resourceSchedule.resourceId, input.id), gt(resourceSchedule.endTime, now)))
        .limit(1);

      if (activeAssignment) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete resource with active or upcoming assignments',
        });
      }

      // Delete resource (cascades to task_resources and resource_schedule)
      await db.delete(resources).where(eq(resources.id, input.id));

      return { success: true };
    }),

  // Get resources available for assignment
  getAvailable: protectedProcedure
    .input(z.object({ type: resourceTypeEnum.optional() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const conditions = [eq(resources.isAvailable, true)];
      if (input.type) {
        conditions.push(eq(resources.type, input.type));
      }

      const availableResources = await db
        .select({
          id: resources.id,
          name: resources.name,
          type: resources.type,
          hourlyRate: resources.hourlyRate,
        })
        .from(resources)
        .where(and(...conditions))
        .orderBy(resources.type, resources.name);

      return availableResources;
    }),

  // Health check for scheduling service
  schedulingServiceHealth: protectedProcedure.query(async () => {
    const isHealthy = await schedulingClient.healthCheck();
    return { isHealthy };
  }),
});
