import {
  events,
  resourceSchedule,
  resources,
  tasks,
} from '@catering-event-manager/database/schema';
import { TRPCError } from '@trpc/server';
import { and, eq, gt, gte, ilike, inArray, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { generateCSV } from '../services/csv';
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

// Multi-resource schedule query input
const getMultiResourceScheduleInput = z.object({
  resourceIds: z.array(z.number().positive()).min(1).max(50),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

// Create schedule entry input
const createScheduleEntryInput = z.object({
  resourceId: z.number().positive(),
  eventId: z.number().positive(),
  taskId: z.number().positive().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  notes: z.string().optional(),
  force: z.boolean().optional().default(false),
});

// Update schedule entry input
const updateScheduleEntryInput = z.object({
  scheduleId: z.number().positive(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  force: z.boolean().optional().default(false),
});

// Delete schedule entry input
const deleteScheduleEntryInput = z.object({
  scheduleId: z.number().positive(),
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
      nextCursor = nextItem?.id ?? null;
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

  // Bulk: Export resources as CSV
  exportCsv: adminProcedure
    .input(z.object({ type: resourceTypeEnum.optional() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const conditions = [];
      if (input.type) {
        conditions.push(eq(resources.type, input.type));
      }

      const results = await db
        .select({
          id: resources.id,
          name: resources.name,
          type: resources.type,
          hourlyRate: resources.hourlyRate,
          isAvailable: resources.isAvailable,
          notes: resources.notes,
          createdAt: resources.createdAt,
        })
        .from(resources)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(resources.name);

      const headers = ['ID', 'Name', 'Type', 'Hourly Rate', 'Available', 'Notes', 'Created At'];

      const rows = results.map((r) => [
        r.id,
        r.name,
        r.type,
        r.hourlyRate,
        r.isAvailable,
        r.notes,
        r.createdAt,
      ]);

      const csv = generateCSV(headers, rows);
      const date = new Date().toISOString().split('T')[0];
      return { csv, filename: `resources-${date}.csv`, rowCount: rows.length };
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

  // Get schedule entries for multiple resources (for scheduling calendar)
  getMultiResourceSchedule: protectedProcedure
    .input(getMultiResourceScheduleInput)
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const { resourceIds, startDate, endDate } = input;

      const entries = await db
        .select({
          id: resourceSchedule.id,
          resourceId: resourceSchedule.resourceId,
          eventId: resourceSchedule.eventId,
          eventName: events.eventName,
          taskId: resourceSchedule.taskId,
          taskTitle: tasks.title,
          startTime: resourceSchedule.startTime,
          endTime: resourceSchedule.endTime,
          notes: resourceSchedule.notes,
          createdAt: resourceSchedule.createdAt,
          updatedAt: resourceSchedule.updatedAt,
        })
        .from(resourceSchedule)
        .leftJoin(events, eq(resourceSchedule.eventId, events.id))
        .leftJoin(tasks, eq(resourceSchedule.taskId, tasks.id))
        .where(
          and(
            inArray(resourceSchedule.resourceId, resourceIds),
            gte(resourceSchedule.endTime, startDate),
            lte(resourceSchedule.startTime, endDate)
          )
        )
        .orderBy(resourceSchedule.startTime);

      return { entries };
    }),

  // Create a single schedule entry (drag-to-create on calendar)
  createScheduleEntry: adminProcedure
    .input(createScheduleEntryInput)
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { resourceId, eventId, taskId, startTime, endTime, notes, force } = input;

      // Validate time range
      if (endTime <= startTime) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'End time must be after start time',
        });
      }

      // Verify resource exists
      const [resource] = await db
        .select({ id: resources.id })
        .from(resources)
        .where(eq(resources.id, resourceId))
        .limit(1);

      if (!resource) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' });
      }

      // Verify event exists
      const [event] = await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
      }

      // Check conflicts via Go service
      let hasConflicts = false;
      let conflicts: Array<{
        resourceId: number;
        resourceName: string;
        conflictingEventName: string;
        message: string;
      }> = [];

      try {
        const result = await schedulingClient.checkConflicts({
          resource_ids: [resourceId],
          start_time: startTime,
          end_time: endTime,
        });

        hasConflicts = result.has_conflicts;
        conflicts = result.conflicts.map((c) => ({
          resourceId: c.resource_id,
          resourceName: c.resource_name,
          conflictingEventName: c.conflicting_event_name,
          message: c.message,
        }));
      } catch (error) {
        logger.error(
          'Conflict check failed during schedule entry creation',
          error instanceof Error ? error : new Error(String(error)),
          { context: 'createScheduleEntry', resourceId, eventId }
        );

        if (error instanceof SchedulingClientError) {
          if (error.code === 'TIMEOUT' || error.code === 'CONNECTION_ERROR') {
            if (!force) {
              return {
                success: false,
                conflicts: [],
                warning: 'Unable to verify conflicts - scheduling service unavailable',
              };
            }
          }
        }
        if (!force) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to check resource conflicts',
          });
        }
      }

      if (hasConflicts && !force) {
        return { success: false, conflicts, message: 'Resource scheduling conflicts detected' };
      }

      // Create the schedule entry
      const [entry] = await db
        .insert(resourceSchedule)
        .values({
          resourceId,
          eventId,
          taskId: taskId ?? null,
          startTime,
          endTime,
          notes: notes ?? null,
        })
        .returning();

      return { success: true, entry };
    }),

  // Update schedule entry times (drag-to-move / resize on calendar)
  updateScheduleEntry: adminProcedure
    .input(updateScheduleEntryInput)
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { scheduleId, startTime, endTime, force } = input;

      // Validate time range
      if (endTime <= startTime) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'End time must be after start time',
        });
      }

      // Verify entry exists
      const [existing] = await db
        .select({
          id: resourceSchedule.id,
          resourceId: resourceSchedule.resourceId,
        })
        .from(resourceSchedule)
        .where(eq(resourceSchedule.id, scheduleId))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule entry not found' });
      }

      // Check conflicts (exclude current entry so it doesn't conflict with itself)
      let hasConflicts = false;
      let conflicts: Array<{
        resourceId: number;
        resourceName: string;
        conflictingEventName: string;
        message: string;
      }> = [];

      try {
        const result = await schedulingClient.checkConflicts({
          resource_ids: [existing.resourceId],
          start_time: startTime,
          end_time: endTime,
          exclude_schedule_id: scheduleId,
        });

        hasConflicts = result.has_conflicts;
        conflicts = result.conflicts.map((c) => ({
          resourceId: c.resource_id,
          resourceName: c.resource_name,
          conflictingEventName: c.conflicting_event_name,
          message: c.message,
        }));
      } catch (error) {
        logger.error(
          'Conflict check failed during schedule entry update',
          error instanceof Error ? error : new Error(String(error)),
          { context: 'updateScheduleEntry', scheduleId }
        );

        if (error instanceof SchedulingClientError) {
          if (error.code === 'TIMEOUT' || error.code === 'CONNECTION_ERROR') {
            if (!force) {
              return {
                success: false,
                conflicts: [],
                warning: 'Unable to verify conflicts - scheduling service unavailable',
              };
            }
          }
        }
        if (!force) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to check resource conflicts',
          });
        }
      }

      if (hasConflicts && !force) {
        return { success: false, conflicts, message: 'Resource scheduling conflicts detected' };
      }

      // Update the entry
      const [updated] = await db
        .update(resourceSchedule)
        .set({ startTime, endTime, updatedAt: new Date() })
        .where(eq(resourceSchedule.id, scheduleId))
        .returning();

      return { success: true, entry: updated };
    }),

  // Delete a schedule entry
  deleteScheduleEntry: adminProcedure
    .input(deleteScheduleEntryInput)
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Verify entry exists
      const [existing] = await db
        .select({ id: resourceSchedule.id })
        .from(resourceSchedule)
        .where(eq(resourceSchedule.id, input.scheduleId))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule entry not found' });
      }

      await db.delete(resourceSchedule).where(eq(resourceSchedule.id, input.scheduleId));

      return { success: true };
    }),
});
