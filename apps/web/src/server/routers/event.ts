import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { events, eventStatusLog, clients, users } from '@catering-event-manager/database/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';


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
});

// Event list input schema
const listEventsInput = z.object({
  status: z.enum([
    'inquiry',
    'planning',
    'preparation',
    'in_progress',
    'completed',
    'follow_up',
    'all',
  ]).optional(),
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

export const eventRouter = router({
  // FR-001: Create event (administrators only)
  create: adminProcedure
    .input(createEventInput)
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Verify client exists
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

      // Create event
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

      return event;
    }),

  // FR-004: List events with filters and pagination
  list: protectedProcedure
    .input(listEventsInput)
    .query(async ({ ctx, input }) => {
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
        .leftJoin(
          sql`tasks`,
          sql`tasks.event_id = ${events.id}`
        )
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
      const tasks: any[] = [];

      return {
        ...event,
        statusHistory,
        tasks,
      };
    }),

  // FR-002: Update event status
  updateStatus: adminProcedure
    .input(updateStatusInput)
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Get current event
      const [currentEvent] = await db
        .select()
        .from(events)
        .where(eq(events.id, input.id))
        .limit(1);

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
  update: adminProcedure
    .input(updateEventInput)
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { id, ...updates } = input;

      // Verify event exists
      const [existingEvent] = await db
        .select()
        .from(events)
        .where(eq(events.id, id))
        .limit(1);

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

  // FR-007: Archive event
  archive: adminProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Get event
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, input.id))
        .limit(1);

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
