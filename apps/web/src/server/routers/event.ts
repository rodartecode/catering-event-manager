import {
  clients,
  eventStatusLog,
  events,
  tasks,
  taskTemplateItems,
  taskTemplates,
  users,
} from '@catering-event-manager/database/schema';
import { TRPCError } from '@trpc/server';
import { addDays, differenceInMilliseconds } from 'date-fns';
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { adminProcedure, protectedProcedure, router } from '../trpc';

// Event status enum for validation
const eventStatusEnum = z.enum([
  'inquiry',
  'planning',
  'preparation',
  'in_progress',
  'completed',
  'follow_up',
]);

// Event create input schema
const createEventInput = z.object({
  clientId: z.number().positive(),
  eventName: z.string().trim().min(1).max(255),
  eventDate: z.coerce.date(),
  location: z.string().max(500).optional(),
  estimatedAttendees: z.number().positive().optional(),
  notes: z.string().optional(),
  templateId: z.number().positive().optional(),
});

// Event list input schema
const listEventsInput = z.object({
  status: z
    .enum(['inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up', 'all'])
    .optional(),
  clientId: z.number().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.number().optional(),
});

// Event update input schema
const updateEventInput = z.object({
  id: z.number().positive(),
  eventName: z.string().trim().min(1).max(255).optional(),
  eventDate: z.coerce.date().optional(),
  location: z.string().max(500).optional(),
  estimatedAttendees: z.number().positive().optional(),
  notes: z.string().optional(),
});

// Event status update input schema
const updateStatusInput = z.object({
  id: z.number().positive(),
  newStatus: eventStatusEnum,
  notes: z.string().optional(),
});

// Event clone input schema
const cloneEventInput = z.object({
  sourceEventId: z.number().positive(),
  eventDate: z.coerce.date(),
  clientId: z.number().positive().optional(),
  eventName: z.string().trim().min(1).max(255).optional(),
  location: z.string().max(500).optional(),
  estimatedAttendees: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const eventRouter = router({
  // FR-001: Create event (administrators only)
  create: adminProcedure.input(createEventInput).mutation(async ({ ctx, input }) => {
    const { db, session } = ctx;

    // Verify client exists
    const [client] = await db.select().from(clients).where(eq(clients.id, input.clientId)).limit(1);

    if (!client) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Client not found',
      });
    }

    // If templateId provided, verify template exists
    if (input.templateId) {
      const [template] = await db
        .select()
        .from(taskTemplates)
        .where(eq(taskTemplates.id, input.templateId))
        .limit(1);

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }
    }

    // Create event with optional templateId
    const [event] = await db
      .insert(events)
      .values({
        clientId: input.clientId,
        eventName: input.eventName,
        eventDate: input.eventDate,
        location: input.location,
        estimatedAttendees: input.estimatedAttendees,
        notes: input.notes,
        status: 'inquiry',
        createdBy: parseInt(session.user.id, 10),
        templateId: input.templateId ?? null,
      })
      .returning();

    // Log initial status
    await db.insert(eventStatusLog).values({
      eventId: event.id,
      oldStatus: null,
      newStatus: 'inquiry',
      changedBy: parseInt(session.user.id, 10),
      notes: 'Event created',
    });

    // Generate tasks from template if provided
    if (input.templateId) {
      const templateItems = await db
        .select()
        .from(taskTemplateItems)
        .where(eq(taskTemplateItems.templateId, input.templateId))
        .orderBy(asc(taskTemplateItems.sortOrder));

      // Map sortOrder -> created task ID for dependency resolution
      const taskIdMap = new Map<number, number>();

      for (const item of templateItems) {
        const dueDate = addDays(input.eventDate, item.daysOffset);
        const dependsOnTaskId = item.dependsOnIndex
          ? (taskIdMap.get(item.dependsOnIndex) ?? null)
          : null;

        const [createdTask] = await db
          .insert(tasks)
          .values({
            eventId: event.id,
            title: item.title,
            description: item.description,
            category: item.category,
            dueDate,
            dependsOnTaskId,
            status: 'pending',
          })
          .returning({ id: tasks.id });

        taskIdMap.set(item.sortOrder, createdTask.id);
      }
    }

    return event;
  }),

  // FR-004: List events with filters and pagination
  list: protectedProcedure.input(listEventsInput).query(async ({ ctx, input }) => {
    const { db } = ctx;
    const { status, clientId, dateFrom, dateTo, limit, cursor } = input;

    // Build where conditions
    const conditions = [eq(events.isArchived, false)];

    if (status && status !== 'all') {
      conditions.push(eq(events.status, status));
    }

    if (clientId) {
      conditions.push(eq(events.clientId, clientId));
    }

    if (dateFrom) {
      conditions.push(gte(events.eventDate, dateFrom));
    }

    if (dateTo) {
      conditions.push(lte(events.eventDate, dateTo));
    }

    if (cursor) {
      conditions.push(gte(events.id, cursor));
    }

    // Query events with client info and task counts
    const results = await db
      .select({
        id: events.id,
        eventName: events.eventName,
        clientName: clients.companyName,
        eventDate: events.eventDate,
        status: events.status,
        taskCount: sql<number>`COALESCE(COUNT(DISTINCT tasks.id), 0)`,
        completedTaskCount: sql<number>`COALESCE(COUNT(DISTINCT CASE WHEN tasks.status = 'completed' THEN tasks.id END), 0)`,
      })
      .from(events)
      .leftJoin(clients, eq(events.clientId, clients.id))
      .leftJoin(sql`tasks`, sql`tasks.event_id = ${events.id}`)
      .where(and(...conditions))
      .groupBy(events.id, clients.companyName)
      .orderBy(desc(events.eventDate))
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

  // FR-005: Get event by ID with full details
  getById: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // Get event with client info
      const [event] = await db
        .select({
          id: events.id,
          eventName: events.eventName,
          eventDate: events.eventDate,
          location: events.location,
          status: events.status,
          estimatedAttendees: events.estimatedAttendees,
          notes: events.notes,
          isArchived: events.isArchived,
          archivedAt: events.archivedAt,
          clonedFromEventId: events.clonedFromEventId,
          createdAt: events.createdAt,
          updatedAt: events.updatedAt,
          client: {
            id: clients.id,
            companyName: clients.companyName,
            contactName: clients.contactName,
            email: clients.email,
            phone: clients.phone,
          },
        })
        .from(events)
        .leftJoin(clients, eq(events.clientId, clients.id))
        .where(eq(events.id, input.id))
        .limit(1);

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      // Get status history
      const statusHistory = await db
        .select({
          id: eventStatusLog.id,
          oldStatus: eventStatusLog.oldStatus,
          newStatus: eventStatusLog.newStatus,
          changedAt: eventStatusLog.changedAt,
          changedBy: users.name,
          notes: eventStatusLog.notes,
        })
        .from(eventStatusLog)
        .leftJoin(users, eq(eventStatusLog.changedBy, users.id))
        .where(eq(eventStatusLog.eventId, input.id))
        .orderBy(desc(eventStatusLog.changedAt));

      // Get tasks (placeholder until tasks are implemented)
      const tasks: { id: number; title: string; status: string }[] = [];

      return {
        ...event,
        statusHistory,
        tasks,
      };
    }),

  // FR-002: Update event status
  updateStatus: adminProcedure.input(updateStatusInput).mutation(async ({ ctx, input }) => {
    const { db, session } = ctx;

    // Get current event
    const [currentEvent] = await db.select().from(events).where(eq(events.id, input.id)).limit(1);

    if (!currentEvent) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found',
      });
    }

    if (currentEvent.isArchived) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot update status of archived event',
      });
    }

    // Update event status in a transaction
    await db.transaction(async (tx) => {
      // Update event
      await tx
        .update(events)
        .set({
          status: input.newStatus,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.id));

      // Log status change
      await tx.insert(eventStatusLog).values({
        eventId: input.id,
        oldStatus: currentEvent.status,
        newStatus: input.newStatus,
        changedBy: parseInt(session.user.id, 10),
        notes: input.notes,
      });
    });

    return { success: true };
  }),

  // FR-006: Update event details
  update: adminProcedure.input(updateEventInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;
    const { id, ...updates } = input;

    // Verify event exists
    const [existingEvent] = await db.select().from(events).where(eq(events.id, id)).limit(1);

    if (!existingEvent) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found',
      });
    }

    if (existingEvent.isArchived) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot update archived event',
      });
    }

    // Update event
    const [updatedEvent] = await db
      .update(events)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(events.id, id))
      .returning();

    return updatedEvent;
  }),

  // Clone event with tasks
  clone: adminProcedure.input(cloneEventInput).mutation(async ({ ctx, input }) => {
    const { db, session } = ctx;

    // Verify source event exists
    const [sourceEvent] = await db
      .select()
      .from(events)
      .where(eq(events.id, input.sourceEventId))
      .limit(1);

    if (!sourceEvent) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Source event not found',
      });
    }

    // If clientId override provided, verify client exists
    const clientId = input.clientId ?? sourceEvent.clientId;
    if (input.clientId) {
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, input.clientId))
        .limit(1);

      if (!client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        });
      }
    }

    // Clone within a transaction
    return await db.transaction(async (tx) => {
      // Create new event with overrides
      const [newEvent] = await tx
        .insert(events)
        .values({
          clientId,
          eventName: input.eventName ?? sourceEvent.eventName,
          eventDate: input.eventDate,
          location: input.location ?? sourceEvent.location,
          estimatedAttendees: input.estimatedAttendees ?? sourceEvent.estimatedAttendees,
          notes: input.notes ?? sourceEvent.notes,
          status: 'inquiry',
          createdBy: parseInt(session.user.id, 10),
          templateId: sourceEvent.templateId,
          clonedFromEventId: sourceEvent.id,
        })
        .returning();

      // Log initial status
      await tx.insert(eventStatusLog).values({
        eventId: newEvent.id,
        oldStatus: null,
        newStatus: 'inquiry',
        changedBy: parseInt(session.user.id, 10),
        notes: `Cloned from event #${sourceEvent.id}`,
      });

      // Get source tasks ordered by ID for consistent remapping
      const sourceTasks = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.eventId, sourceEvent.id))
        .orderBy(asc(tasks.id));

      // Build old task ID → new task ID map for dependency remapping
      const taskIdMap = new Map<number, number>();
      const sourceTaskIds = new Set(sourceTasks.map((t) => t.id));

      for (const sourceTask of sourceTasks) {
        // Recalculate due date relative to new event date
        let newDueDate: Date | null = null;
        if (sourceTask.dueDate) {
          const offsetMs = differenceInMilliseconds(sourceTask.dueDate, sourceEvent.eventDate);
          newDueDate = new Date(input.eventDate.getTime() + offsetMs);
        }

        const [newTask] = await tx
          .insert(tasks)
          .values({
            eventId: newEvent.id,
            title: sourceTask.title,
            description: sourceTask.description,
            category: sourceTask.category,
            status: 'pending',
            assignedTo: null,
            dueDate: newDueDate,
            dependsOnTaskId: null, // Will be remapped in second pass
            isOverdue: false,
          })
          .returning({ id: tasks.id });

        taskIdMap.set(sourceTask.id, newTask.id);
      }

      // Second pass: remap dependencies
      for (const sourceTask of sourceTasks) {
        if (sourceTask.dependsOnTaskId && sourceTaskIds.has(sourceTask.dependsOnTaskId)) {
          const newTaskId = taskIdMap.get(sourceTask.id)!;
          const newDependsOnId = taskIdMap.get(sourceTask.dependsOnTaskId)!;

          await tx
            .update(tasks)
            .set({ dependsOnTaskId: newDependsOnId })
            .where(eq(tasks.id, newTaskId));
        }
      }

      return newEvent;
    });
  }),

  // FR-007: Archive event
  archive: adminProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Get event
      const [event] = await db.select().from(events).where(eq(events.id, input.id)).limit(1);

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (event.isArchived) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Event is already archived',
        });
      }

      // Only allow archiving completed events
      if (event.status !== 'completed') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only completed events can be archived',
        });
      }

      // Archive event
      await db
        .update(events)
        .set({
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: parseInt(session.user.id, 10),
        })
        .where(eq(events.id, input.id));

      return { success: true };
    }),
});
